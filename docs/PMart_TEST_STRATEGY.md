# PMart Test Strategy

This document outlines the testing strategy for the PMart quick-commerce platform, detailing the environments, tools, testing types, and responsibilities.

## 1. Objective
Ensure functional completeness, real-time synchronization, and security isolation across all three main platform portals:
- Customer App (Shopping, Checkout, Live Tracking)
- Rider App (GPS Telemetry, Deliveries, OTP Verification)
- Admin Portal (Order Dispatch, Fleet Tracking)

## 2. Test Environments
1. **Local Dev**: Running on `localhost` utilizing local MongoDB or a shared Dev cluster. Uses test/dummy Firebase accounts.
2. **E2E Validation**: Requires at least three simultaneous browser contexts (Customer, Admin, Rider) to verify real-time Socket.IO propagation.
3. **Mocking Boundaries**: 
   - Geolocation MUST NOT be entirely mocked for E2E. The `browser_subagent` or Playwright should inject real coordinate changes via `watchPosition` overrides.
   - OSRM Routing should use the live `router.project-osrm.org` API.

## 3. Types of Testing
### Unit Testing (Backend)
- Tool: Jest
- Focus: Models, Validation schemas, Utility functions (e.g., OTP generation).
- Known Status: Limited unit test coverage; mostly integration level scripts (`test_*.js`).

### Integration Testing (Backend)
- Focus: API boundaries, JWT validation, database queries.
- Existing tools: Several manual `.ts` and `.cjs` scripts found in the backend root (`test-pickup.ts`, `test-e2e.ts`). 
- Need: Transition these manual node scripts into automated Jest/Supertest suites.

### End-to-End (E2E) Testing
- Tool: Playwright
- Focus: Critical user journeys (Add to Cart -> Checkout -> Admin Accept -> Rider Pickup -> Live Tracking -> Delivery).
- Status: A basic Playwright setup exists (`@playwright/test` in `package.json`), but formal scenarios are missing or incomplete.

## 4. Key Risk Areas
1. **Real-time Telemetry (Socket.IO)**: Connections dropping or rider switching networks can cause tracking stalls.
2. **Address Normalization**: Converting `pincode` to `zipCode` and merging legacy address schemas.
3. **Concurrency**: Multiple admins trying to accept the same order simultaneously.
4. **OTP Security**: Exposing the OTP hash in the wrong API payload.

## 5. Security Testing Requirements
- **JWT Tampering**: Verify that tokens cannot be fabricated.
- **IDOR (Insecure Direct Object Reference)**: Ensure Customer A cannot call `GET /order/:customerB_id`.
- **Role Isolation**: Ensure a Rider token cannot hit `/admin/*` endpoints.

## 6. Execution Rules
- Do not mark an E2E test as "PASS" unless it was executed in a real browser context.
- Tests relying on direct database mutation (bypassing the API) are invalid for E2E sign-off.
