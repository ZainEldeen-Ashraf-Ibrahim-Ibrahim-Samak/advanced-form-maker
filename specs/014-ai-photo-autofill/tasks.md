# Tasks: AI Photo Auto-Fill

**Input**: Design documents from `specs/014-ai-photo-autofill/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested — test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, configure environment, and prepare the project for AI integration

- [x] T001 Install `@google/genai` package via `npm install @google/genai`
- [x] T002 Add `GEMINI_API_KEY` to env schema in `src/env.mjs` as a server-side required variable
- [x] T003 [P] Add `aiExtraction` i18n namespace keys to `src/messages/en.json` — include keys for: uploadTitle, uploadDescription, uploadButton, analyzing, extractionSuccess, extractionPartial, extractionFailed, timeout, retry, continueManually, autoFilledBadge, overwriteConfirm, noMatchingFields, invalidImage, fileTooLarge, notADocument, fieldsFilled, fieldsNotFilled, enableAiAutoFill
- [x] T004 [P] Add `aiExtraction` i18n namespace keys to `src/messages/ar.json` — Arabic translations for all keys added in T003

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain entities, Zod schemas, and AI service that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create AI extraction domain entities in `src/domain/entities/ai-extraction.ts` — define `ExtractionResult` (status, contactData, fieldValues, errorMessage), `ExtractedContactData` (name, email, phone, address — all `string | null`), `ExtractedFieldValue` (value: `string | number | null`, confidence: `number`), and `ExtractionStatus` type (`"success" | "partial" | "failure"`)
- [x] T006 [P] Create Zod validation schemas in `src/lib/validations/ai-extraction.ts` — define `extractionRequestSchema` (imageBase64: string max ~14MB, imageMimeType: enum, fieldDefinitions: array of {id, nameEn, nameAr, inputType, dropdownOptionsEn?, dropdownOptionsAr?}, contactFields: array of {key, labelEn, labelAr}, locale: enum en|ar) and `extractionResponseSchema` matching the ExtractionResult entity
- [x] T007 Create AI extraction service in `src/data/services/ai-extraction-service.ts` — implement `extractDocumentData()` that: (1) initializes `GoogleGenAI` client with `GEMINI_API_KEY`, (2) dynamically builds a JSON response schema from field definitions + contact fields, (3) constructs a bilingual prompt instructing Gemini to extract data from the document image, (4) calls `ai.models.generateContent()` with the base64 image as inline data, `responseMimeType: "application/json"`, and the dynamic `responseSchema`, (5) enforces 30-second timeout via `AbortController`, (6) parses the response into an `ExtractionResult`, (7) determines status (success/partial/failure) based on how many fields were populated and confidence scores
- [x] T008 Create extraction use-case in `src/domain/use-cases/client/extract-document-data.ts` — implement `extractDocumentData()` that validates input via Zod schema, calls the AI extraction service, and returns the `ExtractionResult`. The use-case must have zero framework imports (domain layer rule)
- [x] T009 Create API route handler in `src/app/api/ai/extract/route.ts` — implement `POST` handler that: (1) applies Upstash Redis rate limiting (5 req/min per IP), (2) parses and validates request body via Zod schema, (3) validates image size (≤10MB raw), (4) calls the extraction use-case, (5) returns structured JSON response per the contract in `contracts/ai-extraction-api.md`, (6) catches timeout errors (504), validation errors (400), rate limit (429), and unexpected errors (500) with appropriate error responses

**Checkpoint**: Foundation ready — AI extraction pipeline works end-to-end via API. User story implementation can now begin.

---

## Phase 3: User Story 1 — Upload Document Photo to Auto-Fill Form (Priority: P1) 🎯 MVP

**Goal**: User uploads a document photo at the top of the form, AI extracts data, and both contact records + dynamic fields are auto-filled with visual indicators.

**Independent Test**: Upload a sample ID card image on a form with AI auto-fill enabled → verify extracted data populates contact records and matching fields with AI indicator badges within 15 seconds.

### Implementation for User Story 1

- [x] T010 [P] [US1] Add `aiAutoFillEnabled` field to `FormTemplate` entity interface in `src/domain/entities/form-template.ts` — add `aiAutoFillEnabled: boolean` to the `FormTemplate` interface
- [x] T011 [P] [US1] Add `aiAutoFillEnabled` field to Mongoose schema in `src/data/models/form-template.model.ts` — add `aiAutoFillEnabled: { type: Boolean, default: false }` to `formTemplateSchema`
- [x] T012 [US1] Create `useAiExtraction` ViewModel hook in `src/presentation/view-models/use-ai-extraction.ts` — manage state for: `isExtracting` (boolean), `extractionResult` (ExtractionResult | null), `error` (string | null), `autoFilledFieldIds` (Set<string>). Implement `handleExtractFromPhoto(file: File)` that: (1) reads file as base64 via FileReader, (2) validates file size ≤10MB and mime type, (3) collects field definitions + contact fields from the form context, (4) calls `POST /api/ai/extract`, (5) on success applies extracted values to form state via the existing `setFieldValue`/`updateContactRecord` callbacks, (6) only fills empty fields by default and prompts for confirmation before overwriting non-empty fields, (7) tracks which fields were auto-filled in `autoFilledFieldIds`, (8) on failure sets error state. Expose `clearAutoFillIndicator(fieldId)` to remove indicator when user manually edits a field
- [x] T013 [P] [US1] Create `AiPhotoUpload` component in `src/presentation/components/client/submission-form/ai-photo-upload.tsx` — render a prominent upload section at the top of the form (above all fields) with: (1) drag-and-drop zone + file input accepting image/jpeg, image/png, image/webp, image/heic, (2) camera icon + descriptive text from i18n keys, (3) loading state with pulsing animation and "Analyzing document…" text while extracting, (4) border styling using ShadCN theme colors (primary border, muted background), (5) `disabled` prop support for view-only mode. Use logical CSS properties for RTL support. Accept `onFileSelected: (file: File) => void` callback
- [x] T014 [P] [US1] Create `AiExtractionSummary` component in `src/presentation/components/client/submission-form/ai-extraction-summary.tsx` — render a dismissible alert/toast after extraction completes showing: (1) success state: count of fields filled, (2) partial state: list of filled fields vs unfilled fields, (3) failure state: error message with retry button. Use ShadCN `Alert` component with appropriate variants (default for success, destructive for failure). Include a "Retry" button and "Continue manually" button for error/partial states
- [x] T015 [US1] Modify `FieldRenderer` component in `src/presentation/components/client/submission-form/field-renderer.tsx` — add an AI auto-fill indicator: (1) accept `isAutoFilled?: boolean` prop, (2) when true, render a subtle `border-primary/50` ring + small sparkle icon badge in the top-end corner of the field, (3) show a tooltip "Auto-filled by AI" (from i18n). Use ShadCN theming and logical properties for RTL
- [x] T016 [US1] Modify `ContactRecords` component in `src/presentation/components/client/submission-form/contact-records.tsx` — add AI auto-fill indicator support: (1) accept `autoFilledKeys?: Set<string>` prop, (2) for each contact field (name, email, phone, address), show the same AI indicator style as field-renderer when the key is in the set
- [x] T017 [US1] Integrate AI photo upload into the submission form in `src/presentation/components/client/submission-form/index.tsx` — (1) import and wire `useAiExtraction` hook, (2) conditionally render `AiPhotoUpload` section above the `ContactRecords` component only when the form template has `aiAutoFillEnabled === true`, (3) render `AiExtractionSummary` below the upload section when extraction results are available, (4) pass `isAutoFilled` prop to each `FieldRenderer` based on `autoFilledFieldIds`, (5) pass `autoFilledKeys` to `ContactRecords`, (6) clear auto-fill indicator for a field when user manually edits it (wire into existing `setFieldValue`/`updateContactRecord` change handlers), (7) handle the overwrite confirmation dialog when non-empty fields exist
- [x] T018 [US1] Wire the `aiAutoFillEnabled` flag through the form loading pipeline — ensure the `useSubmission` hook in `src/presentation/view-models/use-submission.ts` exposes `aiAutoFillEnabled` from the loaded form template so the submission form component can conditionally render the AI upload section

**Checkpoint**: User Story 1 is fully functional — users can upload a document photo and have form fields + contact records auto-filled with AI indicators. Independently testable.

---

## Phase 4: User Story 2 — AI Extraction Feedback and Error Handling (Priority: P2)

**Goal**: Provide clear real-time feedback during extraction: loading states, partial result summaries, error messages with retry, and timeout handling.

**Independent Test**: Upload various quality images (clear, blurry, oversized) and verify appropriate feedback is displayed for each case. Simulate a timeout and verify the retry flow works.

### Implementation for User Story 2

- [x] T019 [US2] Enhance loading state in `AiPhotoUpload` component `src/presentation/components/client/submission-form/ai-photo-upload.tsx` — (1) add a multi-step progress indicator (uploading → analyzing → extracting), (2) add an animated shimmer/pulse effect on the upload zone during extraction, (3) add elapsed time counter that shows after 5 seconds ("Still analyzing… X seconds"), (4) disable the upload zone and form submit button during extraction
- [x] T020 [US2] Enhance `AiExtractionSummary` in `src/presentation/components/client/submission-form/ai-extraction-summary.tsx` — (1) for partial results: list each field with a ✅/❌ indicator showing filled vs not-filled, grouped by contact fields and form fields, (2) for blurry/unreadable images: show specific guidance ("Try retaking with better lighting"), (3) for timeout: show "Analysis took too long" with prominent retry button, (4) for network errors: show offline indicator, (5) add a toast notification via `sonner` on success showing a compact "X fields filled" message
- [x] T021 [US2] Add client-side image quality pre-validation in `src/presentation/view-models/use-ai-extraction.ts` — (1) check minimum image resolution (at least 640×480) by loading into an `Image` element, (2) check file is not corrupt by verifying the Image loads successfully, (3) show a warning (not blocking) if image is below recommended resolution (1024×768) suggesting a clearer photo, (4) reject images below minimum resolution with a clear error message before calling the API
- [x] T022 [US2] Add retry mechanism to `useAiExtraction` hook in `src/presentation/view-models/use-ai-extraction.ts` — (1) expose `retryExtraction()` that re-sends the last uploaded image, (2) track retry count (max 2 retries), (3) on final retry failure, show "Please fill in the form manually" message, (4) clear previous extraction state before retry

**Checkpoint**: All feedback, error, and retry scenarios work. Users always know what's happening and can recover from failures.

---

## Phase 5: User Story 3 — Multi-Language Document Support (Priority: P3)

**Goal**: AI extraction correctly handles documents in both English and Arabic, and mixed-language documents.

**Independent Test**: Upload an Arabic-language ID document and verify Arabic text is correctly extracted and placed in form fields. Upload a bilingual document and verify both languages are handled.

### Implementation for User Story 3

- [x] T023 [US3] Enhance the AI prompt in `src/data/services/ai-extraction-service.ts` — (1) update the extraction prompt to explicitly instruct Gemini to detect and handle Arabic text (RTL), English text (LTR), and mixed-language documents, (2) include field labels in both languages in the prompt context so Gemini can match regardless of document language, (3) add instruction to preserve Arabic diacritics and special characters, (4) add instruction to normalize phone numbers regardless of format found in document
- [x] T024 [US3] Add locale-aware field mapping in `src/data/services/ai-extraction-service.ts` — (1) when building the dynamic schema, include both `nameEn` and `nameAr` as descriptions for each field so Gemini can match Arabic document fields to Arabic labels and English document fields to English labels, (2) for dropdown fields, include both `dropdownOptionsEn` and `dropdownOptionsAr` so the AI can match values in either language

**Checkpoint**: Documents in English, Arabic, and mixed languages are all correctly handled.

---

## Phase 6: Admin Control

**Goal**: Admins can enable/disable AI auto-fill per form template from the admin panel.

- [x] T025 Add AI auto-fill toggle to admin form settings in `src/presentation/components/admin/settings-form.tsx` — (1) add a ShadCN Switch component labeled "Enable AI Auto-Fill" (i18n: en + ar) in the form template settings, (2) bind to the `aiAutoFillEnabled` field on the form template, (3) add descriptive helper text explaining the feature
- [x] T026 Wire the `aiAutoFillEnabled` field through the admin update flow — ensure `src/presentation/view-models/use-admin-settings.ts` (or equivalent) includes `aiAutoFillEnabled` in the update payload, and `src/domain/use-cases/admin/` handles the field in update operations. Ensure the field is included in any cache invalidation for the form template

**Checkpoint**: Admins can toggle AI auto-fill per form. Forms with the toggle off do not show the upload section.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality, i18n sync, and production build verification

- [x] T027 [P] Run `npm run i18n:sync` and `npm run i18n:lint` to verify all new i18n keys in `src/messages/en.json` and `src/messages/ar.json` are synchronized and properly structured
- [x] T028 [P] Review all new components for RTL correctness — verify all CSS uses logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, etc.) instead of physical properties in: `ai-photo-upload.tsx`, `ai-extraction-summary.tsx`, `field-renderer.tsx` (modified), `contact-records.tsx` (modified)
- [x] T029 [P] Review all new code for Zero-Warning Policy compliance — ensure no `console.log` (use `devlogger`), no `any` types, no ESLint warnings in all new/modified files
- [x] T030 Code cleanup — remove any dead code, unused imports, or TODO markers in all new files created during this feature
- [x] T031 [Principle VIII] Execute full production build via `npm run build` and resolve any build errors or warnings
- [x] T032 [Principle VIII] Manual E2E validation — test the complete flow: (1) admin enables AI auto-fill on a form, (2) user opens form, sees upload section, (3) uploads a document photo, (4) fields auto-fill with indicators, (5) user edits a field and indicator clears, (6) user submits successfully. Test in both EN and AR locales

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion — core MVP
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (enhances US1 components)
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion — can run in parallel with US2
- **Admin Control (Phase 6)**: Depends on Phase 2 (T010, T011) — can run in parallel with US1/US2/US3
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (enhances the same components created in US1)
- **User Story 3 (P3)**: Depends on Foundational (Phase 2) — Can start after Phase 2, independently of US1/US2
- **Admin Control**: Depends on T010/T011 from US1 — Can proceed independently otherwise

### Heavy Process Staging (Principle VIII)

- **Deferral**: Production build (`npm run build`) and E2E validation are placed in Phase 7 (final phase)
- **Prerequisite**: All feature logic and i18n must be complete before running heavy processes

### Within Each User Story

- Entities/models before services
- Services before API routes
- API routes before ViewModel hooks
- ViewModel hooks before UI components
- Individual components before integration

### Parallel Opportunities

- **Phase 1**: T003 and T004 (i18n files) can run in parallel
- **Phase 2**: T005 and T006 (entities + schemas) can run in parallel
- **Phase 3**: T010 and T011 (entity + model) can run in parallel; T013 and T014 (components) can run in parallel
- **Phase 5 & 6**: Can run in parallel with each other (after Phase 2 for US3, after T010/T011 for Admin)
- **Phase 7**: T027, T028, T029 can run in parallel

---

## Parallel Example: User Story 1

```text
# Parallel: Domain entity + model changes (different files)
Task T010: Add aiAutoFillEnabled to FormTemplate entity in src/domain/entities/form-template.ts
Task T011: Add aiAutoFillEnabled to Mongoose model in src/data/models/form-template.model.ts

# Parallel: Independent UI components (different files, no cross-dependencies)
Task T013: Create AiPhotoUpload component in src/presentation/components/client/submission-form/ai-photo-upload.tsx
Task T014: Create AiExtractionSummary component in src/presentation/components/client/submission-form/ai-extraction-summary.tsx

# Sequential: Integration depends on all above
Task T017: Integrate AI upload into submission form (depends on T012-T016)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T009)
3. Complete Phase 3: User Story 1 (T010–T018)
4. **STOP and VALIDATE**: Upload a document photo → verify fields auto-fill
5. Deploy/demo if ready — core value is delivered

### Incremental Delivery

1. Complete Setup + Foundational → AI pipeline works via API
2. Add User Story 1 → Full auto-fill UX works → Deploy (MVP!)
3. Add User Story 2 → Enhanced feedback + error handling → Deploy
4. Add User Story 3 → Arabic/bilingual document support → Deploy
5. Add Admin Control → Per-form toggle → Deploy
6. Polish → Production-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `@google/genai` SDK is used (modern SDK) — NOT `@google/generative-ai` (deprecated)
- All Gemini API communication is server-side only via the API route — API key never exposed client-side
