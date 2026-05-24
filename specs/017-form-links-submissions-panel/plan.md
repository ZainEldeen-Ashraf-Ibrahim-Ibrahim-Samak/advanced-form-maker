# Implementation Plan: Form Quick-Links on Dashboard + Per-Form Submissions Panel

**Branch**: `main` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/017-form-links-submissions-panel/spec.md`

## Summary

Add QR-code / copy-link quick-access buttons to each form summary card on the admin dashboard, and add a "Collaborate" button to each form card on the Forms Management page that opens a scoped submissions panel. Both features are purely UI-layer additions: no new API endpoints, no new Mongoose schemas, no new domain use-cases. The existing `/api/admin/submissions?formId=` endpoint, `useSubmissionsList` view-model, `QRCodeSVG` library, and `SubmissionsTable` component are all reused as-is.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20  
**Primary Dependencies**: Next.js 14 App Router, `qrcode.react` (already installed), shadcn/ui, next-intl, Tailwind CSS  
**Storage**: MongoDB via Mongoose (no changes)  
**Testing**: Existing project test suite (`npm test`)  
**Target Platform**: Web — admin dashboard (authenticated, desktop-first)  
**Project Type**: Web application (full-stack Next.js)  
**Performance Goals**: Panel first-page load ≤ 2 s; QR dialog opens instantly (client-side render)  
**Constraints**: Zero new npm packages; all UI strings via i18n keys; RTL safe  
**Scale/Scope**: Admin-only UI; affects 2 existing page components + 2 new shared components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance? — New components consume existing view-models and API; no business logic in UI components.
- [x] II. Technology Stack Mandate followed? — No new npm packages. Uses `qrcode.react`, `shadcn/ui`, `next-intl` already in the stack.
- [x] V. Internationalization (AR/EN) & RTL support planned? — All new strings added to both `en.json` and `ar.json`; validated with `npm run i18n:sync && npm run i18n:lint`.
- [x] VIII. Heavy processes (build, e2e, migrations) deferred? — No schema changes; no migrations; no e2e tests introduced.

*Post-design re-check: All gates still pass. Feature is purely UI-additive.*

**No violations — Complexity Tracking table omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/017-form-links-submissions-panel/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── submissions-formid-filter.md
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── messages/
│   ├── en.json          MODIFIED — new i18n keys
│   └── ar.json          MODIFIED — Arabic equivalents
└── presentation/
    └── components/admin/
        ├── form-share-dialog/
        │   └── index.tsx          NEW — shared QR + copy-link dialog
        ├── form-submissions-panel/
        │   └── index.tsx          NEW — per-form submissions sheet
        ├── dashboard/
        │   └── index.tsx          MODIFIED — add QR/link actions to form cards
        └── form-manager/
            └── index.tsx          MODIFIED — add Collaborate button; use FormShareDialog
```

## Phase 0: Research

**Status: COMPLETE** → see [research.md](./research.md)

All unknowns resolved. Key findings:
- `qrcode.react` already installed and in use — no new dependency.
- `/api/admin/submissions?formId=` already implemented end-to-end.
- `useSubmissionsList` already accepts `formId` argument.
- `SubmissionsTable` is reusable as-is.
- No new API routes, schemas, or repositories needed.

## Phase 1: Design & Contracts

**Status: COMPLETE**

### Step 1 — New Shared Component: `<FormShareDialog>`

**File**: `src/presentation/components/admin/form-share-dialog/index.tsx`

Extract from the existing inline share dialog in `FormManager`. Accepts:
```typescript
{ open: boolean; onOpenChange: (open: boolean) => void; formId: string; formName?: string }
```

Internally derives `shareUrl = origin + "/" + locale + "/f/" + formId`.  
Renders: QR code (200 × 200, high-error-correction), copy-link input, Download PNG button.  
Download logic: existing SVG → canvas → PNG pattern from `FormManager`.

### Step 2 — Dashboard Form Cards (`AdminDashboard`)

**File**: `src/presentation/components/admin/dashboard/index.tsx`

In the `cardType === "form"` branch of the card grid, add below the submission count:

```
[Copy Link icon button]  [QR Code icon button → opens FormShareDialog]
```

Copy Link: calls `navigator.clipboard.writeText(url)` + `toast.success(t("dashboard.copyLink"))`.  
QR Code: sets `qrDialogFormId` state + opens `<FormShareDialog>`.

State additions to `AdminDashboard`:
- `qrDialogFormId: string | null`
- `qrDialogOpen: boolean`

### Step 3 — Forms Manager Collaborate Button (`FormManager`)

**File**: `src/presentation/components/admin/form-manager/index.tsx`

Replace the inline share dialog JSX with `<FormShareDialog>` (import the extracted component).  
Add a "Collaborate" icon button (e.g., `Users` icon from lucide-react — already installed) to each form card's action row.

State additions to `FormManager`:
- `collaborateFormId: string | null`
- `collaborateFormName: string`
- `isCollaborateOpen: boolean`

Renders `<FormSubmissionsPanel>` when `isCollaborateOpen`.

### Step 4 — New Component: `<FormSubmissionsPanel>`

**File**: `src/presentation/components/admin/form-submissions-panel/index.tsx`

Renders as a `<Sheet side="right" size="lg">` (or `<Dialog>` — prefer Sheet for table-heavy content).

Internal state:
- `page: number` (default 1, reset on filter change)
- `statusFilter: string` (default "all")

On mount and on `[page, statusFilter]` change: calls `fetchSubmissions(page, statusFilter, "all", formId)`.

Renders:
1. Sheet title: `t("forms.collaborateTitle", { name: formName })`
2. Status filter `<Select>` (reuses dashboard translation keys for status labels)
3. `<SubmissionsTable>` with scoped data
4. Pagination controls (same pattern as `AdminDashboard`)
5. Empty state if `submissions.length === 0 && !isLoading`

### Step 5 — i18n Keys

**Files**: `src/messages/en.json`, `src/messages/ar.json`

Keys to add:

| Key | EN | AR |
|-----|----|----|
| `forms.collaborate` | Collaborate | تعاون |
| `forms.collaborateTitle` | Submissions: {name} | الطلبات: {name} |
| `forms.collaborateClose` | Close | إغلاق |
| `dashboard.copyLink` | Copy Link | نسخ الرابط |
| `dashboard.qrCode` | QR Code | رمز QR |

Post-implementation: run `npm run i18n:sync && npm run i18n:lint` — must pass with zero warnings.

## Implementation Sequence (for /speckit.tasks)

1. Add i18n keys to `en.json` and `ar.json`
2. Create `form-share-dialog/index.tsx` (extract + generalize from `FormManager`)
3. Update `form-manager/index.tsx`: replace inline share dialog with `<FormShareDialog>`
4. Update `dashboard/index.tsx`: add Copy Link + QR Code actions to form cards
5. Create `form-submissions-panel/index.tsx`
6. Update `form-manager/index.tsx`: add Collaborate button + `<FormSubmissionsPanel>`
7. Run `npm run i18n:sync && npm run i18n:lint` — verify zero missing keys
8. Manual smoke test (see quickstart.md)
