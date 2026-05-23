# Quickstart: AI Photo Auto-Fill

**Feature**: 014-ai-photo-autofill
**Date**: 2026-05-23

## Prerequisites

1. **Google Gemini API Key** — Obtain from [Google AI Studio](https://aistudio.google.com/apikey)
2. **Environment variable** — Add to `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. **Install dependency**:
   ```bash
   npm install @google/genai
   ```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer                                      │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ ai-photo-upload  │  │ use-ai-extraction (VM hook) │  │
│  │ (component)      │──│  - manages upload state      │  │
│  │                  │  │  - calls API route           │  │
│  │ extraction-      │  │  - applies results to form   │  │
│  │ summary (comp)   │  └─────────────────────────────┘  │
│  └──────────────────┘                                    │
├──────────────────────────────────────────────────────────┤
│  Domain Layer                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ extract-document-data (use-case)                  │   │
│  │  - validates input                                │   │
│  │  - calls extraction service                       │   │
│  │  - returns ExtractionResult                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ai-extraction entities (ExtractionResult, etc.)   │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  Data Layer                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ai-extraction-service                             │   │
│  │  - builds dynamic schema from field defs          │   │
│  │  - constructs prompt                              │   │
│  │  - calls Gemini API with image + schema           │   │
│  │  - parses structured response                     │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ FormTemplate model (MODIFIED: +aiAutoFillEnabled) │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Key Files to Create/Modify

### New Files

| File | Layer | Purpose |
|------|-------|---------|
| `src/domain/entities/ai-extraction.ts` | Domain | ExtractionResult, ExtractedFieldValue types |
| `src/data/services/ai-extraction-service.ts` | Data | Gemini API integration |
| `src/domain/use-cases/client/extract-document-data.ts` | Domain | Extraction orchestration use-case |
| `src/app/api/ai/extract/route.ts` | API | Next.js API route handler |
| `src/presentation/components/client/submission-form/ai-photo-upload.tsx` | Presentation | Upload UI component |
| `src/presentation/components/client/submission-form/ai-extraction-summary.tsx` | Presentation | Results summary component |
| `src/presentation/view-models/use-ai-extraction.ts` | Presentation | ViewModel hook |
| `src/lib/validations/ai-extraction.ts` | Lib | Zod schemas for request/response |

### Modified Files

| File | Change |
|------|--------|
| `src/domain/entities/form-template.ts` | Add `aiAutoFillEnabled: boolean` to `FormTemplate` interface |
| `src/data/models/form-template.model.ts` | Add `aiAutoFillEnabled` field to Mongoose schema |
| `src/presentation/components/client/submission-form/index.tsx` | Integrate `AiPhotoUpload` component at top of form |
| `src/presentation/components/client/submission-form/field-renderer.tsx` | Add AI auto-fill indicator styling |
| `src/messages/en.json` | Add `aiExtraction` namespace |
| `src/messages/ar.json` | Add `aiExtraction` namespace |
| `src/env.mjs` | Add `GEMINI_API_KEY` to env schema |

## Development Flow

1. **Start with domain entities** — Define the extraction types (no dependencies)
2. **Build the AI service** — Implement Gemini integration in data layer
3. **Create the use-case** — Wire service to domain logic
4. **Create the API route** — Expose extraction via HTTP
5. **Build the ViewModel** — Client-side state management
6. **Build the UI components** — Upload section + summary + field indicators
7. **Integrate into submission form** — Wire everything together
8. **Add i18n strings** — EN/AR translations
9. **Add admin toggle** — FormTemplate model + admin UI
10. **Test** — Unit tests for service, use-case, and ViewModel

## Testing Locally

```bash
# Ensure GEMINI_API_KEY is set in .env.local
npm run dev

# Navigate to a submission form
# Enable AI auto-fill on the form template via admin panel
# Upload a document photo and observe auto-fill behavior
```
