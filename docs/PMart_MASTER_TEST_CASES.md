# PMart Master Test Cases

_Rewritten 2026-10-13. The previous plan referenced TypeScript tests, seeding scripts and a Playwright runner that
were removed in the rebuild._

**Execution**: backend cases run with `cd backend && npm test` (all passing on 2026-10-13). "Browser" cases were run
by hand on 2026-10-13 as described in the [Test Strategy](PMart_TEST_STRATEGY.md); there is no automated browser suite yet.

## 1. Functional
| ID | Case | Expected | How | Result (2026-10-13) |
|---|---|---|---|---|
| FUN-001 | Customer registers with phone + password | Session issued, phone stored as `+91…` | `auth.test.js`; browser | PASS |
| FUN-002 | Guest cart merges into the account | Items appear in the server cart after sign-in | Browser | PASS |
| FUN-003 | Address: search, pin, details, default, edit | Saved with server-built address line; one default | `address.test.js`; browser | PASS |
| FUN-004 | Address outside every store radius | Serviceability says no; checkout refuses | `address.test.js`, `checkout.test.js` | PASS |
| FUN-005 | COD checkout | Server prices, fees from settings, stock reserved, idempotent | `checkout.test.js`; browser | PASS |
| FUN-006 | Store accept → pack → ready → assign | Each step allowed only in order | `order-lifecycle.test.js`; browser | PASS |
| FUN-007 | Rider pickup → start → arrive → cash → code → delivered | Delivery only with cash collected and code verified | `order-lifecycle.test.js`; browser | PASS |
| FUN-008 | Customer cancel before packing | Cancelled, stock restored once | `order-lifecycle.test.js`; browser | PASS |
| FUN-009 | Store rejects with reason | Customer sees "declined by the store" and the reason | `order-lifecycle.test.js`; browser | PASS |
| FUN-010 | Rider "could not deliver" → send out again → cancel | Re-dispatch without restock; restock on cancel | `order-lifecycle.test.js`; browser | PASS |
| FUN-011 | Live tracking | Status and rider position reach the customer without reload | `socket.test.js`; browser (position posted via API) | PASS |
| FUN-012 | Admin creates store, categories, products, riders, staff | Records created; owner/rider must change password | `admin.test.js`, `catalog.test.js`; browser | PASS |
| FUN-013 | Settings change fees/support | New orders and Help page use them | `admin.test.js`, `checkout.test.js`; browser | PASS |
| FUN-014 | Reports, payments, CSV export, audit log | Figures match real orders; CSV formula-escaped | `admin.test.js`; browser | PASS |

## 2. Security and access
| ID | Case | Expected | How | Result |
|---|---|---|---|---|
| SEC-001 | Cross-account access to orders/addresses | 403/404 | `order-lifecycle.test.js`, `address.test.js` | PASS |
| SEC-002 | Weak/short `JWT_SECRET` in production | Server refuses to start | `env.test.js` | PASS |
| SEC-003 | Regex/NoSQL operators in search | Treated literally, 400 for arrays | `catalog.test.js` | PASS |
| SEC-004 | Socket without token / foreign order room | Rejected / join refused | `socket.test.js` | PASS |
| SEC-005 | Unknown browser origin | 403 `CORS_FORBIDDEN` | `auth.test.js`, `env.test.js` | PASS |
| SEC-006 | Employee without a permission | Hidden in UI, 403 from API | `admin.test.js`; browser | PASS |
| SEC-007 | Mass assignment (role via profile, user via address) | Ignored | `auth.test.js`, `address.test.js` | PASS |
| SEC-008 | Refresh token reuse after rotation | Rejected | `auth.test.js` | PASS |
| SEC-009 | Deactivated account | Login and existing tokens refused | `auth.test.js`; browser | PASS |
| SEC-010 | Delivery code brute force | Locked after 5 attempts | `order-lifecycle.test.js` | PASS |
| SEC-011 | Secrets in git history | None | Manual review | **FAIL** — a MapTiler key is in history (Remaining Work R1) |

## 3. Concurrency and data integrity
| ID | Case | Expected | How | Result |
|---|---|---|---|---|
| DAT-001 | Two customers buy the last unit at once | One order succeeds | `checkout.test.js` | PASS |
| DAT-002 | Retried checkout with the same key | Same order returned | `checkout.test.js` | PASS |
| DAT-003 | Rider assigned to two orders at once | Second assignment refused | `order-lifecycle.test.js` | PASS |
| DAT-004 | Stock restore on cancel/reject | Exactly once | `order-lifecycle.test.js`; browser (stock 48 → 46 → 48) | PASS |

## 4. Not yet covered
| ID | Case | Why |
|---|---|---|
| GAP-001 | Visual layout, responsive breakpoints | Browser run had no visible window |
| GAP-002 | Map rendering (tracking, live deliveries, address pin drag) | Same |
| GAP-003 | Rider GPS from a real device | Geolocation blocked in the test browser |
| GAP-004 | Google sign-in | Firebase Admin not configured |
| GAP-005 | Rate limits under load | Limits are off in development; covered only by configuration review |
