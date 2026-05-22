import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:scct_mobile_shell/presentation/screens/native_submission_screen.dart";

void main() {
  testWidgets("NativeSubmissionScreen shows loading state on bootstrap", (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: NativeSubmissionScreen(
          token: "token_123",
          appBaseUrl: Uri.parse("https://example.com"),
          localeCode: "en",
          apiTimeoutMs: 5000,
          draftAutosaveDebounceMs: 250,
          pusherKey: "test_key",
          pusherCluster: "mt1",
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Drain startup timers and async boot work.
    await tester.pump(const Duration(seconds: 2));
  });
}
