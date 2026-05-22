# Implementation Plan: Fix Empty Form Payload

**Branch**: `006-fix-empty-form-payload` | **Date**: 2026-04-13 | **Spec**: [specs/006-fix-empty-form-payload/spec.md](file:///d:/SCCT/specs/006-fix-empty-form-payload/spec.md)

## Summary
Refactor the React hooks handling data extraction logic in `useSubmission.ts` to retrieve values directly from the immediate hook scope or safely sequenced callbacks before purging the view model state, and update the server-side validator logic to reject entirely empty collections outright independently of dynamically cached requirement flags.

## Technical Context
**Language/Version**: TypeScript / Next.js App Router  
**Primary Dependencies**: React (Hooks), Zod (Backend Validation)  
**Storage**: N/A for this fix (MongoDB structure remains untouched)  
**Testing**: Local dev workflow  
**Target Platform**: Web Client  
**Project Type**: Web Application (CMS)  

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance? (Yes, the hook represents the view model boundary).
- [x] II. Technology Stack Mandate followed? (Next.js context used directly).
- [x] V. Internationalization (AR/EN) & RTL support planned? (Irrelevant to payload extraction).
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase? (N/A)

## Project Structure
### Documentation (this feature)
```text
specs/006-fix-empty-form-payload/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A for bug fix)
├── quickstart.md        # Phase 1 output (N/A for bug fix)
├── contracts/           # Phase 1 output (N/A for bug fix)
└── tasks.md             # To be output in tasks generation
```

### Source Code
The relevant modifications occur strictly within the client Hook domain and server Validation path.
```text
src/
├── presentation/
│   └── view-models/
│       └── use-submission.ts (Client state handler)
└── domain/
    └── use-cases/
        └── client/
            └── submit-form.ts (Backend orchestrator)
```

**Structure Decision**: No new structural boilerplate is necessary. All code adjustments will isolate and modify strictly existing execution paths to enforce synchronous state retrieval and validation.

## Complexity Tracking
*(No architectural violations triggered, complexity maintained strictly within original domain definitions).*
