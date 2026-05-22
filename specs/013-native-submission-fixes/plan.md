# Implementation Plan: Native Submission Reliability Fixes

**Branch**: `main` (feature dir `013-native-submission-fixes`) | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-native-submission-fixes/spec.md`

## Summary

Close the reliability and parity gaps in the Flutter `mobile-shell` native submission screen: (1) wire the full event set through the app with localized toasts, (2) persist drafts + media queue to local storage for resumption and offline auto-submit, (3) drive validation/regex/formatting from backend-served field definitions identical to the Next.js web client, and (4) replace the current upload flow with a serial (concurrency=1) queue that renders a hosted-asset preview after each upload. Retry (3x backoff), 30-day draft retention, image compression ≤15 MB, and video cap 100 MB are locked by clarifications.

## Technical Context

**Language/Version**: Dart 3.x (Flutter stable) for mobile-shell; Node.js LTS + Next.js (App Router) for backend/web (unchanged).
**Primary Dependencies**: Flutter (mobile-shell), `http`/existing `submission_api_client.dart`, `cloudinary_sign_client.dart`, `shared_preferences` or `hive` for local draft storage, `connectivity_plus` for network state, `fluttertoast`/existing snackbar util for toasts, `image` or `flutter_image_compress` for client-side image compression, `path_provider` for media staging. Backend: existing Next.js API exposing form field definitions (next-intl message keys included).
**Storage**: MongoDB (backend, unchanged); Cloudinary for media (unchanged, signed upload via `cloudinary_sign_client`); device local storage (Hive box or shared_preferences JSON) for drafts, media queue, and submission queue.
**Testing**: `flutter test` for unit/ViewModel tests; existing jest/vitest on backend; shared validation fixture (JSON) exercised by both `flutter test` and the web test runner to prove parity.
**Target Platform**: Android + iOS via Flutter (mobile-shell); web client is existing Next.js app.
**Project Type**: Mobile (Flutter) + existing web/API.
**Performance Goals**: Draft autosave debounced ≤ 500 ms; post-upload preview render ≤ 2 s on 4G (SC-005); UI frame budget 60 fps during upload progress updates.
**Constraints**: Offline-capable submission queue; serial upload concurrency = 1; image payload ≤ 15 MB after client compression; video payload ≤ 100 MB; AR/EN + RTL parity with web messages.
**Scale/Scope**: Single native submission screen, all admin-defined forms; typical form = 10–30 fields, ≤ 10 media items per submission.

## Constitution Check

- [x] I. Clean Architecture (MVVM) compliance — new logic lives in `domain/` (entities, use cases), `data/` (repositories, local storage, upload queue service), `presentation/view_models/native_submission_view_model.dart`; views stay logic-free.
- [x] II. Technology Stack Mandate followed — no stack substitution: backend Next.js/Mongo/Cloudinary/Redis unchanged; mobile-shell remains Flutter (pre-existing project decision for the native shell). Media still goes through Cloudinary signed uploads.
- [x] V. Internationalization (AR/EN) & RTL support planned — toasts and validation messages consume the same next-intl keys via the backend-served field definitions; mobile shell already hosts AR/EN locales.
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase — unit + ViewModel + fixture-parity tests first; full Flutter release builds and cross-device E2E runs only in the final verification phase.

No violations → Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/013-native-submission-fixes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── form-definition.schema.json
│   └── submission-payload.schema.json
└── checklists/requirements.md
```

### Source Code (repository root)

```text
mobile-shell/
└── lib/
    ├── domain/
    │   ├── entities/
    │   │   ├── submission_draft.dart           # new
    │   │   ├── media_upload_item.dart          # new
    │   │   └── submission_event.dart           # new
    │   ├── repositories/
    │   │   ├── draft_repository.dart           # new (interface)
    │   │   ├── submission_queue_repository.dart# new (interface)
    │   │   └── form_definition_repository.dart # new (interface)
    │   └── use_cases/
    │       ├── save_draft.dart                 # new
    │       ├── restore_draft.dart              # new
    │       ├── enqueue_submission.dart         # new
    │       └── run_upload_queue.dart           # new
    ├── data/
    │   ├── services/
    │   │   ├── cloudinary_sign_client.dart     # existing (reused)
    │   │   ├── submission_api_client.dart      # existing (reused)
    │   │   ├── local_draft_store.dart          # new (Hive/shared_prefs)
    │   │   └── upload_queue_service.dart       # new (serial, retry/backoff)
    │   └── repositories/
    │       ├── draft_repository_impl.dart      # new
    │       ├── submission_queue_repository_impl.dart # new
    │       └── form_definition_repository_impl.dart  # new (cached fetch)
    └── presentation/
        ├── view_models/
        │   └── native_submission_view_model.dart   # modified
        └── components/submission/
            ├── contact_records_section.dart         # modified
            ├── field_response_section.dart          # modified
            └── media_upload_section.dart            # modified (preview + queue UI)

src/
├── app/api/forms/[id]/definition/route.ts   # existing/extend: expose canonical field rules + i18n keys
└── lib/validation/                          # shared validation source consumed by web + served to mobile

mobile-shell/test/
├── data/
│   ├── cloudinary_sign_client_test.dart         # existing
│   ├── local_draft_store_test.dart              # new
│   └── upload_queue_service_test.dart           # new (serial + retry)
├── domain/submission_regex_test.dart            # existing
├── view_models/native_submission_view_model_test.dart  # new
└── parity/validation_fixture_test.dart          # new (loads shared JSON fixture)

tests/ (web)
└── validation/validation_fixture.test.ts       # consumes same shared fixture
```

**Structure Decision**: Mobile + API layout. Flutter `mobile-shell` keeps MVVM three-layer split (`domain/`, `data/`, `presentation/`). Backend gains a canonical form-definition endpoint and a shared validation fixture consumed by both web and Flutter tests to enforce parity (FR-006, SC-003).

## Phase 0 — Research (research.md)

Unknowns / decisions to resolve:

1. Local storage engine for drafts + queues (shared_preferences JSON vs Hive vs Isar).
2. Connectivity + background retry strategy (foreground-only vs `workmanager`/`android_alarm_manager_plus` for background submit).
3. Image compression approach (quality/resize targeting ≤15 MB while preserving EXIF orientation).
4. Cloudinary signed upload chunking for videos up to 100 MB on flaky networks.
5. Shape of the backend form-definition contract so the web client can keep consuming it unchanged while mobile can cache it.
6. Shared validation fixture format runnable by both Dart and TS test runners.

Each produces a `Decision / Rationale / Alternatives` entry in `research.md`.

## Phase 1 — Design & Contracts

- `data-model.md`: `SubmissionDraft`, `MediaUploadItem`, `QueuedSubmission`, `FormDefinition`, `FieldDefinition`, `ValidationRule`, `SubmissionEvent` — fields, relationships, state transitions (draft → queued → sending → sent/failed; upload pending → uploading → success/failed with retry count).
- `contracts/form-definition.schema.json`: JSON Schema describing the backend response for `GET /api/forms/:id/definition` (fields, regex, formatter id, i18n message keys, required flag, media limits).
- `contracts/submission-payload.schema.json`: JSON Schema for the submit request body including Cloudinary public IDs per media field.
- `quickstart.md`: steps to run the native submission screen locally, point it at a dev backend, exercise draft restore, offline queue, and upload retry paths.
- Agent context: run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude` to refresh `CLAUDE.md` tech list (Flutter mobile-shell entries).

**Post-design Constitution re-check**: still compliant — no new violations introduced by the design artifacts.

## Complexity Tracking

None — no constitutional deviations requested.
