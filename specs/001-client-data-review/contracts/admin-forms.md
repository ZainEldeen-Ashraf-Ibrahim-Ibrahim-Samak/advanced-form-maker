# API Contract: Admin — Form Templates

**Base Path**: `/api/admin/forms`
**Auth**: Required (Admin role)
**Rate Limit**: 120 req/min per admin

---

## POST /api/admin/forms

Create a new form template.

**Request Body**:
```json
{
  "name": "string (required, max 200)",
  "description": "string (optional)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "isActive": true,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**Side Effects**:
- If no other active template exists, this becomes the active template
- If another template is active, the new one is created as inactive

---

## GET /api/admin/forms

List all form templates.

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "name": "string",
      "description": "string",
      "isActive": true,
      "fieldCount": 5,
      "submissionCount": 23,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

---

## GET /api/admin/forms/{formId}

Get form template details with fields.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "string",
    "description": "string",
    "isActive": true,
    "fields": [],
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

---

## PATCH /api/admin/forms/{formId}

Update a form template.

**Request Body** (partial update):
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "isActive": "boolean (optional)"
}
```

**Response 200**: Updated form template
**Error 404**: Form not found

**Side Effects**:
- Setting `isActive: true` deactivates any currently active template

---

## DELETE /api/admin/forms/{formId}

Delete a form template.

**Response 200**:
```json
{
  "success": true,
  "message": "Form template deleted"
}
```

**Error 400**: Cannot delete if submissions exist (soft-delete instead)
**Error 404**: Form not found
