# Research: Fix Submission Form Sync

**Date**: 2026-04-14  
**Spec**: `specs/007-fix-submission-form-sync/spec.md`

## 1) Contact Records: Add/Edit/Delete with Minimum One

### Decision
Represent contact records as a repeatable collection in the submission draft state and enforce a hard minimum count of one record in both UI interactions and server-side validation before persistence.

### Rationale
- UI-only enforcement is insufficient; requests can still be malformed.
- Existing architecture already validates payloads with Zod and domain use-cases, so dual-layer enforcement fits current patterns.
- Prevents accidental empty-contact submissions while preserving edit/add/delete flexibility.

### Alternatives considered
- **UI-only guard**: rejected because direct API calls could bypass rules.
- **Server-only guard**: rejected because UX becomes frustrating when users can remove everything then fail at submit time.

## 1.5) Contact Record File Uploads

### Decision
Extend the `ContactRecord` schema to include an optional generic file attachment (similar to the form manager's file fields). Store these files via Cloudinary and persist the `mediaUrl` and `mediaPublicId` in the `ContactRecord`.

### Rationale
- Requested in clarification.
- Reusing the existing Cloudinary upload pattern ensures consistency with the constitution's media management instructions.

### Alternatives considered
- **Global file section**: rejected by the user in favor of inline per-record attachments.

## 2) Resubmission Notification Reliability and Visibility

### Decision
Persist user-targeted resubmission notifications in a durable store with explicit delivery/read state, and keep undelivered notifications available for 7 days for offline users. Preserve admin visibility of request status on later review.

### Rationale
- Current event stream behavior is ephemeral (short-lived Redis list + TTL) and can miss user-facing state.
- Durable request state is required by the feature and aligns with existing submission audit expectations.
- Seven-day retention is already clarified in spec and is operationally practical.

### Alternatives considered
- **SSE-only transient events**: rejected because offline users can miss events.
- **Long-lived Redis-only retention**: rejected because visibility and lifecycle queries are better served by durable submission-linked records.

## 3) Token Refresh after Admin Form Rearrangement

### Decision
On token-page refresh, always load latest published form structure, then perform field-level reconciliation: carry forward unsaved values only for still-matching field identifiers; mark incompatible or removed values as dropped and show a non-blocking warning.

### Rationale
- This is exactly aligned with the accepted clarification and avoids forcing full re-entry.
- Identifier-based reconciliation is deterministic and testable.
- Keeps users on current form shape while minimizing data loss.

### Alternatives considered
- **Discard all draft values**: rejected due to poor UX.
- **Keep stale structure until submit**: rejected because it violates latest-form consistency requirement.

## 4) Multi-Select Sector Field Semantics

### Decision
Support multi-select sector values as an ordered array of selected option values for dropdown-type fields configured as multiple.

### Rationale
- Existing field-definition model already includes `isMultiple`; extending dropdown handling to arrays is consistent with current domain concepts.
- Array representation works naturally for validation, persistence, and rendering in admin/user views.

### Alternatives considered
- **Comma-separated string storage**: rejected due to parsing ambiguity and localization risks.
- **Separate per-option records**: rejected as unnecessary complexity for current scope.

## 5) Reusable Site Name Standardization

### Decision
Introduce a shared site-name element with canonical value `SCCT` and use it in all title/header/logo contexts that currently hardcode site name text.

### Rationale
- Eliminates duplicate literals across metadata and UI components.
- Improves consistency and reduces drift in future edits.
- Fits existing shared-component usage patterns (e.g., logo component).

### Alternatives considered
- **Keep hardcoded strings per page**: rejected due to maintainability issues.
- **Environment-variable-only name source**: rejected for unnecessary runtime config complexity for a fixed brand value.

## 6) Contract Surface and Backward Compatibility

### Decision
Preserve existing submission/admin endpoint paths and evolve payload contracts in a backward-compatible way where possible; add explicit validation errors for incompatible shapes.

### Rationale
- Minimizes integration risk with existing front-end and scripts.
- Maintains predictable behavior while improving correctness.

### Alternatives considered
- **Create new versioned endpoints**: rejected as high overhead for a targeted fix.

## 7) Testing and Verification Strategy

### Decision
Use lightweight unit/integration verification during implementation and defer heavy build/e2e to the final verification gate, per constitution principle VIII.

### Rationale
- Speeds iteration and aligns with mandated development workflow.

### Alternatives considered
- **Run full build/e2e after each change**: rejected for slow feedback and violation of staged heavy-processing guidance.
