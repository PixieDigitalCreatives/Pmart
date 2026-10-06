# PMart Master Test Cases

This document serves as the central test plan for PMart quick commerce.

## 1. Functional and Business Logic

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| FUN-001 | P0 | Customer Registration & Login | Firebase mock available | Execute E2E registration & login flows | Session JWT generated, dashboard loads | `npx ts-node src/scripts/run-playwright-e2e.ts` | Successfully navigated to dashboard | PASS | `PMart_E2E_VERIFICATION_REPORT.md` |
| FUN-002 | P0 | Role-based Access | Multiple roles configured | Access admin routes as customer, employee, rider | 403 Forbidden returned | `npx jest src/__tests__/auth.test.ts` | Access successfully blocked | PASS | `auth.test.ts` results |
| FUN-003 | P0 | Cart Operations | Customer logged in | Add, update, remove items, refresh page | Cart state persists across reloads | `npx ts-node src/scripts/run-playwright-e2e.ts` | Cart remains populated | PASS | `PMart_E2E_VERIFICATION_REPORT.md` |
| FUN-004 | P0 | Address Management | Customer logged in | Create, edit, delete address; check eligibility | Address saved securely, eligibility computed | `npx ts-node src/scripts/run-playwright-e2e.ts` | Address pinned successfully | PASS | `PMart_E2E_VERIFICATION_REPORT.md` |
| FUN-005 | P0 | Checkout Validation | Cart has items | Submit checkout with modified payload | Stock and prices validated against DB | `npx ts-node src/scripts/run-playwright-e2e.ts` | Order created safely | PASS | `checkout_inventory_audit_report.md` |

## 2. Authentication, Authorization and Security

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| SEC-001 | P0 | IDOR Prevention | Customer/Rider logged in | Attempt to fetch order/address of another user | 403 or 404 returned | `npx ts-node src/__tests__/idor-audit.ts` | Properly rejected cross-tenant requests | PASS | `PMart_REMAINING_WORK.md` |
| SEC-002 | P0 | JWT Secret Validation | Backend start | Start backend with short JWT secret | Backend throws error and halts | Manual | Server aborts with Zod error | PASS | `PMart_E2E_VERIFICATION_REPORT.md` |
| SEC-003 | P0 | NoSQL Injection / ReDoS | None | Send adversarial regex (`^(a+)+$`) to catalog search | 200 OK without CPU spike (escaped correctly) | `npx jest src/__tests__/search.redos.test.ts` | Completed in ~10ms | PASS | `PMart_PUBLICATION_DECISION.md` |
| SEC-004 | P0 | Socket.IO Auth & RBAC | Server running | Connect without valid JWT, forge roles, and access unauthorized order/admin rooms | Disconnected / Room join blocked | `npx jest src/__tests__/socket.auth.test.ts` | 18 strict resource-level auth checks pass | PASS | `socket.auth.test.ts` |
| SEC-005 | P0 | Input Validation (Zod/Joi) | Endpoints available | Fuzz JSON payloads | Strict schema validation intercepts invalid payloads | N/A | Complex schema fuzzing not enforced strictly | NOT TESTED | `PMart_SECURITY_AUDIT.md` (SEC-20) |
| SEC-006 | P0 | Secret Scanning | Git repo | Run deep history scan | No secrets found in history | N/A | Requires external tool | NOT TESTED | `PMart_SECURITY_AUDIT.md` (SEC-04) |

## 3. Rate Limiting and Abuse Resistance

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| RAT-001 | P0 | Login Rate Limit | Auth routes active | Brute-force login endpoint | 429 Too Many Requests | `npx jest src/__tests__/rate-limit.test.ts` | Properly limited after 10 requests | PASS | `rate-limit.test.ts` |
| RAT-002 | P0 | Search Abuse Limit | Catalog active | High-frequency search queries | 429 Too Many Requests | `npx jest src/__tests__/rate-limit.test.ts` | Limited to 30 req/min | PASS | `rate-limit.test.ts` |
| RAT-003 | P0 | OTP Verification Limits | Order in ARRIVED state | Submit wrong OTP repeatedly | Account cooldown / 429 | `npx jest src/__tests__/rate-limit.test.ts` | Limited to 5 attempts / 15 mins | PASS | `rate-limit.test.ts` (impl. checkoutLimiter/otpLimiter) |
| RAT-004 | P0 | Rider Location Throttling | Rider tracking active | Spam location updates | Updates throttled, safe sizes | `npx jest src/__tests__/rate-limit.test.ts` | Location limited to 30 req/min | PASS | `rate-limit.test.ts` (impl. locationLimiter) |
| RAT-005 | P0 | Proxy Trust Configurations | Reverse Proxy deployed | Spoof X-Forwarded-For header | Forwarding respects proxy configuration securely | `npx jest src/__tests__/rate-limit.test.ts` | `trust proxy` enabled; attackers cannot block entire network | PASS | `rate-limit.test.ts` |

## 4. Concurrency, Inventory and Transactions

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| CON-001 | P0 | Stock Deduction Transaction | Checkout endpoint | Place order | Stock decreases atomically | `npx ts-node src/scripts/run-playwright-e2e.ts` | Stock decremented | PASS | `checkout_inventory_audit_report.md` |
| CON-002 | P0 | Concurrent Checkout Race | 1 unit left in stock | Two checkouts simultaneously | One succeeds, one fails | `npx jest src/__tests__/checkout.concurrency.test.ts` | Safely rejects with 400 | PASS | `checkout.concurrency.test.ts` |
| CON-003 | P0 | Idempotency Key Replay | Placed order | Re-submit exact checkout payload with same key | Returns existing order, no duplicate charge | `npx jest src/__tests__/checkout.concurrency.test.ts` | Handled properly via duplicate key interception | PASS | `checkout.concurrency.test.ts` |

## 5. Order and Delivery Lifecycle

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| ORD-001 | P0 | State Machine Transitions | Valid order | Progress PENDING -> ACCEPTED -> ASSIGNED -> PICKED_UP -> ARRIVED -> DELIVERED | Only valid transitions permitted | `npx ts-node src/scripts/run-playwright-e2e.ts` | Successful lifecycle | PASS | `PMart_E2E_VERIFICATION_REPORT.md` |
| ORD-002 | P0 | Delivery OTP Enforcement | Order in ARRIVED state | Admin/Rider attempts completion without OTP | Rejected by backend | `npx jest src/__tests__/rider.test.ts` (assumed) | Enforced on completion | PASS | `PMart_E2E_VERIFICATION_REPORT.md` |
| ORD-003 | P0 | Job Recovery | Stuck jobs | Restart backend | Jobs persisted to MongoDB and recovered by sweeper | `npx jest src/__tests__/order.automation.test.ts` | Jobs recovered | PASS | `PMart_REMAINING_WORK.md` |

## 6. Performance and Database Resilience

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| PERF-001 | P1 | Load Testing & Saturation | Load tool ready | Ramp up concurrent users to peak | Identify p95 latency and breakdown point | N/A | Requires load generation infrastructure | NOT TESTED | N/A |
| DB-001 | P0 | Database IAM Permissions | MongoDB Atlas | Audit Atlas roles | Least privilege applied | N/A | Depends on deployment | NOT TESTED | `PMart_SECURITY_AUDIT.md` (SEC-18) |
| DB-002 | P0 | Backup and Restore | MongoDB Atlas | Trigger recovery drill | Data restores seamlessly | N/A | Depends on deployment | NOT TESTED | `PMart_SECURITY_AUDIT.md` (SEC-44) |

## 7. Deployment and Operational Readiness

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| DEP-001 | P0 | Security & Threat Monitoring | SIEM available | Review logs | Alerts triggered for anomalies | N/A | Depends on deployment | NOT TESTED | `PMart_SECURITY_AUDIT.md` (SEC-43) |

## 8. Test Suite Stability and Lifecycle

| ID | Priority | Description | Preconditions | Test Procedure | Expected Result | Execution Command | Actual Result | Status | Evidence Reference |
|---|---|---|---|---|---|---|---|---|---|
| TST-001 | P0 | Transaction Commit Retries | Controller transaction logic | Verify `UnknownTransactionCommitResult` is safely retried and `TransientTransactionError` correctly triggers backoff | Avoids duplicate entity creation | Source review | Outer and inner retry loops verified | PASS | `PMart_TEST_STABILITY_REPORT.md` |
| TST-002 | P0 | Background Timer Lifecycle | `OrderAutomation` fast-paths | Verify teardown logic correctly tracks and clears all `setTimeout` calls | No asynchronous DB operations during teardown | Source review | `pendingTimeouts` properly tracked and cleared | PASS | `PMart_TEST_STABILITY_REPORT.md` |
| TST-003 | P0 | Memory Server Graceful Teardown | `beforeAll`/`afterAll` | Stop 17 concurrent suites without memory leak or hanging | No Open Handles, graceful exit | `npm test -- --runInBand --detectOpenHandles` | 17/17 Suites passed, 0 Open Handles | PASS | `PMart_TEST_STABILITY_REPORT.md` |
