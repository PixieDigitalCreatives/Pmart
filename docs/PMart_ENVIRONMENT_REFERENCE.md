# PMart Environment Reference

## Frontend Environment Variables (`.env.example` / `.env`)

| Variable | Used By | Required | Purpose | Safe to Expose | Format |
|----------|---------|----------|---------|----------------|--------|
| `VITE_API_BASE_URL` | Frontend API Service | No | Backend API URL (only needed if not using Vite proxy) | Yes | `http://localhost:5000/api` |
| `VITE_FIREBASE_API_KEY` | Firebase Auth | Yes (for Google Sign-In) | API key to initialize Firebase | Yes | `your_api_key_here` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth | Yes (for Google Sign-In) | Auth domain for Firebase app | Yes | `your_auth_domain_here` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Auth | Yes (for Google Sign-In) | Firebase project ID | Yes | `your_project_id_here` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Auth | Yes (for Google Sign-In) | Firebase storage bucket | Yes | `your_storage_bucket_here` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Firebase Auth | Yes (for Google Sign-In) | Firebase messaging sender ID | Yes | `your_messaging_sender_id_here` |
| `VITE_FIREBASE_APP_ID` | Firebase Auth | Yes (for Google Sign-In) | Firebase App ID | Yes | `your_app_id_here` |

## Backend Environment Variables (`backend/.env.example` / `backend/.env`)

| Variable | Used By | Required | Purpose | Safe to Expose | Format |
|----------|---------|----------|---------|----------------|--------|
| `PORT` | Express Server | No | Port on which the backend listens | Yes | `5000` |
| `NODE_ENV` | Express / Logging | No | Execution environment | Yes | `development` / `production` |
| `MONGODB_URI` | Mongoose | Yes | Database connection string | NO | `[REDACTED]` |
| `JWT_SECRET` | Auth Middleware | Yes | Secret for signing JWT tokens | NO | `[REDACTED]` |
| `JWT_EXPIRES_IN` | Auth Service | No | Expiration time for JWTs | Yes | `1h`, `7d` |
| `OTP_LENGTH` | OTP Service | No | Length of delivery OTPs | Yes | `4` |
| `GOOGLE_CLIENT_ID` | Google OAuth | Yes (for Google Sign-In) | Validates frontend Google tokens | Yes | `your_google_client_id_here` |
| `PAYMENT_COD_ENABLED` | Checkout Service | No | Feature flag for COD payments | Yes | `true` / `false` |
| `PAYMENT_ONLINE_ENABLED` | Checkout Service | No | Feature flag for Online payments | Yes | `true` / `false` |
| `MARG_INTEGRATION_ENABLED`| ERP Service | No | Feature flag for Marg ERP integration | Yes | `true` / `false` |
| `RIDER_PICKUP_DELAY_MS`| Order Automation | No | Simulation delay for ASSIGNED -> PICKED_UP auto-transition (used in E2E tests) | Yes | `2000` |
| `RIDER_OUT_FOR_DELIVERY_DELAY_MS`| Order Automation | No | Simulation delay for PICKED_UP -> OUT_FOR_DELIVERY auto-transition (used in E2E tests) | Yes | `2000` |
