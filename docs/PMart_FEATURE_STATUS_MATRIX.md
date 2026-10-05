# PMart Feature Status Matrix

| Feature | Sub-Feature | Status | Evidence / Notes | Priority |
|---------|-------------|--------|------------------|----------|
| **Auth** | Mobile + Password Login | VERIFIED | Implemented for all roles, backend validates hashes | P1 |
| **Auth** | Legacy Session Upgrade | VERIFIED | Active passwordless sessions are intercepted and routed to enrollment | P1 |
| **Auth** | Auth Rate Limiting | VERIFIED | express-rate-limit applied to login, register, setup-password | P1 |
| **Auth** | Google Auth Profile Completion | IMPLEMENTED — NOT VERIFIED | Requires testing, routes incomplete users to profile completion | P1 |
| **Auth** | Role Enforcement | VERIFIED | JWT middleware guards routes properly, E2E passing | P1 |
| **Security** | IDOR / Resource Authorization | VERIFIED | Fixed mass assignments, cross-account access, verified Rider/Admin isolation and OTP | P0 |
| **UX** | React Error Boundaries | VERIFIED | Wrapped root layouts in ErrorBoundary so failures are localized | P2 |
| **Customer** | Product Browsing | VERIFIED | Works, retrieves from MongoDB, E2E passing | P2 |
| **Customer** | Cart & Checkout | VERIFIED | State managed in React Context -> API, E2E passing | P1 |
| **Address** | Map Pin & Geocode | VERIFIED | UI exists, Maptiler handles UI, E2E passing | P0 |
| **Address** | Database Sync | VERIFIED | Snapshots correctly mapped to `Order`, E2E passing | P0 |
| **Address** | Schema Normalization | VERIFIED | Tests/seeders fixed, safe migration script created for `zipCode` & coordinates | P2 |
| **Rider** | Dashboard / Flow | VERIFIED | Rider can progress order states, E2E passing | P0 |
| **Tracking** | Rider Telemetry | VERIFIED | GPS posts to backend and emits Socket.IO, manual verified | P0 |
| **Tracking** | MapLibre Routes | VERIFIED | Replaced straight lines with OSRM roads | P0 |
| **Tracking** | Route Caching | VERIFIED | In-memory LRU cache on backend with request deduplication | P2 |
| **Tracking** | Live ETA/Distance | VERIFIED | Derived actively from routing response | P0 |
| **Admin** | Order Management | VERIFIED | Can accept/assign/prepare orders, E2E passing | P0 |
| **Admin** | Order Rejection | VERIFIED | Fixed validation failure on ZIP code | P0 |
| **OTP** | Delivery Verification | VERIFIED | Encrypted OTP mechanism is functional, E2E passing | P1 |

**Legend:**
- **VERIFIED**: E2E or automated testing passes successfully.
- **PARTIALLY VERIFIED**: Works superficially, but gaps exist.
- **IMPLEMENTED — NOT VERIFIED**: Code exists but lacks execution proof.
- **NOT STARTED**: Task is yet to be started.
- **BLOCKED**: Blocked by another issue.
- **REGRESSION**: Broken functionality that was previously working.
