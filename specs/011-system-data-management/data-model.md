# Phase 1: Data Model

**Feature**: System Data Management (`011-system-data-management`)

## Entities

### 1. Settings (Update)
The global system configuration model will be extended to include these auto-deletion and storage limits.

**Fields**:
- `draft_retention_days` (Number, optional/nullable): Number of days before a draft is automatically deleted. If `0`, `null`, or undefined, auto-deletion is entirely disabled.
- `cloudinary_storage_threshold` (Number, optional/nullable): Maximum media storage allowed (in percentage, e.g. `90` for 90%).
- `storage_cleanup_target` (String Enum, optional/nullable): Defines what should be deleted if the threshold is exceeded (e.g., `"drafts"`, `"unused_media"`).

**Validation Rules**:
- `cloudinary_storage_threshold` must be between 1 and 100 (if provided).
- `draft_retention_days` must be >= 0 (if provided).

### 2. Backup (Artifact)
A serialized representation of all MongoDB models generated on demand.

**Structure**:
```json
{
  "timestamp": "2026-04-15T12:00:00Z",
  "version": "1.0.0",
  "models": {
    "users": [ { "_id": "...", "email": "..." } ],
    "settings": [ { "_id": "...", "draft_retention_days": 30 } ],
    "drafts": [ { "_id": "..." } ]
  }
}
```

### 3. Draft (Existing Entity Concept)
Any system draft needs a timestamp to track its age.

**Fields required for logic**:
- `updatedAt` or `last_modified` (Date): The timestamp compared against the `draft_retention_days` threshold.

## Relationships & Lifecycle

### Storage Limits & Cleanup Lifecycle
1. Scheduled cron job hits `/api/cron/system-cleanup`.
2. Reads `Settings` model.
3. Checks Cloudinary via `cloudinary.v2.api.usage()`.
4. If usage > `cloudinary_storage_threshold`:
   a. Identify target entities based on `storage_cleanup_target`.
   b. Batch delete Cloudinary public IDs associated with the target without deleting the MongoDB records themselves (to avoid breaking constraints, but links will break).
5. Separately checks drafts. If `draft_retention_days > 0`, it batch-deletes drafts older than `Date.now() - (retention_days * 24h)`.
