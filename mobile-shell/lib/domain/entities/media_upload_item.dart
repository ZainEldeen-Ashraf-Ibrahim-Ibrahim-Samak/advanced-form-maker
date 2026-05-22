enum MediaUploadStatus {
  pending,
  uploading,
  uploaded,
  failed,
}

class MediaUploadItem {
  const MediaUploadItem({
    this.id,
    required this.fieldDefinitionId,
    required this.localUri,
    this.mimeType,
    this.sizeBytes,
    required this.status,
    this.progress = 0,
    this.retryCount = 0,
    required this.required,
    this.uploadedUrl,
    this.uploadedPublicId,
    this.lastError,
  });

  final String? id;
  final String fieldDefinitionId;
  final String localUri;
  final String? mimeType;
  final int? sizeBytes;
  final MediaUploadStatus status;
  final double progress;
  final int retryCount;
  final String? uploadedUrl;
  final String? uploadedPublicId;
  final bool required;
  final String? lastError;

  bool get isBlockingRequiredUpload {
    if (!required) return false;
    return status == MediaUploadStatus.pending ||
        status == MediaUploadStatus.uploading ||
        status == MediaUploadStatus.failed;
  }

  MediaUploadItem copyWith({
    String? id,
    String? fieldDefinitionId,
    String? localUri,
    String? mimeType,
    int? sizeBytes,
    MediaUploadStatus? status,
    double? progress,
    int? retryCount,
    String? uploadedUrl,
    String? uploadedPublicId,
    bool? required,
    String? lastError,
  }) {
    return MediaUploadItem(
      id: id ?? this.id,
      fieldDefinitionId: fieldDefinitionId ?? this.fieldDefinitionId,
      localUri: localUri ?? this.localUri,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      status: status ?? this.status,
      progress: progress ?? this.progress,
      retryCount: retryCount ?? this.retryCount,
      uploadedUrl: uploadedUrl ?? this.uploadedUrl,
      uploadedPublicId: uploadedPublicId ?? this.uploadedPublicId,
      required: required ?? this.required,
      lastError: lastError ?? this.lastError,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "id": id,
      "fieldDefinitionId": fieldDefinitionId,
      "localUri": localUri,
      "mimeType": mimeType,
      "sizeBytes": sizeBytes,
      "status": status.name,
      "progress": progress,
      "retryCount": retryCount,
      "uploadedUrl": uploadedUrl,
      "uploadedPublicId": uploadedPublicId,
      "required": required,
      "lastError": lastError,
    };
  }

  factory MediaUploadItem.fromJson(Map<String, dynamic> json) {
    final rawStatus = (json["status"] ?? "pending").toString();
    final status = MediaUploadStatus.values.firstWhere(
      (value) => value.name == rawStatus,
      orElse: () => MediaUploadStatus.pending,
    );

    return MediaUploadItem(
      id: json["id"]?.toString(),
      fieldDefinitionId: (json["fieldDefinitionId"] ?? "").toString(),
      localUri: (json["localUri"] ?? "").toString(),
      mimeType: json["mimeType"]?.toString(),
      sizeBytes: json["sizeBytes"] is int
          ? json["sizeBytes"] as int
          : int.tryParse((json["sizeBytes"] ?? "").toString()),
      status: status,
      progress:
          json["progress"] is num ? (json["progress"] as num).toDouble() : 0,
      retryCount: json["retryCount"] is int
          ? json["retryCount"] as int
          : int.tryParse((json["retryCount"] ?? "0").toString()) ?? 0,
      uploadedUrl: json["uploadedUrl"]?.toString(),
      uploadedPublicId: json["uploadedPublicId"]?.toString(),
      required: json["required"] == true,
      lastError: json["lastError"]?.toString(),
    );
  }
}
