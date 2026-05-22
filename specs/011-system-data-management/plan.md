# Implementation Plan: System Data Management

**Branch**: `011-system-data-management` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-system-data-management/spec.md`

## Summary

The admin portal requires system-wide automated data cleanup and backup functionalities. This includes a daily cron task to delete stale drafts and unused Cloudinary media when storage exceeds a configurable threshold, along with robust database snapshot/restore features. Finally, the data export (XLSX) utility must be fixed to handle translation keys safely.

## Technical Context

**Language/Version**: Node.js (v20+ LTS), TypeScript 5.x
**Primary Dependencies**: Next.js 16.x (App Router), Mongoose 8.x, Cloudinary API v2, xlsx, Upstash Redis
**Storage**: MongoDB (Atlas) and Cloudinary
**Testing**: Jest, React Testing Library
**Target Platform**: Web application (Next.js serverless and edge functions)
**Project Type**: Web application
**Performance Goals**: Dashboard Analytics Widget loads < 5s; User UI clicks < 2s.
**Constraints**: Destructive system restores; Daily cron scheduled tasks required; MVVM Clean Architecture.
**Scale/Scope**: Impacts all MongoDB schemas dynamically and the global settings model.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance? (Yes, the API endpoints will utilize Domain Repositories and ViewModels for the dashboard UI).
- [x] II. Technology Stack Mandate followed? (Yes, strictly using MongoDB, Cloudinary, Next.js, and Upstash Redis).
- [x] V. Internationalization (AR/EN) & RTL support planned? (Yes, the settings UI and export logic will properly handle AR/EN strings and translation maps).
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase? (Yes, scheduled tasks processing thousands of documents will be tested minimally locally, heavily in staging).

## Project Structure

### Documentation (this feature)

```text
specs/011-system-data-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (admin)/
│   │   ├── dashboard/page.tsx               # Analytics widget integration
│   │   └── settings/page.tsx                # Settings form for retention & cleanup config
│   └── api/
│       ├── admin/
│       │   ├── system/backup/route.ts       # Backup & Restore endpoints
│       │   └── system/export/route.ts       # Enhanced Excel export
│       └── cron/
│           └── system-cleanup/route.ts      # Automated task trigger
├── domain/
│   ├── repositories/
│   │   ├── SystemRepository.ts              # Abstract backup/restore contract
│   │   └── StorageRepository.ts             # Cloudinary usage contract
│   └── viewmodels/
│       └── DashboardAnalyticsViewModel.ts   # MVVM for widget presentation
├── data/
│   ├── repositories/
│   │   ├── MongoSystemRepository.ts         # Mongoose schema discovery and serialization
│   │   └── CloudinaryStorageRepository.ts   # Cloudinary usage and batch deletion
│   └── models/
│       └── Settings.ts                      # Appended draft/cloudinary config fields
└── lib/
    └── utils/
        └── exportUtils.ts                   # Nested key flattener for xlsx
```

**Structure Decision**: The application follows the established MVVM Next.js structure. Domain logic handles abstract backup operations while Data implements Mongoose-specific reflection. App handles the routing layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
