# Feature Specification: Native Submission Reliability Fixes

**Feature Branch**: `013-native-submission-fixes`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "why the events not worked in app and toast and why not saved in local storage for resubmissions, and why although regex and validation and ui and auto formating no like client side the upload system although not viewed the uploaded image and not multi tasked that must upload single file at time"

## Clarifications

### Session 2026-04-16

- Q: Where do regex patterns, validators, messages, and formatting rules live so web and native stay in sync? → A: Fetched from backend per form at runtime; web and native both consume the same API.
- Q: When a user taps Submit with no connectivity, what should happen? → A: Queue submission locally and auto-send when connectivity returns; notify user on success/failure.
- Q: How should the app treat a file that keeps failing to upload? → A: Auto-retry up to 3 times with backoff, then mark failed; user must manually retry or remove before submit if field is required.
- Q: How long should an unsent draft be kept on the device? → A: Kept up to 30 days since last edit, then auto-discarded with user notice.
- Q: What limits apply per media item? → A: Images (jpg/png/heic) ≤ 15 MB and videos (mp4) ≤ 100 MB per file; client-side compression for images before upload.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable event feedback and toasts in mobile app (Priority: P1)

When a field operator performs an action in the native submission screen (validation error, submit success/failure, upload progress, network error), the app must surface the corresponding event through a visible toast/snackbar and matching in-app state change, at parity with the web client.

**Why this priority**: Without feedback, users do not know whether their submission succeeded, failed, or is in progress, causing duplicate submissions and data loss.

**Independent Test**: Trigger each event (validation fail, submit ok, submit fail, upload done) on a device and verify a toast appears with correct localized text and the UI state updates accordingly.

**Acceptance Scenarios**:

1. **Given** an invalid regex field, **When** the user taps Submit, **Then** a toast shows the localized validation message and focus moves to the first invalid field.
2. **Given** a successful submission, **When** the server acknowledges, **Then** a success toast appears and the form is cleared/locked.
3. **Given** a network failure during submit, **When** the request fails, **Then** an error toast appears and the draft is preserved.

---

### User Story 2 - Draft persistence for resumption (Priority: P1)

If the app is backgrounded, killed, or loses network mid-submission, the user must be able to return to the native submission screen and resume from the last auto-saved draft (field values, selected media references, progress state) without retyping.

**Why this priority**: Field conditions cause frequent interruptions; losing a partially filled form is the top complaint and drives abandonment.

**Independent Test**: Fill half the form, force-kill the app, reopen it, and confirm all entered values, formatted inputs, and queued uploads are restored.

**Acceptance Scenarios**:

1. **Given** a partially filled form, **When** the app is killed and reopened, **Then** all entered values, selected files, and upload statuses are restored from local storage.
2. **Given** a completed successful submission, **When** the app is reopened, **Then** the draft is cleared and not restored.
3. **Given** a failed submission, **When** the user reopens the app, **Then** the draft remains and a "Resume submission" prompt is offered.

---

### User Story 3 - Parity of regex, validation, UI, and auto-formatting with web client (Priority: P1)

Every field on the native submission screen must apply the same regex patterns, validation rules, error messages, input masks, and auto-formatting (phone, national ID, date, numeric grouping, trimming) as the web client, so identical input produces identical accept/reject results.

**Why this priority**: Divergence between mobile and web validation lets invalid data through on one channel and blocks valid data on the other, corrupting downstream reports.

**Independent Test**: Run a shared fixture of valid/invalid inputs on both web and native; every case must produce the same pass/fail and the same formatted value.

**Acceptance Scenarios**:

1. **Given** a phone field, **When** the user types digits, **Then** the value is auto-formatted identically to the web client as typing progresses.
2. **Given** a regex-constrained field, **When** input violates the pattern, **Then** the same localized error text shown on web is shown on native.
3. **Given** a trimmed/normalized field, **When** submitted, **Then** the payload value matches byte-for-byte what the web client sends for the same raw input.

---

### User Story 4 - Upload preview and serialized single-file uploads (Priority: P1)

After a user selects or captures a photo/file for a media field, a thumbnail/preview of the actual uploaded asset must render in the field, and uploads must be processed one file at a time (serial queue), not in parallel, to avoid signing, memory, and Cloudinary rate issues.

**Why this priority**: Users currently cannot confirm what they uploaded (no preview) and parallel uploads cause signature failures, OOM crashes, and partial submissions.

**Independent Test**: Attach three files to a media field; verify each uploads sequentially with visible per-file progress, and each successful upload renders a preview of the server-hosted asset (not just the local file).

**Acceptance Scenarios**:

1. **Given** a successful upload, **When** it completes, **Then** a thumbnail of the hosted asset is displayed in the field with a remove action.
2. **Given** multiple files queued, **When** uploads run, **Then** exactly one upload is in-flight at any time and the next starts only after the previous resolves or fails.
3. **Given** an upload fails, **When** the queue continues, **Then** the failed item is marked with a retry action and does not block remaining items once acknowledged.

---

### Edge Cases

- App killed mid-upload: queued items must resume or be clearly marked as pending after relaunch.
- Storage permission revoked between sessions: draft restore must not crash; missing local files are marked as needing re-selection.
- Draft schema changes after an app update: incompatible drafts are migrated or safely discarded with user notice.
- Device offline at submit time: submission is queued locally and auto-sent when connectivity returns; toasts reflect queued, sending, success, and failure states. User is notified on final success/failure even if the app was reopened since queuing.
- Same field edited on web and mobile: native uses latest local draft; server response is source of truth after submit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The native submission screen MUST emit and handle the same event set as the web client (validation, submit start/success/failure, upload start/progress/success/failure, draft saved/restored).
- **FR-002**: Every user-facing event MUST display a localized toast/snackbar with text matching the web client's message catalog for the same event.
- **FR-003**: The app MUST auto-save the full submission draft (field values, formatted values, media queue and upload statuses) to device local storage on every change, debounced.
- **FR-004**: On app launch, the app MUST detect an unsent draft for the current form and offer the user to resume or discard it.
- **FR-005**: Drafts MUST be cleared automatically only after a server-confirmed successful submission, or auto-discarded after 30 days since last edit with an in-app notice to the user on the next launch.
- **FR-006**: Field regex patterns, validators, error messages, and auto-formatting rules MUST be fetched from the backend per form at runtime via the same API the web client consumes, so there is a single canonical source and no mobile-only copies that can drift. Rules MUST be cached locally for offline use and refreshed when connectivity returns.
- **FR-007**: Auto-formatting MUST run on input (as-you-type) on native with the same behavior as the web client, including cursor handling where applicable.
- **FR-008**: After a media upload succeeds, the field MUST display a preview rendered from the hosted asset URL, not just the local file path.
- **FR-009**: Media uploads MUST be executed through a serial queue with concurrency of exactly 1; additional selected files wait until the current upload resolves.
- **FR-010**: Per-file upload progress, success, failure, and retry state MUST be visible in the field UI.
- **FR-011**: Failed uploads MUST auto-retry up to 3 times with exponential backoff, then be marked failed; the user MUST be able to manually retry or remove the item without re-selecting the file, as long as the local file reference is still valid.
- **FR-011a**: Submission MUST be blocked while any required media field has an item in failed state; optional fields with failed items MAY be submitted after the user removes the failed item.
- **FR-012**: All events, draft operations, and upload lifecycle states MUST be logged/telemetered for debugging parity incidents.
- **FR-013**: Media uploads MUST accept images (jpg/png/heic) up to 15 MB and videos (mp4) up to 100 MB per file; other types or oversize files MUST be rejected with a localized error toast before the upload queue accepts them.
- **FR-014**: Images MUST be compressed client-side before upload to fit within the 15 MB limit while preserving acceptable visual quality; videos MUST NOT be re-encoded on device.

### Key Entities

- **Submission Draft**: Per-form local record of field values, formatted values, validation state, media queue, and last-updated timestamp.
- **Media Upload Item**: Local file reference, target field, upload status (pending/uploading/success/failed), progress, hosted asset URL/ID once uploaded, retry count.
- **Event**: Named app-level signal (validation_failed, submit_success, upload_failed, draft_restored, etc.) with payload and localized message key shared with the web client.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the event types emitted by the web client produce a visible toast and state update on native for the same trigger.
- **SC-002**: After force-killing the app mid-form, 100% of previously entered field values and 100% of successfully uploaded media references are restored on next launch.
- **SC-003**: A shared validation/formatting fixture of at least 50 cases yields identical pass/fail and identical formatted output between web and native (0 divergences).
- **SC-004**: Zero concurrent in-flight uploads observed under load testing of 10 queued files; all files complete or fail with visible per-file status.
- **SC-005**: Post-upload preview renders from the hosted asset for 100% of successful uploads within 2 seconds of upload completion on a typical 4G connection.
- **SC-006**: Duplicate submissions caused by missing feedback drop to 0 in field telemetry within one release cycle.

## Assumptions

- The web client's validation, regex, formatting, and message catalogs are already the source of truth and can be consumed or mirrored by the mobile shell.
- Local storage on device is available and permitted; encrypted-at-rest storage is acceptable but not mandated here.
- Cloudinary (or equivalent) remains the media backend and exposes hosted URLs suitable for thumbnail rendering.
- The native submission screen is the only mobile entry point for submissions in scope; other legacy screens are out of scope.
- Localization keys already exist for all event messages on the web side and can be reused on mobile.
