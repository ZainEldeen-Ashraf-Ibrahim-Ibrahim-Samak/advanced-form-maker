# Quickstart: Admin UI Details

**Feature**: 015-admin-ui-details | **Date**: 2026-05-23

This guide covers how to set up, implement, and test each of the four sub-features.

---

## Prerequisites

No new dependencies required. All libraries (jsPDF, xlsx, @dnd-kit/sortable, file-saver) are already installed.

---

## 1. Submissions Table Index & Export Buttons

**What changes**:

- `src/presentation/components/admin/submissions-table/index.tsx`
  - Add `#` index column as first `<TableHead>` and `<TableCell>` showing `{idx + 1}` per row
  - Replace "Export All" dropdown with four inline `<Button>` components (PDF, CSV, Excel, JSON)
  - Add JSON export via `exportToJSON()` utility (see below)
  - Fix filename: pass `formName` prop and use `[form-name] data.[ext]` pattern
- `src/lib/export.ts`
  - Add `exportToJSON(data, filename)` function
  - Update `exportToPDF`, `exportToCSV`, `exportToExcel` to accept `filename` as `[form-name] data.[ext]`
- `src/messages/en.json` + `ar.json`
  - Add `"submissions.indexHeader": "#"` | `"#"`
  - Add `"common.exportJSON": "JSON"` | `"JSON"`

**Index in exports**: Prepend `{ header: "#", key: (row, idx) => idx + 1 }` to `getExportColumns()`.

**Filename convention**:
```ts
// Pass formName as prop to SubmissionsTable (or from parent context)
const filename = `${formName} data`;   // extension added per format: .pdf, .csv, .xlsx, .json
```

---

## 2. Contact Form Lock Scoping

**What changes**:

- `src/data/models/form-template.model.ts` — add `isContactForm: { type: Boolean, default: false }`
- `src/domain/entities/form-template.ts` — add `isContactForm: boolean` to `FormTemplate` and `UpdateFormTemplateInput`
- `src/domain/use-cases/admin/manage-forms.ts` — pass `isContactForm` through create/update
- `src/data/repositories/mongo-form-template-repository.ts` — include `isContactForm` in reads/writes
- `src/presentation/components/admin/form-manager/index.tsx` — condition lock toggle:
  ```tsx
  {editFormIsContactForm && (
    <div className="flex items-center gap-2">
      <Switch checked={editFormIsLocked} onCheckedChange={setEditFormIsLocked} />
      <Label>{t("lockForm")}</Label>
    </div>
  )}
  ```
- `src/messages/en.json` + `ar.json`
  - Add `"forms.isContactForm": "This is the contact form"` | `"هذا هو نموذج الاتصال"`

**Locked status badge** on form listing:
```tsx
{form.isLocked && form.isContactForm && (
  <Badge variant="destructive">{t("locked")}</Badge>
)}
```

---

## 3. AI Analysis Panel: Business Insights + Export

**What changes**:

- `src/data/models/form-analysis.model.ts` — add `topAnswers` array + `submissionDateRange` subdoc
- `src/domain/entities/form-analysis.ts` — add `TopAnswer`, `SubmissionDateRange` types + fields
- `src/domain/use-cases/admin/manage-form-analysis.ts` — compute `topAnswers` + `submissionDateRange` from submissions before/during analysis run
- `src/data/services/ai-form-analysis-service.ts` — update Gemini prompt for business insights:
  ```ts
  const prompt = `You are analyzing form submission data for a marketing agency admin.
  Return a JSON object with:
  - summary (string): 2-3 sentence business overview
  - patterns (string[]): up to 5 recurring submission patterns
  - findings (string[]): up to 5 notable marketing findings (leads, interests, intent signals)
  - sentimentOverview (string): overall tone and engagement quality
  
  Focus on lead generation signals, user intent, and marketing intelligence.
  Submissions: ${JSON.stringify(submissionSample)}`;
  ```
- `src/app/api/admin/forms/[formId]/analysis/export/route.ts` — NEW export route (see contract)
- `src/presentation/components/admin/form-analysis/index.tsx` — restructure to side-by-side:
  - Left column: Computed Stats card (count, date range, top answers)
  - Right column: AI Narrative cards (summary, patterns, findings, sentiment)
  - Export button in header bar (triggers `GET /analysis/export?format=...`)
- `src/presentation/view-models/use-form-analysis.ts` — add `exportAnalysis(format)` function

**Computed stats when no AI run**: `topAnswers` and `submissionDateRange` are computed from submissions at analysis trigger time. For the export without prior run, the export route computes them on-the-fly from `Submission` documents.

**Side-by-side layout**:
```tsx
{/* After "Run Analysis" button bar */}
<div className="grid gap-6 md:grid-cols-2">
  {/* Computed Stats — always shown when data exists */}
  <ComputedStatsCard analysis={analysis} />
  {/* AI Narrative — shown when analysis.summary exists */}
  <AINarrativeCard analysis={analysis} />
</div>
```

---

## 4. Dashboard Card Management UI

**What changes**:

- `src/data/models/dashboard-card.model.ts` — add `displayName`, `metricLabel`, `metricValue`
- `src/domain/entities/dashboard-card.ts` — add fields to `DashboardCard` and `UpdateDashboardCardInput`
- `src/domain/use-cases/admin/manage-dashboard-cards.ts` — pass through new fields in `saveCardConfig`
- `src/data/repositories/mongo-dashboard-card-repository.ts` — include new fields in upsert
- `src/app/api/admin/dashboard/cards/route.ts` — extend Zod schema to accept new optional fields
- `src/presentation/view-models/use-dashboard-analytics.ts`:
  - Extend `DashboardCardWithData` with `displayName`, `metricLabel`, `metricValue`
  - Add `saveDraftCards(draft)` and `cancelDraft()` helpers (save draft to state, cancel reverts)
- `src/presentation/components/admin/dashboard/index.tsx`:
  - In `SortableCardRow`, add `<Input>` for name + metric label + metric value (visible only in edit mode)
  - Dialog: replace auto-close trigger with explicit Save/Cancel buttons
  - Card display: show `displayName ?? card.name`, metric as `(metricLabel ?? t("submissions")): (metricValue ?? submissionCount)`

**Save/Cancel pattern** (key change from current behavior):
```tsx
// In AdminDashboard component
const [isEditMode, setIsEditMode] = useState(false);
const [draftCards, setDraftCards] = useState<DashboardCardWithData[]>([]);

const handleOpenEdit = () => {
  setDraftCards([...cards]); // copy current state
  setIsEditMode(true);
};

const handleSave = async () => {
  await reorderCards(draftCards); // API call
  setIsEditMode(false);
};

const handleCancel = () => {
  setDraftCards([]); // discard
  setIsEditMode(false);
};
```

---

## i18n Keys to Add

**`src/messages/en.json`**:
```json
{
  "submissions": {
    "indexHeader": "#"
  },
  "common": {
    "exportJSON": "JSON"
  },
  "forms": {
    "isContactForm": "This is the contact form",
    "locked": "Locked"
  },
  "formAnalysis": {
    "statsTitle": "Submission Statistics",
    "statsTotalLabel": "Total Submissions",
    "statsDateRangeLabel": "Date Range",
    "statsTopAnswersLabel": "Top Answers",
    "exportButton": "Export Analysis",
    "noAnalysisYet": "No AI analysis has been run yet",
    "noDateRange": "No submissions yet"
  },
  "dashboard": {
    "manageCards": "Manage Cards",
    "editCardName": "Card Name",
    "editMetricLabel": "Metric Label",
    "editMetricValue": "Metric Value",
    "saveLayout": "Save",
    "cancelEdit": "Cancel"
  }
}
```

**`src/messages/ar.json`** (same keys, Arabic values):
```json
{
  "submissions": { "indexHeader": "#" },
  "common": { "exportJSON": "JSON" },
  "forms": { "isContactForm": "هذا هو نموذج الاتصال", "locked": "مغلق" },
  "formAnalysis": {
    "statsTitle": "إحصائيات التقديم",
    "statsTotalLabel": "إجمالي التقديمات",
    "statsDateRangeLabel": "النطاق الزمني",
    "statsTopAnswersLabel": "أبرز الإجابات",
    "exportButton": "تصدير التحليل",
    "noAnalysisYet": "لم يتم تشغيل أي تحليل بعد",
    "noDateRange": "لا توجد تقديمات بعد"
  },
  "dashboard": {
    "manageCards": "إدارة البطاقات",
    "editCardName": "اسم البطاقة",
    "editMetricLabel": "تسمية المقياس",
    "editMetricValue": "قيمة المقياس",
    "saveLayout": "حفظ",
    "cancelEdit": "إلغاء"
  }
}
```

---

## Testing Checklist

| Feature | Test type | What to verify |
|---------|-----------|----------------|
| Index column | Manual | Row 1 shows "#1", last row shows "#N" matching `submissions.length` |
| Index in export | Manual | Downloaded CSV/Excel/PDF has "#" as first column with correct values |
| Export buttons | Manual | All 4 buttons visible above table; each downloads correct format with `[form-name] data.[ext]` |
| JSON export | Manual | Downloaded `.json` is valid JSON array with index field |
| Contact form lock | Manual | Lock toggle absent on non-contact forms; present on form with `isContactForm=true` |
| Lock persistence | Manual | Toggle lock, refresh page — state preserved |
| Locked form submission | Integration | POST to public submission route with locked contact form returns 423 |
| Analysis computed stats | Manual | After running analysis, computed stats section shows count, date range, top answers |
| Analysis export (with AI) | Manual | Downloaded PDF has stats + AI narrative + raw rows |
| Analysis export (no AI) | Manual | Downloaded PDF has stats + "No AI analysis yet" + raw rows |
| Dashboard card name edit | Manual | Change name in dialog, Save — dashboard shows new name |
| Dashboard card metric | Manual | Set metricLabel="Leads", metricValue="42", Save — card shows "Leads: 42" |
| Dashboard cancel | Manual | Edit fields, Cancel — dashboard shows original values |
| Dashboard shared state | Integration | Two browser sessions both show same card config after one saves |
