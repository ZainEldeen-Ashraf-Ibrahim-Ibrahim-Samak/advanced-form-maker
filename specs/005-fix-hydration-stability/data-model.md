# Data Model: Fix Hydration & Application Stability

**Date**: 2026-04-13  
**Branch**: `005-fix-hydration-stability`

## No Schema Changes Required

This feature is a bug-fix patch. No data model changes are needed:

- **No new entities**: All existing entities (Submission, FieldDefinition, FieldValue, FormTemplate, User, Settings) remain unchanged.
- **No field additions**: No new fields are added to any existing model.
- **No state transitions**: The existing Submission lifecycle (draft → pending → viewed → needs_rewrite) is unchanged.
- **No migration needed**: Zero database migrations.

## Connection Pool Configuration (Existing)

The MongoDB connection pool settings in `src/lib/db.ts` remain the same but the connection lifecycle management is enhanced:

| Parameter | Current | After Fix |
|-----------|---------|-----------|
| `maxPoolSize` | 10 | 10 (unchanged) |
| `minPoolSize` | 1 | 1 (unchanged) |
| `serverSelectionTimeoutMS` | 10000 | 10000 (unchanged) |
| `socketTimeoutMS` | 45000 | 45000 (unchanged) |
| Max retry attempts | unlimited | 3 |
| Retry back-off | none | exponential (1s, 2s, 4s) |
| Connection state validation | none | check `readyState` before reuse |
