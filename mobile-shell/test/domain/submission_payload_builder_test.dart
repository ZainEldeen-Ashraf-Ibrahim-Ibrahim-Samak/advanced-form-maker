import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/domain/entities/contact_record.dart";
import "package:scct_mobile_shell/domain/entities/field_response.dart";
import "package:scct_mobile_shell/domain/repositories/submission_repository.dart";

void main() {
  test("SubmissionMutationInput builds API payload shape", () {
    const input = SubmissionMutationInput(
      token: "token_123",
      clientName: "Client Name",
      clientContact: "+201234567890",
      contacts: <ContactRecord>[
        ContactRecord(
          id: "contact_primary",
          name: "Primary",
          email: "primary@example.com",
        ),
      ],
      fieldResponses: <FieldResponse>[
        FieldResponse(
          fieldDefinitionId: "field_1",
          value: "Value",
        ),
      ],
      expectedFormVersion: "v1",
      expectedSubmissionUpdatedAt: "2024-01-01",
    );

    final body = input.toRequestJson();

    expect(body["clientName"], "Client Name");
    expect(body["clientContact"], "+201234567890");
    expect((body["contactRecords"] as List<dynamic>).length, 1);
    expect((body["fieldValues"] as List<dynamic>).length, 1);
    expect((body["fieldValues"] as List<dynamic>).first["fieldDefinitionId"], "field_1");
    expect(body["expectedFormVersion"], "v1");
    expect(body["expectedSubmissionUpdatedAt"], "2024-01-01");
  });
}
