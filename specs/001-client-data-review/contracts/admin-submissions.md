# API Contract: Admin — Submissions & Review

**Base Path**: `/api/admin/submissions`
**Auth**: Required (Admin role)
**Rate Limit**: 120 req/min per admin

---

## GET /api/admin/submissions

List submissions with filtering and pagination.

**Query Parameters**:
- `status` (optional): `pending | viewed | needs_rewrite` — filter by status
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `sort` (optional, default: `-submittedAt`): Sort field with direction prefix

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "accessToken": "string",
      "clientName": "string",
      "clientContact": "string",
      "status": "pending | viewed | needs_rewrite",
      "submittedAt": "ISO 8601",
      "lastResubmittedAt": "ISO 8601 | null",
      "updatedAt": "ISO 8601"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## GET /api/admin/submissions/{submissionId}

Get full submission detail with field values and audit trail.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "accessToken": "string",
    "clientName": "string",
    "clientContact": "string",
    "status": "string",
    "rewriteComment": "string",
    "submittedAt": "ISO 8601",
    "lastResubmittedAt": "ISO 8601 | null",
    "fieldValues": [
      {
        "_id": "string",
        "fieldDefinitionId": "string",
        "fieldNameSnapshot": "string",
        "fieldTypeSnapshot": "string",
        "value": "mixed",
        "mediaUrl": "string | null",
        "mediaPublicId": "string | null"
      }
    ],
    "auditTrail": [
      {
        "oldStatus": "string",
        "newStatus": "string",
        "comment": "string | null",
        "adminId": "string",
        "adminName": "string",
        "timestamp": "ISO 8601"
      }
    ]
  }
}
```

---

## PATCH /api/admin/submissions/{submissionId}/status

Update submission status.

**Request Body**:
```json
{
  "status": "viewed | needs_rewrite | pending",
  "comment": "string (required when status=needs_rewrite, optional otherwise)"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "status": "string",
    "rewriteComment": "string",
    "auditTrail": []
  }
}
```

**Error 400**: Missing required comment for `needs_rewrite`
**Error 404**: Submission not found

---

## DELETE /api/admin/submissions/{submissionId}

Permanently delete a submission, all field values, and associated Cloudinary assets.

**Response 200**:
```json
{
  "success": true,
  "message": "Submission and all associated data permanently deleted"
}
```

**Error 404**: Submission not found

**Side Effects**:
- All FieldValue documents for this submission are deleted
- All Cloudinary assets (by `mediaPublicId`) are destroyed via Cloudinary Admin API
- All audit trail entries are removed (embedded, so deleted with parent)

---

## GET /api/admin/submissions/{submissionId}/link

Get the shareable submission link for a client.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "link": "https://{domain}/submit/{accessToken}",
    "accessToken": "string"
  }
}
```
