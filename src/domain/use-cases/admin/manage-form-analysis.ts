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
    const analysis = await this.analysisRepo.findByFormId(formId);

    // Backfill computed stats if they're missing (analysis pre-dates these fields,
    // or analysis has never been run but submissions exist)
    const needsStats =
      !analysis?.submissionDateRange || analysis.submissionCount === 0;

    if (needsStats) {
      const submissions = await this.submissionRepo.findByFormId(formId);
      if (submissions.length === 0) return analysis;

      let earliest = submissions[0].submittedAt;
      let latest = submissions[0].submittedAt;
      for (const sub of submissions) {
        if (sub.submittedAt < earliest) earliest = sub.submittedAt;
        if (sub.submittedAt > latest) latest = sub.submittedAt;
      }

      const patch = {
        submissionCount: submissions.length,
        submissionDateRange: { earliest, latest },
      };

      // Persist the backfilled stats so future GETs don't recompute
      const updated = await this.analysisRepo.upsert(formId, patch);
      return updated;
    }

    return analysis;
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

      // To collect top answers per field:
      // Map<fieldNameSnapshot/fieldDefinitionId, Map<string, number>>
      const valueCountsMap = new Map<string, Map<string, number>>();

      // 4. Load field values for each submission in parallel
      const detailedSubmissions = await Promise.all(
        submissions.map(async (sub) => {
          const values = await this.fieldValueRepo.findBySubmissionId(sub.id);
          
          // Reconstruct fieldValues in the format expected by the AI service
          const fieldValues: Record<string, any> = {};
          for (const fv of values) {
            const fieldName = fv.fieldNameSnapshot || fv.fieldDefinitionId;
            let valStr = "";
            if (fv.mediaUrl) {
              valStr = "[File/Image]";
            } else if (fv.mediaItems && fv.mediaItems.length > 0) {
              valStr = `[${fv.mediaItems.length} File(s)]`;
            } else if (Array.isArray(fv.value)) {
              valStr = fv.value.join(", ");
            } else if (fv.value !== null && fv.value !== undefined) {
              valStr = String(fv.value).trim();
            }

            if (valStr) {
              if (!valueCountsMap.has(fieldName)) {
                valueCountsMap.set(fieldName, new Map<string, number>());
              }
              const counts = valueCountsMap.get(fieldName)!;
              counts.set(valStr, (counts.get(valStr) || 0) + 1);
            }

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

      // Compute date range
      let earliest = submissions[0].submittedAt;
      let latest = submissions[0].submittedAt;
      for (const sub of submissions) {
        const date = sub.submittedAt;
        if (date < earliest) earliest = date;
        if (date > latest) latest = date;
      }
      const submissionDateRange = { earliest, latest };

      // Compute top answers
      const topAnswers: Array<{ fieldLabel: string; topValue: string; count: number }> = [];
      for (const [fieldLabel, counts] of valueCountsMap.entries()) {
        const sorted = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        
        for (const [topValue, count] of sorted) {
          topAnswers.push({
            fieldLabel,
            topValue,
            count,
          });
        }
      }

      // 5. Call AI Service
      const aiResult = await analyzeFormSubmissions(detailedSubmissions, locale);

      // 6. Upsert the successful result
      const finalResult = await this.analysisRepo.upsert(formId, {
        summary: aiResult.summary,
        patterns: aiResult.patterns,
        findings: aiResult.findings,
        sentimentOverview: aiResult.sentimentOverview,
        submissionCount: submissions.length,
        topAnswers,
        submissionDateRange,
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
