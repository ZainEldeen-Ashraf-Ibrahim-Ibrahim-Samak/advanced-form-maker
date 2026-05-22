import { ResubmissionRequestStatus } from "./submission";

export interface ResubmissionRequest {
  id: string;
  submissionId: string;
  targetAccessToken: string;
  requestedByAdminId: string;
  requestedByAdminName: string;
  comment?: string;
  status: ResubmissionRequestStatus;
  createdAt: Date;
  expiresAt: Date;
  deliveredAt?: Date | null;
  seenAt?: Date | null;
}
