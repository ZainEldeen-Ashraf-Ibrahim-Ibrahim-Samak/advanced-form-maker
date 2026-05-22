# Data Model: CMS Enhancements

## MongoDB Collections

### 1. `SettingsConfiguration`

Stores global application settings adjustable via the Admin Dashboard. Only one active configuration document should typically exist, acting as a singleton lookup.

```typescript
interface SettingsConfiguration {
  _id: ObjectId;
  environmentVersion: string;
  backup: {
    destination: "local" | "cloud" | "both";
    active: boolean;
    lastRunAt: Date | null;
  };
  cron: {
    activeInterval: "minutely" | "hourly" | "daily" | "monthly" | "none";
    timezone: string; 
  };
  updatedAt: Date;
  updatedBy: string; // Admin User ID reference
}
```

### 2. `BackupLog`

Immutable audit trail storing the history and outcome of database backup operations.

```typescript
interface BackupLog {
  _id: ObjectId;
  timestamp: Date;
  triggerType: "manual" | "cron";
  destination: "local" | "cloud" | "both";
  status: "success" | "failed";
  fileReferenceUrl?: string; // Cloudinary secure_url
  fileSizeMb?: number;
  errorMessage?: string;
}
```

### 3. `MediaAsset` (Virtual / Sync layer)

Optional caching layer tracking Cloudinary assets locally to speed up the Media Manager UI without continually hitting Cloudinary's Admin API limits. Instead of a full DB collection strictly enforcing existence, we pull metadata from Cloudinary and merge with `Submissions` and `FieldValues` to detect which assets are orphaned vs active.

Alternatively, Cloudinary Admin API is queried directly on the fly. No strictly distinct `MediaAsset` explicit Mongoose collection is needed since media URLs are embedded in `FieldValue` schemas and orphaned queries can be derived.

## Redux/Local Storage Stores

### DraftStorage (Client-Side `localStorage`)

```typescript
interface FormDraft {
  formTemplateId: string;
  lastUpdated: number; // Unix timestamp
  clientName: string;
  clientContact: string; 
  fieldValues: Array<{
    fieldDefinitionId: string;
    value: string | number | null;
    mediaUrl?: string | null;
  }>;
}
```

## Redis Caches

### SSE Publisher Channels (Upstash)

- Channel name: `admin-events`
- Message Payload:
```typescript
interface AdminEventPayload {
  type: "NEW_SUBMISSION";
  submissionId: string;
  clientName: string;
  formId: string;
  timestamp: number;
}
```
