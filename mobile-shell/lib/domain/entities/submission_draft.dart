import "media_upload_item.dart";

enum SubmissionDraftStatus {
  editing,
  queued,
  sending,
  sent,
  failed,
}

SubmissionDraftStatus submissionDraftStatusFromWire(String value) {
  switch (value.trim()) {
    case "queued":
      return SubmissionDraftStatus.queued;
    case "sending":
      return SubmissionDraftStatus.sending;
    case "sent":
      return SubmissionDraftStatus.sent;
    case "failed":
      return SubmissionDraftStatus.failed;
    case "editing":
    default:
      return SubmissionDraftStatus.editing;
  }
}

class SubmissionDraft {
  const SubmissionDraft({
    required this.formId,
    required this.values,
    required this.formattedValues,
    required this.mediaQueue,
    required this.lastEditedAt,
    required this.status,
  });

  final String formId;
  final Map<String, Object?> values;
  final Map<String, Object?> formattedValues;
  final List<MediaUploadItem> mediaQueue;
  final DateTime lastEditedAt;
  final SubmissionDraftStatus status;

  SubmissionDraft copyWith({
    String? formId,
    Map<String, Object?>? values,
    Map<String, Object?>? formattedValues,
    List<MediaUploadItem>? mediaQueue,
    DateTime? lastEditedAt,
    SubmissionDraftStatus? status,
  }) {
    return SubmissionDraft(
      formId: formId ?? this.formId,
      values: values ?? this.values,
      formattedValues: formattedValues ?? this.formattedValues,
      mediaQueue: mediaQueue ?? this.mediaQueue,
      lastEditedAt: lastEditedAt ?? this.lastEditedAt,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "formId": formId,
      "values": values,
      "formattedValues": formattedValues,
      "mediaQueue": mediaQueue.map((item) => item.toJson()).toList(),
      "lastEditedAt": lastEditedAt.toUtc().toIso8601String(),
      "status": status.name,
    };
  }

  factory SubmissionDraft.fromJson(Map<String, dynamic> json) {
    final rawMedia = json["mediaQueue"] as List<dynamic>? ?? const <dynamic>[];
    return SubmissionDraft(
      formId: (json["formId"] ?? "").toString(),
      values:
          (json["values"] as Map<String, dynamic>? ?? const <String, dynamic>{})
              .map((key, value) => MapEntry(key, value)),
      formattedValues: (json["formattedValues"] as Map<String, dynamic>? ??
              const <String, dynamic>{})
          .map((key, value) => MapEntry(key, value)),
      mediaQueue: rawMedia
          .whereType<Map<String, dynamic>>()
          .map(MediaUploadItem.fromJson)
          .toList(growable: false),
      lastEditedAt:
          DateTime.tryParse((json["lastEditedAt"] ?? "").toString())?.toUtc() ??
              DateTime.now().toUtc(),
      status: submissionDraftStatusFromWire(
        (json["status"] ?? "editing").toString(),
      ),
    );
  }
}
