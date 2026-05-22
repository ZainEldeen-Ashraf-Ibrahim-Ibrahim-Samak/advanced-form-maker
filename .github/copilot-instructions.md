# SCCT Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-15

## Active Technologies
- TypeScript 5.x with Node.js LTS tooling; Next.js 16.2.3 web core + Next.js (App Router), next-intl, Zod + @t3-oss/env-nextjs, qrcode.react (existing QR generation), companion mobile shell adapter (Capacitor class of runtime) (main)
- Existing MongoDB, Upstash Redis, and Cloudinary remain unchanged; mobile flow adds no new persistence requirement (main)
- TypeScript 5.x (web/API), Dart 3.x (Flutter mobile-shell) + Next.js App Router, Zod, Mongoose, Upstash Redis, Cloudinary signing endpoint, Flutter SDK packages (webview fallback, scanner, secure storage/encrypted persistence to be added) (main)
- MongoDB (server source of truth), Upstash Redis (cache), Cloudinary (media), encrypted local mobile draft/session storage (main)

- TypeScript / Node.js (LTS) + Next.js (App Router), ShadCN UI, Mongoose, next-intl (main)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript / Node.js (LTS): Follow standard conventions

## Recent Changes
- main: Added TypeScript 5.x (web/API), Dart 3.x (Flutter mobile-shell) + Next.js App Router, Zod, Mongoose, Upstash Redis, Cloudinary signing endpoint, Flutter SDK packages (webview fallback, scanner, secure storage/encrypted persistence to be added)
- main: Added TypeScript 5.x with Node.js LTS tooling; Next.js 16.2.3 web core + Next.js (App Router), next-intl, Zod + @t3-oss/env-nextjs, qrcode.react (existing QR generation), companion mobile shell adapter (Capacitor class of runtime)

- main: Added TypeScript / Node.js (LTS) + Next.js (App Router), ShadCN UI, Mongoose, next-intl

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
