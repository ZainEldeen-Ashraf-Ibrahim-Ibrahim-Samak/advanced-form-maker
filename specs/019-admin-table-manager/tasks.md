# Tasks: Admin Table Manager

**Input**: Design documents from `/specs/019-admin-table-manager/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure. Since this is an existing project, no major setup is needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Update Mongoose schema to support Table type with `columns`, `rowHeaders`, and `allowUserAddRows` in `src/data/models/Form.ts`
- [x] T002 Update Zod validation schemas for Table fields in `src/domain/entities/FormField.ts`
- [x] T003 [P] Add base translation keys for the Table field to `src/locales/en.json` and `src/locales/ar.json`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Add Table Field to Form (Priority: P1) 🎯 MVP

**Goal**: As a form administrator, I want to add a Table field to my form so that I can collect structured, tabular data from users.

**Independent Test**: Can be tested by dragging/adding a Table field into the form builder and verifying it appears in the form preview.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create basic `TableFieldBuilder` component skeleton in `src/components/ui/TableFieldBuilder.tsx`
- [x] T005 [P] [US2] Create basic `TableFieldRender` component skeleton in `src/components/ui/TableFieldRender.tsx`
- [x] T006 [P] [US1] Add Column management UI to `TableFieldBuilder`
- [x] T007 [P] [US1] Add Row Header management UI to `TableFieldBuilder`
- [x] T008 [P] [US2] Implement dynamic column rendering in `TableFieldRender`
- [x] T009 [P] [US1] Add "Allow user to add rows" toggle to `TableFieldBuilder`
- [x] T010 [P] [US2] Implement row header (pre-defined rows) rendering in `TableFieldRender`
- [x] T011 [P] [US1] Integrate `TableFieldBuilder` into `src/presentation/components/admin/field-builder/field-form-dialog.tsx`
- [x] T012 [P] [US2] Integrate `TableFieldRender` into `src/presentation/components/client/submission-form/field-renderer.tsx`
- [x] T013 [P] [US2] Implement user "Add Row" functionality in `TableFieldRender` (if allowed by config)
- [x] T014 [P] [US3] Ensure form submission handles table data structure correctly (validate payload structure matches Mongoose schema Mixed type)

**Checkpoint**: At this point, the Table component can be added to the form.

---

## Phase 4: User Story 2 - Configure Column Headers (Priority: P1)

**Goal**: As a form administrator, I want to manage the column headers of the table so that I can define the data attributes I need to collect.

**Independent Test**: Can be tested by adding, editing, and deleting column headers in the table field's configuration panel and seeing the changes reflect on the table.

### Implementation for User Story 2

- [x] T007 [P] [US2] Implement column header configuration (add/edit/delete columns) in `src/components/ui/TableFieldBuilder.tsx`
- [x] T008 [P] [US2] Update renderer to display configured columns in `src/components/ui/TableFieldRender.tsx`

**Checkpoint**: The table now has configurable columns.

---

## Phase 5: User Story 3 - Configure Row Headers / Pre-defined Rows (Priority: P2)

**Goal**: As a form administrator, I want to manage the row headers of the table so that I can pre-define the items users need to provide data for.

**Independent Test**: Can be tested by adding pre-defined rows in the table configuration and verifying they appear as fixed row labels in the form.

### Implementation for User Story 3

- [x] T009 [P] [US3] Implement row header configuration (add/edit/delete rows) in `src/components/ui/TableFieldBuilder.tsx`
- [x] T015 [P] [US4] Update translations syncing script (i18n:sync) output check if any new keys are missing `src/components/ui/TableFieldRender.tsx`

**Checkpoint**: The table now has configurable pre-defined rows.

---

## Phase 6: User Story 4 - Manage Table Options (Priority: P3)

**Goal**: As a form administrator, I want to configure options for the table (like whether users can add their own rows).

**Independent Test**: Can be tested by toggling "Allow user to add rows" and verifying the form UI behavior.

### Implementation for User Story 4

- [x] T011 [P] [US4] Add "Allow user to add rows" toggle option in `src/components/ui/TableFieldBuilder.tsx`
- [x] T012 [P] [US4] Implement "Add Row" button logic for end-users when enabled in `src/components/ui/TableFieldRender.tsx`
- [x] T013 [US4] Implement data collection mapping to ensure user input maps correctly to columns and rows during submission in `src/components/ui/TableFieldRender.tsx`

**Checkpoint**: All user stories are functionally complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 Run `npm run i18n:sync` and `npm run i18n:lint` to ensure all UI text has valid AR/EN translations
- [x] T015 Verify form submission payload matches the expected schema structure
- [x] T016 [Principle VIII] Execute full production build (`npm run build`)
- [x] T017 Validate the flow against `quickstart.md` manual testing steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: BLOCKS all user stories
- **User Stories (Phase 3-6)**: Sequential or parallel. T004-T006 must be completed before T007-T013.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Implementation Strategy

#### Incremental Delivery
1. Complete Foundational Phase (Schema & Entity updates)
2. Add US1 (Basic Component)
3. Add US2 & US3 (Configurable headers)
4. Add US4 (Table options and data mapping)
5. Polish and translate
