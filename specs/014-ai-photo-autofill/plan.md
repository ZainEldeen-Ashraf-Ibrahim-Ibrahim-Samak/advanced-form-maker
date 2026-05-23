# Implementation Plan: AI Photo Auto-Fill

**Branch**: `014-ai-photo-autofill` | **Date**: 2026-05-23 | **Spec**: [spec.md](file:///Users/placeholder/Downloads/SCCT-main/specs/014-ai-photo-autofill/spec.md)
**Input**: Feature specification from `specs/014-ai-photo-autofill/spec.md`

## Summary

Enable users to upload a document photo (ID, passport, etc.) on the submission form, which is processed by an AI vision service to extract structured data and auto-fill both contact records and dynamic form fields. The feature is controlled per form template by admins via a toggle, uses Google Gemini's vision API for extraction with field definitions sent alongside the image for direct field-ID-keyed responses, and includes a 30-second timeout with graceful fallback to manual entry.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js (LTS)
**Primary Dependencies**: Next.js 16.2.3, React 19.2.4, ShadCN UI, next-intl 4.9.1, Mongoose 8.23, Zod 4.3.6
**Storage**: MongoDB (Mongoose ODM), Cloudinary (media), Upstash Redis (cache)
**Testing**: Jest 30, @testing-library/react 16, ts-jest
**Target Platform**: Web application (responsive, desktop + mobile browsers)
**Project Type**: Web service (Next.js App Router with server components + API routes)
**Performance Goals**: AI extraction end-to-end < 15 seconds typical, 30-second hard timeout
**Constraints**: Must not exceed 30s for AI response; document images processed transiently (not persisted unless attached); bilingual EN/AR UI
**Scale/Scope**: Same user base as existing app; AI extraction is per-submission, not batch

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance? — New AI extraction service in Data layer, use-case in Domain layer, ViewModel hook in Presentation layer. No cross-layer violations.
- [x] II. Technology Stack Mandate followed? — Using Google Gemini API (cloud AI service, not a new framework). All other tech stays within the mandated stack (Next.js, MongoDB, Cloudinary, Redis).
- [x] V. Internationalization (AR/EN) & RTL support planned? — All new UI strings will have EN/AR keys via next-intl. CSS will use logical properties for RTL.
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase? — Unit tests first; build validation in final task.

## Project Structure

### Documentation (this feature)

```text
specs/014-ai-photo-autofill/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ai-extraction-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── ai/
│           └── extract/
│               └── route.ts              # API route: receives image + field defs, calls Gemini, returns keyed values
├── data/
│   ├── models/
│   │   └── form-template.model.ts        # MODIFY: add aiAutoFillEnabled boolean field
│   └── services/
│       └── ai-extraction-service.ts      # NEW: Gemini vision API integration (Data layer)
├── domain/
│   ├── entities/
│   │   ├── form-template.ts              # MODIFY: add aiAutoFillEnabled to FormTemplate interface
│   │   └── ai-extraction.ts             # NEW: ExtractionResult, ExtractionFieldValue entities
│   └── use-cases/
│       └── client/
│           └── extract-document-data.ts  # NEW: orchestrates extraction use case
├── presentation/
│   ├── components/
│   │   └── client/
│   │       └── submission-form/
│   │           ├── ai-photo-upload.tsx    # NEW: top-of-form AI upload section component
│   │           ├── ai-extraction-summary.tsx  # NEW: post-extraction summary overlay
│   │           ├── field-renderer.tsx     # MODIFY: add AI auto-fill indicator badge
│   │           └── index.tsx             # MODIFY: integrate AI upload section
│   └── view-models/
│       └── use-ai-extraction.ts          # NEW: ViewModel hook for AI extraction state
├── lib/
│   └── validations/
│       └── ai-extraction.ts             # NEW: Zod schemas for extraction request/response
└── messages/
    ├── en.json                           # MODIFY: add aiExtraction namespace keys
    └── ar.json                           # MODIFY: add aiExtraction namespace keys
```

**Structure Decision**: Follows existing Clean Architecture (MVVM) pattern. New AI service sits in Data layer, new use-case in Domain layer, new components + ViewModel in Presentation layer. The API route acts as the boundary between client and server-side AI processing.

## Complexity Tracking

> No constitution violations. All design choices align with existing patterns.
