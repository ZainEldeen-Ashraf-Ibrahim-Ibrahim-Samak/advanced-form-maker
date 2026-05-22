import "dart:async";

import "../entities/submission_event.dart";

class SubmissionEventBus {
  SubmissionEventBus();

  final StreamController<SubmissionEvent> _controller =
      StreamController<SubmissionEvent>.broadcast();

  Stream<SubmissionEvent> get stream => _controller.stream;

  void emit(SubmissionEvent event) {
    if (_controller.isClosed) {
      return;
    }
    _controller.add(event);
  }

  Future<void> dispose() async {
    if (_controller.isClosed) {
      return;
    }
    await _controller.close();
  }
}
