import { SubmissionRepository } from "@/domain/repositories/submission-repository";
import { FieldValueRepository } from "@/domain/repositories/field-value-repository";
import { FormTemplateRepository } from "@/domain/repositories/form-template-repository";
import { FieldDefinitionRepository } from "@/domain/repositories/field-definition-repository";
import { Submission } from "@/domain/entities/submission";
import { CreateFieldValueInput } from "@/domain/entities/field-value";
import type { InputType } from "@/domain/entities/field-definition";
import { generateAccessToken } from "@/lib/utils";
import { NotificationPublisher } from "@/lib/events/publisher";
import { logger } from "@/lib/dev-logger";
import { redis } from "@/lib/redis";
import { EMAIL_REGEX, PHONE_REGEX, NAME_REGEX, TEXT_REGEX } from "@/constants/constants";
import { sanitizeInput } from "@/lib/utils/sanitize";

interface SubmitFormData {
  clientName: string;
  clientContact?: string;
  sessionId?: string | null;
  contactRecords: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    contact?: string | null;
    role?: string | null;
    notes?: string | null;
    mediaUrl?: string | null;
    mediaPublicId?: string | null;
  }>;
  fieldValues: Array<{
    fieldDefinitionId: string;
    value?: string | number | string[] | null;
    mediaUrl?: string | null;
    mediaPublicId?: string | null;
    mediaItems?: Array<{ url: string; publicId: string }>;
  }>;
}

interface ResubmitPreconditions {
  expectedFormVersion?: string | null;
  expectedSubmissionUpdatedAt?: string | null;
}

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const DEFAULT_CONTACT_NAME = "Primary Contact";

function isObjectId(value: unknown): boolean {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

function normalizeInputType(value: unknown): InputType {
  if (value === "text" || value === "number" || value === "image" || value === "file" || value === "date" || value === "dropdown") {
    return value;
  }

  return "text";
}

function normalizeSnapshotFields(snapshot: unknown): Array<{
  id: string;
  nameEn: string;
  inputType: InputType;
  isMultiple?: boolean;
  updatedAt?: Date | string | null;
  dropdownOptionsEn?: string[];
  dropdownOptionsAr?: string[];
  validationRules?: {
    required?: boolean;
    regexType?: "email" | "phone" | "name";
  };
}> {
  if (!Array.isArray(snapshot)) return [];

  return snapshot
    .map((field) => {
      if (!field || typeof field !== "object") return null;
      const candidate = field as Record<string, unknown>;
      const id = String(candidate.id ?? "").trim();
      if (!id || !isObjectId(id)) return null;

      const validationRules =
        candidate.validationRules && typeof candidate.validationRules === "object"
          ? candidate.validationRules as {
              required?: boolean;
              regexType?: "email" | "phone" | "name";
            }
          : {};

      return {
        id,
        nameEn: String(candidate.nameEn ?? "Unnamed Field"),
        inputType: normalizeInputType(candidate.inputType),
        isMultiple: Boolean(candidate.isMultiple),
        updatedAt: (candidate.updatedAt as Date | string | null | undefined) ?? null,
        dropdownOptionsEn: Array.isArray(candidate.dropdownOptionsEn)
          ? candidate.dropdownOptionsEn.map((v) => String(v))
          : [],
        dropdownOptionsAr: Array.isArray(candidate.dropdownOptionsAr)
          ? candidate.dropdownOptionsAr.map((v) => String(v))
          : [],
        validationRules,
      };
    })
    .filter((field): field is NonNullable<typeof field> => !!field);
}

function computeSnapshotVersion(snapshotFields: Array<{ updatedAt?: Date | string | null }>): string {
  const latest = snapshotFields.reduce((acc, field) => {
    if (!field.updatedAt) return acc;
    const value = field.updatedAt instanceof Date
      ? field.updatedAt.getTime()
      : new Date(field.updatedAt).getTime();
    return Number.isNaN(value) ? acc : Math.max(acc, value);
  }, 0);

  if (latest === 0 || Number.isNaN(latest)) {
    return "0";
  }

  try {
    return new Date(latest).toISOString();
  } catch {
    return "0";
  }
}

function normalizeIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  return date.toISOString();
}

function hasValueContent(value: string | number | string[] | null | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value === undefined || value === null) return false;
  return value.toString().trim().length > 0;
}

function normalizeContactRecords(
  records: SubmitFormData["contactRecords"],
): SubmitFormData["contactRecords"] {
  const seenIds = new Set<string>();
  return records
    .map((record) => {
      const id = String(record.id ?? "").trim();
      if (!id || seenIds.has(id)) return null;
      seenIds.add(id);
      const normalizedName = String(record.name ?? "").trim();
      return {
        id,
        name: normalizedName || DEFAULT_CONTACT_NAME,
        email: record.email ? String(record.email).trim() : undefined,
        phone: record.phone ? String(record.phone).trim() : undefined,
        contact: record.contact ? String(record.contact).trim() : undefined,
        role: record.role ? String(record.role).trim() : undefined,
        notes: record.notes ? String(record.notes).trim() : undefined,
        mediaUrl: record.mediaUrl ? String(record.mediaUrl).trim() : undefined,
        mediaPublicId: record.mediaPublicId ? String(record.mediaPublicId).trim() : undefined,
      };
    })
    .filter((record): record is NonNullable<typeof record> => !!record);
}

/**
 * Use case for client form submission (P1).
 * Validates fields against the currently active form and creates the submission + field values.
 */
export class SubmitFormUseCase {
  constructor(
    private submissionRepo: SubmissionRepository,
    private fieldValueRepo: FieldValueRepository,
    private formTemplateRepo: FormTemplateRepository,
    private fieldDefRepo: FieldDefinitionRepository
  ) {}

  async execute(
    data: SubmitFormData,
    options?: { tokenOrFormId?: string },
  ): Promise<{ success: boolean; submission?: Submission; error?: string }> {
    const tokenOrFormId = options?.tokenOrFormId?.trim();

    let targetForm = null;
    if (tokenOrFormId && OBJECT_ID_PATTERN.test(tokenOrFormId)) {
      targetForm = await this.formTemplateRepo.findById(tokenOrFormId);
    }

    const activeForm = targetForm ?? (await this.formTemplateRepo.findActive());

    if (!activeForm) {
      return { success: false, error: "No active form template found" };
    }

    const activeFields = await this.fieldDefRepo.findByFormId(activeForm.id, false);
    if (activeFields.length === 0) {
      return { success: false, error: "Active form has no fields" };
    }

    const normalizedContacts = normalizeContactRecords(data.contactRecords ?? []);
    if (normalizedContacts.length < 1) {
      return { success: false, error: "At least one contact record is required" };
    }

    const getContactFieldSubmit = (key: string) => activeForm.contactFormFields.find(f => f.key === key);
    for (const contact of normalizedContacts) {
      if (getContactFieldSubmit("email")?.regexEnabled && contact.email && !EMAIL_REGEX.test(contact.email)) {
        return { success: false, error: "Invalid contact email format" };
      }
      if (getContactFieldSubmit("phone")?.regexEnabled && contact.phone && !PHONE_REGEX.test(contact.phone)) {
        return { success: false, error: "Invalid contact phone format" };
      }
      if (getContactFieldSubmit("name")?.regexEnabled && contact.name && !NAME_REGEX.test(contact.name)) {
        return { success: false, error: "Invalid contact name format" };
      }
      if (getContactFieldSubmit("address")?.regexEnabled && contact.contact && !TEXT_REGEX.test(contact.contact)) {
        return { success: false, error: "Invalid contact address format" };
      }
    }

    logger.info("Submit form context resolved", {
      tokenOrFormId,
      resolvedFormId: activeForm.id,
      resolvedFieldCount: activeFields.length,
      providedFieldValues: data.fieldValues?.length ?? 0,
    });

    if (!data.fieldValues || data.fieldValues.length === 0) {
      return { success: false, error: "Submission must contain field values" };
    }

    // 1. Validate required fields
    for (const field of activeFields) {
      if (field.validationRules?.required) {
        const submittedValue = data.fieldValues.find((v) => v.fieldDefinitionId === field.id);
        const hasMedia = submittedValue?.mediaUrl && submittedValue.mediaUrl.trim().length > 0;
        const hasMediaItems = submittedValue?.mediaItems && submittedValue.mediaItems.length > 0;
        const hasTextValue = hasValueContent(submittedValue?.value);

        if (!hasMedia && !hasTextValue && !hasMediaItems) {
          return { success: false, error: `Field '${field.nameEn}' is required` };
        }
      }

      const submittedValue = data.fieldValues.find((v) => v.fieldDefinitionId === field.id);
      if (!submittedValue) continue;

      if (field.inputType === "dropdown" && field.isMultiple) {
        if (!Array.isArray(submittedValue.value)) {
          return { success: false, error: `Field '${field.nameEn}' expects multiple selections` };
        }

        const uniqueValues = [...new Set(submittedValue.value.map((v) => String(v).trim()).filter(Boolean))];
        const allowed = new Set([...(field.dropdownOptionsEn ?? []), ...(field.dropdownOptionsAr ?? [])]);
        if (uniqueValues.some((v) => !allowed.has(v))) {
          return { success: false, error: `Field '${field.nameEn}' contains invalid options` };
        }
      }

      if (field.validationRules?.regexType) {
        const textVal = String(submittedValue.value ?? "").trim();
        if (textVal.length > 0) {
          if (field.validationRules.regexType === "email" && !EMAIL_REGEX.test(textVal)) {
            return { success: false, error: `Field '${field.nameEn}' has an invalid email format` };
          }
          if (field.validationRules.regexType === "phone" && !PHONE_REGEX.test(textVal)) {
            return { success: false, error: `Field '${field.nameEn}' has an invalid phone format` };
          }
          if (field.validationRules.regexType === "name" && !NAME_REGEX.test(textVal)) {
            return { success: false, error: `Field '${field.nameEn}' has an invalid name format` };
          }
        }
      }
    }

    // 2. Create Submission with form snapshot
    const token = generateAccessToken();
    const submission = await this.submissionRepo.create(
      {
        formTemplateId: activeForm.id,
        clientName: data.clientName,
        clientContact: data.clientContact || "",
        contactRecords: normalizedContacts,
        formSnapshot: activeFields,
        sessionId: data.sessionId || null,
      },
      token
    );

    // 3. Extract and map Field Values
    const fieldValuesToCreate: CreateFieldValueInput[] = data.fieldValues.flatMap((fv) => {
        const def = activeFields.find((f) => f.id === fv.fieldDefinitionId);
        if (!def) return []; // Ignore extra fields

        const mapped: CreateFieldValueInput = {
          submissionId: submission.id,
          fieldDefinitionId: def.id,
          fieldNameSnapshot: def.nameEn, // Defaulting to English snapshot, display maps appropriately
          fieldTypeSnapshot: def.inputType,
          value: typeof fv.value === "string" ? sanitizeInput(fv.value) : (fv.value ?? null),
          mediaUrl: fv.mediaUrl ?? null,
          mediaPublicId: fv.mediaPublicId ?? null,
          mediaItems: fv.mediaItems ?? [],
        };
        return [mapped];
      });

    logger.info("Submit field mapping completed", {
      submissionId: submission.id,
      totalReceived: data.fieldValues.length,
      totalPersistable: fieldValuesToCreate.length,
      ignoredFieldValues: data.fieldValues.length - fieldValuesToCreate.length,
    });

    if (fieldValuesToCreate.length > 0) {
      await this.fieldValueRepo.createMany(fieldValuesToCreate);
    }

    try {
      if (redis) {
        await redis.del(`submission:${submission.id}`);
        await redis.keys("submissions:*").then((keys: string[]) => {
          if (keys && keys.length > 0 && redis) return redis.del(...keys);
        });
      }
    } catch (err) {
      logger.error("Failed to invalidate cache on submit", { err });
    }

    // Fire & forget notification
    NotificationPublisher.notifyAdmins({
      type: "NEW_SUBMISSION",
      title: "New Submission",
      message: `${data.clientName} just submitted a new response.`,
      link: `/admin/submissions?expand=${submission.id}`
    });

    return { success: true, submission };
  }

  async resubmit(
    accessToken: string,
    data: SubmitFormData,
    preconditions?: ResubmitPreconditions,
  ): Promise<{ success: boolean; submission?: Submission; error?: string }> {
    const submission = await this.submissionRepo.findByToken(accessToken);
    if (!submission) {
      return { success: false, error: "Submission not found" };
    }

    if (submission.status !== "needs_rewrite" && submission.status !== "draft") {
      return { success: false, error: "Only submissions marked 'Needs Rewrite' or 'Draft' can be resubmitted" };
    }

    const normalizedContacts = normalizeContactRecords(data.contactRecords ?? []);
    if (normalizedContacts.length < 1) {
      return { success: false, error: "At least one contact record is required" };
    }

    const resubmitForm = await this.formTemplateRepo.findById(submission.formTemplateId);
    const getResubmitContactField = (key: string) => resubmitForm?.contactFormFields.find(f => f.key === key);

    for (const contact of normalizedContacts) {
      if (getResubmitContactField("email")?.regexEnabled && contact.email && !EMAIL_REGEX.test(contact.email)) {
        return { success: false, error: "Invalid contact email format" };
      }
      if (getResubmitContactField("phone")?.regexEnabled && contact.phone && !PHONE_REGEX.test(contact.phone)) {
        return { success: false, error: "Invalid contact phone format" };
      }
      if (getResubmitContactField("name")?.regexEnabled && contact.name && !NAME_REGEX.test(contact.name)) {
        return { success: false, error: "Invalid contact name format" };
      }
      if (getResubmitContactField("address")?.regexEnabled && contact.contact && !TEXT_REGEX.test(contact.contact)) {
        return { success: false, error: "Invalid contact address format" };
      }
    }

    if (!data.fieldValues || data.fieldValues.length === 0) {
      return { success: false, error: "Submission must contain field values" };
    }

    const snapshotFields = normalizeSnapshotFields(submission.formSnapshot);
    if (snapshotFields.length === 0) {
      logger.warn("Resubmission blocked due to invalid form snapshot", {
        accessToken,
        submissionId: submission.id,
      });
      return { success: false, error: "Submission form snapshot is invalid" };
    }

    const expectedFormVersion = preconditions?.expectedFormVersion?.trim();
    if (expectedFormVersion) {
      const currentFormVersion = computeSnapshotVersion(snapshotFields);
      if (currentFormVersion !== expectedFormVersion) {
        return { success: false, error: "STALE_FORM_VERSION" };
      }
    }

    const expectedSubmissionUpdatedAt = preconditions?.expectedSubmissionUpdatedAt?.trim();
    if (expectedSubmissionUpdatedAt) {
      const currentSubmissionUpdatedAt = normalizeIso(submission.updatedAt);
      if (currentSubmissionUpdatedAt !== normalizeIso(expectedSubmissionUpdatedAt)) {
        return { success: false, error: "STALE_SUBMISSION_VERSION" };
      }
    }

    if (!isObjectId(submission.id)) {
      logger.warn("Resubmission blocked due to invalid submission id", {
        accessToken,
        submissionId: submission.id,
      });
      return { success: false, error: "Submission id is invalid" };
    }

    // 1. Validate against the snapshot
    for (const field of snapshotFields) {
      if (field.validationRules?.required) {
        const submittedValue = data.fieldValues.find((v) => v.fieldDefinitionId === field.id);
        const hasMedia = submittedValue?.mediaUrl && submittedValue.mediaUrl.trim().length > 0;
        const hasMediaItems = submittedValue?.mediaItems && submittedValue.mediaItems.length > 0;
        const hasTextValue = hasValueContent(submittedValue?.value);

        if (!hasMedia && !hasTextValue && !hasMediaItems) {
          return { success: false, error: `Field '${field.nameEn}' is required` };
        }
      }

      const submittedValue = data.fieldValues.find((v) => v.fieldDefinitionId === field.id);
      if (!submittedValue) continue;

      if (field.inputType === "dropdown" && field.isMultiple) {
        if (!Array.isArray(submittedValue.value)) {
          return { success: false, error: `Field '${field.nameEn}' expects multiple selections` };
        }

        const uniqueValues = [...new Set(submittedValue.value.map((v) => String(v).trim()).filter(Boolean))];
        const allowed = new Set([...(field.dropdownOptionsEn ?? []), ...(field.dropdownOptionsAr ?? [])]);
        if (uniqueValues.some((v) => !allowed.has(v))) {
          return { success: false, error: `Field '${field.nameEn}' contains invalid options` };
        }
      }

      if (field.validationRules?.regexType) {
        const textVal = String(submittedValue.value ?? "").trim();
        if (textVal.length > 0) {
          if (field.validationRules.regexType === "email" && !EMAIL_REGEX.test(textVal)) {
            return { success: false, error: `Field '${field.nameEn}' has an invalid email format` };
          }
          if (field.validationRules.regexType === "phone" && !PHONE_REGEX.test(textVal)) {
            return { success: false, error: `Field '${field.nameEn}' has an invalid phone format` };
          }
          if (field.validationRules.regexType === "name" && !NAME_REGEX.test(textVal)) {
            return { success: false, error: `Field '${field.nameEn}' has an invalid name format` };
          }
        }
      }
    }

    // 2. Replace Field Values to support draft tokens that do not yet have rows.
    // updateMany alone cannot create missing field-value records for freshly provisioned drafts.
    const fieldValuesToCreate: CreateFieldValueInput[] = data.fieldValues.flatMap((fv) => {
        const def = snapshotFields.find((f) => f.id === fv.fieldDefinitionId);
        if (!def) return [];

        const mapped: CreateFieldValueInput = {
          submissionId: submission.id,
          fieldDefinitionId: def.id,
          fieldNameSnapshot: def.nameEn,
          fieldTypeSnapshot: def.inputType,
          value: typeof fv.value === "string" ? sanitizeInput(fv.value) : (fv.value ?? null),
          mediaUrl: fv.mediaUrl ?? null,
          mediaPublicId: fv.mediaPublicId ?? null,
          mediaItems: fv.mediaItems ?? [],
        };
        return [mapped];
      });

    await this.fieldValueRepo.deleteBySubmissionId(submission.id);
    if (fieldValuesToCreate.length > 0) {
      await this.fieldValueRepo.createMany(fieldValuesToCreate);
    }

    logger.info("Resubmission field replacement completed", {
      submissionId: submission.id,
      totalReceived: data.fieldValues.length,
      totalPersisted: fieldValuesToCreate.length,
      ignoredFieldValues: data.fieldValues.length - fieldValuesToCreate.length,
    });

    // 3. Reset submission status to pending and update details
    const updatedSubmission = await this.submissionRepo.resetStatusForResubmission(
      submission.id,
      data.clientName,
      data.clientContact,
      normalizedContacts,
    );

    try {
      if (redis) {
        await redis.del(`submission:${submission.id}`);
        await redis.del(`submission:token:${accessToken}`);
        await redis.keys("submissions:*").then((keys) => {
          if (keys && keys.length > 0 && redis) return redis.del(...keys);
        });
      }
    } catch (err) {
      logger.error("Failed to invalidate cache on resubmit", { err });
    }

    // Fire & forget notification
    NotificationPublisher.notifyAdmins({
      type: "NEW_SUBMISSION",
      title: "Submission Corrected",
      message: `${data.clientName} has corrected their rejected submission.`,
      link: `/admin/submissions?expand=${submission.id}`
    });

    return { success: true, submission: updatedSubmission || submission };
  }
}
