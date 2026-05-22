# Research Notes: Regex Field Validation

## 1. Centralized Regex Registry Storage
- **Decision**: Store the registry as exported TypeScript constants (e.g., `EMAIL_REGEX`, `PHONE_REGEX`, `NAME_REGEX`) in a shared `src/constants/constants.ts` file instead of MongoDB.
- **Rationale**: Based on user clarification and code snippets, hardcoding prevents ReDoS by ensuring admins cannot inject malicious regexes dynamically via the DB. It also allows synchronous client-side validation in `react-hook-form` and real-time keystroke evaluation without network latency.
- **Alternatives considered**: Storing patterns as dynamic strings in MongoDB. Rejected because it adds overhead, introduces severe ReDoS vulnerabilities if not aggressively sanitized, and delays UI feedback.

## 2. Validation Timing and UI Feedback
- **Decision**: Implement On-Keystroke validation using dedicated React wrapper components (`EmailRegix`, `PhoneRegix`, `NameRegix`).
- **Rationale**: Matches specification FR-006 and provides the requested 100ms real-time feedback with typo suggestions, auto-formatting (+20), and consistent RTL-friendly status icons.
- **Alternatives considered**: Standard "on blur" or generic error texts. Rejected because it fails to meet the specific UI requirements defined by the client's provided prototype snippets.
