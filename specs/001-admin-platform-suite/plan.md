# Implementation Plan: Admin Platform Suite

**Branch**: `001-admin-platform-suite` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-admin-platform-suite/spec.md`

## Summary

Five admin capabilities added to the existing Next.js 16/MongoDB/Clean-Architecture form management system: (1) export naming and multi-format fix across PDF/CSV/Excel/JSON with bulk zip or merged-file option; (2) universal per-form lock toggle stored on the FormTemplate document; (3) shared dashboard card show/hide/reorder backed by a new DashboardCard collection; (4) dynamic site name and logo pulled from a new `branding` field group on SettingsConfiguration; and (5) manual AI-triggered form analysis using Google Gemini, results stored in a new FormAnalysis collection.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20  
**Primary Dependencies**: Next.js 16.2 (App Router), React 19, Mongoose 8, next-intl 4 (AR/EN), jsPDF 4 + jspdf-autotable, xlsx 0.18, file-saver, @google/genai (Gemini 2.5 Flash), @dnd-kit/sortable, shadcn/ui components, Tailwind CSS 4, next-auth v5, Cloudinary (logo upload)  
**Storage**: MongoDB 6 via Mongoose 8; Cloudinary for logo file storage  
**Testing**: Jest 30, @testing-library/react 16, node-mocks-http  
**Target Platform**: Web — desktop and mobile-responsive, RTL (Arabic) and LTR (English) bilingual  
**Project Type**: Web application (Next.js App Router, fullstack monorepo with mobile shell)  
**Performance Goals**: Bulk export ≤60s for 50 forms; AI analysis ≤30s for 500 submissions; lock state write within 1 DB round-trip  
**Constraints**: All new UI text requires AR/EN keys in `src/messages/`; Cloudinary for media; no new database engines or CSS frameworks introduced  
**Scale/Scope**: ≤50 forms, ≤500 submissions/form for AI analysis; single shared branding config record

## Constitution Check

- [x] **I. Clean Architecture (MVVM)** — all new logic flows domain entities → data repositories → use-cases → API routes → MVVM UI components; no business logic in route handlers or UI
- [x] **II. Technology Stack Mandate** — uses existing Next.js, TypeScript, MongoDB/Mongoose, Tailwind, shadcn/ui, Gemini AI; only new runtime dependency is `jszip` (client-side zip bundling, no server change)
- [x] **V. Internationalization (AR/EN) & RTL** — all new UI label strings added to `src/messages/en.json` and `src/messages/ar.json`; dnd-kit and table components already support RTL
- [x] **VIII. Heavy processes deferred** — no Mongoose schema migration scripts at startup; Mongoose `strict: false` fallback for existing documents; E2E tests deferred to implementation phase

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-platform-suite/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings
├── data-model.md        ← Phase 1 entity & schema design
├── contracts/
│   ├── export-api.schema.json
│   ├── dashboard-cards-api.schema.json
│   └── branding-api.schema.json
└── tasks.md             ← Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── data/
│   ├── models/
│   │   ├── form-template.model.ts             [MODIFY — add isLocked: Boolean default false]
│   │   ├── settings.model.ts                  [MODIFY — add branding.siteName + branding.siteLogoUrl]
│   │   ├── dashboard-card.model.ts            [NEW]
│   │   └── form-analysis.model.ts             [NEW]
│   ├── repositories/
│   │   ├── mongo-form-template-repository.ts  [MODIFY — add setLocked(id, bool)]
│   │   ├── mongo-settings-repository.ts       [MODIFY — expose branding fields]
│   │   ├── mongo-dashboard-card-repository.ts [NEW]
│   │   └── mongo-form-analysis-repository.ts  [NEW]
│   └── services/
│       └── ai-form-analysis-service.ts        [NEW — Gemini submission analysis]
├── domain/
│   ├── entities/
│   │   ├── form-template.ts                   [MODIFY — add isLocked: boolean]
│   │   ├── dashboard-card.ts                  [NEW]
│   │   └── form-analysis.ts                   [NEW]
│   ├── repositories/
│   │   ├── form-template-repository.ts        [MODIFY — add setLocked signature]
│   │   ├── dashboard-card-repository.ts       [NEW]
│   │   └── form-analysis-repository.ts        [NEW]
│   └── use-cases/admin/
│       ├── manage-forms.ts                    [MODIFY — add lockForm / unlockForm methods]
│       ├── manage-settings.ts                 [MODIFY — add updateBranding method]
│       ├── manage-dashboard-cards.ts          [NEW]
│       └── manage-form-analysis.ts            [NEW]
├── app/
│   └── api/admin/
│       ├── forms/[formId]/
│       │   ├── lock/route.ts                  [NEW — PATCH { isLocked: boolean }]
│       │   └── analysis/route.ts              [NEW — GET / POST (trigger) / PATCH (enable toggle)]
│       ├── dashboard/cards/route.ts           [NEW — GET list / PUT reorder+visibility]
│       ├── settings/branding/route.ts         [NEW — PATCH { siteName, siteLogoUrl }]
│       └── system/export/
│           ├── route.ts                       [MODIFY — add ?format=pdf|csv|xlsx|json + naming fix]
│           └── bulk/route.ts                  [NEW — bulk merged export; client handles zip]
├── components/shared/
│   └── site-name.tsx                          [MODIFY — async server component reading from DB]
└── lib/
    └── export.ts                              [MODIFY — fix PDF setProperties title; fix filename convention]
```

**Structure Decision**: Single web-application project, all changes inside the existing `src/` mono-structure. Client-side bulk-zip (JSZip) avoids server memory pressure for large downloads; merged-file bulk export runs server-side for XLSX/PDF.

## Complexity Tracking

> No Constitution violations. No entries required.
