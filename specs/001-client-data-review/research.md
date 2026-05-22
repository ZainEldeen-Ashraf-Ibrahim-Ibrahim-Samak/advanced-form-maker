# Research: Dynamic Client Data Collection & Admin Review

**Feature**: 001-client-data-review
**Date**: 2026-04-13
**Status**: Complete

---

## R-001: Dynamic Schema Storage Strategy

**Decision**: Key-Value Pair pattern with typed subdocuments in MongoDB

**Rationale**: The system requires admin-defined variable fields (text, number, image, date, dropdown). Rather than using `Schema.Types.Mixed` or `strict: false` (which bypass validation and make indexing difficult), the Key-Value pattern stores field values as an array of `{ fieldDefinitionId, value }` subdocuments. This allows compound indexing on `fieldDefinitionId + value`, supports querying across submissions, and maintains type safety via the linked FieldDefinition's validation rules.

**Alternatives considered**:
- `Schema.Types.Mixed`: Rejected — no automatic change detection (`markModified()` required), no validation, no indexing of internal structure.
- `strict: false`: Rejected — anti-pattern for production; removes all validation safety.
- Mongoose Discriminators: Rejected — designed for polymorphic documents with a shared base, not for user-defined key-value attributes.

---

## R-002: Clean Architecture + MVVM in Next.js App Router

**Decision**: Feature-based directory structure with domain/data/presentation layers, ViewModels as custom React hooks

**Rationale**: Next.js App Router supports colocation of route-specific code. Clean Architecture is enforced by separating `domain/` (entities, use-case interfaces, repository interfaces — zero framework imports), `data/` (Mongoose models, repository implementations, Cloudinary/Redis services), and `presentation/` (React components, ViewModels as hooks). Server Components handle initial data fetching; Client Components use ViewModel hooks for interactivity. Server Actions act as thin orchestration layers (validate with Zod → call use case → return result).

**Alternatives considered**:
- MVC pattern: Rejected — constitution mandates MVVM.
- Type-based flat structure (`/models`, `/controllers`): Rejected — feature-based grouping scales better and keeps related code colocated.

---

## R-003: Media Upload Strategy (Cloudinary)

**Decision**: Signed uploads via `next-cloudinary` with a server-side signature endpoint

**Rationale**: The constitution mandates Cloudinary for all media. While unsigned uploads are simpler, the system handles sensitive documents (ID photos). Signed uploads via a Next.js API Route (`/api/cloudinary/sign`) using `api_sign_request` ensure only authorized requests reach Cloudinary. The `next-cloudinary` package provides the `CldUploadWidget` component with `signatureEndpoint` prop for seamless integration. Upload presets enforce max file size (10 MB per constitution) and allowed formats.

**Alternatives considered**:
- Unsigned uploads: Rejected — security risk for sensitive client data; preset name visible in frontend code.
- Direct server upload (multipart): Rejected — constitution prohibits direct uploads to server filesystem; adds server load.

---

## R-004: Internationalization (Arabic + English, RTL/LTR)

**Decision**: `next-intl` with locale-based routing (`/[locale]/...`), CSS logical properties

**Rationale**: `next-intl` integrates natively with Next.js App Router and supports Server Components. The `app/[locale]/layout.tsx` sets `dir` and `lang` attributes on `<html>` based on locale. CSS logical properties (`margin-inline-start`, `padding-inline-end`) eliminate the need for separate RTL stylesheets. Translation files are JSON per locale (`/messages/en.json`, `/messages/ar.json`). Missing keys fall back to English with console warnings (per constitution).

**Alternatives considered**:
- `i18next` / `react-i18next`: Considered — constitution allows either. `next-intl` chosen for tighter App Router integration and built-in Server Component support.
- CSS `[dir="rtl"]` overrides: Rejected — brittle; logical properties handle RTL/LTR automatically.

---

## R-005: Theming (Dark / Light)

**Decision**: `next-themes` with ShadCN UI's CSS variable system

**Rationale**: ShadCN UI uses CSS variables for theming, and `next-themes` is the officially recommended companion library. The `ThemeProvider` wraps the app with `attribute="class"` to toggle the `dark` class on `<html>`. Theme preference is persisted to `localStorage` via `next-themes` (no additional storage needed). ShadCN components automatically respond to the class change. `suppressHydrationWarning` on `<html>` prevents hydration mismatches.

**Alternatives considered**:
- Custom theme context: Rejected — `next-themes` handles persistence, SSR, and flash prevention out of the box.
- Cookie-based persistence: Rejected — `localStorage` is sufficient for client-side preference; no SSR rendering differences needed.

---

## R-006: Admin Authentication

**Decision**: Auth.js (NextAuth.js v5) with MongoDB adapter, credentials provider, role-based access

**Rationale**: Auth.js v5 integrates with Next.js App Router via `auth()` helper and middleware. The `@auth/mongodb-adapter` persists sessions to the same MongoDB instance. Admin users have a `role: "admin"` field. Middleware protects `/admin/*` routes. The `session` callback injects the role into the session object. Client submissions are unauthenticated — they use unique access tokens in URLs.

**Alternatives considered**:
- Custom JWT auth: Rejected — Auth.js provides session management, CSRF protection, and adapter ecosystem out of the box.
- Clerk / Firebase Auth: Rejected — adds external dependency; constitution mandates MongoDB as sole persistent store.

---

## R-007: Caching Strategy (Upstash Redis)

**Decision**: `@upstash/redis` for caching field definitions, submission lists, and dashboard aggregations; `@upstash/ratelimit` for API rate limiting

**Rationale**: Constitution mandates Upstash Redis. Field definitions are read-heavy and change infrequently — cached with 5-minute TTL, invalidated on mutation. Submission listing pages cached with 1-minute TTL. Dashboard aggregations (counts by status) cached with 30-second TTL. Rate limiting via sliding window (60 requests per minute per IP for public endpoints, 120 for admin). Redis initialized outside request handlers for connection reuse.

**Alternatives considered**:
- In-memory caching (LRU): Rejected — constitution prohibits except for request-scoped data; doesn't work in serverless (no persistent memory).
- No caching: Rejected — constitution requires caching for read-heavy data.

---

## R-008: Unique Submission Links (Client Access)

**Decision**: UUID v4 access tokens embedded in URL path (`/submit/{token}`)

**Rationale**: Clients access forms without authentication via unique links. UUID v4 provides 122 bits of randomness (collision-resistant, unguessable). Tokens are generated server-side when an admin creates a submission link. The token maps to a submission document in MongoDB. Revisiting the link shows the current submission status. For rewrites, the same link is reused.

**Alternatives considered**:
- Short codes (e.g., 8-char alphanumeric): Rejected — lower entropy increases guessability for sensitive data.
- JWT-based links: Rejected — unnecessarily complex; tokens don't expire and are stored in DB anyway.

---

## R-009: Audit Trail Implementation

**Decision**: Embedded `AuditEntry` array within the Submission document

**Rationale**: Each status change appends an entry with `{ oldStatus, newStatus, adminId, timestamp, comment }`. Embedding (vs. separate collection) is preferred because audit entries are always read alongside their parent submission, avoiding joins. The array grows linearly with status changes (bounded by reasonable usage). Comments are required when status transitions to "Needs Rewrite" (per spec FR-017).

**Alternatives considered**:
- Separate `audit_entries` collection: Considered — provides better scalability if audit logs are queried independently. Rejected for v1 because audit is always viewed in submission context and the number of entries per submission is small.
- Event sourcing: Rejected — over-engineered for this use case.

---

## R-010: Form Builder UI (Admin)

**Decision**: ShadCN UI components with `@dnd-kit` for drag-and-drop field reordering

**Rationale**: The admin needs to create, reorder, edit, and delete fields. ShadCN provides form primitives (Input, Select, Dialog, Card). `@dnd-kit` is the standard React DnD library — lightweight, accessible, touch-friendly. Fields are displayed as sortable cards with inline editing. On save, the full field order is persisted as `sortOrder` integers.

**Alternatives considered**:
- `react-beautiful-dnd`: Rejected — unmaintained (deprecated by Atlassian).
- HTML5 Drag and Drop API: Rejected — poor mobile support, no accessibility features.
