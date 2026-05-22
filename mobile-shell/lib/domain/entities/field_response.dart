class MediaReference {
  const MediaReference({
    required this.url,
    required this.publicId,
  });

  final String url;
  final String publicId;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "url": url,
      "publicId": publicId,
    };
  }

  factory MediaReference.fromJson(Map<String, dynamic> json) {
    return MediaReference(
      url: (json["url"] ?? "").toString(),
      publicId: (json["publicId"] ?? "").toString(),
    );
  }
}

class FieldResponse {
  const FieldResponse({
    required this.fieldDefinitionId,
    this.value,
    this.mediaUrl,
    this.mediaPublicId,
    this.mediaItems = const <MediaReference>[],
  });

  final String fieldDefinitionId;
  final Object? value;
  final String? mediaUrl;
  final String? mediaPublicId;
  final List<MediaReference> mediaItems;

  bool get hasMeaningfulValue {
    final hasText = switch (value) {
      null => false,
      List<dynamic> list => list.isNotEmpty,
      Object v => v.toString().trim().isNotEmpty,
    };

    return hasText ||
        (mediaUrl?.trim().isNotEmpty ?? false) ||
        mediaItems.isNotEmpty;
  }

  FieldResponse copyWith({
    String? fieldDefinitionId,
    Object? value,
    String? mediaUrl,
    String? mediaPublicId,
    List<MediaReference>? mediaItems,
  }) {
    return FieldResponse(
      fieldDefinitionId: fieldDefinitionId ?? this.fieldDefinitionId,
      value: value ?? this.value,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      mediaPublicId: mediaPublicId ?? this.mediaPublicId,
      mediaItems: mediaItems ?? this.mediaItems,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "fieldDefinitionId": fieldDefinitionId,
      "value": value,
      "mediaUrl": mediaUrl,
      "mediaPublicId": mediaPublicId,
      "mediaItems": mediaItems.map((item) => item.toJson()).toList(),
    };
  }

  factory FieldResponse.fromJson(Map<String, dynamic> json) {
    final rawItems = json["mediaItems"];
    final items = rawItems is List<dynamic>
        ? rawItems
            .whereType<Map<String, dynamic>>()
            .map(MediaReference.fromJson)
            .toList(growable: false)
        : const <MediaReference>[];

    return FieldResponse(
      fieldDefinitionId: (json["fieldDefinitionId"] ?? "").toString(),
      value: json["value"],
      mediaUrl: json["mediaUrl"]?.toString(),
      mediaPublicId: json["mediaPublicId"]?.toString(),
      mediaItems: items,
    );
  }
}
