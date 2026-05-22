import "../entities/contact_record.dart";
import "../entities/field_response.dart";
import "../entities/local_draft.dart";
import "../entities/submission_outcome.dart";
import "../entities/submission_session.dart";

class SubmissionMutationInput {
  const SubmissionMutationInput({
    required this.token,
    required this.clientName,
    required this.clientContact,
    required this.contacts,
    required this.fieldResponses,
    this.expectedFormVersion,
    this.expectedSubmissionUpdatedAt,
  });

  final String token;
  final String clientName;
  final String clientContact;
  final List<ContactRecord> contacts;
  final List<FieldResponse> fieldResponses;
  final String? expectedFormVersion;
  final String? expectedSubmissionUpdatedAt;

  Map<String, dynamic> toRequestJson() {
    return <String, dynamic>{
      "clientName": clientName,
      "clientContact": clientContact,
      "contactRecords": contacts.map((item) => item.toJson()).toList(),
      "fieldValues": fieldResponses.map((item) => item.toJson()).toList(),
      "expectedFormVersion": expectedFormVersion,
      "expectedSubmissionUpdatedAt": expectedSubmissionUpdatedAt,
    };
  }
}

abstract class SubmissionRepository {
  Future<SubmissionSession> loadSession(String token, {required String localeCode});

  Future<SubmissionOutcome> submit(SubmissionMutationInput input);

  Future<SubmissionOutcome> resubmit(SubmissionMutationInput input);

  Future<void> persistSessionToken(String token);

  Future<void> clearSessionSecrets();

  Future<LocalDraft?> loadDraft(String token);

  Future<void> saveDraft(LocalDraft draft);

  Future<void> clearDraft(String token);
}
