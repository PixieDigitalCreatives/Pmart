# PMart Security & India Compliance Audit, and Implementation Plan

_Audit date 2026-11-05. Static review of the current working tree (including the uncommitted inventory/billing,
UI-redesign and invoice-delete work), `npm audit`, and the backend test suite. Nothing was written to the live
database. This replaces neither [SECURITY.md](../SECURITY.md) (current controls) nor the historical
[Security Audit](PMart_SECURITY_AUDIT.md) (pre-rebuild code)._

> **Not legal advice.** The India-law sections list what the code does and does not support. Having policy pages
> or a consent screen does not make PMart compliant. Have the policies, invoices and processes reviewed by a
> chartered accountant (GST) and a lawyer (consumer protection, Legal Metrology, IT Act, DPDP) before launch.

**Status of the plan (§9):** the owner agreed to start with M0 on 2026-11-05. **M0 is done in the working tree (not
committed, not deployed)** — see §11. The order after M0 and the questions in §10 are still open.

---

## 1. Scope and method
- **Read**: both `package.json` files; every Mongoose model (`backend/src/models.js`, 20 models); `app.js`,
  `config/env.js`, `config/socket.js`; all middleware; every route file and the auth, admin, order, OTP, catalog,
  user, address, shop, rider, image-source, billing-model code paths; the web app's `apiClient`, `authService`,
  `socket.js`, routes and every password field; `vercel.json`, `render.yaml`, `netlify.toml`, `.env.example`.
- **Ran**: `npm audit --omit=dev` in `backend/` and the web root; the backend Jest suite (result in §8).
- **Not done**: dynamic penetration testing, checking the Render/Vercel/Atlas dashboards (their settings are not in
  the repo), and reading `backend/.env` values (secrets).

Severity: **Critical** = exploitable now with serious impact; **High** = exploitable under realistic conditions or
a missing control that a launch needs; **Medium** = defence-in-depth gap or integrity risk; **Low** = hardening.

## 2. What already works (keep it)
| Control | Evidence |
|---|---|
| Passwords hashed with bcrypt; hashes, refresh/setup tokens, OTP hash/ciphertext are `select: false` and never returned | `auth.model.js`, `order.model.js`, `order.service.js#populateOrder` |
| Refresh token is random, stored as SHA-256, rotated on use, sent only as an httpOnly cookie scoped to `/api/auth` | `auth.service.js#issueSession`, `auth.controller.js#getCookieOptions` |
| Forced first-login password change for owners/riders, enforced by the API | `auth.middleware.js#protect` (`MUST_CHANGE_PASSWORD`) |
| Staff activation links: 72 h, single use, stored hashed | `auth.service.js#activateAccount` |
| Request bodies parsed with zod allow-lists (no mass assignment of `role`, `permissions`, prices) | every controller; `tests/address.test.js`, `admin.test.js` |
| Search input type-checked, length-limited and regex-escaped; Express 5 "simple" query parser (no nested `$` objects from the query string) | `utils/validation.js#parseSearch`, `utils/regex.js` |
| Ownership-scoped reads/writes for customers, store owners and riders | `order.controller.js#scopeFilter`, `order.service.js#resolveActor`, `address.controller.js`, `catalog.controller.js#loadManagedProduct`, `config/socket.js` (rooms) |
| Order state machine with per-actor transitions; delivery needs a verified code and collected cash | `order.service.js#TRANSITIONS`, `#markDelivered` |
| Checkout priced server-side, idempotent per customer, stock reserved in a transaction | `order.controller.js#checkout`, `tests/checkout.test.js` |
| Ledger-backed stock with unique dedupe keys; invoices/payments/returns idempotent | `inventory.service.js`, `billing.model.js` indexes, `tests/billing.test.js` |
| Employees cannot grant permissions they do not hold when creating staff | `admin.controller.js#createEmployee` |
| SSRF guard on image URLs (https only, DNS-resolved private ranges refused, manual redirects) | `images/image-sources.js#assertPublicHttpsUrl` |
| Errors never leak stack traces; request ids on every response | `middleware/error.middleware.js`, `app.js` |
| CSV exports formula-escaped (orders) | `order.controller.js#exportOrdersCsv` |
| Production secret rules (JWT_SECRET ≥ 32 chars, no weak words; 32-byte OTP key) | `config/env.js`, `tests/env.test.js` |
| GST settings exist for in-store invoices: tax mode, default and per-product rate, CGST/SGST or IGST split, GSTIN, HSN per line; no rate assumed | `settings.model.js#billing`, `billing.model.js` |

## 3. Findings (most severe first)

| ID | Sev. | Finding | Evidence | Impact | Fix (module in §9) |
|---|---|---|---|---|---|
| F1 | **High** | **CORS trusts every `*.vercel.app` and `*.netlify.app` origin with credentials**, and the refresh cookie defaults to `SameSite=None` in production when `COOKIE_SAME_SITE` is unset. | `config/env.js:85-86`; `auth.controller.js:37` | If the cookie is ever `None` (variable missing on Render, or the web app calls Render directly), any page on any Vercel/Netlify site can call `POST /api/auth/refresh` with `credentials: 'include'`, read the new access token and take over the signed-in user — including admins. `render.yaml` sets `strict`, which blocks this only if the dashboard value matches (not verifiable from the repo). | Explicit origin allow-list (no preview patterns — see DECISIONS §15), default `SameSite=Strict`, refuse to start in production with `None` unless explicitly allowed. **M0** |
| F2 | **High** | **Per-IP rate limits can be bypassed by calling the Render URL directly.** `TRUST_PROXY=2` is right for Browser → Vercel → Render, but a direct request to `*.onrender.com` passes through one proxy only, so the client's own `X-Forwarded-For` value becomes `req.ip`. | `app.js` (`trust proxy`), `render.yaml` (`TRUST_PROXY: "2"`), `middleware/rate-limit.js` | Unlimited password guessing against any phone number (there is no per-account lockout, F4), and every other limit (checkout, OTP) is bypassable. | Per-account lockout that does not depend on IP (**M2**); rate-limit key that ignores spoofable hops and a limiter keyed on the target phone (**M0**); document blocking direct Render access (**M12**). |
| F3 | **High** | **Access token in `localStorage`; no Content-Security-Policy, HSTS or Permissions-Policy on the web app.** | `src/services/apiClient.js:5-9`; `vercel.json`, `netlify.toml` headers | Any XSS (including from a vulnerable dependency, see F15) can read the token and act as the user for up to an hour, and can call `/auth/refresh` to keep going. | HttpOnly cookie session + CSRF protection + socket ticket (**M3**); CSP/HSTS headers (**M0**/**M12**). |
| F4 | **High** | **No account lockout, no MFA.** Login is limited only per IP (10 / 15 min, production only); admins and finance-capable staff sign in with a password alone. | `auth.route.js`, `auth.service.js#login`, `rate-limit.js` (skipped in dev/test) | Credential stuffing / guessing against admin phone numbers (phone numbers are not secret). An admin can delete invoices, change prices and stock, and manage staff. | Progressive lockout + safe unlock (**M2**); TOTP MFA for super-admin/admin/privileged staff, step-up for sensitive actions (**M4**). |
| F5 | **High** | **Privilege escalation through activation links.** An employee with `employees.manage` can regenerate the activation link of *any* not-yet-activated employee (including one an admin created with permissions the caller lacks) and receives the token, so can activate that account and use its permissions. | `admin.controller.js:461-469` (`regenerateActivation`) | Staff → higher-privileged staff. | Apply the same "cannot hand out permissions you don't hold" rule as `createEmployee`; audit it. **M0** |
| F6 | Medium | **Password change / admin reset does not revoke access tokens already issued**; JWTs carry only the user id (no session or token version). Socket connections are authenticated once and never re-checked. | `auth.service.js:14-24`, `auth.middleware.js:24-35`, `config/socket.js:33-45` | A stolen access token keeps working for up to `JWT_EXPIRES_IN` (1 h) after the victim changes their password; a socket stays connected after deactivation. (Deactivation itself is immediate: `protect` re-reads `isActive`.) | Session id + token version claims checked in `protect` and on socket events; disconnect sockets on revoke. **M2** |
| F7 | Medium | **One refresh-token slot per user.** Signing in on a second device silently ends the first device's session at its next refresh; there is no device list, no "sign out everywhere", and reuse of an old rotated token is rejected but does not revoke the session family (theft is not detected). | `auth.service.js:19-24, 137-141` | Usability (staff on counter + phone) and no theft detection. | `sessions` collection, one row per device, refresh-family reuse detection, login/device history. **M2** |
| F8 | Medium | **No password reset.** Customers, store owners and activated staff cannot reset a forgotten password; recovery is a manual database edit. | `PMart_RECOVERY_PROCEDURE.md`; Remaining Work R18 | Lock-outs need a developer with database access (risky on the live DB). | Admin-issued, single-use, expiring reset links for every role now; self-service reset once an SMS/e-mail provider exists (needs credentials — §10). **M2** |
| F9 | Medium | **Admins are not protected from each other and there is no super-admin.** Any `ADMIN` can change another admin's phone (the login id) or deactivate them; no dual approval for high-risk actions (invoice delete, staff permission changes, settings, bulk deletes). | `admin.controller.js:471-495`; `billing.route.js` (`DELETE /invoices/:id`) | One compromised or careless admin account can lock out the others and remove financial records. | `SUPER_ADMIN`, hierarchy rules, approval requests for high-risk actions. **M5** |
| F10 | Medium | **COD money is one status field.** `paymentStatus` (`PENDING/COLLECTED/FAILED/REFUNDED`) is the only record; there is no rider cash custody, remittance to the store, reconciliation or settlement. Staff with `orders.manage` can set any payment status at any time with no reason and no audit entry (only an order-history note), e.g. `REFUNDED` on an undelivered COD order. | `order.model.js:23-28`; `order.controller.js:372-391` | Cash leakage cannot be detected; reports count "collected" cash that may never reach the store. | Separate order / payment / collection / remittance / settlement states, rider cash ledger, reconciliation, reasoned and audited overrides. **M7** |
| F11 | Medium | **Audit log is not tamper-evident and not complete.** Ordinary collection (editable by anyone with DB access); write failures are swallowed and most writes happen outside the business transaction; most entries store only changed field names (no before/after), no actor role, reason, user agent or request id; readable by anyone with `reports.read`. | `admin/audit.model.js:34-47`; e.g. `admin.controller.js#updateEmployee` | Weak evidence for disputes, fraud or a regulator. | Append-only audit v2 (hash chain, in-transaction writes, before/after with secret redaction, `audit.read` permission). **M6** |
| F12 | Medium | **Dependency advisories.** Backend: `body-parser` 2.0.0–2.3.0 (high), `zod` < 4.6.6 (high, memory exhaustion on oversized collections — the API accepts 5 MB JSON bodies and 12 MB on imports), plus 5 moderate (`qs`, `uuid`, `ip-address`, `glob`, `minimatch`). Web: `maplibre-gl` ≤ 6.4.0 (critical, sanitizer bypass, no fix yet), `xlsx` (high: prototype pollution and ReDoS, **no fix on npm** — used to parse uploaded spreadsheets in `BulkProductUploadModal.jsx`), `follow-redirects`, `@grpc/grpc-js`, `re2js` (high). | `npm audit --omit=dev`, 2026-11-05 | Memory DoS on the API; XSS/prototype pollution in the admin browser from a crafted file or map content. | Upgrade what has fixes; replace `xlsx` (SheetJS CDN build or CSV-only); track `maplibre-gl`. **M0** |
| F13 | Medium | **Delivery code is 4 digits by default and "resend" resets the attempt counter**, so the 5-attempt cap is per code, not per order; resends are limited only per IP in production. | `render.yaml` (`OTP_LENGTH: "4"`); `order.controller.js:358-369` → `otp.service.js#assignNewOtp` | A rider could mark an order delivered without the customer by cycling codes (small chance per cycle, unbounded cycles). | Per-order cap on codes and total attempts, 6 digits, alert on lock. **M7** |
| F14 | Low | Password policy is length ≥ 8 only (no common/breached-password check); bcrypt cost 10. | `utils/validation.js:16`, `utils/auth.js:31` | Weak passwords accepted. | Policy (length 10+, blocklist of common passwords, not containing the phone), bcrypt cost 12 with rehash on login. **M2** |
| F15 | Low | Login timing differs when the phone is not registered (no bcrypt comparison); registration says `PHONE_TAKEN` anyway, so phone enumeration is by design. | `auth.service.js:56-61` | Enumeration of registered phones. | Constant-time dummy compare; keep the register message (product decision). **M2** |
| F16 | Low | JWT verification does not pin the algorithm, issuer or audience. (`jsonwebtoken` 9 already refuses `none` with a secret.) | `auth.middleware.js:26`, `config/socket.js:36` | Defence in depth. | `algorithms: ['HS256']`, `iss`/`aud`. **M0** |
| F17 | Low | Products are hard-deleted (single and bulk) together with their photos; orders keep snapshots and the stock ledger keeps rows that point at a missing product. Invoice delete is hard by the owner's decision of 2026-11-05 (DECISIONS §13). | `catalog.controller.js:896-897, 917-918` | Lost history for disputes and Legal Metrology/GST records. | Soft delete (archive) for products; keep invoice delete as decided but behind approval (M5). **M5** |
| F18 | Low | Rider licence numbers and (future) seller KYC/bank details stored in plain text; the gitignored `backups/` folder on the developer machine holds password hashes and personal data. | `rider.model.js`; `SECURITY.md` §Data | Exposure if a backup or DB dump leaks. | Field-level encryption for licence/KYC/bank fields, backup handling rules. **M8/M12** |
| F19 | Low | MapTiler key in git history (known, Remaining Work R1). | Remaining Work R1 | Key abuse / billing. | Rotate and restrict by domain (manual). **M12** |

## 4. Requirement-by-requirement gap list (from the master prompt)

| Requirement | Today | Needed |
|---|---|---|
| Show/hide password toggle on every password field | None; 12 `type="password"` inputs across login, register, change password, activation, admin store-owner/rider/rider-reset forms | Reusable `PasswordInput` (design-system tokens, `aria-pressed`, label switches, independent per field, no layout shift) |
| Password strength rules | Length ≥ 8 | Server-side policy + client hints/meter |
| Login rate limit + lockout with safe recovery | Per-IP only, bypassable (F2) | Per-account progressive lockout; unlock by time, admin, or verified reset |
| Single-use expiring reset tokens | Only staff activation links | Reset links for all roles (admin-issued now; self-service needs SMS/e-mail) |
| Session expiry, revoke on password change, device history, secure logout | 1 h access / 7 d refresh, one device | Sessions per device, idle + absolute expiry, revoke-all on password change/reset, history UI |
| MFA for super-admin/privileged admins | None | TOTP + recovery codes, enforced by role/permission, step-up for sensitive actions |
| Browser auth off `localStorage` (HttpOnly/Secure/SameSite cookies + CSRF) | Bearer token in `localStorage` | Cookie session + double-submit CSRF token + Origin check; socket tickets |
| Roles SUPER_ADMIN … CUSTOMER, backend-enforced | 5 roles + 25 employee permissions (Store Manager preset) | Map onto existing roles/permissions (§5); hierarchy rules; dual approval |
| Strict schemas, zod everywhere, NoSQL-injection protection | Mostly done | Global guard rejecting `$`/`.` keys in bodies; zod upgrade; schema review of `Mixed` fields |
| Transactions for critical flows | Checkout, orders, stock, billing | Audit writes inside them; COD remittance/settlement |
| Never return hashes/OTPs/tokens | Done (setup/activation token deliberately returned once to the admin) | Keep; add tests |
| Sensitive-field encryption | Delivery code only | Licence/KYC/bank, MFA secrets |
| Hybrid marketplace (parent + seller sub-orders, commission, settlement, partial cancel/return) | Single store; checkout rejects mixed-store carts | New order model + seller module (large; see §9 M10 and §10 Q1) |
| COD with separate statuses, eligibility, limits, risk, reconciliation, idempotency | One `paymentStatus`; no limits | Full COD ledger (M7) |
| Payment-provider-ready (Razorpay/Cashfree), signed webhooks, refunds, reconciliation, no card data | COD only; enum has one value | Provider-agnostic payment intents, webhook verification, event store; disabled until credentials |
| Admin security: MFA, sensitive-action confirmation, approvals, alerts | Confirmation dialogs in the UI only | M4–M6 |
| Immutable audit log (actor, role, action, resource, before/after, IP, reason, no secrets) | Partial (F11) | Audit v2 |
| Versioned admin-editable policies + acceptance records | None (no policy pages at all) | Policy module |
| Consent + data-request handling (DPDP) | None | Consent records, notice, rights requests, retention |
| Grievance management (48 h ack, 1 month resolution) | None (Help page shows support phone/e-mail) | Ticketing with SLA clocks and grievance officer details |
| GST invoicing, configurable, no hard-coding | In-store invoices yes; **online orders have no tax invoice and no tax calculation** | Tax on online orders + invoice per order (CA review) |
| Legal Metrology listing fields, block incomplete listings | Has MRP, unit, manufacturer/company; missing address, net quantity, country of origin, consumer care, best-before, unit sale price | New fields + publish gate (§10 Q4 — 1,400 products are already online) |
| Infrastructure hardening | Helmet on API; minimal headers on web | CSP/HSTS, Atlas network/users, backups, monitoring, log retention (M12) |
| Security tests (injection, XSS, CSRF, brute force, escalation, seller leakage, webhook forgery, duplicate payments, inventory races, COD reconciliation) | Injection (search), ownership, concurrency for checkout/invoices exist | Added module by module, plus a dedicated security suite |

## 5. Proposed role mapping (keep existing roles working)

Today `role` is one of `CUSTOMER, RIDER, SHOP_OWNER, EMPLOYEE, ADMIN`, and staff power comes from `permissions[]`.
Proposal: add **one** new role value, `SUPER_ADMIN`; express the other requested staff roles as **named permission
presets on `EMPLOYEE`** (like today's Store Manager preset), stored as `staffRole` for display and approvals. This
needs no migration of existing users: current `ADMIN` accounts stay `ADMIN`; the owner's own account is promoted to
`SUPER_ADMIN` (with their go-ahead).

| Requested role | Maps to | Can | Cannot |
|---|---|---|---|
| SUPER_ADMIN | new role | everything; manage admins; approve high-risk actions; security settings | be deactivated by an ADMIN; the last one cannot be removed |
| ADMIN | existing `ADMIN` | all business operations | manage SUPER_ADMINs or other ADMINs' credentials; approve own high-risk requests |
| OPERATIONS_ADMIN | `EMPLOYEE` preset | orders, riders, stores, live deliveries, customers (read) | settings, staff, finance settlements |
| STORE_MANAGER | existing preset | counter billing, stock read/restock, payments record/read | adjustments, price override, deletes |
| WAREHOUSE_STAFF | `EMPLOYEE` preset | inventory read/restock/adjust, picking | billing, finance, customer data |
| FINANCE_MANAGER | `EMPLOYEE` preset | payments, COD reconciliation, settlements, invoices read, reports | catalog, staff |
| CUSTOMER_SUPPORT | `EMPLOYEE` preset | orders read, customer lookup (masked phone), grievance tickets, cancel within rules | payments, settings, exports of customer lists |
| AUDITOR | `EMPLOYEE` preset (read-only) | reports, audit log, ledgers, policies history | any write |
| SELLER | `SHOP_OWNER` today; becomes the marketplace seller in M10 | own store's products, orders, settlements | other sellers' data, platform settings |
| CUSTOMER | existing | own data | — |
| (RIDER) | existing | assigned delivery, own cash ledger | — |

New permissions needed: `audit.read`, `security.manage`, `approvals.review`, `cod.reconcile`, `settlements.manage`,
`grievances.manage`, `policies.manage`, `privacy.requests`, `customers.pii` (unmasked phone/address). Presets are a
UI convenience; the API checks permissions, as today.

## 6. Required changes (summary)

**Database (all additive; existing documents stay valid):**
`sessions` (per-device refresh sessions), `authevents` (login/device history, lockouts), fields on `users`
(`tokenVersion`, `failedLogins`, `lockedUntil`, `mfa.{secretEnc, enabledAt, recoveryCodeHashes}`, `staffRole`,
`passwordChangedAt`, `resetTokenHash/Expires`); `approvals`; audit v2 fields (`actorRole`, `before`, `after`,
`reason`, `userAgent`, `requestId`, `prevHash`, `hash`); COD: `codcollections`, `riderremittances`,
`reconciliations`, new order fields (`collectionStatus`, `remittanceStatus`, `settlementStatus`); `policies` +
`policyacceptances`; `consents`; `grievances`; `datarequests`; product Legal Metrology fields; payments:
`paymentintents`, `paymentevents`, `refunds`; marketplace (M10): `sellers`, `suborders`, `commissions`,
`settlements`. Index creation on Atlas and any backfill (e.g. COD statuses for existing orders) need a fresh
`npm run db:backup` and the owner's go-ahead.

**Backend:** new middleware (`csrf`, `requireMfa`, `requireRecentAuth`, `requireApproval`, `rejectMongoOperators`),
session service, lockout, reset links, MFA (TOTP via Node `crypto`, no new dependency), audit v2 helper, COD
services, policy/consent/grievance/data-request modules, payment provider interface + webhook route (raw body,
HMAC verification, idempotent event store), dependency upgrades.

**Frontend:** `PasswordInput`; cookie-based `apiClient` with CSRF header (no token in storage); MFA enrolment and
challenge screens; sessions/devices page; admin approvals inbox; security alerts; COD reconciliation screens;
policy editor + public policy pages + acceptance at sign-up/checkout; grievance and privacy-request forms
(customer) and queues (admin); Legal Metrology fields and publish blockers on the product form.

## 7. India legal-compliance gaps

Dates checked on 2026-11-05 against secondary sources (law-firm summaries); confirm against the Gazette.

| Law / rule | Applies now? | What it needs (summary) | PMart today | Support to build |
|---|---|---|---|---|
| **Consumer Protection (E-Commerce) Rules, 2020** | Yes | Grievance officer named on the platform; acknowledge complaints within 48 h, redress within one month; ticket number; seller name/address/contact; return, refund, exchange, warranty, delivery and cancellation terms shown before purchase; total price with all charges; no cancellation charges unless the platform bears similar charges when it cancels | Support phone/e-mail on Help page only; no policies, no grievance officer, no tickets | Policy module, grievance tickets with SLA clocks, seller details on product pages, price breakdown check |
| **CCPA Dark Patterns Guidelines, 2023** | Yes | No drip pricing, basket sneaking, false urgency, pre-ticked consent | Delivery and handling fees come from settings; not reviewed against the guidelines | Review checkout copy and fee display; consent boxes unticked by default |
| **Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6(10)** (e-commerce must display the label declarations) | Yes | Manufacturer/packer/importer name and address, generic name, net quantity, MRP (inclusive of taxes), unit sale price, consumer-care details, country of origin for imported goods, best-before/use-by where applicable | Has MRP, unit, manufacturer/company text; the rest missing for all 8,034 products | Structured fields, storefront display, publish gate |
| **Legal Metrology (Packaged Commodities) Amendment Rules, 2026 — Rule 6(10A)** (in force 1 July 2026) | Yes | Searchable/sortable country-of-origin filter for imported products | None | Filter on search/category pages once the field exists |
| **FSSAI** (food business on e-commerce) | Yes for food | FSSAI licence/registration of the seller displayed; food-safety information | None | `fssaiLicence` on store/seller, shown on food product pages |
| **GST (CGST Act/Rules)** | Yes if registered | Tax invoice with prescribed particulars (GSTIN, HSN, place of supply, tax split); e-invoicing above the turnover threshold; marketplace operators collect TCS (s.52) on third-party sales | In-store invoices configurable; **online orders: no tax, no invoice** | Tax on online orders, order invoice/receipt, HSN required for taxable listing, TCS fields in settlements (M10). **CA review required.** |
| **IT Act s.43A + SPDI Rules, 2011** | Yes (until replaced by DPDP provisions) | Published privacy policy; consent for sensitive data (passwords are listed); reasonable security practices; grievance officer | No privacy policy | Policy module; security work in M0–M6 |
| **CERT-In Directions (28 Apr 2022)** | Yes | Report specified incidents within 6 h; keep ICT logs for 180 days (in India); sync clocks | Console logs only (Render retention is short) | Structured security events + log shipping (infra, M12) |
| **DPDP Act 2023 + DPDP Rules 2025** (Rules notified 13/14 Nov 2025) | Board/definitions: since Nov 2025. Consent managers: ~Nov 2026. **Notice, consent, security safeguards, breach notification, rights, retention: from ~13/14 May 2027** | Itemised notice, free and specific consent with easy withdrawal, security safeguards incl. logs kept ≥ 1 year, breach notice to the Board and users, rights to access/correct/erase and grievance redressal, verifiable parental consent for under-18s | None of these | Consent records, notice versions, data-request workflow, retention jobs, breach runbook — build now so it is in place before May 2027 |
| **IT (Intermediary Guidelines) Rules, 2021** | If PMart hosts third-party sellers (marketplace) | Grievance officer, published rules/terms, takedown handling | Not a marketplace yet | Part of M10 + policy module |

## 8. Baseline test result
Backend Jest suite on 2026-11-05 (`npx jest --runInBand`, in-memory replica set via `MONGOMS_SYSTEM_BINARY`, run
on the current working tree before any change from this plan): **11 suites, 132 tests, all passed** (202 s).
No web-app build or lint was run for this audit (no front-end code changed).

## 9. Implementation plan (proposed order, by criticality)

Each module ships with its tests and doc updates (AGENTS.md). Backend before frontend inside a module; the backend
keeps accepting the current web app until its frontend part is deployed (Render and Vercel deploy separately).
No module writes to the live database; schema changes there wait for a backup and the owner's go-ahead.

| # | Module | Contents | Fixes | Size | Needs from owner |
|---|---|---|---|---|---|
| **M0** | Quick hardening | CORS allow-list (drop blanket `*.vercel.app`/`*.netlify.app`), `SameSite=Strict` default + production guard, rate-limit key that ignores spoofed hops + per-phone login limiter, activation-link escalation fix, payment-status override needs reason + audit entry, JWT `HS256`/`iss`/`aud`, dependency upgrades (zod, body-parser via express), `xlsx` replacement, CSP/HSTS/Permissions-Policy in `vercel.json`/`netlify.toml` | F1, F2 (part), F5, F10 (part), F12, F16, F3 (headers) | S | The exact production web origin(s) (Vercel domain) |
| **M1** | `PasswordInput` | Reusable component in `src/components/ui`, used on all 12 password fields; tokens from the design system | UX requirement | S | — |
| **M2** | Auth hardening | Sessions per device + family reuse detection, token version (revoke on password change/reset/deactivate), socket re-check, progressive lockout + unlock, password policy + rehash, admin-issued reset links for every role, login/device history + "sign out other devices", constant-time login | F2, F4 (lockout), F6, F7, F8, F14, F15 | M | Whether an SMS/e-mail provider will be added for self-service reset (credentials later) |
| **M3** | Cookie sessions + CSRF | Access token as HttpOnly cookie, double-submit CSRF token + Origin check, short-lived socket ticket (sockets reach Render directly, not through Vercel), web app stops storing tokens; transition release accepting both | F3 | M | Confirm production web app uses `VITE_API_BASE_URL=/api` (the Vercel rewrite) |
| **M4** | MFA + step-up | TOTP enrolment (secret encrypted, recovery codes hashed), required for SUPER_ADMIN/ADMIN and staff holding `employees.manage`/`settings.manage`/finance permissions; step-up re-auth for sensitive actions | F4 | M | OK to show the setup key as text + `otpauth://` link (a QR image needs a small new dependency) |
| **M5** | RBAC v2 + approvals | `SUPER_ADMIN`, staff presets (§5), new permissions, hierarchy rules, last-super-admin guard, approval requests (maker–checker) for invoice delete, staff permission changes, settings, bulk deletes, COD write-offs; product soft delete | F9, F17 | M | Who is SUPER_ADMIN; which actions need a second approver; what happens when only one admin exists |
| **M6** | Audit v2 + alerts | Append-only hash-chained audit, in-transaction writes, before/after with redaction, `audit.read`, security alerts (lockouts, MFA resets, permission changes, after-hours deletes) on the admin dashboard | F11 | M | — |
| **M7** | COD ledger | Order / payment / delivery / collection / remittance / settlement states; rider cash custody, remittance to store, reconciliation with variance reasons; eligibility, order-value and outstanding-cash limits, risk rules; delivery-code caps | F10, F13 | L | COD limits (max order value, rider cash limit), and go-ahead + backup to backfill existing orders |
| **M8** | India compliance support | Versioned policy module + acceptance records; consent records; grievance tickets with 48 h / 1 month clocks; privacy-request workflow; Legal Metrology fields + publish gate + country-of-origin filter; FSSAI field; tax on online orders + order invoice; field encryption for licence numbers | §7 | L | Policy texts from a lawyer (we build the structure, not the legal text); grievance officer details; how to treat the 1,400 already-listed products; CA sign-off on online-order tax |
| **M9** | Payment-provider-ready | Provider interface, payment intents, raw-body signed webhooks with replay protection, idempotent event store, refunds, daily reconciliation; disabled by default; tested with fake signatures only | prompt §payments | M | Razorpay or Cashfree; credentials only when going live (never invented) |
| **M10** | Hybrid marketplace | Sellers, parent orders with seller sub-orders, item snapshots, commission rules, settlement records, partial cancel/return/delivery, TCS fields, seller data isolation | prompt §marketplace | XL | Is onboarding third-party sellers actually planned? If not, defer |
| **M11** | Security test suite | Dedicated suite for injection, XSS payload storage/escaping, CSRF, brute force, privilege escalation, seller isolation, webhook forgery, duplicate payments, inventory races, COD reconciliation (most tests land with their module; this fills gaps) | — | M | — |
| **M12** | Infrastructure & launch docs | Deployment security guide (Render/Vercel/Atlas settings that code can't enforce), restricting direct Render access, Atlas IP access list and least-privilege DB users, backup/restore drill, log shipping and retention, MapTiler rotation, production launch checklist | F2, F18, F19 | S | Access to dashboards is the owner's; we document the steps |

Suggested first batch: **M0 → M1 → M2**, then **M3 → M4 → M5 → M6**, then **M7 → M8**, then M9/M10 as the
business needs them. M11/M12 run alongside.

## 10. Questions for the owner
1. **Marketplace (M10):** will PMart host third-party sellers soon? It is the largest change (order model) and
   brings intermediary and TCS obligations. Recommendation: defer until there is a first seller.
2. **Production origin (M0/M3):** the exact web domain(s) the API must accept, and confirmation that the deployed
   web app calls `/api` through the Vercel rewrite (the root `.env` points straight at Render).
3. **Super admin (M5):** which account becomes `SUPER_ADMIN`, and which actions must need a second person.
4. **Already-listed products (M8):** enforce the Legal Metrology gate (a) for new listings only with a warning list
   for the 1,400 live ones, (b) for all at once (they go offline until filled), or (c) after a grace date.
5. **Password reset channel (M2):** admin-issued links only for now, or add an SMS/e-mail provider (needs credentials).
6. **COD limits (M7):** maximum COD order value, maximum cash a rider may hold, and whether repeat failed deliveries
   should disable COD for a customer.
7. **Payments (M9):** Razorpay or Cashfree, and when.

## 11. Progress

### M0 — quick hardening (2026-11-05, working tree; not committed or deployed)
| Finding | Status | What changed | Evidence |
|---|---|---|---|
| F1 | **Fixed in code** (needs deploy + Render `ALLOWED_ORIGINS`) | Production accepts exact origins only; start-up refuses missing/`*`/wildcard/`http://` entries; blanket `*.vercel.app`/`*.netlify.app` removed; cookie default `SameSite=Strict`, warning for `none` | `config/env.js`, `auth.controller.js`; `env.test.js`, `auth.test.js` |
| F2 | **Partly fixed** | Failed sign-ins limited per mobile number (8 / 15 min, any IP); checkout, delivery code, password change, admin mutations, rider location, routing, barcode lookup limited per signed-in user. Left: account lockout (M2), blocking direct Render access (M12); register/search/global limits are still IP-based | `middleware/rate-limit.js`, route files; `auth.test.js` "sign-in throttling" |
| F3 | **Partly fixed** | Enforced CSP, HSTS, Permissions-Policy on the web app. Left: token out of `localStorage` (M3) | `vercel.json`, `netlify.toml`; sandbox check (Test Strategy) |
| F5 | **Fixed in code** | Activation-link regeneration follows the "no permissions you don't hold" rule | `admin.controller.js#regenerateActivation`; `admin.test.js` |
| F10 | **Partly fixed** | Staff payment-status changes need a reason, are audited with before/after, and `REFUNDED` needs `COLLECTED`. Left: COD ledger (M7) | `order.controller.js#updatePaymentStatus`; `order-lifecycle.test.js` |
| F12 | **Partly fixed** | Backend: zod 4.6.7, body-parser 2.4.0 (0 high left; 7 moderate inside firebase-admin's unused Firestore/Storage). Web: follow-redirects 1.16.2, re2js gone. Left: `xlsx` (owner decision), `maplibre-gl` (no upstream fix; popups don't use HTML), `@grpc/grpc-js` (Firestore, not imported), `minimatch` (build-time via `@maptiler/sdk`) | `npm audit --omit=dev` after the fixes |
| F16 | **Fixed in code** | HS256 + issuer `pmart-api` + audience `pmart-app`, one helper for REST and sockets | `utils/jwt.js`; `auth.test.js` |

Checks: backend 11 suites / **142 tests passing** (132 before M0); `vite build` passes; `npm run lint` unchanged
(1 pre-existing error in `LocationModal.jsx`, R29; 83 warnings; none in changed files). Web headers checked on a
sandbox only (not on Vercel).

Deploy notes: set Render `ALLOWED_ORIGINS` to the exact web origin(s) before deploying; tokens from the previous
release are refused once and refreshed silently; if the API URL is not `https://pmart-66mp.onrender.com`, edit the
CSP `connect-src` in `vercel.json` / `netlify.toml`.
