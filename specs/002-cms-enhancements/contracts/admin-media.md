# Realtime & Media Admin API Contracts

## `GET /api/admin/events`

A Server-Sent Events (SSE) endpoint that streams new updates continuously to active administration sessions.

### Output Stream Payload

```json
event: message
data: {"type": "NEW_SUBMISSION", "submissionId": "...", "clientName": "John Doe", "timestamp": 1713000000}
```

## `GET /api/admin/media`

Retrieves folders, files, and asset lists directly mirrored from Cloudinary.

### Query Params
- `cursor` (string, optional)
- `type` (image/video/raw, optional)

### Response

```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "public_id": "submissions/image_xyz123",
        "format": "jpg",
        "size_bytes": 45000,
        "secure_url": "https://res.cloudinary.com/...",
        "created_at": "2026-04-12T10:00:00.000Z"
      }
    ],
    "nextCursor": "abcd1234abcd1234"
  }
}
```

## `DELETE /api/admin/media/[publicId]`

Deletes an asset from Cloudinary definitively.

### Response

```json
{
  "success": true,
  "message": "Asset deleted"
}
```
