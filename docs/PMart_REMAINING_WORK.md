# PMart Remaining Work Roadmap

## P0 — Blocking Issues
### ID: 001
**Title:** Final Address Flow Validation
**Status:** ✅ COMPLETED (Playwright E2E Address Flow test passed)

### ID: 002
**Title:** Security IDOR Verification
**Status:** ✅ COMPLETED (Empirically verified via `backend/tests/idor-audit.ts`. Tests confirmed 403/404/400 responses for cross-tenant access to orders, addresses, and shops, as well as rider isolation, admin authorization, role escalation blocks, and OTP security.)


### ID: 004
**Title:** Error Boundary and Frontend Fallbacks
**Status:** ✅ COMPLETED (Wrapped layouts with ErrorBoundary)

### ID: 007
**Title:** Comprehensive Admin Panel Implementation
**Current behavior:** Admin panel was missing actual CRUD for employees, settings, and audit logs.
**Expected behavior:** Full Admin Panel featuring granular Employee Management (RBAC), Shared Catalog/Inventory Management, Platform Settings, Analytics, and System Audit Logs.
**Status:** ✅ COMPLETED (Implemented Employee Management with granular permissions, Settings module, Audit Logs tracking, and complete Catalog Governance via Backend API endpoints)

### ID: 008
**Title:** Mandatory Rider First-Login Password Change
**Status:** ✅ COMPLETED (mustChangePassword flag set on provisioning. Middleware blocks all business routes except `/api/auth/password` and `/api/auth/me` until changed. Bypass-hardened with canonical URL matching. E2E tests in `auth.test.ts` pass.)

### ID: 009
**Title:** Durable Rider Order Progression
**Current behavior:** `order.automation.ts` used in-memory `setTimeout` jobs that were lost on backend restart.
**Expected behavior:** Jobs persisted to MongoDB `OrderProgressionJob` collection, atomically locked before execution, and recovered by a sweeper on startup.
**Status:** ✅ COMPLETED (OrderProgressionJob model, idempotent executeJob, AdminController assignment inside transaction, recovery sweeper. 4/4 tests pass in `order.automation.test.ts`.)

## P1 — Pending UI Work
### ID: 010
**Title:** Admin System Settings Navigation and Persistence
**Current behavior:** Clicking System Settings causes a page reload; settings (offers, free-delivery threshold) do not persist reliably.
**Expected behavior:** React Router navigation without reload; settings read/write via `/api/settings` API; toast confirmation on save.
**Status:** ✅ COMPLETED

### ID: 011
**Title:** Add Employee Modal — Human-Readable Permission Labels
**Current behavior:** Permission list shows raw keys: `dashboard.read`, `orders.manage`, etc.
**Expected behavior:** Mapped to readable labels: View Dashboard, Manage Orders, etc. Backend keys unchanged.
**Status:** ✅ COMPLETED

## P2 — Improvements
### ID: 005
**Title:** Route Caching Optimization
**Current behavior:** Real-time routing is polled, but results are now cached on the backend.
**Expected behavior:** Introduce backend caching to prevent rate-limiting on external OSRM services if traffic spikes.
**Status:** ✅ COMPLETED (Implemented in-memory LRU route cache with concurrent request deduplication, normalized coordinate keys, and configurable TTL via `OSRM_CACHE_TTL`. Frontend updated to proxy requests through backend.)

### ID: 006
**Title:** Address Normalization Tech Debt
**Current behavior:** Models store both `zipCode` and `pincode`, as well as legacy `{lat, lng}` and GeoJSON formats.
**Expected behavior:** Perform a one-time DB migration and standardize entirely on `pincode` and GeoJSON.
**Status:** ✅ COMPLETED (Safely migrated seeders/tests. Created idempotent, dry-run-first `normalize-addresses.ts` migration script handling zipCode -> pincode and legacy coordinates -> GeoJSON. Old unsafe migration script deprecated.)
