import "bootstrap.dart";
import "../domain/entities/mobile_runtime_config.dart";

class StartupCoordinatorResult {
  const StartupCoordinatorResult({
    required this.ok,
    this.config,
    this.errorCode,
    this.locale,
  });

  final bool ok;
  final MobileRuntimeConfig? config;
  final String? errorCode;
  final AppLocale? locale;
}

Future<StartupCoordinatorResult> startupCoordinator() async {
  final bootstrap = await bootstrapApp();
  if (!bootstrap.ok || bootstrap.config == null) {
    return StartupCoordinatorResult(ok: false, errorCode: bootstrap.errorCode);
  }

  return StartupCoordinatorResult(
    ok: true,
    config: bootstrap.config,
    locale: bootstrap.config!.defaultLocale,
  );
}
