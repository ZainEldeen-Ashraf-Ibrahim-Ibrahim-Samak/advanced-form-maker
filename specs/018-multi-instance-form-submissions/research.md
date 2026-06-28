# Research: Multi-Instance Form Submissions

**Feature**: 018-multi-instance-form-submissions
**Date**: 2026-06-28
**Status**: Complete — all unknowns resolved

---

## Decision Log

### D-001: Multi-Instance Storage Strategy

**Decision**: Each form instance is saved as a fully independent `Submission` document in MongoDB, linked to its siblings via a new optional `sessionId` field (UUID string, `default: null`).

**Rationale**: The existing admin submissions table, submission review, export pipeline, and status management all operate on individual `Submission` documents. Storing instances as sub-documents or arrays on a parent would require rewriting the entire admin layer. Saving each as a standalone submission requires zero changes to the admin read path — only the creation path changes.

**Alternatives Considered**:
- *Sub-document array on a parent Submission*: Rejected — would break the existing admin table (which expects one row = one submission), require migration, and complicate export.
- *Separate `SubmissionSession` collection*: Rejected — adds a join that would need to be threaded through every query.

---

### D-002: Multi-Instance Setting on FormTemplate

**Decision**: Add two new optional fields to `FormTemplate`: `multiInstanceEnabled: boolean` (default `false`) and `maxInstances: number` (default `null` → falls back to system cap of 50). Both are additive fields with `default: null/false` per the Constitution (Principle VIII).

**Rationale**: The form already carries `canAddMoreReplies` (allow resubmissions after completion) and `aiAutoFillEnabled` (AI toggle). The pattern of boolean toggles + optional config on `FormTemplate` is established. `multiInstanceEnabled` is distinct from `canAddMoreReplies`: the latter lets someone start a NEW form session after a prior submission; the former lets them fill MULTIPLE records in a SINGLE session.

**Alternatives Considered**:
- *Reuse `canAddMoreReplies` for this purpose*: Rejected — semantically different. `canAddMoreReplies` is about re-entering the form post-completion; multi-instance is about filling multiple records before first submit.

---

### D-003: Client-Side Instance State Architecture

**Decision**: The submission form `index.tsx` will hold an array of instance states. Each instance contains its own `formData`, `contactRecords`, and `validationErrors`. The existing `useSubmission` view-model manages a single instance's state; multi-instance wraps multiple copies of this logical state in `SubmissionForm` itself (not in the view-model), controlled by a local `instances` array. This avoids refactoring the entire `useSubmission` hook.

**Rationale**: `useSubmission` is large (~800 lines) and manages complex lifecycle including token validation, draft auto-save, and resubmission. Forking or extending it to track N instances would be high-risk. Instead, `SubmissionForm` manages the array of instances as plain state objects, delegating the final submit to `submitForm` called once per instance in sequence.

**Alternatives Considered**:
- *Extend `useSubmission` to be "multi-aware"*: Rejected — high refactor risk, large blast radius.
- *Multiple mounted `useSubmission` instances*: Rejected — each instance fetches the form template again, causing N network requests.

---

### D-004: AI Autofill Multi-Record Protocol

**Decision**: Extend the AI extraction API response shape to include an optional `records` array (`ExtractionResult[]`). When `records.length > 1` and the form has `multiInstanceEnabled`, the front-end creates one instance per record. When `records` is absent or has 1 entry, behavior is identical to today. The `ExtractionResult` entity itself is not changed — `records` is an optional addition to the API response envelope only.

**Rationale**: The AI extraction service at `/api/ai-extraction` returns a single `ExtractionResult`. For tabular documents (CSV/spreadsheet), the Gemini prompt can be extended to extract multiple records and return them as an array. The existing single-record path stays unchanged; the multi-record path is additive.

**Alternatives Considered**:
- *Always return an array, even for single records*: Rejected — would require updating all existing consumers of the extraction API.
- *Separate "multi-extract" endpoint*: Rejected — unnecessary split; same Gemini call can handle both, controlled by `multiInstanceEnabled` passed as a hint in the prompt.

---

### D-005: Session ID Generation

**Decision**: `sessionId` is a UUID v4 string generated client-side at the time the user clicks "Submit" (or equivalently, at the start of the batch save). It is passed in the request body for each instance. Server does no special processing — it simply stores whatever `sessionId` is provided (or null for non-multi submissions).

**Rationale**: Simple, no extra round-trip, no server-side session management required.

---

### D-006: Constitution Compliance

**Decision**: All checklist items pass with the following notes:

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture (MVVM) | ✅ Pass | Schema → entity → repo → use-case → API route → view-model → component chain maintained |
| II. Technology Stack | ✅ Pass | No new npm dependencies. Uses existing Mongoose, Zod, shadcn/ui, Next.js, `uuid` (already in project). |
| V. i18n AR/EN + RTL | ✅ Pass | All new UI strings go through translation keys in both `ar.json` and `en.json`. `npm run i18n:sync` and `npm run i18n:lint` validated after implementation. |
| VIII. Heavy processes deferred | ✅ Pass | New Mongoose fields use `default: null/false`. No migration script needed. No e2e tests in plan scope. |
