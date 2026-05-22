# Implementation Plan: Native Submission Screen

**Branch**: `main` | **Date**: 2026-04-15 | **Spec**: `/specs/012-native-submission-screen/spec.md`
**Input**: Feature specification from `/specs/012-native-submission-screen/spec.md`

## Summary

Replace the current mobile webview-based submission flow with a native in-app submission screen driven by the existing token API contract. The implementation preserves backend endpoint compatibility (`GET/POST/PATCH /api/submissions/{token}`), ports current validation/business rules into mobile pre-submit checks, adds secure encrypted local draft handling for interruption recovery, blocks final submit/resubmit offline, and introduces stale-write conflict handling with explicit refresh/retry guidance.

## Technical Context

**Language/Version**: TypeScript 5.x (web/API), Dart 3.x (Flutter mobile-shell)  
**Primary Dependencies**: Next.js App Router, Zod, Mongoose, Upstash Redis, Cloudinary signing endpoint, Flutter SDK packages (webview fallback, scanner, secure storage/encrypted persistence to be added)  
**Storage**: MongoDB (server source of truth), Upstash Redis (cache), Cloudinary (media), encrypted local mobile draft/session storage  
**Testing**: `npm test`, `npm run lint`, integration tests under `tests/`; mobile `flutter test` and `flutter analyze`  
**Target Platform**: Next.js server runtime + Flutter Android/iOS companion shell  
**Project Type**: Web application with companion mobile app  
**Performance Goals**: Native submission interactions remain responsive on mobile; no increase in server error rate for submission endpoints; validation blocks invalid payloads before network submit  
**Constraints**: Must preserve existing API contract compatibility, enforce AR/EN localization + RTL, never log sensitive token/draft data, support offline draft editing while blocking final submit offline  
**Scale/Scope**: Single feature replacing one major mobile flow (scan destination -> submit), with updates across mobile presentation/domain/data layers and minor additive backend contract checks for stale writes

## Constitution Check

*Initial Gate (pre-Phase 0):*

- [x] I. Clean Architecture (MVVM) compliance?  
  Planned mobile implementation keeps `domain`, `data`, and `presentation` boundaries and screen-specific view-model orchestration.
- [x] II. Technology Stack Mandate followed?  
  No stack substitution: Next.js/MongoDB/Redis/Cloudinary remain authoritative; mobile-shell remains Flutter companion.
- [x] V. Internationalization (AR/EN) & RTL support planned?  
  Native submission UI will use AR/EN keys and preserve directionality behavior.
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase?  
  Plan prioritizes fast validation loops first, with heavy builds/tests at final gate.

*Post-Design Re-check (after Phase 1):*

- [x] I. Clean Architecture (MVVM) compliance maintained in data model and contracts.
- [x] II. Technology Stack Mandate remains unchanged.
- [x] V. i18n/RTL is explicitly represented in quickstart and contract scope.
- [x] VIII. Quickstart sequences heavy verification only after feature-complete implementation.

## Project Structure

### Documentation (this feature)

```text
specs/012-native-submission-screen/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── submission-token-api.md
│   └── cloudinary-sign-api.md
└── tasks.md                         # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── submissions/[token]/route.ts
│   │   └── cloudinary/sign/route.ts
│   └── [locale]/submit/[token]/page.tsx
├── domain/
│   └── use-cases/client/
├── data/
│   └── repositories/
├── presentation/
│   ├── components/client/submission-form/
│   └── view-models/
└── lib/

mobile-shell/
├── lib/
│   ├── app/
│   ├── config/
│   ├── data/
│   ├── domain/
│   ├── i18n/
│   └── presentation/
│       ├── screens/
│       └── view_models/
├── assets/i18n/
└── test/

tests/
├── e2e/
├── integration/
└── unit/
```

**Structure Decision**: Use the existing web + companion mobile layout. Backend/domain contracts remain in `src`, while the native submission UX and client-side validation/draft behavior are implemented in `mobile-shell/lib` with no new top-level project split.

## Complexity Tracking

No constitutional violations identified. Complexity additions are feature-driven (native UI migration, encrypted draft handling, and stale-write safeguards) and remain within existing architecture constraints.
