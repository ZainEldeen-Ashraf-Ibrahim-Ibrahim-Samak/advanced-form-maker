# Tasks: Admin UI Details

**Input**: Design documents from `/specs/015-admin-ui-details/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story — each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 map to spec.md user stories

---

## Phase 1: Setup

**Purpose**: Confirm no new runtime dependencies are required — all libraries (jsPDF, xlsx, @dnd-kit/sortable, file-saver) are already installed.

- [x] T001 Verify `jsPDF`, `xlsx`, `@dnd-kit/sortable`, `file-saver` are listed in `package.json` before starting; confirm no `npm install` needed

---

## Phase 2: Foundational

No shared foundational prerequisites — all four user stories operate on independent data models and components. Each phase begins directly after T001.

**Checkpoint**: T001 verified → all four user stories can start in parallel.

---

## Phase 3: User Story 1 — Submissions Table Index & Export Buttons (Priority: P1) 🎯 MVP

**Goal**: Every row in the submissions table shows a sequential index number (#1, #2…); four visible export buttons (PDF, CSV, Excel, JSON) appear directly on the page; downloaded files are named `[form-name] data.[ext]`.

**Independent Test**: Open any form's submissions table. First column header reads "#". Row 1 shows "1", last row shows the total count. Four export buttons are visible above the table (not hidden in a dropdown). Clicking each downloads a file named `[form-name] data.pdf|csv|xlsx|json`. The downloaded file has a first column "#" with matching row numbers.

### Implementation

- [x] T002 [US1] Add `exportToJSON(data: object[], filename: string, columns?: ExportColumn[])` utility function that generates and downloads a `.json` file in `src/lib/export.ts`
- [x] T003 [P] [US1] Add `formName: string` prop to `SubmissionsTableProps` interface and pass it through the component signature in `src/presentation/components/admin/submissions-table/index.tsx`
- [x] T004 [US1] Add sequential index as first `<TableHead>` (header: t("indexHeader") || "#") and as first `<TableCell>` showing `{idx + 1}` in each `submissions.map((sub, idx) =>` row in `src/presentation/components/admin/submissions-table/index.tsx`
- [x] T005 [US1] Prepend index column `{ header: t("indexHeader") || "#", key: (_: Submission, idx: number) => idx + 1 }` as the first entry in `getExportColumns()` in `src/presentation/components/admin/submissions-table/index.tsx`
- [x] T006 [US1] Replace the "Export All" `<DropdownMenu>` toolbar block with four inline `<Button variant="outline" size="sm">` buttons (PDF, CSV, Excel, JSON) each calling `handleExport` with their respective format in `src/presentation/components/admin/submissions-table/index.tsx`
- [x] T007 [US1] Update `handleExport` to: (a) use `formName` prop to build filename as `` `${formName} data` ``; (b) add `json` format case calling `exportToJSON`; (c) disable all four buttons when `submissions.length === 0` (add `disabled={submissions.length === 0}` and a tooltip or `title` attribute) in `src/presentation/components/admin/submissions-table/index.tsx`
- [x] T008 [P] [US1] Pass `formName` prop from `SubmissionsManager` to `<SubmissionsTable>` — fetch the form name from the `formOptions` state already loaded in the component; pass `formNamesById[formFilter] || "submissions"` or equivalent in `src/presentation/components/admin/submissions-manager/index.tsx`
- [x] T009 [P] [US1] Pass `formName` prop from `AdminDashboard` to `<SubmissionsTable>` — use a constant `"all-forms"` or the selected form name from context in `src/presentation/components/admin/dashboard/index.tsx`
- [x] T010 [P] [US1] Add AR/EN i18n keys: `"submissions.indexHeader": "#"` and `"common.exportJSON": "JSON"` to `src/messages/en.json` and `src/messages/ar.json`

**Checkpoint**: Submissions table shows "#" column, four visible export buttons above table, each download named `[form-name] data.[ext]` with index as first column.

---

## Phase 4: User Story 2 — Contact Form Lock (Contact Form Only) (Priority: P2)

**Goal**: A new `isContactForm` boolean on `FormTemplate` designates which form is the contact form. The lock toggle is rendered ONLY when `form.isContactForm === true`. A "Locked" badge appears in the form listing when the contact form is locked.

**Independent Test**: Mark one form as the contact form via the edit dialog checkbox. The lock toggle appears in that form's edit dialog and nowhere else. Lock the contact form — a "Locked" badge appears in the form list. Log in as a regular user and attempt to submit — the 423 response and unavailability message appear. Unlock — submissions work again.

### Implementation

- [x] T011 [P] [US2] Add `isContactForm: { type: Boolean, default: false }` to the Mongoose schema in `src/data/models/form-template.model.ts`; add `isContactForm: boolean` to `IDashboardCard`-equivalent interface `IFormTemplate`
- [x] T012 [P] [US2] Add `isContactForm: boolean` to `FormTemplate` interface and `isContactForm?: boolean` to `UpdateFormTemplateInput` in `src/domain/entities/form-template.ts`
- [x] T013 [US2] Update `MongoFormTemplateRepository` to project and return `isContactForm` in all `findAll`, `findById`, and mapper functions in `src/data/repositories/mongo-form-template-repository.ts`
- [x] T014 [US2] Update `ManageFormsUseCase` create and update methods to accept and persist `isContactForm` in `src/domain/use-cases/admin/manage-forms.ts`
- [x] T015 [US2] Extend the PATCH handler in `src/app/api/admin/forms/[formId]/route.ts` to accept `isContactForm` in the request body Zod schema and pass it to the use-case
- [x] T016 [US2] Update `updateForm` in `use-form-manager.ts` to accept `isContactForm?: boolean` in the data parameter and include it in the PATCH body in `src/presentation/view-models/use-form-manager.ts`
- [x] T017 [US2] In the form edit dialog in `src/presentation/components/admin/form-manager/index.tsx`: (a) add `editFormIsContactForm` state; (b) initialize it from `form.isContactForm`; (c) render a `<Checkbox>` / `<Switch>` for "This is the contact form" always visible in the edit form; (d) wrap the lock toggle in `{editFormIsContactForm && (<Switch … />)}`; (e) pass `isContactForm: editFormIsContactForm` in `handleUpdate`
- [x] T018 [US2] Add "Locked" `<Badge variant="destructive">` to the form listing card — render when `form.isContactForm && form.isLocked` in `src/presentation/components/admin/form-manager/index.tsx`
- [x] T019 [P] [US2] Add AR/EN i18n keys: `"forms.isContactForm": "This is the contact form"` / `"هذا هو نموذج الاتصال"` and `"forms.contactFormLocked": "Locked"` / `"مغلق"` in `src/messages/en.json` and `src/messages/ar.json`

**Checkpoint**: Lock toggle absent on all non-contact forms; present only on the form with `isContactForm=true`; "Locked" badge visible in listing when locked; regular user cannot submit to locked contact form.

---

## Phase 5: User Story 3 — AI Analysis UI: Business Insights & Export (Priority: P3)

**Goal**: The existing Analysis tab is enhanced with: (a) a computed statistics section (total count, top recurring answers, date range) displayed side-by-side with the AI narrative; (b) an export button producing a combined `[form-name] analysis.[ext]` file containing stats + narrative + raw rows; (c) updated AI prompt focused on marketing/business intelligence.

**Independent Test**: Open a form's Analysis tab. Click "Run Analysis". Two columns appear side by side: left shows "Total: N, Date: earliest–latest, Top Answers: …"; right shows AI business narrative. Click the Export button, select PDF. The downloaded file is named `[form-name] analysis.pdf` and contains a stats section at top, AI narrative section, then raw submission rows. Click Export without ever running analysis — the file still downloads with computed stats and a "No AI analysis has been run yet" placeholder.

### Implementation

- [x] T020 [P] [US3] Add `topAnswers` array subdoc and `submissionDateRange` subdoc to the Mongoose schema in `src/data/models/form-analysis.model.ts`:
  ```ts
  topAnswers: [{ fieldLabel: String, topValue: String, count: Number }], default: null
  submissionDateRange: { earliest: Date, latest: Date }, default: null
  ```
- [x] T021 [P] [US3] Add `TopAnswer`, `SubmissionDateRange` interfaces and fields `topAnswers: TopAnswer[] | null`, `submissionDateRange: SubmissionDateRange | null` to `src/domain/entities/form-analysis.ts`
- [x] T022 [US3] Update `MongoFormAnalysisRepository` to project, map, and save `topAnswers` and `submissionDateRange` in `src/data/repositories/mongo-form-analysis-repository.ts`
- [x] T023 [US3] In `ManageFormAnalysisUseCase.triggerAnalysis()` in `src/domain/use-cases/admin/manage-form-analysis.ts`: compute `topAnswers` (group submission field values, take top-3 per field) and `submissionDateRange` (min/max `submittedAt`) from the submission sample before calling the AI service; store them alongside AI results
- [x] T024 [P] [US3] Update Gemini prompt in `src/data/services/ai-form-analysis-service.ts` to request business/marketing intelligence — replace generic "patterns/findings" prompt with the marketing-focused prompt from `specs/015-admin-ui-details/quickstart.md` section 3
- [x] T025 [US3] Create `src/app/api/admin/forms/[formId]/analysis/export/route.ts` — `GET` handler that: (a) validates `?format=pdf|csv|xlsx|json`; (b) loads `FormAnalysis` document (or computes stats on-the-fly if none); (c) loads all `Submission` documents for the form; (d) assembles and streams a combined file; (e) sets `Content-Disposition: attachment; filename*=UTF-8''[form-name]%20analysis.[ext]`
- [x] T026 [US3] Add `exportAnalysis(format: "pdf" | "csv" | "xlsx" | "json")` function to `src/presentation/view-models/use-form-analysis.ts` that triggers a download from the new export route
- [x] T027 [US3] Add a `ComputedStatsCard` inline section (or sub-component) in `src/presentation/components/admin/form-analysis/index.tsx` showing total submission count, date range, and top answers list — visible whenever `analysis.submissionCount > 0` or `analysis.submissionDateRange` is set
- [x] T028 [US3] Restructure the `FormAnalysisPanel` results area to a two-column `md:grid-cols-2` layout: left column = computed stats; right column = AI narrative cards (summary, patterns, findings, sentiment) in `src/presentation/components/admin/form-analysis/index.tsx`
- [x] T029 [US3] Add an export button row above or below the results area in `FormAnalysisPanel` with a format-picker dropdown (`<DropdownMenu>`) triggering `exportAnalysis(format)` — visible regardless of analysis state in `src/presentation/components/admin/form-analysis/index.tsx`
- [x] T030 [P] [US3] Add AR/EN i18n keys: `formAnalysis.statsTitle`, `statsTotalLabel`, `statsDateRangeLabel`, `statsTopAnswersLabel`, `exportButton`, `noAnalysisYet`, `noDateRange` in `src/messages/en.json` and `src/messages/ar.json`

**Checkpoint**: Analysis tab shows computed stats beside AI narrative; Export button downloads combined `[form-name] analysis.[ext]`; export works without prior AI run.

---

## Phase 6: User Story 4 — Dashboard Card Management UI (Priority: P4)

**Goal**: Dashboard cards support freeform `displayName`, `metricLabel`, and `metricValue` fields, all editable in the Manage Cards dialog. The dialog now has explicit Save/Cancel buttons instead of auto-saving. Live cards show the custom name and metric.

**Independent Test**: Open dashboard. Click the "Manage Cards" button. Edit the first card's name to "Agency Pipeline", metric label to "Leads", metric value to "42". Click Save. Dashboard shows "Agency Pipeline" card with "Leads: 42". Open the dialog again, make a change, click Cancel — original values unchanged. Open a second browser session — same layout visible.

### Implementation

- [x] T031 [P] [US4] Add `displayName: { type: String, default: null }`, `metricLabel: { type: String, default: null }`, `metricValue: { type: String, default: null }` to the Mongoose schema in `src/data/models/dashboard-card.model.ts`
- [x] T032 [P] [US4] Add `displayName: string | null`, `metricLabel: string | null`, `metricValue: string | null` to `DashboardCard` interface and optional counterparts to `UpdateDashboardCardInput` in `src/domain/entities/dashboard-card.ts`
- [x] T033 [US4] Update `MongoDashboardCardRepository` upsert and find/map operations to include `displayName`, `metricLabel`, `metricValue` in `src/data/repositories/mongo-dashboard-card-repository.ts`
- [x] T034 [US4] Update `ManageDashboardCardsUseCase.saveCardConfig()` to accept and persist `displayName`, `metricLabel`, `metricValue` per card; update `listCardsWithFormData()` to return these fields in `src/domain/use-cases/admin/manage-dashboard-cards.ts`
- [x] T035 [US4] Extend the Zod `updateCardSchema` in `src/app/api/admin/dashboard/cards/route.ts` to accept optional `displayName: z.string().nullable().optional()`, `metricLabel: z.string().nullable().optional()`, `metricValue: z.string().nullable().optional()`
- [x] T036 [US4] Extend `DashboardCardWithData` interface to include `displayName: string | null`, `metricLabel: string | null`, `metricValue: string | null` in `src/presentation/view-models/use-dashboard-analytics.ts`; include these fields in the `reorderCards` PUT payload
- [x] T037 [US4] Add local `draftCards` state and `isEditDialogOpen` flag to `AdminDashboard`; initialize `draftCards` from `cards` when the dialog opens; introduce `handleDraftDragEnd`, `toggleDraftVisibility`, `updateDraftCardField(id, field, value)` helpers that mutate `draftCards` without calling the API in `src/presentation/components/admin/dashboard/index.tsx`
- [x] T038 [US4] Add three `<Input>` fields per `SortableCardRow` (name, metric label, metric value) — only rendered in edit mode, reading from and writing to `draftCards` via `updateDraftCardField`; update `SortableCardRow` props to include edit-mode fields and callbacks in `src/presentation/components/admin/dashboard/index.tsx`
- [x] T039 [US4] Replace the `<DialogTrigger>` auto-close footer button with explicit Save button (calls `reorderCards(draftCards)` then closes) and Cancel button (discards `draftCards` and closes dialog) in the Manage Cards dialog in `src/presentation/components/admin/dashboard/index.tsx`
- [x] T040 [US4] Update live dashboard card display to show `card.displayName ?? card.name` as the card title and `(card.metricLabel ?? t("submissionCount_label")) : (card.metricValue ?? card.submissionCount)` as the metric in `src/presentation/components/admin/dashboard/index.tsx`
- [x] T041 [P] [US4] Add AR/EN i18n keys: `"dashboard.manageCards": "Manage Cards"`, `"editCardName": "Card Name"`, `"editMetricLabel": "Metric Label"`, `"editMetricValue": "Metric Value"`, `"saveLayout": "Save"`, `"cancelEdit": "Cancel"` in `src/messages/en.json` and `src/messages/ar.json`

**Checkpoint**: Manage Cards dialog has editable name + metric fields; Save/Cancel buttons work; live dashboard reflects saved values for all admin sessions.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: FR-025/FR-026/FR-027 verification, locale compliance, and build check.

- [x] T042 [P] Audit all existing export calls across the codebase to ensure filenames use `[form-name] data.[ext]` or `[form-name] analysis.[ext]` conventions — grep for `handleExport`, `exportToPDF`, `exportToCSV`, `exportToExcel` and fix any that still use old date-suffixed names
- [x] T043 [P] Verify RTL layout for all new UI elements (index column, inline export buttons, stats section, card edit fields) by toggling locale to `ar` in the dev server
- [x] T044 Verify FR-025 (AI locale): confirm `ai-form-analysis-service.ts` Gemini prompt includes `"Respond entirely in ${locale === 'ar' ? 'Arabic' : 'English'}"` instruction; test by triggering analysis with `locale=ar` and verifying the returned `summary`/`patterns`/`findings` are in Arabic in `src/data/services/ai-form-analysis-service.ts`
- [x] T045 [P] FR-026 i18n audit: grep all new/modified component files (`submissions-table/index.tsx`, `form-analysis/index.tsx`, `form-manager/index.tsx`, `dashboard/index.tsx`) for any hardcoded English or Arabic strings not wrapped in `t()`; add missing keys to `src/messages/en.json` and `src/messages/ar.json`
- [x] T046 [P] FR-027 navigation accessibility check: manually verify each feature is reachable — (a) Analysis tab visible on `/admin/forms/[id]`; (b) submissions index + export buttons visible on `/admin/submissions`; (c) "Manage Cards" button visible on `/admin/dashboard`; (d) lock toggle visible in contact form edit dialog; fix any missing navigation or rendering condition
- [x] T047 [Principle VIII] Run `npm run build` and resolve any TypeScript type errors introduced by the new entity fields across all modified files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phases 3–6 (User Stories)**: Depend on Phase 1 only; all four stories are independent and can run in parallel
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: No data model changes — pure UI. Start after T001.
- **US2 (P2)**: Requires FormTemplate model change (T011) before repository (T013), use-case (T014), API (T015), and UI (T017). T011 and T012 can run in parallel.
- **US3 (P3)**: Requires FormAnalysis model change (T020) before repository (T022), use-case (T023), and new export route (T025). T020, T021, T024 can run in parallel.
- **US4 (P4)**: Requires DashboardCard model change (T031) before repository (T033), use-case (T034), API (T035). T031 and T032 can run in parallel.

### Within Each User Story

Data layer (model → entity → repository) → Business layer (use-case) → API route → View-model → Component

### Parallel Opportunities

- US1 tasks T003, T008, T009, T010 can all run in parallel (separate files, no inter-dependencies)
- US2 tasks T011 and T012 can run in parallel (model vs. entity)
- US3 tasks T020, T021, T024 can run in parallel
- US4 tasks T031 and T032 can run in parallel
- All four user stories can be worked simultaneously by different developers once T001 is done

---

## Parallel Example: User Story 3

```
# Simultaneously:
Task T020: Add topAnswers + submissionDateRange to form-analysis.model.ts
Task T021: Add TopAnswer + SubmissionDateRange types to domain/entities/form-analysis.ts
Task T024: Update Gemini prompt in ai-form-analysis-service.ts

# Then (after T020 + T021 done):
Task T022: Update MongoFormAnalysisRepository
Task T023: Update ManageFormAnalysisUseCase
Task T025: Create analysis/export/route.ts

# Then (after T023 + T025 done):
Task T026: Add exportAnalysis() to use-form-analysis.ts
Task T027: Add ComputedStatsCard to form-analysis/index.tsx
Task T028: Restructure to side-by-side layout
Task T029: Add export button
Task T030: Add i18n keys
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (verify dependencies)
2. Complete T002–T010 (US1 — submissions index + export buttons)
3. **Validate**: Submissions table shows index column; four export buttons visible; downloads work
4. Ship if time-boxed — US1 delivers immediate value with zero risk

### Incremental Delivery

1. T001 → T002–T010 (US1) → validate → demo
2. T011–T019 (US2) → validate → demo (lock visible only on contact form)
3. T020–T030 (US3) → validate → demo (analysis panel with stats + export)
4. T031–T041 (US4) → validate → demo (dashboard card name/metric editing)
5. T042–T044 (Polish)

Each story adds isolated value without modifying the previous story's output.

---

## Notes

- No new runtime dependencies required — all needed libraries already installed
- All new Mongoose fields use `default: null` or `default: false` — no migration scripts needed
- i18n tasks ([T010], [T019], [T030], [T041]) should be done last within each story to avoid merge conflicts on `en.json`/`ar.json`
- The analysis export route (T025) is the most complex new endpoint — it needs to handle four formats and the "no analysis yet" fallback for all of them
- Contact form lock restriction (US2) is a UI-only restriction — the API lock endpoint remains unrestricted (the lock toggle is simply not shown for non-contact forms)
