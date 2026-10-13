# PMart Security

_Updated 2026-10-13 for the rebuilt backend. Report vulnerabilities privately to the project owner._

## Authentication
- Phone + password for every role; bcrypt hashes. Passwords: at least 8 characters.
- Access token: JWT signed with `JWT_SECRET` (production requires 32+ characters, no weak words), default 1 hour.
- Refresh token: random, sent only as an httpOnly, `SameSite` cookie on `/api/auth`, stored as a sha256 hash,
  rotated on every refresh (a reused old token is rejected). Logout and deactivation clear it.
- Store owners and riders start with an admin-set temporary password and are blocked from every route except
  `/auth/me`, `/auth/password` and `/auth/logout` until they change it (`MUST_CHANGE_PASSWORD`).
- Staff activate through a one-time link (72 hours, single use, stored as a hash).
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
| Scope | Limit |
|---|---|
| All API requests | 600 / 15 min per IP |
| Login, Google sign-in | 10 / 15 min |
| Register, complete profile | 10 / hour |
| Password change, activation | 10 / 15 min |
| Checkout | 20 / 15 min |
| Delivery-code verify/resend | 15 / 15 min |
| Admin mutations | 300 / 15 min |
| Catalog search | 60 / min |
| Rider location | 40 / min |
| Road routing | 30 / min |
`trust proxy` is set to 1 so limits apply to the client IP behind one proxy.

## Transport and headers
- Helmet defaults; `X-Powered-By` disabled; JSON bodies limited to 200 kB.
- CORS and Socket.IO accept only `ALLOWED_ORIGINS` in production (plus localhost/loopback ports in development);
  other origins get 403 `CORS_FORBIDDEN`. Sockets require a valid JWT and are authorised per room.
- Errors return a stable `code` and a request id; unexpected 5xx messages and stack traces are never sent to clients.

## Data
- `checkout` is idempotent per customer and runs in a transaction; stock can't go negative.
- Admin/store changes are written to `auditlogs`.
- CSV exports escape values that start with `=`, `+`, `-` or `@` (formula injection).
- Database backups and removed files live in the gitignored `backups/` folder and contain password hashes and personal
  data — keep them off shared drives and delete them when no longer needed.

## Known issues
- A MapTiler API key is in git history and is still the key in `.env` — rotate it (Remaining Work R1).
- No self-service password reset; see `docs/PMart_RECOVERY_PROCEDURE.md` (Remaining Work R18).
- Phone numbers are not verified by OTP at registration (Remaining Work R9).
