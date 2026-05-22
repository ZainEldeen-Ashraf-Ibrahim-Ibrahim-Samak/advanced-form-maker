# scct_mobile_shell

Flutter companion app for SCCT scan + submission flow.

## Use root .env.local values in Flutter

This project can generate the Flutter runtime env file from the repository root `.env.local`.

1. From repo root, run:

```bash
npm run mobile:env
```

1. Then run Flutter normally from `mobile-shell`:

```bash
flutter pub get
flutter run
```

The sync command writes `mobile-shell/.env` with only the non-secret keys needed by Flutter runtime config:

- `MOBILE_APP_BASE_URL`
- `MOBILE_ALLOWED_HOSTS`
- `MOBILE_DEFAULT_LOCALE`
- `MOBILE_SUPPORTED_LOCALES`
- `MOBILE_SPLASH_MIN_DURATION_MS`
- `MOBILE_SCAN_TIMEOUT_MS`
- `MOBILE_SUBMISSION_PATH_SEGMENT`
- `MOBILE_API_TIMEOUT_MS`
- `MOBILE_DRAFT_AUTOSAVE_DEBOUNCE_MS`
- `API_ORIGIN`
- `NEXT_PUBLIC_APP_URL`
