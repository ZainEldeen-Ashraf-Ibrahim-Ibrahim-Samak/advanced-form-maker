# Research: Admin Platform Suite

**Feature**: 001-admin-platform-suite | **Date**: 2026-05-23

---

## 1. Export Multi-Format & Naming Fix

### Decision: Fix naming in existing route; add `?format` param; use JSZip client-side for bulk zip

**Rationale**:
- The existing server-side route (`/api/admin/system/export/route.ts`) already builds XLSX using the `xlsx` library. The filename is produced as `${safeFilename}-data.xlsx` — the naming convention is nearly right but (a) spaces are stripped, (b) no format options exist, (c) PDF title is not set.
- Fix: produce filename as `[form-name] data.xlsx` by preserving the original form name with URL encoding. Add a `?format=pdf|csv|xlsx|json` query param to the same route.
- PDF: jsPDF 4 + jspdf-autotable already in `package.json`. The client-side `src/lib/export.ts` already has `exportToPDF()` but does not call `doc.setProperties({ title: formName })` to embed the form name in PDF metadata. This must be added.
- CSV: `xlsx` library supports `{ bookType: "csv" }` — no new dependency.
- JSON: `JSON.stringify(flattenedData, null, 2)` with `Content-Type: application/json`.
- Bulk zip: Running zip generation server-side in a Next.js serverless function risks memory/timeout limits for 50 large forms. **Decision**: client calls the single-export endpoint once per form in parallel, then bundles results in the browser using `jszip` (add as dependency: `npm install jszip @types/jszip`). Client-side zip is zero server load and scales with the browser.
- Bulk merged: XLSX merged workbook (one sheet per form) is straightforward with `xlsx`. PDF merged file (one section per form with jsPDF `addPage()`) is supported client-side.

**Alternatives considered**:
- Server-side zip (`archiver` npm): Rejected — adds heavyweight streaming dependency; risky in serverless Next.js edge functions.
- Separate bulk endpoint returning multiple `Content-Disposition` parts: Rejected — not natively supported by browsers.

**Index / title convention**: The spec says "index and title will be the form parent name." In the existing data model `IFormTemplate` has no explicit `parentName` field — `name` is the form name and forms have no hierarchy. **Resolution**: Use the form's `name` as both the document title (PDF metadata + PDF heading) and the file name base. If a parent-category concept is added later, this can be updated. File name: `[form-name] data.[ext]`.

---

## 2. Form Lock Toggle

### Decision: Add `isLocked: Boolean` field to FormTemplate schema; enforce in public submission route

**Rationale**:
- `IFormTemplate` in `src/data/models/form-template.model.ts` already has `isActive`. `isLocked` is semantically different — `isActive` controls visibility/routing; `isLocked` controls submission acceptance while keeping the form visible.
- Add `isLocked: { type: Boolean, default: false }` to `formTemplateSchema`.
- New API route `PATCH /api/admin/forms/[formId]/lock` accepts `{ isLocked: boolean }` and does a targeted `findByIdAndUpdate`.
- The public submission handler (`src/app/api/submissions/[token]/route.ts`) must check `isLocked` before persisting data and return a 423 (Locked) status with a localised message.
- Domain entity `FormTemplate` and `UpdateFormTemplateInput` type get `isLocked?: boolean`.

**Alternatives considered**:
- Reusing `isActive = false` to block submissions: Rejected — `isActive` hides the form entirely, whereas `isLocked` only blocks new submissions while keeping the form accessible.
- Separate `LockedForm` collection: Rejected — unnecessary indirection; a boolean field on the form document is simpler and atomic.

---

## 3. Dashboard Card Management

### Decision: New `DashboardCard` collection; one document per form; shared global order

**Rationale**:
- Dashboard cards are shared across all admins (confirmed in clarification). A single global config record per form is the simplest model.
- Each `DashboardCard` document holds: `formTemplateId` (ref), `visible: Boolean`, `sortOrder: Number`.
- On new form creation, a DashboardCard is auto-created (visible: true, sortOrder: last).
- On form deletion, the corresponding card is deleted via a Mongoose `post('deleteOne')` hook or explicit cleanup in the use-case.
- The GET endpoint returns cards joined with basic form data (name, submission count).
- The PUT endpoint accepts a full replacement array `[{ formId, visible, sortOrder }]` and does bulk `bulkWrite` for efficiency.
- No user-specific state needed (clarified as shared).

**Alternatives considered**:
- Storing card config as a JSON field inside SettingsConfiguration: Rejected — mixing unrelated concerns; harder to query/update individual cards.
- Storing card order as an array in a single "dashboard settings" document: Considered — simpler, but harder to atomically update one card. Rejected for per-document approach.

---

## 4. Site Branding (Name & Logo)

### Decision: Extend SettingsConfiguration with `branding` subdocument; async server component for `site-name.tsx`

**Rationale**:
- `SettingsConfigurationModel` already exists as a singleton-style settings document. Adding a `branding` subdocument (`siteName: String`, `siteLogoUrl: String`) is the least disruptive change.
- Current `src/components/shared/site-name.tsx` exports hardcoded constants (`SITE_NAME = "SCCT DAMAGES"`). These constants are used in `generateMetadata()` calls across multiple pages. Making `site-name.tsx` a proper async server component that fetches from DB via the settings use-case allows dynamic values without prop-drilling.
- Pages that use `SITE_ADMIN_NAME` in `generateMetadata` will call a new `getSiteBranding()` helper that returns the DB value (with a hardcoded fallback).
- Logo upload: use existing Cloudinary upload flow (`/api/cloudinary/sign` + `next-cloudinary`) to get a `siteLogoUrl`. Store only the URL, not the binary. The `<head>` favicon link is set via `generateMetadata` returning `icons: { icon: siteLogoUrl }`.
- New `PATCH /api/admin/settings/branding` route validates `siteName` (non-empty, ≤100 chars) and `siteLogoUrl` (valid URL or relative path from Cloudinary).

**Alternatives considered**:
- Separate `BrandingSettings` Mongoose model: Considered — clean separation, but overkill for 2 fields on an already-singleton settings model.
- Next.js environment variables for site name: Rejected — env vars require redeployment; the requirement is runtime-updatable from the admin UI.
- Storing logo as base64 in DB: Rejected — Cloudinary is already the project's media CDN; binary in MongoDB wastes space and violates existing patterns.

---

## 5. AI-Powered Form Analysis

### Decision: New `ai-form-analysis-service.ts` using Gemini; results stored in new `FormAnalysis` collection

**Rationale**:
- Existing `ai-extraction-service.ts` uses Gemini 2.5 Flash for document OCR. The new service sends form submission data (as structured JSON) to Gemini with a prompt requesting pattern analysis and summary — a text-only request, no image input.
- Prompt approach: serialize up to 500 submissions as compact JSON, send as a single user message with a structured response schema (summary: string, patterns: string[], findings: string[], sentimentOverview: string).
- Response stored in `FormAnalysis` collection: `{ formTemplateId, summary, patterns, findings, sentimentOverview, analyzedAt, submissionCount, enabled }`.
- `enabled` flag controls whether the analysis tab is shown for a form (FR-021).
- Manual trigger only (confirmed in clarification): `POST /api/admin/forms/[formId]/analysis` runs the Gemini call and upserts the result.
- Graceful failure: if Gemini call throws or times out, the route returns 503 with a user-friendly message; the UI shows an error state without crashing.
- 500-submission limit per analysis run: submissions are sampled if over limit to fit within Gemini token budget.

**Alternatives considered**:
- Streaming Gemini response: Considered — would improve perceived latency but complicates client-side state management. Deferred to future iteration.
- Storing analysis inline on FormTemplate: Rejected — analysis is large text that would bloat form template lookups; separate collection is cleaner.
- Running analysis via a background job (cron): Rejected — manual trigger was confirmed; background jobs add deployment complexity.

---

## Dependency Addition

| Package | Version | Reason |
|---------|---------|--------|
| `jszip` | `^3.10.1` | Client-side bulk ZIP assembly for multi-form export |
| `@types/jszip` | `^3.4.1` | TypeScript types for jszip |

No new server-side dependencies beyond what is already in `package.json`.
