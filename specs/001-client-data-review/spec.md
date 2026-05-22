# Feature Specification: Dynamic Client Data Collection & Admin Review

**Feature Branch**: `001-client-data-review`
**Created**: 2026-04-12
**Status**: Draft
**Input**: User description: "Dynamic client data collection with admin review — variable fields, media uploads, bilingual, themed"

## Clarifications

### Session 2026-04-12

- Q: What are the allowed submission status transitions? (Linear, flexible, or semi-flexible?) → A: Flexible — any status can transition to any other status. Admin can move Viewed → Needs Rewrite, Needs Rewrite → Viewed, etc. Resubmission by client auto-sets status to Pending.
- Q: How does the admin communicate what needs to be fixed when marking "Needs Rewrite"? → A: Single free-text comment — admin writes one note when marking Needs Rewrite, displayed to the client on the submission detail page.
- Q: Is there a limit on how many times a client can resubmit after "Needs Rewrite"? → A: No limit — client can resubmit as many times as needed. Full resubmission history is tracked via the audit trail.
- Q: What is the data retention/deletion policy for submissions and uploaded media? → A: Admin-controlled — admins can manually delete individual submissions, which also removes associated media from cloud storage. No automatic expiration.
- Q: How are clients authenticated / onboarded? → A: No registration — clients access the submission form via a unique shareable link without authentication. For rewrites, the admin sends the submission link to the client via WhatsApp.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Defines Data Collection Fields (Priority: P1)

An administrator logs into the admin panel and creates a new data
collection form by defining one or more named fields. For each field
the admin specifies a display name (e.g., "ID Photos", "Issue Photos",
"Phone Number") and selects the input type (text, number, file/image
upload, date, dropdown select, etc.). The admin can reorder, edit, and
delete fields at any time. Once the form definition is saved, it
becomes immediately available for clients to fill out.

**Why this priority**: Without field definitions, no data can be
collected. This is the foundational capability that everything else
depends on.

**Independent Test**: An admin can create a form with at least three
fields of different types, save it, and verify the form appears in the
client-facing submission view.

**Acceptance Scenarios**:

1. **Given** the admin is on the field management page, **When** the
   admin adds a field named "National ID Photo" with type "image
   upload", **Then** the field appears in the form builder and is
   persisted.
2. **Given** an admin has created three fields, **When** the admin
   reorders them via drag-and-drop, **Then** the new order is saved
   and reflected on the client submission form.
3. **Given** a form definition exists with five fields, **When** the
   admin deletes one field, **Then** the field is removed and existing
   submissions retain their historical data for that field.

---

### User Story 2 - Client Submits Data (Priority: P1)

A client receives a unique form link (e.g., shared by the admin via
WhatsApp or any messaging channel). The client opens the link in a
browser — no registration or login is required. The client sees all
the fields the admin has defined and fills them out. Text fields accept
typed input; file/image fields allow uploading from the device. Media
files are uploaded to a cloud storage service and a reference is
stored. Upon submission, the data is saved and a confirmation page is
shown. The same link can later be used by the client to view their
submission status.

**Why this priority**: Data collection from clients is the core value
proposition of the system, tied directly to field definitions (US1).

**Independent Test**: A client opens a unique form link, fills out a
form with mixed field types (text, image, number), submits, and sees a
confirmation. The submission appears in the admin review queue.

**Acceptance Scenarios**:

1. **Given** an admin has shared a unique form link, **When** a client
   opens the link without logging in, **Then** the submission form
   renders with all defined fields.
2. **Given** a client is on the submission form, **When** the client
   fills out all fields and submits, **Then** the data is saved and
   the client sees a success confirmation.
3. **Given** a client is on the submission form, **When** the client
   uploads a 5 MB image for an image field, **Then** the upload
   succeeds, a thumbnail preview is shown, and the media reference is
   stored.
4. **Given** a client has submitted data previously, **When** the
   client revisits the same unique link, **Then** they see their
   submission and its current review status.

---

### User Story 3 - Admin Reviews Submissions (Priority: P1)

An administrator opens the review dashboard and sees a list of all
client submissions. The admin can open any submission to view all
submitted data (including images displayed inline). The admin then
marks the submission with one of three statuses: "Viewed" (accepted),
"Not Viewed" (still pending, explicitly skipped), or "Needs Rewrite"
(client must resubmit). When a submission is marked "Needs Rewrite",
the client is notified and can edit and resubmit.

**Why this priority**: The review workflow is the core administrative
function that completes the data collection lifecycle.

**Independent Test**: An admin opens a submission, views all fields
including images, changes its status to "Needs Rewrite", and verifies
the client sees the updated status and can resubmit.

**Acceptance Scenarios**:

1. **Given** three client submissions exist, **When** the admin opens
   the review dashboard, **Then** all three submissions are listed with
   client name, submission date, and current status.
2. **Given** an admin is viewing a specific submission, **When** the
   admin clicks "Mark as Viewed", **Then** the status changes to
   "Viewed" and a timestamp is recorded.
3. **Given** an admin marks a submission as "Needs Rewrite" and writes
   a comment explaining what to fix, **When** the admin copies the
   submission link and sends it to the client via WhatsApp, **Then**
   the client opens the link, sees the "Needs Rewrite" status with
   the admin's comment, and can edit and resubmit the form.
4. **Given** a client has resubmitted after a rewrite request, **When**
   the admin opens the same submission, **Then** the admin sees the
   updated data and can review it again.

---

### User Story 4 - Bilingual Interface with RTL Support (Priority: P2)

Both admin and client users can switch the interface language between
Arabic and English at any time. When Arabic is selected, the entire
layout switches to right-to-left (RTL) direction. All labels, buttons,
messages, and system text use translation keys so that every string is
available in both languages. The language preference persists across
sessions.

**Why this priority**: The target user base includes both Arabic and
English speakers; bilingual support is a launch requirement but not
blocking core data functionality.

**Independent Test**: A user switches from English to Arabic, verifies
that all UI text is translated and the layout direction changes to RTL.
Refreshing the page retains the language preference.

**Acceptance Scenarios**:

1. **Given** the interface is in English, **When** a user switches to
   Arabic, **Then** all visible text updates to Arabic and the layout
   direction becomes RTL.
2. **Given** a user has selected Arabic, **When** the user closes and
   reopens the browser, **Then** the interface loads in Arabic (RTL)
   without requiring re-selection.
3. **Given** the admin creates a field named "رقم الهاتف" in Arabic,
   **When** a client views the form in Arabic, **Then** the field label
   displays correctly in RTL.

---

### User Story 5 - Dark and Light Theme Toggle (Priority: P2)

Users can switch between dark and light visual themes. The chosen theme
persists across sessions. All UI components — including the form
builder, submission form, review dashboard, and navigation — render
correctly in both themes.

**Why this priority**: Theming complements the UI polish but does not
block data collection or review functionality.

**Independent Test**: A user toggles to dark theme, navigates through
all major pages, and confirms all text remains legible and components
render without visual artifacts. The preference persists after page
reload.

**Acceptance Scenarios**:

1. **Given** the interface is in light theme, **When** a user toggles
   to dark theme, **Then** the background, text, and component colors
   update immediately without a page reload.
2. **Given** a user is in dark theme, **When** the user refreshes the
   page, **Then** the dark theme persists.

---

### Edge Cases

- What happens when an admin deletes a field that has existing
  submissions? Historical data for that field MUST be preserved in
  existing submissions but the field no longer appears on new
  submissions.
- What happens when a client uploads a file that exceeds the maximum
  allowed size? The system MUST reject the upload with a clear error
  message stating the maximum allowed size.
- How does the system handle concurrent admin edits to the same form
  definition? The last save wins, with a warning if another admin has
  modified the form since the current admin loaded it.
- What happens if the media storage service is temporarily unavailable?
  The system MUST show a user-friendly error and allow retrying the
  upload without losing other filled fields.
- What happens when a client submits while a field definition is being
  updated? The submission MUST be validated against the field
  definitions that were active at the time the client loaded the form.
- Is there a limit on resubmissions? No — clients can resubmit
  without limit. Each resubmission cycle is recorded in the audit
  trail, giving admins full visibility into the history.
- What happens when an admin deletes a submission? All associated
  data — field values, media files in cloud storage, and audit
  entries — MUST be permanently removed. A confirmation dialog
  MUST be shown before execution.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow admins to create, edit, reorder,
  and delete named data collection fields with configurable input
  types (text, number, image upload, file upload, date, dropdown
  select).
- **FR-002**: The system MUST render a dynamic submission form for
  clients based on the currently active field definitions.
- **FR-003**: The system MUST accept client submissions containing
  mixed data types (text, numbers, uploaded media files) and persist
  them durably.
- **FR-004**: The system MUST upload media files to a cloud storage
  service and store only the reference (URL/ID) alongside the
  submission.
- **FR-005**: The system MUST provide an admin review dashboard
  listing all submissions with filtering by status (Pending, Viewed,
  Needs Rewrite).
- **FR-006**: The system MUST allow admins to set a submission's
  status to "Viewed", "Not Viewed", or "Needs Rewrite".
- **FR-007**: When a submission is marked "Needs Rewrite", the system
  MUST allow the client to edit and resubmit via the original unique
  submission link. The admin MUST be able to copy this link to share
  with the client (e.g., via WhatsApp).
- **FR-008**: The system MUST support full interface localization in
  Arabic and English, including RTL layout for Arabic.
- **FR-009**: All user-facing strings MUST be sourced from translation
  key files, with no hard-coded display text in the interface.
- **FR-010**: The system MUST support dark and light visual themes
  with user-selectable toggling.
- **FR-011**: Language and theme preferences MUST persist across user
  sessions.
- **FR-012**: The system MUST preserve historical submission data when
  a field definition is deleted.
- **FR-013**: The system MUST validate file uploads against a maximum
  file size limit and reject oversized files with a clear message.
- **FR-014**: The system MUST display uploaded images inline during
  admin review.
- **FR-015**: The system MUST log every status change with a timestamp
  and the admin user who made the change (audit trail).
- **FR-016**: The system MUST allow admins to transition a submission
  between any statuses (Pending, Viewed, Needs Rewrite) without
  restriction. When a client resubmits, the status MUST auto-reset
  to Pending.
- **FR-017**: When an admin marks a submission as "Needs Rewrite",
  the system MUST require a free-text comment explaining what needs
  correction. This comment MUST be visible to the client on the
  submission detail page.
- **FR-018**: The system MUST allow unlimited resubmission cycles for
  any submission. Each resubmission MUST be recorded in the audit
  trail with no cap on the number of cycles.
- **FR-019**: The system MUST allow admins to permanently delete a
  submission. Deletion MUST remove all associated media from cloud
  storage and all related audit entries. A confirmation prompt MUST
  be shown before deletion is executed.

### Key Entities

- **FieldDefinition**: Represents a single configurable data field
  created by an admin. Key attributes: name, display label (per
  locale), input type, validation rules, sort order, active/inactive
  status.
- **FormTemplate**: A grouping of FieldDefinitions that represents the
  complete data collection form. Key attributes: name, description,
  list of field references, creation date, last modified date.
- **Submission**: A client's completed form data entry. Key attributes:
  unique access token (used in the shareable link), client name/contact
  info (entered on the form), submission date, status (Pending / Viewed
  / Needs Rewrite), list of field values (each referencing a
  FieldDefinition and containing the submitted value or media
  reference).
  **State transitions**: Flexible — any status can transition to any
  other status (Pending ↔ Viewed ↔ Needs Rewrite). When a client
  resubmits after a Needs Rewrite, the status auto-resets to Pending.
- **FieldValue**: A single data point within a submission, tied to a
  FieldDefinition. Key attributes: field reference, value (text,
  number, or media URL), original field snapshot (for historical
  integrity).
- **User**: An admin user of the system. Key attributes: identity,
  role (Admin), language preference, theme preference. Note: clients
  do not have user accounts — they access forms via unique links.
- **AuditEntry**: A record of a status change on a submission. Key
  attributes: submission reference, old status, new status, admin user,
  timestamp, comment (required when new status is Needs Rewrite,
  optional otherwise).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can define a new data collection form with 5+
  fields of mixed types in under 5 minutes.
- **SC-002**: Clients can complete and submit a form with 5 fields
  (including at least one image upload) in under 3 minutes.
- **SC-003**: Admin review of a single submission (view all fields,
  set status) completes in under 30 seconds.
- **SC-004**: Language switching from English to Arabic (and vice
  versa) completes in under 1 second with full RTL layout change.
- **SC-005**: Theme toggling between dark and light applies in under
  500 milliseconds with no visual flicker.
- **SC-006**: 100% of user-facing strings are available in both
  Arabic and English with zero hard-coded text.
- **SC-007**: All status changes are recorded in the audit trail with
  accurate timestamps and admin identification.
- **SC-008**: The system handles at least 100 concurrent client
  submissions without degradation.
- **SC-009**: Deleted field definitions do not cause data loss —
  100% of historical submission data remains accessible.

## Assumptions

- Clients are NOT authenticated — they access the submission form via
  a unique shareable link (containing an access token). No registration
  or login is required for clients.
- Admins are authenticated and authorized via a role-based access
  control system; only users with the Admin role can access the form
  builder and review dashboard.
- The system is a web application accessed via modern browsers
  (Chrome, Firefox, Safari, Edge — last 2 major versions).
- Mobile-responsive design is expected but a dedicated native mobile
  app is out of scope for v1.
- The maximum file upload size is 10 MB per file; this can be
  adjusted via system configuration.
- Notifications to clients are handled externally by the admin (e.g.,
  sending the submission link via WhatsApp). The system provides a
  copyable link; automated messaging (WhatsApp API, email, SMS) is
  out of scope for v1.
- Admin-defined field labels support both Arabic and English text
  input; the admin enters both translations when creating a field.
- A single form template is active at any time; multi-form support
  is out of scope for v1.
- Data retention is admin-controlled; there is no automatic expiration
  or time-based purging of submissions or media in v1.
