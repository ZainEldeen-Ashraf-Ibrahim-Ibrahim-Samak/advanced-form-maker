# API Contract: Client — Submission (Unauthenticated)

**Base Path**: `/api/submissions`
**Auth**: None (public, token-based access)
**Rate Limit**: 60 req/min per IP

---

## GET /api/submissions/{accessToken}

Get submission status and data for a client. Used when revisiting a submission link.

**Response 200** (existing submission):
```json
{
  "success": true,
  "data": {
    "exists": true,
    "status": "pending | viewed | needs_rewrite",
    "rewriteComment": "string | null",
    "clientName": "string",
    "submittedAt": "ISO 8601",
    "fieldValues": [
      {
        "fieldDefinitionId": "string",
        "fieldNameSnapshot": "string",
        "fieldTypeSnapshot": "string",
        "value": "mixed",
        "mediaUrl": "string | null"
      }
    ]
  }
}
```

**Response 200** (no submission yet — fresh form):
```json
{
  "success": true,
  "data": {
    "exists": false,
    "form": {
      "name": "string",
      "fields": [
        {
          "_id": "string",
          "nameEn": "string",
          "nameAr": "string",
          "inputType": "string",
          "validationRules": {},
          "dropdownOptionsEn": [],
          "dropdownOptionsAr": [],
          "sortOrder": 0
        }
      ]
    }
  }
}
```

**Error 404**: Invalid access token

---

## POST /api/submissions/{accessToken}

Submit form data (initial submission).

**Request Body**:
```json
{
  "clientName": "string (required, max 200)",
  "clientContact": "string (optional)",
  "fieldValues": [
    {
      "fieldDefinitionId": "string (ObjectId)",
      "value": "mixed (for text, number, date, dropdown)"
    }
  ]
}
```

**Note**: Media files are uploaded directly to Cloudinary via the widget. The `mediaUrl` and `mediaPublicId` are included as field values:
```json
{
  "fieldDefinitionId": "string",
  "value": null,
  "mediaUrl": "https://res.cloudinary.com/...",
  "mediaPublicId": "submissions/abc123"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "submissionId": "string",
    "accessToken": "string",
    "status": "pending",
    "message": "Submission received successfully"
  }
}
```

**Error 400**: Validation failure (missing required fields, invalid types)
**Error 404**: Invalid access token
**Error 409**: Submission already exists (use PUT to resubmit)

---

## PUT /api/submissions/{accessToken}

Resubmit form data (after "Needs Rewrite").

**Request Body**: Same structure as POST

**Response 200**:
```json
{
  "success": true,
  "data": {
    "submissionId": "string",
    "status": "pending",
    "message": "Resubmission received successfully"
  }
}
```

**Side Effects**:
- Status auto-resets to `pending`
- Audit trail entry added: `{ oldStatus: "needs_rewrite", newStatus: "pending", comment: "Client resubmitted" }`
- Old Cloudinary assets replaced/destroyed if media fields changed
- `lastResubmittedAt` updated

**Error 400**: Validation failure
**Error 404**: Submission not found
**Error 403**: Submission is not in `needs_rewrite` status

---

## POST /api/submissions/generate-link

Generate a new unique submission link. Admin-only endpoint.

**Auth**: Required (Admin role)

**Request Body**:
```json
{
  "formTemplateId": "string (ObjectId, optional — uses active template if omitted)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "accessToken": "uuid-v4-string",
    "link": "https://{domain}/submit/{accessToken}"
  }
}
```
