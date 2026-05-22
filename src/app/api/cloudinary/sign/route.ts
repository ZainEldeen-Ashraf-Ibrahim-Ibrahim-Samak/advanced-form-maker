import { signUploadRequest, ensureUploadPresetExists, type SignUploadParams } from "@/data/services/cloudinary-service";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";
import { resolveSubmissionUploadPolicy } from "@/lib/cloudinary/upload-policy";

export async function POST(request: Request) {
  // Optional: restrict to authenticated users if needed, 
  // but public submissions might need signatures too if they upload directly to Cloudinary.
  // For now, let's keep it accessible if authenticated OR if we trust the referral.
  
  try {
    const parsedBody = await parseSecureJson<Record<string, unknown>>(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }

    const raw = parsedBody.data;
    const timestamp = Number(raw.timestamp);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return errorResponse("timestamp is required", 400, "BAD_REQUEST");
    }

    const policy = resolveSubmissionUploadPolicy({
      formId: typeof raw.formId === "string" ? raw.formId : null,
      draftId: typeof raw.draftId === "string" ? raw.draftId : null,
      fieldType: typeof raw.fieldType === "string" ? raw.fieldType : null,
      folder: typeof raw.folder === "string" ? raw.folder : null,
      eager: typeof raw.eager === "string" ? raw.eager : null,
    });

    // Auto-create preset if missing (only happens once due to server-side caching)
    if (policy.uploadPreset) {
      await ensureUploadPresetExists(policy.uploadPreset);
    }

    const params: SignUploadParams = {
      timestamp: Math.floor(timestamp),
      folder: policy.folder,
      ...(policy.eager ? { eager: policy.eager } : {}),
      ...(typeof raw.public_id === "string" ? { public_id: raw.public_id } : {}),
      ...(policy.uploadPreset ? { upload_preset: policy.uploadPreset } : {}),
    };

    const result = signUploadRequest(params);
    
    // Provide all common variations of keys to satisfy different SDKs and client implementations (including Flutter)
    return successResponse({
      ...result,
      folder: policy.folder,
      eager: policy.eager ?? null,
      uploadPreset: policy.uploadPreset ?? null,
      resourceType: policy.resourceType,
      
      // Standardize key variations
      api_key: result.apikey,
      apiKey: result.apikey,
      cloud_name: result.cloudname,
      cloudName: result.cloudname,
      
      // Snake case variations
      upload_preset: policy.uploadPreset ?? null,
      resource_type: policy.resourceType,
    });
  } catch (error) {
    logger.error("Failed to sign Cloudinary request", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return errorResponse("Signature failed", 500);
  }
}
