# API Contract: Admin — Field Definitions

**Base Path**: `/api/admin/fields`
**Auth**: Required (Admin role)
**Rate Limit**: 120 req/min per admin

---

## POST /api/admin/fields

Create a new field definition.

**Request Body**:
```json
{
  "formTemplateId": "string (ObjectId)",
  "nameEn": "string (required, max 200)",
  "nameAr": "string (required, max 200)",
  "inputType": "text | number | image | file | date | dropdown",
  "validationRules": {
    "required": "boolean (default: false)",
    "minLength": "number (optional, for text)",
    "maxLength": "number (optional, for text)",
    "min": "number (optional, for number)",
    "max": "number (optional, for number)",
    "maxFileSize": "number (optional, bytes, default: 10485760)",
    "allowedFileTypes": ["string (optional, MIME types)"]
  },
  "dropdownOptionsEn": ["string (required if inputType=dropdown)"],
  "dropdownOptionsAr": ["string (required if inputType=dropdown)"],
  "sortOrder": "number (optional, auto-assigned if omitted)"
}
```

**Response 201**:
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "formTemplateId": "string",
    "nameEn": "string",
    "nameAr": "string",
    "inputType": "string",
    "validationRules": {},
    "dropdownOptionsEn": [],
    "dropdownOptionsAr": [],
    "sortOrder": 0,
    "isActive": true,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**Error 400**: Validation failure
**Error 401**: Not authenticated
**Error 403**: Not admin role

---

## GET /api/admin/fields?formTemplateId={id}

List all field definitions for a form template.

**Query Parameters**:
- `formTemplateId` (required): ObjectId of the form template
- `includeInactive` (optional): `true` to include soft-deleted fields

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "nameEn": "string",
      "nameAr": "string",
      "inputType": "string",
      "validationRules": {},
      "dropdownOptionsEn": [],
      "dropdownOptionsAr": [],
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

---

## PATCH /api/admin/fields/{fieldId}

Update a field definition.

**Request Body** (partial update):
```json
{
  "nameEn": "string (optional)",
  "nameAr": "string (optional)",
  "inputType": "string (optional)",
  "validationRules": {},
  "dropdownOptionsEn": [],
  "dropdownOptionsAr": [],
  "sortOrder": "number (optional)"
}
```

**Response 200**: Updated field object
**Error 404**: Field not found

---

## DELETE /api/admin/fields/{fieldId}

Soft-delete a field definition (sets `isActive: false`).

**Response 200**:
```json
{
  "success": true,
  "message": "Field deactivated successfully"
}
```

---

## PATCH /api/admin/fields/reorder

Batch update field sort orders.

**Request Body**:
```json
{
  "formTemplateId": "string (ObjectId)",
  "fieldOrder": [
    { "fieldId": "string", "sortOrder": 0 },
    { "fieldId": "string", "sortOrder": 1 },
    { "fieldId": "string", "sortOrder": 2 }
  ]
}
```

**Response 200**:
```json
{
  "success": true,
  "message": "Field order updated"
}
```
