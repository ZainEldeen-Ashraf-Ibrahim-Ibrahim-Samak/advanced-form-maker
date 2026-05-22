# Quickstart: Native Submission Screen

## Goal
Replace mobile webview submission with a native token-driven submission screen while preserving backend contract compatibility and validation parity.

## Prerequisites
- Node.js LTS and npm
- Flutter SDK compatible with mobile-shell
- Running backend environment for `/api/submissions/{token}` and `/api/cloudinary/sign`
- Valid submission token for QA

## 1) Install dependencies
Web project:
```powershell
npm install
```

Mobile shell:
```powershell
cd mobile-shell
flutter pub get
```

## 2) Implement feature slices
1. Routing slice: route scanned submission URLs to native submission screen while keeping webview fallback for non-submission URLs.
2. Data slice: mobile API clients for submission GET/POST/PATCH and cloudinary-sign.
3. Validation slice: enforce contact and field validation parity before submit.
4. Draft slice: encrypted token/draft persistence with secure cleanup rules.
5. Media slice: upload state machine; block final submit until required media uploads complete.
6. Conflict slice: send expected version metadata and handle stale-write rejection with refresh/retry UX.
7. Localization slice: add AR/EN keys for all new labels/errors and RTL-safe layout behavior.

## 3) Run during development
Backend checks (fast feedback first):
```powershell
npm run lint
npm test
```

Mobile app:
```powershell
cd mobile-shell
flutter run
```

## 4) Validate acceptance scenarios
1. New submission token opens native screen and submits successfully without webview.
2. Invalid contact/field values are blocked locally with clear field-level errors.
3. Existing draft/needs_rewrite token hydrates prior values and supports successful resubmit.
4. Required media incomplete blocks submit/resubmit until uploads finish.
5. Offline editing works with encrypted local draft; final submit blocked until online.
6. Stale concurrent update returns explicit refresh/retry path (no silent overwrite).
7. Invalid/expired token clears sensitive local session data and shows recovery guidance.

## 5) Final verification gate (late heavy processing)
Run only after implementation is feature-complete:
```powershell
npm run build
npm run lint
npm test
```

For mobile final checks:
```powershell
cd mobile-shell
flutter analyze
flutter test
```

## Rollout recommendation
- Phase rollout with fallback preserved:
  - Native flow for submission URLs.
  - Existing webview fallback for other allowed scanned URLs.
- Monitor submission success, validation block rates, and stale-write conflict telemetry.
