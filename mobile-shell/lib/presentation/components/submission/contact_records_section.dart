import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "../../../domain/constants/message_keys.dart";
import "../../../domain/constants/submission_regex.dart";
import "../../../domain/entities/contact_record.dart";
import "../../../domain/entities/submission_session.dart";

typedef ContactFieldChanged = void Function(
    String contactId, String fieldKey, String value);

class ContactRecordsSection extends StatelessWidget {
  const ContactRecordsSection({
    super.key,
    required this.contacts,
    required this.contactFields,
    required this.enabled,
    required this.localeCode,
    required this.onContactChanged,
    this.errorText,
    required this.t,
  });

  final List<ContactRecord> contacts;
  final List<SubmissionContactField> contactFields;
  final bool enabled;
  final String localeCode;
  final ContactFieldChanged onContactChanged;
  final String? errorText;
  final String Function(String key) t;

  @override
  Widget build(BuildContext context) {
    final primaryContact = contacts.isNotEmpty
        ? contacts.first
        : const ContactRecord(id: "contact_primary");

    final fields = (contactFields.isNotEmpty
        ? [...contactFields]
        : _fallbackFields())
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t("mobile.submission.section.contact"),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 6),
        Text(
          t(MessageKeys.submissionContactFormDescription),
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 10),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              errorText!,
              style: TextStyle(
                color: Theme.of(context).colorScheme.error,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context)
                .colorScheme
                .surfaceContainerHighest
                .withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ...fields.map((field) {
                final fieldKey = _fieldKeyToString(field.key);
                final value = _fieldValue(primaryContact, field.key);
                final regexHint = enabled
                    ? _buildRegexHint(
                        context: context,
                        fieldKey: field.key,
                        rawValue: value,
                      )
                    : null;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextFormField(
                        key: ValueKey("${fieldKey}_${primaryContact.id}"),
                        enabled: enabled,
                        initialValue: value,
                        keyboardType: _keyboardType(field.key),
                        inputFormatters: _inputFormatters(field.key),
                        decoration: InputDecoration(
                          labelText: field.labelForLocale(localeCode),
                          hintText: field.placeholderForLocale(localeCode),
                          suffixText: field.required
                              ? t(MessageKeys.commonRequired)
                              : null,
                        ),
                        onChanged: (nextValue) => onContactChanged(
                          primaryContact.id,
                          fieldKey,
                          _normalizeValue(field.key, nextValue),
                        ),
                      ),
                      if (regexHint != null) ...[
                        const SizedBox(height: 6),
                        regexHint,
                      ],
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ],
    );
  }

  List<TextInputFormatter> _inputFormatters(SubmissionContactFieldKey key) {
    if (key != SubmissionContactFieldKey.phone) {
      return const <TextInputFormatter>[];
    }

    return <TextInputFormatter>[
      TextInputFormatter.withFunction((oldValue, newValue) {
        final normalized = normalizePhoneNumber(newValue.text);
        return TextEditingValue(
          text: normalized,
          selection: TextSelection.collapsed(offset: normalized.length),
        );
      }),
    ];
  }

  String _normalizeValue(SubmissionContactFieldKey key, String value) {
    if (key == SubmissionContactFieldKey.phone) {
      return normalizePhoneNumber(value);
    }

    return value;
  }

  Widget? _buildRegexHint({
    required BuildContext context,
    required SubmissionContactFieldKey fieldKey,
    required String rawValue,
  }) {
    final value = rawValue.trim();
    if (value.isEmpty) {
      return null;
    }

    switch (fieldKey) {
      case SubmissionContactFieldKey.name:
        return _validationHint(
          context: context,
          isValid: nameRegex.hasMatch(value),
          validKey: MessageKeys.submissionValidationValidName,
          invalidKey: MessageKeys.submissionValidationName,
        );
      case SubmissionContactFieldKey.email:
        return _validationHint(
          context: context,
          isValid: emailRegex.hasMatch(value),
          validKey: MessageKeys.submissionValidationValidEmail,
          invalidKey: MessageKeys.submissionValidationEmail,
        );
      case SubmissionContactFieldKey.phone:
        final normalized = normalizePhoneNumber(value);
        return _validationHint(
          context: context,
          isValid: phoneRegex.hasMatch(normalized),
          validKey: MessageKeys.submissionValidationValidPhone,
          invalidKey: MessageKeys.submissionValidationPhone,
        );
      case SubmissionContactFieldKey.address:
        return _validationHint(
          context: context,
          isValid: textRegex.hasMatch(value),
          validKey: MessageKeys.submissionValidationValidText,
          invalidKey: MessageKeys.submissionValidationText,
        );
    }
  }

  Widget _validationHint({
    required BuildContext context,
    required bool isValid,
    required String validKey,
    required String invalidKey,
  }) {
    final color = isValid
        ? Theme.of(context).colorScheme.primary
        : Theme.of(context).colorScheme.error;

    return Row(
      children: [
        Icon(
          isValid ? Icons.check_circle_rounded : Icons.error_outline_rounded,
          size: 16,
          color: color,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            t(isValid ? validKey : invalidKey),
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  List<SubmissionContactField> _fallbackFields() {
    return <SubmissionContactField>[
      SubmissionContactField(
        id: "contact_name",
        key: SubmissionContactFieldKey.name,
        labelEn: t(MessageKeys.submissionContactName),
        labelAr: t(MessageKeys.submissionContactName),
        placeholderEn: t(MessageKeys.submissionContactNamePlaceholder),
        placeholderAr: t(MessageKeys.submissionContactNamePlaceholder),
        required: true,
        sortOrder: 0,
      ),
      SubmissionContactField(
        id: "contact_email",
        key: SubmissionContactFieldKey.email,
        labelEn: t(MessageKeys.submissionContactEmail),
        labelAr: t(MessageKeys.submissionContactEmail),
        placeholderEn: t(MessageKeys.submissionContactEmailPlaceholder),
        placeholderAr: t(MessageKeys.submissionContactEmailPlaceholder),
        required: false,
        sortOrder: 1,
      ),
      SubmissionContactField(
        id: "contact_phone",
        key: SubmissionContactFieldKey.phone,
        labelEn: t(MessageKeys.submissionContactPhone),
        labelAr: t(MessageKeys.submissionContactPhone),
        placeholderEn: t(MessageKeys.submissionContactPhonePlaceholder),
        placeholderAr: t(MessageKeys.submissionContactPhonePlaceholder),
        required: false,
        sortOrder: 2,
      ),
      SubmissionContactField(
        id: "contact_address",
        key: SubmissionContactFieldKey.address,
        labelEn: t(MessageKeys.submissionContactAddress),
        labelAr: t(MessageKeys.submissionContactAddress),
        placeholderEn: t(MessageKeys.submissionContactAddressPlaceholder),
        placeholderAr: t(MessageKeys.submissionContactAddressPlaceholder),
        required: false,
        sortOrder: 3,
      ),
    ];
  }

  String _fieldKeyToString(SubmissionContactFieldKey key) {
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

  String _fieldValue(ContactRecord contact, SubmissionContactFieldKey key) {
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

  TextInputType _keyboardType(SubmissionContactFieldKey key) {
    switch (key) {
      case SubmissionContactFieldKey.email:
        return TextInputType.emailAddress;
      case SubmissionContactFieldKey.phone:
        return TextInputType.phone;
      case SubmissionContactFieldKey.name:
      case SubmissionContactFieldKey.address:
        return TextInputType.text;
    }
  }
}
