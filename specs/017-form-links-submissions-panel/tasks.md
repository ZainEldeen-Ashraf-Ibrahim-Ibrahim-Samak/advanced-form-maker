# Tasks: Form Quick-Links on Dashboard + Per-Form Submissions Panel

**Input**: Design documents from `/specs/017-form-links-submissions-panel/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not requested in spec — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup (i18n Foundation)

**Purpose**: Add all new translation keys to both locale files — required by both user stories before any UI work can be verified.

- [x] T001 [P] Add new i18n keys to `src/messages/en.json`: `forms.collaborate`, `forms.collaborateTitle`, `forms.collaborateClose`, `dashboard.copyLink`, `dashboard.qrCode`
- [x] T002 [P] Add Arabic equivalents to `src/messages/ar.json`: `forms.collaborate`, `forms.collaborateTitle`, `forms.collaborateClose`, `dashboard.copyLink`, `dashboard.qrCode`

**Checkpoint**: Both locale files updated. `npm run i18n:lint` should pass (no missing keys for the new keys yet, since consumers don't exist yet — this just seeds them).

---

## Phase 2: Foundational (Shared Component — Blocks Both Stories)

**Purpose**: Extract the share dialog logic into a reusable component needed by both US1 (dashboard) and US2 (forms manager). **No user story work can begin until this phase is complete.**

- [x] T003 Create `src/presentation/components/admin/form-share-dialog/index.tsx` — extract the share dialog JSX from `src/presentation/components/admin/form-manager/index.tsx`; accept props `{ open: boolean; onOpenChange: (open: boolean) => void; formId: string; formName?: string }`; internally derive `shareUrl` using `useLocale()` + `window.location.origin`; include QR code render (200×200, level "H"), copy-link input, Download PNG button, and close button; all strings via `useTranslations("sharing")` and `useTranslations("common")` keys

**Checkpoint**: `<FormShareDialog>` renders in isolation with correct QR code and copy-link behavior. The existing `FormManager` share dialog is not yet replaced.

---

## Phase 3: User Story 1 — Dashboard Form Cards QR & Link Quick-Access (Priority: P1) 🎯 MVP

**Goal**: Each form summary card on the admin dashboard shows a "Copy Link" button and a "QR Code" button that opens `<FormShareDialog>`.

**Independent Test**: Open `/admin/dashboard`, locate a form card, click "Copy Link" → clipboard contains `/{locale}/f/{formId}`; click "QR Code" → dialog opens with scannable QR; click "Download PNG" → PNG file is saved.

### Implementation for User Story 1

- [x] T004 [US1] Update `src/presentation/components/admin/dashboard/index.tsx`:
  - Add state: `qrDialogFormId: string | null`, `qrDialogOpen: boolean`
  - In the `cardType === "form"` card branch, add below the metric value: a "Copy Link" `<Button variant="ghost" size="icon">` (use `Copy` icon from lucide-react) that calls `navigator.clipboard.writeText(url)` + `toast.success(t("dashboard.copyLink"))`, and a "QR Code" `<Button variant="ghost" size="icon">` (use `QrCode` icon) that sets `qrDialogFormId` + opens the dialog
  - Import and render `<FormShareDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} formId={qrDialogFormId ?? ""} />` once at the end of the component (outside the card loop)
  - Derive `url` for Copy Link as `${window.location.origin}/${locale}/f/${card.formTemplateId}` (same pattern as existing FormManager)

**Checkpoint**: User Story 1 fully functional. Dashboard form cards have working copy-link and QR dialog. No other page is affected.

---

## Phase 4: User Story 2 — Per-Form Submissions Panel ("Collaborate") (Priority: P1)

**Goal**: Each form card in the Forms Management page has a "Collaborate" button that opens a scoped, paginated, filterable submissions panel for that specific form.

**Independent Test**: Open `/admin/forms`, click "Collaborate" on any form card → panel opens showing only submissions for that form; apply a status filter → list updates; navigate pages if >10 submissions; empty state if no submissions.

### Implementation for User Story 2

- [x] T005 [P] [US2] Update `src/presentation/components/admin/form-manager/index.tsx`:
  - Remove the inline share dialog JSX (the `<Dialog open={isShareOpen}>` block and all associated state: `shareFormId`, `isShareOpen`, `shareUrl`, `isShareLoading`, `qrRef`)
  - Import `<FormShareDialog>` from `@/presentation/components/admin/form-share-dialog`
  - Add state: `shareDialogFormId: string | null`, `shareDialogOpen: boolean`
  - Replace `handleOpenShare(form.id)` call to set `shareDialogFormId = form.id` and `shareDialogOpen = true`
  - Render `<FormShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} formId={shareDialogFormId ?? ""} />` at the bottom
  - Verify existing Share button still works identically

- [x] T006 [P] [US2] Create `src/presentation/components/admin/form-submissions-panel/index.tsx`:
  - Use `<Sheet>` (side="right") from shadcn/ui with a wide width (e.g., `className="w-full sm:max-w-3xl"` on `SheetContent`)
  - Props: `{ open: boolean; onOpenChange: (open: boolean) => void; formId: string; formName: string }`
  - Internal state: `page: number` (default 1), `statusFilter: string` (default "all")
  - On mount and `[page, statusFilter, formId]` change: call `fetchSubmissions(page, statusFilter, "all", formId)` from `useSubmissionsList()`
  - Reset `page` to 1 when `statusFilter` changes or when `formId` changes
  - Render: `<SheetHeader>` with title `t("forms.collaborateTitle", { name: formName })`, a `<Select>` status filter (reuse `dashboard.*` translation keys for status labels), `<SubmissionsTable>` passing `submissions`, `isLoading`, `onDelete={deleteSubmission}`, `onRefresh={() => fetchSubmissions(page, statusFilter, "all", formId)}`, `formNamesById={{ [formId]: formName }}`, `formName={formName}`, plus pagination controls (ChevronLeft/ChevronRight buttons, page/totalPages display) matching the pattern in `AdminDashboard`; empty-state `<div>` with `t("forms.noSubmissions")` (use existing key if present, else add) when `submissions.length === 0 && !isLoading`

- [x] T007 [US2] Update `src/presentation/components/admin/form-manager/index.tsx` (depends on T006):
  - Add state: `collaborateFormId: string | null`, `collaborateFormName: string`, `isCollaborateOpen: boolean`
  - Import `<FormSubmissionsPanel>` from `@/presentation/components/admin/form-submissions-panel`
  - Import `Users` icon from `lucide-react`
  - In each form card's action button row, add a "Collaborate" `<Button variant="ghost" size="icon" title={t("forms.collaborate")}>` with `<Users className="h-4 w-4" />` that sets `collaborateFormId = form.id`, `collaborateFormName = form.name`, `isCollaborateOpen = true`
  - Render `<FormSubmissionsPanel open={isCollaborateOpen} onOpenChange={setIsCollaborateOpen} formId={collaborateFormId ?? ""} formName={collaborateFormName} />` at the bottom

**Checkpoint**: User Story 2 fully functional. "Collaborate" opens a scoped submissions panel per form. Existing share button still works (now using extracted `<FormShareDialog>`).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validate i18n completeness, check that the `forms.noSubmissions` key exists (add if missing), and do a final smoke test.

- [x] T008 Check `src/messages/en.json` and `src/messages/ar.json` for `forms.noSubmissions` — add to both if not present (EN: "No submissions yet for this form", AR: "لا توجد طلبات لهذا النموذج بعد")
- [x] T009 Run `npm run i18n:sync` from repo root — fix any reported missing keys
- [x] T010 Run `npm run i18n:lint` from repo root — must exit with zero warnings/errors
- [x] T011 Manual smoke test per `specs/017-form-links-submissions-panel/quickstart.md`: dashboard copy link, dashboard QR dialog, dashboard QR download, forms page collaborate panel, status filter, pagination, empty state, close behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 run in parallel immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — T003 can start after T001+T002 (or in parallel with Phase 1 if translation keys are seeded first)
- **User Story 1 (Phase 3)**: Depends on T003 (FormShareDialog must exist before dashboard imports it)
- **User Story 2 (Phase 4)**:
  - T005 depends on T003 (FormShareDialog refactor of FormManager)
  - T006 is independent of T003/T005 (creates new file)
  - T007 depends on T006 (FormSubmissionsPanel must exist before FormManager imports it)
  - T004 (US1) and T005+T006 (US2) can run in parallel once T003 is complete
- **Polish (Phase 5)**: Depends on all prior phases

### User Story Dependencies

- **US1 (Phase 3)**: Depends only on Foundational (T003)
- **US2 (Phase 4)**: Depends on Foundational (T003) for T005; T006 is independent; T007 depends on T006

### Within Each User Story

- US1: Single task (T004) — fully self-contained
- US2: T005 and T006 parallel → T007 sequential after T006

---

## Parallel Opportunities

```
Phase 1 (run together):
  T001 — en.json keys
  T002 — ar.json keys

After T003 completes (run together):
  T004 — Dashboard form cards (US1)
  T005 — FormManager share refactor (US2, different concerns)
  T006 — FormSubmissionsPanel new file (US2)

After T006 completes:
  T007 — Add Collaborate button to FormManager (US2)

Phase 5 (sequential for correctness):
  T008 → T009 → T010 → T011
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001, T002)
2. Complete Phase 2 (T003 — FormShareDialog)
3. Complete Phase 3 (T004 — Dashboard cards)
4. **STOP and VALIDATE**: Dashboard QR + copy-link fully works
5. Ship US1 independently

### Incremental Delivery

1. T001 + T002 + T003 → Foundation ready
2. T004 → US1 live on dashboard (MVP!)
3. T005 + T006 → T007 → US2 live on Forms page
4. T008–T011 → i18n clean + smoke test

---

## Notes

- [P] tasks = different files or non-overlapping file sections; can be worked in parallel
- `forms.noSubmissions` key may already exist in en.json/ar.json — check before adding (T008)
- The existing `handleDownloadQR` pattern in `FormManager` should be extracted verbatim into `FormShareDialog` to avoid re-implementing the SVG→canvas→PNG logic
- `useSubmissionsList` already accepts `formId` as the 4th argument — no view-model changes needed
- `SubmissionsTable` accepts a `formNamesById` map; pass `{ [formId]: formName }` to show form name in any rows that reference it
