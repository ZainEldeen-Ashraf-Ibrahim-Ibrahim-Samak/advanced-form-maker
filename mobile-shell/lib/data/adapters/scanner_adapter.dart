abstract class ScannerAdapter {
  Future<bool> ensureCameraPermission();
  Future<String?> scanQr();
}
