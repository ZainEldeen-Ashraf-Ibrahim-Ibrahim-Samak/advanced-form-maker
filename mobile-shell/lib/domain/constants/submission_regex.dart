final RegExp emailRegex = RegExp(r"^[^\s@]+@[^\s@]+\.[^\s@]+$");
final RegExp phoneRegex = RegExp(r"^\+201[0-9]{9}$");
final RegExp nameRegex = RegExp(
    r"^[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\s\-_]+$");
final RegExp textRegex =
    RegExp(r'''^[\u0600-\u06FFa-zA-Z0-9\s.,?!&\-()'"_]+$''');

const Map<String, String> _arabicDigitMap = <String, String>{
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const Map<String, String> _persianDigitMap = <String, String>{
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

String convertArabicNumeralsToEnglish(String value) {
  if (value.isEmpty) {
    return value;
  }

  final buffer = StringBuffer();
  for (final rune in value.runes) {
    final char = String.fromCharCode(rune);
    buffer.write(_arabicDigitMap[char] ?? _persianDigitMap[char] ?? char);
  }

  return buffer.toString();
}

String normalizePhoneNumber(String value) {
  if (value.isEmpty) {
    return value;
  }

  var normalized =
      convertArabicNumeralsToEnglish(value).replaceAll(RegExp(r"[^\d+]"), "");

  if (normalized.startsWith("+20")) {
    return normalized;
  }

  if (normalized.startsWith("20")) {
    return "+$normalized";
  }

  if (normalized.startsWith("01")) {
    return "+20${normalized.substring(1)}";
  }

  if (normalized.startsWith("1")) {
    return "+20$normalized";
  }

  return normalized;
}
