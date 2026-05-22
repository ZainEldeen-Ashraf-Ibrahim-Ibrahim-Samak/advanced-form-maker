---
description: "Task list for System Data Management implementation"
---

# Tasks: System Data Management

**Input**: Design documents from `/specs/011-system-data-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/api.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and base configuration for new dependencies.

- [x] T001 Install `xlsx` package and types in `package.json`
- [x] T002 [P] Create empty API route file `src/app/api/cron/system-cleanup/route.ts`
- [x] T003 [P] Create empty API route file `src/app/api/admin/system/backup/route.ts`
- [x] T004 [P] Create empty API route file `src/app/api/admin/system/export/route.ts`
- [x] T005 [P] Create empty API route file `src/app/api/admin/analytics/cloudinary-usage/route.ts`
- [x] T006 Update `src/data/models/Settings.ts` to include `draft_retention_days`, `cloudinary_storage_threshold`, and `storage_cleanup_target`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Implement Settings repository updates in `src/data/repositories/MongoSettingsRepository.ts` to support the new fields.
- [x] T008 Update the Settings ViewModel in `src/domain/viewmodels/SettingsViewModel.ts` to expose the new fields to the UI.
- [x] T009 Update `src/app/(admin)/settings/page.tsx` to include UI form fields for Draft Auto-Delete Days, Cloudinary Storage Threshold, and Storage Cleanup Target.

**Checkpoint**: Foundation ready - Admin can now save the necessary configurations.

---

## Phase 3: User Story 1 - Configurable Draft Auto-Deletion (Priority: P1) 🎯 MVP

**Goal**: Automatically delete old drafts after a specified number of days to manage storage.

**Independent Test**: Can be tested by setting a retention period in the settings page, creating a draft, advancing the system time (or waiting), and verifying the draft is automatically removed while the setting persists correctly.

### Implementation for User Story 1

- [x] T010 [US1] Create `src/domain/repositories/DraftRepository.ts` interface with `deleteDraftsOlderThan(date: Date)` method (if not exists).
- [x] T011 [US1] Implement `deleteDraftsOlderThan` in `src/data/repositories/MongoDraftRepository.ts`.
- [x] T012 [US1] Implement `src/app/api/cron/system-cleanup/route.ts` to securely verify `CRON_SECRET` bearer token.
- [x] T013 [US1] Update `src/app/api/cron/system-cleanup/route.ts` to fetch `Settings` and execute draft deletion if `draft_retention_days` > 0.

**Checkpoint**: At this point, the cron job can successfully clean up old drafts based on the settings.

---

## Phase 4: User Story 2 - Comprehensive System Backup and Restore (Priority: P1)

**Goal**: Back up all system models reliably and restore the system from a previous backup directly from the Settings page.

**Independent Test**: Can be tested by creating data across all models, generating a backup, modifying/deleting data, and using the restore function on the Settings page to successfully return the system to the exact backed-up state.

### Implementation for User Story 2

- [x] T014 [US2] Create abstract `SystemRepository` in `src/domain/repositories/system-repository.ts` with `generateBackup()` and `restoreBackup(data)` methods.
- [x] T015 [US2] Implement `MongoSystemRepository` in `src/data/repositories/mongo-system-repository.ts` using `mongoose.modelNames()` to dynamically discover and serialize all collections for backup.
- [x] T016 [US2] Implement transaction-based `restoreBackup` logic in `MongoSystemRepository.ts` using `deleteMany` and `insertMany`.
- [x] T017 [US2] Implement GET handler in `src/app/api/admin/system/backup/route.ts` to trigger and return the backup JSON artifact.
- [x] T018 [US2] Implement POST handler in `src/app/api/admin/system/backup/route.ts` (or restore route) to process uploaded multipart JSON artifacts.
- [x] T019 [US2] Update `src/app/(admin)/settings/page.tsx` UI to include "Download Backup" button and "Upload & Restore Backup" file input.

**Checkpoint**: Admins can now download full system state and safely restore it via the UI.

---

## Phase 5: User Story 3 - Reliable Data Export (Priority: P2)

**Goal**: Export system data to XLSX, ensuring that the export process correctly handles transaction keys and includes all values.

**Independent Test**: Can be tested by generating an export for a table containing transaction keys and verifying the output file contains all expected columns and rows without errors.

### Implementation for User Story 3

- [x] T020 [US3] Create utility `src/lib/utils/exportUtils.ts` with a recursive object flattening function `flattenNestedData()`.
- [x] T021 [US3] Update `src/app/api/admin/system/export/route.ts` to utilize `flattenNestedData()` before passing data to `xlsx.utils.json_to_sheet`.
- [x] T022 [US3] Ensure `exportUtils.ts` handles Map structures and translation JSON objects properly (extracting default locale or stringifying).

**Checkpoint**: Data exports now succeed even with complex i18n keys or Maps.

---

## Phase 6: User Story 4 - Cloudinary Storage Analytics and Auto-Cleanup (Priority: P2)

**Goal**: View Cloudinary media storage usage on the dashboard and automatically delete target media when the threshold is reached.

**Independent Test**: Can be tested by viewing the dashboard analytics widget for accurate Cloudinary usage, and verifying the cron job deletes Cloudinary media files (leaving DB records intact) when the threshold is exceeded.

### Implementation for User Story 4

- [x] T023 [US4] Create abstract `StorageRepository` in `src/domain/repositories/storage-repository.ts` with `getUsageMetrics()` and `deleteMediaByTarget(target)`.
- [x] T024 [US4] Implement `CloudinaryStorageRepository` in `src/data/repositories/cloudinary-storage-repository.ts` utilizing `cloudinary.v2.api.usage()` and `cloudinary.v2.api.delete_resources()`.
- [x] T025 [US4] Implement GET handler in `src/app/api/admin/analytics/cloudinary-usage/route.ts` wrapping the usage metrics with Upstash Redis caching (e.g. 1 hour TTL).
- [x] T026 [US4] Create `DashboardAnalyticsViewModel` in `src/presentation/view-models/use-dashboard-analytics.ts` to consume the usage API.
- [x] T027 [US4] Update `src/app/(admin)/dashboard/page.tsx` to include the Cloudinary Storage Usage widget.
- [x] T028 [US4] Update `src/app/api/cron/system-cleanup/route.ts` to check storage usage against `cloudinary_storage_threshold` and invoke `deleteMediaByTarget` on the configured target if exceeded.

**Checkpoint**: Cloudinary limits are now visible on the dashboard and automatically managed by the cron task.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and system integrity.

- [x] T029 Update AR/EN translation files via `npm run i18n:sync` for all new settings labels, buttons, and dashboard widget text.
- [x] T030 Validate UI responsiveness and error handling (toast notifications) for backup/restore failures on the Settings page.
- [x] T031 Verify `clean-up` cron job handles partial failures gracefully (e.g. if draft deletion fails, it still attempts Cloudinary cleanup).
- [x] T032 [Principle VIII] Execute full production build (`npm run build`) to verify all new dependencies and type definitions.
- [x] T033 [Principle VIII] Test the destructive Restore functionality locally with a large generated dataset to verify memory usage and transaction stability before deploying.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion. User Stories 1, 2, 3, and 4 can largely proceed in parallel once Settings fields are available.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### Heavy Process Staging (Principle VIII)

- **Deferral**: Production builds and destructive restore testing are deferred to Phase N to ensure fast iteration loops during core API and UI development.