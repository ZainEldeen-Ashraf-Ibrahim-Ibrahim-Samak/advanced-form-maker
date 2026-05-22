import "../domain/entities/mobile_runtime_config.dart";

class RuntimeConfigValidationException implements Exception {
  RuntimeConfigValidationException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => "$code: $message";
}

class RuntimeConfig {
  const RuntimeConfig._();

  static MobileRuntimeConfig validate(RuntimeConfigInput input) {
    final baseUrlRaw = input.mobileAppBaseUrl?.trim();
    final hostsRaw = input.mobileAllowedHosts?.trim();
    final defaultLocaleRaw = input.mobileDefaultLocale?.trim();
    final supportedRaw = input.mobileSupportedLocales?.trim();
    final splashRaw = input.mobileSplashMinDurationMs?.trim();
    final timeoutRaw = input.mobileScanTimeoutMs?.trim();
    final submissionPathRaw = input.mobileSubmissionPathSegment?.trim();
    final apiTimeoutRaw = input.mobileApiTimeoutMs?.trim();
    final draftDebounceRaw = input.mobileDraftAutosaveDebounceMs?.trim();

    if ([baseUrlRaw, hostsRaw, defaultLocaleRaw, supportedRaw, splashRaw]
        .any((v) => v == null || v.isEmpty)) {
      throw RuntimeConfigValidationException("config_missing", "Missing required runtime variables.");
    }

    final appBaseUrl = Uri.tryParse(baseUrlRaw!);
    if (appBaseUrl == null || appBaseUrl.scheme != "https" || appBaseUrl.host.isEmpty) {
      throw RuntimeConfigValidationException("config_invalid_url", "MOBILE_APP_BASE_URL must be a valid HTTPS URL.");
    }

    final allowedHosts = hostsRaw!
        .split(",")
        .map((e) {
          final trimmed = e.trim().toLowerCase();
          try {
            // Normalize host entries by extracting just the host part even if a port is provided.
            final uri = Uri.tryParse(trimmed.contains("://") ? trimmed : "https://$trimmed");
            return uri?.host ?? trimmed;
          } catch (_) {
            return trimmed;
          }
        })
        .where((e) => e.isNotEmpty)
        .toSet()
        .toList();

    if (allowedHosts.isEmpty) {
      throw RuntimeConfigValidationException("config_invalid_hosts", "MOBILE_ALLOWED_HOSTS must contain at least one host.");
    }

    if (!allowedHosts.contains(appBaseUrl.host.toLowerCase())) {
      throw RuntimeConfigValidationException("config_invalid_hosts", "Base URL host must be included in MOBILE_ALLOWED_HOSTS.");
    }

    final defaultLocale = _parseLocale(defaultLocaleRaw!);
    final supportedLocales = supportedRaw!
        .split(",")
        .map((e) => _parseLocale(e.trim()))
        .toSet()
        .toList();

    if (!supportedLocales.contains(AppLocale.ar) || !supportedLocales.contains(AppLocale.en)) {
      throw RuntimeConfigValidationException("config_invalid_locale", "Supported locales must include ar and en.");
    }

    final splashMinDurationMs = int.tryParse(splashRaw!);
    if (splashMinDurationMs == null || splashMinDurationMs < 300 || splashMinDurationMs > 5000) {
      throw RuntimeConfigValidationException("config_invalid_numeric_range", "MOBILE_SPLASH_MIN_DURATION_MS must be between 300 and 5000.");
    }

    final scanTimeoutMs = timeoutRaw == null || timeoutRaw.isEmpty ? 10000 : int.tryParse(timeoutRaw);
    if (scanTimeoutMs == null || scanTimeoutMs < 1000 || scanTimeoutMs > 30000) {
      throw RuntimeConfigValidationException("config_invalid_numeric_range", "MOBILE_SCAN_TIMEOUT_MS must be between 1000 and 30000.");
    }

    final submissionPathSegment = (submissionPathRaw == null || submissionPathRaw.isEmpty)
        ? "submit"
        : submissionPathRaw.replaceAll("/", "").toLowerCase();
    if (submissionPathSegment.isEmpty) {
      throw RuntimeConfigValidationException("config_invalid_submission_path", "MOBILE_SUBMISSION_PATH_SEGMENT must not be empty.");
    }

    final apiTimeoutMs = apiTimeoutRaw == null || apiTimeoutRaw.isEmpty ? 15000 : int.tryParse(apiTimeoutRaw);
    if (apiTimeoutMs == null || apiTimeoutMs < 2000 || apiTimeoutMs > 60000) {
      throw RuntimeConfigValidationException("config_invalid_numeric_range", "MOBILE_API_TIMEOUT_MS must be between 2000 and 60000.");
    }

    final draftAutosaveDebounceMs = draftDebounceRaw == null || draftDebounceRaw.isEmpty
        ? 450
        : int.tryParse(draftDebounceRaw);
    if (draftAutosaveDebounceMs == null || draftAutosaveDebounceMs < 100 || draftAutosaveDebounceMs > 5000) {
      throw RuntimeConfigValidationException("config_invalid_numeric_range", "MOBILE_DRAFT_AUTOSAVE_DEBOUNCE_MS must be between 100 and 5000.");
    }

    return MobileRuntimeConfig(
      appBaseUrl: appBaseUrl,
      allowedHosts: allowedHosts,
      defaultLocale: defaultLocale,
      supportedLocales: supportedLocales,
      splashMinDurationMs: splashMinDurationMs,
      scanTimeoutMs: scanTimeoutMs,
      submissionPathSegment: submissionPathSegment,
      apiTimeoutMs: apiTimeoutMs,
      draftAutosaveDebounceMs: draftAutosaveDebounceMs,
      pusherKey: input.pusherKey ?? "",
      pusherCluster: input.pusherCluster ?? "mt1",
    );
  }

  static AppLocale _parseLocale(String raw) {
    switch (raw.toLowerCase()) {
      case "ar":
        return AppLocale.ar;
      case "en":
        return AppLocale.en;
      default:
        throw RuntimeConfigValidationException("config_invalid_locale", "Locale must be ar or en.");
    }
  }
}
