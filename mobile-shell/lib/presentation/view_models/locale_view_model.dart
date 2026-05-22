import "../../domain/entities/mobile_runtime_config.dart";

class LocaleViewModel {
  AppLocale resolve(String? rawLocale, AppLocale fallback) {
    final value = rawLocale?.toLowerCase();
    if (value == "ar") {
      return AppLocale.ar;
    }
    if (value == "en") {
      return AppLocale.en;
    }
    return fallback;
  }
}
