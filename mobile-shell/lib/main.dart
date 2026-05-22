import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_dotenv/flutter_dotenv.dart";
import "package:hive_flutter/hive_flutter.dart";

import "app/router.dart";
import "app/startup_coordinator.dart";
import "config/brand_config.dart";
import "domain/constants/message_keys.dart";
import "domain/entities/mobile_runtime_config.dart";
import "domain/use_cases/evaluate_qr_destination.dart";
import "presentation/screens/scan_screen.dart";
import "presentation/screens/splash_screen.dart";
import "presentation/screens/startup_error_screen.dart";
import "presentation/view_models/scan_view_model.dart";
import "widgets/secure_widget.dart";
import "i18n/index.dart";
import "app/web_splash.dart";

const String _draftsBoxName = "drafts";
const String _submissionQueueBoxName = "submission_queue";
const String _formDefinitionsBoxName = "form_definitions";

Future<void> _initializeLocalStorage() async {
  await Hive.initFlutter();
  // Type adapters can be registered here as local models are introduced.
  if (!Hive.isBoxOpen(_draftsBoxName)) {
    await Hive.openBox<dynamic>(_draftsBoxName);
  }
  if (!Hive.isBoxOpen(_submissionQueueBoxName)) {
    await Hive.openBox<dynamic>(_submissionQueueBoxName);
  }
  if (!Hive.isBoxOpen(_formDefinitionsBoxName)) {
    await Hive.openBox<dynamic>(_formDefinitionsBoxName);
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _initializeLocalStorage();
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint("Could not load .env file: $e");
  }

  // Pre-load common languages to ensure synchronous usage isn't hardcoded in UI.
  try {
    await I18nCatalog.load("en");
    await I18nCatalog.load("ar");
  } catch (e) {
    debugPrint("Could not load i18n JSON catalogs: $e");
  }

  runApp(const ScctMobileApp());
}

class ScctMobileApp extends StatefulWidget {
  const ScctMobileApp({super.key});

  @override
  State<ScctMobileApp> createState() => _ScctMobileAppState();
}

class _ScctMobileAppState extends State<ScctMobileApp> {
  ThemeMode _themeMode = ThemeMode.light;
  Locale _locale = const Locale("ar");
  bool _appliedStartupLocale = false;
  late Future<StartupCoordinatorResult> _startupFuture;

  @override
  void initState() {
    super.initState();
    _startupFuture = _loadStartup();
  }

  Future<StartupCoordinatorResult> _loadStartup() async {
    const minSplashDuration = Duration(milliseconds: 1200);
    final startedAt = DateTime.now();
    final result = await startupCoordinator();
    final elapsed = DateTime.now().difference(startedAt);
    if (elapsed < minSplashDuration) {
      await Future<void>.delayed(minSplashDuration - elapsed);
    }
    return result;
  }

  void _toggleTheme() {
    setState(() {
      _themeMode =
          _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  void _setLocale(AppLocale locale) {
    setState(() {
      _locale = Locale(locale == AppLocale.ar ? "ar" : "en");
    });
  }

  void _setLocaleFromCode(String localeCode) {
    _setLocale(localeCode == "ar" ? AppLocale.ar : AppLocale.en);
  }

  void _retryStartup() {
    setState(() {
      _appliedStartupLocale = false;
      _startupFuture = _loadStartup();
    });
  }

  String _t(String key) {
    final locale = _locale.languageCode.toLowerCase() == "ar" ? "ar" : "en";
    final catalog =
        I18nCatalog.getCached(locale) ?? I18nCatalog.getCached("ar");
    return catalog?.t(key) ?? key;
  }

  String? _extractSubmissionTokenFromUri(
    Uri? uri, {
    required String submissionPathSegment,
  }) {
    if (uri == null) {
      return null;
    }

    final normalizedQuery = <String, String>{};
    uri.queryParameters.forEach((key, value) {
      normalizedQuery[key.toLowerCase()] = value;
    });

    const queryKeys = <String>[
      "token",
      "submissiontoken",
      "submission_token",
      "submission",
      "t",
    ];

    for (final key in queryKeys) {
      final value = normalizedQuery[key]?.trim();
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }

    final expectedPathSegments = <String>{
      submissionPathSegment.trim().toLowerCase(),
      "submit",
      "submission",
      "submissions",
      "f",
      "form",
      "forms",
    }..removeWhere((item) => item.isEmpty);

    final pathSegments = uri.pathSegments.map((item) => item.trim()).toList();
    for (var index = 0; index < pathSegments.length; index++) {
      final normalized = pathSegments[index].toLowerCase();
      if (!expectedPathSegments.contains(normalized)) {
        continue;
      }

      if (index + 1 < pathSegments.length) {
        final token = pathSegments[index + 1].trim();
        if (token.isNotEmpty) {
          return token;
        }
      }
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    return SecureWidget(
      child: MaterialApp(
        title: BrandConfig.siteName,
        locale: _locale,
        supportedLocales: const <Locale>[Locale("en"), Locale("ar")],
        localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        themeMode: _themeMode,
        theme: ThemeData(
          useMaterial3: true,
          colorSchemeSeed: const Color(0xFF0F172A),
          brightness: Brightness.light,
        ),
        darkTheme: ThemeData(
          useMaterial3: true,
          colorSchemeSeed: const Color(0xFF0F172A),
          brightness: Brightness.dark,
        ),
        home: FutureBuilder(
          future: _startupFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return SplashScreen(
                onToggleTheme: _toggleTheme,
                onLocaleSelected: _setLocaleFromCode,
              );
            }

            final result = snapshot.data!;
            if (result.ok) {
              hideWebSplash();
            }

            if (!result.ok || result.config == null) {
              return StartupErrorScreen(
                errorCode: result.errorCode ?? "unknown",
                onToggleTheme: _toggleTheme,
                onLocaleSelected: _setLocaleFromCode,
                onRetry: _retryStartup,
              );
            }

            final configLocale = result.locale;
            if (!_appliedStartupLocale && configLocale != null) {
              final configured =
                  Locale(configLocale == AppLocale.ar ? "ar" : "en");
              if (_locale != configured) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!mounted) {
                    return;
                  }
                  setState(() {
                    _locale = configured;
                    _appliedStartupLocale = true;
                  });
                });
              } else {
                _appliedStartupLocale = true;
              }
            }

            final scanViewModel = ScanViewModel(
              policy: NavigationPolicy(
                allowedHosts: result.config!.allowedHosts,
                enforceHttps: true,
                allowSubdomains: true,
                blockedPathPrefixes: const <String>["/admin/internal"],
                submissionPathSegment: result.config!.submissionPathSegment,
              ),
            );

            return ScanScreen(
              viewModel: scanViewModel,
              themeMode: _themeMode,
              currentLocale: _locale,
              onToggleTheme: _toggleTheme,
              onLocaleSelected: _setLocaleFromCode,
              onAccepted: (scanResult) {
                final submissionToken =
                    scanResult.submissionToken?.trim().isNotEmpty == true
                        ? scanResult.submissionToken!.trim()
                        : _extractSubmissionTokenFromUri(
                            scanResult.acceptedUri,
                            submissionPathSegment:
                                result.config!.submissionPathSegment,
                          );
                if (submissionToken != null &&
                    submissionToken.trim().isNotEmpty) {
                  Navigator.of(context).push(
                    AppRouter.toNativeSubmission(
                      token: submissionToken,
                      appBaseUrl: result.config!.appBaseUrl,
                      localeCode: _locale.languageCode,
                      apiTimeoutMs: result.config!.apiTimeoutMs,
                      draftAutosaveDebounceMs:
                          result.config!.draftAutosaveDebounceMs,
                      pusherKey: result.config!.pusherKey,
                      pusherCluster: result.config!.pusherCluster,
                      themeMode: _themeMode,
                      currentLocale: _locale,
                      onToggleTheme: _toggleTheme,
                      onLocaleSelected: _setLocaleFromCode,
                    ),
                  );
                  return;
                }

                if (!context.mounted) {
                  return;
                }

                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      _t(MessageKeys.mainSubmissionTokenNotFound),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
