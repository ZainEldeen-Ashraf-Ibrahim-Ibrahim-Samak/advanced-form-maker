# Data Model: Regex Field Validation

## Entities

### `ValidationRule`
(Conceptually represented via Constants rather than a DB Collection)
- `slug`: string (e.g., "email", "phone", "name")
- `pattern`: RegExp (Immutable, strictly defined in source code)
- `errorMessageKey`: string (i18n key in `en.json` and `ar.json`)

### `ContactRecord` (Extension)
The existing submission/team contact records will now strictly enforce validation states.
- `email`: Must match `EMAIL_REGEX` -> `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `phone`: Must match `PHONE_REGEX` -> `/^\+201[0-9]{9}$/` 
- `name`: Must match `NAME_REGEX` -> `/^[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF\s\-_]+$/`

## State Transitions
1. `idle` -> `typing` (Triggers real-time regex testing)
2. `typing` -> `invalid` (Shows AlertCircle + localized detail or suggestion)
3. `typing` -> `valid` (Shows Check icon + success styling)
