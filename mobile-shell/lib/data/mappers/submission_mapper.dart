import "../../domain/entities/contact_record.dart";
import "../../domain/entities/field_response.dart";
import "../../domain/entities/submission_session.dart";

class SubmissionMapper {
  const SubmissionMapper();

  SubmissionSession mapSession({
    required String token,
    required String localeCode,
    required bool isOnline,
    required Map<String, dynamic> data,
  }) {
    final isNew = data["isNew"] == true;
    final formTemplate = data["formTemplate"] as Map<String, dynamic>? ??
        const <String, dynamic>{};
    final submission = data["submission"] as Map<String, dynamic>?;
    final fieldsRaw = data["fields"] as List<dynamic>? ?? const <dynamic>[];
    final valuesRaw = data["values"] as List<dynamic>? ?? const <dynamic>[];
    final contactFormFieldsRaw =
        formTemplate["contactFormFields"] as List<dynamic>? ??
            const <dynamic>[];

    final fields = fieldsRaw
        .whereType<Map<String, dynamic>>()
        .map(_mapField)
        .toList(growable: false);

    final responseByField = <String, FieldResponse>{
      for (final value in valuesRaw.whereType<Map<String, dynamic>>())
        (value["fieldDefinitionId"] ?? "").toString(): _mapFieldResponse(value),
    };

    final contactFormFields = _normalizeContactFormFields(contactFormFieldsRaw);

    final initialResponses = fields
        .map(
          (field) =>
              responseByField[field.id] ??
              FieldResponse(fieldDefinitionId: field.id),
        )
        .toList(growable: false);

    final submissionContactsRaw = submission?["contactRecords"];
    final formContactsRaw = formTemplate["contactRecords"];

    final contactsSource = submissionContactsRaw is List<dynamic> &&
            submissionContactsRaw.isNotEmpty
        ? submissionContactsRaw
        : (formContactsRaw is List<dynamic>
            ? formContactsRaw
            : const <dynamic>[]);

    final contacts = contactsSource
        .whereType<Map<String, dynamic>>()
        .map(ContactRecord.fromJson)
        .toList(growable: false);

    final safeContacts = contacts.isEmpty
        ? <ContactRecord>[ContactRecord(id: "contact_primary", name: "")]
        : contacts;

    return SubmissionSession(
      token: token,
      submissionId: submission?["id"]?.toString(),
      formTemplateId: (formTemplate["id"] ?? "").toString(),
      formName: (formTemplate["name"] ?? "").toString(),
      clientName: (submission?["clientName"] ?? "").toString(),
      clientContact: (submission?["clientContact"] ?? "").toString(),
      mode: _mapMode(isNew: isNew, status: submission?["status"]?.toString()),
      formVersion: (data["formVersion"] ?? "0").toString(),
      submissionUpdatedAt: submission?["updatedAt"]?.toString(),
      localeCode: localeCode,
      isOnline: isOnline,
      fields: fields,
      contactFormFields: contactFormFields,
      contacts: safeContacts,
      fieldResponses: initialResponses,
    );
  }

  SubmissionFieldDefinition _mapField(Map<String, dynamic> json) {
    final validation = json["validationRules"] as Map<String, dynamic>? ??
        const <String, dynamic>{};

    return SubmissionFieldDefinition(
      id: (json["id"] ?? "").toString(),
      nameEn: (json["nameEn"] ?? "").toString(),
      nameAr: (json["nameAr"] ?? "").toString(),
      inputType: _mapInputType((json["inputType"] ?? "text").toString()),
      isMultiple: json["isMultiple"] == true,
      validation: SubmissionFieldValidation(
        required: validation["required"] == true,
        regexType: _mapRegexType(validation["regexType"]?.toString()),
        minLength: _toInt(validation["minLength"]),
        maxLength: _toInt(validation["maxLength"]),
        min: _toNum(validation["min"]),
        max: _toNum(validation["max"]),
        maxFileSize: _toInt(validation["maxFileSize"]),
      ),
      dropdownOptionsEn:
          (json["dropdownOptionsEn"] as List<dynamic>? ?? const <dynamic>[])
              .map((item) => item.toString())
              .toList(growable: false),
      dropdownOptionsAr:
          (json["dropdownOptionsAr"] as List<dynamic>? ?? const <dynamic>[])
              .map((item) => item.toString())
              .toList(growable: false),
    );
  }

  FieldResponse _mapFieldResponse(Map<String, dynamic> json) {
    final rawItems = json["mediaItems"] as List<dynamic>? ?? const <dynamic>[];
    final mediaItems = rawItems
        .whereType<Map<String, dynamic>>()
        .map(MediaReference.fromJson)
        .toList(growable: false);

    return FieldResponse(
      fieldDefinitionId: (json["fieldDefinitionId"] ?? "").toString(),
      value: json["value"],
      mediaUrl: json["mediaUrl"]?.toString(),
      mediaPublicId: json["mediaPublicId"]?.toString(),
      mediaItems: mediaItems,
    );
  }

  SubmissionMode _mapMode({required bool isNew, required String? status}) {
    if (isNew) {
      return SubmissionMode.newSubmission;
    }

    switch ((status ?? "").toLowerCase()) {
      case "draft":
        return SubmissionMode.draft;
      case "needs_rewrite":
        return SubmissionMode.needsRewrite;
      default:
        return SubmissionMode.readOnly;
    }
  }

  SubmissionFieldType _mapInputType(String raw) {
    switch (raw) {
      case "number":
        return SubmissionFieldType.number;
      case "image":
        return SubmissionFieldType.image;
      case "file":
        return SubmissionFieldType.file;
      case "date":
        return SubmissionFieldType.date;
      case "dropdown":
        return SubmissionFieldType.dropdown;
      case "text":
      default:
        return SubmissionFieldType.text;
    }
  }

  SubmissionRegexType? _mapRegexType(String? raw) {
    switch ((raw ?? "").toLowerCase()) {
      case "email":
        return SubmissionRegexType.email;
      case "phone":
        return SubmissionRegexType.phone;
      case "name":
        return SubmissionRegexType.name;
      default:
        return null;
    }
  }

  List<SubmissionContactField> _normalizeContactFormFields(
      List<dynamic> rawFields) {
    final mapped = rawFields
        .whereType<Map<String, dynamic>>()
        .toList(growable: false)
        .asMap()
        .entries
        .map((entry) => _mapContactFormField(entry.value, entry.key))
        .whereType<SubmissionContactField>()
        .toList(growable: false)
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    if (mapped.isEmpty) {
      return _defaultContactFormFields();
    }

    return mapped
        .asMap()
        .entries
        .map(
          (entry) => SubmissionContactField(
            id: entry.value.id,
            key: entry.value.key,
            labelEn: entry.value.labelEn,
            labelAr: entry.value.labelAr,
            placeholderEn: entry.value.placeholderEn,
            placeholderAr: entry.value.placeholderAr,
            required: entry.value.required,
            sortOrder: entry.key,
          ),
        )
        .toList(growable: false);
  }

  SubmissionContactField? _mapContactFormField(
      Map<String, dynamic> json, int index) {
    final key = _mapContactFieldKey(json["key"]?.toString());
    if (key == null) {
      return null;
    }

    final legacyLabel = _readString(json["label"]);
    final legacyPlaceholder = _readString(json["placeholder"]);

    final labelEnRaw = _readString(json["labelEn"]);
    final labelArRaw = _readString(json["labelAr"]);
    final placeholderEnRaw = _readString(json["placeholderEn"]);
    final placeholderArRaw = _readString(json["placeholderAr"]);
    final labelEn = labelEnRaw.isNotEmpty ? labelEnRaw : legacyLabel;
    final labelAr = labelArRaw.isNotEmpty ? labelArRaw : legacyLabel;
    final placeholderEn =
        placeholderEnRaw.isNotEmpty ? placeholderEnRaw : legacyPlaceholder;
    final placeholderAr =
        placeholderArRaw.isNotEmpty ? placeholderArRaw : legacyPlaceholder;

    final sortOrder = _toInt(json["sortOrder"]) ?? index;

    return SubmissionContactField(
      id: _readString(json["id"]).isNotEmpty
          ? _readString(json["id"])
          : "contact_${_contactFieldKeyToString(key)}_$index",
      key: key,
      labelEn: labelEn.isNotEmpty ? labelEn : _defaultContactLabelEn(key),
      labelAr: labelAr.isNotEmpty ? labelAr : _defaultContactLabelAr(key),
      placeholderEn: placeholderEn.isNotEmpty
          ? placeholderEn
          : _defaultContactPlaceholderEn(key),
      placeholderAr: placeholderAr.isNotEmpty
          ? placeholderAr
          : _defaultContactPlaceholderAr(key),
      required: json["required"] == true,
      sortOrder: sortOrder,
    );
  }

  List<SubmissionContactField> _defaultContactFormFields() {
    const keys = <SubmissionContactFieldKey>[
      SubmissionContactFieldKey.name,
      SubmissionContactFieldKey.email,
      SubmissionContactFieldKey.phone,
      SubmissionContactFieldKey.address,
    ];

    return keys
        .asMap()
        .entries
        .map(
          (entry) => SubmissionContactField(
            id: "contact_${_contactFieldKeyToString(entry.value)}",
            key: entry.value,
            labelEn: _defaultContactLabelEn(entry.value),
            labelAr: _defaultContactLabelAr(entry.value),
            placeholderEn: _defaultContactPlaceholderEn(entry.value),
            placeholderAr: _defaultContactPlaceholderAr(entry.value),
            required: entry.value == SubmissionContactFieldKey.name,
            sortOrder: entry.key,
          ),
        )
        .toList(growable: false);
  }

  SubmissionContactFieldKey? _mapContactFieldKey(String? raw) {
    switch ((raw ?? "").trim().toLowerCase()) {
      case "name":
        return SubmissionContactFieldKey.name;
      case "email":
        return SubmissionContactFieldKey.email;
      case "phone":
        return SubmissionContactFieldKey.phone;
      case "address":
        return SubmissionContactFieldKey.address;
      default:
        return null;
    }
  }

  String _contactFieldKeyToString(SubmissionContactFieldKey key) {
    switch (key) {
      case SubmissionContactFieldKey.name:
        return "name";
      case SubmissionContactFieldKey.email:
        return "email";
      case SubmissionContactFieldKey.phone:
        return "phone";
      case SubmissionContactFieldKey.address:
        return "address";
    }
  }

  String _defaultContactLabelEn(SubmissionContactFieldKey key) {
    switch (key) {
      case SubmissionContactFieldKey.name:
        return "Name";
      case SubmissionContactFieldKey.email:
        return "Email";
      case SubmissionContactFieldKey.phone:
        return "Phone";
      case SubmissionContactFieldKey.address:
        return "Address";
    }
  }

  String _defaultContactLabelAr(SubmissionContactFieldKey key) {
    switch (key) {
      case SubmissionContactFieldKey.name:
        return "الاسم";
      case SubmissionContactFieldKey.email:
        return "البريد الإلكتروني";
      case SubmissionContactFieldKey.phone:
        return "الهاتف";
      case SubmissionContactFieldKey.address:
        return "العنوان";
    }
  }

  String _defaultContactPlaceholderEn(SubmissionContactFieldKey key) {
    switch (key) {
      case SubmissionContactFieldKey.name:
        return "Enter name";
      case SubmissionContactFieldKey.email:
        return "Enter email";
      case SubmissionContactFieldKey.phone:
        return "Enter phone";
      case SubmissionContactFieldKey.address:
        return "Enter address";
    }
  }

  String _defaultContactPlaceholderAr(SubmissionContactFieldKey key) {
    switch (key) {
      case SubmissionContactFieldKey.name:
        return "ادخل الاسم";
      case SubmissionContactFieldKey.email:
        return "ادخل البريد الإلكتروني";
      case SubmissionContactFieldKey.phone:
        return "ادخل الهاتف";
      case SubmissionContactFieldKey.address:
        return "ادخل العنوان";
    }
  }

  String _readString(Object? value) {
    if (value is! String) {
      return "";
    }

    return value.trim();
  }

  int? _toInt(Object? value) {
    if (value is int) {
      return value;
    }

    if (value is num) {
      return value.toInt();
    }

    if (value is String) {
      return int.tryParse(value.trim());
    }

    return null;
  }

  num? _toNum(Object? value) {
    if (value is num) {
      return value;
    }

    if (value is String) {
      return num.tryParse(value.trim());
    }

    return null;
  }
}
