# Quickstart: Admin Platform Suite

**Feature**: 001-admin-platform-suite | **Date**: 2026-05-23

This guide covers how to set up, implement, and test each of the five sub-features.

---

## Prerequisites

```bash
# Install new dependency for client-side ZIP bundling
npm install jszip @types/jszip

# Ensure .env.local has:
# GEMINI_API_KEY=...       (required for AI analysis)
# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...
```

---

## 1. Export Fix (naming + formats)

**What changes**:
- `src/app/api/admin/system/export/route.ts` — add `?format=pdf|csv|xlsx|json` param; fix `Content-Disposition` filename to `[form-name] data.[ext]`
- `src/app/api/admin/system/export/bulk/route.ts` — new route for merged XLSX/PDF across all forms
- `src/lib/export.ts` — add `doc.setProperties({ title: formName })` call in `exportToPDF()`

**Key implementation note** — server-side PDF generation:
```ts
// In the API route, after building jsPDF doc:
doc.setProperties({ title: formName });  // ← sets PDF metadata title
// ...autoTable...
doc.text(parentName, 14, 15);           // ← visible heading = parent name
```

**Bulk ZIP** is client-side only — no new server route needed:
```ts
// UI component calls /api/admin/system/export?formId=X&format=Y per form
// then uses JSZip to bundle downloads into "all-forms-data.zip"
```

---

## 2. Form Lock Toggle

**What changes**:
- `src/data/models/form-template.model.ts` — add `isLocked: { type: Boolean, default: false }`
- `src/domain/entities/form-template.ts` — add `isLocked: boolean`
- `src/app/api/admin/forms/[formId]/lock/route.ts` — new PATCH endpoint
- `src/app/api/submissions/[token]/route.ts` — add locked check before submission

**Public submission guard**:
```ts
const form = await FormTemplate.findById(formId);
if (form.isLocked) {
  return NextResponse.json({ error: t("errors.formLocked") }, { status: 423 });
}
```

**i18n keys to add** (`src/messages/en.json` + `ar.json`):
```json
{ "errors": { "formLocked": "This form is currently unavailable." } }
```

---

## 3. Dashboard Card Management

**What changes**:
- `src/data/models/dashboard-card.model.ts` — NEW Mongoose model
- `src/domain/entities/dashboard-card.ts` — NEW domain entity
- `src/domain/use-cases/admin/manage-dashboard-cards.ts` — NEW use-case
- `src/app/api/admin/dashboard/cards/route.ts` — NEW GET + PUT endpoints
- Auto-create card on form creation, auto-delete on form deletion (in manage-forms use-case)
- UI: drag-and-drop using existing `@dnd-kit/sortable` (already in use in the app)

---

## 4. Site Branding

**What changes**:
- `src/data/models/settings.model.ts` — add `branding: { siteName, siteLogoUrl }` subdoc
- `src/app/api/admin/settings/branding/route.ts` — NEW PATCH endpoint
- `src/components/shared/site-name.tsx` — convert from hardcoded constants to async server component

**Server component pattern**:
```ts
// src/components/shared/site-name.tsx
export async function getSiteBranding() {
  const settings = await useCase.getSettings();
  return {
    siteName: settings?.branding?.siteName || "ADVANCED FORM MAKER",
    siteLogoUrl: settings?.branding?.siteLogoUrl || "",
  };
}
```

Pages using `SITE_ADMIN_NAME` constant must call `getSiteBranding()` inside `generateMetadata()`.

---

## 5. AI Form Analysis

**What changes**:
- `src/data/models/form-analysis.model.ts` — NEW
- `src/data/services/ai-form-analysis-service.ts` — NEW Gemini service
- `src/domain/use-cases/admin/manage-form-analysis.ts` — NEW
- `src/app/api/admin/forms/[formId]/analysis/route.ts` — NEW GET / POST / PATCH

**Gemini prompt pattern** (text-only, no image):
```ts
const prompt = `Analyze the following form submission data and return a JSON object with:
- summary (string): 2-3 sentence overview
- patterns (string[]): up to 5 recurring patterns
- findings (string[]): up to 5 notable findings
- sentimentOverview (string): overall tone of submissions

Submissions: ${JSON.stringify(submissionSample)}`;
```

**Sampling**: if submissions > 500, take the most recent 500 before serializing.

---

## Testing Checklist

| Feature | Test type | What to verify |
|---------|-----------|----------------|
| Export naming | Unit | `Content-Disposition` header equals `[form-name] data.xlsx` |
| Export PDF title | Unit | jsPDF `getProperties().title` equals form name |
| Export formats | Integration | Each format returns correct `Content-Type` |
| Form lock | Unit | Submission route returns 423 when `isLocked=true` |
| Form lock | Unit | Lock state persists after save |
| Dashboard cards | Unit | PUT updates `visible` and `sortOrder` |
| Dashboard cards | Unit | Deleting a form removes its card |
| Site branding | Unit | `getSiteBranding()` returns DB value over hardcoded fallback |
| AI analysis | Unit | POST route sets `analysisStatus: "running"`, updates to "done" |
| AI analysis | Unit | Disabled form returns 400 on POST trigger |
