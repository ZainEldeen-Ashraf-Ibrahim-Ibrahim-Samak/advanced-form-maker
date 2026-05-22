enum ValidationStatus { pending, accepted, rejected }

enum QrFailureCode { invalidFormat, nonHttps, disallowedHost, blockedPath }

enum QrDestinationType { webview, submission }

class QrScanPayload {
  const QrScanPayload({
    required this.rawValue,
    required this.validationStatus,
    required this.scannedAt,
    this.normalizedUrl,
    this.scheme,
    this.host,
    this.failureCode,
    this.destinationType = QrDestinationType.webview,
    this.submissionToken,
  });

  final String rawValue;
  final String? normalizedUrl;
  final String? scheme;
  final String? host;
  final ValidationStatus validationStatus;
  final QrFailureCode? failureCode;
  final QrDestinationType destinationType;
  final String? submissionToken;
  final DateTime scannedAt;
}
