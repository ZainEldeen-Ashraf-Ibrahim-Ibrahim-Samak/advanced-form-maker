# Quickstart: Fix Submission Form Sync

**Branch**: `main`  
**Spec**: `specs/007-fix-submission-form-sync/spec.md`

## Goal

Implement and verify:
1. contact-record add/edit/delete with a minimum of one,
2. durable user resubmission notifications + admin visibility,
3. token refresh reconciliation with latest form structure,
4. multi-select sector behavior,
5. reusable `SCCT` site-name usage.

## Implementation Order

1. **Data + Validation**
   - Update validation schema(s) and domain/data models for `contactRecords` minimum and multi-select sector arrays.
   - Add optional `mediaUrl`/`mediaPublicId` for file attachments to the `contactRecords` schema.
   - Ensure backward-compatible parsing where possible.

2. **Submission Flow + Reconciliation**
   - Update submission view model and form renderer for repeatable contacts, file attachments, and refresh reconciliation warning behavior.
   - Guarantee latest form structure wins on refresh while carrying matching unsaved values.

3. **Admin Status + Notification Durability**
   - Persist resubmission request state with 7-day pending retention.
   - Keep admin-visible status on revisit.

4. **Branding Standardization**
   - Introduce/consume shared site-name element (`SCCT`) in logo/page metadata contexts.

## Verification Checklist (Lightweight First)

1. **Contact records**
   - Add/edit/delete contact rows in submission UI.
   - Confirm final remaining row cannot be deleted.

2. **Resubmission notifications**
   - Admin marks submission `needs_rewrite` with comment.
   - User sees notification; admin revisit still shows state.

3. **Refresh reconciliation**
   - Open token form, type unsaved values.
   - Reorder/change fields in admin.
   - Refresh token page and confirm latest structure + carryover + dropped-values warning.

4. **Multi-select sector**
   - Select multiple sector values and submit/resubmit.
   - Confirm values persist in user/admin views.

5. **Site name standardization**
   - Inspect pages with site-title/logo metadata and verify `SCCT` is sourced from shared element.

## Final Heavy Verification (Late Stage)

Run only after implementation is feature-complete:

```bash
npm run lint
npm run api:smoke
npm run build
```

Expected:
- no lint/type failures,
- API smoke passes,
- production build succeeds.

## Verification Notes (2026-04-14)

### Automated checks

- `npm run lint` -> **failed** (29 errors, 31 warnings).
  - Blocking errors are mostly pre-existing strict lint issues across scripts and admin/data utilities.
  - Includes errors in `src/data/repositories/mongo-field-value-repository.ts` plus multiple unrelated files.
- `npm run api:smoke` -> **failed** due missing required env vars:
  - `MONGODB_URI`
  - `AUTH_SECRET`
  - `CRON_SECRET`
- `npm run build` -> **passed** (Next.js 16.2.3 production build completed successfully).

### Manual story verification status

- US1 contact-record flow: **not executed in this session**.
- US2 notification durability flow: **not executed in this session**.
- US3 refresh reconciliation flow: **not executed in this session**.
- US4 multi-select + site-name audit: **not executed in this session**.

### Suggested follow-up for final closure

1. Provide required env vars and rerun `npm run api:smoke`.
2. Decide lint scope (feature-touched files only vs repo-wide cleanup), then rerun `npm run lint`.
3. Execute US1-US4 manual scenarios and record pass/fail outcomes here.
