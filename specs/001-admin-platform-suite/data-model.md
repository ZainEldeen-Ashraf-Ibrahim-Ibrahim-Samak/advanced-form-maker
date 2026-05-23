# Data Model: Admin Platform Suite

**Feature**: 001-admin-platform-suite | **Date**: 2026-05-23

---

## Modified Entities

### FormTemplate *(modify)*

Add `isLocked` field.

**Domain entity** (`src/domain/entities/form-template.ts`):
```
FormTemplate {
  id: string
  name: string
  description: string
  contactRecords: ContactRecord[]
  contactFormFields: ContactFormField[]
  isActive: boolean
  isLocked: boolean          ← NEW (default: false)
  aiAutoFillEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

UpdateFormTemplateInput — add: isLocked?: boolean
```

**Mongoose model** (`src/data/models/form-template.model.ts`):
```
isLocked: { type: Boolean, default: false }
```

**State transitions**:
```
unlocked (default) ──[admin toggles ON]──▶ locked
locked             ──[admin toggles OFF]──▶ unlocked
```

When `isLocked = true`:
- Public submission endpoint returns HTTP 423 with i18n error message
- Admin can still read/edit the form structure
- Export of the form is still permitted

---

### SettingsConfiguration *(modify)*

Add `branding` subdocument.

**Mongoose model** (`src/data/models/settings.model.ts`):
```
branding: {
  siteName:    { type: String, default: "SCCT DAMAGES", maxlength: 100 }
  siteLogoUrl: { type: String, default: "" }
}
```

Existing fields (`backup`, `cron`, `draft_retention_days`, etc.) are unchanged.

---

## New Entities

### DashboardCard *(new)*

One document per form template. Stores visibility and sort order for the shared admin dashboard.

**Domain entity** (`src/domain/entities/dashboard-card.ts`):
```
DashboardCard {
  id: string
  formTemplateId: string     ← references FormTemplate
  visible: boolean           ← whether card appears on dashboard
  sortOrder: number          ← shared global display order (lower = first)
  createdAt: Date
  updatedAt: Date
}

CreateDashboardCardInput {
  formTemplateId: string
  visible?: boolean          ← default true
  sortOrder?: number         ← default: last position
}

UpdateDashboardCardInput {
  visible?: boolean
  sortOrder?: number
}
```

**Mongoose model** (`src/data/models/dashboard-card.model.ts`):
```
DashboardCard collection: "dashboard_cards"
{
  formTemplateId: { type: ObjectId, ref: "FormTemplate", required: true, unique: true, index: true }
  visible:        { type: Boolean, default: true }
  sortOrder:      { type: Number, default: 0 }
}
timestamps: true
```

**Invariants**:
- `formTemplateId` is unique — one card per form
- `sortOrder` values are non-negative integers; gaps are allowed
- When a FormTemplate is deleted, the corresponding DashboardCard MUST be deleted (cascade in use-case)
- On new FormTemplate creation, a DashboardCard is auto-created (visible: true, sortOrder = max existing + 1)

---

### FormAnalysis *(new)*

Stores the last AI-generated analysis result for a form, plus the per-form `enabled` toggle.

**Domain entity** (`src/domain/entities/form-analysis.ts`):
```
FormAnalysis {
  id: string
  formTemplateId: string     ← references FormTemplate
  enabled: boolean           ← admin can disable analysis for this form
  summary: string | null     ← last run summary paragraph
  patterns: string[]         ← identified submission patterns
  findings: string[]         ← notable findings
  sentimentOverview: string | null  ← general sentiment/tone of submissions
  analyzedAt: Date | null    ← when last analysis was run
  submissionCount: number    ← number of submissions at time of analysis
  analysisStatus: "idle" | "running" | "done" | "failed"
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}
```

**Mongoose model** (`src/data/models/form-analysis.model.ts`):
```
FormAnalysis collection: "form_analyses"
{
  formTemplateId:   { type: ObjectId, ref: "FormTemplate", required: true, unique: true, index: true }
  enabled:          { type: Boolean, default: true }
  summary:          { type: String, default: null }
  patterns:         { type: [String], default: [] }
  findings:         { type: [String], default: [] }
  sentimentOverview:{ type: String, default: null }
  analyzedAt:       { type: Date, default: null }
  submissionCount:  { type: Number, default: 0 }
  analysisStatus:   { type: String, enum: ["idle","running","done","failed"], default: "idle" }
  errorMessage:     { type: String, default: null }
}
timestamps: true
```

**State transitions**:
```
idle ──[admin triggers Run Analysis]──▶ running ──[Gemini returns OK]──▶ done
                                                  └──[Gemini fails/timeout]──▶ failed
done/failed ──[admin triggers Run Analysis again]──▶ running
```

---

## Export: No Persistent Model Change

Export changes are purely behavioral (file naming, format, PDF title). No new DB collection required. The `ExportPackage` concept from the spec is transient — generated on-demand, not stored.

---

## Relationships Overview

```
FormTemplate (1) ──── (0..1) DashboardCard
FormTemplate (1) ──── (0..1) FormAnalysis
FormTemplate (1) ──── (N)    Submission
SettingsConfiguration (singleton) — extended with branding subdoc
```

---

## Index Strategy

| Collection | Index | Purpose |
|-----------|-------|---------|
| form_templates | `isLocked` | Fast lookup for lock-check on submission |
| dashboard_cards | `formTemplateId` (unique) | Card lookup by form |
| dashboard_cards | `sortOrder` | Ordered card listing |
| form_analyses | `formTemplateId` (unique) | Analysis lookup by form |

---

## Validation Rules (domain layer)

| Field | Rule |
|-------|------|
| `FormTemplate.isLocked` | Boolean; toggled only by admin role |
| `SettingsConfiguration.branding.siteName` | Non-empty string, max 100 chars |
| `SettingsConfiguration.branding.siteLogoUrl` | Valid URL or empty string; max 500 chars |
| `DashboardCard.sortOrder` | Integer ≥ 0 |
| `FormAnalysis.submissionCount` | Integer ≥ 0 |
| Logo file upload | PNG / JPG / SVG only; max 2MB validated before Cloudinary upload |
