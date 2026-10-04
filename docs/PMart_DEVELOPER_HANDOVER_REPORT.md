# PMart Developer Handover Report

## 1. Executive Summary
This document serves as the primary handover guide for the incoming developer of PMart, a production-style MERN/React quick-commerce project. The system has undergone significant architectural remediation, particularly concerning map telemetry and real-time routing.

**PROJECT STATUS:** FULLY VERIFIED (E2E lifecycle validated via Playwright)

## 2. Project Overview
PMart facilitates ultra-fast grocery delivery. The system is split into three main actor portals governed by a single backend:
1. **Customer**: Browses catalog, places orders, tracks delivery.
2. **Admin**: Receives orders, manages inventory, dispatches riders, tracks fleet.
3. **Rider**: Accepts orders, navigates via GPS, verifies OTP, completes delivery.

## 3. Technology Stack
- **Frontend**: React 19, Vite, React Router, SCSS, Framer Motion, Lucide React, Socket.IO Client.
- **Backend**: Node.js, Express, TypeScript, Mongoose/MongoDB, Socket.IO.
- **Map Providers**: MapLibre/MapTiler (Rendering), OSRM (Routing API).
- **Authentication**: Mobile number & password + JWT (Backend session logic).

## 4. Repository Structure
- `/src`: Frontend React Application.
- `/backend`: Node/Express Server.
- `/docs`: Project Documentation.
- `/scripts`: Miscellaneous utility scripts.
- `/e2e` / `playwright.config.js`: Test configurations.

## 5. Architecture
The application uses a standard decoupled Monolith architecture. The frontend connects to `/api` endpoints for state and standard operations, and maintains a persistent WebSocket connection (`socket.io`) for telemetry and status updates.

## 6. Authentication & Authorization
- **Authentication**: Implemented securely via Mobile Number and hashed password using local cryptjs encryption. A secure JWT is minted by the backend upon login.
- **Authorization**: Governed by a `role` enum (`CUSTOMER`, `RIDER`, `ADMIN`) on the `User` model, enforced via middleware (`backend/src/middleware/auth.middleware.ts`).

## 7. Customer Features
- Core flows (Browsing, Cart, Checkout) are CODE VERIFIED.
- The Live Tracking view dynamically recalculates routes using OSRM and updates ETAs gracefully without faking data.

## 8. Rider System & GPS
- The Rider app captures `navigator.geolocation.watchPosition()`.
- Data is emitted to backend API `/api/rider/location`.
- Backend persists to MongoDB (`RiderLocation`) and broadcasts `rider:location:update` over Socket.IO to connected clients.

## 9. Admin Live Tracking
- Admins possess a master view (`AdminLiveDeliveriesPage`).
- Selecting an active rider fetches their location and renders an independent MapLibre routing overlay without layout interference.

## 10. OTP Delivery Security
- To complete a delivery, the rider must collect a 4-digit OTP.
- The OTP is generated on `PICKED_UP`, AES-256 encrypted, and hashed before DB persistence.
- Verified server-side via `/api/rider/verify-otp`.

## 11. Known Bugs & Technical Debt
- **Address Tech Debt**: Redundant coordinate formats (`{lat, lng}` vs GeoJSON) exist across models.

## 12. Mock/Demo Audit
All UI elements historically relying on static coordinates, simulated ETAs, and straight-line paths have been excised. The live tracking system now exclusively depends on verifiable API outputs.

## 13. Remaining Work / Next Tasks
1. Complete API security audit tests (IDOR fixes have been implemented, need comprehensive security suite validation).
2. Migrate `zipCode` fields to `pincode` definitively.
3. Optimize external OSRM service calls with Redis/Memcached.

**Recommended First Task:**
Run `npm run test:e2e` (or equivalent Playwright commands) to view the automated E2E test in action and familiarize yourself with the full Customer -> Admin -> Rider order lifecycle.
