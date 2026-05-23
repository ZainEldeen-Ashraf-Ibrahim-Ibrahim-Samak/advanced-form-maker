export interface TopAnswer {
  fieldLabel: string;
  topValue: string;
  count: number;
}

export interface SubmissionDateRange {
  earliest: Date;
  latest: Date;
}

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
  topAnswers: TopAnswer[] | null;
  submissionDateRange: SubmissionDateRange | null;
  analysisStatus: "idle" | "running" | "done" | "failed";
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
