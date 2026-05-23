# Implementation Plan: Enhanced Dashboard Card Manager

**Branch**: `main` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/016-enhanced-card-manager/spec.md`

## Summary

Six improvements to the admin dashboard card system plus one bug fix: (1) DashboardCard gains AR/EN bilingual display names and an optional logo URL, replacing the single `displayName` field; (2) the "Form Summaries" section is repositioned to the top of the dashboard page; (3) the five hardcoded status count cards (Total, Pending, Draft, Viewed, Needs Rewrite) become manageable through a new `StatCardConfig` collection — visibility, AR/EN labels, and sort order are all configurable; (4) the card manager dialog is extracted into a shared component and linked from the Submissions page; (5) form summary cards are restyled to match the compact header+icon+bold-metric layout of the default stat cards; (6) the `mongo-submission-repository.findByFormId()` bug (missing ObjectId cast) is fixed so that the analysis backfill correctly populates `submissionDateRange` and `submissionCount`.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20  
**Primary Dependencies**: Next.js 16.2 (App Router), React 19, Mongoose 8, next-intl 4 (AR/EN), @dnd-kit/sortable, shadcn/ui, Tailwind CSS 4, Zod  
**Storage**: MongoDB 6 via Mongoose 8 — new `stat_card_configs` collection (5 seeded documents); additive fields on `dashboard_cards`  
**Testing**: Jest 30, @testing-library/react 16  
**Target Platform**: Web — desktop and mobile-responsive, RTL (Arabic) and LTR (English) bilingual  
**Project Type**: Next.js App Router fullstack monorepo  
**Performance Goals**: Card manager loads in same request as before (lazy seed adds ≤5 upserts on first cold start, O(1) thereafter)  
**Constraints**: All new UI strings require AR/EN keys; no new runtime npm packages; Mongoose additive fields use `default: null` for backward compatibility  
**Scale/Scope**: 5 stat cards + ≤20 form cards; single admin user

## Constitution Check

- [x] **I. Clean Architecture (MVVM)** — new `StatCardConfig` flows: Mongoose schema → domain entity → repository interface → data implementation → use-case → API route → view-model → component. The shared `CardManagerDialog` component holds zero business logic; all state via view-model.
- [x] **II. Technology Stack Mandate** — zero new npm dependencies; uses existing Mongoose, Zod, shadcn/ui, @dnd-kit/sortable, next-intl.
- [x] **V. Internationalization (AR/EN) & RTL** — all new text (card name fields, logo URL label, stat card default labels, form summaries section header) added to both `src/messages/en.json` and `src/messages/ar.json`; locale switching uses `useLocale()` from next-intl.
- [x] **VIII. Heavy processes deferred** — no migration scripts; Mongoose `default: null` handles existing DashboardCard documents; StatCardConfig seeded lazily on first GET.

## Project Structure

### Documentation (this feature)

```text
specs/016-enhanced-card-manager/
├── plan.md              ← this file
├── research.md          ← 7 design decisions (completed)
├── data-model.md        ← entity changes + new StatCardConfig entity
├── contracts/
│   └── dashboard-cards-unified-api.schema.json
├── quickstart.md        ← test scenarios per user story
└── tasks.md             ← Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── data/
│   ├── models/
│   │   ├── dashboard-card.model.ts              [MODIFY — add displayNameAr, displayNameEn, logoUrl]
│   │   └── stat-card-config.model.ts            [NEW — StatCardConfig Mongoose model]
│   └── repositories/
│       ├── mongo-dashboard-card-repository.ts   [MODIFY — map new fields in toEntity + updateMany]
│       ├── mongo-stat-card-config-repository.ts [NEW — listAll, seedDefaults, upsertMany]
│       └── mongo-submission-repository.ts       [FIX — add ObjectId cast in findByFormId]
│
├── domain/
│   ├── entities/
│   │   ├── dashboard-card.ts                    [MODIFY — add displayNameAr, displayNameEn, logoUrl to interfaces]
│   │   └── stat-card-config.ts                  [NEW — StatCardConfig entity + UpdateStatCardConfigInput]
│   ├── repositories/
│   │   └── stat-card-config-repository.ts       [NEW — repository interface]
│   └── use-cases/
│       └── admin/
│           └── manage-dashboard-cards.ts        [MODIFY — inject StatCardConfigRepository; unify list/save]
│
├── app/
│   └── api/
│       └── admin/
│           └── dashboard/
│               └── cards/
│                   └── route.ts                 [MODIFY — handle unified PUT schema; cardType dispatch]
│
├── presentation/
│   ├── components/
│   │   └── admin/
│   │       ├── card-manager-dialog/
│   │       │   └── index.tsx                    [NEW — extracted shared CardManagerDialog component]
│   │       ├── dashboard/
│   │       │   └── index.tsx                    [MODIFY — use unified cards; move section top; restyle; use shared dialog]
│   │       └── submissions-manager/
│   │           └── index.tsx                    [MODIFY — add Manage Cards button + import shared dialog]
│   └── view-models/
│       └── use-dashboard-analytics.ts           [MODIFY — handle UnifiedCardItem type; update reorderCards payload]
│
└── messages/
    ├── en.json                                  [MODIFY — add editCardNameAr, editCardNameEn, editLogoUrl, stat labels, formSummariesTitle]
    └── ar.json                                  [MODIFY — same keys in Arabic]
```

## Complexity Tracking

No constitution violations.

| New Element | Justification |
|---|---|
| `StatCardConfig` collection | 5 hardcoded stat cards need persistent config (visibility, sort order, custom labels). Cannot use existing DashboardCard collection without breaking its required ObjectId FK constraint. |
| Shared `CardManagerDialog` component | Used in 2 pages (Dashboard + Submissions). Shared to avoid JSX duplication. |
