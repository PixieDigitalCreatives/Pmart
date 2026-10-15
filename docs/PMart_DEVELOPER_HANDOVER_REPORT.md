# PMart Developer Handover Report

_Last updated 2026-10-13, after the MongoDB collection rebuild and the removal of all mock, demo and test data._

## 1. Summary
PMart is a quick-commerce grocery platform: customers order from a nearby darkstore, the store packs the order,
a rider delivers it and collects cash, and the customer confirms the handover with a delivery code. One backend
serves four portals: customer storefront (`/`), store portal (`/shop`), rider app (`/rider`) and admin console (`/admin`).

Status: every portal has been exercised end to end in a browser against the real backend and an empty database
(see the [Feature Status Matrix](PMart_FEATURE_STATUS_MATRIX.md) for exactly what was and was not verified), and 80
backend tests pass. The database ships **empty** — there is no seed or demo data.

## 2. Stack
- **Web app**: React 19, Vite 8, React Router 7, SCSS (design tokens in `src/styles`, utility classes in
  `_utilities.scss`), Framer Motion, Lucide icons, Socket.IO client, MapTiler SDK / MapLibre GL for maps. JavaScript (no TypeScript).
- **Backend**: Node.js (CommonJS), Express 5, Mongoose 8 on MongoDB Atlas, zod validation, JWT + rotating
  refresh cookie, bcrypt, Socket.IO, Winston. Tests: Jest + Supertest + mongodb-memory-server (replica set).
- **External services**: MapTiler (tiles, geocoding), public OSRM server (road routes), Firebase (optional Google sign-in).

## 3. Repository layout
```
src/                       web app
  components/{ui,common,order,delivery,tracking,shop,rider,admin,product}
  context/                 AuthContext, CartContext (also public settings), LocationContext, ToastContext
  pages/{auth,customer,shop,rider,admin}
  routes/                  AppRoutes (all routes + role/permission guards), RoleGuard
  services/                apiClient (token refresh), one service per API area, socket.js
  types/orderTypes.js      statuses, labels, tones, payment display helper
backend/src/
  app.js, server.js, models.js
  config/                  env (validated), db, socket, firebase-admin
  middleware/              auth (protect/authorize/permissions), error, rate-limit
  modules/{auth,users,address,shop,catalog,cart,order,rider,admin,routing}
  scripts/                 db-init.js, create-admin.js, populate_catalog_images.js
  utils/                   validation, http-error, auth, geo, time, transaction, encryption, logger
backend/tests/             Jest suites (see Test Strategy)
docs/                      this documentation
backups/                   gitignored: database backup and files removed in the rebuild
```

## 4. Running locally
1. `cd backend && npm install`, create `backend/.env` (see [Environment Reference](PMart_ENVIRONMENT_REFERENCE.md)).
2. `npm run db:init` — creates the 11 collections, indexes and the settings document.
3. `npm run create-admin -- --name "Your Name" --phone 98XXXXXXXX` — first administrator (password from `ADMIN_PASSWORD` or a prompt).
4. `npm run dev` (nodemon) — API on `PORT` (default 5000).
5. In the project root: `npm install`, then `npm run dev`. Vite proxies `/api` and `/socket.io` to `PMART_API_TARGET`
   (default `http://localhost:5000`); set it if the API runs elsewhere.
6. Sign in as the admin and set up the business: **Stores** (creates the store owner account), **Categories**,
   **Products** (single form or bulk Excel/CSV upload with validation), **People → Riders**, **Settings** (fees, support contact).

For cloud deployment (Render backend + Netlify frontend + MongoDB Atlas), see the [Deployment Guide](PMart_DEPLOYMENT_GUIDE.md). Infrastructure as code configurations are provided in `render.yaml` and `netlify.toml`.

## 5. Authentication and access
- Phone + password for every role (phones stored as `+91…`). Optional Google sign-in needs Firebase on both sides.
- Access token (JWT, 1 h) in `localStorage`; refresh token in an httpOnly cookie on `/api/auth`, rotated on use and
  stored hashed. `apiClient` refreshes silently on 401; only a 401/403 from the refresh ends the session (network errors don't).
- Store owners and riders are created by an admin with a temporary password and must change it at first sign-in
  (`mustChangePassword`, enforced by the backend). Staff (employees) get a one-time activation link instead.
- Employees have granular permissions; the admin navigation and routes hide what they can't use, and the API enforces it.

## 6. Order lifecycle
`PENDING → ACCEPTED → PREPARING → READY → ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → ARRIVED → DELIVERED`, with
`REJECTED`, `CANCELLED` and `DELIVERY_FAILED` (which the store can send out again). The full table of who can make
each move is in the [API Reference](PMart_API_REFERENCE.md). Key rules:
- Checkout is cash-on-delivery only, priced from current product prices and `settings`, idempotent per customer, and
  reserves stock in a transaction. Only stores within their delivery radius of the address can take the order.
- Rider assignment atomically claims an available rider; riders carry one order at a time.
- The delivery code is generated when the order goes out for delivery (`OUT_FOR_DELIVERY`), shown only in the
  customer's order page, stored encrypted + hashed, valid 60 minutes, 5 attempts. Delivery needs cash collected and the code verified.
- Cancel/reject restores stock exactly once (`inventoryRestored`).
- Live updates: status changes emit `order_status_update`; rider GPS (`POST /rider/location`, throttled to one every
  4 s in the app) emits `rider:location:update` to the customer, store and admin views.

## 7. Portals
- **Customer**: home rows driven by product tags, category/search/product pages, offers (products priced below MRP),
  cart (guest cart merges into the account at sign-in), address book with map pin + search, checkout, live tracking
  with ETA, order history with reorder, profile, help with support contact from settings.
- **Store**: dashboard (today's numbers, open orders, low stock), orders with accept → pack → ready → assign rider,
  products and categories, riders board, analytics (30 days), store settings (hours, accepting orders).
- **Rider**: online/offline, current delivery, pickup → start → arrived → collect cash → enter code, "could not deliver",
  history, vehicle details.
- **Admin**: overview with setup checklist, live deliveries map, orders (filters, CSV export), stores, products,
  categories, people (customers, riders, staff), payments (cash ledger), reports (sales, category split, delivery time,
  audit log), settings.

## 8. Things to know
- **No demo data anywhere.** Empty lists show empty states. Don't add fallback data to screens.
- **Maps need `VITE_MAPTILER_API_KEY`.** The key currently in `.env` was committed to git earlier and must be rotated.
- **Transactions need a replica set.** Atlas is fine; a plain local `mongod` is not.
- **SCSS files must not start with a UTF-8 BOM.** Vite prepends the shared `@use` lines, which pushed a BOM into the first selector of `LoginPage.scss` and silently disabled it. `vite.config.js` now strips BOMs, but save files as UTF-8 without BOM.
- **Rate limits** are off in development unless `RATE_LIMIT_IN_DEV=true`.
- **MARG ERP integration** is a stub and stays disabled (no API specification; see `DECISIONS.md`).

## 9. What was removed in the 2026-10-13 rebuild
Old TypeScript backend sources, seed/demo/mock scripts and data, the Playwright e2e suite (it depended on seeded demo
accounts), the development rider auto-progress simulator, the fake SMS notifier, mock Firebase, fake chat, fake
coupons and KPIs, a hard-coded map key, hard-coded city defaults, and debug scripts. Everything removed was moved
(not deleted) to the gitignored `backups/removed-2026-10-13/`. The previous database is in `backups/mongo-pmart-2026-10-13/`.

## 10. Recommended first tasks
See [Remaining Work](PMart_REMAINING_WORK.md). Start by rotating the MapTiler key, then write a new browser e2e
suite that creates its own data through the admin console and cleans up after itself.
