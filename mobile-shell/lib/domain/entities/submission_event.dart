enum SubmissionEventName {
  validationFailed,
  submitStarted,
  submitSuccess,
  submitFailed,
  uploadStarted,
  uploadProgress,
  uploadSuccess,
  uploadFailed,
  draftSaved,
  draftRestored,
  draftDiscarded,
  queueOnlineResume,
}

String submissionEventWireName(SubmissionEventName eventName) {
  switch (eventName) {
    case SubmissionEventName.validationFailed:
      return "validation_failed";
    case SubmissionEventName.submitStarted:
      return "submit_started";
    case SubmissionEventName.submitSuccess:
      return "submit_success";
    case SubmissionEventName.submitFailed:
      return "submit_failed";
    case SubmissionEventName.uploadStarted:
      return "upload_started";
    case SubmissionEventName.uploadProgress:
      return "upload_progress";
    case SubmissionEventName.uploadSuccess:
      return "upload_success";
    case SubmissionEventName.uploadFailed:
      return "upload_failed";
    case SubmissionEventName.draftSaved:
      return "draft_saved";
    case SubmissionEventName.draftRestored:
      return "draft_restored";
    case SubmissionEventName.draftDiscarded:
      return "draft_discarded";
    case SubmissionEventName.queueOnlineResume:
      return "queue_online_resume";
  }
}

class SubmissionEvent {
  SubmissionEvent({
    required this.name,
    required this.messageKey,
    this.fieldId,
    this.payload = const <String, Object?>{},
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  final SubmissionEventName name;
  final String messageKey;
  final String? fieldId;
  final Map<String, Object?> payload;
  final DateTime timestamp;

  SubmissionEvent copyWith({
    SubmissionEventName? name,
    String? messageKey,
    String? fieldId,
    Map<String, Object?>? payload,
    DateTime? timestamp,
  }) {
    return SubmissionEvent(
      name: name ?? this.name,
      messageKey: messageKey ?? this.messageKey,
      fieldId: fieldId ?? this.fieldId,
      payload: payload ?? this.payload,
      timestamp: timestamp ?? this.timestamp,
    );
  }
}
