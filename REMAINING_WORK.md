# PMart Remaining Work Matrix

## Component Migration Matrix (UI Consistency)

| Component Status | Raw Elements Detected | Target UI Component | Action Required | Priority |
|------------------|-----------------------|---------------------|-----------------|----------|
| 🟢 Migrated      | `<input>` (safe ones) | `<Input>`           | Preserved specialized native inputs | Low     |
| 🟢 Migrated      | `<button>`            | `<Button>`          | None            | Low      |
| 🟢 Migrated      | `<select>`            | `<Select>`          | None            | Low      |
| 🟢 Migrated      | `FormField` (htmlFor) | `htmlFor` prop      | None            | Low      |

## Security Verification Matrix

| Subsystem | Status | Last Audited | Notes | Priority |
|-----------|--------|--------------|-------|----------|
| Rate Limiting | 🟢 Verified | October 2026 | `express-rate-limit` active on auth, skipped in dev/test | Low |
| CORS Policy | 🟢 Verified | October 2026 | Explicit environments, credentials true | Low |
| Checkout Idempotency | 🟢 Verified | October 2026 | Session-based validation with explicit matching | Low |
| Admin Privileges | 🟢 Verified | October 2026 | `createEmployee` locked to `EMPLOYEE` role | Low |
| Auth Tokens | 🟢 Verified | October 2026 | `httpOnly` secure cookies | Low |

## End-to-End Test Matrix

| Browser | Test Suite | Pass/Fail | Notes | Priority |
|---------|------------|-----------|-------|----------|
| Chromium | pmart-lifecycle | 🟢 Pass | Stable, HTTP PUT method corrected | Low |
| WebKit | pmart-lifecycle | 🟢 Pass | Race conditions and HTTP method fixed | Low |
| WebKit | admin-settings | 🟢 Pass | Fixed input `fill()` assertions | Low |
| Firefox | all | 🟢 Pass | Stable across all workflows | Low |
