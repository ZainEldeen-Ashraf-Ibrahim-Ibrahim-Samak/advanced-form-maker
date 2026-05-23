import { SubmissionRepository } from "@/domain/repositories/submission-repository";
import { Submission, CreateSubmissionInput, UpdateSubmissionStatusInput } from "@/domain/entities/submission";
import { SubmissionModel } from "@/data/models/submission.model";
import mongoose from "mongoose";
import { FieldValueModel } from "@/data/models/field-value.model";
import { destroyAssets } from "@/data/services/cloudinary-service";
import { connectToDatabase } from "@/lib/db";
import { CacheService } from "@/data/services/cache-service";
import { logger } from "@/lib/dev-logger";
import { NotificationPublisher } from "@/lib/events/publisher";

const RESUBMISSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CONTACT_NAME = "Primary Contact";

function isSubmissionEntity(value: unknown): value is Submission {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.length > 0 &&
    typeof candidate.formTemplateId === "string" &&
    candidate.formTemplateId.length > 0
  );
}

function normalizeContactRecords(records: unknown): Submission["contactRecords"] {
  if (!Array.isArray(records)) return [];
  const processed = records.map((item) => {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!id) return null;
    return {
      id,
      name: name || DEFAULT_CONTACT_NAME,
      email: typeof candidate.email === "string" ? candidate.email : "",
      phone: typeof candidate.phone === "string" ? candidate.phone : "",
      contact: typeof candidate.contact === "string" ? candidate.contact : "",
      role: typeof candidate.role === "string" ? candidate.role : "",
      notes: typeof candidate.notes === "string" ? candidate.notes : "",
    };
  });
  return processed.filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeResubmissionRequest(
  request: unknown,
): Submission["resubmissionRequest"] {
  if (!request || typeof request !== "object") return null;

  const candidate = request as Record<string, unknown>;
  const status = candidate.status;
  if (
    status !== "pending_delivery" &&
    status !== "delivered" &&
    status !== "seen" &&
    status !== "expired"
  ) {
    return null;
  }

  const createdAtRaw = candidate.createdAt ? new Date(String(candidate.createdAt)).getTime() : 0;
  const expiresAtRaw = candidate.expiresAt ? new Date(String(candidate.expiresAt)).getTime() : 0;

  return {
    id: String(candidate.id ?? ""),
    targetAccessToken: String(candidate.targetAccessToken ?? ""),
    requestedByAdminId: candidate.requestedByAdminId?.toString() ?? "",
    requestedByAdminName: String(candidate.requestedByAdminName ?? ""),
    comment: typeof candidate.comment === "string" ? candidate.comment : "",
    status,
    createdAt: isNaN(createdAtRaw) || createdAtRaw === 0 ? new Date() : new Date(createdAtRaw),
    expiresAt: isNaN(expiresAtRaw) || expiresAtRaw === 0 ? new Date(Date.now() + RESUBMISSION_RETENTION_MS) : new Date(expiresAtRaw),
    deliveredAt: candidate.deliveredAt ? new Date(String(candidate.deliveredAt)) : null,
    seenAt: candidate.seenAt ? new Date(String(candidate.seenAt)) : null,
  };
}

function toEntity(doc: Record<string, unknown>): Submission {
  const submittedAtRaw = doc.submittedAt ? new Date(String(doc.submittedAt)).getTime() : 0;
  const updatedAtRaw = doc.updatedAt ? new Date(String(doc.updatedAt)).getTime() : 0;
  const lastResubmittedAtRaw = doc.lastResubmittedAt ? new Date(String(doc.lastResubmittedAt)).getTime() : 0;

  return {
    id: doc._id?.toString() ?? "",
    accessToken: doc.accessToken as string,
    formTemplateId: doc.formTemplateId?.toString() ?? "",
    clientName: (doc.clientName as string) || "Unnamed Submission",
    clientContact: (doc.clientContact as string) || "",
    status: (doc.status as Submission["status"]) || "pending",
    rewriteComment: (doc.rewriteComment as string) || "",
    contactRecords: normalizeContactRecords(doc.contactRecords),
    formSnapshot: (doc.formSnapshot as unknown as Submission["formSnapshot"]) || [],
    auditTrail: (doc.auditTrail as unknown as Submission["auditTrail"]) || [],
    resubmissionRequest: normalizeResubmissionRequest(doc.resubmissionRequest),
    submittedAt: isNaN(submittedAtRaw) || submittedAtRaw === 0 ? new Date() : new Date(submittedAtRaw),
    lastResubmittedAt: isNaN(lastResubmittedAtRaw) || lastResubmittedAtRaw === 0 ? null : new Date(lastResubmittedAtRaw),
    updatedAt: isNaN(updatedAtRaw) || updatedAtRaw === 0 ? new Date() : new Date(updatedAtRaw),
  };
}

async function fetchSubmissionByTokenFromDb(accessToken: string): Promise<Submission | null> {
  await connectToDatabase();
  const doc = await SubmissionModel.findOne({ accessToken });
  if (!doc) return null;

  const now = new Date();
  if (doc.resubmissionRequest) {
    const req = doc.resubmissionRequest;
    const expiresAt = req.expiresAt instanceof Date ? req.expiresAt : new Date(req.expiresAt);
    const expiresAtTime = expiresAt.getTime();

    if (!Number.isNaN(expiresAtTime)) {
      if (
        req.status !== "expired" &&
        expiresAtTime <= now.getTime()
      ) {
        req.status = "expired";
        await doc.save();
      } else if (req.status === "pending_delivery") {
        req.status = "delivered";
        req.deliveredAt = now;
        await doc.save();
        // Invalidate cache since we modified the document state (status and updatedAt changed)
        await CacheService.invalidateSubmissionCache(accessToken);
      }
    }
  }

  return toEntity(doc.toObject() as unknown as Record<string, unknown>);
}

export class MongoSubmissionRepository implements SubmissionRepository {
  async create(input: CreateSubmissionInput, accessToken: string): Promise<Submission> {
    try {
      await connectToDatabase();
      const doc = await SubmissionModel.create({
        ...input,
        contactRecords: input.contactRecords,
        accessToken,
        status: "pending",
        auditTrail: [],
        submittedAt: new Date(),
      });
      await CacheService.invalidateSubmissionCache();
      return toEntity(doc.toObject() as unknown as Record<string, unknown>);
    } catch (error) {
      logger.error("Failed to create submission", { input, accessToken, error });
      throw error;
    }
  }

  async findById(id: string): Promise<Submission | null> {
    try {
      await connectToDatabase();
      const doc = await SubmissionModel.findById(id).lean();
      return doc ? toEntity(doc) : null;
    } catch (error) {
      logger.error("Failed to find submission by id", { id, error });
      throw error;
    }
  }

  async findByToken(accessToken: string): Promise<Submission | null> {
    try {
      const cachedSubmission = (await CacheService.getSubmission(
        accessToken,
        async () => fetchSubmissionByTokenFromDb(accessToken),
      )) as unknown;

      if (cachedSubmission === null) {
        return null;
      }

      if (isSubmissionEntity(cachedSubmission)) {
        return cachedSubmission;
      }

      logger.warn("Invalid cached submission payload detected; forcing DB refresh", {
        accessToken,
        payloadType: typeof cachedSubmission,
      });

      await CacheService.invalidateSubmissionCache(accessToken);
      return fetchSubmissionByTokenFromDb(accessToken);
    } catch (error) {
      logger.error("Failed to find submission by token", { accessToken, error });
      throw error;
    }
  }

  async findByFormId(formTemplateId: string): Promise<Submission[]> {
    try {
      await connectToDatabase();
      const docs = await SubmissionModel.find({
        formTemplateId: new mongoose.Types.ObjectId(formTemplateId),
      }).lean();
      return docs.map(toEntity);
    } catch (error) {
      logger.error("Failed to find submissions by form id", { formTemplateId, error });
      throw error;
    }
  }

  async listPaginated(
    page: number,
    limit: number,
    status?: string,
    adminName?: string,
    formTemplateId?: string,
  ): Promise<{ submissions: Submission[]; total: number; totalPages: number }> {
    try {
      const compute = async () => {
        await connectToDatabase();
        
        const filter: mongoose.FilterQuery<Record<string, unknown>> = {};
        
        if (status && status !== "all") {
          filter.status = status;
        }

        if (formTemplateId && formTemplateId !== "all") {
          filter.formTemplateId = formTemplateId;
        }

        const skip = (page - 1) * limit;

        // Base query
        const query = SubmissionModel.find(filter);

        const [docs, total] = await Promise.all([
          query.sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
          SubmissionModel.countDocuments(filter),
        ]);

        let results = docs.map(toEntity);

        if (adminName && adminName !== "all") {
          // If filtering by a specific admin updater, apply post-processing since we
          // need to find where the LAST relevant audit trail matches the status logic.
          results = results.filter((sub) => {
            if (sub.auditTrail && sub.auditTrail.length > 0) {
              const updatedEntries = [...sub.auditTrail].reverse().find(entry => entry.newStatus === sub.status);
              if (updatedEntries) {
                return updatedEntries.adminName === adminName;
              }
            }
            return false;
          });
        }

        return {
          submissions: results,
          total,
          totalPages: Math.ceil(total / limit),
        };
      };

      if (
        (!status || status === "all") &&
        (!adminName || adminName === "all") &&
        (!formTemplateId || formTemplateId === "all")
      ) {
        return await CacheService.getSubmissionsList("all", page, compute);
      }
      return await CacheService.getSubmissionsList(
        `${status || "all"}_${adminName || "all"}_${formTemplateId || "all"}`,
        page,
        compute,
      );
    } catch (error) {
      logger.error("Failed to list paginated submissions", { page, limit, status, adminName, formTemplateId, error });
      throw error;
    }
  }

  async getCounts(): Promise<{ pending: number; draft: number; viewed: number; needs_rewrite: number; total: number }> {
    try {
      return await CacheService.getSubmissionsCounts(async () => {
        await connectToDatabase();
        const counts = await SubmissionModel.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const result = { draft: 0, pending: 0, viewed: 0, needs_rewrite: 0, total: 0 };
        for (const row of counts) {
          if (row._id in result) {
            (result as Record<string, number>)[row._id as string] = row.count;
            result.total += row.count;
          }
        }
        return result;
      });
    } catch (error) {
      logger.error("Failed to get submissions counts", error);
      throw error;
    }
  }

  async updateStatus(id: string, input: UpdateSubmissionStatusInput): Promise<Submission | null> {
    try {
      await connectToDatabase();
      const submission = await SubmissionModel.findById(id);
      if (!submission) return null;

      const auditEntry = {
        oldStatus: submission.status,
        newStatus: input.status,
        comment: input.comment || "",
        adminId: new mongoose.Types.ObjectId(input.admin.id as string),
        adminName: input.admin.name,
        timestamp: new Date(),
      };

      submission.status = input.status;
      if (input.status === "needs_rewrite") {
        submission.rewriteComment = input.comment || "";
        const now = new Date();
        submission.resubmissionRequest = {
          id: `rr_${submission._id.toString()}_${now.getTime()}`,
          targetAccessToken: submission.accessToken,
          requestedByAdminId: new mongoose.Types.ObjectId(input.admin.id as string),
          requestedByAdminName: input.admin.name,
          comment: input.comment || "",
          status: "pending_delivery",
          createdAt: now,
          expiresAt: new Date(now.getTime() + RESUBMISSION_RETENTION_MS),
          deliveredAt: null,
          seenAt: null,
        };
      } else {
        submission.rewriteComment = "";
        if (submission.resubmissionRequest && submission.resubmissionRequest.status !== "expired") {
          submission.resubmissionRequest.status = "seen";
          submission.resubmissionRequest.seenAt = new Date();
        }
      }
      submission.auditTrail.push(auditEntry);

      await submission.save();
      const leanDoc = await SubmissionModel.findById(id).lean();
      if (leanDoc) {
        await CacheService.invalidateSubmissionCache(leanDoc.accessToken);
        // SIGNAL CLIENT
        await NotificationPublisher.notifyClientStatusChange(
          leanDoc.accessToken,
          leanDoc.status,
          leanDoc.resubmissionRequest?.status,
        );
      }
      return leanDoc ? toEntity(leanDoc) : null;
    } catch (error) {
      logger.error("Failed to update submission status", { id, input, error });
      throw error;
    }
  }

  async resetStatusForResubmission(
    id: string,
    name?: string,
    contact?: string,
    contactRecords?: CreateSubmissionInput["contactRecords"],
  ): Promise<Submission | null> {
    try {
      await connectToDatabase();
      const existing = await SubmissionModel.findById(id).lean();
      const nextResubmissionRequest =
        existing?.resubmissionRequest && existing.resubmissionRequest.status !== "expired"
          ? {
              ...existing.resubmissionRequest,
              status: "seen" as const,
              seenAt: new Date(),
            }
          : existing?.resubmissionRequest ?? null;

      const doc = await SubmissionModel.findByIdAndUpdate(
        id,
        {
          status: "pending",
          rewriteComment: "",
          lastResubmittedAt: new Date(),
          ...(name !== undefined ? { clientName: name } : {}),
          ...(contact !== undefined ? { clientContact: contact } : {}),
          ...(contactRecords !== undefined ? { contactRecords } : {}),
          resubmissionRequest: nextResubmissionRequest,
        },
        { new: true }
      ).lean();
      if (doc) {
        await CacheService.invalidateSubmissionCache(doc.accessToken);
        // SIGNAL CLIENT
        await NotificationPublisher.notifyClientStatusChange(
          doc.accessToken,
          "pending",
          doc.resubmissionRequest?.status,
        );
      }
      return doc ? toEntity(doc) : null;
    } catch (error) {
      logger.error("Failed to reset submission status", { id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const submission = await SubmissionModel.findById(id).lean();
      if (!submission) return false;

      // Destroy associated media files on Cloudinary
      const fieldValues = await FieldValueModel.find({ submissionId: id }).lean();
      const publicIds = fieldValues
        .map((fv) => fv.mediaPublicId)
        .filter((id) => typeof id === "string" && id.trim().length > 0) as string[];

      if (publicIds.length > 0) {
        try {
          await destroyAssets(publicIds);
        } catch (error) {
          logger.error("Failed to destroy Cloudinary assets during submission deletion", { id, error });
        }
      }

      // Delete field values
      await FieldValueModel.deleteMany({ submissionId: id });
      // Delete submission
      const result = await SubmissionModel.findByIdAndDelete(id);

      await CacheService.invalidateSubmissionCache(submission.accessToken);
      return !!result;
    } catch (error) {
      logger.error("Failed to delete submission", { id, error });
      throw error;
    }
  }

  async deleteDraftsOlderThan(date: Date): Promise<number> {
    try {
      await connectToDatabase();
      const draftsToDelete = await SubmissionModel.find({
        status: "draft",
        updatedAt: { $lt: date },
      }).lean();

      let deletedCount = 0;
      for (const draft of draftsToDelete) {
        const id = draft._id?.toString();
        if (id) {
          const success = await this.delete(id);
          if (success) deletedCount++;
        }
      }
      return deletedCount;
    } catch (error) {
      logger.error("Failed to delete old drafts", { date, error });
      throw error;
    }
  }
}
