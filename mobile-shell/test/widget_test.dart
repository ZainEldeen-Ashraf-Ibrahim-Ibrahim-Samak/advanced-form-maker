import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:scct_mobile_shell/main.dart';

void main() {
  testWidgets('ScctMobileApp renders shell', (WidgetTester tester) async {
    await tester.pumpWidget(const ScctMobileApp());

    expect(find.byType(MaterialApp), findsOneWidget);

    // Advance test time so startup splash delay timer is fully consumed.
    await tester.pump(const Duration(seconds: 2));
  });
}
