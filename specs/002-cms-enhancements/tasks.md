# Tasks: CMS Enhancements

**Input**: Design documents from `/specs/002-cms-enhancements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Ensure `@t3-oss/env-nextjs` and `zod` are installed for generic environment validation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Implement generic runtime environment validation using `zod` inside `src/env.mjs`. Use it safely replacing `process.env`.
- [x] T003 Update Upstash Redis and Cloudinary clients to utilize `env.mjs` instead of raw `process.env`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Developer Experience & Robustness (Priority: P1) 🎯 MVP

**Goal**: Centralized configuration management and automated translation syncing scripts to ensure UI string stability.

**Independent Test**: Can be tested by running the translation sync script and attempting to access an invalid configuration property.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create localization sync script `src/lib/scripts/i18n-sync.ts` that safely deep-merges `en.json` properties into `ar.json` keeping existing Arabic values safe.
- [x] T005 [P] [US1] Create localization lint script `src/lib/scripts/i18n-lint.ts` checking for unmatched translation keys.
- [x] T006 [US1] Expose structural npm run commands in `package.json` for developers (`npm run i18n:sync` and `npm run i18n:lint`).

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 3 - Admin Settings, Cron, and Backups (Priority: P1)

**Goal**: Dedicated Admin Settings for backing up data to Cloudinary natively and toggling serverless Cron configurations seamlessly (Minutely, Hourly, Daily, Monthly).

**Independent Test**: Can be tested by selecting an "Hourly" backup to "Local" destination, verifying the configuration saves, and experiencing a cloud Cloudinary export.

### Implementation for User Story 3

- [x] T007 [P] [US3] Create `SettingsConfiguration` Mongoose model in `src/data/models/settings.model.ts` mapping database CRON selections.
- [x] T008 [P] [US3] Create `BackupLog` Mongoose model in `src/data/models/backup-log.model.ts` for auditing backup failures/successes.
- [x] T009 [US3] Implement `MongoSettingsRepository` and `MongoBackupRepository`.
- [x] T010 [US3] Implement `ManageSettingsUseCase` and `ExecuteBackupUseCase` utilizing Mongoose `Cursor` logic to cleanly serialize DB blobs directly to Cloudinary.
- [x] T011 [US3] Create Admin API endpoint `src/app/api/admin/settings/route.ts` bridging `SettingsConfiguration`.
- [x] T012 [US3] Create Admin API endpoint `src/app/api/admin/backups/route.ts` for strictly manual/cron manual invocations.
- [x] T013 [P] [US3] Implement ViewModel `use-admin-settings.ts`.
- [x] T014 [US3] Implement Presentation Screen `settings-form.tsx` rendering mutually exclusive active cron intervals.

**Checkpoint**: At this point, User Stories 1 AND 3 should both work independently

---

## Phase 5: User Story 2 - Form Auto-Save Recovery for Clients (Priority: P2)

**Goal**: Incomplete dynamic client form submissions are persisted locally seamlessly so data isn't discarded upon an accidental browser reload.

**Independent Test**: Can be fully tested by filling half a form, refreshing the web page, and observing the form state recovering immediately.

### Implementation for User Story 2

- [x] T015 [P] [US2] Implement `use-draft-autosave.ts` React hook safely interacting with JS `localStorage` and serialization of Form Definitions constraints.
- [x] T016 [US2] Integrate `use-draft-autosave.ts` directly into the existing `useSubmissionForm` ViewModel and `SubmissionForm` component, clearing storage correctly upon successful finalization API calls.

**Checkpoint**: All P1 and Core P2 user stories functionally capable.

---

## Phase 6: User Story 4 - Media Manager Dashboard (Priority: P2)

**Goal**: Admins require a direct embedded dashboard tracking Cloudinary asset files enabling quick verification, browsing, and pruning outside standard client submissions.

**Independent Test**: Can be tested by navigating to the Media Manager and deleting a standalone orphaned image upload.

### Implementation for User Story 4

- [x] T017 [P] [US4] Implement `ManageMediaUseCase` bridging standard Cloudinary `v2.api.resources()` endpoints.
- [x] T018 [US4] Create Admin API `src/app/api/admin/media/route.ts` implementing cursor-based chunk fetching from Cloudinary API.
- [x] T019 [P] [US4] Implement Presentation ViewModel `use-media-manager.ts` handling asset pagination and delete modals.
- [x] T020 [US4] Create Presentation Admin component `media-gallery.tsx` for visual layout rendering.

**Checkpoint**: Entire Media stack visually accessible.

---

## Phase 7: User Story 5 - Real-time WebSocket Notifications & Analytics (Priority: P2)

**Goal**: Admin dashboards actively intercept Upstash pub/sub Redis payloads mapped immediately as popups to browsers holding open SSE (Server-Sent Events) event streams.

**Independent Test**: Can be tested by submitting a form internally and visually confirming instant notifications on the Administrator pane.

### Implementation for User Story 5

- [ ] T021 [P] [US5] Implement `src/lib/events/publisher.ts` securely typing Upstash Redis REST Publishes mapped for the Admin notification channel.
- [ ] T022 [US5] Create SSE backend proxy route `src/app/api/admin/events/route.ts`.
- [ ] T023 [US5] Wrap `SubmitFormUseCase` logic enforcing `publisher.notifyAdmins` upon every final database insert.
- [ ] T024 [P] [US5] Implement `live-notifications.tsx` Presentation React hook rendering `<Sonner>` toasts or similar upon actively catching socket events.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Audit Admin navigation structure adding `Media Manager` and `Settings` sections smoothly.
- [x] T026 Resolve any cross-story dependencies explicitly connecting Cron configurations to Edge runtime environments.
- [x] T027 Run full application end-to-end tests ensuring no local storage draft collision impacts identical Form IDs across differing browsers.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) and User Story 3 (P1) should technically launch sequentially as primary MVP structures.
  - User Story 2 (P2), User Story 4 (P2), and User Story 5 (P2) can run entirely sequentially.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- **T004** and **T005** can be built simultaneously mapping purely abstract TS configurations.
- **T007**, **T008**, and **T017** deal entirely with isolated schema definitions capable of simultaneous development cycles.
- **US5 (Real-time PubSub)** can be structurally developed by a different engineer than **US4 (Media manager UI)** since they hold zero interrelated cross-overs.
