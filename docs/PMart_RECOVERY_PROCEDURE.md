# PMart Account Recovery Procedure

_Rewritten 2026-10-13. The old "legacy passwordless user" procedure no longer applies: the database was rebuilt and
every account now has a password (or a pending staff activation link)._

There is **no self-service password reset** (no SMS/email OTP). Recovery depends on the account type:

| Account | How to recover |
|---|---|
| Rider | Admin console → People → Riders → reset password. The rider must change it at next sign-in |
| Staff, not yet activated | Admin console → People → Staff → new activation link (the old link stops working) |
| Store owner, activated staff, customer | Manual procedure below (until a support tool or reset flow exists — Remaining Work R18) |
| Locked-out administrator | Another admin uses the manual procedure, or a server operator runs `npm run create-admin -- --name … --phone … --force` to add a new admin |

## Manual procedure
### 1. Verify identity out of band
- The person contacts support through an official channel. Verify identity with something an attacker can't easily
  obtain (for example matching recent cash-on-delivery order details **and** a call back to the registered number).
- Never reset based only on a phone number, name or address.

### 2. Set a temporary password (database administrator only)
1. Generate a temporary password of at least 12 random characters.
2. Hash it with the backend's helper, from `backend/`:
   ```bash
   node -e "require('./src/utils/auth').hashPassword(process.argv[1]).then(console.log)" '<TEMPORARY_PASSWORD>'
   ```
3. Update exactly one user (phone in E.164 form) and force a password change:
   ```javascript
   db.users.updateOne(
     { phone: "+91XXXXXXXXXX", isActive: true },
     { $set: { passwordHash: "<BCRYPT_HASH>", mustChangePassword: true }, $unset: { refreshTokenHash: "" } }
   );
   ```
   Do not change `role`, `permissions` or `authProvider`. Clearing `refreshTokenHash` signs out other sessions.

### 3. Hand over securely
Share the temporary password through a one-time, expiring channel — never plain SMS or email. The user is forced to
choose a new password at sign-in.

### 4. Record it
Log a support ticket with the verification evidence and the administrator who made the change.
