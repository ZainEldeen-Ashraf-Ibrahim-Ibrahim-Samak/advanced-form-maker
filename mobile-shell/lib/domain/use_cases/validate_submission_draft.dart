import "../constants/message_keys.dart";
import "../constants/submission_regex.dart";
import "../entities/contact_record.dart";
import "../entities/field_response.dart";
import "../entities/submission_session.dart";

class SubmissionValidationResult {
  const SubmissionValidationResult({
    required this.fieldErrorKeys,
    this.contactErrorKey,
  });

  final Map<String, String> fieldErrorKeys;
  final String? contactErrorKey;

  bool get isValid => fieldErrorKeys.isEmpty && contactErrorKey == null;
}

class ValidateSubmissionDraftUseCase {
  const ValidateSubmissionDraftUseCase();

  SubmissionValidationResult execute({
    required List<ContactRecord> contacts,
    required List<SubmissionContactField> contactFormFields,
    required List<SubmissionFieldDefinition> fields,
    required Map<String, FieldResponse> responses,
  }) {
    final fieldErrors = <String, String>{};
    String? contactError;

    final orderedContactFields = (contactFormFields.isNotEmpty
        ? [...contactFormFields]
        : const <SubmissionContactField>[
            SubmissionContactField(
              id: "contact_name",
              key: SubmissionContactFieldKey.name,
              labelEn: "Name",
              labelAr: "الاسم",
              placeholderEn: "Enter name",
              placeholderAr: "ادخل الاسم",
              required: true,
              sortOrder: 0,
            ),
          ])
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    if (contacts.isEmpty) {
      contactError = MessageKeys.submissionValidationContactRequired;
    }

    final primaryContact = contacts.isNotEmpty
        ? contacts.first
        : const ContactRecord(id: "contact_primary");

    for (final field in orderedContactFields) {
      final value = _contactFieldValue(primaryContact, field.key).trim();
      if (field.required && value.isEmpty) {
        contactError = MessageKeys.submissionValidationContactRequired;
        break;
      }
    }

    if (contactError == null) {
      final name = primaryContact.name.trim();
      if (name.isNotEmpty && !nameRegex.hasMatch(name)) {
        contactError = MessageKeys.submissionValidationName;
      }

      final email = (primaryContact.email ?? "").trim();
      if (contactError == null &&
          email.isNotEmpty &&
          !emailRegex.hasMatch(email)) {
        contactError = MessageKeys.submissionValidationEmail;
      }

      final phone = (primaryContact.phone ?? "").trim();
      if (contactError == null &&
          phone.isNotEmpty &&
          !phoneRegex.hasMatch(phone)) {
        contactError = MessageKeys.submissionValidationPhone;
      }

      final contactText = (primaryContact.contact ?? "").trim();
      if (contactError == null &&
          contactText.isNotEmpty &&
          !textRegex.hasMatch(contactText)) {
        contactError = MessageKeys.submissionValidationText;
      }
    }

    for (final field in fields) {
      final response =
          responses[field.id] ?? FieldResponse(fieldDefinitionId: field.id);
      final value = response.value;

      if (field.validation.required && !response.hasMeaningfulValue) {
        fieldErrors[field.id] = MessageKeys.submissionValidationRequiredField;
        continue;
      }

      if (field.inputType == SubmissionFieldType.dropdown) {
        final allowed = <String>{
          ...field.dropdownOptionsEn.map((v) => v.trim()),
          ...field.dropdownOptionsAr.map((v) => v.trim()),
        };

        if (field.isMultiple) {
          if (value != null && value is! List<dynamic>) {
            fieldErrors[field.id] =
                MessageKeys.submissionValidationRequiredField;
            continue;
          }

          if (value is List<dynamic>) {
            for (final item in value) {
              final asString = item.toString().trim();
              if (asString.isNotEmpty && !allowed.contains(asString)) {
                fieldErrors[field.id] =
                    MessageKeys.submissionValidationRequiredField;
              }
            }
          }
        } else {
          if (value is List<dynamic>) {
            fieldErrors[field.id] =
                MessageKeys.submissionValidationRequiredField;
            continue;
          }

          final text = value?.toString().trim() ?? "";
          if (text.isNotEmpty && !allowed.contains(text)) {
            fieldErrors[field.id] =
                MessageKeys.submissionValidationRequiredField;
          }
        }
      }

      final regexType = field.validation.regexType;
      if (regexType == null) {
        continue;
      }

      final text = value?.toString().trim() ?? "";
      if (text.isEmpty) {
        continue;
      }

      switch (regexType) {
        case SubmissionRegexType.email:
          if (!emailRegex.hasMatch(text)) {
            fieldErrors[field.id] = MessageKeys.submissionValidationEmail;
          }
          break;
        case SubmissionRegexType.phone:
          if (!phoneRegex.hasMatch(text)) {
            fieldErrors[field.id] = MessageKeys.submissionValidationPhone;
          }
          break;
        case SubmissionRegexType.name:
          if (!nameRegex.hasMatch(text)) {
            fieldErrors[field.id] = MessageKeys.submissionValidationName;
          }
          break;
      }
    }

    return SubmissionValidationResult(
      fieldErrorKeys: fieldErrors,
      contactErrorKey: contactError,
    );
  }

  String _contactFieldValue(
    ContactRecord contact,
    SubmissionContactFieldKey key,
  ) {
    switch (key) {
      case SubmissionContactFieldKey.name:
        return contact.name;
      case SubmissionContactFieldKey.email:
        return contact.email ?? "";
      case SubmissionContactFieldKey.phone:
        return contact.phone ?? "";
      case SubmissionContactFieldKey.address:
        return contact.contact ?? "";
    }
  }
}
