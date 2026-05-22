# Data Model: Fix Submission Form Sync

**Date**: 2026-04-14  
**Spec**: `specs/007-fix-submission-form-sync/spec.md`

## Overview

This feature introduces targeted data-shape and lifecycle updates to support:
- repeatable contact records with minimum cardinality,
- durable resubmission notifications,
- latest-form refresh reconciliation,
- multi-select sector values,
- reusable site-name standardization.

## Entity: ContactRecord

### Purpose
Represents one editable contact entry within a submission draft/submitted payload.

### Fields
- `id` (string, required): stable client-generated identifier for record operations.
- `name` (string, required, non-empty).
- `contact` (string, optional).
- `role` (string, optional).
- `notes` (string, optional).
- `mediaUrl` (string, optional): Cloudinary secure URL for an attached file.
- `mediaPublicId` (string, optional): Cloudinary public ID for the attached file.

### Validation Rules
- Submission payload MUST include at least 1 contact record.
- Deletion operation MUST be rejected when only one record remains.
- Duplicate `id` values in one submission payload are invalid.

### State Transitions
- `created` -> `edited` -> (`deleted` | `submitted`).
- `deleted` transition forbidden when record count is 1.

## Entity: ResubmissionRequest

### Purpose
Tracks admin-issued request for user resubmission and visibility/delivery state.

### Fields
- `id` (string, required).
- `submissionId` (string, required, foreign key to Submission).
- `targetUserId` (string, required).
- `requestedByAdminId` (string, required).
- `comment` (string, optional).
- `status` (enum, required): `pending_delivery` | `delivered` | `seen` | `expired`.
- `createdAt` (datetime, required).
- `expiresAt` (datetime, required): `createdAt + 7 days`.
- `deliveredAt` (datetime, optional).
- `seenAt` (datetime, optional).

### Validation Rules
- `expiresAt` MUST be exactly 7-day retention window from creation.
- Request MUST be linked to an existing submission and target user.
- Admin review views MUST surface current request status even after revisits.

### State Transitions
- `pending_delivery` -> `delivered` -> `seen`
- `pending_delivery` -> `expired`
- `delivered` -> `expired` (if not seen before expiration)

## Entity: FormVersionSnapshot

### Purpose
Represents latest published field structure at refresh time for token submissions, used for reconciliation with local unsaved draft.

### Fields
- `formTemplateId` (string, required).
- `versionId` (string, required).
- `publishedAt` (datetime, required).
- `fields` (array, required): ordered field descriptors including identifiers and type metadata.

### Reconciliation Rules
- On refresh, always use latest `fields` list.
- Carry over unsaved values only when `fieldDefinitionId` remains present and compatible.
- Dropped values are listed in user warning payload (non-blocking).

## Entity: SectorSelection

### Purpose
Stores one or more selected sector options for dropdown fields configured for multi-select.

### Fields
- `fieldDefinitionId` (string, required).
- `selectedValues` (string array, required, min length 1 for required fields).
- `sourceLocale` (enum `en|ar`, optional).

### Validation Rules
- Every selected value MUST exist in configured dropdown options for the field.
- Duplicate values are rejected.
- Ordering should be preserved as selected by user for display consistency.

## Entity: SiteNameElement

### Purpose
Single canonical source for site name rendering in UI and metadata composition.

### Fields
- `value` (constant string): `SCCT`.
- `usageContexts` (derived set): logo text, page titles, metadata strings, shared headers.

### Constraints
- All site name displays must reference the shared element rather than hardcoded literals.

## Existing Entities Affected

### Submission
- Add relation to `ResubmissionRequest` entries for visibility and lifecycle tracking.
- Keep existing status lifecycle (`draft`, `pending`, `viewed`, `needs_rewrite`).

### FieldValue
- For multi-select dropdown values, support array-based value payload in addition to existing scalar/media forms.

### FieldDefinition
- Existing `isMultiple` remains authoritative to enable multi-select behavior for dropdown-type fields.

## Data Integrity and Indexing Notes

- Query paths should efficiently support:
  - "pending resubmission requests by target user",
  - "latest resubmission request by submission",
  - "non-expired pending requests".
- Request expiration processing can be lazy-evaluated on read/update if no scheduled cleanup exists.
