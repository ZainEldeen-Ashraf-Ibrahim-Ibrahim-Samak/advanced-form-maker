# Feature Specification: Admin UI Details

**Feature Branch**: `015-admin-ui-details`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "i want to add that i can lock just the contact form that inside forms although that user can fill just the forms, in submissions table add index like 1,2,3... and show in exports types, where is the ui of analysis system, and ui of admin can manage the cards of dashboard and form depends on the forms"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submissions Table Index & Export Type Buttons (Priority: P1)

An admin views the submissions table and needs two improvements: (1) each row has a clear sequential number (1, 2, 3...) so submissions can be referenced by position; (2) export format buttons (PDF, CSV, Excel, JSON) are visible directly on the submissions page so the admin knows what formats are available and can trigger them without navigating away.

**Why this priority**: The index numbers and export buttons are purely additive UI improvements to the submissions table — the most-visited admin screen. They require no architectural changes and deliver immediate usability value.

**Independent Test**: Admin opens the submissions table for any form. Each row shows a sequential number starting at 1. Four export format buttons are visible on the page. Clicking one downloads the submissions in that format with the correct filename convention (`[form-name] data.[ext]`).

**Acceptance Scenarios**:

1. **Given** the admin is on the submissions table page, **When** the page loads, **Then** the first column of every row displays a sequential index number starting at 1, incrementing by 1 for each subsequent row.
2. **Given** the admin is on the submissions table page, **When** the page loads, **Then** four export buttons (PDF, CSV, Excel, JSON) are visibly displayed — either in the page header/toolbar or above the table.
3. **Given** the admin clicks any of the four export format buttons, **When** the download completes, **Then** the file is named `[form-name] data.[ext]` and the content contains all visible submissions including their index numbers.
4. **Given** the submissions table has been sorted or filtered, **When** the admin views the index column, **Then** the index reflects the displayed order (1 = first visible row, not original database order).
5. **Given** there are no submissions for a form, **When** the admin opens that form's submissions table, **Then** an empty-state message is shown and the export buttons are disabled or hidden.

---

### User Story 2 - Contact Form Lock (Contact Form Only) (Priority: P2)

An admin can lock or unlock the contact form — the specific form that appears inside the forms section. When locked, regular users attempting to submit the contact form are shown a clear "form unavailable" message and their submission is not recorded. No other form has a lock control; locking is exclusive to the contact form.

**Why this priority**: Form locking provides critical admin control over data intake. Scoping it to the contact form keeps the feature simple and targeted without introducing a general-purpose lock mechanism across all forms.

**Independent Test**: Admin opens the contact form settings and enables the lock toggle. A regular user navigates to the contact form and attempts to submit — they see an unavailability message and the submission does not appear in the submissions table. Admin disables the lock and submission works normally.

**Acceptance Scenarios**:

1. **Given** the admin is on the contact form's settings or detail page, **When** the page loads, **Then** a lock toggle (boolean switch) is visible and shows the current lock state.
2. **Given** the admin enables the lock toggle, **When** saved, **Then** the contact form is locked and the admin sees a "Locked" status indicator on the form.
3. **Given** the contact form is locked, **When** a regular user submits the contact form, **Then** the user sees a clear message that the form is currently unavailable and no submission is recorded.
4. **Given** the contact form is locked, **When** the admin disables the lock toggle and saves, **Then** the contact form immediately accepts new submissions again.
5. **Given** the admin views other forms (non-contact forms), **When** inspecting their settings, **Then** no lock toggle is present — locking is only available on the contact form.
6. **Given** the admin restarts the session or refreshes, **When** the contact form settings page loads, **Then** the lock state is preserved as previously set.

---

### User Story 3 - AI Analysis UI: Business Insights & Export (Priority: P3)

An admin — such as a marketing agency manager — wants the AI to read form submissions and surface actionable business insights: how many leads were generated, which submission topics get the most engagement, and other marketing intelligence derived from what users entered. The analysis interface is a dedicated tab within the form's detail page. It shows a "Run Analysis" button, a business-focused insights panel (leads, trends, highlights), and an export button so the admin can download the analysis report in any supported format (PDF, CSV, Excel, JSON).

**Why this priority**: UI placement is required before the analysis feature can be built or tested. Without a defined location, the feature has no home in the navigation hierarchy. The business-insight focus (leads, engagement, trends) determines what the AI is asked to surface.

**Independent Test**: Admin navigates to a form used by a marketing agency. Clicks the "Analysis" tab, runs analysis. The panel shows business-relevant insights (e.g., "15 submissions indicate lead interest in product X", "most common user intent: requesting a quote"). Admin clicks the export button and downloads the analysis as a PDF named `[form-name] analysis.[ext]`.

**Acceptance Scenarios**:

1. **Given** the admin is on a form's detail page, **When** the page loads, **Then** an "Analysis" tab is visible alongside other form tabs.
2. **Given** the admin clicks the "Analysis" tab, **When** no analysis has been run, **Then** an empty-state panel appears with a "Run Analysis" button and a brief explanation of what the AI will analyze.
3. **Given** the admin clicks "Run Analysis", **When** the analysis completes, **Then** the panel displays two sections side by side: (a) computed statistics — total submission count, top recurring answers, and date range of analyzed submissions; (b) AI-generated narrative — a business summary, lead highlights, engagement trends, and notable findings.
4. **Given** analysis results are displayed, **When** the admin clicks the export button on the Analysis tab and selects a format, **Then** the downloaded file is named `[form-name] analysis.[ext]` and contains: the analysis summary (stats + AI narrative) followed by all raw submission rows.
5. **Given** the admin is on the Analysis tab, **When** the admin toggles analysis off, **Then** the "Run Analysis" button is hidden and a disabled-state message is shown.
6. **Given** AI analysis is disabled for a form, **When** the admin views the Analysis tab, **Then** analysis results and the "Run Analysis" button are not shown; the export button is also hidden and a "analysis disabled" message is shown.
7. **Given** analysis has never been run for a form, **When** the admin clicks the export button on the Analysis tab, **Then** the downloaded file includes computed stats (submission count, date range) in the analysis section, a "no AI analysis yet" note in the narrative section, and all raw submission rows below.

---

### User Story 4 - Dashboard Card Management UI: Name, Metric & Visibility (Priority: P4)

An admin wants to configure the dashboard cards — not only controlling visibility and order, but also editing each card's display name and the metric value it shows. For example, a card linked to the "Agency" form can be named "Agency Pipeline" and display the current number of submissions for that form. The card management UI is accessible from the dashboard via a "Manage Cards" button. In edit mode, each card is editable (name + metric), hideable, and drag-reorderable.

**Why this priority**: Defining where the card management UI lives is required before building it. Adding name and metric editability ensures each card communicates meaningful context (e.g., "Agency — 42 submissions") rather than just showing raw form names.

**Independent Test**: Admin opens the dashboard. Clicks "Manage Cards", enters edit mode. Edits the "Agency" card's display name to "Agency Pipeline" and confirms the metric shows submission count. Saves. The dashboard exits edit mode and shows "Agency Pipeline — 42 submissions". Another admin session shows the same.

**Acceptance Scenarios**:

1. **Given** the admin is on the dashboard page, **When** the page loads, **Then** a "Manage Cards" button is clearly visible on the dashboard.
2. **Given** the admin clicks "Manage Cards", **When** edit mode activates, **Then** each card shows: a drag handle, a name input field, a metric display, a show/hide toggle; "Save" and "Cancel" buttons appear.
3. **Given** the admin edits a card's name field, **When** the admin types a new name, **Then** the card preview updates to show the new name immediately within the edit view.
4. **Given** each card shows a metric, **When** edit mode is active, **Then** each card displays editable metric label and value fields; new cards default to empty fields; existing cards pre-fill with previously saved values.
5. **Given** the admin is in edit mode, **When** the admin drags a card to a new position, **Then** the card moves to the new position within the edit list.
6. **Given** the admin toggles a card's visibility to hidden, **When** in edit mode, **Then** the card is visually dimmed but remains in the edit list for re-enabling.
7. **Given** the admin clicks "Save", **When** save completes, **Then** the dashboard shows updated card names, metrics, visibility, and order; hidden cards are not displayed.
8. **Given** the admin clicks "Cancel", **When** exiting edit mode, **Then** no changes are persisted and the dashboard reverts to its previous state.
9. **Given** another admin opens the dashboard, **When** the page loads, **Then** they see the same card names, metrics, order, and visibility as saved.

---

### Edge Cases

- What happens if the admin tries to enable the lock while the contact form is actively receiving submissions?
- What if the submissions table has thousands of rows — does the index column still perform correctly?
- What if a form has no submissions — are the four export buttons disabled or shown with a "no data" warning?
- What happens when the admin clicks "Run Analysis" a second time while a previous run is still in progress?
- What if all cards are hidden in dashboard edit mode — should the system warn before saving?
- What if a form is deleted while an admin is in dashboard edit mode?

---

## Requirements *(mandatory)*

### Functional Requirements

**Submissions Table Enhancements**

- **FR-001**: The submissions table MUST display a sequential index number in the first column of every row, starting at 1.
- **FR-002**: The index number MUST reflect the currently displayed row order (post-sort/filter), not the raw database insertion order.
- **FR-003**: The submissions page MUST display four export format buttons (PDF, CSV, Excel, JSON) in the page toolbar or header area.
- **FR-004**: Each export button MUST trigger a download of the current form's submissions in the selected format, named `[form-name] data.[ext]`.
- **FR-005**: Exported files MUST include the index numbers as a column so row references are consistent between the on-screen table and the downloaded file.
- **FR-006**: When a form has no submissions, export buttons MUST be disabled and show a tooltip or message indicating no data is available.

**Contact Form Lock**

- **FR-007**: A lock boolean toggle MUST be visible on the contact form's settings or detail page.
- **FR-008**: The lock toggle MUST NOT appear on any form other than the contact form.
- **FR-009**: When the contact form is locked, the system MUST reject new submissions with a clear, user-facing unavailability message.
- **FR-010**: The lock state MUST persist across admin sessions and page reloads.
- **FR-011**: A visible "Locked" status indicator MUST appear on the contact form listing or header when it is locked.

**AI Analysis UI**

- **FR-012**: An "Analysis" tab MUST be present within the form detail view, alongside other form tabs.
- **FR-013**: The Analysis tab MUST contain a "Run Analysis" button that triggers manual AI analysis of the form's submissions.
- **FR-014**: The Analysis tab MUST display two content areas side by side: (a) computed statistics — total submission count, most frequent answers per field, and date range of analyzed submissions; (b) AI-generated narrative — a business summary, lead highlights, engagement trends, and notable findings. Both areas are shown together after a successful analysis run.
- **FR-015**: When no analysis has been run, the Analysis tab MUST show an empty-state message with the "Run Analysis" button and a brief description of what the AI will analyze.
- **FR-016**: The Analysis tab MUST include an export button that downloads a combined report in any of the four supported formats (PDF, CSV, Excel, JSON), named `[form-name] analysis.[ext]`. The combined report contains: (a) the analysis section — computed statistics and AI-generated narrative at the top; (b) all raw submission rows below, following the same column structure as the standard submissions export.
- **FR-016b**: The Analysis tab export button MUST be available regardless of whether analysis has been run. The exported file ALWAYS includes computed statistics (total submission count, date range of submissions) in the analysis section. If no AI analysis has been run, the AI narrative portion shows a "no analysis yet" placeholder. Raw submission rows are always included below the analysis section.
- **FR-016a**: The Analysis tab MUST include an enable/disable toggle; when AI analysis is disabled for a form, the "Run Analysis" button and export button are hidden and a disabled-state message is shown.
- **FR-025**: The AI-generated analysis narrative MUST be generated in the admin's active UI locale. The analysis trigger POST request MUST pass the current locale to the AI service, and the Gemini prompt MUST include an explicit language instruction (e.g., "Respond entirely in Arabic" when `locale === "ar"`, "Respond in English" when `locale === "en"`). The UI language and the analysis language MUST always match.

**Internationalization & Navigation**

- **FR-026**: Every new UI text element introduced by this spec (labels, buttons, empty states, status messages, error messages, column headers) MUST have corresponding keys in both `src/messages/en.json` and `src/messages/ar.json`. No English or Arabic strings may be hardcoded directly in UI components.
- **FR-027**: All new features introduced by this spec MUST be reachable from existing admin navigation without requiring direct URL entry. Specifically: the Analysis tab MUST be visible in the form detail tab bar; the submissions index column and export buttons MUST appear on page load of the submissions page; the "Manage Cards" button MUST be visible on the dashboard on page load; the contact form lock toggle MUST be visible in the form edit dialog when `isContactForm` is true.

**Dashboard Card Management UI**

- **FR-017**: A "Manage Cards" button MUST be visible on the main dashboard page.
- **FR-018**: Clicking "Manage Cards" MUST enter an edit mode where each card displays: a drag handle, an editable name field, an editable metric label field, an editable metric value field, and a show/hide visibility toggle.
- **FR-019**: In edit mode, the admin MUST be able to edit each card's display name — the saved name replaces the raw form name shown on the dashboard card.
- **FR-020**: In edit mode, the admin MUST be able to set a fully freeform metric label (e.g., "Leads", "Views", "Revenue") and a fully freeform metric value (e.g., "42", "1,200", "$5,000") for each card. Both are saved as plain text and displayed on the live dashboard card as the primary metric.
- **FR-021**: In edit mode, the admin MUST be able to drag cards to reorder them.
- **FR-022**: In edit mode, hidden cards MUST remain in the edit list (visually dimmed) so they can be re-enabled.
- **FR-023**: Edit mode MUST provide "Save" and "Cancel" actions; "Save" persists name, visibility, and order for all admins; "Cancel" discards all unsaved changes.
- **FR-024**: After saving, the dashboard MUST immediately show updated card names, metrics, visibility, and order without requiring a page refresh.

### Key Entities

- **Submission Row**: A single submission displayed in the table, now carrying a display index (1-based, order-dependent).
- **Contact Form**: The specific form that has the exclusive lock toggle control.
- **Analysis Tab**: A UI panel within a form's detail view showing AI-generated business insights from submission data; includes a "Run Analysis" trigger and an export control.
- **Analysis Report**: The combined export file from the Analysis tab (PDF/CSV/Excel/JSON). Contains two sections: (1) the analysis summary — computed statistics (count, top answers, date range) and AI-generated narrative (business summary, leads, trends); (2) all raw submission rows in the same format as a standard submissions export. Named `[form-name] analysis.[ext]`.
- **Dashboard Card**: A configurable widget representing one form on the dashboard. Has a custom display name (editable), a freeform metric label (editable, e.g., "Leads"), a freeform metric value (editable, e.g., "42"), visibility state, and sort order. All editable fields are set manually by the admin.
- **Dashboard Edit Mode**: A temporary UI state of the dashboard where card names, visibility, and order can be modified before being saved.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of rows in the submissions table display a sequential index number with no gaps or duplicates per page load.
- **SC-002**: All four export format buttons are visible on the submissions page within 1 second of page load.
- **SC-003**: Admin can lock or unlock the contact form in under 3 seconds; the change is reflected on the next user submission attempt.
- **SC-004**: The "Analysis" tab loads within 2 seconds of being clicked, showing either results or the empty state.
- **SC-005**: Dashboard card configuration changes (hide/reorder) are visible to all admin sessions within 5 seconds of saving.
- **SC-006**: Admin can complete a full dashboard card reorder and save in under 2 minutes.
- **SC-007**: No form other than the contact form displays a lock toggle — verified across 100% of non-contact forms.
- **SC-008**: 100% of new UI text strings introduced by this spec have corresponding keys in both `src/messages/en.json` and `src/messages/ar.json`; no English or Arabic strings are hardcoded in any component file.
- **SC-009**: When the admin's active locale is Arabic (`ar`), the AI-generated analysis narrative (summary, patterns, findings, sentiment) is returned in Arabic. When the locale is English (`en`), the narrative is in English.

---

## Clarifications

### Session 2026-05-23

- Q: What type of insights should the AI analysis produce from form submissions? → A: Business-focused insights — the AI reads submission content and surfaces marketing intelligence: lead highlights, engagement trends, notable user intents (e.g., "users requesting quotes", "most interest in product X"). Admin use-case: marketing agency managing form leads.
- Q: Should the Analysis tab include an export of the analysis results? → A: Yes — an export button on the Analysis tab downloads the analysis report in any of the four supported formats (PDF, CSV, Excel, JSON) named `[form-name] analysis.[ext]`.
- Q: Can dashboard cards have a custom display name editable by the admin? → A: Yes — in edit mode, each card has an editable name field. The saved name is shown on the dashboard card instead of the raw form name.
- Q: What metric value do dashboard cards display? → A: The number of submissions for the linked form, auto-populated and not manually editable. The admin can only edit the display name.
- Q: Should AI analysis show pure narrative text or also include computed submission statistics? → A: Both — AI-generated narrative (summary, patterns, findings) displayed alongside key computed stats (total submission count, most frequent answers, date range of analyzed submissions).
- Q: What metric value do dashboard cards display — fixed submission count, selectable metric, or fully freeform? → A: Fully freeform — admin enters any custom label (e.g., "Leads", "Views", "Revenue") and any custom value (e.g., "42", "1,200", "$5,000") for each card. Both label and value are manually set and saved per card.
- Q: What does the Analysis tab export contain — analysis only, or combined analysis + submission rows? → A: Combined — analysis summary (stats + AI narrative) at the top, followed by all raw submission rows in the same file.
- Q: If analysis has never been run, is the export button disabled or does it still work? → A: Export still works — the analysis section of the file shows a "no analysis yet" placeholder; raw submission rows are always included regardless of analysis state.
- Q: When exporting with no prior AI run, should the export still include computed stats (count, date range)? → A: Yes — computed stats (total submission count, date range) are always included in the analysis section even when AI narrative is absent. Only the AI narrative portion shows "no analysis yet."
- Q: Should the AI-generated analysis narrative be generated in the admin's active UI locale? → A: Yes — the AI MUST generate its narrative in the admin's current UI language. When locale is Arabic, the analysis is written in Arabic; when English, in English. The Gemini prompt MUST include an explicit language instruction matching the active locale.
- Q: Must all new UI text have AR/EN translation keys, and must all new features be accessible from existing navigation? → A: Yes — every new UI string MUST have keys in both `en.json` and `ar.json` (no hardcoding); all features introduced by this spec MUST be reachable from the existing admin UI without direct URL access.

## Assumptions

- The "contact form" is uniquely identifiable in the system by a specific attribute or name; it is the only form with the lock capability.
- The submissions table already exists; this spec adds the index column and export buttons as enhancements to the existing view.
- The form detail page already has a tab-based navigation structure; the "Analysis" tab is added to the existing tab bar.
- The dashboard already displays form cards; this spec adds a "Manage Cards" button and edit-mode behavior to the existing dashboard.
- Export downloads triggered from the submissions page use the same naming convention as specified in the Admin Platform Suite spec (`[form-name] data.[ext]`).
- AR/EN bilingual labels are required for ALL new UI text (index column header, export button labels, analysis tab label, manage cards button, edit mode labels, stats section labels, metric field labels, lock toggle labels). No English or Arabic string may be hardcoded in a component.
- The AI service receives the admin's current locale on each analysis trigger and generates the narrative output in the matching language.
- Dashboard card edit mode operates on a shared global configuration (one order for all admins), consistent with the Admin Platform Suite spec clarification.
