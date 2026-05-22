# Phase 0 Research — Native Submission Reliability Fixes

## 1. Local storage engine for drafts & queues

- **Decision**: Hive (typed boxes) for drafts, media queue, and submission queue; `shared_preferences` reserved for lightweight flags.
- **Rationale**: Typed, fast, synchronous reads suit autosave on every keystroke; supports structured objects (media items, queue entries) without manual JSON plumbing; already commonly used in the Flutter ecosystem.
- **Alternatives considered**: raw JSON in `shared_preferences` (cheap but slow for large drafts and awkward for nested media state); Isar (more powerful but heavier dependency than needed for single-form local data); SQLite via `sqflite` (overkill for document-shaped drafts).

## 2. Connectivity detection & offline submit execution

- **Decision**: Use `connectivity_plus` for state signals; run the submission queue **in-foreground** via a ViewModel-owned worker that wakes on app start and on connectivity-restored events. Background execution (workmanager) is out of scope for v1.
- **Rationale**: Foreground-only keeps behavior predictable across iOS/Android and avoids OS background-task flakiness; spec's "auto-send when connectivity returns" is satisfied on next app open or on in-session reconnect.
- **Alternatives**: `workmanager` for background retries (adds platform-specific complexity and battery concerns); polling-based connectivity (wasteful).

## 3. Client-side image compression

- **Decision**: `flutter_image_compress` with quality ramp (start 85, step down to 60) and max dimension 2560 px until output ≤ 15 MB; preserve EXIF orientation.
- **Rationale**: Meets FR-014 cap, preserves reasonable fidelity for evidence photos, avoids re-encoding videos (explicitly excluded by clarification).
- **Alternatives**: Server-side compression (violates clarified decision and wastes bandwidth); fixed quality (risks exceeding cap on large photos).

## 4. Cloudinary uploads for large videos on flaky networks

- **Decision**: Use Cloudinary's chunked upload endpoint (`X-Unique-Upload-Id` + `Content-Range`) via the existing signed-upload client, 6 MB chunks, resumable on retry within the 3-attempt budget (FR-011).
- **Rationale**: Videos up to 100 MB on 4G can fail mid-stream; chunked upload lets a retry resume from the last acked chunk rather than restarting.
- **Alternatives**: Single-shot upload (fails frequently at 100 MB on flaky links); third-party resumable protocol (TUS) — not supported by Cloudinary directly.

## 5. Form-definition contract served to both web and mobile

- **Decision**: Extend/confirm `GET /api/forms/:id/definition` to return an array of field descriptors with: `id`, `type`, `required`, `regex`, `formatterId` (enum: `phone`, `nationalId`, `date`, `numeric`, `none`), `messageKeys` (next-intl keys for label, placeholder, error-required, error-regex), `mediaLimits` (per-field override of global 15 MB image / 100 MB video caps). Web already consumes a close shape; mobile caches it locally and refreshes on connectivity.
- **Rationale**: Single canonical source (FR-006); next-intl keys let mobile resolve AR/EN messages from its local translation bundles without duplicating copy.
- **Alternatives**: Ship rules inside the app bundle (drifts on every admin change, requires release); RPC per-field at validation time (chatty, offline-hostile).

## 6. Shared validation fixture for parity tests

- **Decision**: Author a single `validation_fixture.json` under `tests/shared/validation/` with cases `{ field, input, expectedValid, expectedFormatted, expectedMessageKey }`. A Dart parity test and a TS parity test both load the file and assert identical outcomes against the same rules returned by the form-definition endpoint.
- **Rationale**: Directly satisfies SC-003 (0 divergences on ≥50 cases) and makes parity regressions impossible to merge quietly.
- **Alternatives**: Per-platform hand-maintained test lists (drift over time); property-based testing only (harder to diagnose divergences).
