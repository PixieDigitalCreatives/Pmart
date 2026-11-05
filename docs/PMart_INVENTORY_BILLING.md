# PMart Inventory, Barcode, Billing & Payments Module

Status: implemented 2026-11-04 (phases 1–5). Sections marked *(result)* come from real runs, not assumptions.


## 1. What already existed (inspected 2026-11-04)

| Area | Finding | Consequence |
|------|---------|-------------|
| Backend | Express 5 + Mongoose 8, modules under `backend/src/modules/*`, Zod validation, `HttpError`, `recordAudit()`, `runInTransaction()` (Atlas replica set; tests use `MongoMemoryReplSet`) | New modules follow the same layout; stock/invoice/payment writes use `runInTransaction` |
| Auth | Roles `ADMIN`, `EMPLOYEE` (granular `permissions[]`), `SHOP_OWNER`, `RIDER`, `CUSTOMER`; `authorizePermission()` | **Store Manager = EMPLOYEE with a "Store Manager" permission preset** (decided with the owner) |
| Catalog | `Product` (storefront fields, integer `stockCount ≥ 0`, required `category`), `Category` | `Product` is extended with the CSV fields instead of adding a parallel collection |
| Online orders | Checkout decrements `stockCount` atomically; cancellation restores it | Both now also write stock-ledger entries |
| Scanner | **No scanner code existed.** The store's scanner is a USB device that types like a keyboard | One shared scanner hook/component is built and reused on every page |
| Images | `imageUrl` string only; no upload storage; `populate_catalog_images.js` filled URLs | Images get a verification workflow; uploads stored in MongoDB (`productimages`) |
| PDF | No PDF library | `pdfkit` added to the backend |
| Database | Atlas `pmart`: products 0 (cleared 2026-11-04), 7 categories, 1 shop, 5 orders | Backup taken before migration (see §7) |

## 2. CSV analysis — `order.csv` *(result of parsing the real file)*

- 8,034 data rows, 17 columns, every row 17 fields wide, no fully identical rows.
- `code`: 8,034 distinct, never empty → **the duplicate-import key** (per store). 1,460 codes start with `0`
  (e.g. `0000708`), 5,006 contain letters (e.g. `HALDIRA454`, `+000462`). 7 codes have surrounding spaces, and two
  pairs differ only by that space (`" Z1039"` CADBURY CELEBRATIONS vs `"Z1039"` MARGO 100GM; `" HALDIRA73"` vs
  `"HALDIRA73"`) — they are different items, so codes are stored **exactly as written** (found by the first dry run).
- `barcode`: 977 empty, 63 not digits (e.g. `657432698+66`, `Cash received`, `CF000001`), 13 values shared by
  2–3 products, 6,629 are 13-digit EANs, 25 start with `0`. Barcodes are **not unique** and some are not real barcodes.
- `name`: 7,624 distinct; 286 names repeat (`AAA` ×5, `5 STAR` ×2) → names are never used as a key.
- `stock`: 5,723 negative (min −5,947), 25 fractional. `value` (= stock × cost): 3,048 negative. `cost`: 9 negative.
- `rate` (selling rate): 0 in 5,853 rows. `mrp`: 0 in 47 rows. `deal`, `free`, `pur_deal`, `pur_free`: all 0.
- `manufact`: filled in 1 row. `rackno`: filled in 286 rows. `company`: 175 values, many are suppliers/placeholders
  (`ZZZZZZ 109`).

## 3. Decisions (agreed with the owner on 2026-11-04)

1. **Store Manager** = Staff (EMPLOYEE) account with the *Store Manager* permission preset.
2. **Selling price** used by invoices and the storefront = `rate` when `rate > 0`, otherwise `mrp`. The original
   `rate` is stored unchanged.
3. **Storefront**: imported products are **not listed online** (`isActive: false`) until someone assigns a category
   and image and switches them on. They can be scanned, restocked and billed in store.
4. **Negative numbers in the CSV are imported as 0** (`stock`, `value`, `cost`). The original text of all 17 columns
   is kept verbatim on each product in `importSource.raw`, and each change is listed in the import report.
5. Billing a product below zero stock is blocked; a user holding `inventory.negative_stock` (Admin) can override it
   per invoice.
6. **Deleting invoices** (owner, 2026-11-05): an **administrator** (ADMIN role; no grantable permission) can delete
   **any** invoice. One that is not cancelled yet is cancelled first, in the same transaction: stock not already
   returned goes back through the ledger and everything paid is refunded by a chosen method. Then the invoice and its
   payment / refund rows are deleted; stock-ledger rows are kept, and an audit entry keeps a snapshot of what was
   deleted. The invoice number is not reused (it leaves a gap).

## 4. CSV column → product field mapping

The same table drives the importer, the exporter and the product form (`backend/src/modules/inventory/csv-fields.js`).
Exports always use the original CSV column names.

| CSV column | Product field | Type | Notes |
|---|---|---|---|
| code | `code` + `codeKey` | string | `code` kept exactly (spaces and leading zeros included), unique per store; `codeKey` = trimmed upper-case copy used by search and scanning |
| name | `name` | string | trimmed; not unique |
| unit | `unit` | string | e.g. `PCS`, `24PC`; empty allowed (stored as `''`) |
| stock | `stockCount` | number (3 dp) | the one stock figure used by billing, restock and the storefront |
| deal | `deal` | number | sales deal quantity |
| free | `free` | number | sales free quantity |
| pur_deal | `purDeal` | number | purchase deal quantity |
| pur_free | `purFree` | number | purchase free quantity |
| cost | `cost` | number (4 dp) | cost price |
| value | `stockValue` | number (2 dp) | imported as given; recomputed as `max(stock,0) × cost` after each stock movement |
| mrp | `mrp` | number (2 dp) | no longer forced up to the price |
| pur_rate | `purRate` | number (4 dp) | purchase rate; updated by restocks that enter a new rate (audited) |
| rate | `rate` | number (2 dp) | selling rate; `price = rate > 0 ? rate : mrp` |
| company | `company` | string | company / supplier |
| manufact | `manufacturer` | string | optional |
| rackno | `rackNo` | string | optional |
| barcode | `barcode` + `barcodes[]` | string | primary barcode kept verbatim; `barcodes[]` holds every scannable code |

## 5. Architecture

### New / extended collections

| Collection | Purpose | Key indexes |
|---|---|---|
| `products` (extended) | CSV fields, `barcodes[]`, `taxRate`, `hsn`, `image{status,source,sourceUrl,verifiedAt,verifiedBy}`, `importSource{batch,row,raw}` | `{shop,code}` unique, `codeKey`, `barcodes`, `name` text, `{shop,stockCount}`, `image.status` |
| `productimages` | Candidate and uploaded images, review status, source, licence, cached bytes | `{product,status}`, `{status,createdAt}` |
| `inventorytransactions` | Stock ledger: OPENING, RESTOCK, SALE, SALE_REVERSAL, RETURN, ADJUSTMENT, ONLINE_ORDER, ONLINE_ORDER_REVERSAL | `{product,createdAt}`, `{shop,type,createdAt}`, `dedupeKey` unique |
| `restocks` | Received qty, free qty, purchase rate, supplier, reference no., user | `{shop,createdAt}`, `{product,createdAt}`, `idempotencyKey` unique |
| `invoices` | Invoice header + embedded line items (snapshot) + returns | `{shop,number}` unique, `idempotencyKey` unique, `{shop,date}`, `{paymentStatus,date}`, `customerPhone` |
| `payments` | Payment and refund entries against invoices | `{invoice,receivedAt}`, `{shop,receivedAt}`, `{method,receivedAt}`, `idempotencyKey` unique |
| `customers` | Walk-in billing customers (name, phone) | `{shop,phone}` unique |
| `suppliers` | Suppliers entered on restocks | `{shop,nameKey}` unique |
| `importbatches` | CSV import previews, mapping and per-row report | `{shop,createdAt}`, `fileHash` |
| `counters` | Invoice / restock numbering; numbers are never reused (an admin-deleted invoice leaves a gap) | `_id` |

Barcodes are an embedded array on the product (multikey index) rather than a separate collection: a lookup is
one indexed query and adding/removing a barcode is atomic with the product. Invoice items are embedded snapshots for
the same reason. Both are recorded in `DECISIONS.md`.

### Barcode scanner

A USB scanner types the code fast and ends with Enter (`hooks/useBarcodeScanner.js`). Since 2026-11-05 a scan is
picked up anywhere on the screen, including while the cursor is in another text box:

- Cursor outside text boxes: at least 4 characters with no gap over 100 ms, then Enter (slower Bluetooth scanners included;
  it was 60 ms).
- Cursor in another text box (search, customer name …): at least 6 characters with no gap over 35 ms and Enter straight
  after — faster than anyone types — and the scanned characters are removed from that box again. Before this change
  such scans were ignored and the barcode was left as text in the box, which looked like the scanner not working.
- Gaps are measured with the key events' own timestamps, so a screen that re-renders after every keystroke (New
  invoice) doesn't make a fast scanner look slow.
- Password boxes and dropdowns are never touched; the scan box itself (`ScannerInput`) still handles its own Enter.
- The browser window must have focus: a scan while another app has focus types there instead (on 2026-11-05 a scan
  reached a chat window this way).
- A barcode that isn't on any product (for example 8906115882758, scanned by the owner on 2026-11-05) opens Add
  product on Products and shows "not found" on New invoice — that is the expected result, not a scanner fault.

| Screen | What a scan does |
|---|---|
| Products | Opens the product; an unknown barcode opens Add product with the barcode filled in |
| Product form | Fills the barcode field |
| Restock | Picks the product; scanning it again adds 1 received |
| New invoice | Adds the product; scanning it again adds 1 to the quantity |
| Invoices | Finds invoices by invoice number or by a product on them |
| Stock ledger | Shows that product's movements; with *Adjust stock* open, picks the product to adjust |
| Any other admin screen | Opens the product through the Products screen (ignored while a dialog is open) |

A barcode used by more than one product shows a chooser.

### Reliability rules

- Every stock change goes through `inventory.service.applyStockChange()` inside a MongoDB transaction and writes one
  `inventorytransactions` row with `stockBefore`/`stockAfter`. Nothing else writes `stockCount`.
- Invoice creation, payment recording, cancellation and returns each take a client-generated `idempotencyKey`
  (unique index). A repeated request returns the original result; ledger rows also carry a unique `dedupeKey`, so a
  stock movement can never be applied twice.
- Invoice numbers come from an atomic counter inside the same transaction.
- Payment status is recomputed from the payments ledger on every change; generating an invoice never marks it paid.
- Deleting an invoice (admin only) reuses the cancellation's ledger dedupe keys (`INV:<id>:L<n>:CANCEL`), so an
  invoice's stock is put back at most once whether it was cancelled, deleted, or both. The audit entry is written in
  the delete transaction, so an invoice cannot disappear without one; a repeated delete finds that entry and is a no-op.

### Permissions (new)

| Permission | Admin | Store Manager preset |
|---|---|---|
| `inventory.read` — search/view products, stock, ledger | ✓ | ✓ |
| `inventory.restock` | ✓ | ✓ |
| `inventory.adjust` — manual stock corrections | ✓ | – |
| `inventory.negative_stock` — bill below zero | ✓ | – |
| `catalog.manage` — add/edit products (existing) | ✓ | – (grantable) |
| `catalog.delete` — delete products | ✓ | – |
| `catalog.import` — CSV import | ✓ | – |
| `images.verify` — approve/reject/upload verified images | ✓ | – |
| `invoices.create` | ✓ | ✓ |
| `invoices.read` | ✓ | ✓ |
| `invoices.cancel` — cancel / return | ✓ | – |
| Delete an invoice — ADMIN role only, not a grantable permission | ✓ | – |
| `billing.price_override` — edit selling price / discount on an invoice | ✓ | – (grantable) |
| `payments.record` | ✓ | ✓ |
| `payments.read` | ✓ | ✓ |
| `reports.read` (existing) — reports and exports | ✓ | – |

## 6. Real product images

- Sources, in order: admin upload of the actual photo → Open Food Facts / Open Beauty Facts / Open Products Facts
  looked up **by exact barcode** (valid GTIN-8/12/13/14 check digit only). No AI generation, no name-based guessing,
  no fabricated URLs, no category images.
- A found image is stored as a **Pending Verification** candidate with its source page URL, the source's own
  product name/brand/quantity (so the reviewer can compare) and licence. Only a user with `images.verify` can
  approve it; approval copies the image into PMart storage and sets the product image to **Verified**.
- Products with no approved image show a neutral "Image Not Available" placeholder everywhere; pending candidates
  are only shown inside the review dashboard, labelled as unverified.
- **Bulk approval** (owner's decision, 2026-11-04): `npm run images:approve-pending -- --by <admin phone>
  [--limit N] [--dry-run]` approves every pending barcode-match candidate as that admin, without a per-photo review.
  It approves one photo per product, skips products that already have a verified photo, writes an audit entry for
  each photo, and paces downloads to about 2 a second. A failed download stays pending; after 3 network failures in
  a row on one image server, the rest of that server's candidates wait for the next run. Any wrong photo can still be
  rejected or replaced on *Product images*.

## 7. Backup, migration and rollback

1. **Backup** (before any schema change): every collection exported as Extended JSON to the gitignored
   `backups/pre-inventory-2026-11-04/` with a manifest of counts.
2. **Migration**: additive. New fields have defaults; `npm run db:init` creates the new collections and indexes.
   Existing products: none (catalog cleared earlier the same day).
3. **Import**: through the CSV import (UI or `npm run inventory:import -- <file>`); creates one `importbatches`
   record.
4. **Rollback**:
   - Undo an import: `npm run inventory:rollback-import -- <batchId>` deletes only the products created by that batch
     that have no ledger rows other than OPENING and are on no invoice; it reports anything it kept.
   - Full rollback: drop `productimages, inventorytransactions, restocks, invoices, payments, customers, suppliers,
     importbatches, counters`, then restore `products`/`settings`/`users` from the backup folder.

## 8. Phases

| Phase | Scope |
|---|---|
| 1 | Product model, CSV import (preview, mapping, report, export), product management, barcode lookup, image sourcing and verification |
| 2 | Stock ledger, restock (scan + search), manual adjustments, history |
| 3 | Invoices: scan/search billing, discounts, tax, PDF, print, stock deduction exactly once, cancellation, returns |
| 4 | Billing dashboard, payments (full/partial/multiple), payment history, outstanding, filters |
| 5 | Reports with CSV/PDF export, permissions, tests |

## 9. Import of `order.csv` into Atlas *(result, 2026-11-04)*

| Step | Result |
|---|---|
| Backup | `backups/pre-inventory-2026-11-04/` (all 11 collections, manifest; products were already 0) |
| `npm run db:init` | 20 collections; products index `code_1` replaced by `codeKey_1` |
| Dry run 1 | 8,032 ready, **2 duplicates** → codes differing only by a leading space; fixed by keeping codes verbatim |
| Dry run 2 | 8,034 ready, 0 duplicates, 0 failed, 0 skipped, 5,732 rows with warnings |
| Commit (batch `6aeb1209221cd51f90e3a597`, 22 s) | **8,034 created**, 0 duplicate, 0 failed, 0 skipped |
| Check against the file | 8,034/8,034 rows found by code; all 17 `importSource.raw` values identical to the file; 1,460 leading-zero codes and 25 leading-zero barcodes intact; 5,723 negative stocks now 0; 1,993 OPENING ledger rows (products with stock > 0); 0 products listed online |
| Warnings in the report | 5,721 negative stock → 0, 3,046 negative value → 0, 9 negative cost → 0, 14 shared barcodes (incl. the text `Cash received`) |
| Pricing | 5,853 products sell at MRP because `rate` is 0; 43 have neither rate nor MRP (price 0 — billing refuses them until a price is set) |

## 10. Real product images *(result)*

`npm run images:find-candidates` looked products up by exact barcode (6,760 have a valid GTIN). First pass: 2,050
searched, **207 candidates** (Open Food Facts 97, Open Beauty Facts 95, Open Products Facts 15), e.g. `5 STAR OREO`
`7622202320330` → "Cadbury 5 Star Oreo 40g". It stopped on an Atlas DNS error; most failed lookups were HTTP 429
(rate limit). The script now paces itself (1.5 s per service), backs off on 429, and leaves failed products to be
retried on the next run instead of marking them searched. It was restarted for the remaining ~4,700 products (about
4–5 s per product, so several hours; it can be stopped and re-run at any time).

**Approval (2026-11-04/05).** The owner approved about 31 photos one by one on *Product images*, then asked for
all the rest to be approved. After a full backup (`backups/pre-image-approval-2026-11-04/`),
`npm run images:approve-pending -- --by <Super Admin>` approved **1,577** candidates in two runs. The first run
approved 428 (including a 2-photo trial); `images.openfoodfacts.org` was unreachable, so its photos waited. The second
run approved the remaining 1,149 with 0 failures.

| Result | Count |
|---|---|
| Products with a verified photo | **1,608** (Open Food Facts 1,185, Open Beauty Facts 345, Open Products Facts 78; ~33 MB of images) |
| Pending candidates (found by the still-running search after the approval) | 95 |
| Products still "Image Not Available" | 6,331 |

Checked: 20 random verified photos served as `image/jpeg` by `GET /api/product-images/:id`; pending ones return
404; every verified product has an `imageUrl` and `image.imageId`; one audit entry per bulk approval.

**Photos to double-check.** A read-only comparison of each approved photo's source name and pack size with the PMart
product name produced `backups/photos-to-check-2026-11-05.csv`. It flags 208 photos: 119 with a different pack size
and 101 sharing no name word (12 have both). Many are the same product in another pack size or a spelling variant,
but some are a different product altogether, for example `ARIEL PERFECTWASH 500G` with a "2-Minute Noodles" photo
and `ZANDU BALM 8ML` with "AQua Gulf". Open Food Facts data is user-contributed, so barcode matches can be wrong.

## 11. Files

**Backend — new:** `modules/inventory/{inventory.model, inventory.service, import.service, inventory.controller,
inventory.route, csv-fields}.js`, `modules/images/{image.model, image-sources, image.service}.js`,
`modules/billing/{billing.model, billing.calc, billing.service, billing.controller, billing.route, invoice-pdf}.js`,
`modules/reports/{report.service, report-export, report.route}.js`, `utils/{csv, barcode}.js`,
`scripts/{db-backup, inventory-import, inventory-rollback-import, find-image-candidates, approve-pending-images}.js`,
`tests/{inventory, billing}.test.js`.
**Backend — changed:** `catalog.model.js` (CSV fields, `codeKey`, `barcodes`, `image`, `importSource`, optional
category, decimal stock), `catalog.controller.js` (new fields, ledger-backed stock edits, permissions, filters,
price-change audit), `order.controller.js` / `order.service.js` (online orders write the stock ledger),
`auth.model.js` (15 new permissions + Store Manager preset), `auth.middleware.js` (`authorizeAny`),
`settings.model.js` + `admin.controller.js` (billing settings), `env.js`, `app.js`, `models.js`, `package.json`
(`pdfkit` 0.17.2, scripts). **Removed:** `backend/scripts/populate_catalog_images.js` (assigned stock photos by
product name — against the exact-photo rule).
**Web — new:** `pages/inventory/{InventoryImportPage, RestockPage, StockLedgerPage, ImageReviewPage,
InventoryReportsPage}.jsx`, `pages/billing/{BillingDashboardPage, CreateInvoicePage, InvoicesPage, InvoiceDetailPage,
BillingPaymentsPage}.jsx`, `components/inventory/{ScannerInput, CameraScanner, ProductSearch, ProductThumb,
Pagination}.jsx` + `inventory.scss`, `hooks/useBarcodeScanner.js`, `services/{inventoryService, billingService}.js`,
`utils/{format, invoiceCalc, imageFile}.js`, `components/billing/DeleteInvoiceModal.jsx` (2026-11-05).
**Web — changed:** `ShopProductsPage`, `ShopProductNewPage`, `AdminLayout` (+ `min-width: 0` overflow fix),
`PermissionSelector`, `AdminSettingsPage`, `AppRoutes`, `RoleGuard` (any-of permissions), storefront `ProductCard`,
`ProductDetailPage`, `CartDrawer`, `CartPage` (verified photo or "Image Not Available" only).

## 12. API *(all under `/api`; staff = ADMIN or EMPLOYEE with the listed permission)*

| Method & path | Permission | Purpose |
|---|---|---|
| GET `/inventory/fields` | staff | The 17 CSV columns and their fields |
| GET `/inventory/lookup?code=` | inventory.read / restock / invoices.create / catalog.manage | Exact barcode (incl. UPC↔EAN) or product-code lookup |
| GET `/inventory/barcode-check?barcode=&exclude=` | inventory.read / catalog.manage | Products already using a barcode |
| GET `/inventory/external-lookup?barcode=` | catalog.manage (30/min) | Open*Facts details for an unknown barcode, `verified: false` |
| GET `/inventory/export.csv` | inventory.read | Whole inventory, original 17 columns first |
| POST `/inventory/imports/preview` · GET `/inventory/imports` · GET `/inventory/imports/:id` · GET `/inventory/imports/:id/report.csv` · POST `/inventory/imports/:id/commit` | catalog.import | CSV import (body up to 12 MB) |
| POST `/inventory/imports/:id/rollback` | ADMIN | Undo an unused import |
| POST `/inventory/restocks` · GET `/inventory/restocks` · GET `/inventory/suppliers` | inventory.restock (list: inventory.read) | Restocks |
| POST `/inventory/adjustments` | inventory.adjust | Manual stock correction (reason required) |
| GET `/inventory/transactions` | inventory.read | Stock ledger |
| GET `/inventory/images` · GET `/inventory/products/:id/images` · GET `/inventory/images/:imageId/file` | inventory.read / images.verify | Image dashboard and previews |
| POST `/inventory/images/find-candidates` | images.verify / catalog.manage | Barcode search for ≤ 10 products |
| POST `/inventory/products/:id/images/upload` · `/url` | catalog.manage / images.verify (`markVerified` needs images.verify) | Add a photo or a candidate URL |
| POST `/inventory/images/:imageId/approve` · `/reject` | images.verify | Verify / reject / remove |
| GET `/product-images/:id` | public | Bytes of an **approved** photo only (404 otherwise) |
| GET `/billing/dashboard` | invoices.read / payments.read | Overview figures |
| GET `/billing/settings` · GET `/billing/customers` | invoices.create / invoices.read | Billing settings for the POS; customer lookup |
| POST `/billing/invoices` | invoices.create (+ billing.price_override, inventory.negative_stock) | Create + finalise (idempotent) |
| GET `/billing/invoices` · `/:id` · `/:id/pdf` · `/:id/movements` | invoices.read | List (filters: search, from, to, paymentStatus incl. OVERDUE, method, product, customer, sort), detail, PDF |
| POST `/billing/invoices/:id/payments` | payments.record | Record a payment (≤ outstanding, idempotent) |
| POST `/billing/invoices/:id/cancel` · `/returns` · `/refunds` | invoices.cancel | Cancel (stock back, refund), return lines, refund |
| DELETE `/billing/invoices/:id` | ADMIN | Body `{ reason (3–300), refundMethod? }` (`refundMethod` required when a live invoice has money paid: 400 `REFUND_METHOD_REQUIRED`). Cancels a live invoice first, then deletes it and its payments; ledger rows stay; audit snapshot. Returns `{ _id, number, deleted, stockRestored, refunded, refundMethod, paymentsDeleted }`; a repeat returns the same with `replayed: true` |
| GET `/billing/payments` | payments.read | Payment history with per-method totals |
| GET `/reports` · GET `/reports/:type?from&to&format=json\|csv\|pdf` | reports.read | 13 reports |
| `/manage/products*` (changed) | list/detail: catalog.manage or inventory.read; delete: catalog.delete; stock edits: inventory.adjust | New fields, filters `field`, `stock`, `online`, `image`, `sort`; responses carry barcode `warnings` |
| PUT `/admin/settings` (changed) | settings.manage | Accepts a `billing` object |

## 13. Environment

| Variable | Default | Purpose |
|---|---|---|
| `PRODUCT_LOOKUP_ENABLED` | `true` | `false` turns off all calls to Open Food/Beauty/Products Facts |
| `PRODUCT_LOOKUP_USER_AGENT` | `PMart-Inventory/1.0 (store inventory; contact: admin@pmart.local)` | Those services ask for an app name and a real contact e-mail; set one in production |

No other new variables. Images are stored in MongoDB (`productimages`), so no object storage is needed.

## 14. Testing *(result)*

- Backend: **132 tests, 11 suites, all passing** on 2026-11-05 (94 existing + 21 `inventory.test.js` + 17
  `billing.test.js`; 129 on 2026-11-04, + 3 invoice-delete tests).
  Covers: import keeps all 17 raw fields, leading zeros, negatives → 0, duplicates never overwritten, double commit,
  custom mapping, export round-trip, rollback, codes differing by a space; lookup by barcode (UPC/EAN forms) and code;
  search by name/company/stock; add product for an unknown barcode with shared-barcode warning; category required to
  list online; stock never edited without inventory.adjust (ledger row written); price-change audit; restock
  (received + free, rate change, idempotent replay, supplier); adjustments; image candidates by exact barcode only,
  wrong-barcode records ignored, approval only by images.verify, public 404 for unapproved, reject → placeholder,
  upload rules, private-URL refusal; invoice maths (line + shared discount, exclusive/inclusive tax, rounding);
  stock deducted exactly once (repeat and concurrent requests); negative stock blocked / admin override; price
  override permission; no-price refusal; GST settings; full / partial / multiple payments, overpayment refused,
  overdue status and filters; dashboard figures; cancellation (stock back once, refund, outstanding 0); returns;
  PDF; reports JSON/CSV/PDF and permissions; online orders and cancellations in the same ledger; invoice delete
  (admin only — 403 for a Store Manager and for staff holding every permission; reason required; a cancelled invoice
  is removed with its payment + refund, stock untouched, both ledger rows kept, audit snapshot; a live part-paid
  invoice with a partial return needs a refund method, then stock comes back once for what was not returned; two
  simultaneous deletes → one deletes, one replays; the next invoice number is not reused).
- Web: `vite build` passes; `oxlint` shows no errors in new files (warnings follow existing patterns).
- Browser (2026-11-04) on a **sandbox** API (in-memory MongoDB loaded with a copy of `order.csv`, session-only test
  accounts; the live database was not touched): admin sign-in; Products list with imported data; scanning a barcode
  opened the product; product form shows all fields and the original CSV values; Restock by scan (0 + 10 + 2 = 12,
  rate change shown, RST-000001, ledger row); New invoice by two scans (one line, qty 2), customer, ₹50 part payment →
  INV-000001 Partially paid, stock 12 → 10; payment of ₹70 → Paid; cancellation → stock 10 → 12, ₹120 refund (this
  run found the "outstanding still shown on a cancelled invoice" bug, fixed and covered by a test); billing overview,
  stock ledger, image review, import history, reports; Store Manager account sees only billing/inventory menus and no
  add/import/delete controls; no horizontal overflow at 1440 px and 768 px (an admin-wide overflow was fixed).
  Screenshots were mostly unavailable (hidden window), so visual polish was only partly seen.
- Browser (2026-11-04, live data, read-only actions): after the owner reported a scan doing nothing on the Stock
  ledger (it had no scanner), scanning was added there and to every other admin screen. Simulated scans: on Stock
  ledger a barcode filtered to that product, a shared barcode showed the chooser, and with *Adjust stock* open the scan
  picked the product (not saved); on Overview a scan opened the product; on Products a scan was handled once.
- Browser (2026-11-05) on a **sandbox** API (in-memory MongoDB, four sandbox invoices, session-only test accounts;
  the live database was not touched), invoice delete: on Invoices, the row's delete button opened the dialog without
  opening the invoice; the confirm button stayed disabled until a reason was typed; deleting the cancelled ₹30
  INV-000001 removed the row with the toast "INV-000001 deleted." From the INV-000002 page (₹610, ₹200 paid) the
  dialog asked how to refund ₹200 (UPI chosen); after deleting, the page went back to Invoices, the stock ledger
  showed the two lines put back (chips 47 → 49, ghee 19 → 20, reason "Invoice deleted: …"), and Payment history no
  longer listed its payment. The unpaid INV-000003 was deleted at 375 px (dialog 337 px wide, no page overflow; the
  table scrolls inside its frame). A Store Manager saw no delete action and the API returned 403. The old link of a
  deleted invoice shows "Invoice not found". The button turns the error tint on hover (measured). Screenshots were
  not usable (hidden window), so the dialog's look was checked by measurements only.

## 15. Limitations and not verified

- **Photos were approved in bulk, not reviewed one by one** (owner's decision): 1,608 products have a verified
  barcode-match photo, and 208 of them are flagged for a second look in `backups/photos-to-check-2026-11-05.csv`
  (some are the wrong product). 6,331 products still show "Image Not Available" until someone uploads the real
  photo. New candidates from the ongoing search need approval again (`npm run images:approve-pending`).
- Physical USB scanner and camera scanning were **not tested with hardware** (keyboard-wedge behaviour was simulated
  by typing + Enter; camera needs a browser with `BarcodeDetector`, e.g. Chrome on Android — not Windows desktop).
- PDF invoices use the built-in Helvetica font, so amounts print as "Rs." (no ₹ glyph) and non-Latin names will not
  render; embed a Unicode font if needed.
- 5,723 products now have stock 0 (were negative): they cannot be billed until restocked, adjusted after a count,
  or an admin allows negative stock on the invoice.
- Images are stored in MongoDB; on the Atlas free tier (512 MB) keep uploads small (the web app resizes to 1000 px).
- Tax: GST rates are not set per product (the CSV has none); configure the mode and default rate in Settings.
- Deleting a paid invoice removes its payment and refund rows, so Payment history and the "collected" figures for
  the days those payments were taken change afterwards (payment and refund drop out together, so net collections
  stay consistent). The stock ledger keeps rows that point at the deleted invoice; their link opens "Invoice not
  found". The audit-log snapshot is the only record of a deleted invoice's lines and payments.
- The deployed API on Render runs the old code until it is redeployed; the imported products are hidden from the
  storefront, so the old deployment is unaffected.
