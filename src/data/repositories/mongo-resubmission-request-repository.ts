import { ResubmissionRequestRepository } from "@/domain/repositories/resubmission-request-repository";
import { ResubmissionRequest } from "@/domain/entities/resubmission-request";
import { ResubmissionRequestModel } from "../models/resubmission-request.model";
import { connectToDatabase } from "@/lib/db";

export class MongoResubmissionRequestRepository implements ResubmissionRequestRepository {
  async create(request: ResubmissionRequest): Promise<ResubmissionRequest> {
    await connectToDatabase();
    const doc = new ResubmissionRequestModel(request);
    await doc.save();
    return this.mapToDomain(doc);
  }

  async updateStatus(id: string, status: ResubmissionRequest["status"]): Promise<ResubmissionRequest | null> {
    await connectToDatabase();
    const update: any = { status };
    if (status === "delivered") update.deliveredAt = new Date();
    if (status === "seen") update.seenAt = new Date();

    const doc = await ResubmissionRequestModel.findOneAndUpdate(
      { id },
      { $set: update },
      { new: true }
    ).lean();

    return doc ? this.mapToDomain(doc) : null;
  }

  async findPendingByTargetUser(targetAccessToken: string): Promise<ResubmissionRequest[]> {
    await connectToDatabase();
    await this.expireOldRequests(); // Lazy clean up

    const docs = await ResubmissionRequestModel.find({
      targetAccessToken,
      status: "pending_delivery",
    })
      .sort({ createdAt: -1 })
      .lean();

    return docs.map(this.mapToDomain);
  }

  async findBySubmissionId(submissionId: string): Promise<ResubmissionRequest | null> {
    await connectToDatabase();
    await this.expireOldRequests();

    const doc = await ResubmissionRequestModel.findOne({ submissionId })
      .sort({ createdAt: -1 })
      .lean();

    return doc ? this.mapToDomain(doc) : null;
  }

  async markDelivered(targetAccessToken: string): Promise<void> {
    await connectToDatabase();
    await ResubmissionRequestModel.updateMany(
      { targetAccessToken, status: "pending_delivery" },
      { $set: { status: "delivered", deliveredAt: new Date() } }
    );
  }

  async markSeen(id: string): Promise<void> {
    await connectToDatabase();
    await ResubmissionRequestModel.updateMany(
      { id, status: { $in: ["pending_delivery", "delivered"] } },
      { $set: { status: "seen", seenAt: new Date() } }
    );
  }

  async expireOldRequests(): Promise<void> {
    await connectToDatabase();
    const now = new Date();
    await ResubmissionRequestModel.updateMany(
      { expiresAt: { $lt: now }, status: { $in: ["pending_delivery", "delivered"] } },
      { $set: { status: "expired" } }
    );
  }

  private mapToDomain(doc: any): ResubmissionRequest {
    return {
      id: doc.id,
      submissionId: doc.submissionId.toString(),
      targetAccessToken: doc.targetAccessToken,
      requestedByAdminId: doc.requestedByAdminId.toString(),
      requestedByAdminName: doc.requestedByAdminName,
      comment: doc.comment,
      status: doc.status,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      deliveredAt: doc.deliveredAt,
      seenAt: doc.seenAt,
    };
  }
}
