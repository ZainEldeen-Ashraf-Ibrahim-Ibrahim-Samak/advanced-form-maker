# Implementation Plan: QR Webview Companion App

**Branch**: `main` | **Date**: 2026-04-15 | **Spec**: [specs/010-qr-webview-app/spec.md](spec.md)
**Input**: Feature specification from `/specs/010-qr-webview-app/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deliver a bilingual QR-first companion mobile experience that scans website QR codes, validates destinations against approved SCCT domains, and opens accepted links inside an in-app web view while preserving SCCT branding (name, icon, splash). The implementation keeps business policy logic in clean architecture layers and uses a thin mobile shell adapter so the existing Next.js and domain stack remains the source of truth.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js LTS tooling; Next.js 16.2.3 web core  
**Primary Dependencies**: Next.js (App Router), next-intl, Zod + @t3-oss/env-nextjs, qrcode.react (existing QR generation), companion mobile shell adapter (Capacitor class of runtime)  
**Storage**: Existing MongoDB, Upstash Redis, and Cloudinary remain unchanged; mobile flow adds no new persistence requirement  
**Testing**: Jest + Testing Library for unit/integration logic, lightweight manual device scenarios during implementation, heavy build/device checks in final gate  
**Target Platform**: Android and iOS companion shell, plus existing SCCT web backend/frontend
**Project Type**: Full-stack Next.js web application with companion mobile adapter module  
**Performance Goals**: >=95% valid scans open destination in <=5 seconds; >=95% cold starts reach interactive scan state in <=3 seconds on supported devices  
**Constraints**: HTTPS-only navigation, strict host allowlist, Arabic/English parity, shared SCCT name/icon branding, startup config validation, clean architecture boundaries  
**Scale/Scope**: One scanner-to-webview journey, bilingual system strings, startup splash/config checks, and policy contracts for allowed destination domains

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Clean Architecture (MVVM) compliance?
- [x] II. Technology Stack Mandate followed?
- [x] V. Internationalization (AR/EN) & RTL support planned?
- [x] VIII. Heavy processes (build, e2e, migrations) deferred to the final phase?

## Project Structure

### Documentation (this feature)

```text
specs/010-qr-webview-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── qr-navigation-policy.md
│   └── mobile-runtime-config.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [locale]/
│   └── api/
├── components/
│   └── shared/
├── data/
│   ├── models/
│   ├── repositories/
│   └── services/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── use-cases/
├── i18n/
├── lib/
└── presentation/
    ├── components/
    └── view-models/

tests/
├── e2e/
├── integration/
└── unit/

mobile-shell/               # Planned companion adapter module
├── android/                # Planned platform project
├── ios/                    # Planned platform project
└── src/                    # Planned MVVM shell modules
```

**Structure Decision**: Keep the current SCCT repository as the canonical web/domain implementation and add a thin companion mobile shell adapter for scan and in-app webview capabilities. Shared business rules (URL policy, config validation, localized messaging contracts) remain defined at the domain/documentation level to avoid duplicate logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Post-Design Constitution Re-Check

- [x] I. Clean Architecture (MVVM): Domain policy and ViewModel-driven flow are explicitly modeled.
- [x] II. Technology Stack Mandate: Existing Next.js/node stack remains authoritative; mobile runtime is an adapter layer.
- [x] V. Internationalization: AR/EN string parity and locale-safe UX are part of design contracts.
- [x] VIII. Heavy Processing: Full builds and device-heavy checks are deferred to the final verification stage.
