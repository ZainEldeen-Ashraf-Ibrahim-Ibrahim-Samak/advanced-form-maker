# Feature Specification: Localization, RTL, and Share UX Consistency

**Feature Branch**: `004-fix-i18n-rtl-share`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "now enure all web site have trnation keys ar , en and not hard coded , then make all web site has adptive disgn for all devices and mobiles , 3 make rtl systme works well and in qr system although model althouhg beuse the share button is not dir well is behind close button and in front end merge the share button with isExplicitForm reomve this fueatre and make the share button give the form with the token and update the ar , en system and every thing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Translation Coverage (Priority: P1)

As a bilingual user, I can use the full website in Arabic and English without seeing hard-coded text so that every screen is understandable in my selected language.

**Why this priority**: Missing translations and hard-coded content create immediate usability issues and break trust for bilingual audiences.

**Independent Test**: Switch between Arabic and English and navigate all user-facing pages; no visible hard-coded strings appear, and all labels/messages are localized.

**Acceptance Scenarios**:

1. **Given** I am browsing in Arabic, **When** I open any form, modal, table, and action menu, **Then** all visible text is shown in Arabic from translation keys.
2. **Given** I am browsing in English, **When** I perform the same flows, **Then** all visible text is shown in English from translation keys.
3. **Given** a new UI string is introduced, **When** localization checks run, **Then** missing translation keys are identified before release.

---

### User Story 2 - Responsive Experience Across Devices (Priority: P1)

As a user on mobile, tablet, or desktop, I can complete all core tasks with a clear and usable layout so that device size does not block task completion.

**Why this priority**: Non-adaptive layouts directly prevent form completion and admin workflows on smaller screens.

**Independent Test**: Validate key pages across common viewport sizes (mobile, tablet, desktop) and confirm no clipping, overlap, hidden controls, or blocked actions.

**Acceptance Scenarios**:

1. **Given** I open the site on a mobile viewport, **When** I navigate core flows, **Then** controls remain accessible and content is not cut off.
2. **Given** I open the site on a tablet viewport, **When** I open modals and action panels, **Then** buttons and text remain visible and interactive.
3. **Given** I open the site on desktop, **When** I resize the browser, **Then** layout adjusts without breaking alignment or interaction.

---

### User Story 3 - Reliable RTL Behavior and Modal Actions (Priority: P1)

As an Arabic user, I can use RTL interfaces where control placement and action buttons behave correctly, including QR-related modals.

**Why this priority**: Incorrect RTL behavior and overlapping controls can make critical actions inaccessible.

**Independent Test**: In Arabic locale, open affected QR/share modal flows and confirm visual direction, button placement, layering, and interactions are correct.

**Acceptance Scenarios**:

1. **Given** I use Arabic locale, **When** I open the QR/share modal, **Then** action controls are placed correctly for RTL and no control is hidden behind another.
2. **Given** modal header controls are shown, **When** I view the share and close actions, **Then** both remain visible, non-overlapping, and clickable.
3. **Given** I switch between English and Arabic, **When** I reopen the modal, **Then** directionality and spacing update correctly each time.

---

### User Story 4 - Unified Share Flow with Tokenized Form Link (Priority: P1)

As an admin user, I can share a form using one clear share action that always generates the correct tokenized link, without depending on the `isExplicitForm` toggle.

**Why this priority**: Multiple conflicting share controls and obsolete flags create confusion and incorrect links.

**Independent Test**: Use the share action from the admin flow and verify the copied/shared URL includes the expected form token and opens the intended form.

**Acceptance Scenarios**:

1. **Given** I am viewing a form in admin, **When** I tap the share button, **Then** a valid shareable URL with the form token is generated.
2. **Given** legacy `isExplicitForm` behavior existed, **When** I use sharing after this change, **Then** sharing works without that feature flag.
3. **Given** I paste the shared link into a new session, **When** it opens, **Then** the correct form is loaded and ready for submission.

---

### Edge Cases

- What happens when a translation key is missing in one locale while present in the other?
- How does the system handle very long translated labels that may wrap in narrow mobile layouts?
- What happens if a share token is invalid, expired, or malformed when opening a shared form link?
- How does the UI behave in RTL when browser zoom or font scaling is increased?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST ensure all user-facing text is sourced from localization keys for both Arabic and English.
- **FR-002**: The system MUST prevent release of pages that contain newly introduced hard-coded user-facing strings.
- **FR-003**: The system MUST provide adaptive layouts for mobile, tablet, and desktop across core user and admin workflows.
- **FR-004**: The system MUST ensure RTL directionality is applied consistently in Arabic, including layout alignment, spacing, and action control ordering.
- **FR-005**: The system MUST ensure QR-related modal actions remain visible, non-overlapping, and fully interactive in both locales.
- **FR-006**: The system MUST replace split or duplicate share behaviors with a single share action in the relevant frontend flow.
- **FR-007**: The system MUST remove dependency on `isExplicitForm` for sharing behavior.
- **FR-008**: The system MUST generate a shareable form URL that includes the correct token required to open the intended form.
- **FR-009**: The system MUST present localized feedback messages for successful share, failed share, and invalid token link scenarios.
- **FR-010**: The system MUST preserve existing authorized access boundaries when tokenized form links are used.

### Key Entities *(include if feature involves data)*

- **Localized UI Content**: All user-visible labels, buttons, alerts, headings, modal text, and helper text keyed by locale.
- **Share Token Link**: A form-specific URL artifact containing tokenized identifiers needed to route to the correct form.
- **Share Action State**: Runtime UI state controlling button visibility, placement, modal layering, and success/error messaging.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audited user-facing pages show no hard-coded visible text in Arabic or English during acceptance review.
- **SC-002**: At least 95% of critical user/admin tasks complete successfully on mobile, tablet, and desktop during UAT without layout-related blockers.
- **SC-003**: 100% of tested RTL modal/share flows pass visual and interaction checks with no overlapping or hidden action controls.
- **SC-004**: 100% of generated share links from the unified share action open the intended tokenized form in validation testing.
- **SC-005**: User-reported share-link and RTL-action placement issues for these flows are reduced to zero in the first release acceptance window.

## Assumptions

- Arabic and English remain the only required locales for this feature scope.
- Existing form-token validation rules continue to be the source of truth for token acceptance and rejection.
- The primary scope includes all current user-facing and admin-facing pages that are part of active workflows.
- Existing permissions and access controls remain in effect; this feature does not redefine authorization policy.
