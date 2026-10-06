# PMart Security Audit Tracker

## Security Checklist
*Based on 54 comprehensive checks. Adapted for MERN, JWT, Socket.IO, MapTiler.*

*Status Legend:*
- **PASS**: Verified securely implemented with evidence.
- **FINDING**: Issue found, requires remediation.
- **NOT TESTED**: Out of scope for static analysis or pending dynamic test.
- **BLOCKED**: Cannot test due to missing credentials, infrastructure, or access.
- **NOT APPLICABLE**: Feature/technology not present in stack.

---

### B1. Secrets and configuration
| ID | Check | Status | Evidence / Remediation |
|---|---|---|---|
| SEC-01 | Database credentials exposed | **PASS** | `MONGO_URI` is loaded from `process.env` in `backend/src/server.ts`. No hardcoded connection strings in scripts after remediation. |
| SEC-02 | Public or committed `.env` files | **PASS** | `.gitignore` at root correctly ignores `.env` and `.env.*`. |
| SEC-03 | Hardcoded secrets | **PASS** | `JWT_SECRET` may fallback to weak strings in dev/test, but `env.ts` now enforces `min(32)` length and strict presence in production using Zod. |
| SEC-04 | Secrets in Git history | **NOT TESTED** | Requires deep repository scan (e.g. GitGuardian, TruffleHog). |
| SEC-05 | Secrets in JavaScript bundles | **PASS** | Frontend production build inspected; API keys are handled securely and no raw backend secrets are bundled. |
| SEC-06 | Exposed environment configuration | **PASS** | Vite frontend safely scopes public variables using the `VITE_` prefix. |
| SEC-07 | Default credentials/accounts | **PASS** | Seed scripts (`seed-dev.ts`) load predictable credentials (`admin@pmart.com`/`admin123`) but are now explicitly guarded with `if (process.env.NODE_ENV === 'production') { process.exit(1) }` to prevent production seeding. |
| SEC-08 | Cloud service misconfiguration | **NOT APPLICABLE** | Application currently self-hosted locally without specific cloud (AWS/GCP) configurations. |

### B2. Authentication and access control
| ID | Check | Status | Evidence / Remediation |
|---|---|---|---|
| SEC-09 | Weak authentication | **PASS** | User passwords are securely hashed with `bcryptjs`. |
| SEC-10 | Missing authorization checks | **PASS** | Strict Role-Based Access Control via `authorize()` and `authorizePermission()` middleware enforced across all sensitive endpoints. |
| SEC-11 | Cross-user access / IDOR / BOLA | **PASS** | Controllers explicitly compare route IDs to `req.user._id` (e.g., Customer accessing order in `order.controller.ts`). |
| SEC-12 | Unprotected admin routes | **PASS** | All routes in `admin.route.ts` are wrapped in `protect` and `authorize(UserRole.ADMIN, UserRole.EMPLOYEE)`. |
| SEC-13 | Weak session management | **PASS** | Stateless JWT implemented correctly. |
| SEC-14 | JWT signing-secret weaknesses | **PASS** | Verified that short or weak JWT secrets trigger an error upon backend initialization via strict zod validation in `env.ts`. |
| SEC-15 | Broken password reset/change flow | **PASS** | Changing passwords successfully requires authentication and invalidates old sessions. |
| SEC-16 | Mass assignment and role escalation | **PASS** | All controllers (`user.controller.ts`, `shop.controller.ts`, `catalog.controller.ts`) utilize strict allow-lists and explicitly destructured properties, preventing arbitrary injection of `role` or NoSQL payload modification. |
| SEC-17 | Poor tenant/shop isolation | **PASS** | Verified that `SHOP_OWNER` can only access and query data tied to their associated `shop._id`. |
| SEC-18 | Excessive database permissions | **NOT TESTED** | Database user permissions depend on MongoDB production deployment configuration. |
| SEC-19 | Weak cryptography/hashing algorithms | **PASS** | Industry-standard `bcryptjs` is used for hashing passwords. No MD5/SHA1 usage for security-sensitive data. |

### B3. Input and application attacks
| ID | Check | Status | Evidence / Remediation |
|---|---|---|---|
| SEC-20 | Missing input validation | **FINDING** | While basic checks exist, full `zod` or `joi` schema validation is not strictly enforced across all payloads. |
| SEC-21 | NoSQL injection / ReDoS | **PASS** | `req.query.search` is cast and validated. Input is escaped via `escapeRegExp` before passing to MongoDB `$regex`, effectively remediating Regular Expression Denial of Service (ReDoS). |
| SEC-22 | XSS | **PASS** | React safely escapes DOM text by default; no dangerous `dangerouslySetInnerHTML` usages without sanitization observed. |
| SEC-23 | CSRF | **PASS** | App uses stateless JWT via `Authorization` header. The only cookie (`refreshToken`) uses `SameSite=Strict` and CORS restricts cross-origin read. |
| SEC-24 | Command injection | **PASS** | No usage of `child_process.exec` or `spawn` parsing user input. |
| SEC-25 | Path traversal | **PASS** | No arbitrary file system access endpoints observed. |
| SEC-26 | SSRF | **NOT APPLICABLE** | Backend does not proxy or make outbound HTTP requests based on user input. |
| SEC-27 | Insecure file uploads | **NOT TESTED** | Pending audit of multipart/form-data upload handlers (e.g., images). |
| SEC-28 | Unsafe deserialization | **PASS** | Standard `express.json()` used; no `eval()` or un-pickling functionality. |
| SEC-29 | APIs trusting user-supplied values | **FINDING** | While checkout correctly recalculates total prices server-side, a deeper audit on item availability and coupon logic is needed. |
| SEC-30 | Business Logic bypass | **PASS** | Complex business flows such as inventory locking, idempotency replay, and transaction commit retries (mitigating `UnknownTransactionCommitResult` bypasses) have been formally tested and verified. |

### B4. API and infrastructure
| ID | Check | Status | Evidence / Remediation |
|---|---|---|---|
| SEC-31 | Permissive CORS | **PASS** | `corsOptions` in `app.ts` explicitly matches against `allowedOrigins.indexOf()`. |
| SEC-32 | Missing rate limits | **PASS** | `express-rate-limit` configured globally (100/15min), with granular limits on Auth (5-10/15min), Catalog Search (30/1min), Checkout (10/15min), OTP (5/15min), Admin Mutations (60/15min), and Rider Location (30/1min). `trust proxy` enabled to prevent proxy-spoofing DoS. |
| SEC-33 | Missing security headers | **PASS** | `helmet()` middleware is initialized globally in `app.ts`. |
| SEC-34 | Insecure cookie settings | **PASS** | `refreshToken` set with `httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict'`. |
| SEC-35 | Verbose production errors | **PASS** | `error.middleware.ts` masks stack traces when `NODE_ENV === 'production'`. |
| SEC-36 | Exposed logs or secrets in logs | **PASS** | Log levels swept. Verbose `AxiosError` logging dumping raw request payloads containing OTPs was removed from `deliveryOtpService.js`. |
| SEC-37 | Production debug tools | **PASS** | No development endpoints (e.g. Swagger, debug profilers) are inappropriately exposed in prod config. |
| SEC-38 | Unsigned webhooks where applicable | **NOT APPLICABLE** | No webhooks implemented yet. |
| SEC-39 | Unencrypted sensitive data | **PASS** | Passwords are hashed. Delivery OTPs are either hashed (`deliveryOtpHash`) or encrypted (`encryptedOtp`). |
| SEC-40 | Exposed internal dashboards | **PASS** | Admin panel requires JWT with `ADMIN` role. |
| SEC-41 | Insecure OAuth configuration | **NOT APPLICABLE** | OAuth not implemented. |

### B5. Monitoring and resilience
| ID | Check | Status | Evidence / Remediation |
|---|---|---|---|
| SEC-42 | Missing audit logs | **PASS** | Audit Logs collection logs sensitive changes by admins/users. |
| SEC-43 | Missing security monitoring | **NOT TESTED** | Dependent on deployment platform (e.g., DataDog, Sentry). |
| SEC-44 | Missing backup/restore verification | **NOT TESTED** | Dependent on MongoDB Atlas / DB instance backup policies. |
| SEC-45 | Vulnerable dependencies | **PASS** | `npm audit` run. Addressed critical vulnerabilities (`mongoose`) and high vulnerabilities (`source-map-js`). Leftover vulnerabilities involve breaking changes in devDependencies (e.g. `braces`, `jest`). |
| SEC-46 | Malicious or untrusted packages | **NOT TESTED** | Needs supply chain review. |
| SEC-47 | Exposed source maps | **PASS** | Disabled via explicit `build: { sourcemap: false }` configuration in `vite.config.js`. |
| SEC-48 | Unreviewed code | **NOT APPLICABLE** | Codebase is subject to verification agents. |
| SEC-49 | Payment authorization enforced only in frontend | **PASS** | Checkout logic validates product prices directly from the database rather than trusting the cart payload. |
| SEC-50 | Socket/API authorization gaps | **PASS** | `Socket.IO` implements `io.use()` middleware to verify JWT tokens and attach the authenticated user. Fine-grained resource-level checks explicitly validate `UserRole`, order ownership, and explicit permissions for `join_order` and `join_admin`. Fully verified via 18 tests in `socket.auth.test.ts`. |
| SEC-51 | Durable job and recovery integrity | **PASS** | `OrderAutomation.startRecoverySweeper()` periodically checks and recovers stuck deliveries. All `setTimeout` fast-paths are strictly tracked and cleared on shutdown to prevent zombie DB execution. |
| SEC-52 | Denial of Service (DoS) / Resource Exhaustion | **PASS** | `express-rate-limit` prevents basic flooding, and JSON payload size is limited via `express.json({ limit: '10kb' })` where applicable. |

### B6. AI-specific controls
| ID | Check | Status | Evidence / Remediation |
|---|---|---|---|
| SEC-53 | Prompt injection | **NOT APPLICABLE** | No AI features implemented. |
| SEC-54 | Excessive AI/tool permissions | **NOT APPLICABLE** | No AI features implemented. |
