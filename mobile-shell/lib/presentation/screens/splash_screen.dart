import "package:flutter/material.dart";

import "../../domain/constants/message_keys.dart";
import "../../i18n/index.dart";
import "../components/app_logo.dart";

class SplashScreen extends StatelessWidget {
  const SplashScreen({
    super.key,
    this.onToggleTheme,
    this.onLocaleSelected,
  });

  final VoidCallback? onToggleTheme;
  final ValueChanged<String>? onLocaleSelected;

  String _localeCode(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return code == "ar" ? "ar" : "en";
  }

  String _t(BuildContext context, String key) {
    final locale = _localeCode(context);
    final catalog =
        I18nCatalog.getCached(locale) ?? I18nCatalog.getCached("ar");
    return catalog?.t(key) ?? key;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final localeCode = _localeCode(context);
    final bgStart = isDark ? const Color(0xFF081526) : const Color(0xFFEAF3FB);
    final bgEnd = isDark ? const Color(0xFF123454) : const Color(0xFFDDEAF7);
    final cardColor = isDark ? const Color(0xFF102941) : Colors.white;
    final cardBorder =
        isDark ? const Color(0xFF295374) : const Color(0xFFD3E2F0);
    final titleColor =
        isDark ? const Color(0xFFE5F2FF) : const Color(0xFF102C44);
    final subColor = isDark ? const Color(0xFFB7D0E7) : const Color(0xFF5A7691);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [bgStart, bgEnd],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              if (onToggleTheme != null || onLocaleSelected != null)
                PositionedDirectional(
                  top: 8,
                  end: 12,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (onToggleTheme != null)
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF163852)
                                : const Color(0xFFDCEAF7),
                            shape: BoxShape.circle,
                            border: Border.all(color: cardBorder),
                          ),
                          child: IconButton(
                            tooltip: _t(context, MessageKeys.scanThemeToggle),
                            onPressed: onToggleTheme,
                            iconSize: 18,
                            visualDensity: VisualDensity.compact,
                            icon: Icon(
                              isDark
                                  ? Icons.light_mode_rounded
                                  : Icons.dark_mode_rounded,
                              color: titleColor,
                            ),
                          ),
                        ),
                      if (onToggleTheme != null && onLocaleSelected != null)
                        const SizedBox(width: 8),
                      if (onLocaleSelected != null)
                        PopupMenuButton<String>(
                          tooltip: _t(context, MessageKeys.scanLanguage),
                          initialValue: localeCode,
                          onSelected: onLocaleSelected,
                          itemBuilder: (context) => <PopupMenuEntry<String>>[
                            PopupMenuItem<String>(
                              value: "en",
                              child: Text(
                                _t(context, MessageKeys.commonLanguageEnglish),
                              ),
                            ),
                            PopupMenuItem<String>(
                              value: "ar",
                              child: Text(
                                _t(context, MessageKeys.commonLanguageArabic),
                              ),
                            ),
                          ],
                          child: Container(
                            height: 38,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFF163852)
                                  : const Color(0xFFDCEAF7),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: cardBorder),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.language_rounded,
                                    size: 16, color: titleColor),
                                const SizedBox(width: 6),
                                Text(
                                  localeCode.toUpperCase(),
                                  style: TextStyle(
                                    color: titleColor,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                Icon(Icons.expand_more_rounded,
                                    size: 16, color: titleColor),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              Center(
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.95, end: 1.0),
                  duration: const Duration(milliseconds: 600),
                  builder: (context, scale, child) {
                    return Transform.scale(
                      scale: scale,
                      child: child,
                    );
                  },
                  child: Container(
                    width: 300,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 22, vertical: 24),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: cardBorder),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black
                              .withValues(alpha: isDark ? 0.22 : 0.08),
                          blurRadius: 18,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AppLogo(
                          size: 108,
                          radius: 20,
                          padding: 8,
                          backgroundColor: Colors.white,
                          borderColor: Color(0xFFCBDCEB),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _t(context, MessageKeys.splashTitle),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: titleColor,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _t(context, MessageKeys.splashSubtitle),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: subColor,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: isDark
                                ? const Color(0xFF94C7F0)
                                : const Color(0xFF0B5F91),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
