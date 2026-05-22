# Data Model — Native Submission Reliability Fixes

## Entities (device-local unless stated)

### FormDefinition (fetched + cached)
- `id: string`
- `version: string`
- `fields: FieldDefinition[]`
- `fetchedAt: datetime`
- `locale: string` (last locale used to resolve message keys)

### FieldDefinition
- `id: string`
- `type: enum` (`text` | `number` | `select` | `date` | `phone` | `nationalId` | `media`)
- `required: bool`
- `regex: string?`
- `formatterId: enum` (`phone` | `nationalId` | `date` | `numeric` | `none`)
- `messageKeys: { label, placeholder?, errorRequired, errorRegex, errorFormat }`
- `mediaLimits?: { maxImageBytes, maxVideoBytes, acceptedMimeTypes[] }`

### SubmissionDraft
- `formId: string`
- `values: map<fieldId, rawValue>`
- `formattedValues: map<fieldId, formattedValue>`
- `mediaQueue: MediaUploadItem[]`
- `lastEditedAt: datetime`
- `status: enum` (`editing` | `queued` | `sending` | `sent` | `failed`)
- **Lifecycle**: `editing` → `queued` (on submit) → `sending` (worker picks up) → `sent` (server ack, draft cleared) or `failed` (user can retry; draft kept).
- **Retention**: auto-discard 30 days after `lastEditedAt` when not yet `sent`.

### MediaUploadItem
- `id: string` (local uuid)
- `fieldId: string`
- `localPath: string`
- `mimeType: string`
- `sizeBytes: int`
- `status: enum` (`pending` | `uploading` | `success` | `failed`)
- `progress: float` (0..1)
- `retryCount: int` (0..3)
- `hostedPublicId: string?`
- `hostedUrl: string?`
- `lastError: string?`
- **Lifecycle**: `pending` → `uploading` → `success` or `failed`; `failed` auto-retries up to 3 with exponential backoff, then requires manual retry/remove. Submission of the parent draft is blocked while any required-field item is `failed` or not `success`.

### QueuedSubmission
- `draftRef: formId`
- `payload: submission request body` (built from draft after all uploads succeed)
- `enqueuedAt: datetime`
- `attempts: int`
- `lastError: string?`

### SubmissionEvent (in-memory + telemetry)
- `name: enum` (`validation_failed` | `submit_started` | `submit_success` | `submit_failed` | `upload_started` | `upload_progress` | `upload_success` | `upload_failed` | `draft_saved` | `draft_restored` | `draft_discarded` | `queue_online_resume`)
- `fieldId?: string`
- `messageKey?: string` (for toast text)
- `payload?: map<string, any>`
- `timestamp: datetime`

## Relationships

- `FormDefinition 1 — * FieldDefinition`
- `SubmissionDraft 1 — * MediaUploadItem` (by fieldId)
- `SubmissionDraft 1 — 0..1 QueuedSubmission`
- `SubmissionEvent` references `SubmissionDraft` / `MediaUploadItem` by id where applicable.

## Validation rules (enforced client- and server-side)

- Regex and formatter from `FieldDefinition` are applied on input and on submit; same rules are enforced server-side using the same source record.
- Media accept/reject on selection using `mediaLimits` merged with global defaults (15 MB image / 100 MB video).
- A draft cannot transition to `queued` while any required field is empty or has a `failed`/non-`success` media item.
