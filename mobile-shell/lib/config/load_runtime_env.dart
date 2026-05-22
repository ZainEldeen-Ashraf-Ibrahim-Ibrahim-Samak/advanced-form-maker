import "dart:io";

import "package:flutter/foundation.dart";
import "package:flutter_dotenv/flutter_dotenv.dart";

import "../domain/entities/mobile_runtime_config.dart";

RuntimeConfigInput loadRuntimeEnv() {
  const appBaseFromDefine = String.fromEnvironment("MOBILE_APP_BASE_URL");
  const apiOriginFromDefine = String.fromEnvironment("API_ORIGIN");
  const nextPublicAppUrlFromDefine = String.fromEnvironment("NEXT_PUBLIC_APP_URL");
  const allowedHostsFromDefine = String.fromEnvironment("MOBILE_ALLOWED_HOSTS");
  const defaultLocaleFromDefine =
      String.fromEnvironment("MOBILE_DEFAULT_LOCALE");
  const supportedLocalesFromDefine =
      String.fromEnvironment("MOBILE_SUPPORTED_LOCALES");
  const splashMsFromDefine =
      String.fromEnvironment("MOBILE_SPLASH_MIN_DURATION_MS");
  const scanTimeoutFromDefine =
      String.fromEnvironment("MOBILE_SCAN_TIMEOUT_MS");
  const submissionPathFromDefine =
      String.fromEnvironment("MOBILE_SUBMISSION_PATH_SEGMENT");
  const apiTimeoutFromDefine = String.fromEnvironment("MOBILE_API_TIMEOUT_MS");
  const draftDebounceFromDefine =
      String.fromEnvironment("MOBILE_DRAFT_AUTOSAVE_DEBOUNCE_MS");
  const pusherKeyFromDefine = String.fromEnvironment("PUSHER_KEY");
  const pusherClusterFromDefine = String.fromEnvironment("PUSHER_CLUSTER");

  final resolvedBaseUrl = _resolveRequiredFromMany(
    defineValues: <String>[
      appBaseFromDefine,
      apiOriginFromDefine,
      nextPublicAppUrlFromDefine,
    ],
    envKeys: const <String>[
      "MOBILE_APP_BASE_URL",
      "API_ORIGIN",
      "NEXT_PUBLIC_APP_URL",
    ],
  );

  final derivedAllowedHost = _extractHostFromHttpsUrl(resolvedBaseUrl);

  return RuntimeConfigInput(
    mobileAppBaseUrl: resolvedBaseUrl,
    mobileAllowedHosts: _resolveRequiredValue(
      defineValue: allowedHostsFromDefine,
      envKey: "MOBILE_ALLOWED_HOSTS",
      debugFallback: derivedAllowedHost,
    ),
    mobileDefaultLocale: _resolveRequiredValue(
      defineValue: defaultLocaleFromDefine,
      envKey: "MOBILE_DEFAULT_LOCALE",
      debugFallback: "ar",
    ),
    mobileSupportedLocales: _resolveRequiredValue(
      defineValue: supportedLocalesFromDefine,
      envKey: "MOBILE_SUPPORTED_LOCALES",
      debugFallback: "ar,en",
    ),
    mobileSplashMinDurationMs: _resolveRequiredValue(
      defineValue: splashMsFromDefine,
      envKey: "MOBILE_SPLASH_MIN_DURATION_MS",
      debugFallback: "1200",
    ),
    mobileScanTimeoutMs: _resolveOptionalValue(
      defineValue: scanTimeoutFromDefine,
      envKey: "MOBILE_SCAN_TIMEOUT_MS",
      debugFallback: "10000",
    ),
    mobileSubmissionPathSegment: _resolveOptionalValue(
      defineValue: submissionPathFromDefine,
      envKey: "MOBILE_SUBMISSION_PATH_SEGMENT",
      debugFallback: "submit",
    ),
    mobileApiTimeoutMs: _resolveOptionalValue(
      defineValue: apiTimeoutFromDefine,
      envKey: "MOBILE_API_TIMEOUT_MS",
      debugFallback: "15000",
    ),
    mobileDraftAutosaveDebounceMs: _resolveOptionalValue(
      defineValue: draftDebounceFromDefine,
      envKey: "MOBILE_DRAFT_AUTOSAVE_DEBOUNCE_MS",
      debugFallback: "450",
    ),
    pusherKey: _resolveOptionalValue(
      defineValue: pusherKeyFromDefine,
      envKey: "PUSHER_KEY",
      debugFallback: "",
    ),
    pusherCluster: _resolveOptionalValue(
      defineValue: pusherClusterFromDefine,
      envKey: "PUSHER_CLUSTER",
      debugFallback: "mt1",
    ),
  );
}

String? _resolveRequiredValue({
  required String defineValue,
  required String envKey,
  String? debugFallback,
}) {
  final fromDefine = defineValue.trim();
  if (fromDefine.isNotEmpty) {
    return fromDefine;
  }

  if (dotenv.isInitialized) {
    final fromDotEnv = dotenv.env[envKey]?.trim();
    if (fromDotEnv != null && fromDotEnv.isNotEmpty) {
      return fromDotEnv;
    }
  }

  if (!kIsWeb) {
    final fromEnv = Platform.environment[envKey]?.trim();
    if (fromEnv != null && fromEnv.isNotEmpty) {
      return fromEnv;
    }
  }

  if (!kReleaseMode && debugFallback != null && debugFallback.trim().isNotEmpty) {
    return debugFallback;
  }

  return null;
}

String? _resolveRequiredFromMany({
  required List<String> defineValues,
  required List<String> envKeys,
  String? debugFallback,
}) {
  for (final value in defineValues) {
    final trimmed = value.trim();
    if (trimmed.isNotEmpty) {
      return trimmed;
    }
  }

  if (dotenv.isInitialized) {
    for (final key in envKeys) {
      final fromDotEnv = dotenv.env[key]?.trim();
      if (fromDotEnv != null && fromDotEnv.isNotEmpty) {
        return fromDotEnv;
      }
    }
  }

  if (!kIsWeb) {
    for (final key in envKeys) {
      final fromEnv = Platform.environment[key]?.trim();
      if (fromEnv != null && fromEnv.isNotEmpty) {
        return fromEnv;
      }
    }
  }

  if (!kReleaseMode && debugFallback != null && debugFallback.trim().isNotEmpty) {
    return debugFallback;
  }

  return null;
}

String? _extractHostFromHttpsUrl(String? rawUrl) {
  if (rawUrl == null || rawUrl.trim().isEmpty) {
    return null;
  }

  final uri = Uri.tryParse(rawUrl.trim());
  if (uri == null || uri.host.isEmpty) {
    return null;
  }

  return uri.host;
}

String? _resolveOptionalValue({
  required String defineValue,
  required String envKey,
  String? debugFallback,
}) {
  final fromDefine = defineValue.trim();
  if (fromDefine.isNotEmpty) {
    return fromDefine;
  }

  if (dotenv.isInitialized) {
    final fromDotEnv = dotenv.env[envKey]?.trim();
    if (fromDotEnv != null && fromDotEnv.isNotEmpty) {
      return fromDotEnv;
    }
  }

  if (!kIsWeb) {
    final fromEnv = Platform.environment[envKey]?.trim();
    if (fromEnv != null && fromEnv.isNotEmpty) {
      return fromEnv;
    }
  }

  if (!kReleaseMode) {
    return debugFallback;
  }

  return null;
}
