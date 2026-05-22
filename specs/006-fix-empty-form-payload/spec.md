# Feature Specification: Fix Empty Form Payload
**Status**: DRAFT

## 1. Feature Description
When a user fills out dynamic form data and submits it, the `fieldValues` array is occasionally omitted or excluded from the request payload. As a result, the backend creates the top-level submission document (capturing only the client's name and contact information) but entirely bypasses saving the dynamic field values because none are presented in the payload loop.

## 2. Actors & Scenarios
### 2.1 Actors
- **End User**: Fills in the form fields (text, date, media uploads) and submits the form.
- **System Backend**: Validates the payload and synchronizes it with the MongoDB database.

### 2.2 User Scenarios
- **Scenario 1: Form Sync Completion**
  - **Given** a user has populated all required form fields.
  - **When** the user clicks "Submit".
  - **Then** the system guarantees the exact values they typed are synced to the request payload without race conditions or state wipeouts overriding the POST boundaries.

## 3. Functional Requirements
- **FR1 (Payload Integrity)**: The system must enforce that the synchronous capture of the client-side `currentDraft.formData` strictly evaluates the latest populated react state context regardless of any concurrent background hydration fetches or manual state wipe actions resolving asynchronously.
- **FR2 (Strict Backend Validation)**: The backend `activeFields` validation must not silently succeed if a previously populated required field arrives empty or undefined due to a schema hydration mismatch across cached template states.

## 4. Non-Functional Requirements
- **Reliability**: Form payloads cannot suffer from incomplete hydration drops during the transition between drafting text input and resolving Cloudinary media.

## 5. Success Criteria
- 100% of Form Submissions properly record the associated dynamic variables provided.
- The Admin Portal's Submission Review panel accurately populates all form items (e.g. photos, IDs, names) instead of defaulting to empty text.

## 6. Assumptions & Scope
- This specifically tracks the Client Data Submission pathway (App Router client components interfacing through `useSubmission.ts` hooks).
- The network infrastructure (Cloudinary uploads) works independently, the primary fault strictly lies at the payload dispatch bounds.
