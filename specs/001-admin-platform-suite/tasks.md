# Tasks: Admin Platform Suite

**Input**: Design documents from `/specs/001-admin-platform-suite/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tasks are grouped by user story (P1–P5) to enable independent implementation and testing of each story. No test tasks are included (not requested in spec).

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new runtime dependency and verify environment.

- [x] T001 Install `jszip` and `@types/jszip` dependencies in `package.json` via `npm install jszip @types/jszip`
- [x] T002 [P] Verify `GEMINI_API_KEY` exists in `.env.local` — required for Phase 7 (US5 AI analysis)

**Checkpoint**: No user story is blocked pending Phase 1 except T001 (needed by US1 bulk zip). All other stories can begin immediately.

---

## Phase 2: Foundational (Blocking Prerequisites)

> **No cross-story blocking prerequisites identified.** The existing infrastructure (auth, DB connection, error utilities, Clean Architecture layers) is already in place. Each user story is independently implementable. This phase is intentionally empty — proceed directly to user story phases.

---

## Phase 3: User Story 1 — Export File Naming & Types Fix (Priority: P1) 🎯 MVP

**Goal**: All form export files are correctly named `[form-name] data.[ext]`, PDF document titles show the form name, indexes use the parent name, and all four formats (PDF/CSV/Excel/JSON) are supported for both single and bulk export.

**Independent Test**: Admin exports a single form submission list as PDF — file name is `[form-name] data.pdf`, opening the PDF shows the form name as the document title in the reader's title bar. Admin exports a single form as JSON — file is named `[form-name] data.json`.

- [x] T003 [US1] Fix `Content-Disposition` filename in `src/app/api/admin/system/export/route.ts` — change from `${encodeURIComponent(safeFilename)}-data.xlsx` to `${encodeURIComponent(formName)} data.xlsx`; preserve non-ASCII characters (Arabic) using `encodeURIComponent` with RFC 5987 `filename*` parameter
- [x] T004 [P] [US1] Add `?format=xlsx|csv|json` query param to `src/app/api/admin/system/export/route.ts` — branch on `format`: xlsx (existing path, just fix naming), csv (`xlsx.write(workbook, { bookType: "csv" })` with `Content-Type: text/csv`), json (`JSON.stringify(flattenedData, null, 2)` with `Content-Type: application/json`)
- [x] T005 [US1] Add `?format=pdf` branch to `src/app/api/admin/system/export/route.ts` — import jsPDF and jspdf-autotable; call `doc.setProperties({ title: exportTitle })` before building autoTable; set heading text to `parentName` (use `exportTitle` as fallback since no parent hierarchy exists yet); respond with `Content-Type: application/pdf`
- [x] T006 [P] [US1] Fix `exportToPDF()` in `src/lib/export.ts` — add `doc.setProperties({ title })` immediately after `new jsPDF()`; change `doc.save(${filename}.pdf)` to `doc.save(${title} data.pdf)`
- [x] T007 [P] [US1] Fix `exportToCSV()` and `exportToExcel()` in `src/lib/export.ts` — change `FileSaver.saveAs(blob, ${filename}.csv)` to `FileSaver.saveAs(blob, ${filename} data.csv)` and `XLSX.writeFile(workbook, ${filename}.xlsx)` to `XLSX.writeFile(workbook, ${filename} data.xlsx)`
- [x] T008 [US1] Create `src/app/api/admin/system/export/bulk/route.ts` — GET endpoint that fetches all active FormTemplates, builds: (a) merged XLSX workbook with one named worksheet per form for `?format=xlsx`; (b) multi-section PDF with form-name headings and page breaks for `?format=pdf`; uses same naming/title conventions as single export
- [x] T009 [US1] Add `exportBulkZip(formIds, format)` function to `src/lib/export.ts` — imports JSZip; fetches `/api/admin/system/export?formId=X&format=Y` for each form ID in parallel using `Promise.all`; bundles responses as `[form-name] data.[ext]` entries in a JSZip instance; triggers download as `all-forms-data.zip`

**Checkpoint**: Single and bulk export in all four formats, correctly named and titled, testable independently.

---

## Phase 4: User Story 2 — Form Lock Toggle (Priority: P2)

**Goal**: Admin can toggle a lock boolean on any form. Locked forms reject new submissions with a clear message while remaining visible and exportable.

**Independent Test**: Admin PATCHes `/api/admin/forms/[formId]/lock` with `{ isLocked: true }`. Attempting to submit a response to the locked form returns HTTP 423. Admin PATCHes with `{ isLocked: false }` and submission succeeds normally.

- [x] T010 [P] [US2] Add `isLocked: { type: Boolean, default: false }` field to `formTemplateSchema` in `src/data/models/form-template.model.ts` and add `isLocked: boolean` to `IFormTemplate` interface
- [x] T011 [P] [US2] Add `isLocked: boolean` to `FormTemplate` interface and add `isLocked?: boolean` to `UpdateFormTemplateInput` type in `src/domain/entities/form-template.ts`
- [x] T012 [US2] Add `setLocked(id: string, isLocked: boolean): Promise<FormTemplate | null>` to the `IFormTemplateRepository` interface in `src/domain/repositories/form-template-repository.ts` and implement it in `src/data/repositories/mongo-form-template-repository.ts` using `findByIdAndUpdate({ isLocked }, { new: true })`
- [x] T013 [US2] Add `lockForm(formId: string, isLocked: boolean)` public method to `src/domain/use-cases/admin/manage-forms.ts` — validates formId format, calls `repository.setLocked()`, returns updated FormTemplate or throws if not found
- [x] T014 [US2] Create `src/app/api/admin/forms/[formId]/lock/route.ts` — export `PATCH` handler; validate admin session; parse and validate `{ isLocked: boolean }` body with Zod; call `ManageFormsUseCase.lockForm()`; return `{ id, isLocked }` or 404
- [x] T015 [US2] Add lock enforcement guard to `src/app/api/submissions/[token]/route.ts` — after fetching the form template, check `form.isLocked`; if true return `NextResponse.json({ error: t("errors.formLocked") }, { status: 423 })` before any submission processing
- [x] T016 [P] [US2] Add `errors.formLocked` key to `src/messages/en.json` (`"This form is currently unavailable."`) and `src/messages/ar.json` (`"هذا النموذج غير متاح حالياً."`)
- [x] T017 [US2] Add `isLocked` state and `toggleLock(formId, currentState)` action (calls PATCH `/api/admin/forms/[formId]/lock`, updates local state) to `src/presentation/view-models/use-form-manager.ts`
- [x] T018 [US2] Add `<Switch>` lock toggle (shadcn/ui Switch component) with locked-state badge to form settings panel in `src/presentation/components/admin/form-manager/index.tsx` — shows "Locked" indicator when `isLocked` is true; calls `toggleLock()` on change; supports AR/EN labels

**Checkpoint**: Lock toggle works end-to-end — persists to DB, blocks submissions, UI reflects state. Testable independently of other stories.

---

## Phase 5: User Story 3 — Dashboard Card Management (Priority: P3)

**Goal**: Admin can show/hide and reorder form cards on the dashboard. Card order is shared across all admins. New forms auto-get a card; deleted forms auto-remove their card.

**Independent Test**: Admin calls PUT `/api/admin/dashboard/cards` with updated visibility and sortOrder arrays. GET returns cards in new order. Deleting a form removes its card from GET results.

- [x] T019 [P] [US3] Create `src/domain/entities/dashboard-card.ts` — export `DashboardCard`, `CreateDashboardCardInput`, and `UpdateDashboardCardInput` interfaces matching data-model.md
- [x] T020 [P] [US3] Create `src/data/models/dashboard-card.model.ts` — Mongoose schema for `dashboard_cards` collection with `formTemplateId` (ObjectId ref, unique, indexed), `visible` (Boolean default true), `sortOrder` (Number default 0), timestamps
- [x] T021 [P] [US3] Create `src/domain/repositories/dashboard-card-repository.ts` — `IDashboardCardRepository` interface with `listAll()`, `updateMany(cards: UpdateDashboardCardInput[])`, `createForForm(formId)`, `deleteByFormId(formId)` signatures
- [x] T022 [US3] Create `src/data/repositories/mongo-dashboard-card-repository.ts` — implement all `IDashboardCardRepository` methods; `updateMany` uses `bulkWrite` with `updateOne` filter per formTemplateId for atomic multi-card update
- [x] T023 [US3] Create `src/domain/use-cases/admin/manage-dashboard-cards.ts` — `listCardsWithFormData()` method: calls `cardRepo.listAll()` then joins with FormTemplate names and submission counts; `saveCardConfig(cards)` method: validates and calls `cardRepo.updateMany()`
- [x] T024 [US3] Create `src/app/api/admin/dashboard/cards/route.ts` — `GET` returns card list with joined form data (name, submissionCount, isLocked); `PUT` validates request body with Zod (array of `{ formTemplateId, visible, sortOrder }`), calls `saveCardConfig`, returns updated list; admin auth required on both
- [x] T025 [US3] Extend `src/domain/use-cases/admin/manage-forms.ts` — call `DashboardCardRepository.createForForm(formId)` after successful form creation; call `DashboardCardRepository.deleteByFormId(formId)` before or after form deletion
- [x] T026 [P] [US3] Add dashboard card management i18n keys (show/hide labels, reorder instructions, card management title) to `src/messages/en.json` and `src/messages/ar.json`
- [x] T027 [US3] Add `cards`, `reorderCards(newOrder)`, and `toggleCardVisibility(formId)` to `src/presentation/view-models/use-dashboard-analytics.ts` — fetches from GET `/api/admin/dashboard/cards`, calls PUT on change, manages optimistic UI update
- [x] T028 [US3] Add drag-and-drop card management panel to `src/presentation/components/admin/dashboard/index.tsx` using `@dnd-kit/sortable` — each card has a drag handle and a visibility toggle (Eye/EyeOff icon); saving calls `reorderCards()`; hidden cards are visually dimmed but remain in the list for re-enabling

**Checkpoint**: Dashboard card order and visibility persist and are reflected for all admin sessions. Auto-create/delete verified via form create/delete flows.

---

## Phase 6: User Story 4 — Site Branding: Name & Logo (Priority: P4)

**Goal**: Admin can update site name and logo from settings. Changes propagate to all pages (browser title, header, favicon, HTML metadata) on next page load.

**Independent Test**: Admin PATCHes `/api/admin/settings/branding` with `{ siteName: "Test Platform" }`. Any page's `<title>` tag includes "Test Platform". Admin uploads a new logo via Cloudinary and patches the URL — header and favicon reflect the new logo on reload.

- [x] T029 [P] [US4] Add `branding: { siteName: { type: String, default: "ADVANCED FORM MAKER", maxlength: 100 }, siteLogoUrl: { type: String, default: "", maxlength: 500 } }` subdocument to `SettingsConfigurationSchema` in `src/data/models/settings.model.ts` and `ISettingsConfiguration` interface
- [x] T030 [P] [US4] Refactor `src/components/shared/site-name.tsx` — keep `SITE_NAME` and `SITE_ADMIN_NAME` constants as fallbacks; add exported `async function getSiteBranding(): Promise<{ siteName: string; siteLogoUrl: string }>` that calls `ManageSettingsUseCase.getSettings()` and returns `branding` fields with hardcoded fallbacks
- [x] T031 [US4] Add `updateBranding(updaterId: string, input: { siteName?: string; siteLogoUrl?: string })` to `src/domain/use-cases/admin/manage-settings.ts` — validates `siteName` non-empty and ≤100 chars (Zod); validates `siteLogoUrl` as valid URL or empty string; calls `settingsRepo.updateBranding()`; extend `MongoSettingsRepository` accordingly
- [x] T032 [US4] Create `src/app/api/admin/settings/branding/route.ts` — `PATCH` handler; admin auth required; Zod schema for `{ siteName?, siteLogoUrl? }` with minProperties 1; calls `updateBranding` use-case; returns `{ siteName, siteLogoUrl }`
- [x] T033 [US4] Update `generateMetadata()` in `src/app/[locale]/admin/(authenticated)/layout.tsx` and individual admin pages that use `SITE_ADMIN_NAME` constant — replace constant with `(await getSiteBranding()).siteName + " Admin"` for dynamic browser titles
- [x] T034 [US4] Update `src/presentation/components/shared/logo.tsx` — accept optional `logoUrl` prop; if `logoUrl` is non-empty render `<Image src={logoUrl} ...>` else render existing fallback icon; fetch `logoUrl` from `getSiteBranding()` at the layout level and pass down as prop
- [x] T035 [P] [US4] Add branding settings i18n keys (site name label, logo upload label, save confirmation, validation errors) to `src/messages/en.json` and `src/messages/ar.json`
- [x] T036 [US4] Add branding section to `src/presentation/components/admin/settings-form.tsx` — site name text input (max 100 chars, required) + logo upload widget (uses existing Cloudinary upload component via `/api/cloudinary/sign`; preview of current logo; accepts PNG/JPG/SVG ≤2MB)
- [x] T037 [US4] Add `brandingData`, `saveBranding(input)` state/action to `src/presentation/view-models/use-admin-settings.ts` — `saveBranding` calls `PATCH /api/admin/settings/branding`; updates local state on success; shows sonner toast on success/error

**Checkpoint**: Site name and logo update from settings panel and are visible on all pages within one page reload.

---

## Phase 7: User Story 5 — AI-Powered Form Analysis (Priority: P5)

**Goal**: Admin can manually trigger AI analysis on any form's submission data. Results (summary, patterns, findings) are displayed in a dedicated analysis view. Admin can enable/disable analysis per form.

**Independent Test**: Admin POSTs to `/api/admin/forms/[formId]/analysis` for a form with ≥1 submission. GETting the same route returns `analysisStatus: "done"` with non-empty `summary` and `patterns` fields. POSTing when `enabled: false` returns 400.

- [x] T038 [P] [US5] Create `src/domain/entities/form-analysis.ts` — export `FormAnalysis` interface with all fields from `data-model.md` including `analysisStatus` enum
- [x] T039 [P] [US5] Create `src/data/models/form-analysis.model.ts` — Mongoose schema for `form_analyses` collection with unique index on `formTemplateId`; all fields from data-model.md; timestamps
- [x] T040 [P] [US5] Create `src/domain/repositories/form-analysis-repository.ts` — `IFormAnalysisRepository` interface with `findByFormId(formId)`, `upsert(data)`, `setEnabled(formId, enabled)`, `setStatus(formId, status, errorMessage?)` signatures
- [x] T041 [US5] Create `src/data/repositories/mongo-form-analysis-repository.ts` — implement all `IFormAnalysisRepository` methods; `upsert` uses `findOneAndUpdate` with `upsert: true` and `new: true` options
- [x] T042 [US5] Create `src/data/services/ai-form-analysis-service.ts` — async `analyzeFormSubmissions(submissions: any[])` function using `@google/genai`; construct text-only prompt requesting `{ summary, patterns, findings, sentimentOverview }` structured JSON response; sample to first 500 submissions; apply 30s timeout using `AbortController`; return typed result or throw on failure
- [x] T043 [US5] Create `src/domain/use-cases/admin/manage-form-analysis.ts` — `getAnalysis(formId)`, `triggerAnalysis(formId)` (sets status "running", loads submissions, calls AI service, upserts result with status "done" or "failed"), `setEnabled(formId, enabled)` methods; `triggerAnalysis` throws if analysis `enabled` is false
- [x] T044 [US5] Create `src/app/api/admin/forms/[formId]/analysis/route.ts` — `GET` returns analysis record or null; `POST` calls `triggerAnalysis()` (returns 202 Accepted; handles service errors with 503 + friendly message); `PATCH` with `{ enabled: boolean }` calls `setEnabled()`; admin auth on all methods
- [x] T045 [P] [US5] Add AI analysis i18n keys (run analysis button, status labels, empty state, error message, patterns/findings headers, enable/disable labels) to `src/messages/en.json` and `src/messages/ar.json`
- [x] T046 [US5] Create `src/presentation/view-models/use-form-analysis.ts` — `analysis`, `isLoading`, `error` state; `runAnalysis()` calls POST then polls GET every 3s until `analysisStatus` is "done" or "failed"; `toggleEnabled(enabled)` calls PATCH; exposes all analysis fields
- [x] T047 [US5] Create `src/presentation/components/admin/form-analysis/index.tsx` — analysis tab/panel component: "Run Analysis" button (disabled while running); status indicator; summary card; patterns list; findings list; sentiment overview; enable/disable toggle; empty state when no submissions; error state on failure; AR/EN labels from i18n

**Checkpoint**: AI analysis tab appears on form detail pages. Manual trigger runs Gemini, stores results, and displays them. Enable/disable toggle works. Graceful error handling prevents crashes.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Ensure all five stories are wired together correctly and the build passes.

- [x] T048 [P] Update `src/app/api/admin/forms/[formId]/route.ts` GET handler — include `isLocked` in the returned form object so the UI can display lock status in form listings
- [x] T049 [P] Include `branding` fields in `src/app/api/admin/settings/route.ts` GET response — needed for the settings page to pre-populate the branding section
- [x] T050 [P] Run `npm run i18n:lint` (existing script) to verify no missing or extra keys between `src/messages/en.json` and `src/messages/ar.json`
- [x] T051 [Principle VIII] Run `npm run build` to validate production build compiles cleanly — resolve any TypeScript or Next.js build errors introduced by schema changes or new imports

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 3 (US1)**: Depends on T001 for T009 (jszip); T003–T008 can start without T001
- **Phase 4 (US2)**: Independent of all other phases — start after Phase 1
- **Phase 5 (US3)**: Independent of all other phases — start after Phase 1
- **Phase 6 (US4)**: Independent of all other phases — start after Phase 1
- **Phase 7 (US5)**: Independent of all other phases — start after Phase 1
- **Phase 8 (Polish)**: Depends on all user story phases completing

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|---------------------|
| US1 (Export) | T001 (jszip for T009) | US2, US3, US4, US5 |
| US2 (Lock) | Nothing | US1, US3, US4, US5 |
| US3 (Dashboard Cards) | Nothing | US1, US2, US4, US5 |
| US4 (Branding) | Nothing | US1, US2, US3, US5 |
| US5 (AI Analysis) | Nothing | US1, US2, US3, US4 |

### Within Each User Story

- Domain entity (T0xx [P]) → Mongoose model (T0xx [P]) → Repository interface (T0xx [P]) — all three in parallel
- Repository implementation — after entity + model + interface
- Use-case — after repository implementation
- API route — after use-case
- i18n keys (T0xx [P]) — any time in parallel
- View-model — after API route
- UI component — after view-model

### Heavy Process Staging (Principle VIII)

- T051 (`npm run build`) is in the final polish phase and MUST run only after all implementation tasks are complete

---

## Parallel Example: User Story 3 (Dashboard Cards)

```
# All three can start simultaneously:
T019 — Create src/domain/entities/dashboard-card.ts
T020 — Create src/data/models/dashboard-card.model.ts
T021 — Create src/domain/repositories/dashboard-card-repository.ts

# Then in sequence:
T022 — Create mongo-dashboard-card-repository.ts   (needs T019 + T020 + T021)
T023 — Create manage-dashboard-cards.ts use-case   (needs T022)
T024 — Create API route cards/route.ts             (needs T023)
T025 — Extend manage-forms.ts with auto-create     (needs T022, can parallel with T024)
T026 — Add i18n keys                               (parallel at any point)
T027 — Add view-model                              (needs T024)
T028 — Add dashboard UI                            (needs T027)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: install jszip (T001–T002)
2. Complete Phase 3: Export fix (T003–T009)
3. **Validate**: Download a form as PDF — correct name, correct PDF title. Download as JSON. Bulk download as zip.
4. Ship or demo export improvements.

### Incremental Delivery

1. Setup → Export (US1) → MVP ✅
2. + Form Lock (US2) → Lock control ✅
3. + Dashboard Cards (US3) → Dashboard customization ✅
4. + Site Branding (US4) → White-labeling ✅
5. + AI Analysis (US5) → Intelligence layer ✅

Each story is independently shippable and does not break previous stories.

---

## Notes

- All tasks follow: `- [ ] T[NNN] [P?] [US?] Description with file path`
- [P] = safe to parallelize (different files, no pending dependencies)
- Each user story checkpoint is a demo-ready increment
- Commit after each story's checkpoint before starting the next
- Total tasks: **51** across 8 phases
