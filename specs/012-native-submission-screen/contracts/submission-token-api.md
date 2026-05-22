# Contract: Submission Token API

Base path: `/api/submissions/{token}`

Response envelope (all methods):
- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": string, "code"?: string, "details"?: object }`

## GET /api/submissions/{token}
Fetch submission context for new or existing editable submission.

Path params:
- token: string

Success 200 body shape:
```json
{
  "success": true,
  "data": {
    "isNew": true,
    "formTemplate": {
      "id": "string",
      "name": "string"
    },
    "fields": [],
    "formVersion": "2026-04-15T10:00:00.000Z"
  }
}
```

Existing submission example:
```json
{
  "success": true,
  "data": {
    "isNew": false,
    "formTemplate": {
      "id": "string",
      "name": "string"
    },
    "submission": {
      "id": "string",
      "status": "draft"
    },
    "values": [],
    "fields": [],
    "formVersion": "2026-04-15T10:00:00.000Z"
  }
}
```

Errors:
- 404 NOT_FOUND: token not found/no active form.
- 500 SUBMISSION_FETCH_FAILED: server error.

## POST /api/submissions/{token}
Submit new response.

Request body schema:
```json
{
  "clientName": "string",
  "clientContact": "string",
  "contactRecords": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "contact": "string",
      "role": "string",
      "notes": "string",
      "mediaUrl": "string",
      "mediaPublicId": "string"
    }
  ],
  "fieldValues": [
    {
      "fieldDefinitionId": "string",
      "value": "string | number | string[] | null",
      "mediaUrl": "string | null",
      "mediaPublicId": "string | null",
      "mediaItems": [
        { "url": "string", "publicId": "string" }
      ]
    }
  ]
}
```

Success:
- 201 with created submission in `data`.

Validation/business errors:
- 400 VALIDATION_ERROR: Zod validation failure.
- 400 SUBMISSION_INVALID: domain rejection (required fields, invalid regex, etc).

Server errors:
- 500 SUBMISSION_CREATE_FAILED.

## PATCH /api/submissions/{token}
Resubmit editable draft/needs_rewrite submission.

Request body schema:
- Same as POST.

Success:
- 200 with updated submission in `data`.

Validation/business errors:
- 400 VALIDATION_ERROR
- 400 RESUBMISSION_INVALID

Server errors:
- 500 SUBMISSION_RESUBMIT_FAILED

## Planned additive stale-write guard (backward compatible)
To satisfy stale-write requirement, mobile client will send expected version state without breaking current clients.

Proposed optional headers:
- `If-Match-Form-Version: <formVersion from GET>`
- `If-Match-Submission-Updated-At: <submission.updatedAt from GET>`

Planned conflict responses:
- 409 STALE_FORM_VERSION
- 409 STALE_SUBMISSION_VERSION

Error body example:
```json
{
  "success": false,
  "error": "Client state is stale. Refresh and retry.",
  "code": "STALE_FORM_VERSION"
}
```
