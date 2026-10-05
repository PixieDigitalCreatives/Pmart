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
