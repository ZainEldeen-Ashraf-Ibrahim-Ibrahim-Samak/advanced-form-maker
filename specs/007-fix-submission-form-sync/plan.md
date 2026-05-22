# Implementation Plan: Fix Submission Form Sync

**Branch**: `[007-fix-empty-form-payload]` | **Date**: 2026-04-14 | **Spec**: [specs/007-fix-submission-form-sync/spec.md](spec.md)
**Input**: Feature specification from `/specs/007-fix-submission-form-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature resolves several issues in the form submission sync process: ensuring contact records can be managed (add/edit/delete/upload files) while maintaining at least one record, syncing the latest form structure for token-based users after admin updates (retaining matching fields and warning about dropped ones), delivering reliable resubmission notifications (stored for 7 days for offline users), supporting multi-select for the sector field, sharing a unified "SCCT" site name element across the app, and adding missing Arabic translation keys.

## Technical Context

**Language/Version**: TypeScript / Node.js (LTS)  
**Primary Dependencies**: Next.js (App Router), ShadCN UI, Mongoose, next-intl  
**Storage**: MongoDB (Mongoose), Cloudinary (for contact record file uploads)  
**Testing**: Jest / Playwright (existing test framework)  
**Target Platform**: Web Browser (Desktop & Mobile)  
**Project Type**: Full-stack Next.js Web Application  
**Performance Goals**: Fast UI updates for form syncing and contact record interactions  
**Constraints**: Must strictly follow MVVM, Clean Architecture, and use Upstash Redis for caching.  
**Scale/Scope**: Form submission updates and admin reviews.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance?
- [x] II. Technology Stack Mandate followed?
- [x] V. Internationalization (AR/EN) & RTL support planned?
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase?

## Project Structure

### Documentation (this feature)

```text
specs/007-fix-submission-form-sync/
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
│   ├── [locale]/
│   │   ├── admin/
│   │   ├── submit/
│   └── api/
│       └── submissions/
├── components/
│   ├── shared/
│   │   └── site-name.tsx
│   └── ui/
├── data/
│   ├── models/
│   ├── repositories/
│   └── services/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── use-cases/
├── presentation/
│   ├── components/
│   │   ├── admin/
│   │   └── client/
│   └── view-models/
└── i18n/
    ├── messages/
    │   ├── en.json
    │   └── ar.json
```

**Structure Decision**: Using the existing Next.js App Router structure with MVVM boundaries (Domain, Data, Presentation layers) as mandated by the constitution.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

### Phase 8: User Story 5 - Optional Contact Details UI Update
**Goal**: Change the contact info UI in submission forms, resubmission, and admin tables to make individual contact fields optional, while keeping the minimum requirement of at least one contact item in the array.

**Architecture**:
- Update schema rules in validations.ts.
- Update UI components: Client's Submission Form Contact Records, and Admin's Submissions Table / Details View.

### Phase 9: User Story 6 - Export Submissions to CSV & PDF
**Goal**: Enable downloading single submissions or selections of submissions directly to CSV and PDF formats from the admin interface.

**Architecture**:
- For **CSV**: Implement a frontend utility to iterate over `Submission` arrays, mapping their contact fields and dynamic `fieldValues` into a tabular grid format, generating a native Blob and triggering a save file action. (Optional: install `papaparse` if the custom fields require complex escaping).
- For **PDF**: 
  - Submissions list table mode: Provide a print-friendly CSS view and trigger browser printing, OR use a library.
  - Single submission mode: Enable a print-style layout hiding navigation elements, allowing exact 1-to-1 PDF printing natively, or generate via `jsPDF` / `html2pdf.js`.
- Provide specific UI integration points in `submission-review/index.tsx` (single) and `submissions-table/index.tsx` (batch).
