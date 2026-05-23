import { FormAnalysis } from "@/domain/entities/form-analysis";

export interface IFormAnalysisRepository {
  findByFormId(formId: string): Promise<FormAnalysis | null>;
  upsert(formId: string, data: Partial<FormAnalysis>): Promise<FormAnalysis>;
  setEnabled(formId: string, enabled: boolean): Promise<FormAnalysis | null>;
  setStatus(
    formId: string,
    status: FormAnalysis["analysisStatus"],
    errorMessage?: string | null
  ): Promise<FormAnalysis | null>;
}
