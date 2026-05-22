## Unified Production Validation Runbook

Run the following commands in order for a full production sign-off:

1. **Clean Reinstall & Build**
   ```bash
   rm -rf .next
   npm install
   npm run build
   ```
   *Expected: Exit code 0, 0 warnings/errors.*

2. **i18n Coverage Check**
   ```bash
   npm run i18n:lint
   ```
   *Expected: "i18n:lint passed" message.*

3. **API Contract Verification**
   ```bash
   npm run api:smoke
   ```
   *Expected: "All API smoke tests passed."*

4. **Logging Compliance Scan**
   ```bash
   # Verify no direct console usages remain
   Get-ChildItem -Path src -Filter *.ts,*.tsx -Recurse | Select-String "console\.(log|error|warn)"
   ```
   *Expected: No results.*

---

**Sign-off Criteria**: All 4 steps must pass for Vercel deployment readiness.
