# Admin Settings API Contracts

## `GET /api/admin/settings`

Retrieves the singleton backend system settings.

### Response

```json
{
  "success": true,
  "data": {
    "backup": {
      "destination": "cloud",
      "active": true,
      "lastRunAt": "2026-04-12T10:00:00Z"
    },
    "cron": {
      "activeInterval": "daily",
      "timezone": "UTC"
    }
  }
}
```

## `PATCH /api/admin/settings`

Updates the singleton backend system settings.

### Request Body

```json
{
  "backup": {
    "destination": "local",
    "active": true
  },
  "cron": {
    "activeInterval": "hourly"
  }
}
```

### Response

```json
{
  "success": true,
  "data": { ... } // Updated settings object
}
```

## `POST /api/admin/backups/trigger`

Forces a manual immediate execution of the backup routine according to the configured destination.

### Response

```json
{
  "success": true,
  "data": {
    "logId": "60d5b...123",
    "status": "success",
    "destination": "local",
    "fileReferenceUrl": "/storage/backups/db-2026-04-13.json"
  }
}
```
