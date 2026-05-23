<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-constitution -->
# V. Internationalization (AR/EN) & RTL (STRICT ENFORCEMENT)

All text in the application MUST use translation keys. No hardcoded UI strings are allowed under any circumstances. Every key MUST be added to both `ar` and `en` translation files. You MUST use the existing scripts (`npm run i18n:sync` and `npm run i18n:lint`) to check for missing/unknown translation keys to validate completeness.
<!-- END:project-constitution -->
