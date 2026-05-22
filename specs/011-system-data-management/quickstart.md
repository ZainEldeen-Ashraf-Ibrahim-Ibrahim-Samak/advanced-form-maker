# Phase 1: Quickstart

**Feature**: System Data Management (`011-system-data-management`)

## Getting Started

1. **Configure the Cron Job:**
   - Define `CRON_SECRET` in your `.env`.
   - Setup a daily cron task (e.g., Vercel Cron or GitHub Actions) targeting `/api/cron/system-cleanup` with the `Authorization: Bearer <CRON_SECRET>`.

2. **Access the New Settings:**
   - Navigate to the Admin Dashboard > Settings.
   - Set "Draft Retention Days" to `0` (or empty) to keep drafts forever. Or set to `30` to delete drafts older than 30 days.
   - Set "Cloudinary Storage Limit (%)" to automatically clean up media when the usage limit approaches maximum capacity.

3. **Dashboard Analytics:**
   - The admin homepage will now feature a widget showing the current Cloudinary storage usage, updated from Redis cache to prevent API limits.

4. **Testing the Data Export:**
   - Go to any dynamic model listing.
   - Click "Export".
   - The resulting `.xlsx` will gracefully flatten nested objects (like translation keys or Map structures) without crashing or dropping columns.

5. **Using the Backup and Restore:**
   - Go to Admin Settings > Backups.
   - Click "Download System Backup". Keep the file safe.
   - Select a previous backup file and click "Restore System" to roll back all model data to the snapshot. *Warning: This is destructive to current data.*