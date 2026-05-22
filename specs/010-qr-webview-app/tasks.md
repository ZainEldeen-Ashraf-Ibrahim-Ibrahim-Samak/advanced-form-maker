# Tasks: QR Webview Companion App

**Input**: Design documents from /specs/010-qr-webview-app/  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Dedicated test-first tasks are not included because automated TDD tasks were not explicitly requested in the specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story.

## Format: [ID] [P?] [Story] Description

- [P] indicates tasks that can run in parallel (different files, no direct dependency)
- [Story] is required for user story tasks only (US1, US2, US3)
- Every task includes at least one concrete file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize companion mobile workspace and base runtime wiring.

- [x] T001 Create companion mobile workspace manifest in mobile-shell/pubspec.yaml
- [x] T002 Create Flutter lint and environment templates in mobile-shell/analysis_options.yaml and mobile-shell/.env.example
- [x] T003 [P] Configure Flutter app metadata and platform settings in mobile-shell/pubspec.yaml and mobile-shell/android/ or mobile-shell/ios/
- [x] T004 [P] Create mobile app entry point in mobile-shell/lib/main.dart

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core architecture and contracts required before any user story delivery.

**CRITICAL**: No user story work should start before this phase is complete.

- [x] T005 Create domain entities for scan payload, webview session, and runtime config in mobile-shell/lib/domain/entities/qr_scan_payload.dart, mobile-shell/lib/domain/entities/webview_session.dart, and mobile-shell/lib/domain/entities/mobile_runtime_config.dart
- [x] T006 [P] Implement QR destination policy evaluator from contract in mobile-shell/lib/domain/use_cases/evaluate_qr_destination.dart
- [x] T007 [P] Implement runtime config schema validator from contract in mobile-shell/lib/config/runtime_config.dart
- [x] T008 Create scanner and webview adapter interfaces in mobile-shell/lib/data/adapters/scanner_adapter.dart and mobile-shell/lib/data/adapters/webview_adapter.dart
- [x] T009 [P] Create mobile message key registry for scan and startup errors in mobile-shell/lib/domain/constants/message_keys.dart
- [x] T010 Create app bootstrap pipeline for config validation and splash preconditions in mobile-shell/lib/app/bootstrap.dart
- [x] T011 Configure locale resource loading with fallback behavior in mobile-shell/lib/i18n/index.dart

**Checkpoint**: Foundation complete. User stories can proceed.

---

## Phase 3: User Story 1 - Scan QR and Open Website (Priority: P1)

**Goal**: Users scan a QR code, valid destinations open in-app, and invalid/disallowed destinations are blocked with clear feedback.

**Independent Test**: Scan a valid SCCT QR URL and verify in-app webview navigation; scan malformed and disallowed URLs and verify blocking with error feedback.

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement native QR scanner adapter in mobile-shell/lib/data/adapters/native_qr_scanner.dart
- [x] T013 [P] [US1] Implement native in-app webview adapter in mobile-shell/lib/data/adapters/native_webview.dart
- [x] T014 [US1] Implement scan flow view-model for decode, normalize, and policy validation in mobile-shell/lib/presentation/view_models/scan_view_model.dart
- [x] T015 [US1] Implement scanner screen states and primary scan action in mobile-shell/lib/presentation/screens/scan_screen.dart
- [x] T016 [US1] Wire accepted destination navigation to in-app webview session in mobile-shell/lib/app/router.dart and mobile-shell/lib/main.dart
- [x] T017 [US1] Implement invalid QR and disallowed URL error UI in mobile-shell/lib/presentation/screens/scan_error_sheet.dart
- [x] T018 [US1] Implement same-session rescan destination replacement behavior in mobile-shell/lib/presentation/view_models/webview_session_view_model.dart
- [x] T019 [US1] Implement camera-permission and offline failure handling in mobile-shell/lib/presentation/view_models/scan_view_model.dart

**Checkpoint**: US1 is independently functional and valid QR flows are testable.

---

## Phase 4: User Story 2 - Branded and Localized Experience (Priority: P2)

**Goal**: App branding matches SCCT identity and all relevant UI text is available in Arabic and English.

**Independent Test**: Launch app, verify SCCT name/icon/splash identity, and validate all scanner/startup text in both Arabic and English.

### Implementation for User Story 2

- [x] T020 [P] [US2] Add scanner and startup message keys to English catalog in mobile-shell/assets/i18n/en.json
- [x] T021 [P] [US2] Add scanner and startup message keys to Arabic catalog in mobile-shell/assets/i18n/ar.json
- [x] T022 [US2] Implement locale selection and runtime locale resolution in mobile-shell/lib/presentation/view_models/locale_view_model.dart
- [x] T023 [P] [US2] Create mobile brand config sourced from canonical site naming and icon references in mobile-shell/lib/config/brand_config.dart and src/components/shared/site-name.tsx
- [x] T024 [US2] Apply launcher name and icon branding on Android in mobile-shell/android/app/src/main/AndroidManifest.xml and mobile-shell/android/app/src/main/res
- [x] T025 [US2] Apply app name and icon branding on iOS in mobile-shell/ios/App/App/Info.plist and mobile-shell/ios/App/App/Assets.xcassets
- [x] T026 [US2] Update scan and startup error screens to render localized branded labels in mobile-shell/lib/presentation/screens/scan_screen.dart and mobile-shell/lib/presentation/screens/startup_error_screen.dart

**Checkpoint**: US2 is independently functional with AR/EN parity and consistent SCCT branding.

---

## Phase 5: User Story 3 - Reliable Startup and Configurable Environments (Priority: P3)

**Goal**: Environment-driven startup works safely, splash behavior is reliable, and invalid config fails before user actions.

**Independent Test**: Run different environment profiles and confirm splash-to-scan startup for valid config and safe-fail startup error flow for invalid config.

### Implementation for User Story 3

- [x] T027 [P] [US3] Implement runtime environment loader for required and optional variables in mobile-shell/lib/config/load_runtime_env.dart
- [x] T028 [US3] Implement startup validation error mapping and recovery guidance screen in mobile-shell/lib/presentation/screens/startup_error_screen.dart
- [x] T029 [US3] Implement branded splash screen with minimum-duration gate in mobile-shell/lib/presentation/screens/splash_screen.dart and mobile-shell/lib/app/bootstrap.dart
- [x] T030 [US3] Add deployment environment profiles in mobile-shell/.env.development, mobile-shell/.env.staging, and mobile-shell/.env.production
- [x] T031 [US3] Wire startup coordinator flow from splash to scan-ready state using validated config in mobile-shell/lib/app/startup_coordinator.dart
- [x] T032 [US3] Document environment matrix and startup fail-safe behavior in specs/010-qr-webview-app/contracts/mobile-runtime-config.md and specs/010-qr-webview-app/quickstart.md

**Checkpoint**: US3 is independently functional with validated configuration and safe startup behavior.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Final verification, consistency updates, and heavy-process gate execution.

- [x] T033 [P] Run repository lint checks and capture results in specs/010-qr-webview-app/quickstart.md
- [x] T034 [P] Execute final production web build and capture outcome in specs/010-qr-webview-app/quickstart.md
- [x] T035 Execute Android smoke launch verification and record results in specs/010-qr-webview-app/quickstart.md
- [x] T036 Execute iOS smoke launch verification and record results in specs/010-qr-webview-app/quickstart.md
- [x] T037 [P] Validate QR policy contract example cases against implementation and update notes in specs/010-qr-webview-app/contracts/qr-navigation-policy.md
- [x] T038 Align final research and quickstart documentation with delivered behavior in specs/010-qr-webview-app/research.md and specs/010-qr-webview-app/quickstart.md

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies
- Phase 2 (Foundational): depends on Phase 1 and blocks all user stories
- Phase 3 (US1): depends on Phase 2
- Phase 4 (US2): depends on Phase 2; can run in parallel with US1 if team capacity allows
- Phase 5 (US3): depends on Phase 2; can run in parallel with US1 and US2 if team capacity allows
- Phase 6 (Polish): depends on completion of selected user stories

### User Story Dependencies

- US1 (P1): no dependency on other user stories after foundational work
- US2 (P2): no strict dependency on US1, but can reuse US1 screen wiring
- US3 (P3): no strict dependency on US1/US2, but integrates with shared bootstrap and localization infrastructure

### Heavy Process Staging (Principle VIII)

- All resource-intensive checks (build and device smoke runs) are placed in Phase 6.
- Heavy checks should run only after US1-US3 implementation is stable.

## Parallel Execution Examples

### User Story 1

- T012 and T013 can run in parallel (different adapter files).
- T014 can begin after T012, T013, and T006 are complete.

### User Story 2

- T020 and T021 can run in parallel (separate locale catalogs).
- T024 and T025 can run in parallel (Android and iOS branding updates).

### User Story 3

- T027 and T030 can run in parallel (loader vs environment profile files).
- T028 and T029 can run in parallel, then merge in T031 startup coordinator wiring.

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate US1 independently before expanding scope.

### Incremental Delivery

1. Add US2 for branding and localization parity.
2. Add US3 for startup and environment reliability.
3. Run Phase 6 heavy verification at the end.

### Team Parallelization

1. One developer focuses on adapters and scan flow (US1).
2. One developer focuses on AR/EN and branding surfaces (US2).
3. One developer focuses on startup/configuration reliability (US3).
