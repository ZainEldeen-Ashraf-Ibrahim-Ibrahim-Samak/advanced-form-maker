# Contract: Submissions API — formId Filter

## Endpoint

```
GET /api/admin/submissions
```

## Query Parameters

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `page`    | number | 1       | Page index (1-based) |
| `status`  | string | "all"   | Submission status filter |
| `formId`  | string | "all"   | Scope results to a specific form template ID |
| `admin`   | string | "all"   | Filter by assigned admin (unused by this feature) |

## Relevant Behavior

- When `formId` is a non-"all" string, only submissions whose `formTemplateId` matches are returned.
- Pagination applies after filtering. Returns `{ submissions, total, totalPages }`.
- Authentication required (session cookie).

## Status

This contract already exists and is implemented. No changes required. This document records it for traceability.

## Consumer

`<FormSubmissionsPanel>` → `useSubmissionsList(formId)` → `GET /api/admin/submissions?formId=<id>&page=<n>&status=<s>`
