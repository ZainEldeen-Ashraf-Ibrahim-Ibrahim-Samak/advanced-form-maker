# Quickstart: Fix Hydration & Application Stability

**Branch**: `005-fix-hydration-stability`

## Overview

This feature applies 4 targeted patches to fix production stability issues. No new dependencies, no database migrations, no API changes.

## Prerequisites

- Node.js LTS installed
- MongoDB connection string in `.env.local`
- `npm install` already run

## Files to Modify

| # | File | Bug | Change Summary |
|---|------|-----|----------------|
| 1 | `src/components/ui/button.tsx` | Hydration | Remove `suppressHydrationWarning` |
| 2 | `src/components/ui/input.tsx` | Hydration | Remove `suppressHydrationWarning` |
| 3 | `src/presentation/components/shared/theme-toggle/index.tsx` | Hydration | Remove `suppressHydrationWarning` from trigger, ensure `mounted` guard covers all theme-dependent rendering |
| 4 | `src/presentation/components/shared/language-switcher/index.tsx` | Hydration | Remove `suppressHydrationWarning` from trigger |
| 5 | `src/presentation/view-models/use-submission.ts` | Form refresh | Stabilize `fetchContent` deps using ref, queue SSE events during editing |
| 6 | `src/presentation/components/admin/submissions-table/index.tsx` | Delete modal | Decouple AlertDialog from DropdownMenu, use controlled state |
| 7 | `src/lib/db.ts` | MongoDB retry | Add connection state validation, retry limits (3), exponential back-off, logging |

## Verification Steps

1. **Hydration**: Run `npm run dev`, open browser console, navigate to all major pages — zero hydration warnings.
2. **Form stability**: Open a submission form, type for 60+ seconds — no re-fetches or reloads.
3. **Delete modal**: Open submissions table, click action menu → Delete — dialog opens and stays open.
4. **MongoDB**: Check server logs during 10 API calls — only 1 connection establishment.
5. **Build**: Run `npm run build` to confirm no TypeScript errors introduced.
