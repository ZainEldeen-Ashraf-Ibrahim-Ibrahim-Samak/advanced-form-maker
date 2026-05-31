import { NextResponse } from "next/server";
import { parseSecureJson } from "@/lib/api-security";
import { errorResponse, successResponse } from "@/lib/api-response";
import { redis } from "@/lib/redis";
import { ExtractDocumentDataUseCase } from "@/domain/use-cases/client/extract-document-data";
import { devlogger } from "@/lib/devlogger";
import { extractionRequestSchema } from "@/lib/validations/ai-extraction";

export const dynamic = "force-dynamic";

const useCase = new ExtractDocumentDataUseCase();

export async function POST(request: Request) {
  try {
    // 1. Rate limiting
    if (redis) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const rateLimitKey = `ratelimit:ai-extract:${ip}`;

      try {
        const requests = await redis.incr(rateLimitKey);
        if (requests === 1) {
          await redis.expire(rateLimitKey, 60);
        }

        if (requests > 5) {
          return errorResponse(
            "Too many extraction requests. Please wait and try again.",
            429
          );
        }
      } catch (err) {
        devlogger.error("Rate limiting failed", err);
        // Fall through on rate limiting failure so users aren't blocked by Redis issues
      }
    }

    // 2. Parse secure JSON
    const parseResult = await parseSecureJson<any>(request);
    if (!parseResult.success) {
      return errorResponse(parseResult.error, 400);
    }

    const body = parseResult.data;

    // 3. Zod validation
    const validation = extractionRequestSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        "Invalid input parameters: " + validation.error.issues.map((e: any) => e.message).join(", "),
        400
      );
    }

    // 4. Validate file size (≤ 10MB raw)
    const { imageBase64 } = validation.data;
    const rawSizeInBytes = (imageBase64.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (rawSizeInBytes > maxSizeBytes) {
      return errorResponse("File exceeds maximum size of 10MB", 413);
    }

    // 5. Trigger Use Case
    const result = await useCase.execute(validation.data);

    // 6. Handle errors / response
    if (result.errorMessage === "timeout") {
      return errorResponse(
        "Document analysis timed out. Please try again with a clearer image.",
        504
      );
    }

    if (result.errorMessage) {
      return errorResponse(
        result.errorMessage || "An unexpected error occurred during document analysis.",
        500
      );
    }

    return successResponse(result);

  } catch (error: any) {
    devlogger.error("Unexpected error in /api/ai/extract", error);
    return errorResponse(
      "An unexpected error occurred during document analysis.",
      500
    );
  }
}
