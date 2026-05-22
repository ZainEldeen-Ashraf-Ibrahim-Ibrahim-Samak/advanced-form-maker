# Implementation Plan: Fix Hydration & Application Stability

**Branch**: `005-fix-hydration-stability` | **Date**: 2026-04-13 | **Spec**: [spec.md](file:///d:/SCCT/specs/005-fix-hydration-stability/spec.md)
**Input**: Feature specification from `specs/005-fix-hydration-stability/spec.md`

## Summary

Fix four categories of production bugs: (1) hydration mismatches across the site caused by blanket `suppressHydrationWarning` usage on components that don't need it, and missing client-only guards on theme-dependent rendering; (2) submission form infinite re-fetch loop caused by unstable `useCallback` dependencies in `useSubmission` that include mutable draft state; (3) delete confirmation dialog that auto-closes because it's nested inside a dropdown menu whose close event propagates to the dialog; (4) MongoDB `connectToDatabase()` being called redundantly on every repository method invocation despite having a cached connection singleton. All fixes are targeted, minimal patches — no architectural refactoring.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js LTS  
**Primary Dependencies**: Next.js (App Router), @base-ui/react, next-intl, next-themes, next-auth, mongoose, ShadCN UI  
**Storage**: MongoDB (Mongoose ODM), Upstash Redis  
**Testing**: Jest (unit), browser console verification (hydration)  
**Target Platform**: Web (SSR + CSR), Vercel/Docker/Cloud Run  
**Project Type**: Web application (bilingual AR/EN CMS)  
**Performance Goals**: Zero hydration warnings, form stable for 10+ min editing  
**Constraints**: Backward-compatible with i18n/RTL, targeted patches only  
**Scale/Scope**: Admin dashboard + public submission form, ~15 components affected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance? — All changes stay within their correct layers (Presentation for hooks/components, Lib for DB utility). No cross-layer violations.
- [x] II. Technology Stack Mandate followed? — Using existing stack (Next.js, @base-ui/react, Mongoose, ShadCN). No new dependencies introduced.
- [x] V. Internationalization (AR/EN) & RTL support planned? — All fixes preserve existing i18n and RTL/LTR behavior. Logical CSS properties unchanged.
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase? — Fixes are lightweight code patches. Build verification deferred to final verification phase.

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-hydration-stability/
├── plan.md              # This file
├── research.md          # Phase 0 output — root cause analysis
├── data-model.md        # Phase 1 output — no schema changes (bug fix)
├── contracts/           # Phase 1 output — no API contract changes
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── db.ts                                          # FIX: Add retry limits, connection state logging
├── presentation/
│   ├── view-models/
│   │   ├── use-submission.ts                          # FIX: Stabilize fetchContent deps, queue SSE events
│   │   └── use-submissions-list.ts                    # (unchanged — delete logic is correct)
│   └── components/
│       ├── admin/
│       │   ├── submissions-table/index.tsx             # FIX: Decouple AlertDialog from DropdownMenu
│       │   ├── dashboard/index.tsx                     # (unchanged — uses SubmissionsTable)
│       │   └── submissions-manager/index.tsx           # (unchanged — uses SubmissionsTable)
│       └── shared/
│           ├── theme-toggle/index.tsx                  # FIX: Remove suppressHydrationWarning, use mounted guard
│           └── language-switcher/index.tsx              # FIX: Remove suppressHydrationWarning
├── components/ui/
│   ├── button.tsx                                      # FIX: Remove blanket suppressHydrationWarning
│   └── input.tsx                                       # FIX: Remove blanket suppressHydrationWarning
└── app/[locale]/
    └── layout.tsx                                      # OK: suppressHydrationWarning on <html>/<body> is correct (next-themes)
```

**Structure Decision**: Existing Clean Architecture layout preserved. All modifications are in-place patches to existing files — no new files or new directories needed.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
