# Contract: Submissions and Fields

## Scope

This contract defines externally observable behavior for:
- token-based submission create/resubmit,
- admin status updates that trigger user notifications,
- field reorder effects on token refresh,
- contact-record minimum cardinality,
- multi-select sector payload shape,
- reusable site-name usage constraints.

## 1. Token Submission API

### Endpoint
- `POST /api/submissions/{token}`
- `PATCH /api/submissions/{token}`

### Request Contract

```json
{
  "clientName": "string (required)",
  "clientContact": "string (optional)",
  "contactRecords": [
    {
      "id": "string",
      "name": "string",
      "contact": "string",
      "role": "string",
      "notes": "string",
      "mediaUrl": "string | null",
      "mediaPublicId": "string | null"
    }
  ],
  "fieldValues": [
    {
      "fieldDefinitionId": "string",
      "value": "string | number | null | string[]",
      "mediaUrl": "string | null",
      "mediaPublicId": "string | null",
      "mediaItems": [{ "url": "string", "publicId": "string" }]
    }
  ]
}
```

### Rules
- `contactRecords.length >= 1` is mandatory.
- If sector field is configured multi-select, `value` must be `string[]` with unique items.
- Required field validation applies after draft-to-latest reconciliation.

### Error Contract
- Validation failures return 400 with structured validation payload.
- Empty or invalid contact record set returns explicit contract error code.

## 2. Admin Submission Status Update API

### Endpoint
- `PATCH /api/admin/submissions/{id}`

### Request Contract

```json
{
  "status": "pending | viewed | needs_rewrite",
  "comment": "string (required when status=needs_rewrite)"
}
```

### Behavior Contract
- When status changes to `needs_rewrite`, system creates/updates a user-facing resubmission request entry.
- User-targeted notification must remain pending for up to 7 days if undelivered.
- Admin reopening the same submission must still see request visibility state.

## 3. Token Refresh Reconciliation Contract

### Trigger
- User refreshes token submission page after admin updates/reorders fields.

### Expected Behavior
- Latest published field structure is always loaded.
- Unsaved draft values are retained only when field identifier and compatibility match.
- Dropped values are surfaced via warning message payload.

### Warning Payload Contract

```json
{
  "type": "DRAFT_VALUES_DROPPED",
  "droppedFieldIds": ["string"],
  "message": "localized warning key"
}
```

## 4. Notifications Lifecycle Contract

### States
- `pending_delivery`
- `delivered`
- `seen`
- `expired`

### Retention Rule
- Undelivered notifications are retained for exactly 7 days from creation.

### Query/Display Contract
- User inbox/notification surface shows all non-expired pending notifications.
- Admin review surface exposes latest request state for a submission.

## 5. Site Name Standardization Contract

### Contract Rule
- All UI/metadata contexts that display site name must consume the shared site-name element value `SCCT`.
- New or updated pages must not hardcode site-name literals directly.
