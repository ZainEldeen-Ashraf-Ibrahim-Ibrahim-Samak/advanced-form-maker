# Research & Analysis: Fix Empty Form Payload

## Bug Anatomy
The user reported that when filling data out and submitting, the form sends an empty payload to the backend, resulting in a database submission containing purely the top-level contact/sender information and zero dynamic field values.

## Findings
1. **Validation Boundary Bypass**:
   The validation of dynamic fields locally (`SubmissionForm.tsx.validate()`) runs independently using the client's transient React context `formData`, which represents the current view of the form text.
2. **Payload Extraction Gap**:
   However, the actual submit HTTP POST trigger (`submitForm()`) extracts values not from the active reactive state directly but by polling `Object.values(draftRef.current.formData)`. Should `draftRef` become momentarily stale, or wiped out completely by an asynchronous `updateDraft` execution related to the background fetching process, `submitForm()` pulls an empty array `[]`.
3. **Backend Validation Gap**:
   If an empty array `[]` is fired at the backend, Zod successfully parses it as `[]`. Because there is a bug caching the validation rules at the Redis or Service layer (meaning `validationRules.required` might resolve to undefined natively in Production), the backend completely skips evaluating `submitFormUseCase.execute()` logic, saving the envelope and bypassing the insertions of any `<FieldValueModel>`. This generates the "Vals count: 0" Mongo condition precisely.

## Decision:
- Safely extract the submission `fieldValues` locally within the event handler to ensure absolute functional alignment with the latest form data rather than exclusively resolving by the side-effect `draftRef`. 
- Ensure that the backend does not silently validate an empty array if cached `validationRules` properties are absent.
- Guard the `clearDraft` logic in the success block.
