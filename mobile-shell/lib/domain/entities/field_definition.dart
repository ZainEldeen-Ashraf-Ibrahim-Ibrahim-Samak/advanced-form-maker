class FieldMessageKeys {
  const FieldMessageKeys({
    required this.label,
    required this.errorRequired,
    required this.errorRegex,
    this.placeholder,
    this.errorFormat,
  });

  final String label;
  final String? placeholder;
  final String errorRequired;
  final String errorRegex;
  final String? errorFormat;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "label": label,
      "placeholder": placeholder,
      "errorRequired": errorRequired,
      "errorRegex": errorRegex,
      "errorFormat": errorFormat,
    };
  }

  factory FieldMessageKeys.fromJson(Map<String, dynamic> json) {
    return FieldMessageKeys(
      label: (json["label"] ?? "").toString(),
      placeholder: json["placeholder"]?.toString(),
      errorRequired: (json["errorRequired"] ?? "").toString(),
      errorRegex: (json["errorRegex"] ?? "").toString(),
      errorFormat: json["errorFormat"]?.toString(),
    );
  }
}

class MediaLimits {
  const MediaLimits({
    this.maxImageBytes,
    this.maxVideoBytes,
    this.acceptedMimeTypes = const <String>[],
  });

  final int? maxImageBytes;
  final int? maxVideoBytes;
  final List<String> acceptedMimeTypes;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "maxImageBytes": maxImageBytes,
      "maxVideoBytes": maxVideoBytes,
      "acceptedMimeTypes": acceptedMimeTypes,
    };
  }

  factory MediaLimits.fromJson(Map<String, dynamic> json) {
    final rawMimeTypes =
        json["acceptedMimeTypes"] as List<dynamic>? ?? const <dynamic>[];
    return MediaLimits(
      maxImageBytes: json["maxImageBytes"] is int
          ? json["maxImageBytes"] as int
          : int.tryParse((json["maxImageBytes"] ?? "").toString()),
      maxVideoBytes: json["maxVideoBytes"] is int
          ? json["maxVideoBytes"] as int
          : int.tryParse((json["maxVideoBytes"] ?? "").toString()),
      acceptedMimeTypes:
          rawMimeTypes.map((item) => item.toString()).toList(growable: false),
    );
  }
}

enum FieldType {
  text,
  number,
  select,
  date,
  phone,
  nationalId,
  media,
}

FieldType fieldTypeFromWire(String value) {
  switch (value.trim()) {
    case "number":
      return FieldType.number;
    case "select":
      return FieldType.select;
    case "date":
      return FieldType.date;
    case "phone":
      return FieldType.phone;
    case "nationalId":
      return FieldType.nationalId;
    case "media":
      return FieldType.media;
    case "text":
    default:
      return FieldType.text;
  }
}

enum FieldFormatterId {
  phone,
  nationalId,
  date,
  numeric,
  none,
}

FieldFormatterId fieldFormatterFromWire(String value) {
  switch (value.trim()) {
    case "phone":
      return FieldFormatterId.phone;
    case "nationalId":
      return FieldFormatterId.nationalId;
    case "date":
      return FieldFormatterId.date;
    case "numeric":
      return FieldFormatterId.numeric;
    case "none":
    default:
      return FieldFormatterId.none;
  }
}

class FieldDefinition {
  const FieldDefinition({
    required this.id,
    required this.type,
    required this.required,
    required this.messageKeys,
    this.regex,
    this.formatterId = FieldFormatterId.none,
    this.mediaLimits,
  });

  final String id;
  final FieldType type;
  final bool required;
  final String? regex;
  final FieldFormatterId formatterId;
  final FieldMessageKeys messageKeys;
  final MediaLimits? mediaLimits;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "id": id,
      "type": type.name,
      "required": required,
      "regex": regex,
      "formatterId": formatterId.name,
      "messageKeys": messageKeys.toJson(),
      "mediaLimits": mediaLimits?.toJson(),
    };
  }

  factory FieldDefinition.fromJson(Map<String, dynamic> json) {
    return FieldDefinition(
      id: (json["id"] ?? "").toString(),
      type: fieldTypeFromWire((json["type"] ?? "text").toString()),
      required: json["required"] == true,
      regex: json["regex"]?.toString(),
      formatterId: fieldFormatterFromWire(
        (json["formatterId"] ?? "none").toString(),
      ),
      messageKeys: FieldMessageKeys.fromJson(
        json["messageKeys"] as Map<String, dynamic>? ??
            const <String, dynamic>{},
      ),
      mediaLimits: (json["mediaLimits"] is Map<String, dynamic>)
          ? MediaLimits.fromJson(json["mediaLimits"] as Map<String, dynamic>)
          : null,
    );
  }
}
