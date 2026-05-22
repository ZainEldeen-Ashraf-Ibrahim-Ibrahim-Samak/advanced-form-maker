# Contract: Cloudinary Signature API

Base path: `/api/cloudinary/sign`

Response envelope:
- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": string, "code"?: string, "details"?: object }`

## POST /api/cloudinary/sign
Creates signed upload parameters for direct Cloudinary upload.

Request body:
```json
{
  "timestamp": 1713197086,
  "folder": "optional/string",
  "eager": "optional/string",
  "public_id": "optional/string"
}
```

Validation rules:
- `timestamp` is required, must be a positive number.

Success 200:
```json
{
  "success": true,
  "data": {
    "signature": "string",
    "timestamp": 1713197086,
    "apiKey": "string",
    "cloudName": "string"
  }
}
```

Errors:
- 400 BAD_REQUEST when timestamp is missing/invalid.
- 500 when signature generation fails.

## Mobile upload flow contract usage
1. Client requests signature with current timestamp.
2. Client uploads media directly to Cloudinary using signed parameters.
3. Client stores upload references (`url`, `publicId`) in field-level `mediaUrl`, `mediaPublicId`, or `mediaItems`.
4. Submit/resubmit payload includes references only (no raw file bytes in submission API body).
