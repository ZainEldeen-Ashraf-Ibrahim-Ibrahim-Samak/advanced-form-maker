# Data Model: Admin UI Details

**Feature**: 015-admin-ui-details | **Date**: 2026-05-23

---

## Modified Entities

### FormTemplate (MODIFY)

Existing entity in `src/domain/entities/form-template.ts` — add one field:

```ts
export interface FormTemplate {
  // ... existing fields ...
  isLocked: boolean;          // from spec 001
  isContactForm: boolean;     // NEW — designates this as the contact form; lock toggle only visible when true
}

export interface UpdateFormTemplateInput {
  // ... existing fields ...
  isContactForm?: boolean;    // NEW — admin-settable in form edit dialog
}
```

Mongoose schema change in `src/data/models/form-template.model.ts`:
```ts
isContactForm: { type: Boolean, default: false }
```

---

### DashboardCard (MODIFY)

Existing entity in `src/domain/entities/dashboard-card.ts` — add three nullable fields:

```ts
export interface DashboardCard {
  id: string;
  formTemplateId: string;
  visible: boolean;
  sortOrder: number;
  displayName: string | null;   // NEW — custom card title; null = fall back to form.name
  metricLabel: string | null;   // NEW — freeform metric label (e.g., "Leads"); null = "Submissions"
  metricValue: string | null;   // NEW — freeform metric value (e.g., "42"); null = live submissionCount
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDashboardCardInput {
  formTemplateId: string;
  visible?: boolean;
  sortOrder?: number;
  displayName?: string | null;  // NEW
  metricLabel?: string | null;  // NEW
  metricValue?: string | null;  // NEW
}
```

Mongoose schema additions in `src/data/models/dashboard-card.model.ts`:
```ts
displayName: { type: String, default: null },
metricLabel:  { type: String, default: null },
metricValue:  { type: String, default: null },
```

---

### FormAnalysis (MODIFY)

Existing entity in `src/domain/entities/form-analysis.ts` — add two computed-stats fields:

```ts
export interface FormAnalysis {
  // ... existing fields ...
  topAnswers: TopAnswer[] | null;                    // NEW — top recurring answer per field
  submissionDateRange: SubmissionDateRange | null;   // NEW — date range of analyzed submissions
}

export interface TopAnswer {
  fieldLabel: string;   // human-readable field name
  topValue: string;     // most frequent answer value
  count: number;        // how many times it appeared
}

export interface SubmissionDateRange {
  earliest: Date;
  latest: Date;
}
```

Mongoose schema additions in `src/data/models/form-analysis.model.ts`:
```ts
topAnswers: {
  type: [{
    fieldLabel: { type: String, required: true },
    topValue:   { type: String, required: true },
    count:      { type: Number, required: true },
  }],
  default: null,
},
submissionDateRange: {
  type: {
    earliest: { type: Date, required: true },
    latest:   { type: Date, required: true },
  },
  default: null,
},
```

---

## DashboardCardWithData View-Model Interface (MODIFY)

In `src/presentation/view-models/use-dashboard-analytics.ts`:

```ts
export interface DashboardCardWithData {
  formTemplateId: string;
  name: string;                 // raw form name (used as fallback)
  description: string;
  visible: boolean;
  sortOrder: number;
  submissionCount: number;      // live count (used as fallback when metricValue is null)
  isLocked: boolean;
  displayName: string | null;   // NEW
  metricLabel: string | null;   // NEW
  metricValue: string | null;   // NEW
}
```

---

## New API Route

### GET /api/admin/forms/[formId]/analysis/export

New file: `src/app/api/admin/forms/[formId]/analysis/export/route.ts`

**Query params**: `?format=pdf|csv|xlsx|json` (required)

**Response**: Binary file download with headers:
- `Content-Type`: `application/pdf` | `text/csv` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `application/json`
- `Content-Disposition`: `attachment; filename*=UTF-8''[form-name]%20analysis.[ext]`

**File structure**:
```
Section 1 — Analysis Summary
  - Submission count (integer)
  - Date range: earliest … latest (or "no submissions")
  - Top recurring answers per field (if available)
  - AI narrative: summary, patterns, findings, sentiment (or "No AI analysis has been run yet")

Section 2 — Raw Submission Rows
  - Same column layout as standard submissions export
  - Index column prepended (1-based sequential)
```

---

## No New Collections

All changes are additive fields on existing collections. No new Mongoose models introduced by this spec.

---

## Backward Compatibility

All new Mongoose fields use `default: null` or `default: false`. Existing documents without these fields will read `null`/`false` transparently via Mongoose — no migration script required.
