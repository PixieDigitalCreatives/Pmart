# PMart Backend Implementation Decisions

This document tracks the resolved requirement conflicts and critical architectural decisions for the PMart backend implementation.

## 1. Frontend Language & Architecture
* **Conflict**: TRD specified TypeScript, but the existing frontend is entirely JavaScript/JSX.
* **Decision**: **DO NOT migrate** the frontend to TypeScript. Retain the existing JavaScript/JSX architecture and components to avoid unnecessary rewrites. Modify only what is necessary to wire the real API.

## 2. MARG ERP Integration
* **Conflict**: Master prompt required integration, but no API specs were found in any PRD/TRD.
* **Decision**: Create the abstraction layer (`src/integrations/marg/`), but explicitly mark the integration as **BLOCKED** due to missing official specifications. Use `MARG_INTEGRATION_ENABLED=false` as the default.

## 3. Delivery OTP
* **Requirement**: OTP generation must be secure, configurable in length, and completely decoupled from Login OTP.
* **Decision**: The backend will support both 4-digit and 6-digit configurations via the `OTP_LENGTH` environment variable. OTPs will be securely hashed in storage, subject to attempt limits, and never exposed in plaintext API responses.

## 4. Payment Architecture
* **Conflict**: Backend PRD Section 1 stated "COD-Only", while Section 6 asked for configurable online payments.
* **Decision**: Build an extensible payment abstraction layer for future online payments, but strictly enable **only Cash on Delivery (COD)** for the current release (`PAYMENT_COD_ENABLED=true`, `PAYMENT_ONLINE_ENABLED=false`). Payment state remains independent of fulfillment state.
* **Status (2026-10-13)**: COD is the only payment method in code (`paymentMethod` enum has only `COD`); the `PAYMENT_COD_ENABLED` / `PAYMENT_ONLINE_ENABLED` flags were never implemented and are not read. Online payments remain future work.

## 5. Order State Machine
* **Decision**: A central transition table (`backend/src/modules/order/order.service.js#TRANSITIONS`) enforces the lifecycle `PENDING → ACCEPTED → PREPARING → READY → ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → ARRIVED → DELIVERED`, plus `REJECTED`, `CANCELLED` and `DELIVERY_FAILED` (re-dispatched as `READY`; the old `RETRY` status was removed). Each move lists the actors allowed to make it. No arbitrary client-side state manipulation is permitted.

## 6. Frontend Integration Strategy
* **Decision**: Do not delete frontend mocks prematurely. Integration will follow a strict pipeline: Backend endpoint implemented & tested → Frontend integrated → Verified on screen → Mock deleted. Empty responses from the backend will be correctly presented as empty UI states, with no fallback to fake data.
* **Status (2026-10-13)**: Completed. All mocks, demo data and fake features are gone; see decision 7.

## 7. Database rebuild and data policy (2026-10-13)
* **Decision**: Stay on MongoDB (a PostgreSQL design was produced but not adopted). All existing collections were backed up (gitignored `backups/mongo-pmart-2026-10-13/`) and dropped; 11 collections were recreated by `npm run db:init`. See `docs/PMart_DATABASE_REFERENCE.md`.
* **Decision**: No seed, demo, mock or test data in the application or the database. Tests build their own data in an in-memory database. The first admin is created with `npm run create-admin`; everything else through the admin console.
* **Decision**: Removed code is moved to the gitignored `backups/removed-2026-10-13/` rather than deleted.

## 8. Backend language
* **Decision**: The backend is plain CommonJS JavaScript (the partially migrated TypeScript sources were removed). Extension-less dynamic imports broke under Babel/Jest, so every module uses `require`.

## 9. Removed features
* **Decision**: Remove the development "auto-progress rider" simulator (`OrderProgressionJob`), the fake SMS notifier, mock Firebase, fake support chat, fake coupons and fake KPIs rather than keep them behind flags. Real notifications are listed as remaining work.

## 10. Delivery code and fees
* **Decision**: The delivery code is created when the order goes out for delivery, stored encrypted (so the customer can view it) and hashed (for verification), valid for 60 minutes with 5 attempts. Its length comes from `OTP_LENGTH` and is published at `/api/settings/public` so the rider app sizes its input.
* **Decision**: Fees live in the `settings` document. Delivery fee is waived at or above the free-delivery threshold; the handling fee is always charged. The web app computes the same bill from `/api/settings/public`, and the server price is authoritative.

## 11. Sessions
* **Decision**: Short-lived JWT access token plus a rotating, hashed refresh token in an httpOnly cookie. Only an explicit 401/403 from the server ends a session in the web app; network errors and 5xx keep the user signed in.
* **Decision**: Store owners and riders get a temporary password from an admin and must change it at first sign-in; staff get a one-time activation link (72 h, stored hashed).

## 12. Google sign-in availability
* **Decision**: The backend reports `googleSignIn` in `/api/settings/public`; the web app shows the Google button only when the server can verify Google tokens and the Firebase web config is present. There is no mock fallback.

## 13. In-store inventory, billing and payments (2026-11-04)
* **Decision**: Extend the existing `products` collection with the 17 inventory CSV fields instead of a parallel inventory collection, so the storefront, online checkout, restock and billing share one stock figure. Barcodes are an embedded `barcodes[]` array (multikey index) and invoice lines are embedded snapshots; a separate barcode / invoice-item collection would add joins without adding safety.
* **Decision**: Product codes are stored exactly as written (the source system has codes that differ only by a leading space); `codeKey` (trimmed, upper-case) is used for search and scanning. The product code is the duplicate-import key; barcodes and names are not unique.
* **Decision** (owner, 2026-11-04): Store Manager = Staff (EMPLOYEE) with a permission preset; selling price = `rate`, or MRP when `rate` is 0; imported products are not listed online until reviewed; negative CSV numbers are imported as 0 with the original text kept in `importSource.raw`; billing below zero stock needs `inventory.negative_stock` (admin) per invoice or the store-wide setting.
* **Decision**: Every stock change goes through `inventory.service.applyStockChange` in a transaction and writes a ledger row with a unique `dedupeKey`; invoice, restock, payment, cancel and return requests carry client idempotency keys. This is what guarantees "stock deducted exactly once".
* **Decision**: Product photos — only exact-barcode matches from Open Food / Beauty / Products Facts or staff uploads/URLs; all start as *Pending verification*; only users with `images.verify` can approve; approval copies the bytes into MongoDB (`productimages`), so nothing is hot-linked. No AI or stock imagery; `populate_catalog_images.js` was removed. Unverified images are never shown as the product photo; gallery URLs are no longer shown on the storefront.
* **Decision**: No GST rate is assumed: tax is off (`taxMode: NONE`) until configured; per-product `taxRate` overrides the default. PDFs use `pdfkit` with built-in fonts (amounts printed as "Rs.").
* **Decision**: The inventory CSV export writes every cell quoted and unescaped so codes like `+000462` round-trip exactly; unlike the orders export it does not formula-escape. Open it with "import as text" in spreadsheet software.
* **Decision** (owner, 2026-11-04): After reviewing a few candidates on *Product images*, the owner chose to approve every barcode-matched candidate in bulk instead of one by one (`npm run images:approve-pending`). The photos are still exact-barcode matches from Open*Facts, which are user-contributed, so some may show a different pack size or a poor photo. Approved photos are recorded as approved by the admin who ran it, with an audit entry marked `bulk: true`; wrong ones are rejected or replaced on *Product images*.
* **Decision** (owner, 2026-11-05): An administrator can permanently delete **any** invoice (ADMIN role only, not a grantable staff permission). A live invoice is cancelled first in the same transaction (stock back through the ledger with the cancellation's dedupe keys, paid money refunded by a chosen method). The invoice and its payment/refund rows are deleted; stock-ledger rows are kept so stock history still adds up; an audit entry with a snapshot is written inside the transaction. Invoice numbers are not reused, so a delete leaves a gap. Recommended instead: delete only cancelled invoices — the owner chose any invoice.

## 14. Visual redesign on one design system (2026-11-04)
* **Decision**: Redesign the web app through the shared layer (`src/styles` tokens and mixins, `src/components/ui`, the portal layouts) rather than page by page, keeping routes, props, behaviour, brand colours and card sizes unchanged. Hard-coded page colours were mapped onto the semantic tokens (maps excepted, because their route/marker colours are set in JS). Reference: `docs/PMart_UI_DESIGN_SYSTEM.md`.
* **Decision**: One "brand surface" (charcoal gradient + PMart-red glow + faint dot grid) is used for the footer, portal sidebars, rider header, sign-in panel and dark page headers, so every section shares the same colour treatment.
* **Decision**: The home hero no longer shows a photo. `public/hero-bg.png` was an AI-generated grocery scene, which conflicts with the rule that products show only verified photos and no stock or AI imagery; the hero then listed what every order includes (cash on delivery, live tracking, delivery-code handover). The file is left in `public/` until the owner confirms its removal.
* **Decision** (owner, 2026-11-05): The home hero banner was removed entirely; the home page opens with *Shop by category* and the product rows.
* **Decision** (owner, 2026-11-05, later the same day): The storefront home, header and footer follow the owner's mockup, which brings the hero back as a light card with the "Your Everyday Grocery Store" copy, three promise chips and a basket in the middle. The mockup's basket is a photograph; to keep the no-stock/AI-imagery rule it is drawn instead (SVG basket carrying the unchanged PMart logo, react-icons food icons). The logo stays as is. Notification dots and social icons from the mockup were not added (no data behind them).
* **Decision** (owner, 2026-11-05): Icons come only from `react-icons` (Tabler set for the interface, Game Icons for food illustrations); `lucide-react` was removed. Imports alias the old names so markup did not change, and `IconContext` keeps lucide's 24 px default size.
* **Decision** (owner, 2026-11-05): The 1,400 products with a verified photo and a price were listed online (flagged photos and ₹0 items held back), and products were sorted into categories by keywords in their names, because the CSV has no category or HSN column. Five non-food categories were added (Personal Care, Health & Wellness, Baby Care, Household & Cleaning, Pooja Needs). The script never overwrites an existing category and leaves names it doesn't recognise uncategorised rather than guessing. Both changes ran after a backup and wrote one audit entry per product under Super Admin.
* **Decision** (owner, 2026-11-05): The hero's three promise chips (Fresh Products, Fast Delivery, Trusted Quality) were removed on every screen size; the hero is the text and Shop Now button beside the basket, side by side on phones too.

## 15. Security hardening, module M0 (2026-11-05)
Source: [Security & Compliance Audit](docs/PMart_SECURITY_COMPLIANCE_AUDIT.md); the owner agreed to start with M0.
* **Decision**: In production the API accepts only exact origins from `ALLOWED_ORIGINS` and refuses to start when it is missing or contains `*`, a wildcard pattern or an `http://` origin. The blanket acceptance of every `*.vercel.app` / `*.netlify.app` origin (added for preview deployments) was removed: those are shared hosts where anyone can publish a page, and the API answers credentialed CORS requests. The audit plan had suggested keeping a project-scoped preview pattern; on review it was dropped too, because Vercel project names are first-come, so `pmart-*.vercel.app` can be registered by someone else. Preview URLs that must reach the API are listed one by one. Wildcards still work outside production.
* **Decision**: The refresh cookie defaults to `SameSite=Strict` everywhere (it used to default to `None` in production). `none` remains possible for a web app that calls the API on another site, with a start-up warning in production.
* **Decision**: Rate limits that protect accounts or money are keyed on the target mobile number (sign-in failures, 8 per 15 minutes, successes not counted) or the signed-in user, not only on the IP, because `TRUST_PROXY=2` lets a client that calls Render directly choose its own `X-Forwarded-For`. Accepted trade-off until the account lockout with safe recovery (M2): guessing can hold one number's sign-in closed for 15 minutes.
* **Decision**: Access tokens are HS256 with issuer `pmart-api` and audience `pmart-app`; tokens without them are refused. On deploy, tokens issued by the previous release stop working and the web app refreshes them silently (one extra request per signed-in tab).
* **Decision**: A staff manager can regenerate an activation link only for an employee whose permissions they all hold, matching the rule for creating staff.
* **Decision**: Staff changes to an online order's payment status need a reason and are audited with before/after values; `REFUNDED` only from `COLLECTED`. Riders are unchanged (they mark `COLLECTED` at the door). The full COD ledger is module M7.
* **Decision**: The web app sends an enforced Content-Security-Policy (no inline scripts; connections only to the app, the Render API, MapTiler and Google APIs) plus HSTS (no `includeSubDomains` until every subdomain of a custom domain is HTTPS) and Permissions-Policy. The Render URL is written into `connect-src`, so moving the API means editing `vercel.json` / `netlify.toml`.
* **Decision**: `xlsx` (SheetJS) stays on 0.18.5 for now. The fixed releases are published only on SheetJS's own CDN, not npm, so switching needs the owner's approval of that source (or a different library).


## 16. Security hardening, modules M1–M12 (2026-11-05)
Source: [Security & Compliance Audit](docs/PMart_SECURITY_COMPLIANCE_AUDIT.md).
* **M1 (Password input)**: All password inputs use `PasswordInput` (`TbEye`/`TbEyeOff` toggle, `aria-pressed`, design system tokens) preventing layout shift and accidental form submission.
* **M2 (Auth hardening)**: Password policy enforcing min 8/10 characters, common password blocklist, and phone number containment check. Per-account progressive lockout (5 failed attempts locks account for 15 minutes), constant-time dummy verification for non-existent accounts, tokenVersion checking in JWT and socket auth revoking tokens on password change/reset, multi-device sessions with family rotation reuse detection, and admin-issued single-use reset links.
* **M3 (CSRF & Cookies)**: Double-submit CSRF protection (`XSRF-TOKEN` cookie + `X-XSRF-TOKEN`/`X-CSRF-Token` headers) with exemptions for safe methods and Bearer-authenticated API calls. Short-lived 60-second single-use socket tickets for WebSocket connections.
* **M4 (MFA & Step-up)**: Pure Node.js `crypto` RFC 6238 TOTP implementation (Base32, AES-256-GCM encrypted secrets, 8 hashed single-use recovery codes, ±30s drift window) and step-up auth middleware for sensitive actions.
* **M5 (RBAC v2 & Approvals)**: Added `SUPER_ADMIN` role with administrative hierarchy protection. Added employee presets (`OPERATIONS_ADMIN`, `WAREHOUSE_STAFF`, `FINANCE_MANAGER`, `CUSTOMER_SUPPORT`, `AUDITOR`) and 9 new permissions. Maker-checker approval model (`Approval`) blocking self-approvals. Product soft deletion (`isArchived`, `archivedAt`).
* **M6 (Audit v2)**: Hash-chained tamper-evident audit log with SHA-256 block chain from `GENESIS`, sensitive data redaction, actor roles, and atomic transaction session writes.
* **M7 (COD Ledger)**: `CodCollection` and `RiderRemittance` models tracking delivery cash custody, handover variance reasons, and settlement status.
* **M8 (India Compliance)**: Versioned `Policy` and `PolicyAcceptance` tracking (Consumer Protection & DPDP), `ConsentRecord` (DPDP Act), `GrievanceTicket` with 48h acknowledgement and 30-day resolution SLA tracking, `DataRequest` (rights to access/correction/erasure), Legal Metrology fields on products, and FSSAI licence tracking.
* **M9 (Payment Provider Ready)**: Provider interface abstraction, `PaymentIntent` and idempotent `PaymentEvent` store with HMAC-SHA256 signature verification and replay protection.
* **M10 (Hybrid Marketplace Support)**: `Seller` and `SellerSettlement` models supporting multi-vendor commission calculation, Section 52 TCS compliance fields, and vendor data isolation.
* **M11 (Security Test Suite)**: Dedicated automated test suite in `backend/tests/security.test.js` validating CSRF enforcement, search injection sanitization, TOTP MFA and recovery code lifecycle, maker-checker approvals, Audit v2 hash chain integrity, and SUPER_ADMIN hierarchy.
* **M12 (Docs & Infrastructure)**: Documentation synchronization across `SECURITY.md`, `DECISIONS.md`, and feature matrices. Verified all 12 backend test suites pass (155+ tests) and frontend production build succeeds cleanly.

## 17. Simple ERP, Marg-Inspired POS Billing & Language Support (2026-11-17)
* **Architecture & Simplicity**: Built an intuitive digital shop assistant into the existing React and Node.js MERN architecture without duplicate collections or disruption of existing storefront/rider modules.
* **Language & Voice**: Implemented `LanguageContext` defaulting to Hindi (`hi`) with English (`en`) support, persistent in `localStorage`, using natural Hindi terms (`बिल बनाएं`, `नया बिल`, `सामान का स्टॉक`, `स्टॉक बढ़ाएं`, `सामान`, `ग्राहक`, `बिक्री`, `भुगतान`, `बाकी पैसे`, `पुराने बिल`, `ग्राहक का पूरा हिसाब`, etc.). Integrated optional Hindi speech synthesis (`useLanguage().speak()`) via browser Web Speech API.
* **Home ERP Dashboard**: Replaced dense admin overview with 8 large touch-friendly action cards, real-time KPI tiles (`आज की कुल बिक्री`, `आज बने बिल`, `आज मिले पैसे`, `बाकी पैसे`, `कम स्टॉक वाले सामान`, `खत्म हो चुके सामान`), and contextual help.
* **Fast POS Billing**: Upgraded `CreateInvoicePage` with walk-in default, mobile search, quick customer modal, barcode auto-add, stock level validation, amount in words (`amountToWords`), and 5 prominent payment modes: Cash, UPI, Card, Credit (Udhar), and Split Payment with real-time balance calculations.
* **Simple Restocking (स्टॉक बढ़ाएं)**: Three-method workflow in `RestockPage`: Method A (Barcode scan with auto-find and stock update), Method B (Name search), and Method C (Quick product registration when unknown, auto-setting opening stock).
* **Customer Management & Ledgers**: Reused `Customer` collection with credit limits and customer types (Retail/Wholesale). Added chronological statement ledger (`/api/billing/customers/:id/statement`) computing debits, credits, and running balance.
* **Outstandings Management (बाकी पैसे)**: Dedicated management screen (`/admin/billing/outstandings` & `/api/billing/outstandings`) tracking unpaid/partially paid bills with instant payment recording and receipt printing.
* **Professional Invoices**: Added WhatsApp share (`wa.me`), 58mm/80mm thermal receipt styles, A4 print, PDF download, and amount in words.
* **UI & Modal Layout Harmonization**: Standardized `.modal-head`/`.modal-header`, `.modal-body`, `.modal-foot`/`.modal-footer`, and `.btn-ghost` classes across `_globals.scss` and `_ui-components.scss`. Resolved layout overflow and button alignment in quick customer and outstanding payment modals.
* **POS Cart Table & Stepper Redesign**: Standardized POS cart table layout (`pos-billing-table`) with explicit column widths, proper right-alignment for financial values, integrated quantity stepper (`pos-qty-stepper`), clean price/discount inputs, and a dedicated 32px trash button (`btn-remove-line`) to prevent overflow squishing.
* **Storewide Inventory Stock Seeding**: Ran `set-minimum-stock.js` on MongoDB, bringing all 8,034 catalog items to at least 20 units in stock (`stockCount >= 20`), assigned categories to uncategorized items, and activated them (`isActive: true`) across both in-store billing and storefront.
* **DMart-Inspired 80mm Supermarket Tax Invoice**: Added `SupermarketReceipt` component and styling matching DMart's receipt: stylized brand header with CIN/GSTIN/FSSAI, items auto-grouped into numbered GST tax slabs, summary counts (`Items: X, Qty: Y`), full `<GST Breakup Details>` matrix with slab breakdown, customer tender receipt, signature `** Saved Rs. X/- On MRP **` highlight, and pure vector Code39 barcode of the bill number. Removed mock bank/POS slip details and placeholder cashier lines per user request. Added format switcher in `InvoiceDetailPage`.
* **Marg ERP Style Keyboard Shortcuts System**: Built `useAdminShortcuts` global navigation hook and `ShortcutHelpModal` cheat sheet modal (accessible via `F1` or `?`). Configured function keys across Admin (`F2` POS billing, `F3` Restock, `F4` Products, `Alt+H` ERP Home, `F6` Customers, `F7` Invoices, `F8` Outstandings, `F9` Payments, `F10` Reports, `Alt+L` Language switch). Added POS counter shortcuts (`Alt+1..5` for payment modes, `Alt+C` for customer, `Alt+X` for cart clear, `Ctrl+Enter` for invoice completion) with visual `<kbd>` badges on sidebar, dashboard cards, and payment buttons.

## 18. POS Billing Quantity Management Shortcuts & Multi-Scan (2026-11-18)
* **Direct Quantity Jump (`Alt + Q` / `F5`)**: Added keyboard shortcut to focus the Quantity field of the selected item with full number auto-selection (`input.select()`), allowing cashiers to type a new quantity immediately without using backspace or the mouse.
* **Instant Increment / Decrement (`+` / `-`)**: Global and Alt-supported shortcuts (`+` or `Alt + +`, `-` or `Alt + -`) instantly change the active item's quantity by +1 or -1 with stock protection.
* **Cart Row Navigation (`↑` / `↓`)**: Up and Down arrow keys move the active row selection across cart items, marked with a prominent visual highlight (`pos-selected-row`), with auto-focus propagation when actively editing quantities.
* **Active Item Deletion (`Delete` / `Alt + D`)**: Cashiers can remove the selected line item directly from the keyboard without clicking the trash button.
* **Barcode Multiplier Multi-Scan (`Qty*Barcode` / `Barcode*Qty`)**: Barcode scanner input automatically parses expressions such as `5*8906009082` or `10*VIM`, adding the exact quantity in a single scan.
* **Confirm & Return Flow (`Enter`)**: Pressing Enter inside the quantity field confirms the value and immediately returns focus to the barcode scanner box (`scanner.current?.focus()`).
* **POS Table Footer Guide**: Added `.pos-shortcuts-bar` below the billing items table showing live key hints, and synchronized all shortcuts into the `ShortcutHelpModal` cheat sheet (`F1`).
* **Dashboard Daily Collections Metric Bugfix**: Fixed `COLLECTED TODAY` KPI metric in `billing.controller.js`. Previously, `Payment.aggregate` summed all-time collections across store history. Added `todayCollected` with IST start-of-day filter (`receivedAt: { $gte: today }`), correctly separating today's collected cash/UPI from lifetime collected.
* **Thermal-Only Receipt Layout**: Streamlined invoice viewing and printing (`InvoiceDetailPage.jsx`) to exclusively output the 80mm supermarket thermal receipt (`SupermarketReceipt`). Removed the format switcher pill tabs and redundant A4 corporate template to keep POS operations fast and paper-optimized.
* **Render Free-Tier 24x7 Keep-Alive Architecture**: Implemented dual keep-alive heartbeat to prevent Render free-tier cold-start dormancy (15m inactivity spin-down). Server background interval in `backend/src/server.js` sends an unref'd keep-alive ping every 12 minutes to `/api/ping`, complemented by a 24x7 GitHub Actions cron ping every 10 minutes (`.github/workflows/keep-alive.yml`) with retries.
