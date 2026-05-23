# Research: Admin UI Details

**Feature**: 015-admin-ui-details | **Date**: 2026-05-23

---

## 1. Contact Form Identification

**Decision**: Add `isContactForm: boolean` (default: `false`) to `FormTemplate` model and expose it in the form edit dialog. The lock toggle is rendered only when `form.isContactForm === true`.

**Rationale**: A dedicated boolean flag is explicit, testable, and requires no string matching on form names (which are user-editable and locale-dependent). Admin sets the flag once during form setup; it persists in the database.

**Alternatives considered**:
- Match form name against "contact" string — fragile; breaks with locale, typos, or renames
- Hardcode by ObjectId in config — ties implementation to a specific document ID, breaks on data migration
- Use a separate config record — adds an extra model for a single boolean; overkill

---

## 2. Submissions Table: Index Column Strategy

**Decision**: Compute the display index client-side as `submissions.map((s, idx) => idx + 1)`. No database changes needed. The index is derived from the rendered order after sorting/filtering.

**Rationale**: The spec explicitly states the index reflects displayed row order (post-sort/filter), not database insertion order. Since sorting/filtering already happens in the view-model before passing `submissions` to the table component, the `Array.prototype.map` index is the correct value. Exporting the index requires prepending it to the column list in `getExportColumns()`.

**Alternatives considered**:
- Store sequence numbers in DB — wrong; would reflect insertion order, not display order
- Use submission's `_id` or timestamp — not sequential, not 1-based

---

## 3. Export Buttons Layout in Submissions Table

**Decision**: Replace the "Export All" dropdown trigger with four visible inline buttons (PDF, CSV, Excel, JSON) in the toolbar. Use `Button variant="outline" size="sm"` with icon + label for each. Keep the per-row and selected-rows export menus as-is (they serve a different purpose — single-row export).

**Rationale**: The spec requires four export buttons to be "visibly displayed — either in the page header/toolbar or above the table." The existing dropdown hides the formats behind a click; inline buttons make all four immediately scannable. The per-row contextual menu is fine as a dropdown since it's a secondary action.

**Alternatives considered**:
- Keep dropdown but add JSON option — doesn't meet "visibly displayed" requirement
- Use icon-only buttons — harder to distinguish at a glance; label + icon more accessible

---

## 4. Analysis Export: Combined File Content

**Decision**: Implement a new API route `GET /api/admin/forms/[formId]/analysis/export?format=pdf|csv|xlsx|json` that:
1. Fetches the `FormAnalysis` document (for stats + AI narrative)
2. Fetches all `Submission` documents for that form
3. Assembles and returns a combined file where the analysis summary section comes first, followed by all raw submission rows

**Rationale**: Client-side export for combined analysis+submissions is feasible (jsPDF + xlsx already client-side), but the analysis data and submissions data come from two separate APIs — combining them server-side in a single route is cleaner and avoids two round-trip fetches in the view-model. The client triggers a download from a single URL with a `?format=` query param.

**Alternatives considered**:
- Client-side assembly (fetch both endpoints, combine in JS, export with jsPDF) — works but requires two round trips and complex client-side state management
- Always include raw rows in the existing `GET /analysis` response — would balloon response size unnecessarily for normal panel loads

**Export behavior when no analysis run**: The route always includes computed statistics (submissionCount, dateRange). If `analysisStatus !== "done"` or `summary === null`, the AI narrative section of the file contains a localized "no AI analysis yet" placeholder text.

---

## 5. Computed Statistics for Analysis Panel

**Decision**: Compute `topAnswers` and `submissionDateRange` server-side during the analysis run (in `manage-form-analysis.ts` use-case), store them on the `FormAnalysis` document alongside the AI results. Expose in the GET response so the panel can always show stats, even before/without AI.

**Fields added to `FormAnalysis`**:
```ts
topAnswers: { fieldLabel: string; topValue: string; count: number }[] | null
submissionDateRange: { earliest: Date; latest: Date } | null
```

**Rationale**: Computing stats in the use-case (at analysis-trigger time) keeps the API response self-contained. Stats always update when analysis runs. For the export-without-analysis case, stats are computed on-the-fly in the export route by querying submissions directly (no stale data risk for exports that haven't run analysis).

**Alternatives considered**:
- Compute stats client-side from raw submission data — would require sending all submission data to the analysis panel (currently it only fetches the analysis document)
- Compute stats in the GET route on each request — database overhead on every panel load; not cached

---

## 6. Dashboard Card Freeform Metrics

**Decision**: Add three new nullable string fields to `DashboardCard`:
- `displayName: string | null` — custom card title (admin-set); falls back to `form.name` when null
- `metricLabel: string | null` — freeform label (e.g., "Leads"); falls back to i18n "Submissions" when null
- `metricValue: string | null` — freeform value (e.g., "42"); falls back to live `submissionCount` when null

**Rationale**: The spec defines fully freeform values (both label and value are plain strings). Making them nullable with fallbacks preserves backward compatibility — existing cards without these fields display the current behavior (form name + submission count).

**Edit mode change**: The dialog currently auto-saves on drag-end and visibility toggle. To support explicit Save/Cancel, introduce a local `draftCards` state in the dialog that receives edits without calling the API, then saves on "Save" or discards on "Cancel".

**Alternatives considered**:
- Non-nullable with empty string defaults — empty string and null have different display semantics; null = "not set, use fallback" is cleaner
- Save automatically on each field blur — inconsistent with the Save/Cancel UX required by FR-023
