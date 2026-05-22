# Implementation Plan: CMS Enhancements

**Branch**: `[002-cms-enhancements]` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-cms-enhancements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Expand the CMS with robust stability architectures including `zod`-validated generic environment variables, structural Arabic/English translation synchronizing scripts, Cloudinary Database Backups, LocalStorage drafts to prevent data loss, Admin Settings interfaces for variable cron jobs, and real-time SSE WebSockets for instant Admin notifications.

## Technical Context

**Language/Version**: TypeScript 5+ (Node.js 20 LTS)
**Primary Dependencies**: Next.js 14 App Router, zod, t3-env, next-intl, mongoose, cloudinary, upstash/redis
**Storage**: MongoDB, Cloudinary (Media + Database Backup Exports), Upstash Redis (SSE PubSub)
**Testing**: Jest / React Testing Library
**Target Platform**: Vercel/Node web server 
**Project Type**: Next.js Full Stack CMS
**Performance Goals**: <50ms pub/sub latency for SSE, instant local Draft saving
**Constraints**: Must adhere to strict MVP definitions (Clean architecture, no arbitrary dependencies, Cloudinary for raw exports).
**Scale/Scope**: Scales horizontally dependent entirely on Upstash scaling and MongoDB connections.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Architecture (MVVM)**: PASS (ViewModel intercepts local storage saves).
- **Technology Stack Mandate**: PASS (Redis handles pub/sub events. Cloudinary securely stores the exact Backup blob exports. Zod handles environment config).
- **Media Management via Cloudinary**: PASS (Media Admin manager directly syncs Cloudinary).
- **Internationalization**: PASS (Strict i18n synchronization scripts added to enforce mandate).

## Project Structure

### Documentation (this feature)

```text
specs/002-cms-enhancements/
├── plan.md              
├── research.md          
├── data-model.md        
├── quickstart.md        
├── contracts/           
│   ├── admin-settings.md
│   ├── admin-media.md
│   └── realtime-events.md
└── tasks.md             
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       ├── admin/settings/route.ts
│       ├── admin/events/route.ts       # SSE stream endpoint
│       ├── admin/backups/route.ts      
│       └── admin/media/route.ts        # Media manager
├── data/
│   ├── models/
│   │   ├── settings.model.ts
│   │   └── backup-log.model.ts
│   └── repositories/
│       ├── mongo-settings-repository.ts
│       └── mongo-backup-repository.ts
├── domain/
│   └── use-cases/
│       └── admin/
│           ├── manage-settings.ts
│           ├── execute-backup.ts
│           └── manage-media.ts
├── lib/
│   ├── env.mjs                  # Centralized configuration validation (T3)
│   ├── events/
│   │   └── publisher.ts         # Redis Pub/Sub integration
│   └── scripts/
│       └── i18n-sync.ts         # Script handling JSON syncing/linting
└── presentation/
    ├── view-models/
    │   ├── use-admin-settings.ts
    │   ├── use-media-manager.ts
    │   └── use-draft-autosave.ts
    └── components/
        └── admin/
            ├── settings-form.tsx
            ├── media-gallery.tsx
            └── live-notifications.tsx
```

**Structure Decision**: Extending the existing Clean Architecture application in `src/`. Scripts live under `src/lib/scripts` to avoid leaking outside the main source boundary, but can be invoked from `package.json`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None*    | N/A        | N/A                                 |
