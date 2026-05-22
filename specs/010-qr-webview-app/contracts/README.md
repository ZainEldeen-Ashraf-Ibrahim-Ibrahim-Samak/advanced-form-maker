# Contracts: QR Webview Companion App

This directory defines external and cross-layer contracts for feature 010.

## Files

1. `qr-navigation-policy.md`
   - Contract for decoded QR payload normalization and destination acceptance rules.
2. `mobile-runtime-config.md`
   - Contract for required startup configuration values and validation behavior.

## Contract Intent

- Keep destination safety behavior explicit and testable.
- Keep startup configuration deterministic and fail-safe.
- Ensure consistency between mobile shell behavior and SCCT domain/security expectations.