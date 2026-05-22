# Tasks: Fix Hydration & Application Stability

**Input**: Design documents from `specs/005-fix-hydration-stability/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this is a bug-fix patch on an existing codebase.

- [x] T001 Verify dev server is running and current branch is `005-fix-hydration-stability`

---

## Phase 2: User Story 1 — Stable Page Rendering Without Hydration Errors (Priority: P1) 🎯 MVP

**Goal**: Eliminate all hydration mismatch warnings by removing blanket `suppressHydrationWarning` from components that don't need it, while keeping it only where server/client divergence is expected (`<html>` and `<body>` for next-themes).

**Independent Test**: Open browser console, navigate to admin dashboard, submission form, and public pages — zero hydration warnings, all interactive elements respond on first click.

### Implementation for User Story 1

- [x] T002 [P] [US1] Remove `suppressHydrationWarning` from Button component in `src/components/ui/button.tsx`
- [x] T003 [P] [US1] Remove `suppressHydrationWarning` from Input component in `src/components/ui/input.tsx`
- [x] T004 [P] [US1] Remove `suppressHydrationWarning` from DropdownMenuTrigger and ensure `mounted` guard covers theme-dependent class rendering in `src/presentation/components/shared/theme-toggle/index.tsx`
- [x] T005 [P] [US1] Remove `suppressHydrationWarning` from DropdownMenuTrigger in `src/presentation/components/shared/language-switcher/index.tsx`
- [x] T006 [US1] Verify `suppressHydrationWarning` remains ONLY on `<html>` and `<body>` in `src/app/[locale]/layout.tsx` (no change expected — validation only)

**Checkpoint**: ✅ Zero hydration warnings expected across all pages.

---

## Phase 3: User Story 2 — Submission Form Does Not Auto-Refresh (Priority: P1)

**Goal**: Stabilize the `useSubmission` hook so the form's data-fetching logic runs only once on initial load, and SSE events are queued during active editing.

**Independent Test**: Open a submission form, type for 60+ seconds — no re-fetches, no page reloads. Submit and get smooth client-side navigation.

### Implementation for User Story 2

- [x] T007 [US2] Stabilize `fetchContent` dependency array by using a ref for draft state check instead of reactive draft values in `src/presentation/view-models/use-submission.ts`
- [x] T008 [US2] Queue SSE `STATUS_CHANGED` events during active editing and only process them after submit/navigate in `src/presentation/view-models/use-submission.ts`
- [x] T009 [US2] Replace `window.location.reload()` in `resubmitForm` with client-side state refresh in `src/presentation/view-models/use-submission.ts`

**Checkpoint**: ✅ Form stable, smooth client-side transitions on submit/resubmit.

---

## Phase 4: User Story 3 — Delete Confirmation Dialog Opens Correctly (Priority: P2)

**Goal**: Decouple the AlertDialog from the DropdownMenu so the confirmation dialog opens reliably and stays visible until user interaction.

**Independent Test**: Click three-dot menu on any submission → click Delete → confirmation dialog opens and remains visible until Cancel or Confirm is clicked.

### Implementation for User Story 3

- [x] T010 [US3] Decouple AlertDialog from DropdownMenu by extracting delete dialog state to a controlled pattern outside the dropdown in `src/presentation/components/admin/submissions-table/index.tsx`

**Checkpoint**: ✅ Delete dialog renders independently of dropdown lifecycle.

---

## Phase 5: User Story 4 — Database Connection Efficiency (Priority: P2)

**Goal**: Add connection state validation, retry limits with exponential back-off, and logging to prevent infinite reconnection loops.

**Independent Test**: Start the app, make 10 API calls, check server logs — only 1 connection establishment.

### Implementation for User Story 4

- [x] T011 [US4] Add connection state validation (`readyState` check), max 3 retry attempts with exponential back-off, and connection logging in `src/lib/db.ts`

**Checkpoint**: ✅ Single connection per process, retry limits enforced.

---

## Phase 6: Polish & Verification

**Purpose**: Cross-cutting validation and final build check.

- [x] T012 Browser verification — open all major pages (dashboard, submissions, form) and confirm zero console warnings/errors
- [x] T013 Form stability verification — fill out a submission form for 2+ minutes, submit, confirm smooth transition
- [x] T014 Delete modal verification — test delete workflow on submissions table
- [x] T015 MongoDB logs verification — confirm single connection per session across 10+ API calls
- [x] T016 [Principle VIII] Execute full production build (`npm run build`) and confirm zero TypeScript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1 — Hydration)**: Depends on Phase 1 — all tasks within are parallelizable [P]
- **Phase 3 (US2 — Form Refresh)**: Depends on Phase 1 — independent of Phase 2
- **Phase 4 (US3 — Delete Modal)**: Depends on Phase 1 — independent of Phases 2-3
- **Phase 5 (US4 — MongoDB)**: Depends on Phase 1 — independent of Phases 2-4
- **Phase 6 (Polish)**: Depends on ALL previous phases

### User Story Dependencies

- **US1 (Hydration)**: No dependencies on other stories
- **US2 (Form Refresh)**: No dependencies on other stories
- **US3 (Delete Modal)**: No dependencies on other stories
- **US4 (MongoDB)**: No dependencies on other stories

All 4 user stories are fully independent and can be executed in parallel.

### Parallel Opportunities

```bash
# All hydration fixes (Phase 2) can run in parallel:
T002, T003, T004, T005 — different files, no shared state

# All user stories (Phases 2-5) can run in parallel:
Phase 2 (Hydration) || Phase 3 (Form) || Phase 4 (Delete) || Phase 5 (MongoDB)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify branch)
2. Complete Phase 2: US1 — Hydration fixes
3. **STOP and VALIDATE**: Zero hydration warnings in browser

### Incremental Delivery

1. US1 (Hydration) → Validate → All interactive elements work
2. US2 (Form Refresh) → Validate → Form stable for 10+ min
3. US3 (Delete Modal) → Validate → Dialog opens reliably
4. US4 (MongoDB) → Validate → Single connection per session
5. Polish → Build → Ship

---

## Notes

- [P] tasks = different files, no dependencies
- All user stories are fully independent bug fixes — no cross-story dependencies
- Each fix is a targeted, minimal patch — no architectural refactoring
- Commit after each completed user story phase
- Stop at any checkpoint to validate independently
