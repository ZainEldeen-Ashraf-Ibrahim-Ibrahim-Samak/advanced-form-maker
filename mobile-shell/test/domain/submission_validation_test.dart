import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/domain/constants/message_keys.dart";
import "package:scct_mobile_shell/domain/entities/contact_record.dart";
import "package:scct_mobile_shell/domain/entities/field_response.dart";
import "package:scct_mobile_shell/domain/entities/submission_session.dart";
import "package:scct_mobile_shell/domain/use_cases/validate_submission_draft.dart";

void main() {
  const validator = ValidateSubmissionDraftUseCase();

  test("validate draft reports invalid contact and required field errors", () {
    const fields = <SubmissionFieldDefinition>[
      SubmissionFieldDefinition(
        id: "email_field",
        nameEn: "Email",
        nameAr: "البريد",
        inputType: SubmissionFieldType.text,
        isMultiple: false,
        validation: SubmissionFieldValidation(
          required: true,
          regexType: SubmissionRegexType.email,
        ),
        dropdownOptionsEn: <String>[],
        dropdownOptionsAr: <String>[],
      ),
    ];

    const contacts = <ContactRecord>[
      ContactRecord(
        id: "c1",
        name: "Primary",
        email: "bad-email",
      ),
    ];

    const responses = <String, FieldResponse>{
      "email_field": FieldResponse(
        fieldDefinitionId: "email_field",
        value: "still-not-an-email",
      ),
    };

    final result = validator.execute(
      contacts: contacts,
      contactFormFields: const <SubmissionContactField>[
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
      ],
      fields: fields,
      responses: responses,
    );

    expect(result.isValid, isFalse);
    expect(result.contactErrorKey, MessageKeys.submissionValidationEmail);
    expect(result.fieldErrorKeys["email_field"],
        MessageKeys.submissionValidationEmail);
  });
}
