# Tasks: Multi-Instance Form Submissions

**Input**: Design documents from `/specs/018-multi-instance-form-submissions/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks grouped by user story → independent implementation and testing per story.
**Tests**: Not requested — no test tasks generated.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add all i18n keys before touching any component. Constitution Principle V requires keys in BOTH locale files before any UI string is written.

- [x] T001 Add all new translation keys to `src/messages/en.json`: `multiInstanceEnabled`, `multiInstanceEnabledDesc`, `maxInstances`, `maxInstancesLabel`, `addAnother`, `removeInstance`, `instanceCounter`, `submitAll`, `instanceLimitReached`, `multiInstanceTruncated`, `sessionId`
- [x] T002 Add matching Arabic translations for all new keys to `src/messages/ar.json` (RTL-safe phrasing)

**Checkpoint**: Run `npm run i18n:sync && npm run i18n:lint` — must pass with zero errors before proceeding.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data-layer changes that every user story depends on. All fields are additive with safe defaults — no migration required (Constitution Principle VIII).

- [x] T003 [P] Add `multiInstanceEnabled: boolean` and `maxInstances: number | null` to `IFormTemplate` interface and `formTemplateSchema` in `src/data/models/form-template.model.ts` (`default: false` and `default: null`)
- [x] T004 [P] Add `sessionId: string | null` to `ISubmission` interface and `submissionSchema` in `src/data/models/submission.model.ts` (`default: null`, `index: true`)
- [x] T005 [P] Add `multiInstanceEnabled: boolean` and `maxInstances: number | null` to `FormTemplate` interface and `UpdateFormTemplateInput` Pick in `src/domain/entities/form-template.ts`
- [x] T006 [P] Add `sessionId: string | null` to `Submission` interface in `src/domain/entities/submission.ts`
- [x] T007 Map new `FormTemplate` fields in `toEntity()` mapper in `src/data/repositories/mongo-form-template-repository.ts`
- [x] T008 Map `sessionId` in `toEntity()` mapper in `src/data/repositories/mongo-submission-repository.ts`
- [x] T009 Add Zod validation rules to `src/lib/validations.ts`: `multiInstanceEnabled: z.boolean().optional()`, `maxInstances: z.number().int().min(1).max(50).nullable().optional()`, `sessionId: z.string().max(36).nullable().optional()`

**Checkpoint**: `npm run build` — zero TypeScript errors. Foundation ready for all user stories.

---

## Phase 3: User Story 1 — Admin Enables Multi-Instance Mode (Priority: P1) 🎯 MVP

**Goal**: Admin can toggle multi-instance mode and optional max-instances cap in form settings. Setting persists to the database.

**Independent Test**: Navigate to any form's edit dialog, enable the toggle, set max to 3, save. Reload the page — toggle and max value should still be set.

- [x] T010 [US1] Add `multiInstanceEnabled` and `maxInstances` to the `updateForm` input type and PATCH call body in `src/presentation/view-models/use-form-manager.ts` (follow the existing `canAddMoreReplies` pattern)
- [x] T011 [US1] Add local state `editFormMultiInstanceEnabled` (boolean) and `editFormMaxInstances` (number | null) to `src/presentation/components/admin/form-manager/index.tsx`; populate from `form.multiInstanceEnabled` and `form.maxInstances` in the edit-open handler (lines ~70-80, mirror `setEditFormCanAddMoreReplies` pattern)
- [x] T012 [US1] Add the multi-instance Switch toggle row to the edit dialog in `src/presentation/components/admin/form-manager/index.tsx` (after the `canAddMoreReplies` row, before the Save button); use id `"edit-form-multi-instance"`; bind to `editFormMultiInstanceEnabled`
- [x] T013 [US1] Add a conditional max-instances number input beneath the toggle (only rendered when `editFormMultiInstanceEnabled` is true) in `src/presentation/components/admin/form-manager/index.tsx`; bind to `editFormMaxInstances`; use label key `maxInstancesLabel`; clamp 1–50
- [x] T014 [US1] Pass `multiInstanceEnabled: editFormMultiInstanceEnabled` and `maxInstances: editFormMaxInstances` in the `handleUpdate` call in `src/presentation/components/admin/form-manager/index.tsx`

**Checkpoint**: User Story 1 fully functional — admin can enable/disable multi-instance mode and set a cap.

---

## Phase 4: User Story 4 — Admin Sees Each Instance as a Separate Submission (Priority: P1)

> *(Implemented before US2 because the admin table must be ready to verify US2 submissions)*

**Goal**: Each submitted instance appears as its own row in the submissions table with a Session ID grouping column.

**Independent Test**: After manually inserting two `Submission` documents with the same `sessionId` via a test form submit, both rows should appear in the admin table each showing a truncated session ID.

- [x] T015 [US4] Expose `multiInstanceEnabled` and `maxInstances` in the return value of `useSubmission` in `src/presentation/view-models/use-submission.ts` (follow the `canAddMoreReplies` / `aiAutoFillEnabled` pattern at lines ~448 and ~807)
- [x] T016 [US4] Add a `sessionId` column to the submissions table in `src/presentation/components/admin/submissions-table/index.tsx`: display first 8 chars of `sessionId` with a tooltip for the full value; column hidden (`hidden`) when no visible row has a `sessionId`; use translation key `sessionId`

**Checkpoint**: User Story 4 functional — `sessionId` column visible for multi-instance submissions, hidden for ordinary ones.

---

## Phase 5: User Story 2 — Client Fills Multiple Instances (Priority: P1)

**Goal**: Client can add/remove form instances in a single session, validate each independently, and submit all — creating one separate `Submission` per instance.

**Independent Test**: Open a multi-instance-enabled form, add 2 instances with different data, submit → 2 rows in admin table with matching Session ID.

- [x] T017 [US2] Define the `FormInstance` transient type (local to the component) in `src/presentation/components/client/submission-form/index.tsx`: `{ id: string; formData: Record<...>; contactRecords: ContactRecord[]; validationErrors: Record<string,string>; contactErrors: Record<string,string> }`
- [x] T018 [US2] Add `instances` array state to `SubmissionForm` in `src/presentation/components/client/submission-form/index.tsx`; initialise with one seed instance using current `formData` and `contactRecords` when `multiInstanceEnabled` is true; fall back to existing single-instance behaviour when false
- [x] T019 [US2] Implement `addInstance()` handler in `src/presentation/components/client/submission-form/index.tsx`: append a blank `FormInstance` to `instances`; disabled when `instances.length >= (maxInstances ?? 50)`
- [x] T020 [US2] Implement `removeInstance(id)` handler in `src/presentation/components/client/submission-form/index.tsx`: remove instance by id; disabled when only 1 instance remains
- [x] T021 [US2] Render each `FormInstance` as a labelled card section (e.g. "Record 1 of N" using `t("instanceCounter")`) in `src/presentation/components/client/submission-form/index.tsx`; each card has its own `<FieldRenderer>` and `<ContactRecords>` bound to that instance's state; show Remove button on all but the last; show Add Another button at the bottom (disabled at limit with `t("instanceLimitReached")`)
- [x] T022 [US2] Implement per-instance validation in `handleSubmitAll` in `src/presentation/components/client/submission-form/index.tsx`: validate each instance independently using the existing field/contact validation logic; mark failing instances visually; block submit if any fail
- [x] T023 [US2] Implement parallel submission in `handleSubmitAll` in `src/presentation/components/client/submission-form/index.tsx`: generate a UUID v4 `sessionId` (using `crypto.randomUUID()` — already available in Next.js); call `submitForm` for each instance in parallel (`Promise.allSettled`); report partial failures per instance without discarding successes
- [x] T024 [US2] Pass `sessionId` in the submission payload in `src/domain/use-cases/client/submit-form.ts`: accept optional `sessionId` in the use-case input and write it to the `Submission` document

**Checkpoint**: User Story 2 fully functional — multi-instance submit creates N separate submission rows with the same Session ID.

---

## Phase 6: User Story 3 — AI Autofill Populates Multiple Instances (Priority: P2)

**Goal**: Uploading a multi-row tabular document (CSV, spreadsheet) auto-creates one pre-filled instance per detected record when the form has multi-instance mode enabled.

**Independent Test**: Upload a 3-row CSV to a multi-instance form → 3 pre-filled instances appear. Upload to a single-instance form → unchanged single-fill behaviour.

- [x] T025 [US3] Extend the AI extraction prompt in `src/data/services/ai-extraction-service.ts`: when `multiInstanceEnabled: true` is passed in options, append instruction to return a `records` array (one `ExtractionResult` per row) for tabular documents; for image/single-record documents return only the existing top-level structure
- [x] T026 [US3] Parse the `records` array from the AI extraction API response in `src/data/services/ai-extraction-service.ts`: if `records` is present and non-empty, include it in the returned object; cap at `maxInstances ?? 50`; fall back gracefully if parsing fails
- [x] T027 [US3] Add optional `onApplyMultipleRecords: (records: ExtractionResult[]) => void` callback to `UseAiExtractionParams` in `src/presentation/view-models/use-ai-extraction.ts`
- [x] T028 [US3] After successful extraction in `useAiExtraction`, check for `result.records`: if present AND `onApplyMultipleRecords` is provided, call `onApplyMultipleRecords(result.records)` instead of the single-record `applyExtraction` path in `src/presentation/view-models/use-ai-extraction.ts`; add a truncation warning via `setWarning(t("multiInstanceTruncated"))` when records were capped
- [x] T029 [US3] Implement `handleApplyMultipleRecords` in `src/presentation/components/client/submission-form/index.tsx`: receive `ExtractionResult[]`, map each to a new `FormInstance` pre-populated with that record's field values and contact data, replace the current `instances` array (capped at `maxInstances ?? 50`)
- [x] T030 [US3] Pass `multiInstanceEnabled` and `maxInstances` as options to the extraction call, and wire `onApplyMultipleRecords={handleApplyMultipleRecords}` into the `useAiExtraction` hook call in `src/presentation/components/client/submission-form/index.tsx`

**Checkpoint**: User Story 3 functional — multi-record CSV autofill creates multiple pre-filled instances; single documents unchanged.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and verification across all stories.

- [x] T031 Run `npm run i18n:sync` and `npm run i18n:lint` — fix any missing or unknown keys in `src/messages/en.json` and `src/messages/ar.json`
- [x] T032 Run `npm run build` — resolve all TypeScript compilation errors across all modified files
- [x] T033 Manual end-to-end walkthrough per `specs/018-multi-instance-form-submissions/quickstart.md`: admin toggle, client multi-fill, AI autofill CSV, partial-failure handling, admin table session grouping
- [x] T034 Verify existing single-instance forms are completely unaffected: open a non-multi-instance form, confirm no "Add Another" button is visible and submission behaviour is identical to before
- [x] T035 [P] Verify export pipeline: submit a 3-instance form, export to PDF and Excel — confirm each instance appears as its own separate row

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (i18n keys)       → no dependencies — start immediately
Phase 2 (data layer)      → no dependencies — start immediately, parallel with Phase 1
Phase 3 (admin settings)  → depends on Phase 1 + Phase 2
Phase 4 (admin table)     → depends on Phase 2
Phase 5 (client UX)       → depends on Phase 1 + Phase 2 + Phase 3 (for toggle) + Phase 4 (to verify)
Phase 6 (AI autofill)     → depends on Phase 5 (instances array must exist)
Phase 7 (polish)          → depends on all phases complete
```

### User Story Dependencies

| Story | Depends on | Notes |
|-------|-----------|-------|
| US1 — Admin toggle | Phase 2 only | Independent |
| US4 — Admin table | Phase 2 only | Independent; implement early to validate US2 |
| US2 — Client UX | Phase 2 + US1 (toggle needed to enable) | Core feature |
| US3 — AI autofill | Phase 2 + US2 (instances array) | Enhancement on top of US2 |

### Parallel Opportunities (within phases)

```bash
# Phase 1+2 can start in parallel:
T001  # en.json keys
T002  # ar.json keys
T003  # form-template.model.ts
T004  # submission.model.ts
T005  # form-template entity
T006  # submission entity

# Phase 3 parallel:
T010  # use-form-manager.ts
T011  # form-manager state (no UI yet)

# Phase 6 parallel:
T025  # AI prompt
T027  # use-ai-extraction type
```

---

## Implementation Strategy

### MVP (User Stories 1 + 4 + 2 — all P1)

1. ✅ Phase 1: i18n keys
2. ✅ Phase 2: Data layer
3. ✅ Phase 3: Admin toggle (US1)
4. ✅ Phase 4: Admin table Session ID column (US4)
5. ✅ Phase 5: Client multi-instance UX + submit (US2)
6. **STOP and VALIDATE** — test 3 instances, check admin table

### Full Feature (add US3 — AI autofill)

7. Phase 6: AI multi-record extraction (US3)
8. Phase 7: Polish + i18n validation + build

---

## Notes

- `[P]` = parallelizable (different files, no mutual dependency)
- `[USN]` = maps task to user story N from spec.md
- `crypto.randomUUID()` is used for `sessionId` — no extra package needed (Web Crypto API, available in Next.js runtime)
- All new Mongoose fields use `default: null/false` — no migration script required
- The Remove button must be absent (not just disabled) when only 1 instance remains, to avoid confusion
- RTL layout for the multi-instance cards is handled automatically by the existing Tailwind RTL utilities already in the project
