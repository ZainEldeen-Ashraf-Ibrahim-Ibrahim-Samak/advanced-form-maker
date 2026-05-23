# Data Model: Enhanced Dashboard Card Manager

**Feature**: 016-enhanced-card-manager  
**Date**: 2026-05-23

---

## Modified Entity: DashboardCard

**File**: `src/domain/entities/dashboard-card.ts`

```
DashboardCard {
  id: string
  formTemplateId: string
  visible: boolean
  sortOrder: number
  displayName: string | null          ← existing (kept, no longer primary)
  displayNameAr: string | null        ← NEW
  displayNameEn: string | null        ← NEW
  logoUrl: string | null              ← NEW
  metricLabel: string | null          ← existing
  metricValue: string | null          ← existing
  createdAt: Date
  updatedAt: Date
}

CreateDashboardCardInput {
  formTemplateId: string
  visible?: boolean
  sortOrder?: number
}

UpdateDashboardCardInput {
  formTemplateId: string
  visible?: boolean
  sortOrder?: number
  displayNameAr?: string | null       ← NEW
  displayNameEn?: string | null       ← NEW
  logoUrl?: string | null             ← NEW
  metricLabel?: string | null
  metricValue?: string | null
}
```

**Schema changes** (`src/data/models/dashboard-card.model.ts`):
- Add `displayNameAr: { type: String, default: null }`
- Add `displayNameEn: { type: String, default: null }`
- Add `logoUrl: { type: String, default: null }`
- No changes to existing fields; all new fields default to `null` (backward compatible)

---

## New Entity: StatCardConfig

**File**: `src/domain/entities/stat-card-config.ts`

```
StatCardConfig {
  id: string
  slug: 'total' | 'pending' | 'draft' | 'viewed' | 'needs_rewrite'
  visible: boolean
  sortOrder: number
  displayNameAr: string | null
  displayNameEn: string | null
  createdAt: Date
  updatedAt: Date
}

UpdateStatCardConfigInput {
  slug: string
  visible?: boolean
  sortOrder?: number
  displayNameAr?: string | null
  displayNameEn?: string | null
}
```

Seeded defaults (lazy-initialized on first GET if missing):

| slug              | Default EN label    | Default sortOrder |
|-------------------|---------------------|-------------------|
| total             | Total Submissions   | 0                 |
| pending           | Pending             | 1                 |
| draft             | Drafts              | 2                 |
| viewed            | Viewed              | 3                 |
| needs_rewrite     | Needs Rewrite       | 4                 |

**Schema** (`src/data/models/stat-card-config.model.ts`):
```
Collection: stat_card_configs
Fields:
  slug: { type: String, required: true, unique: true, enum: ['total','pending','draft','viewed','needs_rewrite'] }
  visible: { type: Boolean, default: true }
  sortOrder: { type: Number, default: 0, index: true }
  displayNameAr: { type: String, default: null }
  displayNameEn: { type: String, default: null }
timestamps: true
```

---

## New Repository Interface: StatCardConfigRepository

**File**: `src/domain/repositories/stat-card-config-repository.ts`

```typescript
interface StatCardConfigRepository {
  listAll(): Promise<StatCardConfig[]>
  upsertMany(configs: UpdateStatCardConfigInput[]): Promise<void>
  seedDefaults(): Promise<void>   // creates missing slug records with defaults
}
```

---

## New Repository Implementation: MongoStatCardConfigRepository

**File**: `src/data/repositories/mongo-stat-card-config-repository.ts`

- `listAll()`: `StatCardConfigModel.find().sort({ sortOrder: 1 }).lean()`
- `seedDefaults()`: `bulkWrite` with `upsert:true` on slug; only sets fields if inserting (preserves existing config)
- `upsertMany()`: `bulkWrite` updateOne per slug with `$set` of changed fields

---

## Modified Use Case: ManageDashboardCardsUseCase

**File**: `src/domain/use-cases/admin/manage-dashboard-cards.ts`

Extend `listCardsWithFormData()` to return a unified array of `UnifiedCardItem`:

```typescript
type UnifiedCardItem =
  | FormSummaryCardItem    // cardType: 'form'
  | StatCardItem           // cardType: 'stat'

interface FormSummaryCardItem {
  cardType: 'form'
  formTemplateId: string
  name: string
  description: string
  visible: boolean
  sortOrder: number
  submissionCount: number
  isLocked: boolean
  displayNameAr: string | null
  displayNameEn: string | null
  logoUrl: string | null
  metricLabel: string | null
  metricValue: string | null
}

interface StatCardItem {
  cardType: 'stat'
  slug: string
  defaultLabelEn: string    // hardcoded default EN label for the slot
  defaultLabelAr: string    // hardcoded default AR label for the slot
  defaultIcon: string       // icon key, e.g. 'file-text', 'clock', 'eye', 'alert-circle'
  visible: boolean
  sortOrder: number
  displayNameAr: string | null
  displayNameEn: string | null
}
```

`saveCardConfig()` dispatches updates to the correct repo based on `cardType`:
- `cardType: 'form'` → `cardRepo.updateMany()`
- `cardType: 'stat'` → `statCardRepo.upsertMany()`

---

## Bug Fix: MongoSubmissionRepository.findByFormId

**File**: `src/data/repositories/mongo-submission-repository.ts`

Change:
```typescript
const docs = await SubmissionModel.find({ formTemplateId }).lean();
```

To:
```typescript
const docs = await SubmissionModel.find({
  formTemplateId: new mongoose.Types.ObjectId(formTemplateId),
}).lean();
```

**Impact**: Fixes the backfill in `ManageFormAnalysisUseCase.getAnalysis()` — it now correctly finds submissions and populates `submissionDateRange` and `submissionCount` on the `FormAnalysis` document.

---

## New Shared Component: CardManagerDialog

**File**: `src/presentation/components/admin/card-manager-dialog/index.tsx`

Extracted from `src/presentation/components/admin/dashboard/index.tsx`. Props:

```typescript
interface CardManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: UnifiedCardItem[]
  onSave: (cards: UnifiedCardItem[]) => Promise<void>
  t: TFunction   // from useTranslations('dashboard')
}
```

Renders: Dialog with DndContext + SortableContext over all card types. Each row shows the card label + visibility toggle + per-field inputs (displayNameAr, displayNameEn for all; metricLabel/metricValue/logoUrl for form cards only).
