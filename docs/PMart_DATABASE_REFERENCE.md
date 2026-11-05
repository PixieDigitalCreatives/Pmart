# PMart Database Reference

MongoDB (Atlas), accessed through Mongoose 8. Database name: `MONGODB_DB_NAME` (default `pmart`).
The schema was rebuilt on **2026-10-13**: every old collection was dropped (a backup is in the gitignored
`backups/mongo-pmart-2026-10-13/`) and the 11 collections below were created by `npm run db:init`.
The database starts **empty** apart from the `settings` document — there is no seed, demo or test data.
On **2026-11-04** all 1000 products were deleted and every cart was emptied so the catalog can be re-entered from
scratch; categories, stores, users and orders were kept (orders hold their own item snapshot). The deleted products
and the carts as they were are in the gitignored `backups/products-cleared-2026-11-04/` (Extended JSON).
Later that day the inventory/billing module added 9 collections (#12–20) and new product fields; the whole database
was backed up first to `backups/pre-inventory-2026-11-04/`, then the store's `order.csv` (8,034 products) was
imported. Details, import results and the rollback plan: [Inventory & Billing](PMart_INVENTORY_BILLING.md).

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
| 11 | `settings` | `modules/admin/settings.model.js` | Single `key: "global"` document with fees, targets and billing settings |
| 12 | `productimages` | `modules/images/image.model.js` | Candidate and uploaded product photos with review status, source and cached bytes |
| 13 | `inventorytransactions` | `modules/inventory/inventory.model.js` | Stock ledger: every stock change with before/after |
| 14 | `suppliers` | `modules/inventory/inventory.model.js` | Suppliers named on restocks |
| 15 | `restocks` | `modules/inventory/inventory.model.js` | Goods received: quantity, free quantity, rate, supplier, reference |
| 16 | `importbatches` | `modules/inventory/inventory.model.js` | CSV import previews, mapping and per-row reports |
| 17 | `counters` | `modules/inventory/inventory.model.js` | Invoice and restock numbers (never reused; an admin-deleted invoice leaves a gap) |
| 18 | `customers` | `modules/billing/billing.model.js` | Walk-in billing customers (name, phone) |
| 19 | `invoices` | `modules/billing/billing.model.js` | In-store invoices with line items, totals, returns and payment status |
| 20 | `payments` | `modules/billing/billing.model.js` | Payments and refunds against invoices |

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
- `shop` → `shops`, `category` → `categories` (optional, but **required to list online**), `categorySlug`
  (denormalised for storefront queries), `subcategory`.
- `name`, `slug` (unique), `brand`, `sku` (unique per shop when set), `tags` (`daily-essentials`, `fresh-picks`,
  `best-deals`, `under-99` drive the home page rows; free-form tags are allowed), `description`, `unit` (may be empty).
- Inventory CSV fields (mapping in `modules/inventory/csv-fields.js`): `code` (kept exactly as written, unique per
  shop) and `codeKey` (trimmed upper-case copy for search), `barcode` (primary, verbatim) and `barcodes[]` (every code
  that scans to the product; may be shared), `company`, `manufacturer`, `rackNo`, `deal`, `free`, `purDeal`,
  `purFree`, `cost`, `stockValue` (`max(stock,0) × cost`, recomputed on every stock movement), `purRate`, `rate`
  (selling rate), plus `taxRate` (optional GST %) and `hsn`.
- `price` = `rate` when it is above 0, otherwise `mrp` (derived when `rate` is set); `mrp`; `discount` (percentage,
  **derived** from price/MRP in a `pre('validate')` hook — never sent by clients).
- `stockCount` — the only stock field (decimals allowed). Changed **only** by `inventory.service.applyStockChange`,
  which writes an `inventorytransactions` row each time: import/opening stock, restocks, adjustments, invoice sales,
  cancellations and returns, online checkout (guarded by `stockCount >= qty`) and the one-time restore when an order is
  cancelled or rejected (`orders.inventoryRestored` guard). It can go below zero only on an invoice where an
  authorised user allowed it.
- `imageUrl` — set **only** when a photo is verified (`/api/product-images/<id>`); `image { status: VERIFIED |
  PENDING | NOT_AVAILABLE, imageId, source, sourceUrl, verifiedAt, verifiedBy, lastSearchedAt }`.
- `importSource { batch, row, raw, importedAt }` — `raw` is the original text of all 17 CSV columns.
- `gallery` (legacy, no longer shown on the storefront), `specifications` and `nutrition` (string maps), `isActive`
  (= listed on the online storefront).
- Indexes: unique `slug`; unique partial `{ shop, sku }`; unique partial `{ shop, code }`; `{ codeKey }`;
  `{ barcodes }`; `{ shop, stockCount }`; `{ image.status, name }`; `{ importSource.batch }`; `{ category, isActive, createdAt: -1 }`;
  `{ categorySlug, isActive, createdAt: -1 }`; `{ categorySlug, subcategory, isActive, createdAt: -1 }`;
  `{ tags, isActive }`; `{ shop, isActive, stockCount }` (low-stock lists); `{ isActive, createdAt: -1 }`;
  `{ isActive, price: 1 }`; `{ isActive, price: -1 }`; `{ isActive, discount: -1 }`;
  text index `{ name, brand, tags }` (`ProductTextIndex`).

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
- Invoice deletes (2026-11-05): `resource: "Invoice"`, `action: "DELETE"`, `resourceId` = the deleted invoice id,
  `details` = snapshot (`number`, `date`, `status`, `paymentStatus`, customer, totals, `amountPaid`, `createdBy`,
  cancellation fields, `reason`, `stockRestored`, `refunded`, `refundMethod`, `items[]`, `returns[]`, `payments[]`).
  Written by the billing service inside the delete transaction, and used to answer a repeated delete.

## 11. `settings`
- Singleton `key: "global"`: `freeDeliveryThreshold` (299), `baseDeliveryFee` (15), `platformHandlingFee` (5),
  `deliverySlaMinutes` (30), `lowStockThreshold` (10), `supportPhone`, `supportEmail`.
- `billing { businessName, businessAddress, businessPhone, gstin, invoicePrefix (INV), taxMode (NONE | EXCLUSIVE |
  INCLUSIVE, default NONE), defaultTaxRate (0), taxLabel (GST), gstSplit (NONE | CGST_SGST | IGST), roundTotal (false),
  paymentTermsDays (0), allowNegativeStock (false), invoiceFooter }`.
- Created by `npm run db:init` (or lazily by `Settings.getSingleton()`).

## 12. `productimages`
- `product`, `shop`, `status` (`PENDING | APPROVED | REJECTED`), `origin` (`UPLOAD | URL | OPEN_FOOD_FACTS |
  OPEN_BEAUTY_FACTS | OPEN_PRODUCTS_FACTS`), `matchedBy` (`BARCODE | MANUAL`), `matchedBarcode`, `remoteUrl`,
  `sourceUrl`, `sourceProductName`/`sourceBrand`/`sourceQuantity` (what the source says), `license`, `attribution`,
  hidden `data` (image bytes) + `contentType` + `bytes`, `uploadedBy`, `reviewedBy`, `reviewedAt`, `rejectReason`.
- Only `APPROVED` images are served publicly; approval downloads remote images into `data`.
- Indexes: `{ product, status, createdAt: -1 }`, `{ status, createdAt: -1 }`, `{ product, remoteUrl }`.

## 13. `inventorytransactions` (stock ledger)
- `shop`, `product`, `productName`, `productCode`, `type` (`OPENING | RESTOCK | SALE | SALE_REVERSAL | RETURN |
  ADJUSTMENT | ONLINE_ORDER | ONLINE_ORDER_REVERSAL`), `quantity` (signed), `freeQuantity`, `stockBefore`,
  `stockAfter`, `unitCost`, `refType` (`IMPORT | PRODUCT | RESTOCK | INVOICE | ORDER | ADJUSTMENT`), `refId`,
  `refNumber`, `reason`, `user`, `dedupeKey`, `createdAt`.
- `dedupeKey` is unique (e.g. `INV:<id>:L1:SALE`), so one movement can never be written twice.
- Indexes: unique partial `dedupeKey`; `{ product, createdAt: -1 }`; `{ shop, type, createdAt: -1 }`;
  `{ shop, createdAt: -1 }`; `{ refType, refId }`.

## 14. `suppliers`
- `shop`, `name`, `nameKey` (lower-case, single-spaced; unique per shop), `phone`, `gstin`, `notes`.

## 15. `restocks`
- `shop`, `number` (`RST-000001`, unique per shop), `product` + snapshot (`productName`, `productCode`, `barcode`,
  `unit`), `receivedQuantity`, `freeQuantity`, `purchaseRate`, `previousPurchaseRate`, `amount`
  (received × rate), `supplier`, `supplierName`, `referenceNumber`, `stockBefore`, `stockAfter`, `note`, `user`,
  `idempotencyKey` (unique).
- Indexes: unique `idempotencyKey`; unique `{ shop, number }`; `{ shop, createdAt: -1 }`; `{ product, createdAt: -1 }`;
  `{ supplier, createdAt: -1 }`.

## 16. `importbatches`
- `shop`, `fileName`, `fileHash` (sha256), `fileSize`, `status` (`PREVIEW | COMMITTING | COMMITTED | FAILED |
  ROLLED_BACK`), `headers`, `mapping`, hidden `csvText`, `totals { rows, created, duplicate, failed, skipped,
  warnings }`, `report [{ row, code, name, outcome, messages }]` (every row that was not a clean create), `error`,
  `createdBy`, `committedBy`, `committedAt`.

## 17. `counters`
- `{ _id: "invoice:<shopId>" | "restock:<shopId>", seq }`, incremented inside the same transaction as the document.

## 18. `customers`
- `shop`, `name`, `phone` (E.164, unique per shop when present), `email`, `address`, `gstin`. Created or updated
  from the invoice form.

## 19. `invoices`
- `shop`, `number` (`<prefix>-000001`, unique per shop), `date`, `status` (`FINALIZED | CANCELLED`), `taxMode`,
  `taxLabel`, `gstSplit`, `customer`, `customerName`, `customerPhone`, `customerGstin`.
- `items [{ lineNo, product, code, barcode, name, unit, hsn, quantity, mrp, listPrice, unitPrice, discount,
  invoiceDiscountShare, taxRate, taxableValue, taxAmount, lineTotal, returnedQuantity }]` — snapshot at billing.
- Totals: `subtotal`, `itemDiscountTotal`, `invoiceDiscount`, `taxableTotal`, `taxTotal`, `roundOff`, `grandTotal`,
  `returnedTotal`, `netTotal`, `amountPaid` (payments − refunds), `refundedTotal`, `outstanding`, `refundDue`.
- `paymentStatus` (`PAID | PARTIALLY_PAID | UNPAID | REFUNDED | CANCELLED`; `OVERDUE` is derived when unpaid or partly
  paid past `dueDate`), `dueDate`, `notes`, `negativeStockAllowedBy`, `priceOverridden`, `returns [...]`,
  `idempotencyKey` (unique), `createdBy`, `cancelledAt`, `cancelledBy`, `cancelReason`.
- Indexes: unique `{ shop, number }`; unique `idempotencyKey`; `{ shop, date: -1 }`; `{ date: -1 }`;
  `{ paymentStatus, date: -1 }`; `{ status, date: -1 }`; `{ customer, date: -1 }`; `{ customerPhone }`;
  `{ items.product, date: -1 }`; unique partial `returns.idempotencyKey`.
- Deleted only by an admin invoice delete (`DELETE /billing/invoices/:id`), which first cancels a live invoice, then
  removes the invoice and its `payments`; its `inventorytransactions` rows stay and the `auditlogs` entry keeps a snapshot.

## 20. `payments`
- `shop`, `invoice`, `invoiceNumber`, `customer`, `customerName`, `kind` (`PAYMENT | REFUND`), `amount`, `method`
  (`CASH | UPI | CARD | BANK_TRANSFER | CHEQUE | OTHER`), `reference`, `note`, `receivedAt`, `recordedBy`,
  `idempotencyKey` (unique).
- Indexes: unique `idempotencyKey`; `{ invoice, receivedAt }`; `{ shop, receivedAt: -1 }`; `{ receivedAt: -1 }`;
  `{ method, receivedAt: -1 }`.
- Deleted together with their invoice when an admin deletes it.

## Transactions
Checkout, cancellation/rejection (stock restore), rider assignment, delivery completion, restocks, stock
adjustments, invoice creation, payments, refunds, invoice cancellation, returns and invoice deletion run inside
`utils/transaction.runInTransaction` (`session.withTransaction`). Atlas and the test replica set
(mongodb-memory-server `MongoMemoryReplSet`) both support transactions; a standalone `mongod` does not.

## Operating the database
- First-time setup or after a wipe: `cd backend && npm run db:init` (creates collections, syncs indexes, creates settings).
- First administrator: `npm run create-admin -- --name "Full Name" --phone 98XXXXXXXX` (password from `ADMIN_PASSWORD` or prompted).
- There is no seed script by design; create stores, categories, products and riders in the admin console.
- Backup: `npm run db:backup -- [folder]` (all collections as Extended JSON + manifest).
- Inventory CSV: `npm run inventory:import -- <file.csv> [--dry-run]`; undo an unused import with
  `npm run inventory:rollback-import -- <batchId>`.
- Product photo candidates: `npm run images:find-candidates -- [--limit N]` (barcode lookups; nothing is verified).
- Approve every pending candidate without a per-photo review: `npm run images:approve-pending -- --by <admin phone>
  [--limit N] [--dry-run]`. One photo per product; back up first.
