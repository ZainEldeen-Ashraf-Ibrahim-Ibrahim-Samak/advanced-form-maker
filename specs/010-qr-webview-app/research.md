# Research: QR Webview Companion App

**Date**: 2026-04-15  
**Spec**: `specs/010-qr-webview-app/spec.md`

## 1) Companion App Architecture Strategy

### Decision
Implement the mobile capability as a thin companion shell adapter around the existing SCCT web/domain system, while keeping business policies and validation contracts aligned with current clean architecture boundaries.

### Rationale
- The repository already enforces layered Domain/Data/Presentation patterns and view-model mediation in critical flows.
- A thin adapter avoids duplicating business logic in a second full application.
- This keeps the existing Next.js stack as the source of truth and lowers constitution risk.

### Alternatives considered
- **Standalone React Native business app**: rejected because it duplicates domain behavior and increases drift risk.
- **Full native Kotlin/Swift implementation**: rejected because it requires parallel business logic stacks and a larger maintenance surface.

## 2) QR Capture and Validation Flow

### Decision
Use native camera scanning in the companion shell, then send decoded payloads through a shared validation policy that normalizes URLs, enforces HTTPS, and checks approved hosts before navigation.

### Rationale
- Native scanner plugins are more reliable for permissions and camera performance on mobile devices.
- Centralized URL policy validation is required by security constraints and acceptance scenarios.

### Alternatives considered
- **Web-only JS scanner inside a generic webview**: rejected due to weaker device support and permission inconsistencies.
- **Navigate first, validate later**: rejected because it can open unsafe destinations.

## 3) Destination Allowlist Policy

### Decision
Define an explicit host allowlist contract and block all scanned destinations that are non-HTTPS, malformed, or outside approved domains.

### Rationale
- The feature explicitly requires blocking unsupported or disallowed destinations.
- Allowlist contracts provide auditable behavior for security review.

### Alternatives considered
- **Allow all HTTPS links**: rejected because it does not meet disallowed-domain requirements.
- **Blocklist-only strategy**: rejected because it is harder to guarantee safety coverage.

## 4) Localization Strategy (Arabic/English)

### Decision
Reuse the existing bilingual localization model and add mobile-flow string keys with strict AR/EN parity.

### Rationale
- The project already uses structured i18n with locale routing and RTL/LTR support.
- Reusing the same localization discipline reduces translation drift.

### Alternatives considered
- **Mobile-only ad hoc translation files**: rejected because this bypasses established i18n governance.
- **English-only MVP then Arabic later**: rejected because bilingual parity is mandatory.

## 5) Branding Consistency

### Decision
Source app naming and identity from existing SCCT branding references (site-name constant and favicon-derived assets), and mirror them in launcher and splash surfaces.

### Rationale
- The spec requires launcher name, icon, and splash identity to match the website brand.
- Existing repository already has canonical naming and branding anchors.

### Alternatives considered
- **Independent mobile branding assets**: rejected because they risk visual mismatch.
- **Hardcoded mobile app name**: rejected because it introduces maintainability drift.

## 6) Environment Configuration and Startup Safety

### Decision
Adopt a typed runtime configuration contract (Zod-style schema) for mobile shell values such as base URL, allowed hosts, and splash timing; fail safely during startup when required values are invalid.

### Rationale
- The repository already validates environment variables with typed schemas.
- Startup-time validation directly satisfies safe-fail requirements.

### Alternatives considered
- **Untyped direct environment reads**: rejected because runtime failures become unpredictable.
- **Late validation after first scan**: rejected because failure should be detected before user actions.

## 7) Startup Experience and Splash Handling

### Decision
Display branded splash immediately on cold launch and transition only after config validation and initial scanner readiness checks complete.

### Rationale
- This aligns with startup success criteria and brand continuity requirements.
- Avoids exposing partially initialized UI states.

### Alternatives considered
- **Fixed-time splash only**: rejected because it may hide failures or cut off initialization.
- **No splash gating**: rejected because it weakens branding and startup quality.

## 8) Verification Strategy

### Decision
Follow fast-feedback verification first (unit/integration and focused manual flows), then defer heavy tasks (full builds and broader device checks) to the final gate.

### Rationale
- Matches constitution Principle VIII and repository workflow guidance.
- Keeps iteration speed high while preserving a final robust verification pass.

### Alternatives considered
- **Run full heavy checks after each change**: rejected due to slow feedback and lower development velocity.

## 9) Implementation Alignment Update (2026-04-15)

### Delivered stack alignment

1. Companion app scaffold was implemented as Flutter project under `mobile-shell/`.
2. Domain entities, validation policy, runtime config validation, startup coordinator, and scan/webview screens were created in Dart.
3. AR/EN mobile message catalogs were added under `mobile-shell/assets/i18n/`.
4. Android and iOS platform metadata baselines were generated with Flutter tooling.

### Verification outcomes

1. Web checks: lint completed with one warning and no errors; production build succeeded.
2. Flutter checks: `flutter analyze` and `flutter test` passed.
3. Android build smoke check is currently blocked by local NDK corruption.
4. iOS smoke build/launch is blocked on this Windows host and requires macOS + Xcode.