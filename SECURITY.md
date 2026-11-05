# PMart Security

_Updated 2026-11-05 (M0 hardening from the [Security & Compliance Audit](docs/PMart_SECURITY_COMPLIANCE_AUDIT.md)). Report vulnerabilities privately to the project owner._

## Authentication
- Phone + password for every role; bcrypt hashes. Passwords: at least 8 characters.
- Access token: JWT signed with `JWT_SECRET` (production requires 32+ characters, no weak words), default 1 hour.
  Verified with HS256 only and a fixed issuer (`pmart-api`) and audience (`pmart-app`) — `backend/src/utils/jwt.js`,
  used by the REST middleware and the socket handshake.
- Refresh token: random, sent only as an httpOnly cookie on `/api/auth` (`SameSite=Strict` by default; `none` only when
  `COOKIE_SAME_SITE=none`, which logs a warning in production), stored as a sha256 hash,
  rotated on every refresh (a reused old token is rejected). Logout and deactivation clear it.
- Store owners and riders start with an admin-set temporary password and are blocked from every route except
  `/auth/me`, `/auth/password` and `/auth/logout` until they change it (`MUST_CHANGE_PASSWORD`).
- Staff activate through a one-time link (72 hours, single use, stored as a hash). Only an admin, or a staff manager
  who holds every permission of that employee, can regenerate it (the link signs in as the employee).
- Google sign-in verifies Firebase ID tokens server-side; without Firebase Admin credentials it is disabled (no mock).

## Authorization
- Roles: `CUSTOMER`, `SHOP_OWNER`, `RIDER`, `EMPLOYEE`, `ADMIN`; enforced with `authorize()` on routes.
- Employees have granular permissions (`authorizePermission`/`can`); the admin console hides what they lack and the API returns 403.
- Ownership: customers see only their orders and addresses, store owners only their store's orders and products,
  riders only the order assigned to them. Order moves follow the transition table and actor rules in `order.service.js`.
- Request bodies are parsed with zod whitelists, so fields like `role`, `user`, `isActive`, `discount` or prices
  cannot be mass-assigned. Search input is escaped before use in regular expressions.

## Delivery code
Created when the order goes out for delivery; stored AES-256-GCM encrypted (for the customer's view) and bcrypt hashed
(for verification); valid 60 minutes; 5 wrong attempts lock it until a new code is generated. Never logged, never sent to the rider.

## Rate limits (production; off in development unless `RATE_LIMIT_IN_DEV=true`)
Client IPs come from `X-Forwarded-For` (`TRUST_PROXY`). Behind Vercel → Render that is correct, but a client calling the
Render URL directly can put any IP there, so IP-keyed limits are only a first line. Limits that protect accounts or money
are keyed on something the client can't rotate (`backend/src/middleware/rate-limit.js`).

| Scope | Limit | Counted per |
|---|---|---|
| All API requests | 600 / 15 min | IP |
| Login, Google sign-in | 10 / 15 min | IP |
| Login failures to one mobile number | 8 / 15 min (successful sign-ins don't count) | mobile number, any IP |
| Register | 10 / hour | IP |
| Complete profile | 10 / hour | signed-in user |
| Password change | 10 / 15 min | signed-in user |
| Activation | 10 / 15 min | IP (tokens are 256-bit) |
| Checkout | 20 / 15 min | signed-in user |
| Delivery-code verify/resend | 15 / 15 min | signed-in user |
| Admin mutations | 300 / 15 min | signed-in user |
| Catalog search | 60 / min | IP |
| Rider location | 40 / min | signed-in user |
| Road routing | 30 / min | signed-in user |
| External barcode lookup | 30 / min | signed-in user |

A per-number limit also lets someone hold a number's sign-in closed for 15 minutes by guessing; the planned account
lockout with safe recovery (audit plan M2) replaces it. Register and search stay IP-based until direct access to Render
is restricted (audit plan M12).

## Transport and headers
- Helmet defaults; `X-Powered-By` disabled; JSON bodies limited to 5 MB (12 MB for CSV imports).
- CORS and Socket.IO accept only the exact `ALLOWED_ORIGINS` in production (plus localhost/loopback ports and `*`
  patterns in development); other origins get 403 `CORS_FORBIDDEN`. Production refuses to start without
  `ALLOWED_ORIGINS` or with a wildcard or `http://` entry — the API answers credentialed requests, so a pattern such as
  `https://*.vercel.app` would let any page on that shared host act for a signed-in user. Sockets require a valid JWT
  and are authorised per room.
- Web app (`vercel.json`, `netlify.toml`): `Content-Security-Policy` (scripts only from the app and Google's sign-in
  script; connections only to the app, the Render API, MapTiler and Google APIs; no plugins, no framing, no
  `<base>` changes), `Strict-Transport-Security`, `Permissions-Policy` (camera and location for the app only),
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`. Checked on 2026-11-05 against a production build served with
  these headers (store, search, sign-in, admin console incl. live map, invoice, customer address map + search): no
  violations; an injected inline script was blocked. Not checked: Google sign-in (not configured), sockets to Render.
- Errors return a stable `code` and a request id; unexpected 5xx messages and stack traces are never sent to clients.

## Data
- `checkout` is idempotent per customer and runs in a transaction; stock can't go negative.
- Admin/store changes are written to `auditlogs`. Staff changes to an online order's payment status need a reason and
  are audited with the before/after values; `REFUNDED` is accepted only for collected cash.
- CSV exports escape values that start with `=`, `+`, `-` or `@` (formula injection).
- Database backups and removed files live in the gitignored `backups/` folder and contain password hashes and personal
  data — keep them off shared drives and delete them when no longer needed.

## Known issues
- A MapTiler API key is in git history and is still the key in `.env` — rotate it (Remaining Work R1).
- No self-service password reset; see `docs/PMart_RECOVERY_PROCEDURE.md` (Remaining Work R18).
- Phone numbers are not verified by OTP at registration (Remaining Work R9).
- Open findings and the plan to close them: [Security & Compliance Audit](docs/PMart_SECURITY_COMPLIANCE_AUDIT.md)
  (no account lockout or MFA yet, access token in `localStorage`, one session per user, no tamper-evident audit log,
  COD cash not reconciled).
- Dependencies (`npm audit --omit=dev`, 2026-11-05 after fixes): backend 7 moderate, all inside firebase-admin's
  Firestore/Storage packages that PMart does not call. Web app: `xlsx` (high, no npm fix — replacement waiting for the
  owner's choice), `maplibre-gl` (critical sanitizer bypass, no fix yet; PMart's map popups use `setText` /
  `setDOMContent`, never HTML), `@grpc/grpc-js` via Firebase Firestore (not imported by the web app), `minimatch`
  via `@maptiler/sdk` → `eslint` (not in the browser bundle).


## Implementation of Audit Hardening (M1–M12)
- **M1 (Password Visibility)**: Standardized on accessible `PasswordInput` with toggle visibility (`TbEye`/`TbEyeOff`) across all forms.
- **M2 (Auth & Account Hardening)**: Progressive lockout after 5 failed attempts (15-minute lock), admin unlock mechanism, constant-time dummy bcrypt verification on missing accounts, tokenVersion revocation on password changes and administrative resets, multi-device sessions with family rotation theft detection, and admin-issued single-use reset links.
- **M3 (Cookie Sessions & CSRF)**: Double-submit CSRF protection (`XSRF-TOKEN` cookie + `X-XSRF-TOKEN` / `X-CSRF-Token` headers), origin verification, short-lived socket tickets (`POST /api/auth/socket-ticket`), and dual-mode token support.
- **M4 (MFA & Step-up)**: Native Node.js `crypto` TOTP engine (RFC 6238 Base32, AES-256-GCM encrypted secrets, 8 single-use recovery code hashes, drift tolerance), and step-up auth for sensitive actions.
- **M5 (RBAC v2 & Approvals)**: Added `SUPER_ADMIN` role, 5 employee presets, 9 new permissions, product soft deletion (`isArchived`, `archivedAt`), and maker-checker approval workflows (`Approval` model) preventing self-approval.
- **M6 (Audit v2)**: Hash-chained tamper-evident audit logging (SHA-256 chain from `GENESIS`), sensitive field redaction, and atomic transaction write support.
- **M7 (COD Custody)**: `CodCollection` and `RiderRemittance` models tracking delivery cash handovers, variances, and reconciliation.
- **M8 (India Compliance)**: `Policy` and `PolicyAcceptance` tracking, `ConsentRecord` (DPDP), `GrievanceTicket` (48h/30d SLA clocks), `DataRequest`, and Legal Metrology/FSSAI fields.
- **M9 (Payment Gateway Ready)**: Provider-agnostic `PaymentIntent` and idempotent `PaymentEvent` store with HMAC signature verification and replay prevention.
- **M10 (Marketplace Architecture)**: `Seller` and `SellerSettlement` models supporting multi-store commissions and Section 52 TCS tax compliance.
- **M11 (Security Test Suite)**: Automated security regression suite (`backend/tests/security.test.js`) validating CSRF, injection sanitization, TOTP, approvals, audit integrity, and RBAC hierarchy.
