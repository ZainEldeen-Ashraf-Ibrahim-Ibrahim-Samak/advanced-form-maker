# Quickstart: Form Quick-Links on Dashboard + Per-Form Submissions Panel

## What This Feature Adds

1. **Dashboard form cards** get "Copy Link" and "QR Code" inline action buttons.
2. **Forms Management page** form cards get a "Collaborate" button that opens a per-form submissions panel.

## Files to Create

| File | Purpose |
|------|---------|
| `src/presentation/components/admin/form-share-dialog/index.tsx` | Shared QR + copy-link dialog (extracted from FormManager, used by both dashboard and forms page) |
| `src/presentation/components/admin/form-submissions-panel/index.tsx` | Per-form submissions sheet/dialog for the Collaborate feature |

## Files to Modify

| File | Change |
|------|--------|
| `src/presentation/components/admin/dashboard/index.tsx` | Add Copy Link + QR Code buttons to each form-type card; import `FormShareDialog` |
| `src/presentation/components/admin/form-manager/index.tsx` | Add Collaborate button to each form card; replace inline share dialog with `FormShareDialog`; import `FormSubmissionsPanel` |
| `src/messages/en.json` | Add `forms.collaborate`, `forms.collaborateTitle`, `forms.collaborateClose`, `dashboard.copyLink`, `dashboard.qrCode` |
| `src/messages/ar.json` | Arabic equivalents for all new keys |

## No Changes Required

- Domain layer (entities, use cases, repositories)
- API routes (existing `/api/admin/submissions?formId=` already works)
- Mongoose schemas (no new fields)
- View models (existing `useSubmissionsList` already accepts `formId`)

## Key Integration Points

```
Dashboard card (form type)
  └─ onClick "QR Code" → <FormShareDialog open formId={card.formTemplateId} />
  └─ onClick "Copy Link" → navigator.clipboard.writeText(url) + toast

FormManager card
  └─ onClick "Collaborate" → <FormSubmissionsPanel open formId={form.id} formName={form.name} />
  └─ onClick "Share" (existing) → <FormShareDialog open formId={form.id} /> (replaces inline dialog)

FormSubmissionsPanel
  └─ useSubmissionsList(page, statusFilter, "all", formId)
  └─ <SubmissionsTable submissions={...} />
```

## i18n Validation

After adding keys, run:

```bash
npm run i18n:sync
npm run i18n:lint
```

Both commands must pass with zero missing/unknown keys before the PR is submitted.

## Development Sequence

1. Add i18n keys to both `en.json` and `ar.json`.
2. Create `<FormShareDialog>` by extracting from `FormManager` (copy the share dialog JSX + download logic; accept `formId`/`formName` props).
3. Update `FormManager` to use `<FormShareDialog>` instead of the inline dialog.
4. Add `<FormShareDialog>` trigger (Copy Link + QR Code buttons) to each form card in `AdminDashboard`.
5. Create `<FormSubmissionsPanel>` as a `<Sheet>` wrapping `<SubmissionsTable>` with `useSubmissionsList` scoped to `formId`.
6. Add Collaborate button to each form card in `FormManager` that opens `<FormSubmissionsPanel>`.
7. Run `npm run i18n:sync && npm run i18n:lint` — fix any missing keys.
8. Manual smoke test: dashboard card QR, dashboard copy link, forms page collaborate panel.
