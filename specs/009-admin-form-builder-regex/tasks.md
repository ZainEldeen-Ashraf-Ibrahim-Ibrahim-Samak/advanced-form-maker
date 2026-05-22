# Tasks: Admin Form Validation

**Input**: Design documents from `/specs/009-admin-form-builder-regex/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install sanitization library `isomorphic-dompurify` and `@types/dompurify` in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Create HTML sanitization utility exporting a DOMPurify wrapper in `src/lib/utils/sanitize.ts`
- [x] T003 Create shared validation regex constant (`SAFE_TEXT_REGEX`) in `src/lib/validations/shared.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Form Name and Description Entry (Priority: P1) 🎯 MVP

**Goal**: Admins must be restricted to safe, recognized characters when naming a form or writing a form description to prevent injection attacks and UI display issues.

**Independent Test**: Attempt to create a form named `<script>Hack</script>` or using obscure emojis. The system should block the submission and display a real-time validation error.

### Implementation for User Story 1

- [x] T004 [P] [US1] Update Form Template Zod schema to use `SAFE_TEXT_REGEX` on name/description in `src/lib/validations/form.ts` (or relevant schema file)
- [x] T005 [P] [US1] Ensure Admin UI displays real-time Zod validation errors for Form Template editing in `src/components/admin/form-builder.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Secure Form Builder Field Labels and Placeholders (Priority: P1)

**Goal**: Admins must be restricted to safe characters when defining custom fields within the form builder interface.

**Independent Test**: Attempt to add a new custom field with the name `Name /* */` or a placeholder like `'; DROP TABLE`. The field save operation should be blocked, showing a validation error.

### Implementation for User Story 2

- [x] T006 [P] [US2] Update Field Definition Zod schema to use `SAFE_TEXT_REGEX` on label/placeholder in `src/lib/validations/field.ts` (or relevant schema file)
- [x] T007 [US2] Ensure Admin UI properly displays real-time Zod validation errors for Field editing in `src/components/admin/field-editor.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Secure End-User Form Submissions (Priority: P1)

**Goal**: End-users submitting responses to client-facing forms must have their input validated structurally (e.g., valid email formats) and sanitized against malicious scripts.

**Independent Test**: Attempt to submit a form where a text input contains `<script>alert(1)</script>` and an email field contains `invalid-email`. The system should reject the email format and sanitize the text field.

### Implementation for User Story 3

- [x] T008 [P] [US3] Add strict field type format validation logic (e.g. email, phone) to submission Zod schema in `src/lib/validations/submission.ts`
- [x] T009 [US3] Integrate `sanitize.ts` utility into server action handling client submissions in `src/app/actions/submitForm.ts` to sanitize all free-text fields before DB persistence

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T010 [P] Run End-to-End tests covering all validation rules for Admin and Client views
- [x] T011 [Principle VIII] Execute full production build (`npm run build`) to ensure TS strict validity
- [x] T012 Manual verification of RTL/Arabic validation functionality in the browser

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
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Heavy Process Staging (Principle VIII)

- **Deferral**: ALL resource-intensive tasks (production build, full E2E) MUST be placed in the final "Polish & Verification" phase.
- **Prerequisite**: Heavy processes SHOULD only be initiated after all unit and integration tests have passed and feature logic is complete.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
