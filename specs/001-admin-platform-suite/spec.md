# Feature Specification: Admin Platform Suite

**Feature Branch**: `001-admin-platform-suite`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "admin an lock the contact form that in top of forms with bolean / admin can mange the carda of dash borad and form debands on the forms / analysis sytstem megred with ai to analyis every from and can be managed although / can chage the web site name and logo this inulce site logo in html file and components and ever thing / in export system export the form content although / add index and title well be the form parent name / and the name of file well be form-name data / and fix the all type like in pdf must in title to be the form name not like all subiton data and the file name although / for two tu=ype export single or all"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export File Naming & Types Fix (Priority: P1)

An admin wants to export form submission data and receive correctly named files that match the form. Currently exports use generic names like "all submission data" as the PDF title and incorrect file names. After this fix, when the admin exports a single form or all forms, each file is named after the form, the PDF document title matches the form name, and the document index uses the form's parent name as the heading.

**Why this priority**: This is a correction of broken existing behavior. Exports with wrong names and titles undermine data organization and confuse recipients. This is the highest-value fix with immediate, visible impact.

**Independent Test**: Admin navigates to any form, triggers export (single), receives a file named "[form-name] data" with the form's name as the PDF title — fully testable end-to-end without any other story being complete.

**Acceptance Scenarios**:

1. **Given** an admin is on the form detail page, **When** the admin triggers a single-form export, **Then** the downloaded file is named "[form-name] data.[extension]" and the PDF document title shows the form's name.
2. **Given** an admin triggers a bulk export and selects the zip option, **When** the export completes, **Then** the downloaded archive contains one file per form, each named "[form-name] data.[ext]" with matching PDF titles.
3. **Given** an admin triggers a bulk export and selects the merged-file option, **When** the export completes, **Then** a single file is downloaded with clearly separated sections, each section heading using the respective form's name.
4. **Given** an exported document, **When** the admin opens the index or cover page, **Then** the index title displays the form's parent name, not a generic label.
5. **Given** an export of type CSV, Excel, or JSON, **When** the file is downloaded, **Then** the file name follows the "[form-name] data" convention.
6. **Given** an admin requests an export but the form has no submissions, **When** the export runs, **Then** the system returns an informative message indicating no data is available rather than an empty file.

---

### User Story 2 - Form Lock Toggle (Priority: P2)

An admin manages a contact form that is featured at the top of the forms list. The admin needs to temporarily lock this form — preventing end users from submitting new responses — without deleting or hiding the form. A simple boolean toggle in the form settings controls this state.

**Why this priority**: Form locking is a critical control mechanism for admins to pause data collection (e.g., during maintenance, after a campaign ends). It directly affects end-user experience and data integrity.

**Independent Test**: Admin opens the contact form settings, toggles the lock switch ON, then attempts to submit the form as a regular user — submission is blocked. Toggling OFF re-enables submission. Fully testable in isolation.

**Acceptance Scenarios**:

1. **Given** the admin is on the contact form's settings page, **When** the admin enables the lock toggle, **Then** the form displays a locked state indicator and new submissions are blocked.
2. **Given** the contact form is locked, **When** a regular user attempts to submit the form, **Then** the user sees a clear message that the form is currently unavailable and no submission is recorded.
3. **Given** the contact form is locked, **When** the admin disables the lock toggle, **Then** the form immediately accepts new submissions again.
4. **Given** the admin refreshes the page or logs out and back in, **When** the admin views the contact form, **Then** the lock state persists as previously set.
5. **Given** the admin is on any form's settings page (not only the contact form), **When** the admin enables the lock toggle, **Then** that form is locked and blocks new submissions, confirming lock is a universal per-form control.

---

### User Story 3 - Dashboard Card Management (Priority: P3)

An admin wants to configure the dashboard by managing which form-linked cards are displayed. Each card represents a form and shows its summary data. The admin can show, hide, or reorder cards so the dashboard reflects the most relevant forms at a glance.

**Why this priority**: Dashboard customization improves admin productivity by surfacing the most important form data. It is additive and does not block other functionality.

**Independent Test**: Admin opens dashboard settings, hides one form card and reorders another, returns to the dashboard — hidden card is gone, reordered card appears in new position. Testable independently of other stories.

**Acceptance Scenarios**:

1. **Given** the admin is on the dashboard management view, **When** the admin hides a form card, **Then** that card no longer appears on the main dashboard.
2. **Given** the admin adds a form card to the dashboard, **When** the dashboard is refreshed, **Then** the new card appears and displays current summary data from its linked form.
3. **Given** the dashboard has multiple cards, **When** the admin reorders them via drag-and-drop or up/down controls, **Then** the new order is saved and persists on next login.
4. **Given** a form is deleted from the system, **When** the admin views the dashboard, **Then** the card linked to that deleted form is automatically removed or flagged as unavailable.
5. **Given** the admin has configured dashboard cards, **When** a new form is created, **Then** the admin is given the option to add a card for that form to the dashboard.

---

### User Story 4 - Site Branding (Name & Logo) (Priority: P4)

An admin wants to update the site's name and logo from a central settings panel. The change must propagate everywhere the name or logo appears: the browser tab (favicon and title), the header/navigation component, any HTML metadata, and all other places the branding is referenced throughout the application.

**Why this priority**: Branding updates are important for white-labeling or rebranding scenarios but are lower priority than data management features. They are cosmetic changes with no impact on form functionality.

**Independent Test**: Admin updates site name to "Test Platform" and uploads a new logo, saves settings, reloads any page — browser tab title shows "Test Platform," header logo is updated, and favicon reflects the new logo. Testable independently.

**Acceptance Scenarios**:

1. **Given** the admin is in the site settings panel, **When** the admin changes the site name and saves, **Then** all pages reflect the new name in the browser title, header, and any footers or metadata.
2. **Given** the admin uploads a new logo image, **When** the change is saved, **Then** the new logo appears in the site header, favicon, and any HTML meta image tags site-wide.
3. **Given** the admin uploads an image that does not meet size or format requirements, **When** the save is attempted, **Then** the system rejects the upload with a clear message explaining acceptable formats and dimensions.
4. **Given** the admin clears the logo field without uploading a replacement, **When** saved, **Then** the system either retains the previous logo or falls back to a default placeholder, never showing a broken image.
5. **Given** a user opens the site on a mobile browser, **When** the page loads, **Then** the updated favicon and site name are visible in the browser tab.

---

### User Story 5 - AI-Powered Form Analysis (Priority: P5)

An admin wants to gain insights from form submission data through an integrated AI analysis system. For each form, the AI processes all submissions and surfaces patterns, summaries, and notable findings. The admin can view these insights, enable or disable analysis per form, and manage how results are displayed.

**Why this priority**: AI analysis is a value-added enhancement. It enriches the platform but is not a prerequisite for core form management operations.

**Independent Test**: Admin navigates to a form with at least one submission, opens the AI analysis tab, triggers analysis — results are displayed showing a summary and key patterns. Admin can toggle analysis off for that form. Testable independently.

**Acceptance Scenarios**:

1. **Given** a form has one or more submissions, **When** the admin opens the analysis view for that form, **Then** the system displays AI-generated insights including a summary and identified patterns.
2. **Given** the admin is viewing the analysis for a form with submissions, **When** the admin clicks the "Run Analysis" button, **Then** the system processes all current submissions and displays updated insights.
3. **Given** the admin disables AI analysis for a form, **When** new submissions arrive, **Then** no analysis is performed or displayed for that form.
4. **Given** a form has no submissions, **When** the admin opens the analysis view, **Then** the system shows a clear message that no data is available for analysis.
5. **Given** the AI analysis service is unavailable, **When** the admin requests analysis, **Then** the system shows a friendly error message and does not crash or block access to the rest of the form.

---

### Edge Cases

- What happens when an admin tries to export a form that has been locked — is the export still permitted?
- How does the system handle a logo file that is too large to process efficiently?
- What happens to dashboard cards when a form is renamed — do the cards update automatically?
- How does the system behave if the AI analysis takes longer than expected for a form with thousands of submissions?
- What happens if an admin changes the site name to an empty string?
- Can a locked form still be exported, or does locking block all interactions?
- What if two admins try to change the site logo simultaneously?

---

## Requirements *(mandatory)*

### Functional Requirements

**Export System**

- **FR-001**: System MUST name all exported files using the format "[form-name] data" where "form-name" is the actual name of the form being exported.
- **FR-002**: PDF exports MUST display the form's name as the document title, not a generic label.
- **FR-003**: The index or cover page of any export MUST use the form's parent name as the title heading.
- **FR-004**: Admin MUST be able to export a single form's submissions as a standalone file.
- **FR-005**: Admin MUST be able to export all forms' submissions in a single bulk operation and choose between two output formats: (a) a single merged file with clearly separated, named sections per form, or (b) a zip archive containing one correctly named file per form.
- **FR-006**: System MUST apply correct naming conventions consistently across all four supported export formats: PDF, CSV, Excel (.xlsx), and JSON.
- **FR-006a**: PDF exports MUST embed the form name as the document metadata title. CSV, Excel, and JSON exports MUST use the "[form-name] data" file naming convention.

**Form Locking**

- **FR-007**: Admin MUST be able to toggle a lock boolean on any form from that form's settings view.
- **FR-008**: When a form is locked, the system MUST prevent new submissions from being recorded.
- **FR-009**: When a form is locked, end users who attempt to submit MUST receive a clear message indicating the form is currently unavailable.
- **FR-010**: The lock state MUST persist across admin sessions and page reloads.

**Dashboard Card Management**

- **FR-011**: Admin MUST be able to show or hide individual form cards on the dashboard.
- **FR-012**: Admin MUST be able to reorder dashboard cards; the resulting order is shared globally and visible to all admins.
- **FR-013**: Each dashboard card MUST be linked to a specific form and display that form's submission summary.
- **FR-014**: When a linked form is deleted, its dashboard card MUST be automatically removed or marked unavailable.

**Site Branding**

- **FR-015**: Admin MUST be able to update the site name from a dedicated settings panel.
- **FR-016**: Admin MUST be able to upload and replace the site logo from the same settings panel.
- **FR-017**: Updated site name MUST be reflected in all pages, browser titles, headers, and HTML metadata.
- **FR-018**: Updated logo MUST be reflected in the site header, favicon, and all HTML meta image references.
- **FR-019**: System MUST validate uploaded logo files for format and size before saving.

**AI Analysis**

- **FR-020**: System MUST provide an AI analysis view for each form that displays insights derived from submission data.
- **FR-021**: Admin MUST be able to enable or disable AI analysis on a per-form basis.
- **FR-022**: Admin MUST be able to manually trigger a re-run of AI analysis for any form via an explicit "Run Analysis" action; analysis does not run automatically on new submissions.
- **FR-023**: When a form has no submissions, the analysis view MUST display a clear "no data" message.
- **FR-024**: System MUST handle AI analysis service failures gracefully without blocking access to the form or crashing the page.

### Key Entities

- **Form**: A data collection object with a name, parent name, lock status (boolean), and associated submissions. Forms are the central entity across all five feature areas.
- **Form Submission**: A single user-submitted response belonging to a form. The raw data for exports and AI analysis.
- **Dashboard Card**: A configurable widget tied to a specific form, showing submission summary data. Supports show/hide and ordering.
- **Export Package**: A generated file in one of four supported formats (PDF, CSV, Excel/.xlsx, JSON) containing one or all forms' submissions, named and titled per the form.
- **Site Branding Config**: A single configuration record containing the site name and logo, applied globally across the application.
- **Form Analysis**: AI-generated insight record for a form, containing summary, patterns, and findings derived from submissions. Enabled or disabled per form.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of exports produce files named "[form-name] data.[ext]" with the form name as the PDF title — zero generic-named files in any export type.
- **SC-002**: Admin can lock or unlock a form in under 3 seconds, and the locked state is enforced on the very next submission attempt.
- **SC-003**: Dashboard card changes (show/hide/reorder) are reflected on the dashboard within one page navigation — no additional steps required.
- **SC-004**: Site name and logo updates are visible across all pages after a single page reload, with no pages retaining outdated branding.
- **SC-005**: After the admin manually triggers analysis, results are displayed within 30 seconds for forms with up to 500 submissions.
- **SC-006**: Bulk export of all forms completes successfully for up to 50 forms within 60 seconds.
- **SC-007**: Admin can complete a full branding update (name + logo) in under 2 minutes from opening settings to seeing changes live.
- **SC-008**: End users blocked by a locked form receive a clear, understandable message — no blank pages or unhandled errors.

---

## Clarifications

### Session 2026-05-23

- Q: Does form locking apply only to the pinned contact form, or can admins lock any form in the system? → A: Any form can be locked — lock is a universal per-form boolean control available on all forms.
- Q: Which export formats must be supported? → A: PDF, CSV, Excel (.xlsx), and JSON — all four formats must be supported with correct naming and titling.
- Q: Is dashboard card ordering per-admin (personalized) or shared across all admins? → A: Shared — one card order applies to all admins.
- Q: Is AI analysis triggered automatically on each new submission or manually by the admin? → A: Manual — admin clicks a refresh/run button to trigger analysis on demand.
- Q: Does bulk (all-forms) export produce a single merged file or a zip archive? → A: Both — admin chooses at export time between a single merged file with sections or a zip archive of individual form files.

## Assumptions

- Only admin-role users have access to form locking, dashboard management, site branding, and AI analysis controls; regular users see only the public-facing forms.
- The "contact form" referred to in form locking is a specific identifiable form in the system, not a generic label for all forms.
- The export system already exists and supports PDF; this work extends it to also support CSV, Excel (.xlsx), and JSON while correcting naming and titling behavior across all four formats.
- Dashboard cards already exist visually; this work adds management controls (show/hide/reorder) to them.
- The AI analysis feature will use the platform's existing AI integration; building a new AI service from scratch is out of scope.
- Logo uploads support PNG, JPG, and SVG formats; other formats may be added in future iterations.
- "Form parent name" refers to the category, group, or folder the form belongs to within the forms hierarchy.
- Single-form export always produces one file. Bulk (all forms) export offers two modes at admin's choice: a single merged file with per-form sections, or a zip archive of individual form files.
- Dashboard card ordering is shared across all admins — one global order applies to every admin session.
