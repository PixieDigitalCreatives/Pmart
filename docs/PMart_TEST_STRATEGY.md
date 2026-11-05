# PMart Test Strategy

## Backend (automated)
- Run: `cd backend && npm test` (Jest, `--runInBand`). 142 tests in 11 suites, all passing on 2026-11-05 (after M0
  security hardening). If the mongod download is blocked, point `MONGOMS_SYSTEM_BINARY` at the cached binary in
  `backend/node_modules/.cache/mongodb-memory-server/`.
- Rate limits are skipped in test unless `RATE_LIMIT_IN_DEV=true`; the flag is read per request, so a test can switch
  it on for itself (see "sign-in throttling" in `auth.test.js`). Use unique phone numbers there: limiter counts live in
  memory for the whole test file.
- Database: each suite starts an in-memory MongoDB **replica set** (`mongodb-memory-server`), so transactions work.
  The binary is cached in `backend/node_modules/.cache`; the first run downloads it.
- Environment: `tests/setup-env.js` sets test-only secrets and removes Firebase/MapTiler keys. Tests never touch
  `backend/.env` values that matter (`env.test.js` runs with `PMART_SKIP_DOTENV=1`).
- Data: every test builds what it needs with `tests/helpers.js` (`createUser`, `createShop`, `createCategory`,
  `createProduct`, `auth`) and `clearDb` runs after each test. There are no fixtures or seed files.

| Suite | What it covers |
|---|---|
| `auth.test.js` (19) | CORS origins and 403 handling, register/login, phone normalisation, `SameSite=Strict` cookie, refresh rotation and reuse, logout, deactivation, access-token algorithm/issuer/audience pinning, forced password change, staff activation links, profile, per-number sign-in limit with forged IPs |
| `catalog.test.js` (12) | Public settings fields, storefront visibility rules, literal search (regex/NoSQL safety), paging and sorting, derived discount, management permissions, store-owner scoping, SKU uniqueness, archive/category-in-use |
| `checkout.test.js` (11) | Server-side pricing and fees, free-delivery threshold, admin-configured fees, stock limits, concurrent last-unit checkout, idempotency (per customer), address ownership and delivery radius, paused store, mixed-store carts, cart sync |
| `order-lifecycle.test.js` (9) | Full happy path with delivery code, guards (codes, attempts, payment before delivery, transitions), stock restore once, re-dispatch, staff payment-status overrides (reason, audit before/after, no refund of uncollected cash), access control between customers/stores/riders |
| `address.test.js` (7) | Default address rules, server-built address line, mass-assignment protection, validation, serviceability, geocoding without a key |
| `admin.test.js` (11) | Stores with owner accounts, riders, staff and permissions, activation-link escalation, settings validation and public fields, reports, store-owner isolation |
| `socket.test.js` (3) | Socket authentication and room authorisation |
| `env.test.js` (5 + table) | Required variables, production secret rules, production `ALLOWED_ORIGINS` rules (required, exact, https, no wildcards), CORS origin helper incl. dev wildcards |
| `routing.test.js` (3) | OSRM client, caching and errors (network mocked) |
| `inventory.test.js` (21) | CSV import (raw fields, leading zeros, negatives → 0, duplicates never overwritten, codes differing by a space, mapping, double commit, rollback), export round-trip, barcode/code lookup, search filters, add product for unknown barcode, category to list online, ledger-backed stock edits, price-change audit, restock, adjustments, image candidates (Open*Facts mocked), verification rules, upload rules, private-URL refusal, store-manager permissions |
| `billing.test.js` (17) | Invoice maths, stock deducted exactly once (repeat + concurrent), negative-stock and price-override permissions, no-price refusal, GST settings, payments (full/partial/multiple/overpay), overdue and filters, dashboard, cancellation, returns, invoice delete (admin only, reason required, cancelled and live part-paid invoices, partial return, payments removed, ledger kept, audit snapshot, replay, concurrent deletes, number not reused), PDF, reports JSON/CSV/PDF, online orders in the ledger |

## Web app
- `npm run build` must succeed; `npm run lint` (oxlint). For undefined-identifier checks run
  `npx oxlint -D no-undef -D no-unused-vars src` and ignore browser globals.
- There is **no automated browser suite** at the moment (see Remaining Work R4). The previous Playwright suite relied
  on seeded demo accounts and was removed.

## Browser checks without touching the live database (2026-11-04)
The inventory/billing screens were exercised against a **sandbox API**: an in-memory MongoDB replica set
(`mongodb-memory-server`) loaded with a copy of `order.csv`, one store and session-only test accounts, served on its own
port with the Vite dev server pointed at it (`VITE_API_BASE_URL=/api`, `PMART_API_TARGET=http://localhost:<port>`).
Note that the root `.env` points `VITE_API_BASE_URL` at the deployed Render API, so override it for local checks.

## Security-header check (2026-11-05, M0)
The Content-Security-Policy and other headers in `vercel.json` were checked without deploying:
1. Sandbox API: in-memory replica set (`MONGOMS_SYSTEM_BINARY`), `PMART_SKIP_DOTENV=1`, random test-only secrets,
   `RATE_LIMIT_IN_DEV=true`, one store, one category, six sandbox products, session-only admin/customer/owner accounts.
2. Production build: `MSYS_NO_PATHCONV=1 VITE_API_BASE_URL=/api VITE_SOCKET_URL=http://localhost:<port> npx vite build
   --outDir <scratch dir>`. In Git Bash, `MSYS_NO_PATHCONV=1` is needed — otherwise `/api` is rewritten to
   `C:/Program Files/Git/api` and every request fails with "Unsupported protocol C:".
3. Served with Vite's `preview()` (no project config), the `"/(.*)"` headers read from `vercel.json`, and `/api` +
   `/socket.io` proxied to the sandbox (as the Vercel rewrite does).
4. Pages opened with the browser console watched for "Content Security Policy" errors; an inline `<script>` was
   injected to confirm violations are blocked and reported. Results are in the Feature Status Matrix (Security rows).
Repeat the console check on the real Vercel deployment after each release (Deployment doc, "Security headers").

## UI layout checks (2026-11-04 redesign)
Done on the same kind of sandbox (in-memory replica set, one store, six categories, 42 sandbox products without photos,
three orders placed through the API, session-only admin / store owner / rider / customer accounts), with the Vite
dev server on its own port pointed at it. Each role was signed in on its own loopback origin (`localhost`,
`127.0.0.1`, `127.0.0.2`, `127.0.0.3`; a fifth origin for signed-out pages) so the sessions don't collide.
- **Overflow**: a small script loaded every routed screen in an off-screen iframe at 375, 768 and 1440 px and reported
  any element wider than the viewport outside a scroll container, plus tables clipped by an `overflow: hidden` parent.
- **Card sizes**: product card, media box, category tile, ADD button and KPI tile measured with `getBoundingClientRect`
  before and after the redesign.
- **Buttons**: computed background/colour of text and icon buttons built on `<Button>` (they used to inherit the red fill).
- **Screenshots** of the main screen of each portal at desktop and phone widths.
The results are in the [UI Design System](PMart_UI_DESIGN_SYSTEM.md) §6 and the Feature Status Matrix (UI rows).

## Manual browser run (how the 2026-10-13 verification was done)
1. Start the API (`backend`, e.g. `PORT=5007 node src/server.js`) and the web app with
   `PMART_API_TARGET=http://localhost:5007 npx vite --port 5180`.
2. Create a temporary admin with `npm run create-admin` and generated credentials kept outside the repo.
3. Use separate loopback origins for separate sessions (`localhost`, `127.0.0.1`, `127.0.0.2` — each has its own
   storage and cookies; development CORS accepts all of them).
4. Walk the flow: admin creates store (with owner), categories, products, rider, staff → customer registers, adds
   an address, checks out → store accepts, packs, readies, assigns → rider changes password, goes online, picks up,
   starts, arrives, collects cash, enters the code → check customer tracking, admin reports/payments/CSV. Then the
   unhappy paths: customer cancel, store reject, rider "could not deliver" → send out again → cancel. Check stock after each.
5. Delete everything afterwards: drop the collections and run `npm run db:init` again.

The results are recorded in the [Feature Status Matrix](PMart_FEATURE_STATUS_MATRIX.md).
