# Endpoint Parity Audit

## Scope

Compared mobile calls in:

- `mobile-shell/lib/data/services/submission_api_client.dart`
- `mobile-shell/lib/data/services/cloudinary_sign_client.dart`

Against web client calls in:

- `src/presentation/view-models/use-submission.ts`
- `src/presentation/components/client/submission-form/media-upload.tsx`

## Submission Endpoints

| Capability | Web Endpoint | Mobile Endpoint | Method | Headers | Body Shape | Parity |
| --- | --- | --- | --- | --- | --- | --- |
| Fetch submission session | `/api/submissions/:token` | `/api/submissions/:token` | `GET` | `Accept: application/json` (mobile adds this explicitly) | none | PASS |
| Submit new | `/api/submissions/:token` | `/api/submissions/:token` | `POST` | `Content-Type: application/json` | `clientName`, `clientContact`, `contactRecords`, `fieldValues[]` | PASS |
| Resubmit existing | `/api/submissions/:token` | `/api/submissions/:token` | `PATCH` | `Content-Type: application/json` | `clientName`, `clientContact`, `contactRecords`, `fieldValues[]` | PASS |

## Cloudinary Sign + Upload Endpoints

| Capability | Web Endpoint | Mobile Endpoint | Method | Headers | Body Shape | Parity |
| --- | --- | --- | --- | --- | --- | --- |
| Request signed upload params | `/api/cloudinary/sign` | `/api/cloudinary/sign` | `POST` | `Content-Type: application/json` | `timestamp` + optional `fieldType`, `formId`, `draftId`, `public_id`, `folder`, `eager` | PASS |
| Upload file to Cloudinary | `https://api.cloudinary.com/v1_1/:cloud/:resource_type/upload` | `https://api.cloudinary.com/v1_1/:cloud/:resource_type/upload` | `POST` | multipart/form-data | signed fields + file + policy fields (`folder`, optional `upload_preset`, optional `eager`) | PASS |

## Noted Divergences and Resolutions

1. Folder policy mismatch:

- Previous: web used `submissions`, mobile used `scct/submissions`.
- Current: both resolve folder from server-side shared policy (`src/lib/cloudinary/upload-policy.ts`).

1. Resource type mismatch:

- Previous: web switched between `image|auto`, mobile always used `auto`.
- Current: both consume the signed `resource_type` from `/api/cloudinary/sign`.

1. Preset policy drift risk:

- Previous: no shared policy layer.
- Current: `/api/cloudinary/sign` returns canonical policy (`folder`, `resourceType`, optional `uploadPreset`) produced by one shared helper.

## Follow-up

- Canonical form-definition endpoint is now available at `/api/forms/:id/definition` and validated against `src/lib/validation/form-definition.ts`.
