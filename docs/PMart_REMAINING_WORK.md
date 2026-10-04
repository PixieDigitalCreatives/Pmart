# PMart Remaining Work Roadmap

## P0 — Blocking Issues
### ID: 001
**Title:** Final Address Flow Validation
**Current behavior:** Basic implementation complete, but untested in E2E browser setting.
**Expected behavior:** User pins map -> Reverse Geocode hits -> Form populates -> Saves to DB correctly.
**Root cause:** Needs rigorous UI testing to ensure edge cases (no GPS permissions) are handled gracefully.
**Tests required:** Playwright E2E Address Flow test.

### ID: 002
**Title:** Security IDOR Verification
**Current behavior:** API structure looks correct, but requires verification that customers cannot modify or view other customer's data by guessing IDs.
**Expected behavior:** Server returns 403/404 for unauthorized object references.
**Tests required:** API security suite.


### ID: 004
**Title:** Error Boundary and Frontend Fallbacks
**Current behavior:** Limited error boundaries for React component failures.
**Expected behavior:** Application fails gracefully showing user-friendly messages rather than white screens.

## P2 — Improvements
### ID: 005
**Title:** Route Caching Optimization
**Current behavior:** Real-time routing is polled.
**Expected behavior:** Introduce backend Redis/Memcached to prevent rate-limiting on external OSRM services if traffic spikes.

### ID: 006
**Title:** Address Normalization Tech Debt
**Current behavior:** Models store both `zipCode` and `pincode`.
**Expected behavior:** Perform a one-time DB migration and standardize entirely on `pincode`.
