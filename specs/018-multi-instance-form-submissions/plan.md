# Implementation Plan: Multi-Instance Form Submissions

**Branch**: `018-multi-instance-form-submissions` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-multi-instance-form-submissions/spec.md`

---

## Summary

Enable form-level multi-instance submission mode so that a client (or AI autofill) can fill and submit multiple independent records in a single session. Each record is saved as a separate `Submission` document — preserving full compatibility with the admin table, exports, and review pipeline. The feature is gated by a toggle in admin form settings and is entirely additive (no breaking changes, no migrations).

---

## Technical Context

**Language/Version**: TypeScript 5 / Node 20 (Next.js 14 App Router)
**Primary Dependencies**: Mongoose 8, Zod, shadcn/ui, next-intl, Gemini API (via existing AI extraction service)
**Storage**: MongoDB via Mongoose — additive fields only, `default: null/false`
**Testing**: Manual end-to-end per quickstart.md; `npm run i18n:sync && npm run i18n:lint` for i18n validation
**Target Platform**: Web (Next.js App Router, SSR + client components)
**Project Type**: Full-stack web application (admin + client-facing)
**Performance Goals**: Submit N instances with no perceptible extra latency vs. a single submission (parallel POSTs)
**Constraints**: Zero new npm packages; backward-compatible with all existing single-instance submissions
**Scale/Scope**: Affects 3 layers (data, domain, presentation) across ~15 files

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Clean Architecture (MVVM)** — Full MVVM chain maintained: Mongoose model → domain entity → repository mapper → (use-case / API route) → view-model → component. No business logic in shared components.
- [x] **II. Technology Stack Mandate** — Zero new npm dependencies. `uuid` is already in the project (used elsewhere). Uses existing Mongoose, Zod, shadcn/ui, next-intl, Gemini API.
- [x] **V. Internationalization (AR/EN) + RTL** — All new UI labels ("Add Another", "Remove", "Record N of M", "Allow Multiple Submissions", max-instances input) go through `t(key)` translation hooks. Keys added to both `en.json` and `ar.json`. `npm run i18n:sync` + `npm run i18n:lint` run after implementation.
- [x] **VIII. Heavy processes deferred** — All new Mongoose fields use `default: false` or `default: null`. No migration script. No e2e tests in scope. No complex build steps.

---

## Project Structure

### Documentation (this feature)

```text
specs/018-multi-instance-form-submissions/
├── plan.md              # This file
├── research.md          # Phase 0 — decision log
├── data-model.md        # Phase 1 — entity + schema changes
├── quickstart.md        # Phase 1 — test guide + file map
├── contracts/
│   └── api-contracts.md # Phase 1 — API contract diffs
└── tasks.md             # Phase 2 — /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── data/
│   ├── models/
│   │   ├── form-template.model.ts     [MODIFY] add multiInstanceEnabled, maxInstances
│   │   └── submission.model.ts        [MODIFY] add sessionId
│   ├── repositories/
│   │   ├── mongo-form-template-repository.ts  [MODIFY] map new fields
│   │   └── mongo-submission-repository.ts     [MODIFY] map sessionId
│   └── services/
│       └── ai-extraction-service.ts   [MODIFY] multi-record prompt + response
├── domain/
│   └── entities/
│       ├── form-template.ts           [MODIFY] add fields to interface + UpdateInput
│       ├── submission.ts              [MODIFY] add sessionId
│       └── ai-extraction.ts          [NO CHANGE — API envelope only]
├── lib/
│   └── validations.ts                 [MODIFY] add Zod rules for new fields
├── presentation/
│   ├── view-models/
│   │   ├── use-form-manager.ts        [MODIFY] pass multiInstanceEnabled + maxInstances to PATCH
│   │   ├── use-submission.ts          [MODIFY] expose multiInstanceEnabled + maxInstances
│   │   └── use-ai-extraction.ts       [MODIFY] handle records[] from AI response
│   └── components/
│       ├── admin/
│       │   ├── form-manager/index.tsx             [MODIFY] add toggle + max-instances input
│       │   └── submissions-table/index.tsx        [MODIFY] add Session ID column
│       └── client/
│           └── submission-form/
│               └── index.tsx                      [MODIFY] multi-instance UX (Add Another, Remove, counters, submit-all)
└── messages/
    ├── en.json                        [MODIFY] new i18n keys
    └── ar.json                        [MODIFY] new i18n keys (Arabic + RTL)
```

**Structure Decision**: Single Next.js project. Standard App Router layout. No new directories required.

---

## Implementation Phases

### Phase A — Data Layer (do first; no UI risk)

1. **`src/data/models/form-template.model.ts`** — Add `multiInstanceEnabled: Boolean (default false)` and `maxInstances: Number (default null)` to both `IFormTemplate` and `formTemplateSchema`.
2. **`src/data/models/submission.model.ts`** — Add `sessionId: String (default null, index true)` to both `ISubmission` and `submissionSchema`.
3. **`src/domain/entities/form-template.ts`** — Add `multiInstanceEnabled: boolean` and `maxInstances: number | null` to `FormTemplate` interface and `UpdateFormTemplateInput`.
4. **`src/domain/entities/submission.ts`** — Add `sessionId: string | null` to `Submission` interface.
5. **`src/data/repositories/mongo-form-template-repository.ts`** — Map new fields in `toEntity()`.
6. **`src/data/repositories/mongo-submission-repository.ts`** — Map `sessionId` in `toEntity()`.
7. **`src/lib/validations.ts`** — Add `multiInstanceEnabled: z.boolean().optional()` and `maxInstances: z.number().int().min(1).max(50).nullable().optional()` and `sessionId: z.string().max(36).nullable().optional()` to the relevant Zod schemas.

### Phase B — Admin Settings UI

8. **`src/messages/en.json` + `ar.json`** — Add all new translation keys before touching any UI.
9. **`src/presentation/view-models/use-form-manager.ts`** — Add `multiInstanceEnabled` and `maxInstances` to the `updateForm` input type and the PATCH call body.
10. **`src/presentation/components/admin/form-manager/index.tsx`** — Add state variables, a Switch toggle for `multiInstanceEnabled`, and a conditional number input for `maxInstances` (shown when toggle is on). Follow exact same pattern as the `canAddMoreReplies` toggle already in this file.

### Phase C — Client Form Multi-Instance UX

11. **`src/presentation/view-models/use-submission.ts`** — Expose `multiInstanceEnabled` and `maxInstances` from the loaded form template data (same pattern as `canAddMoreReplies` and `aiAutoFillEnabled`).
12. **`src/presentation/components/client/submission-form/index.tsx`** — Add `instances` array state. When `multiInstanceEnabled` is true: render each instance as a collapsible/labelled card ("Record 1 of N"), show Add Another button (disabled at limit), show Remove button on all but the last, validate each instance independently on submit, generate a UUID `sessionId` and POST each instance sequentially or in parallel, handle partial failures.

### Phase D — AI Autofill Multi-Record

13. **`src/data/services/ai-extraction-service.ts`** — When `multiInstanceEnabled=true` is passed in extraction options, modify the Gemini prompt to instruct the model to return a `records` array for tabular documents. Parse the response accordingly.
14. **`src/presentation/view-models/use-ai-extraction.ts`** — After extraction, check for `records` array. If present and form is multi-instance, call a new `onApplyMultipleRecords` callback with the array. If absent, fall back to today's single-record `applyExtraction` behaviour.
15. **`src/presentation/components/client/submission-form/index.tsx`** — Add `onApplyMultipleRecords` handler that maps each `ExtractionResult` to a new `FormInstance`, capped at `maxInstances`, and replaces the current instances array.

### Phase E — Admin Table Session ID Column

16. **`src/presentation/components/admin/submissions-table/index.tsx`** — Add a "Session" column that shows a short truncated `sessionId` (first 8 chars) with a tooltip for the full ID. Column is hidden when no submissions in the current view have a `sessionId`. This is additive and does not change the existing submission detail view.

### Phase F — i18n Validation

17. Run `npm run i18n:sync` and `npm run i18n:lint` — must produce zero errors/warnings.

---

## Constitution Check (Post-Design)

- [x] **I. MVVM** — Each layer change is in its proper layer. The `FormInstance` transient type lives in the component that owns it and is not leaked into view-models or repositories.
- [x] **II. Stack** — No new packages added.
- [x] **V. i18n** — All strings externalised. AR translations provided. Scripts pass.
- [x] **VIII. Deferred** — All new DB fields have `default: null/false`. No migration. No e2e.

---

## Verification Plan

### Automated
```bash
npm run i18n:sync
npm run i18n:lint
npm run build   # TypeScript compilation — zero new errors
```

### Manual (per quickstart.md)
1. Enable multi-instance on a form → verify setting persists.
2. Open form as client → add 3 instances → submit → verify 3 rows in admin table with same Session ID.
3. Remove an instance → verify correct count.
4. Hit the max instances limit → verify Add Another is disabled.
5. Submit with one invalid instance → verify blocking + highlighting.
6. Upload a 3-row CSV → verify AI creates 3 pre-filled instances.
7. Verify existing single-instance forms are completely unaffected.
8. Verify export (PDF/Excel) shows one row per instance.
