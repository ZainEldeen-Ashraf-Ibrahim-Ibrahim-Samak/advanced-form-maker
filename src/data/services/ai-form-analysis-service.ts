import { GoogleGenAI } from "@google/genai";
import { env } from "@/env.mjs";
import { logger } from "@/lib/dev-logger";

export interface AIFormAnalysisResult {
  summary: string;
  patterns: string[];
  findings: string[];
  sentimentOverview: string;
}

const getApiKey = (): string => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  return apiKey;
};

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
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

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

  const prompt = `You are a professional business data analyst.
Analyze the following list of form submissions and identify key trends, notable individual cases, user sentiments, and summarize the overall dataset.
Ensure your analysis captures the essence of both Arabic and English text input where applicable.

Language requirement:
You MUST generate all field values in the JSON output (including the "summary", "patterns", "findings", and "sentimentOverview") in ${locale === "ar" ? "Arabic (العربية)" : "English"}.

Form Submissions Data (JSON):
${submissionsDataStr}

Please generate the structured analysis according to the schema.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000); // 30 seconds hard timeout

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received empty response text from Gemini API");
    }

    const result = JSON.parse(text);
    return {
      summary: result.summary || "",
      patterns: Array.isArray(result.patterns) ? result.patterns : [],
      findings: Array.isArray(result.findings) ? result.findings : [],
      sentimentOverview: result.sentimentOverview || "",
    };
  } catch (error: any) {
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      logger.error("AI form analysis request timed out after 30s");
      throw new Error("AI analysis timed out. Please try again with fewer submissions or check server connectivity.");
    }
    logger.error("Error during AI form analysis:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
