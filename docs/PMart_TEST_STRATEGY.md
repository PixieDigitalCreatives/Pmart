# PMart Test Strategy

## Backend (automated)
- Run: `cd backend && npm test` (Jest, `--runInBand`). 80 tests in 9 suites, all passing on 2026-10-13.
- Database: each suite starts an in-memory MongoDB **replica set** (`mongodb-memory-server`), so transactions work.
  The binary is cached in `backend/node_modules/.cache`; the first run downloads it.
- Environment: `tests/setup-env.js` sets test-only secrets and removes Firebase/MapTiler keys. Tests never touch
  `backend/.env` values that matter (`env.test.js` runs with `PMART_SKIP_DOTENV=1`).
- Data: every test builds what it needs with `tests/helpers.js` (`createUser`, `createShop`, `createCategory`,
  `createProduct`, `auth`) and `clearDb` runs after each test. There are no fixtures or seed files.

| Suite | What it covers |
|---|---|
| `auth.test.js` (16) | CORS origins and 403 handling, register/login, phone normalisation, refresh rotation and reuse, logout, deactivation, forced password change, staff activation links, profile |
| `catalog.test.js` (12) | Public settings fields, storefront visibility rules, literal search (regex/NoSQL safety), paging and sorting, derived discount, management permissions, store-owner scoping, SKU uniqueness, archive/category-in-use |
| `checkout.test.js` (11) | Server-side pricing and fees, free-delivery threshold, admin-configured fees, stock limits, concurrent last-unit checkout, idempotency (per customer), address ownership and delivery radius, paused store, mixed-store carts, cart sync |
| `order-lifecycle.test.js` (8) | Full happy path with delivery code, guards (codes, attempts, payment before delivery, transitions), stock restore once, re-dispatch, access control between customers/stores/riders |
| `address.test.js` (7) | Default address rules, server-built address line, mass-assignment protection, validation, serviceability, geocoding without a key |
| `admin.test.js` (10) | Stores with owner accounts, riders, staff and permissions, settings validation and public fields, reports, store-owner isolation |
| `socket.test.js` (3) | Socket authentication and room authorisation |
| `env.test.js` (4 + table) | Required variables, production secret rules, CORS origin helper |
| `routing.test.js` (3) | OSRM client, caching and errors (network mocked) |

## Web app
- `npm run build` must succeed; `npm run lint` (oxlint). For undefined-identifier checks run
  `npx oxlint -D no-undef -D no-unused-vars src` and ignore browser globals.
- There is **no automated browser suite** at the moment (see Remaining Work R4). The previous Playwright suite relied
  on seeded demo accounts and was removed.

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
