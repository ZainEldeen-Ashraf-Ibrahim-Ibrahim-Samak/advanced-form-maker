import "../../domain/constants/message_keys.dart";
import "../../domain/entities/qr_scan_payload.dart";
import "../../domain/use_cases/evaluate_qr_destination.dart";

class ScanResult {
  const ScanResult({
    required this.payload,
    this.acceptedUri,
    this.submissionToken,
    this.messageKey,
  });

  final QrScanPayload payload;
  final Uri? acceptedUri;
  final String? submissionToken;
  final String? messageKey;
}

class ScanViewModel {
  ScanViewModel({
    required this.policy,
    EvaluateQrDestinationUseCase? evaluator,
  }) : _evaluator = evaluator ?? const EvaluateQrDestinationUseCase();

  final NavigationPolicy policy;
  final EvaluateQrDestinationUseCase _evaluator;

  String? validatePrerequisites({
    required bool hasCameraPermission,
    required bool isOnline,
  }) {
    if (!hasCameraPermission) {
      return MessageKeys.scanCameraDenied;
    }
    if (!isOnline) {
      return MessageKeys.scanOffline;
    }
    return null;
  }

  ScanResult processScan(
    String rawValue, {
    bool hasCameraPermission = true,
    bool isOnline = true,
  }) {
    final precheck = validatePrerequisites(
      hasCameraPermission: hasCameraPermission,
      isOnline: isOnline,
    );
    if (precheck != null) {
      return ScanResult(
        payload: QrScanPayload(
          rawValue: rawValue,
          validationStatus: ValidationStatus.rejected,
          scannedAt: DateTime.now().toUtc(),
        ),
        messageKey: precheck,
      );
    }

    final payload = _evaluator.evaluate(rawValue: rawValue, policy: policy);

    if (payload.validationStatus == ValidationStatus.accepted && payload.normalizedUrl != null) {
      return ScanResult(
        payload: payload,
        acceptedUri: Uri.parse(payload.normalizedUrl!),
        submissionToken: payload.submissionToken,
      );
    }

    return ScanResult(
      payload: payload,
      messageKey: _messageKeyFromFailure(payload.failureCode),
    );
  }

  String _messageKeyFromFailure(QrFailureCode? code) {
    switch (code) {
      case QrFailureCode.disallowedHost:
        return MessageKeys.scanDisallowed;
      case QrFailureCode.blockedPath:
        return MessageKeys.scanBlocked;
      case QrFailureCode.nonHttps:
      case QrFailureCode.invalidFormat:
      case null:
        return MessageKeys.scanInvalid;
    }
  }
}
