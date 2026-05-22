import "../entities/submission_draft.dart";

abstract class DraftRepository {
  Future<void> saveDraft(String token, SubmissionDraft draft);
  Future<SubmissionDraft?> loadDraft(String token);
  Future<void> discardDraft(String token);
  Future<List<SubmissionDraft>> listDrafts();
}
