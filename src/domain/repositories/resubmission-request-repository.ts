import { ResubmissionRequest } from "../entities/resubmission-request";

export interface ResubmissionRequestRepository {
  create(request: ResubmissionRequest): Promise<ResubmissionRequest>;
  updateStatus(id: string, status: ResubmissionRequest["status"]): Promise<ResubmissionRequest | null>;
  findPendingByTargetUser(targetAccessToken: string): Promise<ResubmissionRequest[]>;
  findBySubmissionId(submissionId: string): Promise<ResubmissionRequest | null>;
  markDelivered(targetAccessToken: string): Promise<void>;
  markSeen(id: string): Promise<void>;
  expireOldRequests(): Promise<void>; // lazy clean up
}
