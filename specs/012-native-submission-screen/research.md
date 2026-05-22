# Phase 0 Research: Native Submission Screen

## Decision 1: Preserve existing mobile architectural style
- Decision: Keep the current mobile-shell layered structure (app/domain/data/presentation) and use screen-local view-model classes, replacing only the scan destination from webview to native submission.
- Rationale: The existing codebase already uses this style consistently, minimizing migration risk and allowing focused feature delivery.
- Alternatives considered: Full state-management migration (Riverpod/BLoC) now; keep webview and only restyle.

## Decision 2: Use catalog-driven localization for the new flow
- Decision: Implement new native submission labels/messages using JSON catalog keys in assets i18n resources, rather than adding more inline per-screen maps.
- Rationale: Current localization is mixed; consolidating new feature text in catalogs improves maintainability and AR/EN parity.
- Alternatives considered: Continue inline maps; complete gen_l10n migration in this phase.

## Decision 3: Reuse existing backend submission contracts
- Decision: Keep GET/POST/PATCH submission token endpoints and payload envelope unchanged for mobile native flow.
- Rationale: Backend domain and repository paths are already stable and validated; preserving contract avoids duplicated logic and drift.
- Alternatives considered: New mobile-specific endpoints with duplicated business logic.

## Decision 4: Enforce validation parity with web + backend rules
- Decision: Port current client/server validation behavior one-to-one into Flutter pre-submit checks (contacts, required fields, options, regex, required media).
- Rationale: Matching established business constraints reduces preventable network failures and keeps behavior consistent across clients.
- Alternatives considered: Server-only validation; simplified mobile-only validation subset.

## Decision 5: Route accepted submit URLs to native screen with fallback
- Decision: Keep existing QR policy evaluation and route submission URLs to native screen while retaining webview fallback for non-submission safe URLs during rollout.
- Rationale: Enables low-risk rollout and limits regressions in non-submission scan use cases.
- Alternatives considered: Big-bang webview removal; dual business-rule stacks.

## Decision 6: Use secure layered persistence for token and drafts
- Decision: Store token/session secrets in platform secure storage and keep encrypted draft state in local encrypted persistence keyed from secure storage.
- Rationale: Satisfies clarified requirements for sensitive data protection, no sensitive logging, and lifecycle cleanup.
- Alternatives considered: Plain shared preferences; secure storage for entire large draft blobs only.

## Decision 7: Add optimistic stale-write protection
- Decision: Send expected version metadata with submit/resubmit and reject stale writes using conflict semantics with explicit refresh guidance.
- Rationale: Meets stale-write requirement and prevents silent overwrites when multiple clients edit concurrently.
- Alternatives considered: Last-write-wins; immediate mandatory breaking contract change.

## Decision 8: Allow offline edit continuity, block final submit offline
- Decision: Support encrypted local draft editing while offline, but block final submit/resubmit until connectivity and version checks pass.
- Rationale: Aligns with clarified behavior and reduces complexity/risk compared with queued transactional offline submission.
- Alternatives considered: Automatic queued offline submit; disabling offline editing.

## Decision 9: Keep attachment contract reference-based
- Decision: Submit payload contains media references only after upload completion; required media must be uploaded before final submit/resubmit.
- Rationale: Matches backend contract and existing media processing expectations.
- Alternatives considered: Posting raw files in submit payload; allowing final submit with pending required uploads.

## Dependencies and Best Practices
- Flutter packages to add for this feature: secure storage and encrypted local persistence, connectivity awareness, and robust HTTP client behavior.
- Keep business validation rules centralized in domain/use-case layer equivalents within mobile-shell to preserve Clean Architecture boundaries.
- Defer heavy verification (full production builds and exhaustive e2e) to final phase per constitution principle VIII.

## Open Questions Resolved
- All prior NEEDS CLARIFICATION items from technical context are resolved in this document and in the feature spec clarifications.
