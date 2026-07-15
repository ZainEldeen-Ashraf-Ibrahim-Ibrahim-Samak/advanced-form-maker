import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { MongoFieldValueRepository } from "@/data/repositories/mongo-field-value-repository";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { MongoFieldDefinitionRepository } from "@/data/repositories/mongo-field-definition-repository";
import { ViewSubmissionUseCase } from "@/domain/use-cases/client/view-submission";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

const submissionRepo = new MongoSubmissionRepository();
const fieldValueRepo = new MongoFieldValueRepository();
const formTemplateRepo = new MongoFormTemplateRepository();
const fieldDefRepo = new MongoFieldDefinitionRepository();

const viewUseCase = new ViewSubmissionUseCase(
  submissionRepo,
  fieldValueRepo,
  formTemplateRepo,
  fieldDefRepo
);

type SubmitRouteDependencies = {
  createSubmissionSchema: typeof import("@/lib/validations").createSubmissionSchema;
  submitUseCase: InstanceType<typeof import("@/domain/use-cases/client/submit-form").SubmitFormUseCase>;
  NotificationPublisher: typeof import("@/lib/events/publisher").NotificationPublisher;
  parseSecureJson: typeof import("@/lib/api-security").parseSecureJson;
};

let submitDepsPromise: Promise<SubmitRouteDependencies> | null = null;

async function getSubmitDependencies(): Promise<SubmitRouteDependencies> {
  if (!submitDepsPromise) {
    submitDepsPromise = (async () => {
      const [
        { createSubmissionSchema },
        { SubmitFormUseCase },
        { NotificationPublisher },
        { parseSecureJson },
      ] = await Promise.all([
        import("../../../../lib/validations"),
        import("../../../../domain/use-cases/client/submit-form"),
        import("../../../../lib/events/publisher"),
        import("../../../../lib/api-security"),
      ]);

      const submitUseCase = new SubmitFormUseCase(
        submissionRepo,
        fieldValueRepo,
        formTemplateRepo,
        fieldDefRepo,
      );

      return {
        createSubmissionSchema,
        submitUseCase,
        NotificationPublisher,
        parseSecureJson,
      };
    })();
  }

  try {
    return await submitDepsPromise;
  } catch (error) {
    submitDepsPromise = null;
    throw error;
  }
}

export const dynamic = "force-dynamic";

function normalizeVersion(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  // If it looks like a date, normalize to a consistent ISO format to avoid precision mismatches.
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (_) {
    // Treat as raw string
  }
  return trimmed;
}

function areVersionsMatch(v1: string | null, v2: string | null): boolean {
  if (v1 === v2) return true;
  if (!v1 || !v2) return false;

  // Comparison logic for dates to account for millisecond precision differences.
  try {
    const d1 = new Date(v1);
    const d2 = new Date(v2);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      // Compare based on ms timestamp to ignore string formatting differences (like .000Z).
      return d1.getTime() === d2.getTime();
    }
  } catch (_) {
    // Fallback to string match
  }
  return v1 === v2;
}

function conflictResponse(code: "STALE_FORM_VERSION" | "STALE_SUBMISSION_VERSION") {
  return errorResponse("Client state is stale. Refresh and retry.", 409, code);
}

function summarizeFieldValues(
  fieldValues: Array<{
    fieldDefinitionId: string;
    value?: any;
    mediaUrl?: string | null;
    mediaItems?: Array<{ url: string; publicId: string }>;
  }>,
) {
  return {
    total: fieldValues.length,
    withText: fieldValues.filter(
      (fv) => {
        if (Array.isArray(fv.value)) return fv.value.length > 0;
        return fv.value !== null && fv.value !== undefined && String(fv.value).trim().length > 0;
      },
    ).length,
    withMediaUrl: fieldValues.filter((fv) => !!fv.mediaUrl).length,
    withMediaItems: fieldValues.filter((fv) => (fv.mediaItems?.length ?? 0) > 0).length,
    ids: fieldValues.map((fv) => fv.fieldDefinitionId),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const result = await viewUseCase.execute(token);

    if (!result) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    return successResponse(result);
  } catch (error) {
    logger.error("Failed to fetch submission by token", { error });
    return errorResponse("server_error", 500, "SUBMISSION_FETCH_FAILED");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const {
      createSubmissionSchema,
      submitUseCase,
      NotificationPublisher,
      parseSecureJson,
    } = await getSubmitDependencies();

    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data as any;

    const expectedFormVersion =
      normalizeVersion(request.headers.get("if-match-form-version")) ||
      normalizeVersion(body.expectedFormVersion);

    const current = await viewUseCase.execute(token);
    if (current?.formTemplate?.isLocked) {
      const t = await getTranslations("errors");
      return NextResponse.json({ error: t("formLocked") }, { status: 423 });
    }

    if (expectedFormVersion) {
      const currentFormVersion = normalizeVersion(current?.formVersion);
      if (expectedFormVersion && !areVersionsMatch(currentFormVersion, expectedFormVersion)) {
        return conflictResponse("STALE_FORM_VERSION");
      }
    }

    const parsed = createSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn("Submission validation failed", {
        issues: parsed.error.flatten(),
      });
      return errorResponse("Validation error", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    logger.info("Submission POST accepted", {
      clientNameLength: parsed.data.clientName.length,
      clientContactLength: parsed.data.clientContact?.length ?? 0,
      contactRecordsCount: parsed.data.contactRecords?.length ?? 0,
      fieldSummary: summarizeFieldValues(parsed.data.fieldValues),
    });

    const result = await submitUseCase.execute({
      clientName: parsed.data.clientName,
      clientContact: parsed.data.clientContact,
      contactRecords: parsed.data.contactRecords,
      fieldValues: parsed.data.fieldValues,
      sessionId: parsed.data.sessionId,
    }, {
      tokenOrFormId: token,
    });

    if (!result.success || !result.submission) {
      logger.warn("Submission POST rejected by use-case", {
        reason: result.error ?? "Unknown",
      });
      return errorResponse(result.error ?? "Invalid submission", 400, "SUBMISSION_INVALID");
    }

    logger.info("Submission POST persisted", {
      submissionId: result.submission.id,
      accessToken: result.submission.accessToken,
    });

    // Notify admins
    await NotificationPublisher.notifyAdmins({
      type: "NEW_SUBMISSION",
      title: "New Submission",
      message: `${parsed.data.clientName} has submitted a new form.`,
      link: `/admin/submissions/${result.submission.id}`
    });

    return successResponse(result.submission, 201);
  } catch (error) {
    logger.error("Failed to submit form", error);
    return errorResponse("server_error", 500, "SUBMISSION_CREATE_FAILED");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const {
      createSubmissionSchema,
      submitUseCase,
      NotificationPublisher,
      parseSecureJson,
    } = await getSubmitDependencies();

    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data as any;

    const expectedFormVersion =
      normalizeVersion(request.headers.get("if-match-form-version")) ||
      normalizeVersion(body.expectedFormVersion);
    const expectedSubmissionUpdatedAt =
      normalizeVersion(request.headers.get("if-match-submission-updated-at")) ||
      normalizeVersion(body.expectedSubmissionUpdatedAt);

    const current = await viewUseCase.execute(token);
    if (current?.formTemplate?.isLocked) {
      const t = await getTranslations("errors");
      return NextResponse.json({ error: t("formLocked") }, { status: 423 });
    }

    if (expectedFormVersion || expectedSubmissionUpdatedAt) {
      const currentFormVersion = normalizeVersion(current?.formVersion);
      const currentSubmissionUpdatedAt = normalizeVersion(
        current?.submission?.updatedAt
          ? new Date(current.submission.updatedAt).toISOString()
          : null,
      );

      if (!current || current.isNew) {
        return errorResponse("Not found", 404, "NOT_FOUND");
      }

      if (expectedFormVersion && !areVersionsMatch(currentFormVersion, expectedFormVersion)) {
        return conflictResponse("STALE_FORM_VERSION");
      }

      if (
        expectedSubmissionUpdatedAt &&
        !areVersionsMatch(currentSubmissionUpdatedAt, expectedSubmissionUpdatedAt)
      ) {
        return conflictResponse("STALE_SUBMISSION_VERSION");
      }
    }

    const parsed = createSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn("Resubmission validation failed", {
        issues: parsed.error.flatten(),
      });
      return errorResponse("Validation error", 400, "VALIDATION_ERROR", parsed.error.flatten());
    }

    logger.info("Submission PATCH accepted", {
      clientNameLength: parsed.data.clientName.length,
      clientContactLength: parsed.data.clientContact?.length ?? 0,
      contactRecordsCount: parsed.data.contactRecords?.length ?? 0,
      fieldSummary: summarizeFieldValues(parsed.data.fieldValues),
    });

    const result = await submitUseCase.resubmit(token, {
      clientName: parsed.data.clientName,
      clientContact: parsed.data.clientContact,
      contactRecords: parsed.data.contactRecords,
      fieldValues: parsed.data.fieldValues,
    }, {
      expectedFormVersion,
      expectedSubmissionUpdatedAt,
    });

    if (!result.success || !result.submission) {
      if (result.error === "STALE_FORM_VERSION" || result.error === "STALE_SUBMISSION_VERSION") {
        return errorResponse("Client state is stale. Refresh and retry.", 409, result.error);
      }

      logger.warn("Submission PATCH rejected by use-case", {
        reason: result.error ?? "Unknown",
      });
      return errorResponse(result.error ?? "Invalid resubmission", 400, "RESUBMISSION_INVALID");
    }

    logger.info("Submission PATCH persisted", {
      token,
      submissionId: result.submission.id,
    });

    // Notify admins
    await NotificationPublisher.notifyAdmins({
      type: "NEW_SUBMISSION",
      title: "Form Resubmitted",
      message: `${parsed.data.clientName} has updated their submission.`,
      link: `/admin/submissions/${result.submission.id}`
    });

    return successResponse(result.submission);
  } catch (error) {
    logger.error("Failed to resubmit form", error);
    return errorResponse("server_error", 500, "SUBMISSION_RESUBMIT_FAILED");
  }
}
