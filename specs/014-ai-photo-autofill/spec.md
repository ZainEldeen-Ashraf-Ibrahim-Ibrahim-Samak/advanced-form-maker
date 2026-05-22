# Feature Specification: AI Photo Auto-Fill

**Feature Branch**: `014-ai-photo-autofill`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "the new plan we will use ai when user fill the data the use can upload photo and ai take the data from photo and fill the info"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Document Photo to Auto-Fill Form (Priority: P1)

A user opens a submission form and sees an option to upload a photo of a document (such as an ID card, passport, driver's license, or any document containing relevant personal or business information). The user takes a photo or selects an existing image from their device. The system sends the image to an AI service which extracts structured data from the document. The extracted data is then automatically populated into the matching form fields. The user can review and edit any auto-filled values before submitting.

**Why this priority**: This is the core value proposition of the feature. Without AI-powered extraction and auto-fill, the feature has no purpose. It eliminates tedious manual data entry and reduces human error.

**Independent Test**: Can be fully tested by uploading a sample document image and verifying that recognized data appears in the correct form fields. Delivers immediate time-saving value to users.

**Acceptance Scenarios**:

1. **Given** a user is on a new submission form with empty fields, **When** they upload a clear photo of a government-issued ID card, **Then** the system extracts the person's name, date of birth, and ID number and populates the corresponding form fields within 10 seconds.
2. **Given** a user uploads a document photo, **When** the AI extraction completes, **Then** each auto-filled field is visually highlighted to indicate it was populated by AI (distinct from manually entered data).
3. **Given** a user uploads a document photo, **When** the AI extraction completes, **Then** the user can freely edit, clear, or override any auto-filled field value before submitting the form.
4. **Given** a user has already manually entered some field values, **When** they upload a document photo, **Then** only empty fields are auto-filled by default, and a confirmation prompt appears before overwriting any fields that already contain data.

---

### User Story 2 - AI Extraction Feedback and Error Handling (Priority: P2)

When a user uploads a photo for AI extraction, the system provides clear real-time feedback about the extraction process: a loading/progress indicator during processing, a summary of what was extracted after completion, and helpful error messages if extraction fails or produces low-confidence results.

**Why this priority**: Without clear feedback, users won't trust the auto-fill results. Transparent communication about what was extracted and what couldn't be read builds confidence in the feature.

**Independent Test**: Can be tested by uploading various quality images (clear, blurry, partially obscured) and verifying appropriate feedback is displayed for each scenario.

**Acceptance Scenarios**:

1. **Given** a user uploads a document photo, **When** the AI is processing the image, **Then** a visible loading indicator with a descriptive message (e.g., "Analyzing document…") is displayed.
2. **Given** a user uploads a blurry or unreadable photo, **When** the AI cannot extract data, **Then** a user-friendly error message is shown suggesting they retake the photo with better lighting or focus.
3. **Given** the AI extraction completes with partial results, **When** some fields could not be confidently extracted, **Then** a summary is shown listing which fields were filled and which could not be determined, allowing the user to manually complete the remaining fields.
4. **Given** the AI service is unavailable or times out, **When** extraction fails, **Then** the user is informed gracefully and can continue filling the form manually without any disruption.

---

### User Story 3 - Multi-Language Document Support (Priority: P3)

The system can extract data from documents written in both English and Arabic (matching the application's bilingual nature). The AI correctly identifies the language of the document and maps extracted values to the appropriate form fields regardless of the document's language.

**Why this priority**: Since the application supports English and Arabic, document extraction must also handle both languages to serve the full user base. However, English-only extraction still delivers significant value.

**Independent Test**: Can be tested by uploading documents in English and Arabic separately and verifying that extracted data is correctly mapped to form fields in both cases.

**Acceptance Scenarios**:

1. **Given** a user uploads an Arabic-language document, **When** the AI processes the image, **Then** Arabic text is correctly extracted and placed into the appropriate form fields.
2. **Given** a user uploads a document containing both English and Arabic text, **When** the AI processes the image, **Then** both languages are correctly recognized and the relevant data is extracted.

---

### Edge Cases

- What happens when the uploaded image is not a document (e.g., a selfie, a landscape photo)? The system should inform the user that no extractable data was found and suggest uploading a document.
- What happens when the document type is unsupported or highly unusual? The system should attempt best-effort extraction and clearly indicate low confidence in the results.
- What happens when the image file is too large or in an unsupported format? The system should validate the file before sending it for AI processing and display an appropriate error message.
- What happens when the form has no fields that match the extracted data? The system should inform the user that no matching fields were found for the extracted information.
- What happens when the user uploads multiple photos in sequence? The most recent extraction should take priority, with a confirmation prompt before replacing previously auto-filled data.
- What happens when the user is offline or has a very slow connection? The system should detect connectivity issues and inform the user that AI extraction requires an internet connection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a clearly visible "Upload Document Photo" action within the submission form, separate from existing media upload functionality.
- **FR-002**: System MUST accept common image formats (JPEG, PNG, WEBP, HEIC) for document photo uploads.
- **FR-003**: System MUST validate uploaded images for minimum resolution and maximum file size before sending to AI processing.
- **FR-004**: System MUST send the uploaded image to an AI-powered document analysis service for data extraction.
- **FR-005**: System MUST map AI-extracted key-value data to the corresponding form fields based on field names, types, and labels.
- **FR-006**: System MUST visually distinguish AI-auto-filled fields from manually entered fields (e.g., with a badge, border color, or icon indicator).
- **FR-007**: System MUST allow users to edit, clear, or override any AI-auto-filled field value at any time before submission.
- **FR-008**: System MUST display a loading state with descriptive messaging while AI extraction is in progress.
- **FR-009**: System MUST display a result summary after extraction showing which fields were filled and which could not be determined.
- **FR-010**: System MUST handle AI extraction failures gracefully, allowing users to continue with manual data entry.
- **FR-011**: System MUST prompt the user for confirmation before overwriting fields that already contain manually entered data.
- **FR-012**: System MUST support extraction from documents in both English and Arabic.
- **FR-013**: System MUST display all AI-related UI text in both English and Arabic following the existing internationalization pattern.
- **FR-014**: System MUST NOT send the uploaded document image to any third-party service without user awareness (the upload action itself constitutes consent).
- **FR-015**: System MUST NOT persist the uploaded document photo beyond the extraction session unless the user explicitly attaches it to the form submission.

### Key Entities

- **Document Photo**: An image uploaded by the user for AI data extraction. Contains format, resolution, file size, and the raw image data. Distinct from regular media uploads.
- **Extraction Result**: The structured output from AI analysis. Contains a set of field-value pairs, confidence scores per field, overall extraction status (success, partial, failure), and any error messages.
- **Field Mapping**: The association between an extracted data key (from AI) and a form field definition. Enables matching extracted values like "full_name" to the corresponding form field.
- **Auto-Fill Indicator**: A visual marker on a form field indicating its value was populated by AI rather than manually entered. Includes the confidence level of the extraction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can auto-fill form fields from a document photo in under 15 seconds end-to-end (from upload to fields populated).
- **SC-002**: 80% or more of extractable fields from a clear, well-lit document photo are correctly populated on the first attempt.
- **SC-003**: 100% of AI-auto-filled fields are editable by the user before form submission.
- **SC-004**: Users who use the AI auto-fill feature complete form submissions at least 40% faster than users who enter data manually.
- **SC-005**: The system gracefully handles extraction failures in 100% of error cases, with no form data loss or UI freezes.
- **SC-006**: Both English and Arabic document extraction achieve at least 70% field accuracy on clear document photos.

## Assumptions

- Users have a device capable of capturing or selecting photos (camera or file picker).
- The application has access to an AI document analysis service (cloud-based) for image-to-text extraction.
- Users have an active internet connection when using the AI auto-fill feature (offline extraction is out of scope).
- The existing form field definitions (name, type, labels in English and Arabic) provide sufficient metadata for AI-to-field mapping.
- The AI extraction service can process common document types (ID cards, passports, driver's licenses, business documents) without requiring document-type-specific training.
- The existing Cloudinary upload infrastructure may be reused for image handling, or a separate upload pathway may be created specifically for AI processing.
- Privacy and data handling for uploaded document photos follows the application's existing data governance policies.
- Mobile camera integration (direct capture) is a desirable but not mandatory enhancement for the initial release; file selection is sufficient.
