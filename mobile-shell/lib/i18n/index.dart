import "dart:convert";

import "package:flutter/services.dart" show rootBundle;

class I18nCatalog {
  I18nCatalog(this._messages);

  final Map<String, dynamic> _messages;

  String t(String key) => (_messages[key] ?? key).toString();

  static final Map<String, I18nCatalog> _cache = {};

  static Future<I18nCatalog> load(String locale) async {
    if (_cache.containsKey(locale)) {
      return _cache[locale]!;
    }
    try {
      final raw = await rootBundle.loadString("assets/i18n/$locale.json");
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final catalog = I18nCatalog(decoded);
      _cache[locale] = catalog;
      return catalog;
    } catch (_) {
      final catalog = I18nCatalog({});
      _cache[locale] = catalog;
      return catalog;
    }
  }

  static I18nCatalog? getCached(String locale) {
    return _cache[locale];
  }
}
