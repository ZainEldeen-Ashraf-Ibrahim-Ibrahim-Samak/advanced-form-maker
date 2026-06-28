# Data Model: Multi-Instance Form Submissions

**Feature**: 018-multi-instance-form-submissions
**Date**: 2026-06-28

---

## Modified Entities

### FormTemplate (Modified)

Two additive fields added to the existing `FormTemplate` entity, model, and repository.

**Domain entity** (`src/domain/entities/form-template.ts`):

```ts
// Add to FormTemplate interface:
multiInstanceEnabled: boolean;  // default false
maxInstances: number | null;    // null = use system cap (50)

// Add to UpdateFormTemplateInput Pick<...>:
// "multiInstanceEnabled" | "maxInstances"
```

**Mongoose model** (`src/data/models/form-template.model.ts`):

```ts
// Add to IFormTemplate interface:
multiInstanceEnabled: boolean;
maxInstances: number | null;

// Add to formTemplateSchema:
multiInstanceEnabled: { type: Boolean, default: false },
maxInstances:         { type: Number, default: null },
```

**Repository mapper** (`src/data/repositories/mongo-form-template-repository.ts`):

```ts
// Add to the toEntity(...) mapping function:
multiInstanceEnabled: !!doc.multiInstanceEnabled,
maxInstances: doc.maxInstances ?? null,
```

---

### Submission (Modified)

One additive field added to link sibling instances from the same session.

**Domain entity** (`src/domain/entities/submission.ts`):

```ts
// Add to Submission interface:
sessionId: string | null;  // null for non-multi-instance submissions
```

**Mongoose model** (`src/data/models/submission.model.ts`):

```ts
// Add to ISubmission interface:
sessionId: string | null;

// Add to submissionSchema:
sessionId: { type: String, default: null, index: true },
```

**Repository mapper** (`src/data/repositories/mongo-submission-repository.ts`):

```ts
// Add to toEntity(...) mapping:
sessionId: doc.sessionId ?? null,
```

---

### ExtractionResult (API envelope extension only)

The domain entity itself (`src/domain/entities/ai-extraction.ts`) is unchanged. The AI extraction API route response is extended with an optional `records` field for multi-record documents:

```ts
// In the API response JSON (not the domain entity):
{
  status: "success",
  contactData: { ... },         // existing — first record's contact data
  fieldValues: { ... },         // existing — first record's field values
  records?: ExtractionResult[]  // NEW OPTIONAL: array when multiple records detected
}
```

The front-end reads `records` when present and `multiInstanceEnabled` is true.

---

### FormInstance (Client-side only — not persisted)

A transient type used only in `SubmissionForm` to track each in-progress instance:

```ts
interface FormInstance {
  id: string;                                      // local uuid for React key
  formData: Record<string, { value: string | number | null; ... }>;
  contactRecords: ContactRecord[];
  validationErrors: Record<string, string>;
  contactErrors: Record<string, string>;
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `multiInstanceEnabled` | Boolean; defaults to `false`; optional in PATCH |
| `maxInstances` | Integer 1–50 or null; validated in Zod schema |
| `sessionId` | UUID v4 string or null; max 36 chars |

---

## State Transitions

```
Form with multiInstanceEnabled=true
  ├── Client opens form → 1 FormInstance created (seed state)
  ├── Client clicks "Add Another" → new FormInstance appended (up to maxInstances or 50)
  ├── Client clicks "Remove" (if >1 instance) → FormInstance removed
  ├── Client clicks "Submit All"
  │   ├── Validate all instances → block on error, highlight failing instances
  │   └── On success → generate sessionId UUID, POST each instance in parallel
  │       ├── Each POST → new Submission document with same sessionId
  │       └── On partial failure → report which instances failed; keep successes
  └── Admin table → N separate rows, all with same sessionId in "Session" column
```
