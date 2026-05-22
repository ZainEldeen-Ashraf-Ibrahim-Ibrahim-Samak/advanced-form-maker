# Data Model Updates

No new MongoDB collections or tables are explicitly required for the core validation change itself, as validation is applied to existing fields on the `Form Template` and `Field Definition` models. 

## Entity Constraints 

### Form Template
- `name`: Must conform to the Safe Character Whitelist. Max length constraint enforced via Zod.
- `description`: Must conform to the Safe Character Whitelist. Max length constraint via Zod.

### Field Definition
- `label`: Must conform to the Safe Character Whitelist.
- `placeholder`: Must conform to the Safe Character Whitelist.

## Validation Constant (Shared)
```typescript
const SAFE_TEXT_REGEX = /^[\u0600-\u06FFa-zA-Z0-9\s.,?!&\-()'"_]+$/u; 
```
*(Matches English alphanumeric, Arabic text, spaces, and standard basic punctuation `.` `,` `-` `_` `?` `!` `&` `()` `'` `"` as defined in FR-001.)*
