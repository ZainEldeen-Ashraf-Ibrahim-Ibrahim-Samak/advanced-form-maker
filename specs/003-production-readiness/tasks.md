# Tasks: Production Readiness

**Input**: Design documents from `/specs/003-production-readiness/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Integration tests are explicitly required per the constitution and spec.md for API endpoints.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared validation assets and execution entry points for production-readiness work.

- [x] T001 Configure Jest for Next.js API integration testing in `jest.config.js` or `jest.config.ts`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared logging and environment foundations required by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create centralized logger with `info/warn/error/debug` methods in `src/lib/devlogger.ts`
- [x] T003 Synchronize `env.mjs` and `.env.example` to include `CRON_SECRET` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- [x] T004 Update `.env.example` with valid URL placeholders (e.g., `http://localhost:3000`) to prevent Zod validation failures

**Checkpoint**: Foundation ready - user story implementation can now begin.

## Phase 3: User Story 1 - Quality Assurance & Hard-coded String Removal (Priority: P1) 🎯 MVP

**Goal**: Remove user-facing hard-coded strings and enforce localized message usage across key UI surfaces.

**Independent Test**: Run `npm run i18n:lint` and manually traverse affected UI paths in both locales with no hard-coded English/Arabic strings exposed.

### Implementation for User Story 1

- [x] T005 [US1] Extract hard-coded strings from `src/presentation/components/admin/submission-review/index.tsx` ("No contact info provided", "You") to `src/messages/en.json` and `src/messages/ar.json`
- [x] T006 [P] [US1] Extract hard-coded strings from `src/presentation/components/client/submission-form/media-upload.tsx` ("Download", "Max size") to `src/messages/en.json` and `src/messages/ar.json`
- [x] T007 [P] [US1] Extract hard-coded strings from `src/presentation/components/admin/live-notifications.tsx` ("View Details →") to `src/messages/en.json` and `src/messages/ar.json`
- [x] T008 [US1] Run `npm run i18n:lint` and resolve any remaining static text across the `/src` directory

**Checkpoint**: User Story 1 is fully localized and independently testable.

## Phase 4: User Story 2 - Build Warning and Error Mitigation (Priority: P1)

**Goal**: Eliminate TypeScript, ESLint, Next.js, and styling warnings/errors from the production build path.

**Independent Test**: `npm run build` completes with exactly 0 warnings/errors.

### Implementation for User Story 2

- [x] T009 [US2] Fix `null` redis check issue in `src/app/api/admin/events/route.ts`
- [x] T010 [US2] Run `npm run build`, identify all remaining warnings (Tailwind, ESLint, React keys), and apply fixes across the `/src` directory

**Checkpoint**: User Story 2 yields a clean build and remains independently verifiable.

## Phase 5: User Story 4 - Environment Variable Validation & API Review (Priority: P1)

**Goal**: Guarantee env contract parity and enforce standardized, secure API behavior with automated tests for production deployment.

**Independent Test**: Build succeeds with `.env.example`-derived values and automated Jest integration tests pass for all core API endpoints.

### Tests for User Story 4
- [x] T011 [US4] Write Jest integration tests for Forms API endpoints in `tests/integration/api/forms.test.ts`
- [x] T012 [P] [US4] Write Jest integration tests for Submissions API endpoints in `tests/integration/api/submissions.test.ts`
- [x] T013 [P] [US4] Write Jest integration tests for Cloudinary Sign API routes in `tests/integration/api/cloudinary.test.ts`

### Implementation for User Story 4

- [x] T014 [US4] Standardize API route responses (Forms, Submissions, Cloudinary) to use structured error messages and correct status codes in `NextResponse.json`
- [x] T015 [US4] Ensure primary admin API routes are marked `force-dynamic` to avoid build-time DB connection attempts

**Checkpoint**: User Story 4 guarantees env/API production contract readiness and is independently testable.

## Phase 6: User Story 3 - Comprehensive Logging Standardization (Priority: P2)

**Goal**: Replace scattered `console.*` usage with the centralized `devlogger` standard across runtime and tooling code.

**Independent Test**: Global scan across `src` shows no direct `console.log/error/warn` usage outside approved logger implementation boundaries.

### Implementation for User Story 3

- [x] T016 [US3] Replace all instances of `console.log`, `console.error`, and `console.warn` with `devlogger` across the `/src` directory

**Checkpoint**: User Story 3 enforces consistent logging standards and is independently testable.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize production readiness evidence and cross-story validation.

- [x] T017 Execute final zero-warning build via `npm run build` using the updated `.env.example` template and verify all Jest tests pass.