# API Contract: Cloudinary Signing & Auth

---

## POST /api/cloudinary/sign

Generate a Cloudinary upload signature for signed uploads.

**Auth**: None (public — called by CldUploadWidget on client forms)
**Rate Limit**: 60 req/min per IP

**Request Body** (sent by `next-cloudinary` widget automatically):
```json
{
  "timestamp": "number (Unix timestamp)",
  "folder": "string",
  "eager": "string (optional, transformations)",
  "public_id": "string (optional)"
}
```

**Response 200**:
```json
{
  "signature": "string (HMAC-SHA1 hash)",
  "timestamp": "number",
  "cloudname": "string",
  "apikey": "string"
}
```

**Note**: The server uses `CLOUDINARY_API_SECRET` (env variable, never exposed to client) to generate the signature via `cloudinary.utils.api_sign_request()`. The upload preset enforces max file size (10 MB) and allowed file types.

---

## POST /api/auth/[...nextauth]

Auth.js (NextAuth v5) authentication endpoints.

**Auth**: Varies by action

Handles:
- `POST /api/auth/signin` — Admin login
- `POST /api/auth/signout` — Admin logout
- `GET /api/auth/session` — Get current session
- `POST /api/auth/csrf` — CSRF token

**Providers**: Credentials (email/password for v1)

**Session Strategy**: Database sessions (MongoDB via `@auth/mongodb-adapter`)

---

## GET /api/admin/preferences

Get current admin's language and theme preferences.

**Auth**: Required (Admin role)

**Response 200**:
```json
{
  "success": true,
  "data": {
    "languagePreference": "en | ar",
    "themePreference": "light | dark"
  }
}
```

---

## PATCH /api/admin/preferences

Update admin's language and/or theme preferences.

**Auth**: Required (Admin role)

**Request Body** (partial):
```json
{
  "languagePreference": "en | ar (optional)",
  "themePreference": "light | dark (optional)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "languagePreference": "string",
    "themePreference": "string"
  }
}
```
