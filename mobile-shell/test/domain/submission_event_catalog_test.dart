import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/domain/entities/submission_event.dart";

void main() {
  test("mobile submission events are a superset of the catalog", () {
    const catalogEvents = <String>{
      "validation_failed",
      "submit_started",
      "submit_success",
      "submit_failed",
      "upload_started",
      "upload_progress",
      "upload_success",
      "upload_failed",
      "draft_saved",
      "draft_restored",
      "draft_discarded",
      "queue_online_resume",
    };

    final mobileEvents =
        SubmissionEventName.values.map(submissionEventWireName).toSet();

    expect(mobileEvents, containsAll(catalogEvents));
  });
}
