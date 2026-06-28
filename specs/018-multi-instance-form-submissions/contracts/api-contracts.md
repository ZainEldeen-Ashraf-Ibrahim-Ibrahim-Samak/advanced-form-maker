# API Contracts: Multi-Instance Form Submissions

**Feature**: 018-multi-instance-form-submissions
**Date**: 2026-06-28

---

## Modified Endpoints

### PATCH /api/admin/forms/[formId]

Extended to accept the new form settings fields.

**Request body additions**:
```json
{
  "multiInstanceEnabled": true,
  "maxInstances": 5
}
```

**Zod schema additions** (`src/lib/validations.ts`):
```ts
multiInstanceEnabled: z.boolean().optional(),
maxInstances: z.number().int().min(1).max(50).nullable().optional(),
```

---

### POST /api/client/submissions (or equivalent submit endpoint)

Extended to accept a `sessionId` field when submitting a multi-instance form. The client generates a UUID v4 once and passes the SAME `sessionId` in the body of each parallel POST.

**Request body additions**:
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```
- Optional string (UUID v4 format, max 36 chars).
- Absent or `null` for single-instance submissions — fully backward-compatible.

**No response shape changes** — each POST returns the same submission result as today.

---

### POST /api/ai-extraction (or equivalent)

Extended response envelope when `multiInstanceEnabled=true` is passed as a hint and the document contains multiple records:

**Request body additions**:
```json
{
  "multiInstanceEnabled": true,
  "maxInstances": 5
}
```

**Response shape additions**:
```json
{
  "status": "success",
  "contactData": { "name": "...", "email": "...", "phone": null, "address": null },
  "fieldValues": { "field_001": { "value": "Alice", "confidence": 0.95 } },
  "records": [
    {
      "status": "success",
      "contactData": { ... },
      "fieldValues": { ... }
    },
    {
      "status": "success",
      "contactData": { ... },
      "fieldValues": { ... }
    }
  ]
}
```
- `records` is **optional** and only present when the document contains multiple records AND `multiInstanceEnabled=true`.
- When absent, the front-end falls back to today'\''s single-record behaviour.
- The top-level `contactData` and `fieldValues` remain for backward compatibility and represent the first record.

---

## No New Endpoints

All changes are additions to existing endpoint contracts. No new routes are created.
