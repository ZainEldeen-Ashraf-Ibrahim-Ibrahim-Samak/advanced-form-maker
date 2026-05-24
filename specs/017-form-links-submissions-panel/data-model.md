# Data Model: Form Quick-Links on Dashboard + Per-Form Submissions Panel

## Existing Entities Used (No Changes Required)

### FormTemplate
Already defined in `src/domain/entities/form-template.ts`.

| Field | Type | Relevance |
|-------|------|-----------|
| `id` | `string` | Used to construct public URL and filter submissions |
| `name` | `string` | Displayed in the Collaborate panel title |
| `isLocked` | `boolean` | Quick-link buttons remain active even for locked forms |

### Submission
Already defined in `src/domain/entities/submission.ts`.

| Field | Type | Relevance |
|-------|------|-----------|
| `id` | `string` | Row identity in submissions table |
| `formTemplateId` | `string` | Filter key: scopes submissions to a specific form |
| `status` | `string` | Shown as badge; used for status filter |
| `createdAt` | `Date` | "Submission date" column |

### FormSummaryCardItem (DashboardCard)
Already defined in `src/domain/use-cases/admin/manage-dashboard-cards.ts`.

| Field | Type | Relevance |
|-------|------|-----------|
| `formTemplateId` | `string` | Used to construct QR/link URL on the dashboard card |
| `name` | `string` | Fallback display name for the share dialog title |
| `displayNameEn / displayNameAr` | `string \| null` | Preferred display name in the share dialog |

---

## New Component Props (Interface Contracts)

### `<FormShareDialog>` (new shared component)

```typescript
interface FormShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;       // Used to build the URL
  formName: string;     // For display in the dialog title
}
```

No data persistence. Derives the URL client-side from `window.location.origin + locale + formId`.

### `<FormSubmissionsPanel>` (new component)

```typescript
interface FormSubmissionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;       // Scopes submissions fetch
  formName: string;     // For panel title
}
```

Internal state:
- `page: number` — current pagination page (default 1)
- `statusFilter: string` — "all" | "pending" | "draft" | "viewed" | "needs_rewrite"

Uses `useSubmissionsList` hook (already accepts `formId`). Resets to page 1 on filter change.

---

## State Transitions

No new state transitions. Submissions status lifecycle is unchanged; this feature only adds read/filter access to the existing submission records.

---

## No New Schema Changes

This feature is purely additive at the UI layer. No Mongoose schema changes, no new collections, no migrations.
