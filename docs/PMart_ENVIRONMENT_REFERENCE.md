# PMart Environment Reference

Never commit `.env` files (both are gitignored). Values below are descriptions, not real secrets.

## Backend — `backend/.env`
Start from the template: copy `backend/.env.example` to `backend/.env` and fill in the values (the template is committed;
the real `.env` is gitignored). Validated at start-up by `backend/src/config/env.js` (zod). The process exits with a list of problems if anything is invalid.
The file is always read from `backend/.env`, whatever the working directory; real environment variables win over the file.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | **yes** | — | MongoDB connection string (Atlas or a replica set — transactions need one) |
| `MONGODB_DB_NAME` | no | `pmart` | Database name |
| `JWT_SECRET` | **yes** | — | Access-token signing key. In production: at least 32 characters and no weak words (`secret`, `test`, …) |
| `OTP_ENCRYPTION_KEY` | **yes** | — | 64 hex characters (32 bytes); AES-256-GCM key for delivery codes. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | no | `5000` | HTTP port. Use another port if 5000 is taken and point the web app at it (`PMART_API_TARGET`) |
| `NODE_ENV` | no | `development` | `development`, `production` or `test` |
| `JWT_EXPIRES_IN` | no | `1h` | Access-token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | no | `7` | Refresh-cookie lifetime |
| `OTP_LENGTH` | no | `4` | Delivery code length, `4` or `6`. The apps read it from `/api/settings/public` |
| `ALLOWED_ORIGINS` | production | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated browser origins for CORS and Socket.IO. Outside production any localhost / 127.x.x.x port is also allowed |
| `COOKIE_SAME_SITE` | no | `none` (prod) / `strict` (dev) | Sign-in cookie SameSite: `strict`, `lax` or `none`. With the recommended Vercel rewrite (browser only talks to the Vercel domain) use `strict`. `none` is only for a browser calling the API on another site directly, which breaks wherever third-party cookies are blocked (Safari, and `*.vercel.app` / `*.onrender.com` are always different sites) |
| `TRUST_PROXY` | no | `1` | Number of reverse proxies in front of the API, used to find the client IP for rate limits. Render alone = `1`; Vercel rewrite → Render = `2` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | no | — | Firebase Admin service account. All three are needed for Google sign-in; without them `/auth/google` returns 503 and the web app hides the Google button |
| `MAPTILER_API_KEY` | no | — | Server-side reverse geocoding for `/addresses/reverse-geocode` (503 without it; the web app falls back to its own key) |
| `OSRM_CACHE_TTL` | no | `3600` | Seconds to cache road routes |
| `MARG_INTEGRATION_ENABLED` | no | `false` | MARG ERP stub — blocked (no API specification), keep `false` |
| `LOG_LEVEL` | no | `info` | Winston log level |
| `RATE_LIMIT_IN_DEV` | no | — | `true` enables rate limits in development/test (they are always on in production) |
| `ADMIN_PASSWORD` | no | — | Only read by `npm run create-admin`; prompts when unset |
| `PMART_SKIP_DOTENV` | no | — | `1` skips reading `backend/.env` (used by tests) |

## Web app — `.env` in the project root (Vite, `VITE_*` values are public)
| Variable | Required | Purpose |
|---|---|---|
| `VITE_MAPTILER_API_KEY` | for maps | Map tiles, address search and the reverse-geocode fallback. Restrict it to your domains in the MapTiler dashboard |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (`VITE_FIREBASE_MEASUREMENT_ID` optional) | for Google sign-in | Firebase web config. The Google button only shows when these are set **and** the backend reports `googleSignIn: true` |
| `VITE_API_BASE_URL` | no | API base URL. Default `/api` (same origin — the dev server proxies it locally; `vercel.json` forwards it in production). Leave unset on Vercel |
| `VITE_SOCKET_URL` | production | Socket.IO origin. Default: the page's origin (proxied in development). On Vercel set it to the Render URL, e.g. `https://pmart-backend.onrender.com` (Vercel can't forward WebSockets) |

Hosting setup for Render + Vercel: [PMart_DEPLOYMENT.md](PMart_DEPLOYMENT.md).

## Dev-server only (shell environment, not `.env`)
| Variable | Default | Purpose |
|---|---|---|
| `PMART_API_TARGET` | `http://localhost:5000` | Where `vite` proxies `/api` and `/socket.io`. Set it when the backend runs on another port, e.g. `PMART_API_TARGET=http://localhost:5003 npm run dev` |

## Rotate now
A MapTiler key was hard-coded in source files that are in git history (`src/components/common/AddressFormModal.jsx`
before this rebuild and the removed root script `test_routing.mjs`). Treat that key as public: rotate it in MapTiler and
put the new one only in `.env`.
