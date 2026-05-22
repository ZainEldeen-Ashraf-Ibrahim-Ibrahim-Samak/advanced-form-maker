import "../entities/qr_scan_payload.dart";

class NavigationPolicy {
  const NavigationPolicy({
    required this.allowedHosts,
    this.enforceHttps = true,
    this.allowSubdomains = true,
    this.blockedPathPrefixes = const <String>[],
    this.submissionPathSegment = "submit",
  });

  final List<String> allowedHosts;
  final bool enforceHttps;
  final bool allowSubdomains;
  final List<String> blockedPathPrefixes;
  final String submissionPathSegment;
}

class EvaluateQrDestinationUseCase {
  const EvaluateQrDestinationUseCase();

  QrScanPayload evaluate({required String rawValue, required NavigationPolicy policy}) {
    final scannedAt = DateTime.now().toUtc();
    final parsed = Uri.tryParse(rawValue.trim());

    if (parsed == null || !parsed.hasScheme || parsed.host.isEmpty) {
      return QrScanPayload(
        rawValue: rawValue,
        validationStatus: ValidationStatus.rejected,
        failureCode: QrFailureCode.invalidFormat,
        scannedAt: scannedAt,
      );
    }

    if (policy.enforceHttps && parsed.scheme.toLowerCase() != "https") {
      return QrScanPayload(
        rawValue: rawValue,
        validationStatus: ValidationStatus.rejected,
        failureCode: QrFailureCode.nonHttps,
        scheme: parsed.scheme,
        host: parsed.host,
        scannedAt: scannedAt,
      );
    }

    final host = parsed.host.toLowerCase();
    final isAllowedHost = policy.allowedHosts.any((allowed) {
      final allowedHost = allowed.toLowerCase();
      if (host == allowedHost) {
        return true;
      }
      return policy.allowSubdomains && host.endsWith('.$allowedHost');
    });

    if (!isAllowedHost) {
      return QrScanPayload(
        rawValue: rawValue,
        validationStatus: ValidationStatus.rejected,
        failureCode: QrFailureCode.disallowedHost,
        scheme: parsed.scheme,
        host: parsed.host,
        scannedAt: scannedAt,
      );
    }

    final isBlockedPath = policy.blockedPathPrefixes.any(
      (prefix) => parsed.path.startsWith(prefix),
    );

    if (isBlockedPath) {
      return QrScanPayload(
        rawValue: rawValue,
        validationStatus: ValidationStatus.rejected,
        failureCode: QrFailureCode.blockedPath,
        scheme: parsed.scheme,
        host: parsed.host,
        scannedAt: scannedAt,
      );
    }

    final submissionToken = _extractSubmissionToken(
      parsed,
      policy.submissionPathSegment,
    );

    return QrScanPayload(
      rawValue: rawValue,
      normalizedUrl: parsed.toString(),
      scheme: parsed.scheme,
      host: parsed.host,
      validationStatus: ValidationStatus.accepted,
      destinationType: submissionToken == null
          ? QrDestinationType.webview
          : QrDestinationType.submission,
      submissionToken: submissionToken,
      scannedAt: scannedAt,
    );
  }

  String? _extractSubmissionToken(Uri uri, String submissionPathSegment) {
    final queryToken = _extractFromQuery(uri.queryParameters);
    if (queryToken != null) {
      return queryToken;
    }

    final segment = submissionPathSegment.trim().toLowerCase();
    final expectedPathSegments = <String>{
      if (segment.isNotEmpty) segment,
      "submit",
      "submission",
      "submissions",
      "f",
      "form",
      "forms",
    };

    final pathSegments = uri.pathSegments.map((item) => item.trim()).toList();
    for (var index = 0; index < pathSegments.length; index++) {
      final normalized = pathSegments[index].toLowerCase();
      if (!expectedPathSegments.contains(normalized)) {
        continue;
      }

      if (index + 1 < pathSegments.length) {
        final tokenCandidate = pathSegments[index + 1].trim();
        if (tokenCandidate.isNotEmpty) {
          return tokenCandidate;
        }
      }
    }

    if (uri.fragment.isNotEmpty) {
      final fragmentUri = Uri.tryParse(uri.fragment);
      if (fragmentUri != null) {
        final fragmentToken = _extractFromQuery(fragmentUri.queryParameters);
        if (fragmentToken != null) {
          return fragmentToken;
        }
      }
    }

    return null;
  }

  String? _extractFromQuery(Map<String, String> query) {
    if (query.isEmpty) {
      return null;
    }

    final normalized = <String, String>{};
    query.forEach((key, value) {
      normalized[key.toLowerCase()] = value;
    });

    const keys = <String>[
      "token",
      "submissiontoken",
      "submission_token",
      "submission",
      "t",
    ];

    for (final key in keys) {
      final value = normalized[key]?.trim();
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }

    return null;
  }
}
