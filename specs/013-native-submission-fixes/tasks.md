# Tasks: Native Submission Reliability Fixes

**Feature dir**: `specs/013-native-submission-fixes`
**Spec**: [spec.md](./spec.md) • **Plan**: [plan.md](./plan.md)

Tests are included where the spec explicitly calls them out (parity fixture SC-003, serial upload verification SC-004, draft resumption SC-002). Otherwise tests are light unit/ViewModel checks.

---

## Phase 1 — Setup

- [X] T001 Add Flutter dependencies (`hive`, `hive_flutter`, `connectivity_plus`, `flutter_image_compress`, `path_provider`, `uuid`) to `mobile-shell/pubspec.yaml` and run `flutter pub get`.
- [X] T002 [P] Register Hive type adapters entry point in `mobile-shell/lib/main.dart` (init Hive, open boxes `drafts`, `submission_queue`, `form_definitions`).
- [X] T003 [P] Create shared validation fixture skeleton at `tests/shared/validation/validation_fixture.json` with ≥50 cases covering phone, nationalId, date, numeric, regex-required, and trimmed-text fields.

## Phase 1b — API + Cloudinary parity audit (blocks US1/US2/US4)

**Goal**: Close three gaps flagged by the user: (a) backend endpoints consumed by mobile diverge from the web client's endpoints, (b) Flutter app does not register the full event set the web client emits, (c) upload endpoint + Cloudinary folder/preset used by mobile does not match web.

- [X] T003a Audit every endpoint called from `mobile-shell/lib/data/services/submission_api_client.dart` and `cloudinary_sign_client.dart` against the web client's calls in `src/` (forms list, form definition, submission create, media sign). Produce `specs/013-native-submission-fixes/endpoint-parity.md` listing URL, method, headers, body, and divergences.
- [X] T003b Align mobile HTTP calls with the canonical web endpoints in `mobile-shell/lib/data/services/submission_api_client.dart`: identical paths, query params, auth headers, and request/response shape (per `contracts/submission-payload.schema.json`). Remove or deprecate any mobile-only endpoint.
- [X] T003c Enumerate the full event set emitted by the web client (grep `src/` for toast/event dispatches) and record the canonical list in `specs/013-native-submission-fixes/event-catalog.md` with name + messageKey + trigger.
- [X] T003d Register every catalog event in `mobile-shell/lib/domain/entities/submission_event.dart` and ensure no web event is missing on mobile; add a Dart test asserting the mobile enum is a superset of the catalog.
- [X] T003e Align upload endpoint + Cloudinary config in `mobile-shell/lib/data/services/cloudinary_sign_client.dart` with the web client: same signed-upload route in `src/app/api/cloudinary/sign/route.ts`, same `upload_preset`, same target folder (e.g. `submissions/<formId>/<draftId>/`), same eager transformations, same `resource_type` per field type.
- [X] T003f Update the backend sign route `src/app/api/cloudinary/sign/route.ts` (and any folder-policy helper in `src/lib/cloudinary/`) so folder/preset are derived from a single shared function consumed by both web and mobile signing paths.
- [X] T003g Parity test: `mobile-shell/test/data/cloudinary_sign_client_test.dart` asserts the signed params (folder, preset, resource_type) match fixtures generated from the web client for the same inputs.

## Phase 2 — Foundational (blocks all stories)

- [X] T004 Define domain entities in `mobile-shell/lib/domain/entities/`: `submission_draft.dart`, `media_upload_item.dart`, `submission_event.dart`, `form_definition.dart`, `field_definition.dart`, `queued_submission.dart` (match schemas in `contracts/`).
- [X] T005 [P] Define repository interfaces in `mobile-shell/lib/domain/repositories/`: `draft_repository.dart`, `submission_queue_repository.dart`, `form_definition_repository.dart`.
- [X] T006 [P] Add event bus / stream controller in `mobile-shell/lib/domain/services/submission_event_bus.dart` emitting `SubmissionEvent`s consumed by UI toast listener.
- [X] T007 Implement localized toast listener in `mobile-shell/lib/presentation/components/submission/submission_toast_host.dart` that subscribes to the event bus and resolves `messageKey` via existing i18n (AR/EN, RTL-aware).
- [X] T008 [P] Extend backend endpoint `src/app/api/forms/[id]/definition/route.ts` to return the canonical `FormDefinition` shape from `contracts/form-definition.schema.json` (regex, formatterId, messageKeys, mediaLimits). Validate response against the schema in `src/lib/validation/`.
- [X] T009 [P] Implement `FormDefinitionRepositoryImpl` in `mobile-shell/lib/data/repositories/form_definition_repository_impl.dart` with HTTP fetch + Hive cache + refresh-on-reconnect.

## Phase 3 — User Story 1: Events & toasts parity (P1)

**Goal**: Every submission-related event produces a visible localized toast + UI state change.
**Independent test**: Trigger each event in the native screen; confirm toast text matches the web catalog and UI updates (SC-001 = 100% coverage).

- [X] T010 [US1] Enumerate all event names in `mobile-shell/lib/domain/entities/submission_event.dart` to match the web client set (validation_failed, submit_started/success/failed, upload_started/progress/success/failed, draft_saved/restored/discarded, queue_online_resume).
- [X] T011 [US1] Emit events from `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart` at every state transition (validation, submit, upload lifecycle).
- [X] T012 [P] [US1] Wire `SubmissionToastHost` into the root scaffold of the native submission screen in `mobile-shell/lib/presentation/components/submission/field_response_section.dart` parent page.
- [ ] T013 [P] [US1] Map each event `messageKey` to AR/EN entries in `src/messages/ar.json` and `src/messages/en.json`; sync to mobile-shell translation bundles.
- [ ] T014 [US1] Unit test event emission in `mobile-shell/test/view_models/native_submission_view_model_test.dart` asserting one event per transition and correct messageKey.

## Phase 4 — User Story 2: Draft persistence & resumption (P1)

**Goal**: Force-kill recovers 100% of entered values + media references; offline submit auto-sends on reconnect.
**Independent test**: Fill form, kill app, reopen → restore prompt + values (SC-002). Airplane-mode submit → auto-send on reconnect.

- [ ] T015 [US2] Implement `LocalDraftStore` in `mobile-shell/lib/data/services/local_draft_store.dart` (Hive-backed CRUD + 30-day TTL sweep).
- [ ] T016 [US2] Implement `DraftRepositoryImpl` in `mobile-shell/lib/data/repositories/draft_repository_impl.dart` using `LocalDraftStore`.
- [ ] T017 [P] [US2] Implement use cases `save_draft.dart`, `restore_draft.dart`, `discard_draft.dart` in `mobile-shell/lib/domain/use_cases/`.
- [ ] T018 [US2] Debounced autosave (≤500 ms) in `native_submission_view_model.dart` calling `SaveDraft` on every field change; emits `draft_saved`.
- [ ] T019 [US2] On app launch in `mobile-shell/lib/main.dart`, check for unsent drafts and route to a "Resume submission" dialog emitting `draft_restored` or `draft_discarded`.
- [ ] T020 [US2] Implement `SubmissionQueueRepositoryImpl` + foreground worker in `mobile-shell/lib/data/services/submission_queue_worker.dart` using `connectivity_plus` to auto-send queued submissions on reconnect (emits `queue_online_resume`, `submit_success`, `submit_failed`).
- [ ] T021 [US2] Clear draft only on server-confirmed success; keep draft on failure. Enforce 30-day auto-discard with user notice on next launch in `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`.
- [ ] T022 [P] [US2] Tests in `mobile-shell/test/data/local_draft_store_test.dart` for save/restore/discard + TTL sweep; test in `mobile-shell/test/data/submission_queue_worker_test.dart` for reconnect-triggered send.

## Phase 5 — User Story 3: Validation / regex / formatting parity (P1)

**Goal**: 0 divergences between web and native on the shared validation fixture (SC-003).
**Independent test**: Both `flutter test test/parity/validation_fixture_test.dart` and `npm test -- validation_fixture` pass against `tests/shared/validation/validation_fixture.json`.

- [ ] T023 [US3] Implement validator + formatter engine in `mobile-shell/lib/domain/services/field_validator.dart` and `field_formatter.dart` driven by `FieldDefinition` (regex, formatterId enum).
- [ ] T024 [US3] Wire the engine into `mobile-shell/lib/presentation/components/submission/field_response_section.dart` to run on input (as-you-type formatting) and on submit.
- [ ] T025 [P] [US3] Update `mobile-shell/lib/domain/constants/submission_regex.dart` to read patterns from fetched `FormDefinition` instead of hardcoded values (fallback to cached copy when offline).
- [ ] T026 [P] [US3] Add web-side parity test `tests/validation/validation_fixture.test.ts` loading the shared fixture and asserting web validator output.
- [ ] T027 [US3] Add Dart parity test `mobile-shell/test/parity/validation_fixture_test.dart` loading the same fixture and asserting identical valid/formatted/messageKey output.
- [ ] T028 [US3] Ensure server-side validation in `src/app/api/...` uses the same canonical definitions so backend rejects what client rejects.

## Phase 6 — User Story 4: Serial uploads + hosted preview (P1)

**Goal**: Exactly one upload in flight at a time; each success shows a hosted-asset thumbnail within 2 s (SC-004, SC-005).
**Independent test**: Attach 3 files → sequential progress bars; each completes with a visible remote thumbnail. Fail network mid-upload → 3 auto-retries with backoff, then manual retry.

- [ ] T029 [US4] Implement `UploadQueueService` (concurrency=1, FIFO) in `mobile-shell/lib/data/services/upload_queue_service.dart` using `cloudinary_sign_client.dart`; expose progress stream per item.
- [ ] T030 [US4] Add chunked upload support (6 MB chunks, resumable on retry) for videos in `mobile-shell/lib/data/services/cloudinary_sign_client.dart`.
- [ ] T031 [P] [US4] Image client-side compression in `mobile-shell/lib/data/services/image_compressor.dart` using `flutter_image_compress` (quality ramp 85→60, max 2560 px, ≤15 MB cap, preserve EXIF orientation).
- [ ] T032 [US4] File selection guardrails in `mobile-shell/lib/presentation/components/submission/media_upload_section.dart`: reject unsupported MIME or oversize (image >15 MB post-compress / video >100 MB) with localized toast before enqueue.
- [ ] T033 [US4] Render hosted-asset thumbnail from `hostedUrl` in `media_upload_section.dart` after each success; show per-item progress, retry, and remove controls.
- [ ] T034 [US4] Retry policy in `UploadQueueService`: auto-retry up to 3 with exponential backoff, then mark `failed`; expose manual retry. Block submit while any required field has non-`success` items (FR-011a).
- [ ] T035 [P] [US4] Tests in `mobile-shell/test/data/upload_queue_service_test.dart` asserting: max 1 concurrent upload under a 10-file queue (SC-004), 3x retry with backoff, manual retry resumes from failed state.

## Phase 7 — Polish & cross-cutting

- [ ] T036 [P] Telemetry: route `SubmissionEvent`s through the existing devlogger in `mobile-shell/lib/core/logging/` (no `print`/`console.log`).
- [ ] T037 [P] Verify AR/EN + RTL rendering for all new toasts and dialogs on the native submission screen.
- [ ] T038 [P] Update `mobile-shell/test/domain/submission_regex_test.dart` to load regexes from the form-definition fixture instead of hardcoded values.
- [ ] T039 Run `flutter analyze` and `npm run lint` with zero warnings (constitution zero-warning policy).
- [ ] T040 Final heavy-stage verification: `cd mobile-shell && flutter test`, `npm test`, then release build `flutter build apk --release` and `npm run build` (deferred per Principle VIII).

---

## Dependencies

- Phase 1 → Phase 1b → Phase 2 → Phases 3–6 (user stories) → Phase 7.
- Phase 1b (endpoint/event/upload parity) MUST complete before US1 (needs full event catalog), US2 (needs aligned submit endpoint), and US4 (needs aligned Cloudinary folder/preset).
- Within user stories: US1, US2, US3, US4 are independent after Phase 2 completes and can be implemented in parallel by separate contributors.
- US2 requires T008/T009 (form definition fetch) for draft schema alignment.
- US4 requires T008 (mediaLimits from backend) and T006 (event bus) for progress events.

## Parallel execution examples

- After Phase 2: start T010+T015+T023+T029 in parallel (one per user story).
- Within US2: T017 and T022 parallel with T015/T016/T020 sequential core.
- Within US4: T031 parallel with T029/T030 sequential core; T035 after T029+T034.

## MVP scope

- MVP = Phase 1 + Phase 2 + **User Story 1 (events & toasts)**. Ships immediate visible feedback while US2–US4 land in subsequent increments.

## Task summary

- Total tasks: 40
- Setup: 3 • Foundational: 6 • US1: 5 • US2: 8 • US3: 6 • US4: 7 • Polish: 5
- Parallel markers `[P]`: 14
