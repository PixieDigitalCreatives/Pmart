# PMart Security Findings Ledger

> **HISTORICAL DOCUMENT — superseded on 2026-10-13.** This describes the code and database before the rebuild (TypeScript backend, old collections, seed data and the Playwright suite, all since removed). File names, collections and test references below may no longer exist. Current state: [Developer Handover Report](PMart_DEVELOPER_HANDOVER_REPORT.md), [Database Reference](PMart_DATABASE_REFERENCE.md), [Feature Status Matrix](PMart_FEATURE_STATUS_MATRIX.md) and [SECURITY.md](../SECURITY.md).

| ID | Finding | Severity | Evidence / Location | Remediation | Verification Status | Risk |
|---|---|---|---|---|---|---|
| SEC-001 | Hardcoded Secrets in Scripts | P0 (Immediate) | `backend/src/scripts/pw-debug.ts`, `backend/src/scripts/repair-rider-profiles.ts`, `backend/src/scripts/test-live-flow.ts` (MongoDB URIs & fallback JWT secrets) | Migrate to `process.env` exclusively, remove hardcoded URIs/passwords, invalidate any real credentials exposed. | Fixed | Low |
| SEC-002 | Permissive CORS Configuration | P1 (High) | `backend/src/app.ts` | Replace `origin: true` with a restricted list of allowed production domains and localhost for dev. | Fixed | Low |
| SEC-003 | Insufficient Rate Limiting on Auth | P1 (High) | `backend/src/app.ts`, `backend/src/modules/auth/auth.route.ts` | Apply strict rate limiting (e.g., 5 attempts/15 mins) specifically for `/api/auth/login` and password reset routes to prevent brute-forcing. | Fixed | Low |
| SEC-004 | Privilege Escalation in Employee Management | P1 (High) | `backend/src/modules/admin/admin.controller.ts` | Restrict employees from granting permissions they do not possess themselves, or restrict employee modification to ADMIN only. | Fixed | Low |
| SEC-005 | Mass Assignment Vulnerability in Profile Update | P1 (High) | `backend/src/modules/users/user.controller.ts` (`updateProfile`) | Do not pass `req.body` directly to `$set`. Only allow specific fields (e.g. `fullName`, `phone`, `vehicleNumber`) to be updated by users. | Fixed | Low |
