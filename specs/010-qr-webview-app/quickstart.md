# Quickstart: QR Webview Companion App

**Branch**: `main`  
**Spec**: `specs/010-qr-webview-app/spec.md`

## Goal

Implement and verify a companion mobile flow that:
1. scans QR codes,
2. validates destinations with an allowlist policy,
3. opens accepted links in in-app webview,
4. keeps AR/EN string parity,
5. mirrors SCCT branding on launcher and splash,
6. validates runtime configuration at startup.

## Implementation Order

1. **Policy and Configuration Foundations**
   - Define URL allowlist policy contract and startup config schema.
   - Add startup validation with safe-fail localized errors.

2. **QR Scan and Validation Pipeline**
   - Wire scanner capture to payload normalization and policy evaluation.
   - Implement blocked-destination and invalid-scan user messaging.

3. **Webview Session Flow**
   - Open accepted URLs in-app.
   - Support same-session rescan to replace current destination safely.

4. **Localization and RTL/LTR Behavior**
   - Add AR/EN keys for all scanner, error, and startup texts.
   - Validate translation key parity.

5. **Branding and Splash Delivery**
   - Use canonical SCCT name and favicon-derived assets for launcher/splash.
   - Ensure splash-to-interactive transition after startup checks.

## Lightweight Verification (During Implementation)

1. Validate URL policy behavior with accepted and rejected QR samples.
2. Validate startup safe-fail when required config values are missing.
3. Validate AR/EN rendering and key parity for new mobile messages.
4. Validate rescan behavior while webview session is active.
5. Validate camera-permission denied and offline error states.

## Runtime Profile Verification

1. Confirm all profile files exist:
   - `mobile-shell/.env.development`
   - `mobile-shell/.env.staging`
   - `mobile-shell/.env.production`
2. Confirm startup loader reads values from `mobile-shell/lib/config/load_runtime_env.dart`.
3. Confirm validation gate in `mobile-shell/lib/config/runtime_config.dart` blocks invalid ranges and hosts.

## Final Heavy Verification (Late Stage)

Run only after feature implementation is complete:

```bash
npm run lint
npm run build
```

Then run final device-focused checks in the companion mobile shell workspace:
1. Android release build and smoke launch.
2. iOS release build and smoke launch.
3. End-to-end QR to webview navigation checks with production-like config.

## Expected Exit Criteria

1. Valid QR destinations open in-app within success criteria thresholds.
2. Disallowed or malformed destinations are blocked with clear localized messages.
3. All required UI text exists in both Arabic and English.
4. Launcher name, icon, and splash identity match SCCT branding.
5. Startup config issues are detected before user interactions.

## Verification Notes (2026-04-15)

### Web repository checks

1. `npm run lint` -> completed with 0 errors and 1 warning.
2. `npm run build` -> completed successfully.

### Flutter companion checks

1. `flutter analyze` -> no issues found.
2. `flutter test` -> all tests passed.
3. `flutter devices` -> only Windows/Chrome/Edge targets were detected; no Android/iOS runtime target attached.
4. `flutter build apk --debug` -> failed due malformed local Android NDK installation:
   - `C:\Users\ALFA2023\AppData\Local\Android\Sdk\ndk\28.2.13676358` missing `source.properties`.
5. `flutter build ios` is unavailable on this Windows host (iOS build subcommand not provided in current toolchain here).

### Follow-up to complete mobile smoke launches

1. Reinstall or repair Android NDK at `C:\Users\ALFA2023\AppData\Local\Android\Sdk\ndk\28.2.13676358`.
2. Run Android smoke launch with an attached emulator/device from `mobile-shell`.
3. Perform iOS smoke launch from a macOS environment with Xcode toolchain.