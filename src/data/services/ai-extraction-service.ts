import { GoogleGenAI } from "@google/genai";
import { env } from "@/env.mjs";
import { devlogger } from "@/lib/devlogger";
import { parseGeminiError } from "@/lib/gemini-error";
import { ExtractionResult } from "@/domain/entities/ai-extraction";

// Check if Gemini API key exists
const getApiKey = (): string => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  return apiKey;
};

export async function extractDocumentData(
  imageBase64: string,
  imageMimeType: string,
  fieldDefinitions: any[],
  contactFields: any[],
  locale: "en" | "ar",
  options?: { multiInstanceEnabled?: boolean; maxInstances?: number | null }
): Promise<ExtractionResult> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // 1. Filter and build dynamic field schema
  const fieldProperties: Record<string, any> = {};
  const requiredFieldIds: string[] = [];

  for (const field of fieldDefinitions) {
    // Skip file/image fields as they can't be extracted as simple text values
    if (field.inputType === "image" || field.inputType === "file") {
      continue;
    }

    const type = field.inputType === "number" ? "NUMBER" : "STRING";
    const description = `Value for field (English: "${field.nameEn}", Arabic: "${field.nameAr}") with input type ${field.inputType}. ` +
      (field.inputType === "dropdown" ? `For dropdown matching, check options: (English: ${[...(field.dropdownOptionsEn || [])].join(", ")}; Arabic: ${[...(field.dropdownOptionsAr || [])].join(", ")}). Match the document value to one of these options.` : "") +
      (field.inputType === "date" ? " Format must be YYYY-MM-DD. Normalize the date value to this standard format." : "");

    fieldProperties[field.id] = {
      type: "OBJECT",
      properties: {
        value: {
          type,
          description,
          nullable: true,
        },
        confidence: {
          type: "NUMBER",
          description: "Confidence score between 0.0 and 1.0 of the extraction.",
        },
      },
      required: ["value", "confidence"],
    };
    requiredFieldIds.push(field.id);
  }

  // 2. Build contact fields schema
  const contactProperties: Record<string, any> = {};
  const requiredContactKeys: string[] = [];

  for (const contact of contactFields) {
    contactProperties[contact.key] = {
      type: "STRING",
      description: `Value for contact record (English: "${contact.labelEn}", Arabic: "${contact.labelAr}"). Extract the exact value, or null if not found.`,
      nullable: true,
    };
    requiredContactKeys.push(contact.key);
  }

  // 3. Assemble responseSchema
  const singleRecordSchema = {
    type: "OBJECT",
    properties: {
      contactData: {
        type: "OBJECT",
        properties: contactProperties,
        required: requiredContactKeys,
      },
      fieldValues: {
        type: "OBJECT",
        properties: fieldProperties,
        required: requiredFieldIds,
      },
    },
    required: ["contactData", "fieldValues"],
  };

  const responseSchema: any = { ...singleRecordSchema };
  if (options?.multiInstanceEnabled) {
    responseSchema.properties = {
      ...responseSchema.properties,
      records: {
        type: "ARRAY",
        items: singleRecordSchema,
        description: "If the document contains multiple rows/records of data (e.g. a CSV, Excel sheet, or table with multiple entries), extract all of them here.",
      },
    };
  }

  // 4. Construct prompt
  let prompt = `You are a professional document information extraction system.
Analyze the provided document file or image (such as an ID card photo, PDF, CSV, spreadsheet, or Word document) and extract information into the specified JSON format.

Bilingual & Multi-Language Instructions:
- Explicitly detect and handle Arabic text (RTL), English text (LTR), and mixed-language documents.
- If the document contains Arabic text, extract the Arabic values (e.g. Arabic names, Arabic address).
- Preserve Arabic diacritics (tashkeel), letters, and special characters if present in the document.
- If the field can be extracted in Arabic or English, use the language matching the source document.
- Extract contact records into "contactData" (name, email, phone, address) by matching fields.
- Extract custom form fields into "fieldValues" mapped by their corresponding field IDs using the English and Arabic label descriptions provided.
- For each custom field value in "fieldValues", provide a confidence score between 0.0 and 1.0 reflecting how clear the reading is.
- If a field is not found or is completely unreadable on the document, set its value to null and confidence to 0.0.
- For date fields, normalize the value to YYYY-MM-DD format.
- For phone numbers, extract all digits, remove unnecessary formatting (e.g., spaces, dashes, parentheses), and normalize the phone format (e.g., preserving leading + or zeros as appropriate).`;

  if (options?.multiInstanceEnabled) {
    prompt += `\n- Since multiple records are allowed, if the document contains a list/table/sheet with multiple records, extract ALL rows into the 'records' array in the response schema. Capped at ${options.maxInstances || 50} records. The top-level 'contactData' and 'fieldValues' should represent the FIRST record.`;
  }

  prompt += "\n\nExtract exactly as instructed. Do not include any explanation.";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000); // 30 seconds hard timeout

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
        abortSignal: controller.signal,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(responseText);

    // Map fields back into standard types
    const contactData = {
      name: data.contactData?.name || null,
      email: data.contactData?.email || null,
      phone: data.contactData?.phone || null,
      address: data.contactData?.address || null,
    };

    const fieldValues: Record<string, any> = {};
    for (const [fieldId, extraction] of Object.entries(data.fieldValues || {})) {
      const typedExtraction = extraction as any;
      fieldValues[fieldId] = {
        value: typedExtraction.value !== undefined ? typedExtraction.value : null,
        confidence: typeof typedExtraction.confidence === "number" ? typedExtraction.confidence : 0,
      };
    }

    // Determine status (success, partial, failure)
    const totalFields = Object.keys(fieldValues).length + Object.keys(contactData).length;
    let filledFields = 0;
    
    // Count filled fields
    for (const key of Object.keys(contactData)) {
      if (contactData[key as keyof typeof contactData] !== null) {
        filledFields++;
      }
    }
    for (const val of Object.values(fieldValues)) {
      if (val.value !== null) {
        filledFields++;
      }
    }

    let status: "success" | "partial" | "failure" = "failure";
    if (totalFields === 0) {
      status = "success";
    } else if (filledFields === totalFields) {
      status = "success";
    } else if (filledFields > 0) {
      status = "partial";
    } else {
      status = "failure";
    }

    let records: ExtractionResult[] = [];
    if (options?.multiInstanceEnabled && Array.isArray(data.records)) {
      records = data.records.map((rec: any) => {
        const recContactData = {
          name: rec.contactData?.name || null,
          email: rec.contactData?.email || null,
          phone: rec.contactData?.phone || null,
          address: rec.contactData?.address || null,
        };

        const recFieldValues: Record<string, any> = {};
        for (const [fieldId, extraction] of Object.entries(rec.fieldValues || {})) {
          const typedExtraction = extraction as any;
          recFieldValues[fieldId] = {
            value: typedExtraction.value !== undefined ? typedExtraction.value : null,
            confidence: typeof typedExtraction.confidence === "number" ? typedExtraction.confidence : 0,
          };
        }

        const total = Object.keys(recFieldValues).length + Object.keys(recContactData).length;
        let filled = 0;
        for (const key of Object.keys(recContactData)) {
          if (recContactData[key as keyof typeof recContactData] !== null) filled++;
        }
        for (const val of Object.values(recFieldValues)) {
          if (val.value !== null) filled++;
        }

        let recStatus: "success" | "partial" | "failure" = "failure";
        if (total === 0 || filled === total) {
          recStatus = "success";
        } else if (filled > 0) {
          recStatus = "partial";
        }

        return {
          status: recStatus,
          contactData: recContactData,
          fieldValues: recFieldValues,
        };
      });
    }

    return {
      status,
      contactData,
      fieldValues,
      records: records.length > 0 ? records : undefined,
    };

  } catch (error: any) {
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      devlogger.error("Gemini AI extraction request timed out after 30s");
      return {
        status: "failure",
        contactData: { name: null, email: null, phone: null, address: null },
        fieldValues: {},
        errorMessage: "timeout",
      };
    }
    const geminiErr = parseGeminiError(error);
    if (geminiErr.isQuotaError) {
      devlogger.error("Gemini API quota exceeded during extraction", { retryAfterSeconds: geminiErr.retryAfterSeconds });
      return {
        status: "failure",
        contactData: { name: null, email: null, phone: null, address: null },
        fieldValues: {},
        errorMessage: geminiErr.cleanMessage,
      };
    }
    devlogger.error("Error during Gemini AI extraction", error);
    return {
      status: "failure",
      contactData: { name: null, email: null, phone: null, address: null },
      fieldValues: {},
      errorMessage: error.message || "Failed to extract document data",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
