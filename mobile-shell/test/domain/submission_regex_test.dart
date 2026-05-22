import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/domain/constants/submission_regex.dart";

void main() {
  test("text regex accepts multi-character text and underscores", () {
    expect(textRegex.hasMatch("Main_Address 12"), isTrue);
    expect(textRegex.hasMatch("شارع_التحرير 10"), isTrue);
  });

  test("phone normalization matches client-side formatting rules", () {
    expect(normalizePhoneNumber("01012345678"), "+201012345678");
    expect(normalizePhoneNumber("201012345678"), "+201012345678");
    expect(normalizePhoneNumber("+20 101 234 5678"), "+201012345678");
    expect(normalizePhoneNumber("٠١٠١٢٣٤٥٦٧٨"), "+201012345678");
    expect(normalizePhoneNumber("۰۱۰۱۲۳۴۵۶۷۸"), "+201012345678");
  });
}
