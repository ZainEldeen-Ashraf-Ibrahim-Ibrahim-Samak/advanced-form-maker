# Tasks: Regex Field Validation

**Input**: Design documents from `/specs/008-regex-field-validation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- constants: `src/constants/`
- generic components: `src/components/`
- specific components: `src/presentation/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

There are no strict project initialization tasks since the repository and architecture are well-established.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validation components that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Populate centralized regex registry (EMAIL_REGEX, PHONE_REGEX, NAME_REGEX) in `src/constants/constants.ts`
- [X] T002 [P] Implement `PhoneRegix` wrapper component with Arabic numeral conversion in `src/components/validation/PhoneRegix.tsx`
- [X] T003 [P] Implement `EmailRegix` wrapper component with local typo detection in `src/components/validation/EmailRegix.tsx`
- [X] T004 [P] Implement `NameRegix` wrapper component for alphanumeric/Arabic characters in `src/components/validation/NameRegix.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Team Member Creation (Priority: P1) 🎯 MVP

**Goal**: Ensure added team members strictly follow the centralized regex rules for their email and phone numbers.

**Independent Test**: Attempt to add a team member with "test@com" or "123". Ensure real-time Check/AlertCircle icons appear correctly on keystroke and save is disabled, then switch to a valid format and save successfully.

### Implementation for User Story 1

- [X] T005 [US1] Inject `EmailRegix` and `PhoneRegix` real-time validation wrappers into the Team Management form components (e.g. `src/presentation/components/admin/team-management/member-form.tsx`).
- [X] T006 [US1] Apply `EMAIL_REGEX` and `PHONE_REGEX` to server-side creation payload parsing if applicable.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Accurate Submission Contact Data (Priority: P1)

**Goal**: Admins dynamically apply these regex validations via form templates so client submissions are clean.

**Independent Test**: Build a form requiring a phone and email. As a client, try to submit invalid contact info and ensure the submission is blocked client-side and server-side.

### Implementation for User Story 2

- [X] T007 [P] [US2] Update `src/presentation/components/client/submission-form/index.tsx` (Dynamic Renderer) to render `PhoneRegix`, `EmailRegix`, or `NameRegix` matching configured type requirements.
- [X] T008 [P] [US2] Apply strict validation in the server ingestion hook `src/domain/use-cases/client/submit-form.ts`.
- [X] T009 [US2] Prevent submission in the frontend `useSubmission` hook if the real-time wrapper component reports invalid formatting.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Secure Login Validation (Priority: P2)

**Goal**: Use real-time typo detection and email formatting checks on the login gateway for user feedback.

**Independent Test**: Enter `user@gmial.com` into the email field of the login screen and confirm the typo suggestion appears beneath it.

### Implementation for User Story 3

- [X] T010 [P] [US3] Instantiate `EmailRegix` component inside the primary Login form interface to provide sub-100ms keystroke feedback.
- [X] T011 [US3] Ensure the login button is disabled while `EmailRegix` returns an invalid state.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T012 [P] Sync Arabic translation keys to `src/messages/ar.json` containing `VALIDATION.VALID_PHONE`, `VALIDATION.INVALID_PHONE_DETAILS`, `CHANGE_EMAIL.ERRORS.DOMAIN_TYPO`, etc.
- [X] T013 [P] Sync English translation keys to `src/messages/en.json` containing the same validation namespace keys.
- [X] T014 Run validation components inside the test suite to ensure they correctly switch `dir="rtl"` vs `"ltr"` depending on Next-Intl active locale.
- [X] T015 Verify `formatPhoneNumber` strictly preserves Egyptian country code (`+20`) and converts `01X...` properly.
- [X] T016 [Principle VIII] Execute full production build (`npm run build`)
- [X] T017 [Principle VIII] Execute E2E test suite (if applicable)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed iteratively in priority order (P1 → P1 → P2).
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories
- **User Story 2 (P1)**: Independent of US1
- **User Story 3 (P2)**: Independent of US1/US2

### Heavy Process Staging (Principle VIII)

- **Deferral**: Production builds and test suite execution are relegated to the Polish Phase (Phase 6).

### Parallel Opportunities

- Foundational wrapper components (PhoneRegix, EmailRegix, NameRegix) can be built in completely isolated files simultaneously (T002, T003, T004).
- The string translation maps (`ar.json`, `en.json`) can be populated side-by-side during polish (T012, T013).

---

## Implementation Strategy

### Incremental Delivery Sequence

1. **Foundational**: Create the constants file and paste the `Regix` wrapper components snippets provided by the client into the components folder (this establishes the architectural bedrock).
2. **US1**: Integrate components into the Admin Team Panel as MVP.
3. **US2**: Wire the components up inside the more complex dynamic client form builder renderer.
4. **US3**: Plug `EmailRegix` into the Login page constraint limits.
5. **Localization**: Fill out English & Arabic files, run build.
