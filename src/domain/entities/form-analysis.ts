export interface FormAnalysis {
  id: string;
  formTemplateId: string;
  enabled: boolean;
  summary: string | null;
  patterns: string[];
  findings: string[];
  sentimentOverview: string | null;
  analyzedAt: Date | null;
  submissionCount: number;
  analysisStatus: "idle" | "running" | "done" | "failed";
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
