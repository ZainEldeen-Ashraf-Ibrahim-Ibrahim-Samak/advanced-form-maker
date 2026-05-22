import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

/// A wrapper widget that prevents the OS from capturing screenshots or
/// screen recording while its child is being displayed.
/// It uses platform channels to update native system flags (FLAG_SECURE on Android, etc).
class SecureWidget extends StatefulWidget {
  final Widget child;

  /// Creates a [SecureWidget] that displays the given [child].
  const SecureWidget({super.key, required this.child});

  @override
  State<SecureWidget> createState() => _SecureWidgetState();
}

class _SecureWidgetState extends State<SecureWidget>
    with WidgetsBindingObserver {
  static const MethodChannel _channel = MethodChannel('com.scct.app/secure');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _enableSecureMode();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disableSecureMode();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _enableSecureMode();
    } else if (state == AppLifecycleState.paused) {
      _disableSecureMode();
    }
  }

  Future<void> _enableSecureMode() async {
    if (kIsWeb) {
      return;
    }
    try {
      await _channel.invokeMethod('enableSecure');
    } on PlatformException catch (e) {
      debugPrint("Failed to enable secure mode: '${e.message}'.");
    }
  }

  Future<void> _disableSecureMode() async {
    if (kIsWeb) {
      return;
    }
    try {
      await _channel.invokeMethod('disableSecure');
    } on PlatformException catch (e) {
      debugPrint("Failed to disable secure mode: '${e.message}'.");
    }
  }

  @override
  Widget build(BuildContext context) {
    // Simply wrap the child and manage the native state while this widget is mounted.
    return widget.child;
  }
}
