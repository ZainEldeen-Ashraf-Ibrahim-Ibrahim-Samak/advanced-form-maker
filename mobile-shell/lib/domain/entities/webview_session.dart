enum WebviewSessionStatus { idle, active, blocked, error }

enum WebviewErrorCode { networkUnreachable, navigationBlocked, unknown }

class WebviewSession {
  const WebviewSession({
    required this.sessionId,
    required this.entryUrl,
    required this.currentUrl,
    required this.lastScanAt,
    required this.status,
    this.errorCode,
  });

  final String sessionId;
  final Uri entryUrl;
  final Uri currentUrl;
  final DateTime lastScanAt;
  final WebviewSessionStatus status;
  final WebviewErrorCode? errorCode;
}
