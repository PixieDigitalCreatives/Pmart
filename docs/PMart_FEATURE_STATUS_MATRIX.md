# PMart Feature Status Matrix

_Re-baselined 2026-10-13 after the database rebuild. Earlier "VERIFIED" entries referred to the removed TypeScript
backend and the seeded Playwright suite and no longer apply._

**Evidence keys**
- **API** — covered by the backend Jest suites (`backend/tests`, 80 tests passing on 2026-10-13).
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
| Integration | MARG ERP | BLOCKED | No API specification (see `DECISIONS.md`) |
| Payments | Online payments | NOT STARTED | COD only by decision |
| Testing | Browser e2e suite | NOT STARTED | The old Playwright suite depended on seeded demo accounts and was removed |

**Legend:** VERIFIED — automated test and/or recorded browser run passed. PARTIALLY VERIFIED — part checked, gaps
listed. NOT VERIFIED — implemented but not executed here. NOT STARTED. BLOCKED.
