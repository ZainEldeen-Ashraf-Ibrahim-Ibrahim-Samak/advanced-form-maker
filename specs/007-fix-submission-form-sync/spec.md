# Feature Specification: Fix Submission Form Sync

**Feature Branch**: `[007-fix-empty-form-payload]`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "make can edit the concat form and can add more or delte can but must aleatst one record added 2 when admin send the resumti for user the user niot reced eh scoect nofication and although when admin viwed again not revcied for user 3 when reaarneg and admin update the foem like rearrange and user is oope nthe sumit/token for form and rfresh not get the updates fix that  4 add in in type sctor the value of can slect multybel data in sumtion form like others make the site name is coponet and import in pages that have the site name is 'scct'"

## Clarifications

### Session 2026-04-14

- Q: After admin form changes, how should refresh handle a user's unsaved draft values? → A: Load latest form and carry over matching fields; warn for dropped fields.
- Q: How long should undelivered resubmission notifications remain pending for offline users? → A: 7 days.
- Q: Is the file upload field added to each individual contact record, or is it a single global file upload section for the entire contact manager? → A: Added to each individual contact record.
- Q: Is uploading a file mandatory for each contact record, or is it completely optional? → A: Completely optional for every contact record.
- Q: How should these uploaded contact files be displayed during review for admins and clients? → A: Inline within the contact record details in the review page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Contact Records (Priority: P1)

As a user completing a submission form, I can edit contact records, add more records, and delete records while always keeping at least one record available.

**Why this priority**: Form completion fails without reliable contact record management, and this is a core submission flow.

**Independent Test**: Can be fully tested by opening a form, editing a contact row, adding rows, deleting rows, uploading a file to a record, and confirming the final row cannot be removed.

**Acceptance Scenarios**:

1. **Given** a form has one contact record, **When** the user edits any field or attaches an optional file, **Then** the edited values and file are retained and visible.
2. **Given** a form has one contact record, **When** the user adds a new record, **Then** the form shows two records and both are editable.
3. **Given** a form has multiple contact records, **When** the user deletes one record, **Then** the selected record is removed and remaining records stay unchanged.
4. **Given** a form has exactly one contact record, **When** the user attempts to delete it, **Then** deletion is blocked and the form keeps one record.
5. **Given** a contact record has an attached file, **When** an admin or client reviews the submission, **Then** the file is visible inline within that contact record's details.

---

### User Story 2 - Receive Resubmission Notifications (Priority: P1)

As an admin and end user, when an admin requests a resubmission, the targeted user receives a notification and the notification state remains visible on later admin review.

**Why this priority**: Resubmission workflows break when users are not alerted, causing delays and repeated manual follow-up.

**Independent Test**: Can be fully tested by sending a resubmission request from admin to a user, verifying user notification receipt, and verifying notification status remains visible after admin revisits the same submission.

**Acceptance Scenarios**:

1. **Given** an admin opens a submitted record, **When** the admin sends a resubmission request, **Then** the targeted user receives a new resubmission notification.
2. **Given** a resubmission request was sent, **When** the admin reopens the same record later, **Then** the notification status is still visible and not lost.
3. **Given** a user receives a resubmission notification, **When** the user opens the request, **Then** the user can access the correct submission to update.

---

### User Story 3 - Load Latest Form for Token Users (Priority: P2)

As a token-based form user, if an admin updates or rearranges the form while I have it open, refreshing the page loads the latest version so I do not submit outdated structure.

**Why this priority**: Prevents users from submitting against stale form layouts after admin changes.

**Independent Test**: Can be fully tested by opening a token form, changing form structure as admin, refreshing as user, and verifying updated field order/structure is shown.

**Acceptance Scenarios**:

1. **Given** a token form is open for a user, **When** an admin rearranges fields and republishes changes, **Then** a user refresh loads the updated structure.
2. **Given** a user refreshes after admin updates, **When** the form reloads, **Then** outdated layout elements are not shown.
3. **Given** a user has unsaved values and the form was updated by admin, **When** the user refreshes, **Then** matching fields retain their values and the user is warned about values that could not be carried over.

---

### User Story 4 - Multi-Select Sector and Unified Site Name (Priority: P3)

As a form user and site visitor, I can choose multiple values in the sector field, and all pages show the same reusable site name value "SCCT".

**Why this priority**: Improves data capture flexibility and branding consistency across the product.

**Independent Test**: Can be fully tested by selecting multiple sector values in a submission and by reviewing pages that display the site name to confirm consistent "SCCT" output.

**Acceptance Scenarios**:

1. **Given** a form includes a sector field, **When** the user selects multiple sector options, **Then** all selected options are saved and displayed in review.
2. **Given** a page displays the site title, **When** the page is rendered, **Then** the site name is shown as "SCCT" using the shared site name element.

### Edge Cases

- User attempts to delete the only remaining contact record.
- Admin sends a resubmission while the user is offline; the user should still see it on next session.
- Admin updates form layout while a token user has unsaved data open.
- A previously selected sector option becomes unavailable before resubmission.
- A page that previously hardcoded the site name is loaded after standardization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to edit existing contact records in the submission form.
- **FR-002**: System MUST allow users to add additional contact records in the submission form.
- **FR-003**: System MUST allow users to delete contact records only when more than one record remains.
- **FR-004**: System MUST enforce that at least one contact record always exists before and after form save/submit actions.
- **FR-005**: System MUST generate and deliver a user-facing notification when an admin sends a resubmission request.
- **FR-005A**: System MUST keep undelivered resubmission notifications pending for 7 days for offline users.
- **FR-006**: System MUST retain resubmission notification state so admins can still view the request status when reopening the same submission later.
- **FR-007**: System MUST associate each resubmission notification with the correct target user and submission.
- **FR-008**: System MUST load the latest published form structure whenever a token-based submission page is refreshed.
- **FR-009**: System MUST prevent display of outdated form ordering/structure after an admin form update.
- **FR-009A**: System MUST retain unsaved values for fields that still match after refresh to the latest form version.
- **FR-009B**: System MUST notify users when unsaved values are dropped because fields were removed or no longer compatible.
- **FR-010**: System MUST allow multiple selections in the sector field within submission forms.
- **FR-011**: System MUST store and display all selected sector values in submission review outputs.
- **FR-012**: System MUST provide a reusable site-name element with the value "SCCT".
- **FR-013**: System MUST use the reusable site-name element on all pages that display the site name.
- **FR-014**: System MUST add all missing Arabic (`ar`) website translation keys.
- **FR-015**: System MUST allow users to optionally upload one or more files attached to each individual contact record (behaving similarly to the form file manager).
- **FR-016**: System MUST display any attached contact files inline within the corresponding contact record details during both admin and client review.

### Key Entities *(include if feature involves data)*

- **Contact Record**: A repeatable group of contact details in a submission, with a minimum count of one. Can optionally include file attachments.
- **Resubmission Request**: An admin-issued request tied to a specific user and submission, including delivery and visibility status.
- **Form Version**: The currently published form structure used to render token-based submission pages.
- **Sector Selection**: A collection of one or more selected sector values associated with a submission.
- **Site Name Element**: A shared content element that provides the canonical site name text "SCCT" for all relevant pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of submission attempts maintain at least one contact record; zero submissions end with zero records.
- **SC-002**: At least 95% of online resubmission notifications are visible to target users within 10 seconds, and 100% of offline users who return within 7 days see pending notifications at next login.
- **SC-003**: In test runs where admins update form order while users hold open token links, 100% of user refreshes display the latest published form structure.
- **SC-004**: In validation tests, 100% of multi-select sector submissions preserve all chosen values in user and admin views.
- **SC-005**: In a full page audit of site-name displays, 100% show the same value "SCCT".

## Assumptions

- Admin and end-user roles already exist and can access current submission flows.
- A notification channel already exists for targeted user alerts and can display pending items.
- The latest published form structure is the single source of truth for token-based form rendering.
- Sector options are managed by authorized staff and available to all users filling the form.
- Scope includes all currently active pages that display the site name, and excludes archived or disabled pages.

### User Story 5 - Optional Contact Fields UI Update (Priority: P2)

As an admin and user, I can submit the form and view the contact info table with all individual contact fields being optional, provided that at least one contact record exists.

**Acceptance Scenarios**:
1. **Given** a user is completing a submission, **When** they fill out a contact record, **Then** all internal fields (name, email, phone, etc.) are optional in the UI, but the array must contain at least one record.
2. **Given** an admin is viewing the submission table, **When** they review contact details, **Then** the UI gracefully handles any missing contact info fields without errors.

### User Story 6 - Export Submissions as CSV and PDF (Priority: P2)

As an admin, I can export submissions as CSV or PDF files, either for a single submission or for selected/all submissions from the submissions table, so I can analyze and store the data offline.

**Acceptance Scenarios**:
1. **Given** an admin is viewing the submissions table, **When** they select multiple submissions or click an "Export All" button, **Then** they can download a combined CSV or PDF report.
2. **Given** an admin is viewing a single submission's details, **When** they click "Export", **Then** they can download a PDF or CSV report containing that specific submission's data.

