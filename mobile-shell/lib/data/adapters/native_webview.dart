import "webview_adapter.dart";

class NativeWebviewAdapter implements WebviewAdapter {
  Uri? _current;

  Uri? get current => _current;

  @override
  Future<void> openInApp(Uri url) async {
    _current = url;
  }

  @override
  Future<void> replaceDestination(Uri url) async {
    _current = url;
  }
}
