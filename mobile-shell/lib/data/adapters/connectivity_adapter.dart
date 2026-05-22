import "package:connectivity_plus/connectivity_plus.dart";

class ConnectivityAdapter {
  ConnectivityAdapter({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  Future<bool> isOnline() async {
    final status = await _connectivity.checkConnectivity();
    return _hasConnection(status);
  }

  Stream<bool> watchOnlineStatus() {
    return _connectivity.onConnectivityChanged
        .map(_hasConnection)
        .distinct();
  }

  bool _hasConnection(List<ConnectivityResult> status) {
    return status.any((value) => value != ConnectivityResult.none);
  }
}
