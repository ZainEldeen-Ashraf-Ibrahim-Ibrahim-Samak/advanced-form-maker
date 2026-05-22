# Data Model: Production Configuration

This feature focusing on configuration and logging rather than persistent entities.

## Environment Configuration (`env.mjs`)

| Key | Type | Requirement | Description |
|-----|------|-------------|-------------|
| `CRON_SECRET` | string | REQUIRED | Secret token to authenticate Vercel Cron requests |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | string | REQUIRED | Unsigned/Signed upload preset name for Cloudinary |

## Log Structure (`devlogger`)

Internal in-memory structure (singleton):

```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
  timestamp: Date;
}
```
