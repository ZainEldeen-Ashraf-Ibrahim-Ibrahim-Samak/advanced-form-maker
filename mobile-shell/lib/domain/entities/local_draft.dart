import "contact_record.dart";
import "field_response.dart";
import "media_upload_item.dart";

class LocalDraft {
  const LocalDraft({
    required this.draftId,
    required this.tokenRef,
    required this.clientName,
    required this.contacts,
    required this.fieldResponses,
    required this.mediaQueue,
    required this.lastSavedAt,
    this.lastSyncedFormVersion,
    this.submissionUpdatedAt,
    this.schemaVersion = 1,
  });

  final String draftId;
  final String tokenRef;
  final String clientName;
  final List<ContactRecord> contacts;
  final List<FieldResponse> fieldResponses;
  final List<MediaUploadItem> mediaQueue;
  final String? lastSyncedFormVersion;
  final String? submissionUpdatedAt;
  final DateTime lastSavedAt;
  final int schemaVersion;

  LocalDraft copyWith({
    String? draftId,
    String? tokenRef,
    String? clientName,
    List<ContactRecord>? contacts,
    List<FieldResponse>? fieldResponses,
    List<MediaUploadItem>? mediaQueue,
    String? lastSyncedFormVersion,
    String? submissionUpdatedAt,
    DateTime? lastSavedAt,
    int? schemaVersion,
  }) {
    return LocalDraft(
      draftId: draftId ?? this.draftId,
      tokenRef: tokenRef ?? this.tokenRef,
      clientName: clientName ?? this.clientName,
      contacts: contacts ?? this.contacts,
      fieldResponses: fieldResponses ?? this.fieldResponses,
      mediaQueue: mediaQueue ?? this.mediaQueue,
      lastSyncedFormVersion: lastSyncedFormVersion ?? this.lastSyncedFormVersion,
      submissionUpdatedAt: submissionUpdatedAt ?? this.submissionUpdatedAt,
      lastSavedAt: lastSavedAt ?? this.lastSavedAt,
      schemaVersion: schemaVersion ?? this.schemaVersion,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "draftId": draftId,
      "tokenRef": tokenRef,
      "clientName": clientName,
      "contacts": contacts.map((item) => item.toJson()).toList(),
      "fieldResponses": fieldResponses.map((item) => item.toJson()).toList(),
      "mediaQueue": mediaQueue.map((item) => item.toJson()).toList(),
      "lastSyncedFormVersion": lastSyncedFormVersion,
      "submissionUpdatedAt": submissionUpdatedAt,
      "lastSavedAt": lastSavedAt.toUtc().toIso8601String(),
      "schemaVersion": schemaVersion,
    };
  }

  factory LocalDraft.fromJson(Map<String, dynamic> json) {
    final rawContacts = json["contacts"] as List<dynamic>? ?? const <dynamic>[];
    final rawResponses = json["fieldResponses"] as List<dynamic>? ?? const <dynamic>[];
    final rawMedia = json["mediaQueue"] as List<dynamic>? ?? const <dynamic>[];

    return LocalDraft(
      draftId: (json["draftId"] ?? "").toString(),
      tokenRef: (json["tokenRef"] ?? "").toString(),
      clientName: (json["clientName"] ?? "").toString(),
      contacts: rawContacts
          .whereType<Map<String, dynamic>>()
          .map(ContactRecord.fromJson)
          .toList(growable: false),
      fieldResponses: rawResponses
          .whereType<Map<String, dynamic>>()
          .map(FieldResponse.fromJson)
          .toList(growable: false),
      mediaQueue: rawMedia
          .whereType<Map<String, dynamic>>()
          .map(MediaUploadItem.fromJson)
          .toList(growable: false),
      lastSyncedFormVersion: json["lastSyncedFormVersion"]?.toString(),
      submissionUpdatedAt: json["submissionUpdatedAt"]?.toString(),
      lastSavedAt: DateTime.tryParse((json["lastSavedAt"] ?? "").toString())?.toUtc() ?? DateTime.now().toUtc(),
      schemaVersion: (json["schemaVersion"] is int) ? json["schemaVersion"] as int : 1,
    );
  }
}
