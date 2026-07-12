import { createWorker } from "tesseract.js";
import { devlogger } from "@/lib/devlogger";
import { ExtractionResult } from "@/domain/entities/ai-extraction";

// Free, local, no-API-key fallback used only when every configured Gemini
// API key is exhausted/rate-limited. Tesseract has no reasoning ability, so
// this uses simple "find the label, take what follows it" heuristics instead
// of Gemini's semantic field mapping — expect lower accuracy, no dropdown
// matching, no date normalization, and no multi-record table extraction.

const runOcr = async (images: { data: string; mimeType: string }[]): Promise<string> => {
  const worker = await createWorker(["eng", "ara"]);
  try {
    const texts: string[] = [];
    for (const image of images) {
      const buffer = Buffer.from(image.data, "base64");
      const { data } = await worker.recognize(buffer);
      texts.push(data.text || "");
    }
    return texts.join("\n");
  } finally {
    await worker.terminate();
  }
};

const findValueForLabel = (text: string, labels: string[]): string | null => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const label of labels) {
    const cleanLabel = label.trim();
    if (!cleanLabel) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idx = line.toLowerCase().indexOf(cleanLabel.toLowerCase());
      if (idx === -1) continue;

      // Same line, text after the label (stripping common separators)
      const after = line
        .slice(idx + cleanLabel.length)
        .replace(/^[\s:：\-—]+/, "")
        .trim();
      if (after) return after;

      // Otherwise take the next non-empty line as the value
      const next = lines[i + 1];
      if (next && next.toLowerCase().indexOf(cleanLabel.toLowerCase()) === -1) {
        return next;
      }
    }
  }

  return null;
};

export async function extractDocumentDataViaOcr(
  images: { data: string; mimeType: string }[],
  fieldDefinitions: any[],
  contactFields: any[]
): Promise<ExtractionResult> {
  try {
    const text = await runOcr(images);

    const contactData = {
      name: null as string | null,
      email: null as string | null,
      phone: null as string | null,
      address: null as string | null,
    };

    for (const contact of contactFields) {
      const value = findValueForLabel(text, [contact.labelEn, contact.labelAr].filter(Boolean));
      if (value && contact.key in contactData) {
        (contactData as any)[contact.key] = value;
      }
    }

    const fieldValues: Record<string, { value: string | number | null; confidence: number }> = {};
    for (const field of fieldDefinitions) {
      if (field.inputType === "image" || field.inputType === "file") continue;
      const value = findValueForLabel(text, [field.nameEn, field.nameAr].filter(Boolean));
      fieldValues[field.id] = {
        // Heuristic string-matching has no real confidence signal; use a flat,
        // conservative value so callers can visually flag OCR-sourced results.
        value: value,
        confidence: value ? 0.4 : 0,
      };
    }

    const totalFields = Object.keys(fieldValues).length + Object.keys(contactData).length;
    let filledFields = 0;
    for (const value of Object.values(contactData)) {
      if (value !== null) filledFields++;
    }
    for (const field of Object.values(fieldValues)) {
      if (field.value !== null) filledFields++;
    }

    let status: "success" | "partial" | "failure" = "failure";
    if (totalFields === 0) {
      status = "success";
    } else if (filledFields === totalFields) {
      status = "success";
    } else if (filledFields > 0) {
      status = "partial";
    }

    return {
      status,
      contactData,
      fieldValues,
      errorMessage: status === "failure"
        ? "Could not read any fields using the offline OCR fallback. Try again once the AI service is available."
        : undefined,
    };
  } catch (error: any) {
    devlogger.error("Tesseract OCR fallback failed", error);
    return {
      status: "failure",
      contactData: { name: null, email: null, phone: null, address: null },
      fieldValues: {},
      errorMessage: "extractionFailed",
    };
  }
}
