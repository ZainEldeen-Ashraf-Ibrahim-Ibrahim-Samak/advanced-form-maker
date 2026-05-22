import "../../domain/entities/webview_session.dart";

class WebviewSessionViewModel {
  WebviewSession? _session;

  WebviewSession? get session => _session;

  WebviewSession start(Uri uri) {
    final next = WebviewSession(
      sessionId: DateTime.now().microsecondsSinceEpoch.toString(),
      entryUrl: uri,
      currentUrl: uri,
      lastScanAt: DateTime.now().toUtc(),
      status: WebviewSessionStatus.active,
    );
    _session = next;
    return next;
  }

  WebviewSession replace(Uri uri) {
    final current = _session;
    if (current == null) {
      return start(uri);
    }
    final next = WebviewSession(
      sessionId: current.sessionId,
      entryUrl: current.entryUrl,
      currentUrl: uri,
      lastScanAt: DateTime.now().toUtc(),
      status: WebviewSessionStatus.active,
    );
    _session = next;
    return next;
  }
}
