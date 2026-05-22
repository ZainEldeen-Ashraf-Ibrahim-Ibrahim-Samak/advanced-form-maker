import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/domain/entities/qr_scan_payload.dart";
import "package:scct_mobile_shell/domain/use_cases/evaluate_qr_destination.dart";

void main() {
  const useCase = EvaluateQrDestinationUseCase();
  const policy = NavigationPolicy(
    allowedHosts: <String>["scct-damages.vercel.app"],
    enforceHttps: true,
    allowSubdomains: true,
    blockedPathPrefixes: <String>["/admin/internal"],
    submissionPathSegment: "submit",
  );

  test("extracts submission token from submit path", () {
    final payload = useCase.evaluate(
      rawValue: "https://scct-damages.vercel.app/ar/submit/abc123",
      policy: policy,
    );

    expect(payload.validationStatus, ValidationStatus.accepted);
    expect(payload.destinationType, QrDestinationType.submission);
    expect(payload.submissionToken, "abc123");
  });

  test("extracts form id from share path", () {
    final payload = useCase.evaluate(
      rawValue: "https://scct-damages.vercel.app/ar/f/69dd339db6f078db770b5fb2",
      policy: policy,
    );

    expect(payload.validationStatus, ValidationStatus.accepted);
    expect(payload.destinationType, QrDestinationType.submission);
    expect(payload.submissionToken, "69dd339db6f078db770b5fb2");
  });
}
