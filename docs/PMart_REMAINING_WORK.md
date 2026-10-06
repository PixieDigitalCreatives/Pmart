# PMart Remaining Work Roadmap

## P0 — Blocking Issues
### ID: 001
**Title:** Final Address Flow Validation
**Status:** ✅ COMPLETED (Playwright E2E Address Flow test passed)

### ID: 002
**Title:** Security IDOR Verification
**Status:** ✅ COMPLETED (Empirically verified via `backend/tests/idor-audit.ts`. Tests confirmed 403/404/400 responses for cross-tenant access to orders, addresses, and shops, as well as rider isolation, admin authorization, role escalation blocks, and OTP security.)

### ID: 013
**Title:** Security Audit Remediation Sprint
**Status:** ✅ COMPLETED (Reconciled 54-item tracker, mitigated Mongoose NoSQL risks and completely addressed ReDoS via strict regex escaping, enforced strict JWT length validation, completely overhauled Socket.IO to include comprehensive resource-level authorization verifying order ownership and specific employee roles (verified via 16 strict tests in `socket.auth.test.ts`), removed hardcoded production secrets in seeders, stripped OTPs from logs, and disabled sourcemaps in Vite.)

### ID: 004
**Title:** Error Boundary and Frontend Fallbacks
**Status:** ✅ COMPLETED (Wrapped layouts with ErrorBoundary)

### ID: 015
**Title:** Concurrent Checkout and Inventory Audit
**Current behavior:** Concurrency testing for inventory overselling and idempotency replay was requested.
**Expected behavior:** Formal invariant tests verifying concurrency bounds (e.g. 11000 duplicate keys, 409 WriteConflicts) must exist and pass.
**Status:** ✅ COMPLETED (Implemented 11 comprehensive concurrency scenarios in `checkout.concurrency.test.ts` verifying atomicity, transient transaction retries, and exactly-once idempotency checks. 11/11 passing.)

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

## P1 — Rate Limiting & Proxy Configuration
### ID: 014
**Title:** Granular Rate Limiting & Proxy Trust Mitigation
**Current behavior:** Catalog search, checkout, OTP verification, admin mutations, and rider location updates lacked specific limiters, and `trust proxy` was missing.
**Expected behavior:** Granular limits applied and Express correctly configured to trust the proxy, avoiding global blockages based on proxy IPs.
**Status:** ✅ COMPLETED (Implemented `searchLimiter`, `checkoutLimiter`, `otpLimiter`, `adminMutationLimiter`, and `locationLimiter`. Configured `app.set('trust proxy', 1)`. Regression tests added in `rate-limit.test.ts` passing 4/4.)

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

### ID: 012
**Title:** UI Component Standardization (Customer Portal)
**Current behavior:** Customer portal pages use raw Bootstrap-like classes (`btn btn-primary`) resulting in visual drift and duplicated DOM logic.
**Expected behavior:** All pages migrate to the shared polymorphic `<Button>` and unified `<Input>` components.
**Status:** ✅ COMPLETED (Migrated ProfilePage, AddressesPage, OrdersPage, CheckoutPage, HomePage, ProductDetailPage, CartPage, HelpPage, CategoryPage, and OrderTrackingPage.)

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
