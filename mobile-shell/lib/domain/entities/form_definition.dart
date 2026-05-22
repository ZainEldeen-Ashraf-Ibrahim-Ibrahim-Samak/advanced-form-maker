import "field_definition.dart";

class FormDefinition {
  const FormDefinition({
    required this.id,
    required this.version,
    required this.fields,
    required this.fetchedAt,
    required this.locale,
  });

  final String id;
  final String version;
  final List<FieldDefinition> fields;
  final DateTime fetchedAt;
  final String locale;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "id": id,
      "version": version,
      "fields": fields.map((item) => item.toJson()).toList(growable: false),
      "fetchedAt": fetchedAt.toUtc().toIso8601String(),
      "locale": locale,
    };
  }

  factory FormDefinition.fromJson(Map<String, dynamic> json) {
    final rawFields = json["fields"] as List<dynamic>? ?? const <dynamic>[];
    return FormDefinition(
      id: (json["id"] ?? "").toString(),
      version: (json["version"] ?? "").toString(),
      fields: rawFields
          .whereType<Map<String, dynamic>>()
          .map(FieldDefinition.fromJson)
          .toList(growable: false),
      fetchedAt:
          DateTime.tryParse((json["fetchedAt"] ?? "").toString())?.toUtc() ??
              DateTime.now().toUtc(),
      locale: (json["locale"] ?? "ar").toString(),
    );
  }
}
