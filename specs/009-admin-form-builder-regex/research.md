# Research: Admin Form Validation

## 1. End-User Input Sanitization
- **Decision**: Install and utilize `isomorphic-dompurify` (or similar standard library like `xss`) for server-side HTML and script sanitization.
- **Rationale**: The specification requires robust stripping of potential script tags before database persistence (FR-007). `dompurify` is the industry standard for preventing XSS and works seamlessly in both Node.js (Next.js server environments) and the browser.
- **Alternatives considered**: Simple regex replacements (error-prone, easily bypassed by complex XSS vectors). Custom parsing (reinventing the wheel).

## 2. Admin Text Regex Definition
- **Decision**: Centralize the regex validation pattern `^[\u0600-\u06FFa-zA-Z0-9\s.,?!\-&()'"_]+$` inside Zod schemas using a reusable validation utility.
- **Rationale**: Zod natively supports `.regex()` which integrates perfectly with Next.js Server Actions and `react-hook-form` (the ShadCN standard). Using the `\u0600-\u06FF` block ensures full support for Arabic characters alongside standard English alphanumeric and defined punctuation constraints.
- **Alternatives considered**: Running manual regex checks inside component `onChange` handlers (violates Clean Architecture and reduces reusability).
