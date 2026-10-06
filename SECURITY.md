# PMart Security Documentation

## 1. Authentication & Rate Limits
- **Brute Force Protection:** Rate limiting is enforced on critical authentication routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/verify`). A maximum of 5 requests per 15 minutes is allowed per IP to prevent credential stuffing and brute-force attacks.
- **Audit Logging:** Failed login and registration attempts are logged with the origin IP address for monitoring. Successful logins are also logged with the User ID and IP address.

## 2. Password Policies and Expiration
- **Setup Tokens:** Registration endpoints returning setup tokens (such as rider enrollment or employee creation) enforce a strictly single-use token lifecycle. The `setupTokenExpires` field limits the validity of these tokens to 24 hours.

## 3. Privilege Escalation & Role-Based Access Control (RBAC)
- **Role Isolation:** Roles (e.g., `ADMIN`, `RIDER`, `CUSTOMER`, `SHOP_OWNER`) are strictly isolated using the `authorize()` middleware on routes.
- **Role Audits:** Registration endpoints default to creating `CUSTOMER` roles, preventing unauthorized escalation to administrative roles.

## 4. Insecure Direct Object Reference (IDOR) & Mass Assignment
- **Order Updates:** The `/api/orders/:id/status` endpoint enforces rigorous ownership checks:
  - Customers can only interact with their own orders and are restricted to transitioning their order to `CANCELLED`.
  - Riders can only update orders assigned to them.
  - Shop Owners can only manipulate orders attached to a shop they manage.
  - Transition validity is checked against the `VALID_TRANSITIONS` graph.

## 5. Idempotency & Checkout Guarantees
- **Checkout Integrity:** The `/api/orders/checkout` endpoint leverages `idempotencyKey` checks to prevent duplicate order creation resulting from network retries.
- **Data Consistency:** The idempotency layer ensures that subsequent requests utilizing an existing key exactly match the original `paymentMethod` and item `product`/`quantity` combinations.

## 6. Audit Logging
- **Traceability:** Critical system actions, including successful logins, user registrations, and order status transitions, generate robust audit trails documenting the `User ID`, `IP address`, or `Actor Role` performing the modification.
