# Research: AI Photo Auto-Fill

**Feature**: 014-ai-photo-autofill
**Date**: 2026-05-23

## Research Tasks & Findings

### 1. AI Vision Service Selection

**Decision**: Google Gemini API (via `@google/genai` SDK)

**Rationale**:
- The project already has a precedent for AI integration (Gemini was used for nationality normalization in a previous feature — see conversation history `98564986`).
- Gemini's vision API natively supports structured output via `response_schema` with `responseMimeType: "application/json"`, which perfectly aligns with the need to return field-ID-keyed JSON.
- Zod schema integration is supported, matching the project's existing Zod 4.x usage.
- The `gemini-flash-latest` model offers fast inference (typically < 5 seconds) well within the 15-second target.
- Cost-effective for document extraction compared to alternatives.

**Alternatives considered**:
- **OpenAI GPT-4 Vision**: Strong vision capabilities but requires a new SDK dependency and API key. No existing project precedent.
- **Google Cloud Vision OCR**: More specialized for OCR but returns raw text, not structured key-value data. Would require a separate field-mapping step.
- **Tesseract.js (local)**: No cloud dependency but significantly lower accuracy, especially for Arabic documents. Cannot do intelligent field mapping.

### 2. Image Handling Strategy (Upload vs Inline)

**Decision**: Convert image to base64 inline data and send directly to Gemini API (no file upload step)

**Rationale**:
- Document photos for extraction are typically < 5MB; base64 inline is efficient for this size range.
- Avoids the two-step process of `files.upload` + `generateContent` which would add latency.
- The image is transient — it should NOT be persisted (FR-015). Inline data avoids creating any cloud-side artifacts.
- Simpler error handling with a single API call.

**Alternatives considered**:
- **Gemini Files API (`client.files.upload`)**: Better for large files (>10MB) or when reusing the same file across multiple requests. Adds latency from the upload step. Not warranted for single-use document extraction.
- **Cloudinary upload first, then pass URL**: Would persist the image in Cloudinary, violating FR-015. Adds an unnecessary hop.

### 3. Structured Output Schema Design

**Decision**: Dynamically build a JSON schema from the form's field definitions and contact record schema, pass to Gemini via `responseSchema`

**Rationale**:
- Each form has different custom fields. A static schema would not work.
- By constructing the schema dynamically from `FieldDefinition[]` + `ContactFormField[]`, the AI knows exactly which fields to extract and their types.
- Using `responseMimeType: "application/json"` with `responseSchema` guarantees valid JSON output matching the schema — no post-processing parsing needed.
- Field IDs are used as JSON keys so the response maps directly to form state.

**Schema construction approach**:
```
{
  type: "OBJECT",
  properties: {
    contactRecords: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Full name from document" },
        email: { type: "STRING", description: "Email if found" },
        phone: { type: "STRING", description: "Phone number if found" },
        address: { type: "STRING", description: "Address if found" }
      }
    },
    fields: {
      type: "OBJECT",
      properties: {
        [fieldId]: { type: <mapped from inputType>, description: <nameEn + nameAr> },
        ...for each field definition
      }
    },
    confidence: {
      type: "OBJECT",
      properties: {
        [fieldId]: { type: "NUMBER", description: "Confidence 0-1" },
        ...
      }
    }
  }
}
```

### 4. Admin Toggle Implementation

**Decision**: Add `aiAutoFillEnabled` boolean field to the `FormTemplate` model, defaulting to `false`

**Rationale**:
- Simple boolean flag on the existing model, no new collection needed.
- Default `false` ensures existing forms are unaffected until admins explicitly enable it.
- The flag is read client-side to conditionally render the AI upload section.
- Follows existing pattern (similar to `isActive` flag on `FormTemplate`).

**Alternatives considered**:
- **Global settings**: Too coarse — some forms benefit from AI (ID collection forms) while others don't (feedback forms).
- **Separate config collection**: Over-engineered for a single boolean flag.

### 5. Client-Side Image Handling

**Decision**: Use browser `FileReader` to read the image as base64, validate size/format client-side, send base64 to the Next.js API route

**Rationale**:
- Client-side validation (file size ≤ 10MB, accepted formats) prevents unnecessary API calls.
- Base64 encoding via FileReader is well-supported across all browsers.
- The API route receives the base64 string + field definitions, calls Gemini server-side (keeping the API key secure).
- No Cloudinary involvement for extraction-only uploads (per FR-015).

### 6. AI Auto-Fill Indicator UX

**Decision**: Use a subtle colored border + small badge icon on auto-filled fields, with a dismissible toast summarizing extraction results

**Rationale**:
- A colored border (e.g., `border-primary/50`) on auto-filled fields provides immediate visual distinction without being intrusive.
- A small sparkle/AI icon badge inside the field provides explicit indication.
- A toast summary (via existing `sonner` integration) lists filled vs. unfilled fields.
- Indicators are cleared when the user manually edits the field.
- Follows ShadCN UI theming patterns for consistency.

### 7. Timeout & Error Handling

**Decision**: 30-second `AbortController` timeout on the Gemini API call with retry option

**Rationale**:
- `AbortController` with `signal` is the standard approach for fetch timeout in Node.js.
- 30 seconds provides adequate time for complex document analysis while preventing indefinite waits.
- On timeout, the UI shows a clear error with a "Retry" button and a "Continue manually" option.
- Network errors and API errors (rate limits, invalid content) are caught and presented as user-friendly messages.

### 8. Security Considerations

**Decision**: Server-side only processing; API key never exposed; base64 image not persisted

**Rationale**:
- The Gemini API key lives in server environment variables only (via `@t3-oss/env-nextjs`).
- The API route (`/api/ai/extract`) handles all Gemini communication server-side.
- The base64 image exists only in memory during the request lifecycle; it is not saved to disk, database, or cloud storage.
- Rate limiting via existing Upstash Redis rate limiter protects against abuse.
- Input sanitization: the API route validates the image format and size before forwarding.
