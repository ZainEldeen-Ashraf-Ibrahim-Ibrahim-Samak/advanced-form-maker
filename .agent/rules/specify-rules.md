# SCCT Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-15

## Active Technologies
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (002-cms-enhancements)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (002-cms-enhancements)
- TypeScript 5+ (Node.js 20 LTS) + Next.js 14 App Router, zod, t3-env, next-intl, mongoose, cloudinary, upstash/redis (002-cms-enhancements)
- MongoDB, Cloudinary (Media + Database Backup Exports), Upstash Redis (SSE PubSub) (002-cms-enhancements)
- TypeScript 5.x / Next.js 14 App Router + `next-intl` (localization), `zod` (env validation) (003-production-readiness)
- N/A for this scope (003-production-readiness)
- TypeScript 5.x on Node.js LTS + Next.js (App Router), @base-ui/react, next-intl, next-themes, next-auth, mongoose, ShadCN UI (005-fix-hydration-stability)
- MongoDB (Mongoose ODM), Upstash Redis (005-fix-hydration-stability)
- TypeScript / Next.js App Router + React (Hooks), Zod (Backend Validation) (006-fix-empty-form-payload)
- N/A for this fix (MongoDB structure remains untouched) (006-fix-empty-form-payload)
- TypeScript 5.x, Node.js 20+ (LTS) + Next.js 16.x (App Router), Zod 4.x, next-intl 4.x, Mongoose 8.x (008-regex-field-validation)
- MongoDB (Mongoose) (008-regex-field-validation)
- Node.js LTS, TypeScript + Next.js App Router, React, lucide-react, next-intl (main)
- Upstash Redis (caching), MongoDB (users/submissions) (main)
- Node.js (v20+ LTS), TypeScript (strict mode) + Next.js 16 (App Router), Zod, React Hook Form, isomorphic-dompurify (main)
- MongoDB (Mongoose) - existing models (main)

- TypeScript 5.x on Node.js 20+ (LTS) + Next.js 14+ (App Router), ShadCN UI, Mongoose 8+, Auth.js v5, next-cloudinary, @upstash/redis, @upstash/ratelimit, next-intl, next-themes, @dnd-kit/core, Zod (001-client-data-review)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x on Node.js 20+ (LTS): Follow standard conventions

## Recent Changes
- main: Added Node.js (v20+ LTS), TypeScript (strict mode) + Next.js 16 (App Router), Zod, React Hook Form, isomorphic-dompurify
- main: Added Node.js LTS, TypeScript + Next.js App Router, React, lucide-react, next-intl
- main: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
