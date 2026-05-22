enum SubmissionOutcomeKind {
  success,
  validationError,
  staleConflict,
  unauthorized,
  invalidToken,
  serverError,
  networkError,
}

class SubmissionOutcome {
  const SubmissionOutcome({
    required this.kind,
    required this.message,
    this.code,
    this.retryable = false,
  });

  final SubmissionOutcomeKind kind;
  final String? code;
  final String message;
  final bool retryable;

  bool get isSuccess => kind == SubmissionOutcomeKind.success;
}
