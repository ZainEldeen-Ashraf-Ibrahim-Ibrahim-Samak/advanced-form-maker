# Tasks: Fix Submission Form Sync

**Input**: Design documents from /specs/007-fix-submission-form-sync/
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: [ID] [P?] [Story] Description

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Update src/domain/entities/submission.ts with ContactRecord interface changes (mediaUrl, mediaPublicId).
- [x] T002 Create reusable SiteName component in src/components/shared/site-name.tsx.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Update Mongoose SubmissionModel in src/data/models/submission.model.ts (ContactRecord schema file uploads support).
- [x] T004 [P] Create ResubmissionRequest entity in src/domain/entities/resubmission-request.ts and model in src/data/models/resubmission-request.model.ts.
- [x] T005 [P] Create interface ResubmissionRequestRepository in src/domain/repositories/resubmission-request-repository.ts and Mongo implementation in src/data/repositories/mongo-resubmission-request-repository.ts.
- [x] T006 Update src/lib/validations.ts for repeatable contact minimum 1, mediaUrl/mediaPublicId, and string array for fieldValues.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manage Contact Records (Priority: P1) 🎯 MVP

**Goal**: As a user completing a submission form, I can edit contact records, add more records, and delete records while always keeping at least one record available, including optional file attachments per record.

**Independent Test**: Can be fully tested by opening a form, editing a contact row, adding rows, deleting rows, uploading a file to a record, and confirming the final row cannot be removed.

### Implementation for User Story 1

- [x] T007 [P] [US1] Update src/presentation/view-models/use-submission.ts to structurally manage minimum 1 contact record enforcing and file uploads state.
- [x] T008 [P] [US1] Update UI in src/presentation/components/client/submission-form/contact-records.tsx to allow adding/deleting/editing and file attachments (Cloudinary). Enforce min 1 row in UI.
- [x] T009 [US1] Update src/domain/use-cases/client/submit-form.ts to process and validate at least 1 contact record and optional media on submission/resubmission. Ensure Upstash Redis cache invalidation for the submission ID upon save.
- [x] T010 [US1] Update Admin review UI src/presentation/components/admin/submission-review/index.tsx to display inline uploaded files for each contact record.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Receive Resubmission Notifications (Priority: P1)

**Goal**: As an admin and end user, when an admin requests a resubmission, the targeted user receives a notification and the notification state remains visible on later admin review.

**Independent Test**: Can be fully tested by sending a resubmission request from admin to a user, verifying user notification receipt, and verifying notification status remains visible after admin revisits the same submission.

### Implementation for User Story 2

- [x] T011 [US2] Update src/app/api/admin/submissions/[id]/route.ts PATCH handler to create/update ResubmissionRequest entity when status changes to 
eeds_rewrite.
- [x] T012 [P] [US2] Create notification fetching API in src/app/api/user/notifications/route.ts to query pending ResubmissionRequest for a user, filtering out expired items (lazy evaluation of 7-day expiration).
- [x] T013 [P] [US2] Update admin view model src/presentation/view-models/use-submissions-list.ts and Admin review UI to fetch and display the ResubmissionRequest status (pending, delivered, seen).
- [x] T014 [US2] Update user UI (e.g., notification component in src/presentation/components/client/dashboard/notifications.tsx) to display and mark requests as seen/delivered via an API endpoint.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Load Latest Form for Token Users (Priority: P2)

**Goal**: As a token-based form user, if an admin updates or rearranges the form while I have it open, refreshing the page loads the latest version so I do not submit outdated structure.

**Independent Test**: Can be fully tested by opening a token form, changing form structure as admin, refreshing as user, and verifying updated field order/structure is shown.

### Implementation for User Story 3

- [x] T015 [US3] Update src/domain/use-cases/client/view-submission.ts to fetch the latest published form definition (FormVersionSnapshot logic) merging with the submission's draft values.
- [x] T016 [US3] Update src/app/api/submissions/[token]/route.ts to return the latest form fields alongside unsaved draft values.
- [x] T017 [US3] Update src/presentation/view-models/use-submission.ts to reconcile local draft state against latest form fields, keeping matching identifiers.
- [x] T018 [US3] Update src/presentation/components/client/submission-form/index.tsx to display a warning message DRAFT_VALUES_DROPPED if fields were dropped.

**Checkpoint**: All user stories up to P2 should now be independently functional

---

## Phase 6: User Story 4 - Multi-Select Sector and Unified Site Name (Priority: P3)

**Goal**: As a form user and site visitor, I can choose multiple values in the sector field, and all pages show the same reusable site name value "SCCT".

**Independent Test**: Can be fully tested by selecting multiple sector values in a submission and by reviewing pages that display the site name to confirm consistent "SCCT" output.

### Implementation for User Story 4

- [x] T019 [P] [US4] Update translations src/i18n/messages/en.json and src/i18n/messages/ar.json with missing site name keys and submissions warnings.
- [x] T020 [P] [US4] Update src/presentation/components/client/submission-form/field-renderer.tsx to handle array values (isMultiple) for Sector select fields.
- [x] T021 [US4] Update src/domain/use-cases/client/submit-form.ts and src/data/repositories/mongo-field-value-repository.ts to handle storing string array for fieldValues.
- [x] T022 [P] [US4] Audit and replace hardcoded "SCCT" with <SiteName /> in layout files (e.g. src/app/[locale]/layout.tsx, src/presentation/components/shared/header.tsx).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T023 Code cleanup, resolve localized formatting or typing issues across modified files.
- [x] T024 [P] Run 
pm run i18n:sync and 
pm run i18n:lint to synchronize translations and prevent orphaned AR/EN keys.
- [x] T025 [Principle VIII] Execute full production build (
pm run build) to ensure all structural changes are stable.
- [x] T026 [Principle VIII] Execute exhaustive E2E test suite (if applicable).
- [x] T027 Verify final manual API smoke tests matching the quickstart.md specification.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2/US3 but should be independently testable

### Heavy Process Staging (Principle VIII)

- **Deferral**: ALL resource-intensive tasks (production build, full E2E, large migrations) MUST be placed in the final "Polish & Verification" phase.
- **Prerequisite**: Heavy processes SHOULD only be initiated after all unit and integration tests have passed and feature logic is complete.

---

## Phase 8: User Story 5 - Optional Contact Details UI Update (Priority: P2)

**Goal**: Make all inner fields of a contact info record optional across user/admin views, provided the array has at least one record.

### Implementation for User Story 5

- [x] T028 [US5] Update \`src/lib/validations.ts\` to ensure inner fields (name, email, phone, role, notes) of \`contactRecordSchema\` are optional \`.optional().nullable()\` or \`""\` while ensuring the parent array still has a minimum of 1 item \`.min(1)\`.
- [x] T029 [US5] Update \src/presentation/components/client/submission-form/contact-records.tsx\ UI to remove required asterisks (\*\) and HTML \
equired\ attributes from contact fields. Check and gracefully render empty states in the contact manager view.
- [x] T030 [US5] Update \src/presentation/components/admin/submission-review/index.tsx\ and \src/app/[locale]/admin/submissions/columns.tsx\ (or the specific admin table/view handling contact info) to gracefully display optional/missing contact data (e.g., fallback \-\ or \N/A\ or purely omitted).
- [x] T031 [US5] Update \src/presentation/view-models/use-submission.ts\ to not flag missing contact details as validation errors, providing validation strictly verifies \contactRecords.length >= 1\.

## Phase 9: Export Submissions to CSV & PDF (User Story 6)
**Goal**: Allow users to export a single submission or multiple submissions (from the table) into CSV and PDF formats.

### Implementation for User Story 6
- [ ] T032 [US6] Add dependencies for CSV & PDF export (if required, like `papaparse` or `jspdf` / `html2canvas`) or implement native Blob/print CSS logic.
- [ ] T033 [US6] Create export functionality for the Admin Submissions Table. Add "Export to CSV" and "Export to PDF" options (for selected or all).
- [ ] T034 [US6] Create export functionality for the Admin Single Submission Review. Add "Export" buttons for the individual submission view.
- [ ] T035 [US6] Update translations for the new export buttons.
