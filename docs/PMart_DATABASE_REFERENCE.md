# PMart Database Reference

MongoDB (Atlas), accessed through Mongoose 8. Database name: `MONGODB_DB_NAME` (default `pmart`).
The schema was rebuilt on **2026-10-13**: every old collection was dropped (a backup is in the gitignored
`backups/mongo-pmart-2026-10-13/`) and the 11 collections below were created by `npm run db:init`.
The database starts **empty** apart from the `settings` document — there is no seed, demo or test data.

Source of truth: the model files listed per collection. Indexes are declared in the schemas and synced by
`backend/src/scripts/db-init.js`.

| # | Collection | Model file | Purpose |
|---|------------|------------|---------|
| 1 | `users` | `modules/auth/auth.model.js` | Every account: customers, store owners, riders, staff, admins |
| 2 | `shops` | `modules/shop/shop.model.js` | Darkstores: address, coordinates, delivery radius, hours, owner |
| 3 | `categories` | `modules/catalog/catalog.model.js` | Storefront categories and their sub-categories |
| 4 | `products` | `modules/catalog/catalog.model.js` | Per-store products, price/MRP, stock |
| 5 | `carts` | `modules/cart/cart.model.js` | One server-side cart per customer |
| 6 | `addresses` | `modules/address/address.model.js` | Customer delivery addresses (GeoJSON point) |
| 7 | `orders` | `modules/order/order.model.js` | Orders, address snapshot, status history, payment, delivery code |
| 8 | `riderprofiles` | `modules/rider/rider.model.js` | Rider vehicle, availability, current order, last location |
| 9 | `riderlocations` | `modules/rider/rider.model.js` | GPS breadcrumbs (auto-deleted after 7 days) |
| 10 | `auditlogs` | `modules/admin/audit.model.js` | Who changed what in the admin/store tools |
| 11 | `settings` | `modules/admin/settings.model.js` | Single `key: "global"` document with fees and targets |

Collections removed in the rebuild: `customerprofiles` (name/email now live on `users`), `orderevents`
(replaced by `orders.statusHistory`), `orderprogressionjobs` (the development "auto-progress rider" simulator
was removed), `otps` / `otpreservations` (the delivery code is stored on the order).

## 1. `users`
- `phone` — E.164 (`+91XXXXXXXXXX`), normalised by `utils/auth.normalizeMobileNumber`. Unique when present.
- `email`, `googleId` — unique when present. `emailVerified`, `phoneVerified`.
- `name`, `role` (`CUSTOMER | SHOP_OWNER | RIDER | EMPLOYEE | ADMIN`), `permissions` (employees only; see API reference).
- `authProvider` (`PHONE | GOOGLE`), `profileComplete`, `isActive`, `mustChangePassword`, `lastLoginAt`.
- Hidden (`select: false`): `passwordHash` (bcrypt), `refreshTokenHash` (sha256 of the rotating refresh token),
  `setupTokenHash` + `setupTokenExpires` (sha256 of the one-time staff activation token, 72 h).
- Indexes: unique partial on `phone`, `email`, `googleId` (`$type: "string"`, so missing values never collide);
  partial on `refreshTokenHash`, `setupTokenHash`; `{ role, isActive, createdAt: -1 }`.

## 2. `shops`
- `owner` → `users` (role `SHOP_OWNER`), `name`, `description`, `phone`, `imageUrl`.
- `address { street, area, city, state, pincode }`, `location { lat, lng }`.
- `deliveryRadiusKm` (default 5), `openTime`/`closeTime` (`HH:mm`), `isActive`, `isAcceptingOrders`.
- Serviceability: a customer point is served by the nearest active, accepting shop whose haversine distance
  is within `deliveryRadiusKm` (`modules/shop/shop.service.js#findServingShops`).
- Indexes: `{ owner }`, `{ isActive, name }`.

## 3. `categories`
- `name`, `slug` (unique), `description`, `imageUrl`, `subcategories: [String]`, `sortOrder`, `isActive`.
- Indexes: unique `slug`; `{ isActive, sortOrder, name }`.

## 4. `products`
- `shop` → `shops`, `category` → `categories`, `categorySlug` (denormalised for storefront queries), `subcategory`.
- `name`, `slug` (unique), `brand`, `sku` (unique per shop when set), `tags` (`daily-essentials`, `fresh-picks`,
  `best-deals`, `under-99` drive the home page rows; free-form tags are allowed), `description`, `unit`.
- `price`, `mrp`, `discount` (percentage, **derived** from price/MRP in a `pre('validate')` hook — never sent by clients).
- `stockCount` — the only stock field. Decremented atomically at checkout (`$inc` guarded by `stockCount >= qty`)
  and restored exactly once when an order is cancelled or rejected (`orders.inventoryRestored` guard).
- `imageUrl`, `gallery`, `specifications` and `nutrition` (string maps), `isActive`.
- Indexes: unique `slug`; unique partial `{ shop, sku }`; `{ category, isActive, createdAt: -1 }`; `{ tags, isActive }`;
  `{ shop, isActive, stockCount }` (low-stock lists).

## 5. `carts`
- `user` → `users` (unique), `items: [{ product, quantity }]`. Prices are never stored in the cart; the server
  returns current prices and drops inactive/out-of-stock lines on sync.

## 6. `addresses`
- `user`, `label` (`HOME | WORK | OTHER`), `recipientName`, `recipientPhone` (E.164).
- `houseNumber`, `buildingName`, `floor`, `street`, `area`, `landmark`, `city`, `district`, `state`, `pincode` (6 digits), `country`.
- `formattedAddress` — **always rebuilt by the server** in a `pre('validate')` hook from the fields above
  (`houseNumber, buildingName, Floor n, street, area, city, state - pincode`). Geocoder text sent by a client is ignored.
- `location { type: "Point", coordinates: [lng, lat] }` (validated range, `[0,0]` rejected), `deliveryInstructions`.
- `isDefault`, `isActive` (deletes are soft).
- Indexes: `{ user, isActive, isDefault: -1, createdAt: -1 }`; unique partial `{ user }` where
  `isDefault && isActive` (`one_default_address_per_user`).

## 7. `orders`
- `orderNumber` (unique, `PMyymmdd-XXXXXX`), `customer`, `shop`, `rider` (nullable).
- `items: [{ product, name, unit, imageUrl, price, mrp, quantity }]` — snapshot at checkout (at least one item).
- `subTotal`, `deliveryFee` (0 when `subTotal >= freeDeliveryThreshold`, else `baseDeliveryFee`),
  `platformFee` (`platformHandlingFee`, always charged), `totalAmount`. Fees come from `settings` at checkout time.
- `status`: `PENDING → ACCEPTED → PREPARING → READY → ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → ARRIVED → DELIVERED`,
  plus `REJECTED`, `CANCELLED`, `DELIVERY_FAILED` (re-dispatch goes `DELIVERY_FAILED → READY`). Allowed transitions and
  actors are in `modules/order/order.service.js#TRANSITIONS`.
- `deliveryAddress` — embedded snapshot of the address (including `formattedAddress` and `location`).
- `deliveryInstructions`, `paymentMethod` (`COD` only), `paymentStatus` (`PENDING | COLLECTED | FAILED | REFUNDED`),
  `paymentCollectedAt`, `paymentCollectedBy`.
- Delivery code: `deliveryVerificationStatus`, hidden `encryptedOtp` (AES-256-GCM, so the customer can view it) and
  `deliveryOtpHash` (bcrypt, used to verify), `deliveryOtpExpiry` (60 min), `deliveryOtpAttempts` (max 5).
- `idempotencyKey` — unique per customer, so a retried checkout returns the original order.
- `inventoryRestored`, `tracking { lat, lng, updatedAt }` (latest rider position), `statusHistory [{ status, changedAt, changedBy, actorRole, note }]`,
  milestone timestamps (`acceptedAt` … `deliveredAt`, `cancelledAt`), `cancellationReason`.
- Indexes: unique `orderNumber`; `{ customer, createdAt: -1 }`; `{ shop, createdAt: -1 }`; `{ rider, status }`;
  `{ status, createdAt: -1 }`; `{ createdAt: -1 }`; unique partial `{ customer, idempotencyKey }`.

## 8. `riderprofiles`
- `user` (unique), `vehicleType` (`Bike | Scooter | Electric Bike | Bicycle`), `vehicleNumber`, `licenseNumber`.
- `availabilityStatus` (`OFFLINE | AVAILABLE | BUSY`), `currentOrder`, `completedDeliveries`, `lastLocation { lat, lng, at }`.
- Assignment atomically claims an `AVAILABLE` rider (`findOneAndUpdate`), so one rider can never hold two orders.

## 9. `riderlocations`
- `rider`, `order` (only when the point belongs to an active delivery), `lat`, `lng`, `accuracy`, `speed`, `heading`, `recordedAt`.
- TTL index on `recordedAt` (604 800 s = 7 days); `{ order, recordedAt: -1 }`; `{ rider, recordedAt: -1 }`.

## 10. `auditlogs`
- `user`, `action` (`CREATE | UPDATE | DELETE | APPROVE | REJECT | ASSIGN`), `resource`, `resourceId`, `details`, `ipAddress`, `createdAt`.
- Written by `recordAudit()` for store, product, category, rider, employee, customer-status and settings changes.

## 11. `settings`
- Singleton `key: "global"`: `freeDeliveryThreshold` (299), `baseDeliveryFee` (15), `platformHandlingFee` (5),
  `deliverySlaMinutes` (30), `lowStockThreshold` (10), `supportPhone`, `supportEmail`.
- Created by `npm run db:init` (or lazily by `Settings.getSingleton()`).

## Transactions
Checkout, cancellation/rejection (stock restore), rider assignment and delivery completion run inside
`utils/transaction.runInTransaction` (`session.withTransaction`). Atlas and the test replica set
(mongodb-memory-server `MongoMemoryReplSet`) both support transactions; a standalone `mongod` does not.

## Operating the database
- First-time setup or after a wipe: `cd backend && npm run db:init` (creates collections, syncs indexes, creates settings).
- First administrator: `npm run create-admin -- --name "Full Name" --phone 98XXXXXXXX` (password from `ADMIN_PASSWORD` or prompted).
- There is no seed script by design; create stores, categories, products and riders in the admin console.
