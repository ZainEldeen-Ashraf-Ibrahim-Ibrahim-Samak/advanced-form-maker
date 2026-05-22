# Quickstart — Native Submission Reliability Fixes

## Prerequisites

- Flutter stable + Dart 3.x
- Node.js LTS for the backend/web
- Cloudinary credentials configured in `src/` env
- Android or iOS simulator / device

## Run the stack

```bash
# 1. Backend + web (from repo root)
npm install
npm run dev

# 2. Mobile shell
cd mobile-shell
flutter pub get
flutter run
```

Point the mobile shell at your local backend via the existing env/config used by `submission_api_client.dart`.

## Verify the four user stories

1. **Events + toasts (US1)**: Submit with an invalid regex field → expect localized validation toast and focus on first invalid field. Submit with valid data → expect success toast.
2. **Draft resumption (US2)**: Fill several fields and attach a photo. Force-stop the app. Relaunch → expect a "Resume submission" prompt and all values restored, including upload statuses.
3. **Validation parity (US3)**: Run `flutter test test/parity/validation_fixture_test.dart` and `npm test -- validation_fixture` — both must pass against the same `tests/shared/validation/validation_fixture.json`.
4. **Serial upload + preview (US4)**: Attach 3 images. Observe exactly one in-flight upload at a time (progress bar), each followed by a hosted-asset thumbnail. Kill Wi-Fi mid-upload to exercise 3x retry + manual retry.

## Offline auto-submit

- Enable airplane mode, tap Submit → expect "Queued" toast and draft marked `queued`.
- Re-enable connectivity → expect automatic send and success/failure toast.

## Test commands

```bash
cd mobile-shell && flutter test
npm test
```
