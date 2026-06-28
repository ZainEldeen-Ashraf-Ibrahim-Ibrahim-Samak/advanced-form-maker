import { FieldDefinition } from "./field-definition";
import { User } from "./user";

/**
 * Submission entity interface.
 * Domain layer — zero framework imports.
 */

export type SubmissionStatus = "draft" | "pending" | "viewed" | "needs_rewrite";

export type ResubmissionRequestStatus =
  | "pending_delivery"
  | "delivered"
  | "seen"
  | "expired";

export interface ContactRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact?: string | null;
  role?: string | null;
  notes?: string | null;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
}

export interface ResubmissionRequest {
  id: string;
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

export interface AuditEntry {
  oldStatus: SubmissionStatus;
  newStatus: SubmissionStatus;
  comment?: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
}

export interface Submission {
  id: string;
  accessToken: string;
  formTemplateId: string;
  clientName: string;
  clientContact: string;
  status: SubmissionStatus;
  rewriteComment: string;
  contactRecords: ContactRecord[];
  formSnapshot: ReadonlyArray<FieldDefinition>;
  auditTrail: AuditEntry[];
  resubmissionRequest?: ResubmissionRequest | null;
  submittedAt: Date;
  lastResubmittedAt?: Date | null;
  sessionId: string | null;
  updatedAt: Date;
}

export type CreateSubmissionInput = Pick<
  Submission,
  | "clientName"
  | "clientContact"
  | "contactRecords"
  | "formTemplateId"
  | "formSnapshot"
> & {
  sessionId?: string | null;
};

export type UpdateSubmissionStatusInput = {
  status: SubmissionStatus;
  comment?: string;
  admin: Pick<User, "id" | "name">;
};
