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
