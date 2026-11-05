# PMart API Reference

Base path `/api` (Express 5, `backend/src/app.js`). JSON bodies up to 5 MB (supporting bulk product uploads and photo uploads; CSV imports under `/inventory/imports` up to 12 MB). Every response carries an
`X-Request-Id` header.

**Response shape.** Success: `{ success: true, data, ... }` (lists add `pagination: { page, limit, total, pages }`).
Error: `{ success: false, code, message, requestId, details? }`. Codes worth handling: `VALIDATION_ERROR` (400),
`INVALID_ID` (400), `UNAUTHORIZED` / `ACCOUNT_DEACTIVATED` (401), `FORBIDDEN` / `MUST_CHANGE_PASSWORD` /
`CORS_FORBIDDEN` (403), `NOT_FOUND` (404), `DUPLICATE` and domain conflicts (409), `RATE_LIMITED` (429),
`GOOGLE_NOT_CONFIGURED` / `GEOCODING_NOT_CONFIGURED` (503). Unexpected 5xx messages are masked.

**Authentication.** `Authorization: Bearer <accessToken>` (JWT, `JWT_EXPIRES_IN`, default 1 h; HS256 only, issuer
`pmart-api`, audience `pmart-app` — tokens without them are refused since 2026-11-05, and the web app refreshes
silently). The refresh token is an httpOnly cookie (`SameSite=Strict` unless `COOKIE_SAME_SITE` says otherwise) scoped
to `/api/auth`, rotated on every refresh and stored only as a sha256 hash. Accounts with
`mustChangePassword` can call only `/auth/me`, `/auth/password` and `/auth/logout` until they set a new password.

**Roles.** `CUSTOMER`, `SHOP_OWNER`, `RIDER`, `EMPLOYEE`, `ADMIN`. `ADMIN` has every permission; an `EMPLOYEE` has only the
permissions granted: `dashboard.read`, `orders.read`, `orders.manage`, `catalog.manage`, `catalog.delete`, `catalog.import`,
`images.verify`, `inventory.read`, `inventory.restock`, `inventory.adjust`, `inventory.negative_stock`, `invoices.create`,
`invoices.read`, `invoices.cancel`, `billing.price_override`, `payments.record`, `payments.read`, `shops.manage`,
`customers.read`, `riders.read`, `riders.manage`, `employees.manage`, `reports.read`, `settings.read`, `settings.manage`.
The **Store Manager** preset is `dashboard.read`, `inventory.read`, `inventory.restock`, `invoices.create`,
`invoices.read`, `payments.record`, `payments.read`.

**CORS.** Browser origins must be in `ALLOWED_ORIGINS`; in production only exact entries match (no wildcards, no
blanket `*.vercel.app` / `*.netlify.app`). Outside production any `http://localhost:<port>` or
`http://127.x.x.x:<port>` origin is also accepted. Other origins get `403 CORS_FORBIDDEN`.

**Rate limits** (production; see SECURITY.md): sign-in is limited per IP and, separately, to 8 failed attempts per
mobile number per 15 minutes whatever the IP (`429 RATE_LIMITED`); checkout, delivery-code, password-change, admin
mutation, rider-location, routing and barcode-lookup limits count per signed-in user.

## Public
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, database, timestamp }`; 503 when MongoDB is disconnected |
| GET | `/settings/public` | `freeDeliveryThreshold, baseDeliveryFee, platformHandlingFee, supportPhone, supportEmail, otpLength, googleSignIn` |
| GET | `/categories`, `/categories/:slug` | Active categories, sorted by `sortOrder` (management list `/manage/categories` adds product counts) |
| GET | `/products` | `?category&subcategory&brand&search&tag&hasDiscount&minPrice&maxPrice&inStockOnly&sort(newest|price-low|price-high|discount|name)&page&limit`; active products from active shops. Cached in-memory (30s TTL). Returns `{ products, totalCount, page, totalPages, hasMore }` |
| GET | `/products/search`, `/products/tag/:tag`, `/products/slug/:slug`, `/products/:id` | Storefront reads with in-memory caching and Cache-Control headers |
| GET | `/shops` | Active shops (public fields) |

## Auth — `/auth`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | — | `{ name, phone, password }` → customer session (201). Phone stored as E.164 |
| POST | `/login` | — | `{ phone, password }` for every role; 10-digit or `+91` numbers accepted |
| POST | `/google` | — | `{ idToken }`; 503 `GOOGLE_NOT_CONFIGURED` without `FIREBASE_*` |
| POST | `/activate` | — | `{ token, password, confirmPassword }` — staff one-time activation link (72 h) |
| POST | `/refresh` | cookie | Rotates the refresh token, returns a new access token |
| POST | `/complete-profile` | Bearer | Google sign-ups add phone/name |
| POST | `/logout` | Bearer | Clears the refresh token |
| GET | `/me` | Bearer | Current user |
| PUT | `/password` | Bearer | `{ currentPassword, newPassword, confirmPassword }`; clears `mustChangePassword` and returns a fresh session |

## Profile — `/users`
`GET /profile`, `PUT /profile` (`{ name, email }`) for any signed-in user.

## Addresses — `/addresses` (customer)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/` | List / create. Body is whitelisted; `formattedAddress` is rebuilt by the server |
| GET/PUT/DELETE | `/:id` | PUT takes the full address; DELETE is soft and promotes another default |
| PATCH | `/:id/default` | Exactly one default per customer |
| POST | `/serviceability` | `{ lat, lng }` → `{ serviceable, shop, distanceKm, message }` (any signed-in role) |
| POST | `/reverse-geocode` | `{ lat, lng }` via MapTiler; 503 without `MAPTILER_API_KEY` (the web app then falls back to the browser key) |

## Cart — `/cart` (customer)
`GET /` (current prices, drops inactive lines), `POST /sync` (`{ items: [{ product, quantity }] }`, max 100 lines, quantity 1–99; merged into the saved cart), `DELETE /`.

## Orders — `/orders`
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/checkout` | customer | `{ addressId, items, deliveryInstructions?, idempotencyKey }`; COD only; fees from settings; stock reserved in a transaction; same key ⇒ same order |
| GET | `/` | any | Role-scoped list: customers see theirs, store owners their store's, riders theirs, staff all. `?status&paymentStatus&search&page&limit` |
| GET | `/:id`, `/:id/tracking` | participants, staff | Tracking returns store, customer point and latest rider position |
| GET | `/:id/otp` | customer | The delivery code (only once the order is out for delivery) |
| PUT | `/:id/status` | per state machine | `{ status, reason? }`. Reason required for `REJECTED`, `CANCELLED`, `DELIVERY_FAILED` |
| POST | `/:id/assign-rider` | store owner, `orders.manage` | `{ riderId }`; atomically claims an AVAILABLE rider; allowed until pickup |
| POST | `/:id/verify-otp` | assigned rider | `{ otp }`; 5 attempts, then regenerate |
| POST | `/:id/resend-otp` | assigned rider | New code shown in the customer app |
| PUT | `/:id/payment-status` | assigned rider, `orders.manage` | Rider: `{ paymentStatus: "COLLECTED" }` at the door (order `ARRIVED`). Staff override: `{ paymentStatus, reason }` — reason (3+ characters) required (`400 REASON_REQUIRED`), `REFUNDED` only from `COLLECTED` (`409 INVALID_PAYMENT_TRANSITION`); written to order history and the audit log (`OrderPayment`, before/after, reason) |
| POST | `/:id/deliver` | assigned rider | Requires payment collected and code verified |

State machine (`order.service.js#TRANSITIONS`; the status endpoint accepts only these moves):

| From | To | Who |
|---|---|---|
| PENDING | ACCEPTED, REJECTED | store, staff |
| PENDING | CANCELLED | customer, staff |
| ACCEPTED | PREPARING | store, staff |
| ACCEPTED | CANCELLED | customer, store, staff |
| PREPARING | READY | store, staff |
| PREPARING, READY | CANCELLED | store, staff |
| READY | ASSIGNED | `assign-rider` endpoint (store, `orders.manage`) |
| ASSIGNED | PICKED_UP | rider `pickup` endpoint |
| ASSIGNED | CANCELLED | staff |
| PICKED_UP | OUT_FOR_DELIVERY | rider, staff |
| OUT_FOR_DELIVERY | ARRIVED, DELIVERY_FAILED | rider, staff |
| ARRIVED | DELIVERY_FAILED | rider, staff |
| ARRIVED | DELIVERED | `deliver` endpoint (rider, after cash collected and code verified) |
| DELIVERY_FAILED | READY (send out again) | store, staff |
| DELIVERY_FAILED | CANCELLED | staff |

Cancelling or rejecting restores stock once.

Socket.IO (same origin, path `/socket.io`, JWT in `auth.token`): rooms `order_<id>` (participants), `shop_<id>`,
`rider_<id>`, `admin_deliveries` (staff). Events: `order_status_update`, `rider:location:update`.

## Rider — `/rider`
| Method | Path | Notes |
|---|---|---|
| GET | `/fleet` | Store owners and `orders.manage` staff: riders with availability (for assignment) |
| GET/PUT | `/profile` | Rider profile; PUT updates `vehicleType`, `vehicleNumber`, `licenseNumber` |
| PATCH | `/availability` | `{ status: "AVAILABLE" \| "OFFLINE" }` (BUSY is set by the system while an order is assigned) |
| GET | `/active-order` | The order currently assigned |
| POST | `/orders/:id/pickup` | `ASSIGNED → PICKED_UP` |
| POST | `/location` | `{ latitude, longitude, accuracy?, speed?, heading?, timestamp?, orderId? }`; 40/min |

## Stores — `/shops` (store owner)
`GET /mine`, `PUT /mine` (name, phone, description, hours, `isAcceptingOrders`), `GET /mine/metrics` (today, last 30 days, low stock).

## Catalog management — `/manage`
| Path | Who | Notes |
|---|---|---|
| `GET/POST /manage/products`, `POST /manage/products/bulk`, `POST /manage/products/bulk-delete`, `PATCH/POST /manage/products/bulk-update`, `GET/PUT/DELETE /manage/products/:id`, `PATCH /:id/status` | Writes: `catalog.manage` staff (any store) or store owner (own store only). Reads (`GET`): also `inventory.read`. DELETE and bulk-delete: `catalog.delete` or store owner. Any stock change (`stockCount` on PUT or bulk-update): `inventory.adjust` or store owner | Products carry the 17 inventory CSV fields (see [Inventory & Billing §4](PMart_INVENTORY_BILLING.md)). List filters: `search` + `field` (`name`, `code`, `barcode`, `company`, `manufacturer`), `stock` (`in`, `low`, `out`), `online` (`listed`, `hidden`), `image` (`VERIFIED`, `PENDING`, `NOT_AVAILABLE`), `sort` (`name`, `code`, `stock`, `-stock`, `price`, `-price`, `updated`, `newest`). Create/update/get return `warnings` for barcodes shared with other products. `stockCount` on create is opening stock; later stock edits are written to the stock ledger as adjustments. Image URLs are no longer accepted here (photos go through `/inventory/.../images`); bulk-upload image URLs become pending candidates. A category is required to list a product online. Bulk accepts up to 200 products; bulk-delete up to 100 IDs; bulk-update up to 200 IDs. DELETE permanently removes the product (invoices and the ledger keep their snapshots) |
| `GET/POST /manage/categories`, `PUT/DELETE /:id`, `PATCH /:id/status` | Changes: `catalog.manage`. GET: `catalog.manage` staff or store owners (owners see active categories only) | Delete refused (`CATEGORY_IN_USE`) while products use the category |

## Admin console — `/admin` (ADMIN or EMPLOYEE with the listed permission; mutations rate-limited)
| Method | Path | Permission |
|---|---|---|
| GET | `/dashboard` | `dashboard.read` |
| GET | `/reports?period=today|this-week|this-month` | `reports.read` |
| GET | `/payments?paymentStatus&page` | `reports.read` |
| GET | `/audit-logs?page&limit` | `reports.read` |
| GET | `/orders`, `/orders/:id`, `/orders/export.csv` | `orders.read` (CSV cells are formula-escaped) |
| PATCH | `/orders/:id/status`, `/orders/:id/assign-rider` | `orders.manage` |
| GET | `/deliveries` | `orders.read` |
| GET/POST | `/shops`, GET/PUT `/shops/:id` | `shops.manage` (create also creates the owner account with a temporary password) |
| GET | `/customers` | `customers.read` |
| PATCH | `/customers/:id/status` | `customers.read` **and** ADMIN |
| GET | `/riders` | `riders.read` |
| POST/PUT | `/riders`, `/riders/:id` | `riders.manage` |
| PATCH | `/riders/:id/status` | `riders.manage` (not while BUSY) |
| POST | `/riders/:id/reset-password` | `riders.manage` |
| GET/POST/PUT | `/employees`, `/employees/:id` | `employees.manage` (changes: ADMIN only; cannot deactivate yourself) |
| POST | `/employees/:id/activation-link` | `employees.manage`; a non-admin only for employees whose permissions they also hold (`403 PERMISSION_ESCALATION`) |
| GET/PUT | `/settings` | `settings.read` / `settings.manage` |

## Inventory, billing and reports — `/inventory`, `/billing`, `/reports`, `/product-images`
Staff only (ADMIN or EMPLOYEE with the listed permission). The full endpoint table, request rules (idempotency keys,
negative-stock and price-override permissions, payment limits) and response fields are in
[Inventory & Billing §12](PMart_INVENTORY_BILLING.md). `GET /product-images/:id` is public and serves only approved
photos. The inventory CSV export (`/inventory/export.csv`) writes values exactly as stored (every cell quoted, no
formula escaping) so codes such as `+000462` round-trip unchanged.

`DELETE /billing/invoices/:id` (ADMIN only, 2026-11-05) permanently deletes an invoice. Body
`{ reason (3–300 chars), refundMethod? }`. An invoice that is not cancelled is cancelled first in the same transaction
(stock not already returned goes back through the ledger; money paid is refunded, so `refundMethod` is required when
anything was paid: 400 `REFUND_METHOD_REQUIRED`). The invoice and its payment/refund rows are deleted; stock-ledger
rows are kept and an `auditlogs` entry (`resource: "Invoice"`, `action: "DELETE"`) stores a snapshot. Response
`{ _id, number, deleted: true, stockRestored, refunded, refundMethod, paymentsDeleted }`; repeating it returns the
same with `replayed: true`; an unknown id is 404; staff (any permissions) get 403. The number is not reused.

`PUT /admin/settings` also accepts `billing: { businessName, businessAddress, businessPhone, gstin, invoicePrefix,
taxMode, defaultTaxRate, taxLabel, gstSplit, roundTotal, paymentTermsDays, allowNegativeStock, invoiceFooter }`
(partial updates keep the other fields).

## Routing — `/routing`
`GET /routing?origin=lng,lat&destination=lng,lat&profile=driving|cycling|walking` (signed in, 30/min): road route via the public OSRM server, cached in memory (`OSRM_CACHE_TTL`).
