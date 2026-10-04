# Authentication Migration Plan

## 1. Schema Changes
- Added `passwordHash` (string, select: false) to `User` schema.
- Replaced Google and Firebase related OTP logic with local `bcryptjs` hashed passwords.
- Standardized `phone` as the primary identifier across all roles, with `normalizeMobileNumber` ensuring `+91` format for 10-digit Indian numbers.

## 2. API Endpoint Changes
- **New/Updated:** `/api/auth/login` and `/api/auth/register` to support mobile + password logic.
- **Removed:** `/api/auth/google`, `/api/auth/send-otp`, `/api/auth/verify-otp`.
- **Admin Users:** Admin Rider provisioning updated via `/api/admin/riders` to detect duplicates across roles and gracefully reject or link. New search endpoint `/api/admin/users/search`.

## 3. Legacy User Account Migration & Recovery Process
Legacy users created via Google Sign-In or earlier OTP mechanisms lack a `passwordHash` and cannot log in with the new system.
Since SMS OTP and email recovery mechanisms have been strictly removed from the requirements, there is no self-service mechanism for legacy users to set a password.

**Regaining Access (Admin/Support Process):**
1. Legacy customers/riders must contact support or visit an admin center to verify their identity.
2. Admins use the new `/api/admin/users/search` endpoint to locate the existing account by phone or name.
3. An admin can trigger a one-time secure link or manually provision a temporary password for the user (to be built if business policy demands, currently unsupported to prevent security risks). 
4. The authenticated endpoint `POST /api/auth/setup-password` is provided for users (e.g. riders who are already provisioned and logged in via admin impersonation or internal tools) to establish their initial password securely.

## 4. Security Audit
- No fallback to empty passwords.
- No auto-conversion of Customer accounts to Rider accounts without explicit Admin provisioning.
- Delivery OTPs were verified to be distinct (in `order.service.ts`) and are unaffected by the login OTP removal.
