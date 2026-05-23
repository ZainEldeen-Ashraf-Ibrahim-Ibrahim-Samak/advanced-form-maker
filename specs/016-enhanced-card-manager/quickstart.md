# Quickstart: Enhanced Dashboard Card Manager

**Feature**: 016-enhanced-card-manager  
**Date**: 2026-05-23

---

## User Story 1 — Bilingual Titles & Logo

### Verify: AR/EN titles display correctly per locale

1. Log in as admin and open the Dashboard.
2. Click **Manage Cards**.
3. For any form card, enter an Arabic name in **Card Name (AR)** and an English name in **Card Name (EN)**.
4. Click **Save**.
5. Observe the dashboard card — it shows the EN name (English UI active).
6. Switch locale to Arabic (AR) using the language switcher.
7. Observe the same card — it now shows the AR name.
8. Clear the AR name in card manager and save.
9. Verify in AR locale the card falls back to the EN name.
10. Clear both AR and EN names.
11. Verify in any locale the card falls back to the form's internal name.

### Verify: Logo displays on card

1. Open card manager, enter a valid image URL in the **Logo URL** field for a form card.
2. Save.
3. Observe the card — the logo image appears in the top-right of the card header (replacing the default `FileText` icon).
4. Enter an invalid URL (e.g. `not-a-url`) — card shows the default icon without a broken image indicator.

---

## User Story 2 — Form Summaries at Top

### Verify: Section position

1. Load the admin dashboard.
2. Scroll to the very top of the content area (below the page title).
3. The **first** content block is the form summary cards grid (or its loading skeleton).
4. The status count row (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite) appears **below** the form summary cards.
5. Storage usage cards appear below the status count row.

---

## User Story 3 — Manage Default Stat Cards

### Verify: Stat cards appear in card manager

1. Open card manager on the Dashboard.
2. The dialog list shows at least 5 entries at the top with no form name — these are the default stat cards (Total Submissions, Pending, Drafts, Viewed, Needs Rewrite).
3. Each has a visibility toggle and AR/EN name fields.

### Verify: Hide a stat card

1. Toggle **Pending** off in card manager and Save.
2. On the dashboard, the **Pending** count card is no longer visible.
3. Re-open card manager and toggle **Pending** back on. Save.
4. The **Pending** card reappears with the correct count.

### Verify: Custom label for stat card

1. Open card manager, set Arabic name for **Needs Rewrite** to "يحتاج مراجعة".
2. Save.
3. Switch to Arabic locale on the dashboard — the Needs Rewrite card shows "يحتاج مراجعة".

### Verify: Reorder stat card below a form card

1. In card manager, drag the **Total Submissions** stat card to the bottom of the list.
2. Save.
3. On the dashboard, Total Submissions appears after all form summary cards.

---

## User Story 4 — Card Manager from Submissions Page

### Verify: Accessible from Submissions page

1. Navigate to the admin **Submissions** page.
2. A **Manage Cards** button is visible in the page header area.
3. Click it — the card manager dialog opens.
4. Make a change (e.g. hide a card), save.
5. Navigate to Dashboard — the change is reflected.

---

## User Story 5 — Card Style Matching

### Verify: Visual consistency

1. Load the dashboard with at least one form summary card visible.
2. Compare a form summary card with a default stat card (e.g. Total Submissions):
   - Both have the same compact `CardHeader` height.
   - Card title uses `text-sm font-medium` in top-left.
   - Icon or logo appears in top-right at `h-4 w-4`.
   - Metric value below uses `text-2xl font-bold`.
3. For a form card with custom `metricLabel` + `metricValue`:
   - The custom label appears as `text-xs text-muted-foreground`.
   - The custom metric value appears as `text-2xl font-bold`.
4. For a form card with no custom metric value:
   - The submission count appears in `text-2xl font-bold`.

---

## User Story 6 — Analysis Date Range Bug Fix

### Verify: Date range shows correctly

1. Navigate to any form that has at least 1 submission.
2. Open the **Analysis** tab.
3. The **Submission Statistics** card shows:
   - **Total Submissions**: correct count (e.g. 1, not 0)
   - **Date Range**: actual date(s) (e.g. "23/5/2026 - 23/5/2026"), NOT "No submissions yet"
4. This must work even if AI analysis has never been run on this form.
5. Trigger analysis (click Run Analysis) — the statistics update to reflect the post-analysis state.

### Verify: Empty form still shows "No submissions yet"

1. Create a new form with no submissions.
2. Open its Analysis tab.
3. "No submissions yet" appears in Date Range — this is correct behavior (not a bug).

---

## i18n Key Reference

New keys added to `src/messages/en.json` and `src/messages/ar.json` under the `dashboard` namespace:

| Key | EN | AR |
|-----|----|----|
| `editCardNameAr` | Card Name (AR) | اسم البطاقة (عربي) |
| `editCardNameEn` | Card Name (EN) | اسم البطاقة (إنجليزي) |
| `editLogoUrl` | Logo URL | رابط الشعار |
| `logoUrlPlaceholder` | https://example.com/logo.png | https://example.com/logo.png |
| `statCardTotal` | Total Submissions | إجمالي الطلبات |
| `statCardPending` | Pending | قيد الانتظار |
| `statCardDraft` | Drafts | المسودات |
| `statCardViewed` | Viewed | تمت المراجعة |
| `statCardNeedsRewrite` | Needs Rewrite | يحتاج تعديل |
| `formSummariesTitle` | Form Summaries | ملخص النماذج |
