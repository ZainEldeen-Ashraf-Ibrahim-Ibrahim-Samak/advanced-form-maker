import "scanner_adapter.dart";

class NativeQrScannerAdapter implements ScannerAdapter {
  @override
  Future<bool> ensureCameraPermission() async {
    // Permission handling should be implemented with mobile_scanner hooks.
    return true;
  }

  @override
  Future<String?> scanQr() async {
    // Scanner stream integration is handled by presentation camera widget.
    return null;
  }
}
