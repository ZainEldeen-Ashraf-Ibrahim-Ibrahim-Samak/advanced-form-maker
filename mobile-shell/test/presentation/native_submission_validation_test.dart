import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/domain/entities/contact_record.dart";
import "package:scct_mobile_shell/domain/entities/submission_session.dart";
import "package:scct_mobile_shell/presentation/components/submission/contact_records_section.dart";

void main() {
  testWidgets("ContactRecordsSection shows validation error text",
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ContactRecordsSection(
            contacts: const <ContactRecord>[
              ContactRecord(id: "c1", name: "Primary"),
            ],
            contactFields: const <SubmissionContactField>[
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
            enabled: true,
            localeCode: "en",
            errorText: "validation-error",
            t: (key) => key,
            onContactChanged: (_, __, ___) {},
          ),
        ),
      ),
    );

    expect(find.text("validation-error"), findsOneWidget);
  });
}
