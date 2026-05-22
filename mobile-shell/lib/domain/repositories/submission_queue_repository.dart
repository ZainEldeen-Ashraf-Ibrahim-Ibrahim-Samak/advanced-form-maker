import "../entities/queued_submission.dart";

abstract class SubmissionQueueRepository {
  Future<void> enqueue(QueuedSubmission item);
  Future<List<QueuedSubmission>> listQueued();
  Future<void> update(QueuedSubmission item);
  Future<void> removeByDraftRef(String draftRef);
}
