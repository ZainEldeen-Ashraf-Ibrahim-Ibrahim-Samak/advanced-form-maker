import { MongoFormAnalysisRepository } from "@/data/repositories/mongo-form-analysis-repository";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { MongoFieldValueRepository } from "@/data/repositories/mongo-field-value-repository";
import { analyzeFormSubmissions } from "@/data/services/ai-form-analysis-service";
import { FormAnalysis } from "@/domain/entities/form-analysis";

export class ManageFormAnalysisUseCase {
  private analysisRepo = new MongoFormAnalysisRepository();
  private submissionRepo = new MongoSubmissionRepository();
  private fieldValueRepo = new MongoFieldValueRepository();

  async getAnalysis(formId: string): Promise<FormAnalysis | null> {
    return await this.analysisRepo.findByFormId(formId);
  }

  async setEnabled(formId: string, enabled: boolean): Promise<FormAnalysis | null> {
    return await this.analysisRepo.setEnabled(formId, enabled);
  }

  async triggerAnalysis(formId: string, locale: string = "ar"): Promise<FormAnalysis> {
    // 1. Get or create initial analysis configuration to check if enabled
    let analysis = await this.analysisRepo.findByFormId(formId);
    if (!analysis) {
      analysis = await this.analysisRepo.upsert(formId, {
        enabled: true,
        analysisStatus: "idle",
      });
    }

    if (!analysis.enabled) {
      throw new Error("AI analysis is disabled for this form template");
    }

    // 2. Set status to "running"
    await this.analysisRepo.setStatus(formId, "running", null);

    try {
      // 3. Fetch submissions
      const submissions = await this.submissionRepo.findByFormId(formId);
      if (submissions.length === 0) {
        throw new Error("Cannot run analysis on an empty dataset (0 submissions)");
      }

      // 4. Load field values for each submission in parallel
      const detailedSubmissions = await Promise.all(
        submissions.map(async (sub) => {
          const values = await this.fieldValueRepo.findBySubmissionId(sub.id);
          
          // Reconstruct fieldValues in the format expected by the AI service
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

          return {
            _id: sub.id,
            contactData: {
              name: sub.clientName,
              phone: sub.clientContact,
              email: sub.contactRecords?.[0]?.email || "",
              address: (sub.contactRecords?.[0] as any)?.address || sub.contactRecords?.[0]?.contact || "",
            },
            fieldValues,
            createdAt: sub.submittedAt,
          };
        })
      );

      // 5. Call AI Service
      const aiResult = await analyzeFormSubmissions(detailedSubmissions, locale);

      // 6. Upsert the successful result
      const finalResult = await this.analysisRepo.upsert(formId, {
        summary: aiResult.summary,
        patterns: aiResult.patterns,
        findings: aiResult.findings,
        sentimentOverview: aiResult.sentimentOverview,
        submissionCount: submissions.length,
        analyzedAt: new Date(),
        analysisStatus: "done",
        errorMessage: null,
      });

      return finalResult;
    } catch (error: any) {
      // 7. Upsert the failed status
      await this.analysisRepo.setStatus(formId, "failed", error.message || "Failed during AI generation");
      throw error;
    }
  }
}
