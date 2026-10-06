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

## 5. Order State Machine
* **Decision**: A central `OrderStateMachine` will enforce the single canonical lifecycle: `PENDING → ACCEPTED → PREPARING → READY → ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED`. No arbitrary client-side state manipulation is permitted.

## 6. Frontend Integration Strategy
* **Decision**: Do not delete frontend mocks prematurely. Integration will follow a strict pipeline: Backend endpoint implemented & tested → Frontend integrated → Verified on screen → Mock deleted. Empty responses from the backend will be correctly presented as empty UI states, with no fallback to fake data.
