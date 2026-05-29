# Plan: "Form Maker" — Embeddable Form Builder + AI Auto‑Fill Feature

> Goal: Take the capabilities of this app (build forms, edit forms, AI‑extract data from
> form/document images) and ship them as a **self‑contained feature that can be dropped
> into another website**. The host site gets a Form Builder, a Form Renderer, and an
> AI auto‑fill engine that reads an uploaded form image and pre‑populates the matching fields.

---

## 1. Scope & Outcomes

### In scope
- **Create forms** — a visual builder to add/configure/reorder fields (mirrors the existing
  `field-builder` + `form-manager` UI).
- **Edit forms** — load an existing form definition, change fields/validation/options, version it.
- **AI auto‑fill from images** — user uploads/captures a photo of a paper form or document; the
  AI maps detected values onto the form's fields and pre‑fills them for review before submit
  (extends the existing `/api/ai/extract` + `ai-photo-upload` flow).
- **Embeddable surface** — the whole thing usable inside a *different* host website with minimal
  wiring (npm package, route module, or `<iframe>`/web component — see §6).

### Out of scope (v1)
- Payments / paid plans, e‑signature, multi‑step branching logic, offline mode.
- Migrating the host site's auth — we adapt to it instead (§5).

### Success criteria
- A host app can render a working form from a JSON definition in < 10 lines of glue code.
- Builder round‑trips a form (create → edit → save → re‑open) with no data loss.
- AI auto‑fill returns field‑mapped values with confidence scores; user can accept/reject per field.
- AR/EN + RTL preserved (project constitution — **no hardcoded UI strings**, keys in both `ar` and `en`).

---

## 2. What we already have (reuse, don't rebuild)

| Capability | Existing location |
|---|---|
| Field model & types | `src/domain/entities/field-definition.ts` (`InputType`, `ValidationRules`) |
| Form template entity | `src/domain/entities/form-template.ts` |
| Form definition API | `src/app/api/forms/[id]/definition/route.ts` |
| Builder UI | `src/presentation/components/admin/field-builder/*`, `form-manager/*` |
| Form renderer | `src/presentation/components/client/submission-form/field-renderer.tsx` |
| AI extraction service | `src/data/services/ai-extraction-service.ts`, `domain/use-cases/client/extract-document-data` |
| AI extract API + rate limit | `src/app/api/ai/extract/route.ts` (Redis, 5 req/min/IP, ≤10MB image) |
| Photo upload / camera | `submission-form/ai-photo-upload.tsx`, `camera-capture.tsx` |
| Drag/drop reorder | `@dnd-kit/*` (already a dependency) |
| AI provider | `@google/genai` |
| Validation | `zod`, `src/lib/validations/ai-extraction.ts` |
| Media storage | `cloudinary` / `next-cloudinary` |
| i18n / RTL | `next-intl`, `src/messages/*`, scripts `i18n:sync` / `i18n:lint` |

**Strategy:** extract these into a clean, dependency‑light **`form-maker` module** so they can live
in this repo *and* be lifted into the host site.

---

## 3. Architecture

Keep the existing Clean Architecture split (`domain` → `data` → `presentation`) and isolate the
feature behind a single package boundary.

```
src/features/form-maker/
├── domain/
│   ├── entities/         # FormDefinition, FieldDefinition, AutoFillResult (framework-free)
│   └── use-cases/        # create/edit form, extract+map AI fields
├── data/
│   ├── repositories/     # FormRepository interface + adapters (Mongo default / host-supplied)
│   └── services/         # AiAutoFillService (wraps @google/genai)
├── presentation/
│   ├── builder/          # FormBuilder, FieldEditor, FieldList (dnd-kit)
│   ├── renderer/         # FormRenderer, FieldRenderer
│   └── auto-fill/        # ImageUpload, AutoFillReviewPanel
├── adapters/             # storage/auth/i18n ports the host injects
└── index.ts              # public API surface
```

**Ports (host injects these):**
- `FormStorageAdapter` — `getForm`, `listForms`, `saveForm`, `deleteForm` (default: Mongo via Mongoose).
- `MediaUploadAdapter` — upload image, return URL (default: Cloudinary).
- `AuthAdapter` — `getCurrentUser()` / permission check (default: NextAuth).
- `I18nAdapter` — translate(key) (default: next-intl).

This lets the host swap in its own DB/auth/storage without touching feature code.

---

## 4. Data model

`FormDefinition` (portable JSON — the contract between builder, renderer, and AI):

```ts
interface FormDefinition {
  id: string;
  title: { en: string; ar: string };
  description?: { en: string; ar: string };
  fields: FieldDefinition[];   // reuse existing entity
  version: number;
  locale?: "en" | "ar";
  createdAt: string;
  updatedAt: string;
}
```

`FieldDefinition` — reuse `src/domain/entities/field-definition.ts` as‑is
(`text | number | image | file | date | dropdown | camera`, `ValidationRules`, bilingual names,
dropdown options, `sortOrder`, `isMultiple`).

`AutoFillResult` (AI output):

```ts
interface AutoFillFieldMatch {
  fieldId: string;
  value: string | number | null;
  confidence: number;        // 0..1
  rawText?: string;          // what the model read
}
interface AutoFillResult {
  matches: AutoFillFieldMatch[];
  unmatched: string[];       // detected values with no field
  errorMessage?: string;
}
```

---

## 5. Auth & multi‑tenancy (host integration)

- Feature never assumes this app's `next-auth` session shape — it calls `AuthAdapter`.
- Forms scoped by `ownerId` / `tenantId` supplied by the host so two host sites don't see each
  other's forms.
- Default adapter = current NextAuth + Mongo; document how a host maps its own user → `ownerId`.

---

## 6. Embedding options (pick per host)

1. **NPM package / workspace module** (recommended for Next.js hosts) — host imports
   `<FormBuilder/>`, `<FormRenderer/>`, mounts API route handlers. Tightest UX, shared styling.
2. **Route module** — drop `src/features/form-maker` into the host repo and mount its routes.
3. **`<iframe>` / web‑component widget** — for non‑React or cross‑stack hosts; communicates via
   `postMessage`. Most isolated, least styling control.

Deliver (1) first; provide a thin wrapper for (3) later.

---

## 7. AI auto‑fill pipeline (the differentiator)

Extends the existing `/api/ai/extract` flow:

1. **Upload/capture** image (reuse `ai-photo-upload.tsx` / `camera-capture.tsx`).
2. **Client → API** `POST /api/form-maker/auto-fill` with `{ formId | fields[], imageBase64 }`.
3. **Guardrails** (reuse from `ai/extract/route.ts`): Redis rate limit (5/min/IP), ≤10MB,
   `parseSecureJson`, zod validation.
4. **AiAutoFillService** builds a prompt from the form's field list (names EN/AR, types, dropdown
   options) and asks `@google/genai` to return **structured JSON keyed by `fieldId`** with a
   confidence per field. Enforce JSON schema; coerce/validate with zod.
5. **Map → review** — return `AutoFillResult`; render `AutoFillReviewPanel` where the user accepts
   per field (low‑confidence flagged). Nothing is submitted automatically.
6. **Apply** accepted values into the renderer's form state; user finishes and submits as normal.

Prompt notes: pass field `inputType` so model formats dates/numbers correctly; for `dropdown`,
constrain output to the allowed options; respect target `locale`.

---

## 8. Implementation phases

### Phase 0 — Carve out the module (no behavior change)
- Create `src/features/form-maker/` and move/re‑export the reusable pieces from §2.
- Define ports/adapters; wire current Mongo/Cloudinary/NextAuth/next-intl as the **default** adapters.
- `npm run i18n:sync` to keep keys complete. ✅ Builds & existing flows unchanged.

### Phase 1 — Form Builder (create)
- `FormBuilder` shell + `FieldEditor` (type, bilingual labels, validation, dropdown options, required).
- `FieldList` with dnd‑kit reorder → `sortOrder`.
- `saveForm` via `FormStorageAdapter`; emit `FormDefinition` JSON.

### Phase 2 — Form Editing
- Load existing `FormDefinition`, edit fields, bump `version`, save.
- Guard against breaking changes to fields that already have submissions (warn, don't silently drop).

### Phase 3 — Form Renderer
- `FormRenderer` consumes `FormDefinition`, renders via existing `field-renderer.tsx` patterns.
- Client‑side validation from `ValidationRules`; submit via host‑provided handler.

### Phase 4 — AI Auto‑Fill (§7)
- `POST /api/form-maker/auto-fill`, `AiAutoFillService`, `AutoFillReviewPanel`.
- Per‑field confidence + accept/reject UX; dropdown constraint; locale‑aware formatting.

### Phase 5 — Embedding & DX
- Public `index.ts` API; usage docs; minimal host example (≤10 lines).
- Optional iframe/web‑component wrapper.

### Phase 6 — Hardening
- Tests (unit: use-cases/mapping; integration: API + rate limit; e2e: build→render→auto‑fill).
- Accessibility + RTL pass; `i18n:lint` clean; rate‑limit & image‑size limits verified.

---

## 9. API surface (new)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/form-maker/forms` | list forms (scoped to owner/tenant) |
| `POST` | `/api/form-maker/forms` | create form |
| `GET` | `/api/form-maker/forms/[id]` | get definition |
| `PUT` | `/api/form-maker/forms/[id]` | update / version |
| `DELETE` | `/api/form-maker/forms/[id]` | delete |
| `POST` | `/api/form-maker/auto-fill` | AI image → field values |

Reuse `api-security`, `api-response`, `redis` rate limiting, zod validation throughout.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| AI returns malformed / hallucinated fields | Strict JSON schema + zod; per‑field confidence; human review before apply |
| Host has different auth/DB | Ports/adapters (§3, §5); ship working defaults |
| Cost/abuse of AI endpoint | Existing Redis rate limit + 10MB cap; consider per‑tenant quotas |
| RTL / i18n regressions | No hardcoded strings; keys in `ar`+`en`; run `i18n:sync` + `i18n:lint` |
| Next.js 16 API drift | Per `AGENTS.md`, check `node_modules/next/dist/docs/` before route work |
| Editing forms with existing submissions | Versioning + breaking‑change warnings (Phase 2) |

---

## 11. Open questions
1. Primary embedding target — Next.js host (package) or arbitrary stack (iframe)?
2. Multi‑tenant from day one, or single‑owner first?
3. AI provider locked to `@google/genai`, or abstract behind an `AiProvider` port for swappability?
4. Does the host store submissions, or does this feature own that too?

---

## 12. Definition of Done
- [ ] `form-maker` module isolated with ports + default adapters; existing app still green.
- [ ] Create / edit / render forms round‑trip with no data loss.
- [ ] AI auto‑fill returns field‑mapped values w/ confidence; per‑field review works.
- [ ] AR/EN + RTL verified; `i18n:lint` passes.
- [ ] Rate limiting + image size limits enforced on auto‑fill.
- [ ] Host example app embeds the feature in ≤10 lines; docs written.
- [ ] Tests: use-cases, API integration, e2e build→render→auto‑fill.
