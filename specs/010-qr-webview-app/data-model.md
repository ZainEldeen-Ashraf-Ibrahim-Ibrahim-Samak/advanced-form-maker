# Data Model: QR Webview Companion App

**Date**: 2026-04-15  
**Spec**: `specs/010-qr-webview-app/spec.md`

## Overview

This feature introduces the domain model needed to support:
- QR payload decoding and safety validation,
- controlled in-app webview navigation,
- startup configuration safety,
- bilingual mobile UI strings,
- and strict SCCT branding consistency.

## Entity: QrScanPayload

### Purpose
Represents a decoded QR value and its normalized URL candidate.

### Fields
- `rawValue` (string, required): exact decoded value from scanner.
- `normalizedUrl` (string, optional): canonical HTTPS URL after normalization.
- `scheme` (string, optional): parsed URL scheme.
- `host` (string, optional): parsed host.
- `validationStatus` (enum, required): `pending` | `accepted` | `rejected`.
- `failureCode` (enum, optional): `invalid_format` | `non_https` | `disallowed_host`.
- `scannedAt` (datetime, required).

### Validation Rules
- `rawValue` must not be empty.
- `normalizedUrl` must exist when status is `accepted`.
- `failureCode` must exist when status is `rejected`.

### State Transitions
- `pending` -> `accepted`
- `pending` -> `rejected`

## Entity: NavigationPolicy

### Purpose
Defines the rule set that decides whether a scanned destination can open in the in-app webview.

### Fields
- `allowedHosts` (string array, required, min length 1).
- `enforceHttps` (boolean, required, default `true`).
- `allowSubdomains` (boolean, required, default `true`).
- `blockedPathPrefixes` (string array, optional).
- `updatedAt` (datetime, required).

### Validation Rules
- Hosts must be valid domain names.
- Policy evaluation must reject non-HTTPS links.
- Policy evaluation must reject hosts not in `allowedHosts` (or allowed subdomain rules).

## Entity: WebviewSession

### Purpose
Tracks one in-app browsing session launched from a validated QR scan.

### Fields
- `sessionId` (string, required).
- `entryUrl` (string, required).
- `currentUrl` (string, required).
- `lastScanAt` (datetime, required).
- `status` (enum, required): `idle` | `active` | `blocked` | `error`.
- `errorCode` (enum, optional): `network_unreachable` | `navigation_blocked` | `unknown`.

### Validation Rules
- `entryUrl` and `currentUrl` must be allowed URLs when status is `active`.
- `errorCode` is required when status is `error`.

### State Transitions
- `idle` -> `active`
- `active` -> `active` (rescan and replace destination)
- `active` -> `blocked`
- `active` -> `error`

## Entity: MobileRuntimeConfig

### Purpose
Represents required environment-driven startup settings for the companion mobile shell.

### Fields
- `appBaseUrl` (string URL, required).
- `allowedHosts` (string array, required, min length 1).
- `splashMinDurationMs` (number, required, range 300-5000).
- `defaultLocale` (enum, required): `ar` | `en`.
- `supportedLocales` (enum array, required): contains both `ar` and `en`.
- `scanTimeoutMs` (number, optional, range 1000-30000).

### Validation Rules
- Startup must fail safely if any required field is missing or invalid.
- `appBaseUrl` host should be included in `allowedHosts`.

## Entity: LocalizedStringSet

### Purpose
Stores locale-specific scanner/webview/splash strings required by the companion flow.

### Fields
- `locale` (enum, required): `ar` | `en`.
- `scanPrompt` (string, required).
- `invalidQrError` (string, required).
- `disallowedUrlError` (string, required).
- `cameraPermissionError` (string, required).
- `offlineError` (string, required).
- `openInWebviewLabel` (string, required).

### Validation Rules
- Every required key must exist for both locales.
- Missing keys are release blockers.

## Entity: BrandIdentityAsset

### Purpose
Defines shared app identity resources reused from SCCT website branding.

### Fields
- `siteName` (string, required): sourced from canonical site name.
- `launcherIconSource` (string path, required).
- `splashIconSource` (string path, required).
- `splashBackgroundColor` (string hex, optional).

### Validation Rules
- Mobile launcher and splash references must map to valid generated assets.
- `siteName` must match canonical SCCT naming source.

## Existing Entities Affected

### AppConfiguration (existing concept)
- Extended to include companion mobile runtime values and allowlist policy.

### Localized message catalogs
- Extended with mobile scanner/webview namespaces while preserving AR/EN parity.

## Data Integrity Notes

- URL policy validation is authoritative and must run before navigation.
- Localization parity and branding asset validation are release gates for this feature.