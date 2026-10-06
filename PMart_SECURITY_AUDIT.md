# PMart Security & Business Invariant Verification Audit

## 1. Rate Limiting
- **Implementation Status**: `express-rate-limit` is actively deployed on critical authentication routes in `auth.route.ts` and globally in `app.ts`.
- **Global Limiter**: 100 requests per 15 minutes per IP.
- **Registration (`/register`, `/complete-profile`, `/enroll-rider`)**: 5 requests per hour.
- **Login (`/login`, `/google`)**: 10 requests per 15 minutes.
- **Password Operations (`/setup-password`, `/password`)**: 5 requests per hour.
- **Bypass**: Appropriately skips in `development` and `test` environments (`skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'`), allowing E2E tests to run without encountering 429 errors while keeping production safe.

## 2. CORS Policy
- **Implementation Status**: Secured using the `cors` middleware in `app.ts`.
- **Allowed Origins**: Dynamically loaded from `process.env.ALLOWED_ORIGINS`, falling back to `http://localhost:5173` and `http://127.0.0.1:5173`.
- **Credentials**: `credentials: true` is configured properly to support HTTP-only cookies if needed for session tokens.
- **Mobile Support**: The `!origin` condition successfully accommodates curl scripts or React Native/mobile app traffic where `Origin` header is absent.

## 3. Checkout Idempotency & Invariants
- **Idempotency Key**: Safely evaluated in `OrderController.checkout`.
- **Semantic Payload Validation**: The application strictly checks that if an existing order is found for a given `idempotencyKey`, its `paymentMethod`, `items`, and item `quantities` precisely match the current request. If the payload differs, it correctly aborts the transaction with `400 Bad Request`, preventing malicious intent or edge-case sync errors.
- **Ownership Verification**: It ensures the idempotency key belongs strictly to the authenticated user (`existingOrder.customer.toString() !== (req.user as any)._id.toString()`).
- **Transaction Safety**: Mongoose sessions are rigorously used, effectively preventing race conditions between checking cart validity and inserting the final order.

## 4. Admin / Privilege Protection
- **Role Hierarchy**: Protected by the `authorize(UserRole.ADMIN, UserRole.EMPLOYEE)` middleware wrapper on all `/api/admin` routes.
- **Granular Permissions**: The `authorizePermission(scope)` checks fine-grained permissions for non-Admin `EMPLOYEE` users.
- **Role Escalation Defense**: 
  - `AdminController.createEmployee` explicitly hardcodes the inserted role to `UserRole.EMPLOYEE`. There is no API route that accepts a `role` payload capable of fabricating an `ADMIN`. 
  - An `EMPLOYEE` is barred from granting any permissions they do not personally hold (`permissions.every(p => currentUser?.permissions?.includes(p))`).
  - `AdminController.updateEmployee` and `deleteEmployee` explicitly lock out regular Employees from modifying or deleting `ADMIN` accounts.
- **Audit Logging**: Operations mutating employee privileges and global settings generate immutable records in the `AuditLog` collection.

## Conclusion
The security architecture for business invariants and access control is **sound and fully implemented**. No further patching is required for these specific subsystems.
