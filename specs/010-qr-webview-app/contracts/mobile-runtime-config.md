# Contract: Mobile Runtime Configuration

## Purpose

Define required startup configuration for the companion mobile shell and how invalid configuration is handled.

## Required Variables

```json
{
  "MOBILE_APP_BASE_URL": "https://scct-damages.vercel.app",
  "MOBILE_ALLOWED_HOSTS": "scct-damages.vercel.app,example.scct.com",
  "MOBILE_DEFAULT_LOCALE": "ar",
  "MOBILE_SUPPORTED_LOCALES": "ar,en",
  "MOBILE_SPLASH_MIN_DURATION_MS": "1200"
}
```

## Optional Variables

```json
{
  "MOBILE_SCAN_TIMEOUT_MS": "10000"
}
```

## Validation Rules

1. `MOBILE_APP_BASE_URL` must be a valid HTTPS URL.
2. `MOBILE_ALLOWED_HOSTS` must parse to at least one valid hostname.
3. Host of `MOBILE_APP_BASE_URL` must appear in `MOBILE_ALLOWED_HOSTS`.
4. `MOBILE_DEFAULT_LOCALE` must be either `ar` or `en`.
5. `MOBILE_SUPPORTED_LOCALES` must include both `ar` and `en`.
6. `MOBILE_SPLASH_MIN_DURATION_MS` must be an integer between 300 and 5000.
7. If provided, `MOBILE_SCAN_TIMEOUT_MS` must be an integer between 1000 and 30000.

## Startup Behavior Contract

When validation passes:
1. App shows branded splash.
2. App initializes scanner and localization state.
3. App transitions to scan-ready state.

When validation fails:
1. App remains in safe startup error state.
2. App displays localized recovery guidance.
3. App does not enter scanner/webview flow.

## Normalized Runtime Object

```json
{
  "appBaseUrl": "https://scct-damages.vercel.app",
  "allowedHosts": ["scct-damages.vercel.app", "example.scct.com"],
  "defaultLocale": "ar",
  "supportedLocales": ["ar", "en"],
  "splashMinDurationMs": 1200,
  "scanTimeoutMs": 10000
}
```

## Error Codes

1. `config_missing`
2. `config_invalid_url`
3. `config_invalid_hosts`
4. `config_invalid_locale`
5. `config_invalid_numeric_range`

Each error code must map to Arabic and English user-facing startup guidance.

## Environment Profiles

Companion Flutter shell now carries deployment profiles at:

1. `mobile-shell/.env.development`
2. `mobile-shell/.env.staging`
3. `mobile-shell/.env.production`

Profile loading contract:

1. The startup coordinator reads runtime values through `mobile-shell/lib/config/load_runtime_env.dart`.
2. Validation is enforced in `mobile-shell/lib/config/runtime_config.dart` before interactive scan state.
3. Any invalid profile value must lead to startup safe-fail screen with localized guidance.