# Research: Enhanced Dashboard Card Manager

**Feature**: 016-enhanced-card-manager  
**Date**: 2026-05-23

---

## Decision 1: Storage for Default Status Card Configuration

**Decision**: Introduce a new `StatCardConfig` MongoDB collection. Each of the 5 status cards is represented by a document with a fixed slug (`total`, `pending`, `draft`, `viewed`, `needs_rewrite`). On first GET, missing records are lazy-initialized with safe defaults (visible=true, sortOrder based on slug index). This mirrors the lazy-init pattern already used for `DashboardCard` (form cards).

**Rationale**: A dedicated collection keeps the schema clean — `DashboardCard.formTemplateId` is `ObjectId required:true unique:true`; repurposing it for non-form cards would require a breaking schema change. The settings collection is inappropriate (it stores global config, not per-card row state). A new collection adds only 5 small documents and is trivially lightweight.

**Alternatives considered**:
- *Extend DashboardCard with nullable formTemplateId + cardType discriminator*: Rejected — requires removing `required:true unique:true` constraints that protect form card integrity.
- *Store as a JSON blob in the settings collection*: Rejected — not row-addressable; hard to apply per-card sort order updates; mixes card UI state with app settings.
- *In-memory defaults only*: Rejected — settings would reset on every server restart; spec explicitly requires persistence.

---

## Decision 2: Bilingual Display Name Fields on DashboardCard

**Decision**: Add two new fields `displayNameAr: String | null` and `displayNameEn: String | null` to the `DashboardCard` Mongoose schema. The existing `displayName` field is kept in the schema for backward compatibility but is no longer used by the UI for new records; the localized fields take precedence. Fallback chain: locale-specific field → other-locale field → form's internal `name`.

**Rationale**: Two explicit fields are simpler than a single embedded object `{ ar, en }` — they map directly to two form inputs, require no destructuring in the ORM layer, and are backward-compatible (existing documents get `null` for both new fields via `default: null`). The same bilingual pattern is already used for `fieldName` / `fieldNameAr` in `FieldDefinition`, so this is consistent with the codebase convention.

**Alternatives considered**:
- *Single `displayNames: { ar: string, en: string }` nested object*: Rejected — Mongoose nested-object defaults behave differently from top-level fields; requires deeper destructuring; inconsistent with existing naming patterns.
- *Extend existing `displayName` with locale suffix via computed field*: Rejected — no clean way to do this without a virtual or separate service logic.

---

## Decision 3: Logo Support (URL-Only)

**Decision**: Add `logoUrl: String | null` to the `DashboardCard` schema. The UI provides a text input for the URL. No image upload pipeline is added — this is out of scope per the spec.

**Rationale**: Keeping it URL-only avoids adding a new media upload dependency and Cloudinary integration pathway. The existing branding/settings images already use URL storage patterns. An admin can host a logo anywhere (Cloudinary, CDN) and paste the URL.

**Alternatives considered**:
- *Direct file upload via Cloudinary*: Rejected — out of scope per spec; adds complexity (upload route, size limits, CORS).

---

## Decision 4: Unified GET/PUT API for Cards (Form + Stat)

**Decision**: The existing `GET /api/admin/dashboard/cards` endpoint returns a flat array. Extend it to return items with a `cardType: 'form' | 'stat'` discriminator field. Form cards carry `formTemplateId`; stat cards carry `slug`. The `PUT` endpoint accepts the same shape — items with `cardType: 'stat'` are routed to `StatCardConfigRepository.updateMany()`; items with `cardType: 'form'` are routed to `DashboardCardRepository.updateMany()`. The sort order is global across both types — the client sends the full merged list with sequential `sortOrder` values.

**Rationale**: A single unified endpoint lets the card manager dialog treat all cards identically without knowing their type for rendering purposes. The `cardType` discriminator is only needed at write time. This avoids a second endpoint (`PUT /api/admin/dashboard/stat-cards`) and keeps the client view-model simple.

**Alternatives considered**:
- *Two separate endpoints*: Rejected — forces the client to merge two responses and send two PUT requests; complicates sort order management across collections.
- *GraphQL union type*: Rejected — project uses REST consistently.

---

## Decision 5: Analysis Date Range Bug — Root Cause & Fix

**Decision**: The bug is in `src/data/repositories/mongo-submission-repository.ts` `findByFormId()`. The query `SubmissionModel.find({ formTemplateId })` passes a raw string ID. The Mongoose schema declares `formTemplateId: { type: Schema.Types.ObjectId }`, which means Mongoose auto-casts in most paths, but when using `.lean()` the auto-cast may silently fail for string values. The fix is to always cast explicitly: `SubmissionModel.find({ formTemplateId: new mongoose.Types.ObjectId(formTemplateId) }).lean()`. This makes the backfill in `ManageFormAnalysisUseCase.getAnalysis()` find the actual submissions and populate `submissionDateRange` correctly.

**Rationale**: The analysis repo, dashboard card repo, and form template repo all use explicit `new mongoose.Types.ObjectId(id)` in queries. The submission repo is the only one that omits this. The fix is a single-line change; no schema or logic changes needed.

**Alternatives considered**:
- *Add a Mongoose query middleware to auto-cast*: Rejected — over-engineering; the problem is only in one method.
- *Rewrite with `_id` lookup*: Not applicable — `formTemplateId` is the field name.

---

## Decision 6: Card Manager Dialog — Shared Component

**Decision**: Extract the card manager dialog into a shared component `src/presentation/components/admin/card-manager-dialog/index.tsx`. It accepts `cards`, `isLoading`, and a `onSave` callback. Both the Dashboard and Submissions page import this component and pass their respective card data. The `useDashboardAnalytics` hook is imported wherever cards are needed, or a lighter dedicated hook `useCardManager` can wrap the save/load logic.

**Rationale**: The Dialog JSX is ~80 lines. Duplicating it in two places creates a maintenance burden. Extracting it as a shared component is the standard approach and consistent with the project's component-per-folder structure.

**Alternatives considered**:
- *Duplicate the dialog in each page*: Rejected — violates DRY; two files to update when card fields change.
- *Render in a global portal from a context provider*: Rejected — over-engineering; dialog state is local.

---

## Decision 7: Card Visual Style — Matching Default Stat Cards

**Decision**: The existing default stat cards use shadcn `Card` with:
- `CardHeader` with `flex-row items-center justify-between space-y-0 pb-2`
- `CardTitle` with `text-sm font-medium`
- Icon at `h-4 w-4 text-{color}-500` (right side)
- `CardContent` with `text-2xl font-bold` for the metric value

Form summary cards must be updated to use the exact same pattern. The `description` field is removed from the card face (it was previously shown as `CardDescription`). The metric value (custom or submission count) uses `text-2xl font-bold`. The logo (if set) replaces the default icon; otherwise a `FileText` icon is shown.

**Rationale**: Visual consistency. Reusing the same Tailwind classes and layout ensures both card types are visually identical without custom CSS.

**Alternatives considered**:
- *Larger richer card with description*: Rejected — spec explicitly requires matching the default compact style.
