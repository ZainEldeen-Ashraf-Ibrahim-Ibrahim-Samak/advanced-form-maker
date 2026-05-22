import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

/// A singleton service to manage real-time WebSocket connections via Pusher.
class SocketService {
  SocketService._();
  static final SocketService instance = SocketService._();

  final PusherChannelsFlutter _pusher = PusherChannelsFlutter.getInstance();
  bool _initialized = false;
  
  final Map<String, List<Function(Map<String, dynamic>)>> _listeners = {};

  Future<void> init({
    required String apiKey,
    required String cluster,
  }) async {
    if (_initialized || apiKey.isEmpty) return;

    try {
      await _pusher.init(
        apiKey: apiKey,
        cluster: cluster,
        onEvent: _onEvent,
        onSubscriptionSucceeded: (channelName, data) {
          if (kDebugMode) {
            print("Pusher: Subscription succeeded to $channelName");
          }
        },
        onError: (message, code, error) {
          if (kDebugMode) {
            print("Pusher: Error: $message (code: $code, error: $error)");
          }
        },
        onConnectionStateChange: (currentState, previousState) {
          if (kDebugMode) {
            print("Pusher: Connection state changed from $previousState to $currentState");
          }
        },
      );
      await _pusher.connect();
      _initialized = true;
    } catch (e) {
      if (kDebugMode) {
        print("Pusher: Initialization failed: $e");
      }
    }
  }

  /// Subscribes to a channel and registers a callback for a specific event name.
  Future<void> subscribe({
    required String channelName,
    required String eventName,
    required Function(Map<String, dynamic>) onData,
  }) async {
    if (!_initialized) return;

    try {
      await _pusher.subscribe(channelName: channelName);
      final key = "$channelName:$eventName";
      _listeners.putIfAbsent(key, () => []).add(onData);
    } catch (e) {
      if (kDebugMode) {
        print("Pusher: Subscription error for $channelName: $e");
      }
    }
  }

  /// Unsubscribes from a channel and removes all associated listeners.
  Future<void> unsubscribe(String channelName) async {
    if (!_initialized) return;

    try {
      await _pusher.unsubscribe(channelName: channelName);
      _listeners.removeWhere((key, _) => key.startsWith("$channelName:"));
    } catch (e) {
       if (kDebugMode) {
        print("Pusher: Unsubscription error for $channelName: $e");
      }
    }
  }

  void _onEvent(PusherEvent event) {
    final key = "${event.channelName}:${event.eventName}";
    final callbacks = _listeners[key];
    
    if (callbacks != null && callbacks.isNotEmpty) {
      try {
        final Map<String, dynamic> data = event.data is String 
            ? jsonDecode(event.data as String)
            : event.data as Map<String, dynamic>;
            
        for (final callback in callbacks) {
          callback(data);
        }
      } catch (e) {
        if (kDebugMode) {
          print("Pusher: Error parsing event data properly: $e (Raw: ${event.data})");
        }
      }
    }
  }
}
