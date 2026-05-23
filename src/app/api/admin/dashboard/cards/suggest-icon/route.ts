import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { parseSecureJson } from "@/lib/api-security";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/env.mjs";
import { z } from "zod";
import { CARD_ICON_KEYS } from "@/lib/card-icons";

const bodySchema = z.object({
  titleAr: z.string().optional().default(""),
  titleEn: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  const parsedBody = await parseSecureJson(request);
  if (!parsedBody.success) {
    return errorResponse(parsedBody.error, 400, parsedBody.code);
  }

  const parsed = bodySchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, "VALIDATION_FAILED");
  }

  const { titleAr, titleEn } = parsed.data;
  if (!titleAr && !titleEn) {
    return errorResponse("At least one title (AR or EN) is required", 400, "NO_TITLE");
  }

  try {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return errorResponse("AI service not configured", 503, "AI_NOT_CONFIGURED");
    }

    const ai = new GoogleGenAI({ apiKey });
    const iconList = CARD_ICON_KEYS.join(", ");

    const prompt = `You are a UI icon selector assistant. Given a card title, choose the single most appropriate icon from the available list.

Card title (Arabic): "${titleAr}"
Card title (English): "${titleEn}"

Available icons: ${iconList}

Rules:
- Return ONLY the exact icon name from the list above, nothing else
- Choose the icon that best represents the card's purpose or subject matter
- If both Arabic and English titles are provided, consider both
- Do not add quotes, punctuation, or explanation`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const suggested = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const icon = CARD_ICON_KEYS.includes(suggested) ? suggested : "file-text";

    return successResponse({ icon });
  } catch (error: any) {
    return errorResponse("Failed to generate icon suggestion", 500, "AI_FAILED");
  }
}
