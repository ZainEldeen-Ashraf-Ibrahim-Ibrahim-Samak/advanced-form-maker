import { MongoFieldDefinitionRepository } from "@/data/repositories/mongo-field-definition-repository";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import type { FieldDefinition } from "@/domain/entities/field-definition";
import { EMAIL_REGEX, NAME_REGEX, PHONE_REGEX, TEXT_REGEX } from "@/constants/constants";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import {
  formDefinitionResponseSchema,
  type FormDefinitionResponse,
} from "@/lib/validation/form-definition";

const formTemplateRepository = new MongoFormTemplateRepository();
const fieldDefinitionRepository = new MongoFieldDefinitionRepository();

function mapRegex(field: FieldDefinition): string | undefined {
  switch (field.validationRules.regexType) {
    case "email":
      return EMAIL_REGEX.source;
    case "phone":
      return PHONE_REGEX.source;
    case "name":
      return NAME_REGEX.source;
    default:
      return field.inputType === "text" ? TEXT_REGEX.source : undefined;
  }
}

function mapFormatterId(
  field: FieldDefinition,
): "phone" | "nationalId" | "date" | "numeric" | "none" {
  if (field.validationRules.regexType === "phone") {
    return "phone";
  }

  if (field.inputType === "date") {
    return "date";
  }

  if (field.inputType === "number") {
    return "numeric";
  }

  return "none";
}

function mapContractType(
  field: FieldDefinition,
): "text" | "number" | "select" | "date" | "phone" | "nationalId" | "media" {
  if (field.inputType === "dropdown") {
    return "select";
  }

  if (field.inputType === "image" || field.inputType === "file") {
    return "media";
  }

  if (field.inputType === "text" && field.validationRules.regexType === "phone") {
    return "phone";
  }

  if (field.inputType === "text") {
    return "text";
  }

  if (field.inputType === "number") {
    return "number";
  }

  if (field.inputType === "date") {
    return "date";
  }

  return "text";
}

function toFormDefinitionPayload(
  formId: string,
  version: string,
  fields: FieldDefinition[],
): FormDefinitionResponse {
  return {
    id: formId,
    version,
    fields: fields.map((field) => {
      const maxFileSize = field.validationRules.maxFileSize;
      const allowedMimeTypes = field.validationRules.allowedFileTypes ?? [];
      const isImage = field.inputType === "image";
      const isFile = field.inputType === "file";
      const mediaLimits = isImage || isFile
        ? {
            maxImageBytes: isImage ? maxFileSize ?? 15 * 1024 * 1024 : undefined,
            maxVideoBytes: isFile ? maxFileSize ?? 100 * 1024 * 1024 : undefined,
            acceptedMimeTypes: allowedMimeTypes,
          }
        : undefined;

      return {
        id: field.id,
        type: mapContractType(field),
        required: field.validationRules.required === true,
        regex: mapRegex(field),
        formatterId: mapFormatterId(field),
        messageKeys: {
          label: `form.field.${field.id}.label`,
          placeholder: `form.field.${field.id}.placeholder`,
          errorRequired: "mobile.submission.validation.requiredField",
          errorRegex: "mobile.submission.validation.text",
          errorFormat: "mobile.submission.validation.text",
        },
        mediaLimits,
      };
    }),
  };
}

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: formId } = await params;

    const formTemplate = await formTemplateRepository.findById(formId);
    if (!formTemplate) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const fields = await fieldDefinitionRepository.findByFormId(formId);
    const payload = toFormDefinitionPayload(
      formTemplate.id,
      formTemplate.updatedAt.toISOString(),
      fields,
    );

    const parsed = formDefinitionResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error("Invalid form-definition response payload", {
        formId,
        issues: parsed.error.flatten(),
      });
      return errorResponse("Invalid form definition payload", 500, "FORM_DEFINITION_INVALID");
    }

    return successResponse(parsed.data);
  } catch (error) {
    logger.error("Failed to fetch form definition", error);
    return errorResponse("server_error", 500, "FORM_DEFINITION_FETCH_FAILED");
  }
}
