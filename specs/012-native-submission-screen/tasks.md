# Tasks: Native Submission Screen

**Input**: Design documents from `/specs/012-native-submission-screen/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include web integration tests and Flutter unit/widget tests because the feature spec defines mandatory user scenarios and acceptance validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared dependencies and scaffolding for native submission implementation.

- [ ] T001 Add secure storage, encrypted local persistence, connectivity, and HTTP dependencies in `mobile-shell/pubspec.yaml`
- [ ] T002 Add native submission configuration constants and environment parsing updates in `mobile-shell/lib/config/runtime_config.dart` and `mobile-shell/lib/domain/entities/mobile_runtime_config.dart`
- [ ] T003 [P] Add native submission message-key scaffolding in `mobile-shell/lib/domain/constants/message_keys.dart`, `mobile-shell/assets/i18n/en.json`, and `mobile-shell/assets/i18n/ar.json`
- [ ] T004 [P] Extend baseline API integration test scaffolding for token submission scenarios in `tests/integration/api/submissions.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core mobile submission architecture that MUST be complete before ANY user story can be implemented.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create submission domain entities from the feature data model in `mobile-shell/lib/domain/entities/submission_session.dart`, `mobile-shell/lib/domain/entities/local_draft.dart`, `mobile-shell/lib/domain/entities/contact_record.dart`, `mobile-shell/lib/domain/entities/field_response.dart`, `mobile-shell/lib/domain/entities/media_upload_item.dart`, and `mobile-shell/lib/domain/entities/submission_outcome.dart`
- [ ] T006 [P] Implement secure token and encrypted draft storage adapters in `mobile-shell/lib/data/adapters/secure_storage_adapter.dart` and `mobile-shell/lib/data/adapters/encrypted_draft_store.dart`
- [ ] T007 [P] Implement submission/cloudinary API clients and DTO mapping in `mobile-shell/lib/data/services/submission_api_client.dart`, `mobile-shell/lib/data/services/cloudinary_sign_client.dart`, and `mobile-shell/lib/data/mappers/submission_mapper.dart`
- [ ] T008 Implement submission repository contracts and implementation in `mobile-shell/lib/domain/repositories/submission_repository.dart` and `mobile-shell/lib/data/repositories/submission_repository_impl.dart`
- [ ] T009 [P] Implement connectivity status adapter/service for offline gating in `mobile-shell/lib/data/adapters/connectivity_adapter.dart` and `mobile-shell/lib/domain/services/connectivity_service.dart`
- [ ] T010 Add scan destination classification for submission vs generic web URLs in `mobile-shell/lib/domain/use_cases/evaluate_qr_destination.dart` and `mobile-shell/lib/domain/entities/qr_scan_payload.dart`
- [ ] T011 Wire app routing for native submission destination with webview fallback in `mobile-shell/lib/app/router.dart`, `mobile-shell/lib/presentation/view_models/scan_view_model.dart`, and `mobile-shell/lib/main.dart`

**Checkpoint**: Foundation ready. User stories can now be implemented.

---

## Phase 3: User Story 1 - Complete Submission In-App (Priority: P1) MVP

**Goal**: Users open a valid token and complete full submission in a native screen without entering webview.

**Independent Test**: Open a valid submission token in the mobile app, load native form context, fill required values, upload required media, submit successfully, and see success state without navigating to embedded web.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add domain tests for submission-context mapping and request payload building in `mobile-shell/test/domain/submission_payload_builder_test.dart`
- [ ] T013 [P] [US1] Add widget test for native submission happy path in `mobile-shell/test/presentation/native_submission_screen_test.dart`
- [ ] T014 [P] [US1] Add integration test for POST `/api/submissions/{token}` contract compatibility in `tests/integration/api/submissions.test.ts`

### Implementation for User Story 1

- [ ] T015 [US1] Implement native submission orchestration view model in `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T016 [P] [US1] Build native submission screen layout and state wiring in `mobile-shell/lib/presentation/screens/native_submission_screen.dart`
- [ ] T017 [P] [US1] Implement reusable contact and field-response sections in `mobile-shell/lib/presentation/components/submission/contact_records_section.dart` and `mobile-shell/lib/presentation/components/submission/field_response_section.dart`
- [ ] T018 [US1] Implement token context hydration from GET `/api/submissions/{token}` in `mobile-shell/lib/data/repositories/submission_repository_impl.dart` and `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T019 [US1] Implement submit-new flow to POST `/api/submissions/{token}` with success and terminal error handling in `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T020 [US1] Route accepted submission URLs to native submission screen while preserving webview for non-submission links in `mobile-shell/lib/presentation/view_models/scan_view_model.dart` and `mobile-shell/lib/main.dart`
- [ ] T021 [US1] Implement Cloudinary signed upload integration and media-reference mapping in `mobile-shell/lib/presentation/components/submission/media_upload_section.dart` and `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T022 [US1] Add localized native submission labels, buttons, and success copy in `mobile-shell/assets/i18n/en.json` and `mobile-shell/assets/i18n/ar.json`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Validate Input Before Submit (Priority: P2)

**Goal**: Users get immediate field-level validation feedback (including regex-based checks) before network submit.

**Independent Test**: Enter invalid contact and field values, confirm field-specific errors block submit; correct values and confirm submit becomes available.

### Tests for User Story 2

- [ ] T023 [P] [US2] Add unit tests for contact and field validation parity rules in `mobile-shell/test/domain/submission_validation_test.dart`
- [ ] T024 [P] [US2] Add widget test for field-level validation error rendering and submit blocking in `mobile-shell/test/presentation/native_submission_validation_test.dart`
- [ ] T025 [P] [US2] Add integration tests for `VALIDATION_ERROR` and `SUBMISSION_INVALID` responses in `tests/integration/api/submissions.test.ts`

### Implementation for User Story 2

- [ ] T026 [US2] Implement regex constants matching current web constraints in `mobile-shell/lib/domain/constants/submission_regex.dart` using parity with `src/constants/constants.ts`
- [ ] T027 [US2] Implement contact validation rules (required minimum, duplicate/empty rejection, regex checks) in `mobile-shell/lib/domain/use_cases/validate_submission_draft.dart`
- [ ] T028 [US2] Implement field required, option constraint, and regexType validation before submit in `mobile-shell/lib/domain/use_cases/validate_submission_draft.dart` and `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T029 [US2] Render localized field-level validation states and actionable error copy in `mobile-shell/lib/presentation/screens/native_submission_screen.dart` and `mobile-shell/lib/presentation/components/submission/field_response_section.dart`
- [ ] T030 [US2] Block final submit until required media uploads are completed with valid references in `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart` and `mobile-shell/lib/presentation/components/submission/media_upload_section.dart`

**Checkpoint**: User Story 2 is functional and independently testable.

---

## Phase 5: User Story 3 - Resubmit and Recover Drafts (Priority: P3)

**Goal**: Users can resume encrypted drafts, resubmit editable sessions, and recover safely under offline/conflict conditions.

**Independent Test**: Load an editable token with prior values, edit while interrupted/offline, restore encrypted draft, reconnect, resubmit successfully, and handle stale-write conflicts with explicit refresh/retry guidance.

### Tests for User Story 3

- [ ] T031 [P] [US3] Add tests for encrypted draft save/restore/clear lifecycle in `mobile-shell/test/data/secure_draft_repository_test.dart`
- [ ] T032 [P] [US3] Add widget test for existing-submission hydration and PATCH resubmit flow in `mobile-shell/test/presentation/native_submission_resubmit_test.dart`
- [ ] T033 [P] [US3] Add integration tests for stale-write conflict handling on PATCH in `tests/integration/api/submissions.test.ts`

### Implementation for User Story 3

- [ ] T034 [US3] Implement PATCH resubmit request path and editable session hydration in `mobile-shell/lib/data/services/submission_api_client.dart` and `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T035 [US3] Implement encrypted autosave/restore keyed by submission token reference in `mobile-shell/lib/data/repositories/secure_draft_repository.dart` and `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T036 [US3] Implement offline editing allowance and submit/resubmit online-only gating in `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart` and `mobile-shell/lib/presentation/components/submission/offline_banner.dart`
- [ ] T037 [US3] Send stale-write precondition headers and handle `409 STALE_*` responses with refresh/retry UX in `mobile-shell/lib/data/services/submission_api_client.dart` and `mobile-shell/lib/presentation/screens/native_submission_screen.dart`
- [ ] T038 [US3] Implement backend stale-write checks for `If-Match-Form-Version` and `If-Match-Submission-Updated-At` in `src/app/api/submissions/[token]/route.ts` and `src/domain/use-cases/client/submit-form.ts`
- [ ] T039 [US3] Clear secure token/draft data on success, invalid token, expired token, and ineligible session outcomes in `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart` and `mobile-shell/lib/data/repositories/secure_draft_repository.dart`
- [ ] T040 [US3] Add localized recovery and retry guidance for invalid token, unauthorized access, and stale conflict states in `mobile-shell/assets/i18n/en.json` and `mobile-shell/assets/i18n/ar.json`

**Checkpoint**: User Story 3 is functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Harden feature behavior across stories and execute final verification.

- [ ] T041 [P] Redact or remove token/sensitive draft logging paths in `src/app/api/submissions/[token]/route.ts` and `mobile-shell/lib/presentation/view_models/native_submission_view_model.dart`
- [ ] T042 [P] Update rollout and implementation documentation in `specs/012-native-submission-screen/quickstart.md` and `mobile-shell/README.md`
- [ ] T043 Execute quickstart acceptance checklist end-to-end from `specs/012-native-submission-screen/quickstart.md`
- [ ] T044 Execute full web verification commands defined in `package.json` (`npm run lint`, `npm test`, `npm run build`)
- [ ] T045 Execute full mobile verification commands defined in `mobile-shell/pubspec.yaml` context (`flutter analyze`, `flutter test`, `flutter build apk`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies, can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2 completion.
- **Phase 4 (US2)**: Depends on Phase 2 completion; can run after or alongside US1 once shared UX scaffolding exists.
- **Phase 5 (US3)**: Depends on Phase 2 completion and should follow US1 API/hydration foundations.
- **Phase 6 (Polish)**: Depends on completion of all selected user stories.

### User Story Dependencies

- **US1 (P1)**: Starts immediately after Foundational phase; no story-level dependency.
- **US2 (P2)**: Starts after Foundational phase; can progress independently while integrating US1 UI/view-model hooks.
- **US3 (P3)**: Starts after Foundational phase; depends on US1 repository/view-model flow for resubmit extension.

### Within Each User Story

- Tests first (expected to fail before implementation).
- Domain validation/mapping before view-model orchestration.
- View-model orchestration before final UI wiring.
- Story-level checkpoint validation before progressing.

### Parallel Opportunities

- Setup tasks marked **[P]** can run concurrently.
- Foundational tasks **T006**, **T007**, and **T009** can run in parallel.
- In US1, tests **T012-T014** and UI component tasks **T016-T017** can run in parallel.
- In US2, tests **T023-T025** can run in parallel with implementation split between validator and UI tasks.
- In US3, tests **T031-T033** can run in parallel with independent implementation slices for storage, conflict handling, and UX messaging.
- Polish tasks **T041-T042** can run concurrently before final verification tasks.

---

## Parallel Example: User Story 1

```bash
# Parallel test work
T012 [US1] mobile-shell/test/domain/submission_payload_builder_test.dart
T013 [US1] mobile-shell/test/presentation/native_submission_screen_test.dart
T014 [US1] tests/integration/api/submissions.test.ts

# Parallel UI component work
T016 [US1] mobile-shell/lib/presentation/screens/native_submission_screen.dart
T017 [US1] mobile-shell/lib/presentation/components/submission/contact_records_section.dart
```

## Parallel Example: User Story 2

```bash
# Parallel validation tests
T023 [US2] mobile-shell/test/domain/submission_validation_test.dart
T024 [US2] mobile-shell/test/presentation/native_submission_validation_test.dart
T025 [US2] tests/integration/api/submissions.test.ts

# Parallel implementation split
T026 [US2] mobile-shell/lib/domain/constants/submission_regex.dart
T029 [US2] mobile-shell/lib/presentation/screens/native_submission_screen.dart
```

## Parallel Example: User Story 3

```bash
# Parallel resiliency tests
T031 [US3] mobile-shell/test/data/secure_draft_repository_test.dart
T032 [US3] mobile-shell/test/presentation/native_submission_resubmit_test.dart
T033 [US3] tests/integration/api/submissions.test.ts

# Parallel implementation split
T035 [US3] mobile-shell/lib/data/repositories/secure_draft_repository.dart
T037 [US3] mobile-shell/lib/data/services/submission_api_client.dart
T040 [US3] mobile-shell/assets/i18n/en.json
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1).
4. Validate US1 independently on a real token flow before expanding scope.

### Incremental Delivery

1. Deliver US1 for native in-app submission completion.
2. Deliver US2 for validation parity and field-level error quality.
3. Deliver US3 for encrypted recovery, offline continuity, and stale-write safeguards.
4. Run Phase 6 hardening and full verification before release.

### Parallel Team Strategy

1. Team aligns on Setup + Foundational phases.
2. After Phase 2:
   - Engineer A leads US1 flow and routing.
   - Engineer B leads US2 validator parity and UX error states.
   - Engineer C leads US3 draft persistence and conflict/offline resilience.
3. Rejoin for Phase 6 integration hardening and final verification.

---

## Notes

- Tasks marked **[P]** touch independent files and can be executed concurrently.
- Story labels (**[US1]**, **[US2]**, **[US3]**) ensure traceability to spec priorities.
- Preserve backend API contract compatibility while adding stale-write guards as backward-compatible headers.
- Avoid logging raw token and sensitive draft values at every layer.
- Keep webview fallback available for non-submission QR destinations during rollout.
