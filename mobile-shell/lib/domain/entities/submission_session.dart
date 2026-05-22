import "contact_record.dart";
import "field_response.dart";

enum SubmissionMode {
  newSubmission,
  draft,
  needsRewrite,
  readOnly,
}

enum SubmissionFieldType {
  text,
  number,
  image,
  file,
  date,
  dropdown,
}

enum SubmissionRegexType {
  email,
  phone,
  name,
}

enum SubmissionContactFieldKey {
  name,
  email,
  phone,
  address,
}

class SubmissionContactField {
  const SubmissionContactField({
    required this.id,
    required this.key,
    required this.labelEn,
    required this.labelAr,
    required this.placeholderEn,
    required this.placeholderAr,
    required this.required,
    required this.sortOrder,
  });

  final String id;
  final SubmissionContactFieldKey key;
  final String labelEn;
  final String labelAr;
  final String placeholderEn;
  final String placeholderAr;
  final bool required;
  final int sortOrder;

  String labelForLocale(String localeCode) {
    return localeCode.toLowerCase() == "ar" ? labelAr : labelEn;
  }

  String placeholderForLocale(String localeCode) {
    return localeCode.toLowerCase() == "ar" ? placeholderAr : placeholderEn;
  }
}

class SubmissionFieldValidation {
  const SubmissionFieldValidation({
    this.required = false,
    this.regexType,
    this.minLength,
    this.maxLength,
    this.min,
    this.max,
    this.maxFileSize,
  });

  final bool required;
  final SubmissionRegexType? regexType;
  final int? minLength;
  final int? maxLength;
  final num? min;
  final num? max;
  final int? maxFileSize;
}

class SubmissionFieldDefinition {
  const SubmissionFieldDefinition({
    required this.id,
    required this.nameEn,
    required this.nameAr,
    required this.inputType,
    required this.isMultiple,
    required this.validation,
    required this.dropdownOptionsEn,
    required this.dropdownOptionsAr,
  });

  final String id;
  final String nameEn;
  final String nameAr;
  final SubmissionFieldType inputType;
  final bool isMultiple;
  final SubmissionFieldValidation validation;
  final List<String> dropdownOptionsEn;
  final List<String> dropdownOptionsAr;

  String labelForLocale(String localeCode) {
    return localeCode.toLowerCase() == "ar" ? nameAr : nameEn;
  }
}

class SubmissionSession {
  const SubmissionSession({
    required this.token,
    required this.formTemplateId,
    required this.formName,
    required this.clientName,
    required this.clientContact,
    required this.mode,
    required this.formVersion,
    required this.localeCode,
    required this.isOnline,
    required this.fields,
    required this.contactFormFields,
    required this.contacts,
    required this.fieldResponses,
    this.submissionId,
    this.submissionUpdatedAt,
  });

  final String token;
  final String? submissionId;
  final String formTemplateId;
  final String formName;
  final String clientName;
  final String clientContact;
  final SubmissionMode mode;
  final String formVersion;
  final String? submissionUpdatedAt;
  final String localeCode;
  final bool isOnline;
  final List<SubmissionFieldDefinition> fields;
  final List<SubmissionContactField> contactFormFields;
  final List<ContactRecord> contacts;
  final List<FieldResponse> fieldResponses;

  bool get isEditable {
    return mode == SubmissionMode.newSubmission ||
        mode == SubmissionMode.draft ||
        mode == SubmissionMode.needsRewrite;
  }

  SubmissionSession copyWith({
    String? token,
    String? submissionId,
    String? formTemplateId,
    String? formName,
    String? clientName,
    String? clientContact,
    SubmissionMode? mode,
    String? formVersion,
    String? submissionUpdatedAt,
    String? localeCode,
    bool? isOnline,
    List<SubmissionFieldDefinition>? fields,
    List<SubmissionContactField>? contactFormFields,
    List<ContactRecord>? contacts,
    List<FieldResponse>? fieldResponses,
  }) {
    return SubmissionSession(
      token: token ?? this.token,
      submissionId: submissionId ?? this.submissionId,
      formTemplateId: formTemplateId ?? this.formTemplateId,
      formName: formName ?? this.formName,
      clientName: clientName ?? this.clientName,
      clientContact: clientContact ?? this.clientContact,
      mode: mode ?? this.mode,
      formVersion: formVersion ?? this.formVersion,
      submissionUpdatedAt: submissionUpdatedAt ?? this.submissionUpdatedAt,
      localeCode: localeCode ?? this.localeCode,
      isOnline: isOnline ?? this.isOnline,
      fields: fields ?? this.fields,
      contactFormFields: contactFormFields ?? this.contactFormFields,
      contacts: contacts ?? this.contacts,
      fieldResponses: fieldResponses ?? this.fieldResponses,
    );
  }
}
