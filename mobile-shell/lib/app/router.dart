import "package:flutter/material.dart";

import "../presentation/screens/native_submission_screen.dart";
import "../presentation/screens/webview_screen.dart";

class AppRouter {
  const AppRouter._();

  static Route<dynamic> toWebview(
    Uri url, {
    required ThemeMode themeMode,
    required Locale currentLocale,
    VoidCallback? onToggleTheme,
    ValueChanged<String>? onLocaleSelected,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => WebviewScreen(
        initialUrl: url,
        themeMode: themeMode,
        currentLocale: currentLocale,
        onToggleTheme: onToggleTheme,
        onLocaleSelected: onLocaleSelected,
      ),
    );
  }

  static Route<dynamic> toNativeSubmission({
    required String token,
    required Uri appBaseUrl,
    required String localeCode,
    required int apiTimeoutMs,
    required int draftAutosaveDebounceMs,
    required String pusherKey,
    required String pusherCluster,
    required ThemeMode themeMode,
    required Locale currentLocale,
    VoidCallback? onToggleTheme,
    ValueChanged<String>? onLocaleSelected,
  }) {
    return MaterialPageRoute<void>(
      builder: (_) => NativeSubmissionScreen(
        token: token,
        appBaseUrl: appBaseUrl,
        localeCode: localeCode,
        apiTimeoutMs: apiTimeoutMs,
        draftAutosaveDebounceMs: draftAutosaveDebounceMs,
        pusherKey: pusherKey,
        pusherCluster: pusherCluster,
        themeMode: themeMode,
        currentLocale: currentLocale,
        onToggleTheme: onToggleTheme,
        onLocaleSelected: onLocaleSelected,
      ),
    );
  }
}
