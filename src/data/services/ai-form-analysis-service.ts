import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/dev-logger";
import { parseGeminiError } from "@/lib/gemini-error";
import { getAiEnvs } from "@/lib/gemini-keys";

export interface AIFormAnalysisResult {
  summary: string;
  patterns: string[];
  findings: string[];
  sentimentOverview: string;
}

const responseSchema = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "A concise summary paragraph highlighting the key takeaways and overall trends observed from the submissions.",
    },
    patterns: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "A list of recurring trends, common behaviors, or patterns identified across the submissions.",
    },
    findings: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Notable, anomalous, or interesting individual findings or feedback points found in the submissions.",
    },
    sentimentOverview: {
      type: "STRING",
      description: "A summary of the overall emotional tone or sentiment (e.g. positive, negative, mixed, frustrated) expressed by the submitters.",
    },
  },
  required: ["summary", "patterns", "findings", "sentimentOverview"],
};

export async function analyzeFormSubmissions(submissions: any[], locale: string = "ar"): Promise<AIFormAnalysisResult> {
  const apiKeys = getAiEnvs();

  // Sample to first 500 submissions to fit context and keep response times fast
  const sampledSubmissions = submissions.slice(0, 500).map((sub, idx) => {
    return {
      id: sub._id?.toString() || idx,
      contact: sub.contactData ? {
        name: sub.contactData.name,
        email: sub.contactData.email,
        phone: sub.contactData.phone,
        address: sub.contactData.address,
      } : undefined,
      values: sub.fieldValues ? Object.keys(sub.fieldValues).reduce((acc: Record<string, any>, key) => {
        acc[key] = sub.fieldValues[key]?.value;
        return acc;
      }, {}) : {},
      createdAt: sub.createdAt,
    };
  });

  const submissionsDataStr = JSON.stringify(sampledSubmissions, null, 2);

  const prompt = `You are analyzing form submission data for a marketing agency admin.
  Return a JSON object with:
  - summary (string): 2-3 sentence business overview
  - patterns (string[]): up to 5 recurring submission patterns
  - findings (string[]): up to 5 notable marketing findings (leads, interests, intent signals)
  - sentimentOverview (string): overall tone and engagement quality
  
  Focus on lead generation signals, user intent, and marketing intelligence.
  Ensure your analysis captures the essence of both Arabic and English text input where applicable.
  
  Language requirement:
  You MUST generate all field values in the JSON output (including the "summary", "patterns", "findings", and "sentimentOverview") in ${locale === "ar" ? "Arabic (العربية)" : "English"}.

  Form Submissions Data (JSON):
  ${submissionsDataStr}

  Please generate the structured analysis according to the schema.`;

  // Try models in order; fall back on 503 overload
  const MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
  const MAX_RETRIES = 2;

  let lastError: any;
  let keyIndex = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const model = MODEL_FALLBACKS[Math.min(attempt, MODEL_FALLBACKS.length - 1)];
    const ai = new GoogleGenAI({ apiKey: apiKeys[keyIndex] });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema as any,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeoutId);

      const text = response.text;
      if (!text) throw new Error("Received empty response text from Gemini API");

      const result = JSON.parse(text);
      return {
        summary: result.summary || "",
        patterns: Array.isArray(result.patterns) ? result.patterns : [],
        findings: Array.isArray(result.findings) ? result.findings : [],
        sentimentOverview: result.sentimentOverview || "",
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        logger.error("AI form analysis request timed out after 30s");
        throw new Error("AI analysis timed out. Please try again with fewer submissions.");
      }

      const geminiErr = parseGeminiError(error);
      if (geminiErr.isQuotaError) {
        if (keyIndex < apiKeys.length - 1) {
          keyIndex++;
          logger.error(`Gemini API key #${keyIndex} quota exceeded, falling back to next key`, { retryAfterSeconds: geminiErr.retryAfterSeconds });
          attempt--; // don't consume a model-fallback attempt on a key switch
          continue;
        }
        logger.error(`Gemini API quota exceeded on model "${model}"`, { retryAfterSeconds: geminiErr.retryAfterSeconds });
        throw new Error(geminiErr.cleanMessage);
      }

      const status: number = error?.status ?? error?.response?.status ?? 0;
      const msg: string = error?.message ?? "";
      const isOverloaded = status === 503 || msg.includes("503") || msg.includes("UNAVAILABLE");

      if (isOverloaded && attempt < MAX_RETRIES) {
        const delay = 1500 * (attempt + 1);
        logger.error(`Gemini model "${model}" overloaded (503), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      logger.error("Error during AI form analysis:", error);
      throw error;
    }
  }

  throw lastError;
}
