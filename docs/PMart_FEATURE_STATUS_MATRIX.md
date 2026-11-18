# PMart Feature Status Matrix

_Re-baselined 2026-10-13 after the database rebuild. Earlier "VERIFIED" entries referred to the removed TypeScript
backend and the seeded Playwright suite and no longer apply._

**Evidence keys**
- **API** — covered by the backend Jest suites (`backend/tests`, 80 tests passing on 2026-10-13; 129 on 2026-11-04 after the inventory/billing module; 132 on 2026-11-05 after invoice delete; 142 on 2026-11-05 after the M0 security hardening). Inventory/billing UI rows were checked on 2026-11-04 against a sandbox API with an in-memory copy of the data (see Test Strategy).
- **UI rows (2026-11-04 redesign)** — checked against a sandbox API (in-memory MongoDB, test accounts, sandbox products without photos) with a visible browser: screenshots and layout measurements, not the live database.
- **UI** — exercised on 2026-10-13 in a browser (Vite dev server + real backend + the Atlas database, starting empty)
  by driving the page's own forms and buttons through DOM events, then checking page text, network calls and the
  database. The browser window was not visible, so **layout and visuals were not checked** (no screenshots), and maps
  could not render. All verification data was deleted afterwards.

| Area | Feature | Status | Evidence / notes |
|---|---|---|---|
| Setup | `db:init`, `create-admin` | VERIFIED | Ran against Atlas: 11 collections + indexes + settings; admin created and signed in |
| Auth | Phone + password sign-in (all roles), register | VERIFIED | API (auth tests) + UI (admin, owner, rider, staff, customer) |
| Auth | Forced password change for owners/riders | VERIFIED | API + UI (both redirected to change password, then into their portal) |
| Auth | Staff activation link | VERIFIED | API + UI (link created in People → Staff, opened in another session, password set, sign-in) |
| Auth | Refresh rotation, logout, deactivated accounts | VERIFIED | API; UI: deactivating a customer made their token and refresh fail immediately (401 `ACCOUNT_DEACTIVATED`) |
| Auth | Session survives a server restart / network error | VERIFIED | UI after fix (previously any failed `/auth/me` signed the user out) |
| Auth | Sign-in / sign-up page layout | VERIFIED | Screenshots 2026-10-13 at 1918×996 (card centred, 1000 px) and 375×812 (single column with compact logo). Fixed: a BOM in `LoginPage.scss` disabled the page wrapper rule, pinning the card top-left |
| Auth | Google sign-in | NOT VERIFIED | No Firebase Admin credentials in this environment; button now hidden unless the server reports it is configured |
| Security | CORS (403 `CORS_FORBIDDEN`, dev loopback ports) | VERIFIED | API tests + env tests |
| Security | Production CORS = exact `ALLOWED_ORIGINS` only; start-up refuses a missing list, `*`, wildcards or `http://` (2026-11-05) | VERIFIED (API) | `env.test.js` (5 new start-up cases; `evil.vercel.app`, `pmart-evil.netlify.app`, look-alike suffix refused). Not checked on Render |
| Security | Refresh cookie `SameSite=Strict` by default | VERIFIED (API) | `auth.test.js` register test checks the `Set-Cookie` header |
| Security | Failed sign-ins limited per mobile number (8 / 15 min) whatever the client IP; other money/credential limits per signed-in user | VERIFIED (API) | `auth.test.js` "sign-in throttling": 8 failures from 8 forged IPs, 9th (correct password) → 429, other number unaffected; successful sign-ins not counted. Production deployment not checked |
| Security | Access tokens HS256 with issuer/audience; others refused (REST + sockets) | VERIFIED | `auth.test.js` (no iss/aud, wrong audience, HS512, `alg: none` → 401); `socket.test.js`; sandbox browser sign-in for admin and customer on a production build |
| Security | Activation link regeneration can't hand out higher permissions | VERIFIED (API) | `admin.test.js`: staff manager → 403 `PERMISSION_ESCALATION` for an employee with `settings.manage`, 200 for a subset; admin unaffected |
| Security | Staff payment-status override needs a reason, is audited (before/after), never refunds uncollected cash | VERIFIED (API) | `order-lifecycle.test.js`. No staff UI calls this endpoint (riders only send `COLLECTED`) |
| Security | Web security headers (CSP, HSTS, Permissions-Policy) | VERIFIED (sandbox) | Production build served with the `vercel.json` headers against a sandbox API: storefront, search, sign-in, admin overview, live map (tiles loaded), products, new invoice, invoice detail, images, reports, people, settings, customer address map + MapTiler search — no CSP violations; injected inline script blocked. **NOT VERIFIED:** on Vercel/Netlify themselves, Google sign-in (not configured), sockets to Render, invoice PDF download |
| Deploy | Production on `www.thepmart.in` (Vercel) + `api.thepmart.in` (Render) | PARTLY VERIFIED | Outside checks only, 2026-11-05 ~16:00 IST: API health OK and DB connected on `api.thepmart.in`; `www.thepmart.in` 200 with CSP/HSTS; `www.thepmart.in/api/health` 200 through the rewrite; CORS preflight 204 for `https://thepmart.in` and `https://www.thepmart.in`, 403 for `https://evil.vercel.app`. **Bare `https://thepmart.in` fails (certificate error, extra DNS `A` record)** — Remaining Work R19. NOT VERIFIED: signing in, sockets, maps, orders on the live site |
| Security | Permission-gated admin (nav, routes, API) | VERIFIED | API + UI with a limited employee (only Overview/Live/Orders/Settings visible; People shows "No access"; `/api/admin/riders` 403; Settings read-only) |
| Customer | Home rows, categories, search, product page, offers, help | VERIFIED | UI with real products; empty-state home with no products |
| Customer | Guest cart → account merge, server cart | VERIFIED | UI (2 items added as guest, present on server after registration) |
| Customer | Address book: search pin, details, default, edit | VERIFIED | UI (MapTiler search + keyboard selection; server rebuilds the address line) |
| Customer | Address map pin by dragging / GPS | NOT VERIFIED | Map can't render and geolocation is blocked in the test browser |
| Customer | Serviceability (store radius) | VERIFIED | API (address + checkout tests); UI address inside the 6 km radius accepted |
| Customer | Checkout (COD, fees, idempotency, stock reserve) | VERIFIED | API (checkout + concurrency tests) + UI (₹56 + ₹15 + ₹5 = ₹76; stock 50 → 48) |
| Customer | Live tracking: status + rider location + ETA | VERIFIED | UI: statuses updated without reload; rider position posted via the rider API moved the page from "waiting" to ETA/distance |
| Customer | Live tracking map drawing | NOT VERIFIED | Needs a visible window |
| Customer | Cancel order, store rejection message | VERIFIED | UI (cancel restored stock; rejection shows "declined by the store" + reason) |
| Customer | Orders list, reorder, profile edit | VERIFIED | UI |
| Store | Dashboard, orders board + tabs, analytics, settings, riders board | VERIFIED | UI with real orders |
| Store | Accept → pack → ready → assign rider | VERIFIED | API + UI |
| Store | Reject with reason, cancel, send out again after failure | VERIFIED | API + UI (stock restored exactly once) |
| Store | Products CRUD (own store), low stock | VERIFIED | API + UI (as admin; owner product list checked) |
| Store | Bulk product actions (bulk delete, bulk out of stock, bulk visible/hidden) | VERIFIED | API (`catalog.test.js` bulk update & delete tests) + UI (table selection bar, action buttons, confirmation modals) |
| Store | Bulk product upload (.xlsx / .csv with live preview & validation) | VERIFIED | API (`catalog.test.js` bulk suite) + UI (drag-and-drop modal, XLSX/CSV template generator) |
| Rider | Online/offline, assignment appears live | VERIFIED | UI |
| Rider | Pickup → start → arrived → collect cash → code → delivered | VERIFIED | API + UI (wrong code: "4 attempt(s) left"; right code delivered; rider back online, stats updated) |
| Rider | Could not deliver | VERIFIED | API + UI |
| Rider | GPS sharing from the device | NOT VERIFIED | Geolocation blocked in the test browser (the page shows the permission message) |
| Rider | History, vehicle edit, go offline and sign out | VERIFIED | UI |
| Admin | Overview, orders (+CSV), payments, reports (+CSV), audit log | VERIFIED | API + UI with real data; CSV formula-escaped |
| Admin | Stores create/edit (creates owner account) | VERIFIED | API + UI |
| Admin | Categories, products, riders, staff, customers (deactivate/reactivate) | VERIFIED | API + UI |
| Admin | Settings (fees, SLA, low stock, support contact) | VERIFIED | UI; public settings and Help page reflect the change |
| Admin | Live deliveries map | PARTIALLY VERIFIED | List and API verified; map not rendered (hidden window) |
| Platform | Socket reconnect after API restart | VERIFIED | UI sessions kept receiving updates after restarts |
| UI | Whole-app redesign on one design system (tokens, brand surface, shared components; see UI Design System) | VERIFIED | 2026-11-04, sandbox API: main screens of every portal viewed and screenshotted (storefront desktop + phone, checkout, store dashboard, rider home, admin overview, inventory products, new invoice, sign-in). Card sizes measured unchanged. Maps, modals in every state and real devices not checked. 2026-11-05: home hero removed at the owner's request; home page checked against the live API (categories first, 16–24 px below the header, no horizontal overflow). Empty band under the footer on short pages fixed: measured at 1440 × 900 (home: footer ends at 900 px, the window bottom; Help: footer follows the content) and 375 × 812 (only the 62 px kept for the bottom nav) |
| UI | No horizontal overflow at 375 / 768 / 1440 px | VERIFIED | 2026-11-04, sandbox: every routed screen of all portals and the auth pages measured in off-screen frames at each width (no element wider than the viewport outside a scroll container; wide tables scroll inside their card). Six layout bugs fixed during the check (see UI Design System §6) |
| UI | Text/icon buttons built on `<Button>` no longer show the red primary fill | VERIFIED | 2026-11-04, sandbox: computed styles checked in the browser for Cart/Checkout "Change", Share, Clear cart, search filters, address edit/delete, profile sign-out, header profile button, and the store/admin menu, close and sign-out buttons (768 px). Cart-drawer close and quantity buttons not checked |
| Catalog | Products with a verified photo listed online (2026-11-05) | VERIFIED | Live database, at the owner's request, after a backup: `list-products-with-photos.js` listed 1,400 products (verified photo, price above 0; flagged photos and ₹0 items skipped). Browser: search shows "1400 items" with their photos, home shows a "New in store" row. Category pages stay empty until products have categories (R23) |
| Catalog | Imported products sorted into categories (2026-11-05) | PARTIALLY VERIFIED | Live database, at the owner's request, after a backup: 6,723 of 8,034 products categorised by name keywords (rules spot-checked by sampling every group; not every product reviewed), 5 categories added. Browser/API: category pages list their products (e.g. Grocery & Staples 749, Personal Care 337); listed-and-categorised products total 1,298 of 1,400. 1,311 products still without a category |
| UI | Storefront home, header and footer rebuilt to the owner's mockup (2026-11-05) | VERIFIED | 2026-11-05, sandbox: home viewed and screenshotted at 1440 / 768 / 375 px; no horizontal overflow on the storefront and auth pages at the three widths. Not seen with real category images (sandbox categories have none) |
| UI | Icons from react-icons only (lucide-react removed) | VERIFIED | 2026-11-05: no `lucide-react` import left in `src/`, package removed, build passes; admin, store and rider screens viewed in the sandbox with the new icons (no missing or oversized icon). Not every modal/drawer opened |
| UI | "Image Not Available" placeholder styling (redesign) | VERIFIED | 2026-11-04, sandbox (products without photos): placeholder seen on product cards in home rows, category, search and offers, on the product page and in the cart. Says nothing about verified photos, which the sandbox did not have (see the Images rows) |
| Inventory | Import of `order.csv` (8,034 rows) into Atlas | VERIFIED | 2026-11-04: dry run + commit; 8,034/8,034 created, every raw field compared with the file, leading zeros intact (see Inventory & Billing §9). API: import tests |
| Inventory | CSV import UI (upload, mapping, preview, report, history) | PARTIALLY VERIFIED | API tests (mapping, duplicates, failures, double commit, rollback). UI: page and import history checked on the sandbox; file upload through the page was not driven (the 8,034-row import was done with the same service from the CLI) |
| Inventory | CSV export with original 17 columns | VERIFIED | API (round-trip of `+000462`, `0012345678905`) |
| Inventory | Product form with all CSV fields, original CSV values, shared-barcode / similar-name warnings | VERIFIED | API + UI (sandbox: scanned barcode opened the product, all fields and raw values shown) |
| Inventory | Barcode lookup (barcode incl. UPC/EAN forms, product code, shared barcodes) | VERIFIED | API + UI (sandbox scans on Products, Restock, New invoice) |
| Inventory | Unknown barcode → Add product (prefill from Open*Facts, must be confirmed) | PARTIALLY VERIFIED | API (create with shared-barcode warning; external lookup returns `verified: false`). UI prefill flow not driven |
| Inventory | Restock (scan / search, received + free, rate change, supplier, reference) | VERIFIED | API (incl. idempotent replay) + UI (sandbox: 0 + 10 + 2 = 12, RST-000001, ledger row) |
| Inventory | Stock ledger and manual adjustments | VERIFIED | API (reason required, permission, idempotent) + UI (ledger page; scan filters to the product; adjustment dialog opened and product picked by scan, saving not driven) |
| Inventory | Online orders and cancellations in the stock ledger | VERIFIED | API (ONLINE_ORDER / ONLINE_ORDER_REVERSAL rows) |
| Images | Candidate search by exact barcode, verification workflow, public serving of approved photos only | VERIFIED | API (mocked sources). Live, 2026-11-04/05: about 31 approved one by one by the owner, then 1,577 bulk-approved at the owner's request (`images:approve-pending`); 1,608 verified in total; 20 random photos served as JPEG, pending photos return 404. The bulk approval skipped the per-photo review: 208 photos are flagged as possibly wrong (`backups/photos-to-check-2026-11-05.csv`) |
| Images | Storefront shows only verified photos, "Image Not Available" otherwise | NOT VERIFIED | Code changed (ProductCard, product page, cart); imported products are not listed online yet, so not seen on the storefront |
| Billing | Invoice by scan/search, qty by repeat scan, partial payment, PDF, print | VERIFIED | API (maths, idempotency, concurrency, PDF bytes) + UI (sandbox INV-000001). Printing itself and the PDF's appearance were not inspected |
| Billing | Stock deducted exactly once; negative stock blocked / admin override; price override permission | VERIFIED | API |
| Billing | Payments (full, partial, multiple), overdue, filters, payment history | VERIFIED | API + UI (sandbox: ₹50 + ₹70 → Paid) |
| Billing | Cancellation (stock back, refund) and returns | VERIFIED | API + UI cancellation (returns UI not driven) |
| Billing | Delete invoice (admin only; a live invoice is cancelled first, then the invoice and its payments are removed; ledger kept; audit snapshot; number not reused) | VERIFIED | API (3 tests: permissions, cancelled and live part-paid invoices, partial return, replay, concurrent deletes, number gap) + UI 2026-11-05 on a sandbox API: delete from the Invoices list (cancelled invoice) and from an invoice page (part-paid, refund by UPI, stock back in the ledger), unpaid invoice at 375 px, Store Manager sees no action / 403. Dialog look not seen in a screenshot (hidden window). The owner's live INV-000001 has **not** been deleted (Remaining Work R31) |
| Billing | GST / non-GST, CGST+SGST split, settings | PARTIALLY VERIFIED | API; Settings page section not driven in the browser |
| Billing | Billing overview dashboard | VERIFIED | API + UI (sandbox) |
| Simple ERP | Marg-inspired Simple ERP Dashboard (8 big action cards, KPI tiles, Hindi default + English) | VERIFIED | UI + API. 8 main action buttons, real-time sales/dues tiles, and speech feedback verified |
| Language & Voice | Hindi (default) + English language switcher with localStorage preference & browser speech synthesis | VERIFIED | UI context + Web Speech API integration. Natural everyday Hindi labels across all ERP routes |
| Fast POS Billing | Touch counter POS interface with walk-in, quick customer modal, split payments, amounts in words | VERIFIED | UI + API |
| Restock | Simple Goods Inward (Barcode Method A, Search Method B, Quick-Register Method C with stock confirmation) | VERIFIED | UI + API. Tested product creation with opening stock & auto-selection |
| Customer Ledger | Customer profiles, credit limits, chronological statements with running balance, PDF/Print | VERIFIED | UI + API (`/api/billing/customers`, `/api/billing/customers/:id/statement`) |
| Outstandings | Dedicated customer dues management, single-click collection modal, and payment receipts | VERIFIED | UI + API (`/api/billing/outstandings`, `/api/billing/invoices/:id/payments`) |
| Reports | 13 inventory/sales/payment reports, CSV and PDF | VERIFIED | API (JSON/CSV/PDF) + UI (report page, inventory report) |
| Access | Store Manager preset and permissions | VERIFIED | API (forbidden actions) + UI (sandbox store manager: billing/inventory menus only, no add/import/delete) |
| Scanner | USB keyboard-wedge scanner, camera scanning | NOT VERIFIED | Simulated keystrokes + Enter on Products, Restock, New invoice, Stock ledger and Overview (any admin screen opens the product). 2026-11-05 (sandbox, simulated): scans now also work with the cursor in another text box (the code is taken back out of it) and from slower scanners (gaps up to 100 ms); normal typing in a box is not mistaken for a scan; unknown barcode opens Add product. No scan from the physical scanner has been confirmed (the owner's scan of 8906115882758 reached a chat window, and that barcode is on no product); no camera used |
| Integration | MARG ERP | BLOCKED | No API specification (see `DECISIONS.md`) |
| Payments | Online payments | NOT STARTED | COD only by decision |
| Testing | Browser e2e suite | NOT STARTED | The old Playwright suite depended on seeded demo accounts and was removed |

**Legend:** VERIFIED — automated test and/or recorded browser run passed. PARTIALLY VERIFIED — part checked, gaps
listed. NOT VERIFIED — implemented but not executed here. NOT STARTED. BLOCKED.
