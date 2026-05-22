import { env } from "@/env.mjs";

type SubmissionUploadResourceType = "image" | "auto";

interface ResolveSubmissionUploadPolicyInput {
  formId?: string | null;
  draftId?: string | null;
  fieldType?: string | null;
  folder?: string | null;
  eager?: string | null;
}

export interface SubmissionUploadPolicy {
  folder: string;
  eager?: string;
  uploadPreset?: string;
  resourceType: SubmissionUploadResourceType;
}

function sanitizeSegment(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveDefaultFolder(
  sanitizedFormId: string,
  sanitizedDraftId: string,
): string {
  if (sanitizedFormId.length > 0 && sanitizedDraftId.length > 0) {
    return `submissions/${sanitizedFormId}/${sanitizedDraftId}`;
  }

  return "submissions";
}

function resolveResourceType(fieldType: string | null | undefined): SubmissionUploadResourceType {
  return (fieldType ?? "").toLowerCase() == "image" ? "image" : "auto";
}

export function resolveSubmissionUploadPolicy(
  input: ResolveSubmissionUploadPolicyInput,
): SubmissionUploadPolicy {
  const sanitizedFormId = sanitizeSegment(input.formId);
  const sanitizedDraftId = sanitizeSegment(input.draftId);
  const requestedFolder = (input.folder ?? "").trim();
  const folder =
    requestedFolder.length > 0
      ? requestedFolder
      : resolveDefaultFolder(sanitizedFormId, sanitizedDraftId);

  const eager = (input.eager ?? "").trim();
  const uploadPreset = (env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "").trim();

  return {
    folder,
    eager: eager.length > 0 ? eager : undefined,
    uploadPreset: uploadPreset.length > 0 ? uploadPreset : undefined,
    resourceType: resolveResourceType(input.fieldType),
  };
}
