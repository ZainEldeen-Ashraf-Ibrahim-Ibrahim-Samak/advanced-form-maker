import "../config/load_runtime_env.dart";
import "../config/runtime_config.dart";
import "../domain/entities/mobile_runtime_config.dart";

class BootstrapResult {
  const BootstrapResult({
    required this.ok,
    this.config,
    this.errorCode,
  });

  final bool ok;
  final MobileRuntimeConfig? config;
  final String? errorCode;
}

Future<BootstrapResult> bootstrapApp() async {
  final startedAt = DateTime.now();
  try {
    final input = loadRuntimeEnv();
    final config = RuntimeConfig.validate(input);

    final elapsed = DateTime.now().difference(startedAt).inMilliseconds;
    final remaining = config.splashMinDurationMs - elapsed;
    if (remaining > 0) {
      await Future<void>.delayed(Duration(milliseconds: remaining));
    }

    return BootstrapResult(ok: true, config: config);
  } on RuntimeConfigValidationException catch (e) {
    return BootstrapResult(ok: false, errorCode: e.code);
  }
}
