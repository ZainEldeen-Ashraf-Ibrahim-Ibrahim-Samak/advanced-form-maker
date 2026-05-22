# Developer Quickstart: CMS Enhancements

This guide outlines how to interact with the newly integrated tools and APIs for environment validation, translation synchronization, and realtime settings.

## 1. Environment Variables Validation

Raw `process.env[key]` usage is now restricted. To access an environment variable safely, import it from `src/env.mjs` (or wherever the `zod` T3 env configuration is initialized).

**Correct Usage:**
```typescript
import { env } from "@/lib/env";

// Safely typed and validated at runtime!
const redisUrl = env.UPSTASH_REDIS_REST_URL; 
```

**Incorrect Usage:**
```typescript
// Do not do this anymore, it bypasses validation!
const redisUrl = process.env.UPSTASH_REDIS_REST_URL; 
```

## 2. Running Translation Tools

When you add a new string to `en.json`, you must run the sync script to enforce structural parity in `ar.json` and prevent production crashes from missing layout mappings.

```bash
# Sync structural keys from EN to AR (adds stubs like "[AR] Hello" for missing keys)
npm run i18n:sync

# Lint all files to check if there are newly unmapped or orphaned translation keys
npm run i18n:lint
```

## 3. Emitting Real-Time Notifications

If you create a new backend service that needs to notify Admins (e.g. a new form submission), use the shared Pub/Sub utility.

```typescript
import { publisher } from "@/lib/events/publisher";

await publisher.notifyAdmins({
  type: "NEW_SUBMISSION",
  submissionId: submission._id.toString(),
  clientName: submission.clientName,
  timestamp: Date.now()
});
```

The connected Front-end admin clients will automatically receive this event via the SSE endpoint over `/api/admin/events`.
