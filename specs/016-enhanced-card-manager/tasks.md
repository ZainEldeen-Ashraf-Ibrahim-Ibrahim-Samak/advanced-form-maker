# Tasks: Enhanced Dashboard Card Manager

**Input**: Design documents from `specs/016-enhanced-card-manager/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in this phase)
- **[Story]**: User story (US1–US6)
- No test tasks — none explicitly requested in spec

---

## Phase 1: Setup

No new setup required — this feature modifies an existing Next.js project. Proceed directly to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model and entity changes that ALL user stories depend on. Must complete before any story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Add `displayNameAr`, `displayNameEn`, `logoUrl` fields (all `String, default: null`) to `IDashboardCard` interface and `dashboardCardSchema` in `src/data/models/dashboard-card.model.ts`
- [x] T002 [P] Add `displayNameAr: string | null`, `displayNameEn: string | null`, `logoUrl: string | null` to `DashboardCard` interface and `UpdateDashboardCardInput` interface in `src/domain/entities/dashboard-card.ts`
- [x] T003 [P] Create `StatCardConfig` Mongoose schema and model (`IDashboardStatCard` interface, fields: `slug` String required unique enum, `visible` Boolean default true, `sortOrder` Number default 0, `displayNameAr` String null, `displayNameEn` String null, timestamps, collection `stat_card_configs`) in `src/data/models/stat-card-config.model.ts`
- [x] T004 [P] Create `StatCardConfig` domain entity (`id`, `slug`, `visible`, `sortOrder`, `displayNameAr`, `displayNameEn`, `createdAt`, `updatedAt`) and `UpdateStatCardConfigInput` interface in `src/domain/entities/stat-card-config.ts`
- [x] T005 [P] Create `StatCardConfigRepository` interface with `listAll(): Promise<StatCardConfig[]>`, `seedDefaults(): Promise<void>`, `upsertMany(configs: UpdateStatCardConfigInput[]): Promise<void>` in `src/domain/repositories/stat-card-config-repository.ts`

**Checkpoint**: All shared entities and schemas in place — user story implementation can now begin.

---

## Phase 3: User Story 6 — Analysis Date Range Bug Fix (Priority: P1) 🎯 MVP

**Goal**: Fix incorrect "No submissions yet" date range and submission count shown on the analysis panel even when submissions exist.

**Independent Test**: Navigate to any form with ≥1 submission → Analysis tab shows correct Total Submissions count and a real date range (not "No submissions yet").

- [x] T006 [US6] Fix `findByFormId` in `src/data/repositories/mongo-submission-repository.ts` — change `SubmissionModel.find({ formTemplateId }).lean()` to `SubmissionModel.find({ formTemplateId: new mongoose.Types.ObjectId(formTemplateId) }).lean()` (add import for mongoose if not already imported at top of file)

**Checkpoint**: Analysis panel correctly shows submission count and date range for any form with ≥1 submissions.

---

## Phase 4: User Story 1 — Bilingual Card Titles & Logo (Priority: P1) 🎯 MVP

**Goal**: Form summary cards display locale-appropriate AR/EN names; admin can set both title variants and an optional logo URL per card.

**Independent Test**: Set AR + EN names for a form card in the card manager → switch locale AR/EN on dashboard → correct name shown. Set logo URL → logo appears on card face.

- [x] T007 [P] [US1] Update `toEntity()` mapper and `updateMany()` bulk write in `src/data/repositories/mongo-dashboard-card-repository.ts` to include `displayNameAr`, `displayNameEn`, `logoUrl` fields
- [x] T008 [P] [US1] Add `displayNameAr: string | null`, `displayNameEn: string | null`, `logoUrl: string | null` to `DashboardCardWithData` interface and `FormSummaryCardItem` (introduce if not yet present) in `src/presentation/view-models/use-dashboard-analytics.ts`; update `reorderCards` payload to include new fields
- [x] T009 [P] [US1] Add `displayNameAr`, `displayNameEn`, `logoUrl` to the `updateCardSchema` Zod object in `src/app/api/admin/dashboard/cards/route.ts` (all `.string().nullable().optional()`)
- [x] T010 [P] [US1] Add i18n keys `editCardNameAr`, `editCardNameEn`, `editLogoUrl`, `logoUrlPlaceholder` under the `dashboard` namespace in `src/messages/en.json` and `src/messages/ar.json`
- [x] T011 [US1] Update `SortableCardRow` in `src/presentation/components/admin/dashboard/index.tsx`: (a) replace single `displayName` `<Input>` with two inputs for `displayNameAr` and `displayNameEn`; (b) add `logoUrl` `<Input>` field; (c) update card display to use `locale === 'ar' ? (card.displayNameAr ?? card.displayNameEn ?? card.name) : (card.displayNameEn ?? card.displayNameAr ?? card.name)` via `useLocale()`; (d) update `onUpdateField` type to include the new fields; (e) update `updateDraftCardField` in `AdminDashboard` to handle new field names

**Checkpoint**: Card manager dialog shows AR Name / EN Name / Logo URL inputs. Dashboard cards show locale-correct title. Logo renders when URL is set.

---

## Phase 5: User Story 2 — Form Summaries Section at Top (Priority: P1)

**Goal**: The form summary card grid is the first content block on the dashboard, above the stat count row.

**Independent Test**: Load dashboard → form summary cards section appears before the Total Submissions / Pending / Drafts / Viewed / Needs Rewrite count cards.

- [x] T012 [US2] In `src/presentation/components/admin/dashboard/index.tsx`, move the `{!isLoadingCards && cards.length > 0 && (…)}` Form Summaries block to immediately after the page title `<div>` (before the `<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">` stat cards grid)

**Checkpoint**: Dashboard renders Form Summaries first, stat counts below.

---

## Phase 6: User Story 3 — Manage Default Status Cards (Priority: P2)

**Goal**: The five hardcoded stat cards (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite) appear in the card manager dialog and support visibility toggle, custom AR/EN labels, and sort ordering alongside form cards.

**Independent Test**: Open card manager → stat cards appear as entries → hide "Needs Rewrite" → save → card disappears from dashboard → re-enable → it reappears.

- [x] T013 [US3] Implement `MongoStatCardConfigRepository` in `src/data/repositories/mongo-stat-card-config-repository.ts`: `listAll()` finds all sorted by sortOrder; `seedDefaults()` bulkWrite upserts 5 slugs (`total`, `pending`, `draft`, `viewed`, `needs_rewrite`) with defaults (visible true, sortOrder 0–4, null labels) using `setOnInsert` so existing config is not overwritten; `upsertMany()` bulkWrite `$set` per slug
- [x] T014 [US3] Extend `ManageDashboardCardsUseCase` in `src/domain/use-cases/admin/manage-dashboard-cards.ts`: add `StatCardConfigRepository` constructor parameter; define `STAT_CARD_DEFAULTS` constant (slug → `defaultLabelEn`, `defaultLabelAr`, `defaultIcon`, initial sortOrder); update `listCardsWithFormData()` to call `statCardRepo.seedDefaults()` then `statCardRepo.listAll()`, build a `StatCardItem[]` array, merge with form card items into a single sorted array by `sortOrder`, return `UnifiedCardItem[]`; update `saveCardConfig()` to split input by `cardType` and route to the correct repo
- [x] T015 [US3] Export `UnifiedCardItem`, `FormSummaryCardItem`, `StatCardItem` types from `src/domain/use-cases/admin/manage-dashboard-cards.ts` (or a new `src/domain/entities/unified-card.ts` if preferred); update `DashboardCardWithData` export to be an alias or union
- [x] T016 [US3] Update `src/app/api/admin/dashboard/cards/route.ts`: instantiate `MongoStatCardConfigRepository`; pass it to `ManageDashboardCardsUseCase` constructor; extend the `updateCardSchema` Zod union to discriminate on `cardType: z.enum(['form','stat'])` — form items require `formTemplateId`, stat items require `slug`
- [x] T017 [P] [US3] Add stat card label i18n keys (`statCardTotal`, `statCardPending`, `statCardDraft`, `statCardViewed`, `statCardNeedsRewrite`, `formSummariesTitle`) under `dashboard` namespace in `src/messages/en.json` and `src/messages/ar.json`
- [x] T018 [US3] Update `useDashboardAnalytics` view-model in `src/presentation/view-models/use-dashboard-analytics.ts`: change `cards` state type to `UnifiedCardItem[]`; update `reorderCards` to include `cardType` in payload; update `DashboardCardWithData` export to `UnifiedCardItem` (or re-export). Update `AdminDashboard` in `src/presentation/components/admin/dashboard/index.tsx`: render stat cards from the unified `cards` array (filter `cardType === 'stat'`) instead of hardcoded JSX, using `counts` from `useSubmissionsList()` for live values; keep form summary cards from filtering `cardType === 'form'`; update `SortableCardRow` to accept both card types and render appropriate inputs (stat cards show only AR/EN name; form cards show AR/EN name + logo + metric)

**Checkpoint**: Card manager lists all 7+ cards (5 stat + form cards). Toggling stat card visibility shows/hides it on dashboard. Custom AR/EN labels render correctly.

---

## Phase 7: User Story 4 — Card Manager from Submissions Page (Priority: P2)

**Goal**: A "Manage Cards" button on the Submissions page opens the same card manager dialog.

**Independent Test**: Navigate to Submissions page → click "Manage Cards" → dialog opens → make change → save → visit Dashboard → change is reflected.

- [x] T019 [US4] Extract the card manager `<Dialog>` JSX and `SortableCardRow` component from `src/presentation/components/admin/dashboard/index.tsx` into a new shared component `src/presentation/components/admin/card-manager-dialog/index.tsx` with props: `open: boolean`, `onOpenChange: (v: boolean) => void`, `cards: UnifiedCardItem[]`, `onSave: (cards: UnifiedCardItem[]) => Promise<void>`, `t: ReturnType<typeof useTranslations>`
- [x] T020 [US4] Update `src/presentation/components/admin/dashboard/index.tsx` to import and use `<CardManagerDialog>` instead of the inline Dialog JSX (pass existing `isEditDialogOpen`, `draftCards`, `handleSave`, `handleCancel` state/handlers)
- [x] T021 [US4] In `src/presentation/components/admin/submissions-manager/index.tsx`: import `useDashboardAnalytics` and `CardManagerDialog`; add `isCardManagerOpen` state; add a "Manage Cards" `<Button variant="outline" size="sm">` in the page header section; render `<CardManagerDialog>` wired to the cards/reorderCards from the hook

**Checkpoint**: "Manage Cards" button visible on Submissions page. Dialog opens and saves correctly from that page.

---

## Phase 8: User Story 5 — Card Style Matching (Priority: P2)

**Goal**: Form summary cards use the same compact header + bold metric layout as the default stat count cards.

**Independent Test**: Compare a form summary card to the Total Submissions stat card — same compact height, same `text-sm font-medium` title, same `text-2xl font-bold` metric, icon top-right.

- [x] T022 [US5] In `src/presentation/components/admin/dashboard/index.tsx`, update the form summary card rendering in the `cards.filter(c => c.cardType === 'form').map(…)` block: replace `CardDescription` with no description; set `CardHeader` to `flex-row items-center justify-between space-y-0 pb-2`; set `CardTitle` to `text-sm font-medium`; render locale-aware name as title; render logo `<img>` or `<FileText className="h-4 w-4 text-muted-foreground" />` icon on the right; render metric value or submission count with `text-2xl font-bold` in `CardContent`; remove the "Manage →" link from the card face (card becomes a pure stat display; navigation is via the existing form manager page)

**Checkpoint**: Form summary cards are visually identical in layout to the hardcoded stat cards.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T023 [P] Audit all dashboard i18n keys added in T010 and T017 — confirm every new string in components uses `t("key")` and has entries in both `src/messages/en.json` and `src/messages/ar.json`
- [x] T024 [P] Verify RTL layout in card manager dialog inputs for Arabic locale — `<Input>` fields for AR names should be `dir="rtl"` or inherit RTL from the page; confirm no text overflow in AR names
- [x] T025 Run production build to verify TypeScript compilation: `npm run build` (resolves any type errors from the `UnifiedCardItem` union)

**Checkpoint**: Feature complete, all stories independently testable, build passing.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — start immediately
- **Phase 3–8 (US stories)**: All require Phase 2 completion
- **Phase 9 (Polish)**: Requires all desired stories complete

### User Story Dependencies

- **US6 (Phase 3)**: Independent — only touches `mongo-submission-repository.ts`
- **US1 (Phase 4)**: Requires Phase 2 (T001, T002); independent of US6
- **US2 (Phase 5)**: Requires Phase 2; touches same file as US1 (T011 before T012)
- **US3 (Phase 6)**: Requires Phase 2 (T003–T005); builds on Phase 4/5 dashboard changes
- **US4 (Phase 7)**: Requires Phase 6 (T018 must complete before extracting Dialog in T019); T019 extracts component from the same file modified in Phases 4/5/6
- **US5 (Phase 8)**: Requires Phase 6 (T018 establishes the `cardType === 'form'` rendering pattern)

### Tasks Touching the Same File (must be sequential)

`src/presentation/components/admin/dashboard/index.tsx` is modified in:
- T011 (US1) → T012 (US2) → T018 (US3) → T019/T020 (US4) → T022 (US5)

These must be done in order. All other tasks in each phase are independent.

### Heavy Process Staging (Principle VIII)

- T025 (`npm run build`) is deferred to Phase 9 — runs only after all feature logic is complete.

### Parallel Opportunities

```
# Phase 2 — all 5 tasks can run in parallel:
T001 (dashboard-card.model.ts)
T002 (dashboard-card.ts entity)
T003 (stat-card-config.model.ts)
T004 (stat-card-config.ts entity)
T005 (stat-card-config-repository.ts)

# Phase 4 — T007, T008, T009, T010 can run in parallel:
T007 (mongo-dashboard-card-repository.ts)
T008 (use-dashboard-analytics.ts types)
T009 (cards/route.ts schema)
T010 (en.json + ar.json)
# T011 depends on T007, T008 completing first

# Phase 9 — T023 and T024 can run in parallel
```

---

## Implementation Strategy

### MVP First (US6 + US1 + US2 only — P1 stories)

1. Complete Phase 2: Foundational (T001–T005)
2. Complete Phase 3: US6 bug fix (T006) — immediate value
3. Complete Phase 4: US1 bilingual + logo (T007–T011)
4. Complete Phase 5: US2 section position (T012)
5. **STOP and VALIDATE**: Analysis date range correct, card titles bilingual, form summaries at top
6. Ship P1 features

### Incremental Delivery

1. Foundation (T001–T005) → enables all stories
2. US6 (T006) → analysis panel works correctly
3. US1 (T007–T011) → bilingual card names + logo
4. US2 (T012) → section at top
5. US3 (T013–T018) → default stat cards manageable
6. US4 (T019–T021) → card manager on Submissions page
7. US5 (T022) → card visual consistency
8. Polish (T023–T025) → build verified

---

## Notes

- T001–T005 are safe to implement in any order within Phase 2 (different files)
- `dashboard/index.tsx` is the most-touched file (5 sequential tasks); plan accordingly
- US3 is the most complex phase (6 tasks, new collection, use-case refactor, API change)
- The stat card live counts (total, pending, etc.) continue to come from the existing `useSubmissionsList` hook — `StatCardItem` stores only configuration (visibility, labels, sort), not live values
- `displayName` (the old single-locale field) remains in the schema for backward compatibility but the UI stops writing to it after T011; new locale-aware display uses `displayNameAr`/`displayNameEn`
