# Submission Event Catalog

Canonical event catalog extracted from web toast/event flows and normalized for mobile parity.

## Catalog

| Event name | messageKey | Trigger |
| --- | --- | --- |
| `validation_failed` | `mobile.submission.validationFailed` | Client-side field/contact validation fails before submit. |
| `submit_started` | `mobile.submission.submit` | Submit or resubmit action begins. |
| `submit_success` | `mobile.submission.success` | Submission API returns success. |
| `submit_failed` | `mobile.submission.serverFailure` | Submission API returns failure/network error. |
| `upload_started` | `mobile.submission.media.upload` | Media upload starts for a field. |
| `upload_progress` | `mobile.submission.media.upload` | Upload progress update is emitted. |
| `upload_success` | `mobile.submission.success` | Media upload completes and hosted URL is available. |
| `upload_failed` | `mobile.submission.serverFailure` | Media upload fails after retry budget or immediate failure. |
| `draft_saved` | `mobile.submission.saveDraft` | Draft autosave/manual save completes. |
| `draft_restored` | `mobile.submission.saveDraft` | Existing local draft is restored into form state. |
| `draft_discarded` | `mobile.submission.retry` | User/app discards an existing local draft. |
| `queue_online_resume` | `mobile.submission.offlineBlocked` | Queued submission resumes when connectivity returns. |

## Source scan references

- `src/presentation/view-models/use-submission.ts` (submit/resubmit and status-change toasts)
- `src/presentation/components/client/submission-form/media-upload.tsx` (upload lifecycle toasts)
