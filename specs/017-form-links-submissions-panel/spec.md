# Feature Specification: Form Quick-Links on Dashboard + Per-Form Submissions Panel

**Feature Branch**: `017-form-links-submissions-panel`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "first read all my forms and make cards in dashboard for fast getting links like qr system. new feature in forms page that i can click in collaborate button that show me all submissions related to form id"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard Form Cards with QR & Link Quick-Access (Priority: P1)

An admin opens the dashboard and sees the existing form summary cards. Each card now has an inline quick-access section that lets the admin instantly copy the public form URL or view/download its QR code — without leaving the dashboard or navigating to the Forms page.

**Why this priority**: The dashboard is the most-visited screen. Reducing the number of clicks to share a form link or print a QR code has immediate daily value.

**Independent Test**: An admin can open the dashboard, locate any form card, copy its link or download its QR code, and use it in a browser — all without visiting any other page.

**Acceptance Scenarios**:

1. **Given** the dashboard is open and at least one form exists, **When** the admin looks at a form summary card, **Then** the card displays a "Copy Link" button and a "QR Code" button alongside the existing submission count.
2. **Given** the admin clicks "Copy Link" on a form card, **When** the action completes, **Then** the public form URL is copied to the clipboard and a success toast notification appears.
3. **Given** the admin clicks "QR Code" on a form card, **When** the dialog opens, **Then** a scannable QR code for that form's public URL is displayed, along with a "Download PNG" button.
4. **Given** the admin clicks "Download PNG", **When** the download triggers, **Then** a high-resolution PNG of the QR code is saved to the device.
5. **Given** a form card exists for a locked form, **When** the admin views the card, **Then** the quick-link buttons are still visible and functional (the public URL exists even if the form is locked).

---

### User Story 2 - Per-Form Submissions Panel in Forms Manager (Priority: P1)

On the Forms Management page, each form card gains a "Collaborate" button. Clicking it opens an inline panel or dialog that displays all submissions scoped to that specific form — paginated and filterable by status — without navigating away from the Forms page.

**Why this priority**: Admins frequently need to check submissions for one particular form while managing it. This eliminates round-trips between the Forms page and the Submissions page.

**Independent Test**: An admin can click "Collaborate" on any form card, see a paginated list of submissions for that form only, filter by status, and review individual submission entries.

**Acceptance Scenarios**:

1. **Given** the Forms page is open and at least one form with submissions exists, **When** the admin clicks the "Collaborate" button on a form card, **Then** a panel or dialog opens showing only submissions associated with that form's ID.
2. **Given** the submissions panel is open, **When** the admin views the list, **Then** each submission row shows at minimum: submission date, status, and submitter name (if available).
3. **Given** the submissions panel is open, **When** the admin applies a status filter (e.g., "Pending"), **Then** the list updates to show only submissions with that status for that form.
4. **Given** a form has more than 10 submissions, **When** the admin opens the panel, **Then** submissions are paginated (10 per page) with navigation controls.
5. **Given** a form has zero submissions, **When** the admin opens the panel, **Then** an empty-state message is displayed instead of a table.
6. **Given** the panel is open, **When** the admin closes it, **Then** the Forms page returns to its previous state with no data loss.

---

### Edge Cases

- What happens when the form's public URL cannot be constructed (e.g., no form ID yet)? The quick-link buttons should be disabled or hidden for that card.
- What happens if the QR code library fails to render? A graceful error message should appear in place of the QR code.
- What happens when the submissions API call for a specific formId returns an error? The panel shows an error state with a retry option.
- How does the system handle a form that is deleted while the submissions panel is open? The panel shows a "Form not found" message on the next data fetch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each form summary card on the dashboard MUST display a "Copy Link" action that copies the form's public URL to the clipboard.
- **FR-002**: Each form summary card on the dashboard MUST display a "QR Code" action that opens a dialog showing the QR code for that form's public URL.
- **FR-003**: The QR code dialog on the dashboard MUST include a "Download PNG" button that saves a high-resolution copy of the QR code.
- **FR-004**: The QR code and link displayed on the dashboard MUST match the same public URL format already used in the Forms page share dialog (i.e., `/{locale}/f/{formId}`).
- **FR-005**: Each form card on the Forms Management page MUST include a "Collaborate" button.
- **FR-006**: Clicking "Collaborate" MUST open a panel or dialog scoped to that form's ID, displaying only its submissions.
- **FR-007**: The per-form submissions panel MUST support status filtering (all, pending, draft, viewed, needs_rewrite).
- **FR-008**: The per-form submissions panel MUST paginate results (10 per page) when the form has more than 10 submissions.
- **FR-009**: The per-form submissions panel MUST display an empty-state message when no submissions exist for the selected filters.
- **FR-010**: The per-form submissions panel MUST use the existing `/api/admin/submissions?formId=<id>` endpoint, which already supports `formId` query parameter filtering.

### Key Entities

- **FormTemplate**: The form definition with an `id` used to construct the public URL and filter submissions.
- **Submission**: A submitted entry linked to a `formTemplateId`; already filterable by `formId` in the API.
- **DashboardCard (form type)**: The existing dashboard card entity that exposes `formTemplateId` — used to derive the quick-access URL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can copy a form's public link from the dashboard in 1 click (down from 3+ clicks via the current Forms page share dialog).
- **SC-002**: An admin can open the QR code for any form card on the dashboard in under 2 seconds after page load.
- **SC-003**: An admin can view all submissions for a specific form from the Forms page in under 3 clicks.
- **SC-004**: The per-form submissions panel loads and displays its first page of results in under 2 seconds on a standard connection.
- **SC-005**: 100% of form cards on the dashboard and Forms page expose the quick-link and collaborate features respectively — no form is excluded.

## Assumptions

- The public form URL format is `/{locale}/f/{formId}`, consistent with the existing share dialog implementation in the Forms page.
- The existing `/api/admin/submissions` endpoint already accepts a `formId` query parameter and returns paginated results — no new API endpoint is required.
- The QR code rendering library (`qrcode.react`) is already installed and used in the Forms page share dialog; it will be reused here.
- Only authenticated admins can access the dashboard and Forms Management page; no additional access control is needed for the new UI elements.
- The "Collaborate" panel does not need to support bulk actions (e.g., bulk delete) in this version — read-only viewing and status filtering are sufficient.
- Mobile responsiveness follows existing dashboard card and dialog patterns already in the codebase.
