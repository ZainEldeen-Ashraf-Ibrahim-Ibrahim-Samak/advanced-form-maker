# Feature Specification: Enhanced Dashboard Card Manager

**Feature Branch**: `016-enhanced-card-manager`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "in cards manager make the title ar, en and make the section at top and can also manager the already default cards that in dashboard and that also in submissions page also can add logo and cards style must be like the default cards and why in the AI for submission analysis and give me Submission Statistics Total Submissions 1 Date Range No submissions yet Top Answers No data available"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Bilingual Card Titles & Logo (Priority: P1)

The admin opens the card manager dialog and can set two separate display name fields for each form summary card: one in Arabic and one in English. The system automatically shows the correct language based on the active UI locale. The admin can also upload or enter a logo/icon URL for each card, which is displayed on the card face.

**Why this priority**: Bilingual titles are essential for an AR/EN bilingual admin panel. Without this, all cards show their English-only internal name regardless of active language. This is the most visible localization gap.

**Independent Test**: Open the card manager, set an Arabic title and English title for a card, save, switch locale to AR → card shows the Arabic title; switch to EN → card shows the English title. Logo appears on the card face.

**Acceptance Scenarios**:

1. **Given** the card manager dialog is open, **When** the admin enters an Arabic title and an English title for a form card, **Then** both values are saved independently.
2. **Given** the Arabic locale is active on the dashboard, **When** a card has an Arabic title set, **Then** the card displays the Arabic title.
3. **Given** the English locale is active, **When** a card has an English title set, **Then** the card displays the English title.
4. **Given** a locale-specific title is empty, **When** the card is displayed in that locale, **Then** the system falls back to the other language title, then the internal form name.
5. **Given** the admin enters a logo URL for a card, **When** the card is saved and displayed, **Then** the logo image appears on the card face.
6. **Given** no logo is set, **When** the card is displayed, **Then** no broken image placeholder is shown (graceful fallback).

---

### User Story 2 — Form Summaries Section at Top of Dashboard (Priority: P1)

The "Form Summaries" card grid currently appears below the status count cards and storage usage section. It must be repositioned to appear at the very top of the dashboard, immediately below the page title/subtitle.

**Why this priority**: The form summary cards are the primary navigation into individual forms. Having them at the top reduces scrolling and gives quick access. Status counts and storage are secondary metrics.

**Independent Test**: Load the dashboard page — the form summary cards grid appears before the status count row (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite).

**Acceptance Scenarios**:

1. **Given** the admin loads the dashboard, **When** the page is fully rendered, **Then** the form summary cards section is the first content block after the page heading.
2. **Given** form summary cards are loading, **When** the section is at the top, **Then** the loading state does not cause layout shift that pushes other sections down unexpectedly.
3. **Given** no form cards exist yet, **When** the section is at the top, **Then** the empty/loading state does not occupy a large blank area above the stat counts.

---

### User Story 3 — Manage Default Status Cards (Priority: P2)

The five hardcoded status summary cards (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite) are currently static and cannot be hidden, reordered, or renamed. The admin must be able to manage these cards through the same card manager interface: toggle visibility, set custom display labels in AR/EN, and reorder them relative to each other and to form summary cards.

**Why this priority**: Admins may want to hide irrelevant status counters or relabel them for their organization's terminology. Consistency with the form summary card manager avoids a two-tier management experience.

**Independent Test**: Open the card manager — default status cards appear as entries alongside form cards. Toggle one hidden, save → it disappears from the dashboard. Re-enable it → it reappears with its count.

**Acceptance Scenarios**:

1. **Given** the card manager dialog is open, **When** the list loads, **Then** the five default status cards (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite) appear as manageable entries at the top of the list.
2. **Given** the admin hides the "Needs Rewrite" card, **When** the dashboard loads, **Then** the Needs Rewrite count card is not visible.
3. **Given** the admin sets a custom Arabic label for "Pending", **When** the dashboard is viewed in Arabic, **Then** the card shows the custom Arabic label instead of the default translation.
4. **Given** the admin reorders a default status card below a form card, **When** the dashboard loads, **Then** the display order matches the saved configuration.
5. **Given** all default cards are hidden, **When** the dashboard loads, **Then** no empty placeholder appears where the cards were.

---

### User Story 4 — Card Management Accessible from Submissions Page (Priority: P2)

The admin can access the same card manager dialog from the Submissions page, not only from the dashboard. A "Manage Cards" button or link is present on the Submissions page.

**Why this priority**: The submissions page is a frequently visited page. Being able to adjust dashboard cards without navigating away improves workflow.

**Independent Test**: Navigate to the Submissions page → a "Manage Cards" button is visible → clicking it opens the same card manager dialog → save → changes are reflected on the dashboard.

**Acceptance Scenarios**:

1. **Given** the admin is on the Submissions page, **When** the page loads, **Then** a "Manage Cards" button is visible.
2. **Given** the admin clicks "Manage Cards" on the Submissions page, **When** the dialog opens, **Then** the same card configuration UI appears as on the dashboard.
3. **Given** the admin saves changes from the Submissions page card manager, **When** the admin navigates to the Dashboard, **Then** the changes are reflected.

---

### User Story 5 — Form Cards Styled Like Default Status Cards (Priority: P2)

The form summary cards currently use a tall card layout with description and manage link. They must be restyled to match the visual style of the default status count cards: compact height, title/label at top-left, icon at top-right, and bold metric value in large text below.

**Why this priority**: Visual consistency makes the dashboard feel cohesive. The mixed card styles currently make the dashboard look unfinished.

**Independent Test**: Compare a form summary card with a default status card visually — they use the same compact card layout, same font sizes, same icon-right / title-left header pattern.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** form summary cards are displayed, **Then** each card has a compact header row with the card title on the left and an icon on the right.
2. **Given** a card has a custom metric value set, **When** the card is displayed, **Then** the metric value is shown in large bold text matching the style of the default count cards.
3. **Given** a card has no custom metric value, **When** the card is displayed, **Then** the submission count is shown in the same large bold style.
4. **Given** a card is marked as locked (contact form), **When** displayed, **Then** a locked indicator is shown without breaking the compact layout.
5. **Given** a card has a logo set, **When** displayed, **Then** the logo appears as the icon in the top-right position of the card header.

---

### User Story 6 — Fix Analysis Date Range Showing "No Submissions Yet" (Priority: P1)

The AI analysis panel shows "No submissions yet" for the Date Range statistic even when the form has at least one submission. The admin triggers analysis or loads the analysis panel and should see the actual submission date range and correct total count.

**Why this priority**: This is a data accuracy bug. Showing incorrect stats undermines trust in the analysis feature.

**Independent Test**: Navigate to any form's analysis tab that has at least 1 submission → the "Submission Statistics" card shows the correct total count, the actual date range (e.g. "23/5/2026 - 23/5/2026"), and top answers (once analysis has run).

**Acceptance Scenarios**:

1. **Given** a form has 1 or more submissions, **When** the analysis panel loads, **Then** the Total Submissions count matches the actual submission count.
2. **Given** a form has submissions with recorded dates, **When** the analysis panel loads, **Then** the Date Range shows "earliest date - latest date" rather than "No submissions yet".
3. **Given** the AI analysis has never been run but submissions exist, **When** the analysis panel loads, **Then** computed statistics (count, date range) are still shown correctly.
4. **Given** the AI analysis ran before the computed stats feature was added, **When** the analysis panel loads, **Then** the system backfills the stats from existing submissions and displays them.

---

### Edge Cases

- What if a card's logo URL is invalid or unreachable? → Show a default icon gracefully without a broken image indicator.
- What if both AR and EN display names are empty? → Fall back to the form's internal name.
- What if the admin hides all form summary cards? → The form summaries section is not shown (no empty section placeholder).
- What if the admin hides all default status cards? → The status count row is not shown.
- What if the form has 0 submissions when the analysis panel loads? → Show "No submissions yet" correctly (not a bug when truly empty).
- What if the card manager is opened from the Submissions page while card data is still loading? → Show a loading state, not empty content.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each form summary card MUST support two independent display name fields: one for Arabic (AR) and one for English (EN).
- **FR-002**: The system MUST display the locale-appropriate display name based on the active UI language; if one locale's name is empty, it MUST fall back to the other locale's name, then to the form's internal name.
- **FR-003**: Each form summary card MUST support an optional logo/image field that is displayed as the card's icon.
- **FR-004**: When no logo is provided, the card MUST display a default icon without any broken image indicator.
- **FR-005**: The "Form Summaries" section MUST appear as the first content section on the dashboard page, immediately after the page title.
- **FR-006**: The five default status cards (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite) MUST be configurable through the card manager: visibility toggle, custom AR/EN labels, and sort order.
- **FR-007**: The card manager dialog MUST be accessible from both the Dashboard page and the Submissions page.
- **FR-008**: Changes saved from the Submissions page card manager MUST be immediately reflected when the admin visits the Dashboard.
- **FR-009**: Form summary cards MUST be visually styled to match the default status count cards (compact header with title left / icon right, bold large metric value below).
- **FR-010**: The analysis panel MUST display the correct submission count and date range for any form that has submissions, regardless of whether AI analysis has been run.
- **FR-011**: When analysis documents exist but lack computed stats (created before the stats feature), the system MUST automatically compute and display the submission count and date range from the actual submission records.
- **FR-012**: All new UI text strings MUST have AR/EN translation keys; no hardcoded display strings are permitted.
- **FR-013**: The card manager MUST display default status cards and form summary cards in a unified, sortable list.

### Key Entities

- **DashboardCard** (form summary): Extended with `displayNameAr: string | null`, `displayNameEn: string | null`, `logoUrl: string | null` fields. Existing `displayName` field is superseded by the bilingual fields.
- **DefaultStatCard**: Virtual configuration entries for the five hardcoded status cards, stored persistently so visibility/label/order preferences survive page reloads. Identified by a fixed slug (e.g. `total`, `pending`, `draft`, `viewed`, `needs_rewrite`) rather than a MongoDB `_id`.
- **FormAnalysis**: Existing entity — `submissionDateRange` and `submissionCount` must be reliably populated from real submissions when missing (backfill).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Switching the UI locale causes all form summary cards to display the correct locale-specific title within the same page session, without a page reload.
- **SC-002**: 100% of new UI text introduced by this feature has AR/EN translation keys; zero hardcoded display strings remain.
- **SC-003**: The form summaries section appears above the status count row on the dashboard for 100% of dashboard page loads.
- **SC-004**: Any form with at least 1 submission shows a non-empty, correct date range in the analysis panel — "No submissions yet" is never shown when submissions exist.
- **SC-005**: The card manager can be opened and cards can be saved from both the Dashboard and Submissions pages without navigating away.
- **SC-006**: Default status cards can be individually hidden, and hiding one does not affect the visibility of the others.
- **SC-007**: Form summary cards are visually indistinguishable in layout style from the default status count cards (same compact format).

---

## Assumptions

- The existing `DashboardCard` data model in MongoDB will be extended (additive migration — existing records keep nulls for new fields).
- The `DefaultStatCard` configuration will be stored as a new lightweight persistent collection (not in-memory) so settings survive server restarts.
- Logo URLs are entered as text (URLs); direct image upload is out of scope for this feature.
- The "Manage Cards" access point on the Submissions page is a button in the page header, not a separate page.
- The backfill for `submissionDateRange` is a read-time fix (computed on GET) that also persists to the database to avoid recomputing on every request.
- The five default status cards are always present in the card manager list; they cannot be permanently deleted, only hidden.
- Card sort order covers both default stat cards and form summary cards in a single unified sort sequence.
