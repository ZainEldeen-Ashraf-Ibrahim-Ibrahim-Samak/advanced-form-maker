# Implementation Plan: Admin UI Details

**Branch**: `main` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-admin-ui-details/spec.md`

## Summary

Four UI refinements on top of the infrastructure built in spec 001: (1) submissions table gains a 1-based sequential index column and inline export format buttons (PDF, CSV, Excel, JSON) with corrected filenames; (2) the form lock toggle is scoped to the contact form only via a new `isContactForm` boolean on `FormTemplate`; (3) the AI analysis panel gains a computed-statistics section (total count, top answers, date range) shown alongside the AI narrative, plus an export button producing a combined `[form-name] analysis.[ext]` file; (4) the dashboard card management dialog gains editable `displayName`, `metricLabel`, and `metricValue` fields per card, with explicit Save/Cancel actions.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20  
**Primary Dependencies**: Next.js 16.2 (App Router), React 19, Mongoose 8, next-intl 4 (AR/EN), jsPDF 4 + jspdf-autotable, xlsx 0.18, file-saver, @google/genai (Gemini 2.5 Flash), @dnd-kit/sortable, shadcn/ui, Tailwind CSS 4  
**Storage**: MongoDB 6 via Mongoose 8  
**Testing**: Jest 30, @testing-library/react 16  
**Target Platform**: Web — desktop and mobile-responsive, RTL (Arabic) and LTR (English) bilingual  
**Project Type**: Web application (Next.js App Router fullstack monorepo)  
**Performance Goals**: Submissions table index renders in same paint as rows (no extra fetch); analysis export ≤10s for 500 rows  
**Constraints**: All new UI text requires AR/EN keys in `src/messages/`; no new runtime dependencies (jsPDF, xlsx, file-saver already present)  
**Scale/Scope**: ≤500 submissions/form; single contact form designation per deployment

## Constitution Check

- [x] **I. Clean Architecture (MVVM)** — data model changes flow: Mongoose schema → domain entity → repository → use-case → API route → view-model → component; no business logic in components
- [x] **II. Technology Stack Mandate** — no new runtime dependencies added; uses existing jsPDF, xlsx, @dnd-kit/sortable, shadcn/ui; Mongoose `strict: false` backward-compatible for new fields
- [x] **V. Internationalization (AR/EN) & RTL** — all new label strings (index column header, export buttons, analysis stats labels, metric fields) added to `src/messages/en.json` and `src/messages/ar.json`
- [x] **VIII. Heavy processes deferred** — no migration scripts; Mongoose default values handle existing documents

## Project Structure

### Documentation (this feature)

```text
specs/015-admin-ui-details/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings
├── data-model.md        ← Phase 1 entity & schema design
├── contracts/
│   ├── analysis-export-api.schema.json
│   └── dashboard-cards-edit-api.schema.json
├── quickstart.md        ← test scenarios
└── tasks.md             ← Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── data/
│   ├── models/
│   │   ├── form-template.model.ts             [MODIFY — add isContactForm: Boolean default false]
│   │   ├── dashboard-card.model.ts            [MODIFY — add displayName, metricLabel, metricValue]
│   │   └── form-analysis.model.ts             [MODIFY — add topAnswers, submissionDateRange]
│   ├── repositories/
│   │   ├── mongo-form-template-repository.ts  [MODIFY — expose isContactForm in reads/writes]
│   │   ├── mongo-dashboard-card-repository.ts [MODIFY — save/return new card fields]
│   │   └── mongo-form-analysis-repository.ts  [MODIFY — save/return topAnswers, submissionDateRange]
│   └── services/
│       └── ai-form-analysis-service.ts        [MODIFY — update prompt for business insights; compute topAnswers + dateRange]
├── domain/
│   ├── entities/
│   │   ├── form-template.ts                   [MODIFY — add isContactForm: boolean]
│   │   ├── dashboard-card.ts                  [MODIFY — add displayName, metricLabel, metricValue]
│   │   └── form-analysis.ts                   [MODIFY — add topAnswers, submissionDateRange]
│   └── use-cases/admin/
│       ├── manage-forms.ts                    [MODIFY — expose isContactForm in create/update]
│       ├── manage-dashboard-cards.ts          [MODIFY — accept/return new card fields]
│       └── manage-form-analysis.ts            [MODIFY — compute topAnswers + dateRange during analysis]
├── app/
│   └── api/admin/
│       ├── forms/[formId]/
│       │   └── analysis/
│       │       ├── route.ts                   [MODIFY — return topAnswers + dateRange in GET]
│       │       └── export/route.ts            [NEW — GET combined analysis export in PDF/CSV/Excel/JSON]
│       └── dashboard/
│           └── cards/route.ts                 [MODIFY — PUT accepts/returns displayName, metricLabel, metricValue]
├── presentation/
│   ├── components/admin/
│   │   ├── submissions-table/index.tsx        [MODIFY — add index column; inline export buttons; JSON format; filename fix]
│   │   ├── form-analysis/index.tsx            [MODIFY — add computed stats section; export button; side-by-side layout]
│   │   ├── form-manager/index.tsx             [MODIFY — show lock toggle only when isContactForm=true]
│   │   └── dashboard/index.tsx               [MODIFY — add name+metric edit fields; Save/Cancel; show displayName/metric on cards]
│   └── view-models/
│       ├── use-dashboard-analytics.ts         [MODIFY — send/receive displayName, metricLabel, metricValue; add saveDraft/cancel pattern]
│       └── use-form-analysis.ts               [MODIFY — expose exportAnalysis function]
└── messages/
    ├── en.json                                [MODIFY — new keys: submissions.index, formAnalysis.statsTitle, etc.]
    └── ar.json                                [MODIFY — Arabic translations for all new keys]
```

## Complexity Tracking

No constitution violations — all changes are additive modifications to existing files and patterns established in spec 001.
