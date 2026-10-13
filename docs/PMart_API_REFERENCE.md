# PMart API Reference

Base path `/api` (Express 5, `backend/src/app.js`). JSON bodies up to 200 kB. Every response carries an
`X-Request-Id` header.

**Response shape.** Success: `{ success: true, data, ... }` (lists add `pagination: { page, limit, total, pages }`).
Error: `{ success: false, code, message, requestId, details? }`. Codes worth handling: `VALIDATION_ERROR` (400),
`INVALID_ID` (400), `UNAUTHORIZED` / `ACCOUNT_DEACTIVATED` (401), `FORBIDDEN` / `MUST_CHANGE_PASSWORD` /
`CORS_FORBIDDEN` (403), `NOT_FOUND` (404), `DUPLICATE` and domain conflicts (409), `RATE_LIMITED` (429),
`GOOGLE_NOT_CONFIGURED` / `GEOCODING_NOT_CONFIGURED` (503). Unexpected 5xx messages are masked.

**Authentication.** `Authorization: Bearer <accessToken>` (JWT, `JWT_EXPIRES_IN`, default 1 h). The refresh token is an
httpOnly cookie scoped to `/api/auth`, rotated on every refresh and stored only as a sha256 hash. Accounts with
`mustChangePassword` can call only `/auth/me`, `/auth/password` and `/auth/logout` until they set a new password.

**Roles.** `CUSTOMER`, `SHOP_OWNER`, `RIDER`, `EMPLOYEE`, `ADMIN`. `ADMIN` has every permission; an `EMPLOYEE` has only the
permissions granted: `dashboard.read`, `orders.read`, `orders.manage`, `catalog.manage`, `shops.manage`, `customers.read`,
`riders.read`, `riders.manage`, `employees.manage`, `reports.read`, `settings.read`, `settings.manage`.

**CORS.** Browser origins must be in `ALLOWED_ORIGINS`. Outside production any `http://localhost:<port>` or
`http://127.x.x.x:<port>` origin is also accepted. Other origins get `403 CORS_FORBIDDEN`.

## Public
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, database, timestamp }`; 503 when MongoDB is disconnected |
| GET | `/settings/public` | `freeDeliveryThreshold, baseDeliveryFee, platformHandlingFee, supportPhone, supportEmail, otpLength, googleSignIn` |
| GET | `/categories`, `/categories/:slug` | Active categories, sorted by `sortOrder` (management list `/manage/categories` adds product counts) |
| GET | `/products` | `?category&subcategory&search&sort(newest|price-low|price-high|discount|name)&page&limit`; active products from active shops |
| GET | `/products/search`, `/products/tag/:tag`, `/products/slug/:slug`, `/products/:id` | Storefront reads |
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
| PUT | `/:id/payment-status` | assigned rider | `{ paymentStatus: "COLLECTED" }` at the door |
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
| `GET/POST /manage/products`, `GET/PUT/DELETE /manage/products/:id`, `PATCH /:id/status` | `catalog.manage` staff (any store) or store owner (own store only) | DELETE archives |
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
| POST | `/employees/:id/activation-link` | `employees.manage` |
| GET/PUT | `/settings` | `settings.read` / `settings.manage` |

## Routing — `/routing`
`GET /routing?origin=lng,lat&destination=lng,lat&profile=driving|cycling|walking` (signed in, 30/min): road route via the public OSRM server, cached in memory (`OSRM_CACHE_TTL`).
