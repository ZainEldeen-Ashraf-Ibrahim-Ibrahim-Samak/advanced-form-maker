import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { SubmissionModel } from "@/data/models/submission.model";
import { MongoFieldValueRepository } from "@/data/repositories/mongo-field-value-repository";
import { analyzeFormSubmissions } from "@/data/services/ai-form-analysis-service";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

const fieldValueRepo = new MongoFieldValueRepository();

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const adminName = searchParams.get("admin") || "all";
    const formId = searchParams.get("formId") || "all";

    let locale = "ar";
    try {
      const body = await request.json();
      if (body && typeof body.locale === "string") {
        locale = body.locale;
      }
    } catch {
      // Ignore if body is empty
    }

    await connectToDatabase();

    const filter: mongoose.FilterQuery<Record<string, unknown>> = {};
    
    if (status && status !== "all") {
      filter.status = status;
    }

    if (formId && formId !== "all") {
      filter.formTemplateId = formId;
    }

    // Load matching submissions up to 500 to keep it efficient and prevent timeouts
    let docs = await SubmissionModel.find(filter)
      .sort({ submittedAt: -1 })
      .limit(500)
      .lean();

    // Post-filter by admin updater if needed
    if (adminName && adminName !== "all") {
      docs = docs.filter((doc) => {
        const auditTrail = doc.auditTrail || [];
        if (auditTrail.length > 0) {
          const updatedEntry = [...auditTrail]
            .reverse()
            .find((entry: any) => entry.newStatus === doc.status);
          if (updatedEntry) {
            return updatedEntry.adminName === adminName;
          }
        }
        return false;
      });
    }

    if (docs.length === 0) {
      return errorResponse("No submissions found for the current filters.", 400, "NO_SUBMISSIONS_FOUND");
    }

    // Load field values for each submission
    const detailedSubmissions = await Promise.all(
      docs.map(async (doc) => {
        const values = await fieldValueRepo.findBySubmissionId(doc._id.toString());
        const fieldValues: Record<string, any> = {};
        
        for (const fv of values) {
          const fieldName = fv.fieldNameSnapshot || fv.fieldDefinitionId;
          if (fv.mediaUrl) {
            fieldValues[fieldName] = { value: fv.mediaUrl };
          } else if (fv.mediaItems && fv.mediaItems.length > 0) {
            fieldValues[fieldName] = { value: fv.mediaItems.map((item) => item.url).join(", ") };
          } else {
            fieldValues[fieldName] = { value: fv.value };
          }
        }

        const contactRecords = doc.contactRecords || [];
        return {
          _id: doc._id.toString(),
          contactData: {
            name: doc.clientName || "",
            phone: doc.clientContact || "",
            email: contactRecords[0]?.email || "",
            address: contactRecords[0]?.contact || "",
          },
          fieldValues,
          createdAt: doc.submittedAt || new Date(),
        };
      })
    );

    // Call Gemini AI analysis service
    const aiResult = await analyzeFormSubmissions(detailedSubmissions, locale);

    return successResponse({
      summary: aiResult.summary,
      patterns: aiResult.patterns,
      findings: aiResult.findings,
      sentimentOverview: aiResult.sentimentOverview,
      submissionCount: docs.length,
    });
  } catch (error: any) {
    logger.error("AI submissions analysis failed", error);
    return errorResponse(error.message || "Failed to analyze submissions", 500, "ANALYSIS_FAILED");
  }
}
