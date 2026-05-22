# API Validation Contracts

## Error Response Contract

All API routes MUST return a standardized error response when failing:

```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE" (Optional)
}
```

## Environment Validation Contract

`src/env.mjs` acts as the contract between the runtime environment and the application code.

- **Failing Condition**: If a REQUIRED variable is missing, the application MUST fail to start/build with a clear Zod error.
- **Vercel Sync**: `.env.example` MUST contain entries for all variables defined in `env.mjs`.
