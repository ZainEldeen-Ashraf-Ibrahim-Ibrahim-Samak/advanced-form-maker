# Phase 0: Research & Technical Decisions

**Feature**: System Data Management (`011-system-data-management`)

## 1. Scheduled Tasks for Auto-Deletion and Cleanup
- **Context**: The system needs to run daily tasks to delete drafts older than `draft_retention_days` and clean up Cloudinary media if `cloudinary_storage_threshold` is exceeded.
- **Decision**: Leverage the existing Next.js App Router API endpoints designed for cron jobs (e.g., Vercel Cron) securely invoked via a scheduled trigger.
- **Rationale**: Next.js serverless environments don't support persistent background workers. Exposing a secure API route (e.g., `/api/cron/system-cleanup`) protected by a secret key allows external cron services to trigger the cleanup.
- **Alternatives Considered**: Dedicated Node.js worker process (rejected due to infrastructure overhead and breaking serverless compatibility).

## 2. Dynamic System Backup and Restore
- **Context**: Backup all system models dynamically so that new models added in the future are automatically included without code changes.
- **Decision**: Use `mongoose.modelNames()` to retrieve all registered schemas, then loop through each to `find({})` and serialize the data into a structured JSON artifact. For restore, use `deleteMany({})` and `insertMany()` in a MongoDB transaction.
- **Rationale**: Ensures 100% model coverage as required by the spec. Transactions ensure that if a restore fails midway, the database rolls back to its original state, preventing corruption.
- **Alternatives Considered**: Shell execution of `mongodump`/`mongorestore` (rejected due to hosting constraints and needing direct database URI access which might be restricted in serverless environments).

## 3. Cloudinary API Integration for Storage Limits
- **Context**: Need to display Cloudinary storage usage on the dashboard and trigger cleanup if the threshold is exceeded.
- **Decision**: Use `cloudinary.v2.api.usage()` to fetch storage metrics (specifically `usage.storage.usage` vs `usage.storage.limit` or percentage). For media cleanup, query the target entity (e.g., orphaned media or media attached to old drafts) and use `cloudinary.v2.api.delete_resources()` for batch deletion.
- **Rationale**: The Admin API provides exact storage metrics and bulk deletion capabilities. Caching the `usage()` response in Upstash Redis with a TTL of a few hours prevents rate-limiting and improves dashboard load times.
- **Alternatives Considered**: Tracking upload sizes manually in MongoDB (rejected due to inaccuracy over time and missing Cloudinary transformations/derivatives storage overhead).

## 4. Reliable XLSX Data Export with Transaction Keys
- **Context**: Current export system fails on transaction keys and drops column values.
- **Decision**: Implement a recursive object flattening utility before passing data to `xlsx.utils.json_to_sheet`. For transaction keys (often Maps or i18n objects), stringify them safely or extract the default locale value.
- **Rationale**: `xlsx` expects flat objects. Passing nested objects or Map structures causes silent failures or dropped columns. Flattening guarantees all values are read.
- **Alternatives Considered**: Hardcoded column mappers per table (rejected due to lack of scalability and violating the dynamic schema mandate).
