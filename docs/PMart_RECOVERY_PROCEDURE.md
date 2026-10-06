# Legacy User Recovery Procedure

This document outlines the mandatory procedure for granting access to legacy users who do not have a password and are currently logged out of all devices.

## Background
The PMart authentication system was upgraded from OTP-based login to a secure Mobile Number + Password strategy. 
Active users were automatically transitioned via an in-app "Session Upgrade" flow. However, legacy users who logged out or lost their session prior to setting a password cannot self-enroll, as the application strictly prohibits OTP fallback and SMS/Magic links.

## Support/Admin-Assisted Recovery Process

If a legacy user without a password contacts support because they cannot log in, the following process MUST be strictly followed:

### 1. Identity Verification (Out-of-Band)
- The user must contact support via a trusted, documented channel (e.g., official support email or phone line).
- Support staff must verify the user's identity using out-of-band verification methods. 
  - *Example:* Verifying government-issued ID matching the registered name, or verifying payment records associated with recent orders.
- **NEVER** grant access based solely on a phone number, name, past order amount, or delivery address, as these are easily spoofed or obtained via social engineering.

### 2. Manual Administrative Step (Current Infrastructure)
*Note: A short-lived, single-use administrative enrollment grant system does not currently exist in the infrastructure. As a result, the following manual database operation is required until a dedicated internal support tool is built.*

- Once verified, authorized database administrators (and ONLY authorized database administrators) must manually generate a secure, temporary password.
- Hash the temporary password using the system's `bcrypt` utility (`hashPassword` function).
- Connect directly to the production MongoDB instance.
- Run the following update command, ensuring you match the exact phone number:
  ```javascript
  db.users.updateOne(
    { phone: "+91<NORMALIZED_MOBILE>", passwordHash: { $exists: false } },
    { 
      $set: { passwordHash: "<GENERATED_BCRYPT_HASH>" },
      $unset: { refreshToken: "" } // Explicitly revoke any stale sessions
    }
  );
  ```
- *Security Constraint:* This operation MUST NOT change the user's `role` or `authProvider`.

### 3. Secure Handover
- The temporary password must be communicated to the user via a secure, ephemeral method (e.g., a one-time-view secure note link). 
- **DO NOT** send the password via plain text email or SMS.
- The user must use the temporary password to log in.

### 4. Audit Logging
- A support ticket detailing the verification evidence and the administrative action MUST be logged in the internal issue tracker. 
- The ticket must contain the Administrator's ID who performed the database modification.

## Future Enhancements
An internal support dashboard should be built to automate Step 2. The dashboard must:
- Be accessible only to the `ADMIN` role.
- Require multi-factor authentication for the support agent.
- Emit an immutable audit log when a temporary password is set.
- Automatically flag the user's account to require a password change on their next successful login.
