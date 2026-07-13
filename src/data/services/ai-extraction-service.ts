import { GoogleGenAI } from "@google/genai";
import { devlogger } from "@/lib/devlogger";
import { parseGeminiError } from "@/lib/gemini-error";
import { getAiEnvs } from "@/lib/gemini-keys";
import { ExtractionResult } from "@/domain/entities/ai-extraction";

export async function extractDocumentData(
  images: { data: string; mimeType: string }[],
  fieldDefinitions: any[],
  contactFields: any[],
  locale: "en" | "ar",
  options?: { multiInstanceEnabled?: boolean; maxInstances?: number | null }
): Promise<ExtractionResult> {
  const apiKeys = getAiEnvs();

  // 1. Filter and build dynamic field schema
  const fieldProperties: Record<string, any> = {};
  const requiredFieldIds: string[] = [];

  for (const field of fieldDefinitions) {
    // Skip file/image fields as they can't be extracted as simple text values
    if (field.inputType === "image" || field.inputType === "file") {
      continue;
    }

    const type = field.inputType === "number" ? "NUMBER" : "STRING";
    const dropdownOptions = field.inputType === "dropdown"
      ? [...(field.dropdownOptionsEn || []), ...(field.dropdownOptionsAr || [])]
      : [];
    const description = `Value for field (English: "${field.nameEn}", Arabic: "${field.nameAr}") with input type ${field.inputType}. ` +
      (field.inputType === "dropdown" ? `You MUST output the value exactly as one of the allowed options below (character-for-character, do not paraphrase or translate it) — or null if none of them match the document.` : "") +
      (field.inputType === "date" ? " Format must be YYYY-MM-DD. Normalize the date value to this standard format." : "");

    // For dropdowns, constrain Gemini's structured output to the exact configured
    // option strings via `enum` — free-text matching previously let the model
    // return a close-but-not-identical value (different casing/wording/language),
    // which then failed the strict exact-string validation at submission time.
    fieldProperties[field.id] = {
      type: "OBJECT",
      properties: {
        value: {
          type,
          description,
          nullable: true,
          ...(dropdownOptions.length > 0 ? { enum: dropdownOptions } : {}),
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
- For date fields, normalize the value to YYYY-MM-DD format. Source dates may use Arabic-Indic digits (e.g. ٢٠٠٤/١/٥) or other orderings (Y/M/D, D/M/Y) — convert the digits and reorder as needed, but always output plain Western digits in YYYY-MM-DD order.
- For phone numbers, extract all digits, remove unnecessary formatting (e.g., spaces, dashes, parentheses), and normalize the phone format (e.g., preserving leading + or zeros as appropriate).

Reading Quality Instructions:
- Read printed/typed (computer-generated) text with the same care and attention as handwritten text. Do not skip, skim, or assume printed text is "already clear" — zoom into the actual pixels of every field, printed or handwritten, before extracting its value.
- Pay special attention to visually similar digits, which are easy to misread in both printed and handwritten numerals: 6 vs 7 (and their Arabic-Indic equivalents ٦ vs ٧), 0 vs 8, 1 vs 7, 5 vs 6. When a digit is ambiguous, look at its full shape (e.g. a 6 has a closed loop at the bottom, a 7 does not) rather than guessing from context.
- Never guess or hallucinate a value for a field that is not clearly legible; if genuinely unreadable, set value to null and confidence to 0.0 rather than outputting a low-confidence guess.
- The photo may be taken at an angle, with other documents, papers, notebooks, or objects visible in the background or partially overlapping the edges of the page. Identify the single primary document/table that fills most of the frame and extract only from it; ignore any other paper, text, or object that is out of focus, cropped at the edge, or clearly a separate document behind/under it.
- If a cell's original printed or handwritten value has been crossed out, struck through, or overwritten with a handwritten correction next to or above it, use the corrected (most recent, not struck-through) value, not the crossed-out original.
- Table cells are sometimes photographed skewed or in perspective (not perfectly top-down). Follow each row/column carefully along its actual (possibly diagonal) line in the image rather than assuming strict horizontal/vertical alignment, so values don't get attributed to the wrong row.`;

  if (images.length > 1) {
    prompt += `\n- You have been given ${images.length} images/pages. They may represent different sides or pages of the same document (e.g. the front and back of an ID card) or a multi-page document. Treat them as one combined document and merge information found across all of them when filling in a single field.`;
  }

  if (options?.multiInstanceEnabled) {
    prompt += `\n- Since multiple records are allowed, if the document contains a list/table/sheet with multiple records, extract ALL rows into the 'records' array in the response schema. Capped at ${options.maxInstances || 50} records. The top-level 'contactData' and 'fieldValues' should represent the FIRST record.`;
  }

  prompt += "\n\nExtract exactly as instructed. Do not include any explanation.";

  const callGemini = async (apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });

    // No artificial timeout — let Gemini take as long as it actually needs
    // (large multi-page/multi-record documents can legitimately take a while)
    // instead of aborting a request that would otherwise have succeeded.
    const response = await ai.models.generateContent({
      model: "gemini-pro-latest",
      contents: [
        ...images.map((image) => ({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        })),
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }
    return responseText;
  };

  const attemptGeminiExtraction = async (): Promise<ExtractionResult> => {
    let responseText: string | null = null;
    let lastError: any = null;

    for (let i = 0; i < apiKeys.length; i++) {
      try {
        responseText = await callGemini(apiKeys[i]);
        break;
      } catch (err: any) {
        lastError = err;
        const isLastKey = i === apiKeys.length - 1;
        const geminiErr = parseGeminiError(err);
        // Retry with the next key on quota errors AND transient server errors
        // (503 "high demand", 500) — model overload isn't tied to which key
        // made the request, so it's worth trying again before giving up.
        if (geminiErr.isRetryable && !isLastKey) {
          devlogger.error(`Gemini API key #${i + 1} failed (${geminiErr.isQuotaError ? "quota" : "transient error"}), trying next key`, { retryAfterSeconds: geminiErr.retryAfterSeconds });
          continue;
        }
        throw err;
      }
    }

    if (responseText === null) {
      throw lastError || new Error("Failed to extract document data");
    }

    // Gemini occasionally ignores the JSON schema and replies with plain text
    // instead (e.g. a safety/policy refusal on sensitive document content) —
    // parse defensively so a raw SyntaxError never leaks to the end user as
    // the final error message.
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("The AI declined to process this document. Please try a different photo.");
    }

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
      // The model returned a response, but couldn't read any field from it —
      // give the user something more actionable than a bare "failure" status.
      errorMessage: status === "failure"
        ? "Could not read any fields from the document. Make sure the photo is clear, well-lit, and shows the full document."
        : undefined,
    };
  };

  try {
    return await attemptGeminiExtraction();
  } catch (error: any) {
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      devlogger.error("Gemini AI extraction request timed out after 35s");
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
  }
}
