# Feature Specification: Multi-Instance Form Submissions

**Feature Branch**: `018-multi-instance-form-submissions`
**Created**: 2026-06-28
**Status**: Draft
**Input**: User description: "in form settings allow multi-type submissions that will make the AI or user fill like the form is more than one like contact form one or more and the inputs can be added more than once — I have more than one data and I want to fill the form and every form will be shown in submission single like default and make AI also understand that like I have more than one user name etc. and inputs also"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Enables Multi-Instance Mode on a Form (Priority: P1)

An administrator opens the form settings for an existing form (e.g., "Client Intake") and enables a toggle labelled **"Allow Multiple Submissions per Session"**. They optionally set a maximum number of instances (e.g., 1–20) or leave it unlimited. They save the settings.

**Why this priority**: This is the gate-keeping action. Nothing else in the feature works unless an admin can turn it on.

**Independent Test**: Navigate to any form's settings page, enable multi-instance mode, save, and verify the setting persists on page reload.

**Acceptance Scenarios**:

1. **Given** a form exists with multi-instance mode disabled, **When** the admin enables the toggle and saves, **Then** the setting is saved and the form now supports multiple submission instances.
2. **Given** multi-instance mode is enabled, **When** the admin sets a maximum of 5 instances, **Then** the client-side submission form enforces a maximum of 5 rows.
3. **Given** multi-instance mode is enabled without a limit, **When** the admin saves, **Then** the client-side submission form allows unlimited rows (up to a safe system default of 50).
4. **Given** the admin disables multi-instance mode on a previously enabled form, **When** the change is saved, **Then** the form returns to single-submission mode, and existing multi-instance submissions are unaffected.

---

### User Story 2 — Client Fills Multiple Instances in One Session (Priority: P1)

A client opens a form that has multi-instance mode enabled. They see one pre-populated set of form fields (Instance 1). They click an **"Add Another"** button to append a second identical set of fields (Instance 2). They fill both sets and submit. Each instance is saved and displayed as a separate, standalone submission record in the admin submissions table.

**Why this priority**: This is the core user-facing behaviour the feature is built around.

**Independent Test**: Open a multi-instance form, add two instances with different data, submit, and verify two distinct submission records appear in the admin panel.

**Acceptance Scenarios**:

1. **Given** a multi-instance form is open, **When** the client clicks "Add Another", **Then** a new, empty duplicate of the full form field set appears below the existing one.
2. **Given** two instances are filled, **When** the client submits, **Then** two separate submission records are created and each appears individually in the admin submissions table with its own row, ID, and detail view.
3. **Given** a partially filled second instance, **When** the client removes it using a "Remove" button, **Then** only Instance 1 remains and removal is confirmed visually.
4. **Given** the maximum instance count (e.g., 5) has been reached, **When** the client tries to add another, **Then** the "Add Another" button is disabled and a message explains the limit.
5. **Given** at least one instance has validation errors, **When** the client submits, **Then** submission is blocked, all instances with errors are visually marked, and the client can correct errors without losing data in other instances.

---

### User Story 3 — AI Autofill Populates Multiple Instances Automatically (Priority: P2)

A client uploads a document (image, CSV, spreadsheet, or PDF) that contains multiple records (e.g., a spreadsheet with 3 rows of contact information). The AI autofill recognises that the form is in multi-instance mode and automatically creates one instance per detected record, populating each field set with the data from the corresponding row.

**Why this priority**: The AI autofill enhancement makes multi-instance forms dramatically more powerful for data-heavy use cases, but the feature is useful without it.

**Independent Test**: Upload a spreadsheet with 3 contact records to a multi-instance-enabled form; verify 3 auto-populated instances appear.

**Acceptance Scenarios**:

1. **Given** a multi-instance form is open and the user uploads a CSV with 3 data rows, **When** AI autofill processes the file, **Then** 3 instances are created, each populated with the data from the corresponding CSV row.
2. **Given** the AI detects more records than the configured maximum instance count, **When** autofill completes, **Then** only the first N instances are created (N = maximum), and a warning informs the user that additional records were truncated.
3. **Given** a single-record document is uploaded (e.g., a photo of one ID card), **When** autofill runs, **Then** only one instance is created, matching the existing single-fill behaviour.
4. **Given** a multi-record document contains fields that do not match any form field, **When** autofill runs, **Then** matched fields are populated and unmatched fields are left empty, without blocking submission.
5. **Given** autofill creates multiple instances, **When** the user reviews them, **Then** each instance is independently editable before final submission.

---

### User Story 4 — Admin Views Each Instance as a Separate Submission (Priority: P1)

After a client submits a multi-instance form, the admin opens the submissions table. Each instance appears as its own row with its own detail view — exactly the same as a regular single submission. No special UI is required to access multi-instance submissions; they look and behave like normal submissions.

**Why this priority**: Without this, multi-instance data would be inaccessible or confusing in the admin panel.

**Independent Test**: Submit a form with 3 instances and verify 3 independent rows appear in the submissions table, each with a full detail view.

**Acceptance Scenarios**:

1. **Given** a client submitted 3 instances, **When** the admin views the submissions table, **Then** 3 separate rows appear, each with a unique submission ID and timestamp.
2. **Given** the admin clicks on one of the 3 submission rows, **When** the detail view opens, **Then** it shows only the data for that specific instance, not all three.
3. **Given** the admin exports submissions to PDF or Excel, **When** multi-instance submissions are included, **Then** each instance appears as its own row in the export.
4. **Given** a grouping indicator is available, **When** the admin views the table, **Then** submissions from the same session are visually linked (e.g., a shared "Session ID" column or subtle grouping marker), while still being individually selectable.

---

### Edge Cases

- What happens when the client submits but one or more instances fail to save on the server? Each successfully saved instance must be preserved; a clear error must identify which instance(s) failed.
- What happens if the client navigates away mid-session with multiple instances filled? The system applies the same behaviour as single-form navigation warnings (unsaved changes prompt).
- What happens when a form is converted from single to multi-instance and existing submissions exist? Existing submissions remain as-is and are unaffected.
- What happens if the network drops after some instances are submitted but before others? Partial success is reported and the user is told which instances were saved.
- What happens if AI autofill produces more instances than the maximum? Only the first N are created; user is notified.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an admin to enable or disable multi-instance mode per form via a toggle in form settings.
- **FR-002**: System MUST allow an admin to optionally set a maximum number of instances per form (1–50); when not set, the system default maximum of 50 applies.
- **FR-003**: When multi-instance mode is enabled, the submission form MUST display an "Add Another" button that appends a full duplicate of the form field set as a new instance.
- **FR-004**: Each instance MUST be independently fillable, removable, and validated before submission.
- **FR-005**: Upon submission, each instance MUST be saved as a separate, standalone submission record with its own unique ID, timestamp, and status.
- **FR-006**: Each saved instance MUST appear as its own row in the admin submissions table and open its own independent detail view.
- **FR-007**: The admin submissions table MUST include a "Session ID" or equivalent grouping attribute on multi-instance submissions so the admin can identify which submissions originated from the same session.
- **FR-008**: When the AI autofill feature is triggered on a multi-instance form and the source document contains multiple records, the AI MUST create one instance per detected record and populate each instance's fields with the corresponding record's data.
- **FR-009**: When AI autofill detects more records than the maximum instance limit, it MUST create only the allowed number of instances and display a warning to the user.
- **FR-010**: Validation MUST be applied to every instance individually; submission MUST be blocked if any instance fails validation, and all failing instances MUST be visually identified.
- **FR-011**: The "Add Another" button MUST be hidden or disabled when the maximum instance count has been reached.
- **FR-012**: Each instance MUST display a "Remove" button unless only one instance remains; the last instance cannot be removed.
- **FR-013**: The form MUST show a clear instance counter (e.g., "Record 1 of 3") for each instance.
- **FR-014**: All submission export formats (PDF, Excel, CSV, JSON) MUST treat each instance as a separate row.

### Key Entities

- **FormTemplate**: Extended with `multiInstanceEnabled` (boolean) and `maxInstances` (number, optional) settings.
- **Submission**: Extended with a `sessionId` (string) that groups instances from the same submission session. Existing single submissions have no `sessionId`.
- **FormInstance** (client-side only, not persisted): A transient in-memory representation of one set of field values for a single repetition of the form during a session.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can enable multi-instance mode on any form in under 30 seconds.
- **SC-002**: A client can add, fill, and submit 3 instances of a form in under 5 minutes on a standard connection.
- **SC-003**: Each submitted instance appears as an independent row in the admin submissions table within 3 seconds of the submission completing.
- **SC-004**: AI autofill correctly maps multi-record documents to multiple instances in 90% or more of cases where the document structure is tabular (CSV, spreadsheet rows).
- **SC-005**: Zero data loss occurs between instances during a multi-instance submission — either all instances are saved or failed instances are clearly reported.
- **SC-006**: Existing single-submission forms and their submission records are completely unaffected by this feature being introduced.

---

## Assumptions

- The existing form builder and field definition system remains unchanged; multi-instance mode reuses the same field schema.
- A "session" is defined as a single browser submission action that produces multiple instances; no persistent user session concept is introduced.
- Mobile/responsive support for the multi-instance form is in scope and uses the same stacked-card layout as the existing form.
- AI autofill multi-instance support applies only to tabular document formats (CSV, Excel, spreadsheets); a single image produces at most one instance.
- The admin detail view for each instance does not need a special "siblings" link to related instances in v1; the Session ID column in the table is sufficient for grouping discovery.
- Form-level permissions (who can view or submit) are inherited and apply to multi-instance forms the same way they apply to regular forms.
