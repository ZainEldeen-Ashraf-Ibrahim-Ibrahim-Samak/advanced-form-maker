import "../../data/adapters/connectivity_adapter.dart";

class ConnectivityService {
  const ConnectivityService(this._adapter);

  final ConnectivityAdapter _adapter;

  Future<bool> isOnline() {
    return _adapter.isOnline();
  }

  Stream<bool> watchOnlineStatus() {
    return _adapter.watchOnlineStatus();
  }
}
