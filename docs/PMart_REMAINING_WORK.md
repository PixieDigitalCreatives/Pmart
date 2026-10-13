# PMart Remaining Work

_Re-baselined 2026-10-13 after the database rebuild. The previous roadmap (IDs 001–016) described the removed
TypeScript backend, its seed data and the Playwright suite; it is kept in git history only._

## P0 — before going live
| ID | Item | Why | Done when |
|---|---|---|---|
| R1 | **Rotate the MapTiler key** | The key in `.env` (`VITE_MAPTILER_API_KEY`) was hard-coded in committed files (`AddressFormModal.jsx`, `test_routing.mjs`) and is in git history | New key issued, restricted to the production domains, old key revoked |
| R2 | **Visual check of every screen** | The 2026-10-13 browser run could not take screenshots (hidden window): layout, responsive breakpoints and maps were not seen. Done so far: sign-in and sign-up pages (desktop + phone) | Each page reviewed at phone and desktop widths; customer tracking map, admin live map and the address pin map render |
| R3 | **Real-device rider GPS** | Geolocation was blocked in the test browser; the location pipeline was verified by posting positions through the API | Rider on a phone shares location; customer and admin maps move |
| R4 | **New browser e2e suite** | The old suite depended on seeded demo accounts and was removed | Playwright tests create their own admin/store/products/rider through the UI or API, run the full order flow, and delete their data |
| R5 | **Storefront scoped to the serving store** | The storefront lists products from every active store, but checkout rejects carts that mix stores or come from a store that doesn't serve the address. Fine with one store, confusing with several | Product lists filter by the store serving the selected address (or the cart warns before checkout) |

## P1
| ID | Item | Notes |
|---|---|---|
| R6 | Google sign-in end to end | Needs `FIREBASE_*` on the backend and `VITE_FIREBASE_*` in the web app; the button stays hidden until both are set |
| R7 | Product image upload | Products take image URLs only; there is no file upload or storage |
| R8 | Customer notifications | No SMS/push/email for order updates (the old notifier was a fake and was removed); customers see updates in the app only |
| R9 | Phone number verification | Registration does not verify the phone with an OTP (`phoneVerified` stays false) |
| R10 | Store can't cancel after a failed delivery | By the state machine only staff can cancel a `DELIVERY_FAILED` order; the store can only send it out again. Decide whether stores should be able to cancel |
| R11 | Routing provider | Road routes use the public OSRM demo server, which is not meant for production traffic. Self-host OSRM or use a paid provider |
| R12 | Code-splitting | The web app ships as one ~2.2 MB JS chunk; lazy-load the portals (`React.lazy` per route group) |
| R18 | Password reset | Only riders can be reset from the admin console. Customers, store owners and activated staff have no self-service or admin reset; support must use the manual database procedure in `PMart_RECOVERY_PROCEDURE.md`. Add an admin "reset password" for owners/staff and a verified self-service reset for customers |

## P2 — housekeeping
| ID | Item | Notes |
|---|---|---|
| R13 | Remove leftover tooling from the repo root | `convert.js`, `extract*.cjs`, `migrate*.cjs`, `inventory.cjs`, `ui-scanner.cjs`, `search-terms.cjs`, `get-inputs.cjs`, `map_audit.md`, `session_summary_175.md`, `scratch/`, `adapters/`, `scripts/validate-*` are from earlier tooling sessions and are not used by the app |
| R14 | `vite.config.js` `allowedHosts` | Still lists an old `trycloudflare.com` tunnel hostname; remove it |
| R15 | Unused dev dependencies | `@playwright/test` and `playwright` are unused until R4 |
| R16 | Old audit documents | `PMART_DATABASE_PERFORMANCE_AUDIT.md`, `PMart_SECURITY_AUDIT.md`, `PMart_SECURITY_FINDINGS.md`, `PMart_UI_CONSISTENCY_AUDIT.md`, `PMart_FINAL_IMPLEMENTATION_REPORT.md` describe the pre-rebuild code; re-audit when convenient |
| R17 | Index review with real traffic | Indexes were designed for the expected queries; confirm with Atlas Performance Advisor once there is production load |

## Done in the 2026-10-13 rebuild (for reference)
Database redesigned (11 collections), all mock/demo/test data and fake features removed, backend rewritten in
CommonJS with 80 tests, every portal wired to real endpoints and exercised in a browser. Fixes found during that run:
CORS rejection returning 500, request IDs missing from early errors, `.env` read from the wrong directory, sign-out on
transient server errors, address line built from stale geocoder text, unlabeled address form fields, keyboard-inaccessible
address search results, blank map after "Back to Map", a 4-digit-only delivery code input, Google button shown when the
server can't verify Google tokens, stale notices when moving between orders, "Payment pending" on cancelled orders,
plural labels, the rider list not refreshing in the assign panel, and the undeclared `maplibre-gl` dependency.
