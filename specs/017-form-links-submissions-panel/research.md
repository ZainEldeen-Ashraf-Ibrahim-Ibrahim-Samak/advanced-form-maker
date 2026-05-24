# Research: Form Quick-Links on Dashboard + Per-Form Submissions Panel

## Finding 1: QR Code Library Already Available

**Decision**: Reuse `qrcode.react` (already installed; `QRCodeSVG` is used in `FormManager`).  
**Rationale**: The FormManager share dialog (`src/presentation/components/admin/form-manager/index.tsx`) already renders a QR code, copies a link, and downloads a PNG — the exact same UX needed on the dashboard. Extracting the shared logic avoids duplication.  
**Alternatives considered**: Installing a different QR library — rejected; constitution prohibits new dependencies unless strictly required.

## Finding 2: API Already Supports formId Filtering

**Decision**: Use existing `/api/admin/submissions?formId=<id>` endpoint.  
**Rationale**: `src/app/api/admin/submissions/route.ts` already reads `searchParams.get("formId")` and passes it to `repo.listPaginated`. The view-model `useSubmissionsList` (`src/presentation/view-models/use-submissions-list.ts`) already accepts an optional `formId` argument and appends it to the URL. Zero new backend code is required.  
**Alternatives considered**: Creating a dedicated `GET /api/admin/forms/[formId]/submissions` endpoint — rejected; the existing endpoint already handles this case, so a new route would duplicate logic.

## Finding 3: Submissions Table Component Is Reusable

**Decision**: Render `<SubmissionsTable>` inside the per-form dialog, passing the scoped data from `useSubmissionsList`.  
**Rationale**: `SubmissionsTable` (`src/presentation/components/admin/submissions-table/index.tsx`) accepts `submissions`, `isLoading`, `onDelete`, `onRefresh`, `formNamesById`, and `formName` props. It can be embedded in a Sheet/Dialog with minimal wrapper state.  
**Alternatives considered**: Building a custom simpler list — rejected; reusing the existing component ensures consistent UI and behavior (status badges, review modal, export, etc.).

## Finding 4: URL Format

**Decision**: Public form URL is `${window.location.origin}/${locale}/f/${formId}` — matching the existing share dialog exactly.  
**Rationale**: `FormManager.handleOpenShare` already constructs this URL. No guess-work.

## Finding 5: Shared QR Dialog Pattern

**Decision**: Extract a `<FormShareDialog>` component usable from both the dashboard and the forms manager.  
**Rationale**: Both features need identical QR + copy-link + download behavior. A single extracted component eliminates the duplicate dialog state (`shareFormId`, `shareUrl`, `qrRef`, `isShareOpen`, download handler) currently embedded in FormManager. The dashboard cards will import it; FormManager will also switch to it.  
**Alternatives considered**: Inline duplication in each consumer — rejected; violates DRY and makes future changes harder.

## Finding 6: i18n Keys Needed

All new UI strings must be added to `src/messages/en.json` and `src/messages/ar.json`.

New keys required:
- `forms.collaborate` — label for the Collaborate button
- `forms.collaborateTitle` — dialog/sheet title: "Submissions for {name}"
- `forms.collaborateClose` — close action
- `dashboard.copyLink` — Copy Link tooltip/button
- `dashboard.qrCode` — QR Code tooltip/button
- `sharing.linkCopied` — already likely exists; verify during implementation

Existing `sharing.*` namespace already contains `title`, `publicLink`, `qrTitle`, `dynamicLink`, `downloadPng` — reusable as-is.

## Finding 7: No Constitution Violations

- No new npm packages: `qrcode.react` and `shadcn/ui` components already in use.
- No new Mongoose models or repositories.
- MVVM flow maintained: view-model → component (no business logic in components).
- All strings will use translation keys (constitution §V).
- No heavy migrations or e2e tests.
