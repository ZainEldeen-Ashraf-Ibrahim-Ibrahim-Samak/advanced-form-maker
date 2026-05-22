import { SubmissionRepository } from "@/domain/repositories/submission-repository";
import { FieldValueRepository } from "@/domain/repositories/field-value-repository";
import { FormTemplateRepository } from "@/domain/repositories/form-template-repository";
import { FieldDefinitionRepository } from "@/domain/repositories/field-definition-repository";
import { Submission } from "@/domain/entities/submission";
import { FieldValue } from "@/domain/entities/field-value";
import { FormTemplate } from "@/domain/entities/form-template";
import { FieldDefinition } from "@/domain/entities/field-definition";

interface ViewSubmissionResult {
  isNew: boolean;
  formTemplate?: FormTemplate;
  fields?: FieldDefinition[];
  formVersion?: string;
  submission?: Submission;
  values?: FieldValue[];
}

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

function computeFieldVersion(fields: FieldDefinition[], formUpdatedAt?: Date | string | null): string {
  const latest = fields.reduce((acc, field) => {
    if (!field.updatedAt) return acc;
    const value = field.updatedAt instanceof Date ? field.updatedAt.getTime() : new Date(field.updatedAt).getTime();
    return Number.isNaN(value) ? acc : Math.max(acc, value);
  }, 0);

  const formUpdatedAtValue = formUpdatedAt
    ? new Date(formUpdatedAt).getTime()
    : 0;

  const versionValue = Math.max(
    latest,
    Number.isNaN(formUpdatedAtValue) ? 0 : formUpdatedAtValue,
  );

  if (versionValue === 0 || Number.isNaN(versionValue)) {
    return "0";
  }

  try {
    return new Date(versionValue).toISOString();
  } catch {
    return "0";
  }
}

/**
 * Use case for a client viewing a submission link (US2).
 * If the token isn't a submission yet, we render the active form.
 * If it is, we return the submission status and data.
 */
export class ViewSubmissionUseCase {
  constructor(
    private submissionRepo: SubmissionRepository,
    private fieldValueRepo: FieldValueRepository,
    private formTemplateRepo: FormTemplateRepository,
    private fieldDefRepo: FieldDefinitionRepository
  ) {}

  private async buildExistingSubmissionResult(submission: Submission): Promise<ViewSubmissionResult> {
    const values = await this.fieldValueRepo.findBySubmissionId(submission.id);
    const linkedForm = await this.formTemplateRepo.findById(submission.formTemplateId);

    // For editable states, always resolve latest published fields so token refresh picks up admin changes.
    if (submission.status === "draft" || submission.status === "needs_rewrite") {
      const activeForm = linkedForm ?? (await this.formTemplateRepo.findActive());

      if (activeForm) {
        const liveFields = await this.fieldDefRepo.findByFormId(activeForm.id, false);
        return {
          isNew: false,
          formTemplate: activeForm,
          submission,
          values,
          fields: liveFields,
          formVersion: computeFieldVersion(liveFields, activeForm.updatedAt),
        };
      }
    }

    const fields = Array.isArray(submission.formSnapshot) && submission.formSnapshot.length > 0
      ? [...submission.formSnapshot]
      : (linkedForm ? await this.fieldDefRepo.findByFormId(linkedForm.id, true) : []);

    return {
      isNew: false,
      formTemplate: linkedForm ?? undefined,
      submission,
      values,
      fields,
      formVersion: computeFieldVersion(fields, linkedForm?.updatedAt),
    };
  }

  async execute(tokenOrId: string): Promise<ViewSubmissionResult | null> {
    const submissionByToken = await this.submissionRepo.findByToken(tokenOrId);
    if (submissionByToken) {
      return this.buildExistingSubmissionResult(submissionByToken);
    }

    let targetForm: FormTemplate | null = null;
    if (OBJECT_ID_PATTERN.test(tokenOrId)) {
      targetForm = await this.formTemplateRepo.findById(tokenOrId);

      if (!targetForm) {
        const submissionById = await this.submissionRepo.findById(tokenOrId);
        if (submissionById) {
          return this.buildExistingSubmissionResult(submissionById);
        }
      }
    }

    if (!targetForm) {
      targetForm = await this.formTemplateRepo.findActive();
    }

    if (!targetForm) {
      return null;
    }

    const fields = await this.fieldDefRepo.findByFormId(targetForm.id, false);

    return {
      isNew: true,
      formTemplate: targetForm,
      fields,
      formVersion: computeFieldVersion(fields, targetForm.updatedAt),
    };
  }
}
