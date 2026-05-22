# Implementation Tasks: Fix Empty Form Payload

**Branch**: `006-fix-empty-form-payload`

## Phase 1: Foundational 
This phase handles the synchronization race conditions inside the frontend submission hook and solidifies backend validation boundaries.

### [US1] Scenario: Form Sync Completion
**Goal**: Guarantee form submissions accurately map the active React state values regardless of async cache wipes.
**Test Criteria**: Empty payloads must throw server-side validation error `SUBMISSION_INVALID`. Populated payloads must persist accurate counts.

- [x] T001 [US1] Update `submitForm` hook execution to map payload payload identically to the immediate values instead of exclusively off draftRef snapshot in `src/presentation/view-models/use-submission.ts`
- [x] T002 [US1] Secure validation rejection blocks by validating explicit length dependencies on collection extraction in `src/domain/use-cases/client/submit-form.ts`
- [x] T003 [US1] Protect state hydration sequence ordering during background submission refreshes in `src/presentation/view-models/use-submission.ts`

## Dependencies
- Phase 1 tasks execute linearly but target separate files. `T001` and `T003` tackle the frontend race trace, while `T002` secures the backend validation layer.

## Implementation Strategy
- **Frontend Race Repair**: Hard-sync payload array assembly to bypass side-effect loops.
- **Backend Refusal**: Manually enforce field collection length verification independently from dynamically loaded schema constraints to reject silent success operations natively.
