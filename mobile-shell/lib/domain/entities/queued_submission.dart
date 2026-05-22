class QueuedSubmission {
  const QueuedSubmission({
    required this.draftRef,
    required this.payload,
    required this.enqueuedAt,
    this.attempts = 0,
    this.lastError,
  });

  final String draftRef;
  final Map<String, dynamic> payload;
  final DateTime enqueuedAt;
  final int attempts;
  final String? lastError;

  QueuedSubmission copyWith({
    String? draftRef,
    Map<String, dynamic>? payload,
    DateTime? enqueuedAt,
    int? attempts,
    String? lastError,
  }) {
    return QueuedSubmission(
      draftRef: draftRef ?? this.draftRef,
      payload: payload ?? this.payload,
      enqueuedAt: enqueuedAt ?? this.enqueuedAt,
      attempts: attempts ?? this.attempts,
      lastError: lastError ?? this.lastError,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      "draftRef": draftRef,
      "payload": payload,
      "enqueuedAt": enqueuedAt.toUtc().toIso8601String(),
      "attempts": attempts,
      "lastError": lastError,
    };
  }

  factory QueuedSubmission.fromJson(Map<String, dynamic> json) {
    return QueuedSubmission(
      draftRef: (json["draftRef"] ?? "").toString(),
      payload:
          json["payload"] as Map<String, dynamic>? ?? const <String, dynamic>{},
      enqueuedAt:
          DateTime.tryParse((json["enqueuedAt"] ?? "").toString())?.toUtc() ??
              DateTime.now().toUtc(),
      attempts: json["attempts"] is int
          ? json["attempts"] as int
          : int.tryParse((json["attempts"] ?? "0").toString()) ?? 0,
      lastError: json["lastError"]?.toString(),
    );
  }
}
