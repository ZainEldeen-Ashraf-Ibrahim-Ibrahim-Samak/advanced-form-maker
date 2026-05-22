import "dart:async";

import "package:flutter/material.dart";

import "../../../domain/entities/submission_event.dart";
import "../../../domain/services/submission_event_bus.dart";

class SubmissionToastHost extends StatefulWidget {
  const SubmissionToastHost({
    super.key,
    required this.eventBus,
    required this.t,
    required this.child,
  });

  final SubmissionEventBus eventBus;
  final String Function(String key) t;
  final Widget child;

  @override
  State<SubmissionToastHost> createState() => _SubmissionToastHostState();
}

class _SubmissionToastHostState extends State<SubmissionToastHost> {
  StreamSubscription<SubmissionEvent>? _subscription;

  @override
  void initState() {
    super.initState();
    _bind();
  }

  @override
  void didUpdateWidget(covariant SubmissionToastHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.eventBus != widget.eventBus) {
      _subscription?.cancel();
      _bind();
    }
  }

  void _bind() {
    _subscription = widget.eventBus.stream.listen((event) {
      if (!mounted) {
        return;
      }

      final text = widget.t(event.messageKey).trim();
      if (text.isEmpty) {
        return;
      }

      final messenger = ScaffoldMessenger.of(context);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            content: Text(text),
          ),
        );
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
