# Implementation Plan: Dynamic Client Data Collection & Admin Review

**Branch**: `001-client-data-review` | **Date**: 2026-04-13 | **Spec**: [spec.md](file:///D:/SCCT/specs/001-client-data-review/spec.md)
**Input**: Feature specification from `/specs/001-client-data-review/spec.md`

## Summary

Build a full-stack web application enabling administrators to define dynamic data collection forms with variable field types, and clients to submit data (including media uploads) via unique shareable links without authentication. The admin reviews submissions through a dashboard with flexible status management (Pending / Viewed / Needs Rewrite), full audit trail, and resubmission workflow. The system supports bilingual Arabic/English with RTL, dark/light theming, and uses Next.js + MongoDB + Cloudinary + Upstash Redis following Clean Architecture (MVVM).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (LTS)
**Primary Dependencies**: Next.js 14+ (App Router), ShadCN UI, Mongoose 8+, Auth.js v5, next-cloudinary, @upstash/redis, @upstash/ratelimit, next-intl, next-themes, @dnd-kit/core, Zod
**Storage**: MongoDB (Mongoose ODM) — primary data store; Cloudinary — media storage; Upstash Redis — caching & rate limiting
**Testing**: Vitest (unit + integration), Playwright (e2e)
**Target Platform**: Web — modern browsers (Chrome, Firefox, Safari, Edge, last 2 major versions), mobile-responsive
**Project Type**: Web application (Next.js full-stack, monolithic)
**Performance Goals**: 100 concurrent client submissions without degradation (SC-008), <1s language switch (SC-004), <500ms theme toggle (SC-005)
**Constraints**: 10 MB max file upload, single active form template (v1), no client authentication, no automated notifications (v1)
**Scale/Scope**: ~8 pages/views, 6 MongoDB collections, 5 API route groups, 2 locales, 2 themes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture (MVVM) | ✅ PASS | Domain/Data/Presentation layers separated; ViewModels as hooks; Repository pattern for all data access |
| II. Technology Stack Mandate | ✅ PASS | Node.js LTS, MongoDB/Mongoose, Cloudinary, Upstash Redis, Next.js + ShadCN UI — all mandated technologies used |
| III. Dynamic Schema Design | ✅ PASS | Key-Value pattern for field values; FieldDefinitions as first-class MongoDB documents; new input type = enum value + renderer |
| IV. Media Management via Cloudinary | ✅ PASS | Signed uploads via next-cloudinary; only public IDs + secure URLs stored; Cloudinary transformations for images; cleanup on deletion |
| V. Internationalization & Theming | ✅ PASS | next-intl with locale routing; CSS logical properties for RTL; next-themes + ShadCN CSS variables; preferences persisted |
| VI. Caching & Performance | ✅ PASS | Upstash Redis for field defs, submission lists, dashboard aggregations; explicit TTLs; cache invalidation on mutations; Redis-backed rate limiting |
| VII. Security & Data Integrity | ✅ PASS | Input sanitization (Zod); Auth.js for admin sessions; CSRF protection built-in; role-based access in middleware; full audit trail |

### Post-Design Re-Check

| Principle | Status | Delta |
|-----------|--------|-------|
| I. Clean Architecture (MVVM) | ✅ PASS | Repository pattern confirmed for MongoDB, Cloudinary, Redis |
| II. Technology Stack Mandate | ✅ PASS | No substitutions |
| III. Dynamic Schema Design | ✅ PASS | Key-Value pattern chosen (see research R-001); extensible via enum |
| IV. Media Management via Cloudinary | ✅ PASS | Signed uploads (not unsigned) for security of ID photos |
| V. Internationalization & Theming | ✅ PASS | next-intl chosen over i18next for App Router integration |
| VI. Caching & Performance | ✅ PASS | TTLs and invalidation keys defined in data-model.md |
| VII. Security & Data Integrity | ✅ PASS | UUID v4 tokens for client access; admin middleware guard |

## Project Structure

### Documentation (this feature)

```text
specs/001-client-data-review/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: MongoDB entities & relationships
├── quickstart.md        # Phase 1: Setup & run guide
├── contracts/           # Phase 1: API contracts
│   ├── admin-fields.md
│   ├── admin-forms.md
│   ├── admin-submissions.md
│   ├── client-submissions.md
│   └── cloudinary-auth.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/                            # Next.js App Router (routing layer)
│   ├── [locale]/                   # Locale-based routing
│   │   ├── layout.tsx              # Root layout (providers, dir, lang)
│   │   ├── page.tsx                # Landing / redirect
│   │   ├── admin/                  # Admin route group (protected)
│   │   │   ├── layout.tsx          # Admin layout (sidebar, nav)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Submission review dashboard
│   │   │   ├── forms/
│   │   │   │   ├── page.tsx        # Form template list
│   │   │   │   └── [id]/
│   │   │   │       └── fields/
│   │   │   │           └── page.tsx # Field builder
│   │   │   └── login/
│   │   │       └── page.tsx        # Admin login
│   │   └── submit/                 # Client submission (public)
│   │       └── [token]/
│   │           └── page.tsx        # Submission form / status view
│   └── api/                        # API routes
│       ├── admin/
│       │   ├── fields/
│       │   │   └── route.ts        # Field CRUD
│       │   ├── forms/
│       │   │   └── route.ts        # Form template CRUD
│       │   ├── submissions/
│       │   │   └── route.ts        # Submission review
│       │   └── preferences/
│       │       └── route.ts        # User preferences
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts        # Auth.js handlers
│       ├── cloudinary/
│       │   └── sign/
│       │       └── route.ts        # Upload signature
│       └── submissions/
│           └── [token]/
│               └── route.ts        # Client submission API
├── domain/                         # Domain layer (zero framework imports)
│   ├── entities/
│   │   ├── field-definition.ts
│   │   ├── form-template.ts
│   │   ├── submission.ts
│   │   ├── field-value.ts
│   │   ├── audit-entry.ts
│   │   └── user.ts
│   ├── repositories/
│   │   ├── field-definition-repository.ts
│   │   ├── form-template-repository.ts
│   │   ├── submission-repository.ts
│   │   ├── field-value-repository.ts
│   │   └── user-repository.ts
│   └── use-cases/
│       ├── admin/
│       │   ├── manage-fields.ts
│       │   ├── manage-forms.ts
│       │   ├── review-submissions.ts
│       │   └── manage-preferences.ts
│       └── client/
│           ├── submit-form.ts
│           └── view-submission.ts
├── data/                           # Data layer (infrastructure)
│   ├── models/                     # Mongoose schemas
│   │   ├── field-definition.model.ts
│   │   ├── form-template.model.ts
│   │   ├── submission.model.ts
│   │   ├── field-value.model.ts
│   │   └── user.model.ts
│   ├── repositories/               # Repository implementations
│   │   ├── mongo-field-definition-repository.ts
│   │   ├── mongo-form-template-repository.ts
│   │   ├── mongo-submission-repository.ts
│   │   ├── mongo-field-value-repository.ts
│   │   └── mongo-user-repository.ts
│   └── services/
│       ├── cloudinary-service.ts   # Upload, destroy, transform
│       └── cache-service.ts        # Upstash Redis caching
├── presentation/                   # Presentation layer
│   ├── components/                 # ShadCN UI + custom components
│   │   ├── ui/                     # ShadCN primitives
│   │   ├── admin/                  # Admin-specific components
│   │   │   ├── field-builder/
│   │   │   ├── submission-table/
│   │   │   ├── submission-detail/
│   │   │   └── form-manager/
│   │   ├── client/                 # Client-specific components
│   │   │   ├── dynamic-form/
│   │   │   └── submission-status/
│   │   └── shared/                 # Shared components
│   │       ├── language-switcher/
│   │       ├── theme-toggle/
│   │       └── media-viewer/
│   ├── view-models/                # ViewModel hooks
│   │   ├── use-field-builder.ts
│   │   ├── use-submission-form.ts
│   │   ├── use-submission-review.ts
│   │   ├── use-dashboard.ts
│   │   └── use-form-manager.ts
│   └── providers/
│       ├── theme-provider.tsx
│       └── auth-provider.tsx
├── lib/                            # Shared utilities
│   ├── db.ts                       # MongoDB connection singleton
│   ├── redis.ts                    # Upstash Redis client
│   ├── auth.ts                     # Auth.js config
│   ├── validations.ts              # Zod schemas
│   └── utils.ts                    # Shared helpers
├── messages/                       # i18n translations
│   ├── en.json
│   └── ar.json
├── middleware.ts                    # Auth + rate limiting + i18n
└── i18n.ts                         # next-intl config

tests/
├── unit/
│   ├── domain/                     # Use case & entity tests
│   └── presentation/               # ViewModel tests
├── integration/
│   └── api/                        # API endpoint tests
└── e2e/
    ├── submission-flow.spec.ts
    └── admin-review.spec.ts
```

**Structure Decision**: Monolithic Next.js application using the App Router with a clean three-layer architecture (domain → data → presentation). Locale-based routing (`[locale]`) at the layout level for i18n. Separate `domain/`, `data/`, and `presentation/` directories enforce the dependency rule (Presentation → Domain → Data). This is the "Web application" option adapted for a single Next.js project rather than separate frontend/backend services, which is appropriate given the full-stack nature of Next.js.

## Complexity Tracking

> No constitution violations detected. All architectural decisions align with mandated principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *(none)* | — | — |
