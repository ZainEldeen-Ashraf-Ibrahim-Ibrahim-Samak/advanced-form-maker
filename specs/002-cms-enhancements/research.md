# Research & Architecture Decisions: CMS Enhancements

## 1. Centralized Environment Validation
- **Decision**: Use `zod` combined with `t3-env` pattern.
- **Rationale**: Next.js lacks robust built-in runtime env validation at startup. The T3 `env.mjs` pattern leveraging `zod` forces type constraints and throws immediately if required keys (for DB, Auth, Cloudinary, Redis) are missing.
- **Alternatives considered**: Raw `process.env` (error-prone), `joi` (older, heavier).

## 2. Localization Sync & Linter
- **Decision**: Create custom Node.js utility scripts directly manipulating `en.json` and `ar.json`.
- **Rationale**: `next-intl` uses flat or nested JSON. A script reading the structure of `en.json` and deep-merging/diffing it with `ar.json` can effortlessly stub missing keys using a placeholder (e.g., `[AR] original text`). Linter script checks key parity.
- **Alternatives considered**: 3rd-party i18n SaaS (too complex, costs money).

## 3. Client Draft Auto-save Recovery
- **Decision**: Implement `localStorage` hooking into the `useSubmissionForm` ViewModel.
- **Rationale**: High resilience. Bypasses the need for server round-trips for incomplete drafts. The ViewModel will debounce saving the form state to local browser storage, and clear it upon successful submission array completion.
- **Alternatives considered**: Upstash Redis draft cache per session token (heavier, requires network). LocalStorage is faster and zero cost.

## 4. Admin Settings & Automated CRON Scheduling
- **Decision**: Store cron configurations in a `SettingsConfiguration` MongoDB collection. Use Upstash QStash, or Vercel Cron with a secure API route evaluating the active `SettingsConfiguration` to determine if a run is permitted.
- **Rationale**: Since the required frequency must be dynamically togglable by Admins between Minutely/Hourly/Daily/Monthly, a standard static Vercel cron configuration is insufficient on its own. Instead, a static upstream cron trigger (e.g. hourly, or minutely) evaluates custom dynamic configs from MongoDB, executing logic only if the interval matches the stored setting.
- **Alternatives considered**: `node-cron` daemon (fails on serverless/Vercel). Upstash QStash scheduling via API mapping (more complex but precise, though checking conditions via standard trigger is safer).  

## 5. Database Cloudinary Backup 
- **Decision**: Implement a Node.js utility that exports the MongoDB database collections as JSON/BSON asynchronously, converts to buffer, and uploads securely to Cloudinary (raw resource type).
- **Rationale**: Meets constitution mandate IV (Media Management via Cloudinary). Cloudinary supports raw file uploads, making it a viable and already-configured destination for secure data archives. Backups can then be managed natively via Cloudinary or the new Media Manager UI.
- **Alternatives considered**: AWS S3 (introduces new dependency violating strict stack limitations).

## 6. Real-time WebSocket Notifications
- **Decision**: Leverage Upstash Redis Pub/Sub combined with Server-Sent Events (SSE) or Next.js API polling if SSE is blocked by infrastructure constraints.
- **Rationale**: Matches mandate VI (Caching & Performance via Upstash Redis). No need to configure a separate heavy Socket.io or Pusher server. The client ViewModel subscribes to a `/api/admin/events` route streaming mapped SSEs originated from Redis PubSub channels.
- **Alternatives considered**: `Pusher` or `Socket.io` (adds new unneeded third-party latency and dependency overhead).
