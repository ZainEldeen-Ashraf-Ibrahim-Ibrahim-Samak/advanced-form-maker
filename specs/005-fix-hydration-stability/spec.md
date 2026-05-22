# Feature Specification: Fix Hydration & Application Stability

**Feature Branch**: `005-fix-hydration-stability`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Fix all hydration errors, submission form keeps refreshing, delete modal of submission not opening / auto-closing, and MongoDB connection keeps retrying every time"

## Clarifications

### Session 2026-04-13

- Q: When an SSE real-time status event arrives while the user is actively editing the submission form, should the system re-fetch data, show a banner, or queue the event? → A: Queue SSE events during active editing and process them only after the user submits or navigates away.
- Q: Should the fix strategy be targeted patches per bug, a structural refactor of hooks/components, or a hybrid approach? → A: Targeted patches—fix each bug individually with minimal code changes, no architectural refactoring.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stable Page Rendering Without Hydration Errors (Priority: P1)

A visitor or administrator navigates to any page of the website (public submission form, admin dashboard, submissions manager, etc.) and the page renders without any visual glitches, content flickering, or console errors related to server/client content mismatches. Interactive elements such as buttons, dropdowns, theme toggles, and language switchers function correctly on first render.

**Why this priority**: Hydration mismatches are the root cause of multiple downstream issues—broken interactivity, invisible modals, and UI elements that appear but don't respond to clicks. Fixing this resolves the largest surface area of bugs and is a prerequisite for the other stories.

**Independent Test**: Navigate to the admin dashboard, submission form, and public pages. Confirm the browser console shows zero hydration-related warnings or errors, and all interactive elements (dropdowns, toggles, modals) respond correctly on first click.

**Acceptance Scenarios**:

1. **Given** a user visits any page on the site, **When** the page completes loading, **Then** there are zero hydration mismatch warnings in the browser console and all interactive UI elements are fully functional.
2. **Given** a user toggles the theme or language switcher, **When** they interact with the dropdown, **Then** it opens, displays options, and applies the selection without requiring a page refresh.
3. **Given** an administrator opens the admin dashboard, **When** the page loads, **Then** all stat cards, tables, filters, and action buttons render correctly and are interactive on first load.

---

### User Story 2 - Submission Form Does Not Auto-Refresh (Priority: P1)

A client user opens a submission form via a shared link. They fill in their name, contact information, and dynamic form fields. The form remains stable throughout the entire data-entry process—no unexpected page reloads, no loss of typed data, and no re-fetching of form content while the user is actively editing. After submitting, the user is redirected to a confirmation view without a full page reload.

**Why this priority**: The form is the core user-facing feature. If it keeps refreshing, users lose their input, cannot complete submissions, and the business cannot collect data—making the entire application unusable for its primary purpose.

**Independent Test**: Open a new submission link, begin filling out fields, wait 60 seconds while editing, and confirm the page never reloads or re-fetches while the user is actively working. Submit the form and confirm smooth redirect to the confirmation view.

**Acceptance Scenarios**:

1. **Given** a client opens a submission form link and begins typing, **When** they spend several minutes filling out the form, **Then** the page does not reload or re-fetch data while they are actively entering information.
2. **Given** a client completes the form and clicks submit, **When** the submission succeeds, **Then** the user is navigated to the confirmation view without a full-page reload that clears the UI.
3. **Given** a client is editing a previously returned ("needs rewrite") submission, **When** they resubmit the form, **Then** the page transitions to the updated view without a disruptive full-page refresh.

---

### User Story 3 - Delete Confirmation Dialog Opens and Functions Correctly (Priority: P2)

An administrator views the submissions table (on the dashboard or submissions page). They click the action menu on a submission row and select the "Delete" option. A confirmation dialog appears asking them to confirm the deletion. The dialog remains open until the administrator either confirms (triggering the delete) or cancels (closing the dialog without action).

**Why this priority**: Without a working delete workflow, administrators cannot manage submissions. However, this is secondary to the rendering and form stability issues because it only affects the admin experience, not the primary data-collection flow.

**Independent Test**: Log in as administrator, navigate to the submissions list, click the three-dot menu on any submission, click "Delete", and confirm the confirmation dialog opens, remains visible, and both the Cancel and Confirm buttons function as expected.

**Acceptance Scenarios**:

1. **Given** an administrator clicks "Delete" from a submission's action menu, **When** the delete option is selected, **Then** a confirmation dialog appears and stays open until the user interacts with it.
2. **Given** the confirmation dialog is open, **When** the administrator clicks "Cancel", **Then** the dialog closes and no deletion occurs.
3. **Given** the confirmation dialog is open, **When** the administrator clicks "Confirm", **Then** the submission is deleted, a success notification is shown, and the submissions list refreshes.

---

### User Story 4 - Database Connection Is Efficient and Does Not Retry Unnecessarily (Priority: P2)

The application connects to the database once during startup (or on the first request in a serverless function invocation) and reuses that connection for all subsequent operations within the same process lifecycle. The server logs do not show repeated connection attempts, and API responses are returned promptly without delay from redundant connection handshakes. If a connection fails, the system retries with sensible limits and back-off rather than retrying indefinitely.

**Why this priority**: Excessive database reconnections degrade API response times, increase server load, and can exhaust database connection limits. However, the user-facing symptoms (slow responses) are less visible than broken UI, so this is a supporting fix.

**Independent Test**: Start the application, make 10 sequential API calls, and confirm the server logs show only one initial database connection establishment (not one per request). Monitor the database connection count and confirm it stays within the configured pool size.

**Acceptance Scenarios**:

1. **Given** the application starts and a user makes their first API request, **When** the database connection is established, **Then** subsequent requests within the same process reuse the existing connection without re-establishing it.
2. **Given** the database is temporarily unreachable, **When** a connection attempt fails, **Then** the system retries with a maximum retry limit and exponential back-off, and logs a warning rather than retrying indefinitely.
3. **Given** the application is running in development, **When** hot-reloads occur, **Then** the system correctly reuses cached connections and does not create new connections per reload.

---

### Edge Cases

- What happens when the draft auto-save triggers a state update while the user is mid-keystroke? The form must not re-render in a way that causes cursor position loss or visual flickering.
- How does the system behave when the SSE (Server-Sent Events) connection for real-time updates drops and reconnects? SSE events received during active editing must be silently queued and only processed after the user submits or navigates away—reconnection itself must not trigger a data re-fetch.
- What happens when the delete confirmation dialog is nested inside a dropdown menu? The dialog must function independently of the dropdown's open/close state.
- What happens when multiple browser tabs are open with the same form? Each tab must maintain its own draft state without conflicting.
- What happens when the database connection pool is exhausted? The system must queue or gracefully reject requests with a user-friendly error, not crash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render all pages without server/client content mismatches (hydration errors).
- **FR-002**: All interactive elements (buttons, dropdowns, modals, toggles) MUST be functional on first render without requiring additional user interactions to "activate" them.
- **FR-003**: The client submission form MUST NOT reload or re-fetch data while the user is actively editing, unless the user explicitly refreshes the page.
- **FR-004**: The submission form's data-fetching logic MUST execute only once on initial load, and MUST NOT re-trigger due to internal state changes (such as draft auto-save updates).
- **FR-005**: After form submission, the system MUST navigate the user to the confirmation view without a full-page reload (use client-side navigation).
- **FR-006**: After form resubmission (for "needs rewrite" or "draft" status), the system MUST update the view without a full-page reload.
- **FR-007**: The delete confirmation dialog in the submissions table MUST open when triggered and remain open until the user explicitly confirms or cancels.
- **FR-008**: The delete confirmation dialog MUST function correctly when nested inside a dropdown action menu—the dropdown closing must not also close the dialog.
- **FR-009**: The database connection MUST be established once and reused across subsequent requests within the same process lifecycle.
- **FR-010**: The database connection logic MUST include a maximum retry limit (configurable, default 3 attempts) with back-off to prevent infinite reconnection loops.
- **FR-011**: The system MUST log a warning when a database connection attempt fails, including the attempt number and next retry delay.
- **FR-012**: The system MUST suppress hydration warnings only on elements where server/client divergence is expected (e.g., theme-dependent attributes), and MUST NOT use `suppressHydrationWarning` as a blanket fix across all components.
- **FR-013**: While the user is actively editing the submission form, incoming SSE status-change events MUST be silently queued and only processed (triggering a data refresh) after the user submits the form or navigates away from the page.

### Key Entities

- **Submission**: The primary data object created by clients. States: draft, pending, viewed, needs_rewrite. Contains client info and form field values.
- **Draft State**: Client-side auto-saved form progress, keyed by submission token. Must not trigger re-renders that cascade into data re-fetching.
- **Database Connection Pool**: Shared pool of reusable connections. Must maintain minimum/maximum pool sizes and handle connection lifecycle properly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero hydration mismatch warnings appear in the browser console on any page load across the entire application.
- **SC-002**: The client submission form maintains user input without any page reloads or data re-fetches for at least 10 minutes of continuous editing.
- **SC-003**: The delete confirmation dialog opens and remains visible in 100% of attempts across all browsers.
- **SC-004**: 95% reduction in database connection establishment events during a session of 50 sequential API calls (from ~50 connections down to 1–2).
- **SC-005**: All interactive elements on the admin dashboard respond to user interaction on first click within 200ms of page load completion.
- **SC-006**: Form submission and resubmission complete with a smooth client-side transition (no visible full-page reload).

## Assumptions

- The application uses a server-side rendering framework with client-side hydration (SSR + CSR pattern).
- The current hydration issues are caused by server/client content divergence (e.g., theme-dependent classes, locale-dependent rendering, client-only state like drafts).
- The submission form refresh issue is caused by unstable dependency arrays in data-fetching hooks that re-trigger on every render cycle.
- The delete modal issue is caused by the confirmation dialog being nested inside a dropdown menu, where the dropdown's close behavior propagates to the dialog.
- The MongoDB connection retry issue is caused by the connection function being called per-request without properly checking the cached connection state, or by the connection cache being invalidated during development hot-reloads.
- The existing authentication and authorization patterns will remain unchanged.
- All fixes must be backward-compatible with the current bilingual (AR/EN) and RTL/LTR layout system.
- The fix strategy is targeted, minimal patches per bug—no architectural refactoring or hook redesign. Each fix should be isolated and independently verifiable.
