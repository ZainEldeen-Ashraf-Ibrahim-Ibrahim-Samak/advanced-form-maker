# Phase 1: API Contracts

**Feature**: System Data Management (`011-system-data-management`)

## System Endpoints

### 1. Backup Artifact Download
`GET /api/admin/system/backup`

- **Authorization**: Admin Only
- **Response Format**: `application/json` (Attachment / Download)
- **Response**:
```json
{
  "timestamp": "2026-04-15T12:00:00Z",
  "version": "1.0.0",
  "models": { ... }
}
```

### 2. Backup Artifact Upload & Restore
`POST /api/admin/system/restore`

- **Authorization**: Admin Only
- **Content-Type**: `multipart/form-data`
- **Payload**:
  - `backup_file`: The JSON file previously downloaded.
- **Response Format**: `application/json`
- **Response**:
```json
{
  "success": true,
  "message": "System successfully restored to backup point.",
  "models_restored": 12,
  "records_affected": 15000
}
```

### 3. Cloudinary Analytics Widget Data
`GET /api/admin/analytics/cloudinary-usage`

- **Authorization**: Admin Only
- **Response Format**: `application/json`
- **Response**:
```json
{
  "success": true,
  "usage": {
    "storage": {
      "usage": 5000000000,
      "limit": 10000000000,
      "used_percent": 50.0
    }
  },
  "cached_at": "2026-04-15T12:00:00Z"
}
```

### 4. Data Export with Transaction Keys
`GET /api/admin/system/export?model=drafts`

- **Authorization**: Admin Only
- **Response Format**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX Download)
- **Behavior**: Flattens translation keys (e.g. `title.en`, `title.ar`) and handles nested Map structures cleanly before returning the workbook buffer.

### 5. Scheduled System Cleanup Trigger
`POST /api/cron/system-cleanup`

- **Authorization**: Cron Secret Bearer Token
- **Content-Type**: `application/json`
- **Response Format**: `application/json`
- **Response**:
```json
{
  "success": true,
  "drafts_deleted": 42,
  "cloudinary_usage_checked": true,
  "cloudinary_threshold_exceeded": true,
  "cloudinary_media_deleted": 15
}
```
