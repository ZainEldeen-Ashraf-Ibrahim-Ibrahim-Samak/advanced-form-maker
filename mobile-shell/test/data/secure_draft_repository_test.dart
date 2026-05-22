import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/data/repositories/secure_draft_repository.dart";

void main() {
  test("tokenRefFor returns deterministic obfuscated references", () async {
    const token = "super-sensitive-token";

    final first = await SecureDraftRepository.tokenRefFor(token);
    final second = await SecureDraftRepository.tokenRefFor(token);

    expect(first, equals(second));
    expect(first, isNot(token));
    expect(first.contains(token), isFalse);
  });
}
