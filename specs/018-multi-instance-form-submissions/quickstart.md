# Quickstart: Multi-Instance Form Submissions

**Feature**: 018-multi-instance-form-submissions
**Date**: 2026-06-28

---

## How to Test This Feature End-to-End

### 1. Enable multi-instance mode on a form

1. Open the admin panel → Forms.
2. Click the edit (pencil) icon on any form.
3. Enable the **"Allow Multiple Submissions per Session"** toggle.
4. Optionally set a **Max Instances** number (1–50).
5. Click **Save**.

### 2. Open the form as a client

1. Copy the form share link and open it in a browser.
2. You should see the normal form fields, plus an **"Add Another"** button at the bottom.

### 3. Fill multiple instances manually

1. Fill Instance 1's fields.
2. Click "Add Another" → Instance 2 appears (empty).
3. Fill Instance 2's fields.
4. Click "Submit All".
5. In the admin submissions table, you should see **two separate rows** each with the same Session ID.

### 4. Test AI autofill with a multi-record document

1. Open the multi-instance form as a client.
2. Upload a CSV or spreadsheet with 3 data rows.
3. AI autofill should create 3 instances, each pre-populated.
4. Review and submit.

### 5. Validate i18n

```bash
npm run i18n:sync
npm run i18n:lint
```
Both commands must pass with zero errors.

---

## Key Files Changed

| Layer | File | Change |
|-------|------|--------|
| Model | `src/data/models/form-template.model.ts` | Add `multiInstanceEnabled`, `maxInstances` |
| Model | `src/data/models/submission.model.ts` | Add `sessionId` |
| Entity | `src/domain/entities/form-template.ts` | Add fields to interface + UpdateInput |
| Entity | `src/domain/entities/submission.ts` | Add `sessionId` |
| Entity | `src/domain/entities/ai-extraction.ts` | No change (API envelope only) |
| Repo | `src/data/repositories/mongo-form-template-repository.ts` | Map new fields |
| Repo | `src/data/repositories/mongo-submission-repository.ts` | Map `sessionId` |
| Validation | `src/lib/validations.ts` | Add Zod rules |
| Admin UI | `src/presentation/components/admin/form-manager/index.tsx` | Add toggle + max input |
| View Model | `src/presentation/view-models/use-form-manager.ts` | Pass new fields to PATCH |
| View Model | `src/presentation/view-models/use-submission.ts` | Expose `multiInstanceEnabled`, `maxInstances` |
| Client UI | `src/presentation/components/client/submission-form/index.tsx` | Multi-instance UX |
| AI Extraction | `src/data/services/ai-extraction-service.ts` | Multi-record prompt + response |
| AI View Model | `src/presentation/view-models/use-ai-extraction.ts` | Handle `records[]` |
| Admin Table | `src/presentation/components/admin/submissions-table/index.tsx` | Session ID column |
| i18n | `src/messages/en.json` + `ar.json` | New keys |
