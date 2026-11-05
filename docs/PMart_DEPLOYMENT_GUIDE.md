# PMart Production Deployment Guide

This guide covers deploying PMart with the **backend on Render** and the **frontend on Netlify**, backed by a **MongoDB Atlas** replica set.

---

## Architecture Overview

```mermaid
graph LR
    User[Browser / Client] -->|HTTPS Requests| Netlify[Netlify (Vite React SPA)]
    User -->|API & Sockets| Render[Render Web Service (Express API)]
    Render -->|Mongoose connection| Mongo[(MongoDB Atlas Replica Set)]
    Render -->|Map & Tiles| MapTiler[MapTiler API]
```

- **Frontend**: Static SPA built with Vite 8 + React 19, hosted on Netlify CDN with client-side SPA routing (`/* -> /index.html`).
- **Backend**: Node.js 20 Express 5 API + Socket.IO server running as a Render Web Service.
- **Database**: MongoDB Atlas M0 (free) or higher replica set (transactions require a replica set).

---

## 1. MongoDB Atlas Setup (Prerequisite)

1. Create a free or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. In **Network Access**, add `0.0.0.0/0` (allow access from anywhere) so Render instances can connect.
3. In **Database Access**, create a user with read and write permissions (e.g. `pmart-admin`).
4. Copy the connection string (SRV):
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

---

## 2. Deploying Backend to Render

### Option A: Using Render Blueprint (`render.yaml`)
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Blueprint**.
2. Connect your Git repository.
3. Render reads `render.yaml` and auto-provisions `pmart-backend`.
4. Fill in the prompted secret environment variables: `MONGODB_URI`, `OTP_ENCRYPTION_KEY`, and `ALLOWED_ORIGINS`.

### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository and configure:
   - **Name**: `pmart-backend` (or your preferred name)
   - **Language**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` or `Starter`
   - **Health Check Path**: `/api/health`
3. Under **Environment Variables**, add:
   | Key | Value / Instructions |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `MONGODB_DB_NAME` | `pmart` |
   | `JWT_SECRET` | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `OTP_ENCRYPTION_KEY` | Exactly 64 hex characters (32 bytes): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `ALLOWED_ORIGINS` | **Required.** Exact frontend origin(s), comma-separated, `https://` only, e.g. `https://your-site.netlify.app`. The API will not start in production without it or with a `*` pattern; preview URLs must be listed one by one |
   | `COOKIE_SAME_SITE` | `none` for this Netlify layout (the browser calls Render directly, so the cookie is cross-site). The default is `strict`, which is right only behind a same-site proxy such as the Vercel rewrite |
   | `LOG_LEVEL` | `info` |
   | `MAPTILER_API_KEY` | (Optional) Server-side geocoding key |
   | `FIREBASE_PROJECT_ID` | (Optional) If Google Sign-In is enabled |
   | `FIREBASE_CLIENT_EMAIL` | (Optional) Service account email |
   | `FIREBASE_PRIVATE_KEY` | (Optional) Service account private key |
4. Click **Create Web Service**. Wait for the build and deployment to complete.
5. Note your Render URL: `https://pmart-backend.onrender.com`.

### Initialize Database & Create Initial Admin
Once the backend service is deployed:
1. Open the **Shell** tab in the Render dashboard for `pmart-backend`.
2. Run database initialization:
   ```bash
   npm run db:init
   ```
   This creates the 20 collections (11 core + 9 inventory/billing), compound indexes, and default settings.
3. Create your first administrative user:
   ```bash
   npm run create-admin -- --name "Super Admin" --phone 9876543210
   ```
   (Enter your desired admin password when prompted).

---

## 3. Deploying Frontend to Netlify

1. In the [Netlify Dashboard](https://app.netlify.com/), click **Add new site** > **Import an existing project**.
2. Connect your Git provider and select the repository.
3. Netlify will automatically detect [netlify.toml](file:///d:/Pmart/netlify.toml) with:
   - **Base directory**: (leave blank / root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. In **Site configuration** > **Environment variables**, set:
   | Variable | Value |
   |---|---|
   | `NODE_VERSION` | `20` |
   | `VITE_API_BASE_URL` | `https://pmart-backend.onrender.com/api` (replace with your Render URL) |
   | `VITE_SOCKET_URL` | `https://pmart-backend.onrender.com` (replace with your Render URL) |
   | `VITE_MAPTILER_API_KEY` | Your MapTiler API key (configured for map rendering) |
   | `VITE_FIREBASE_*` | (Optional) Firebase web configuration if Google auth is used |
5. Click **Deploy Site**.
6. Once deployed, note your Netlify URL (e.g. `https://pmart-store.netlify.app`).

---

## 4. Connecting Frontend and Backend (CORS & Cookies)

Now that you have both URLs:
1. In the **Render Dashboard** for `pmart-backend`:
   - Go to **Environment** > Edit `ALLOWED_ORIGINS`.
   - Set it to your exact Netlify domain: `https://pmart-store.netlify.app` (add custom domain if using one).
   - Save and let Render redeploy.
2. Verify cross-origin cookies:
   - PMart uses rotating refresh tokens in `httpOnly` cookies at `/api/auth`.
   - Because Netlify and Render are on different sites, set `COOKIE_SAME_SITE=none` explicitly (it defaults to `strict`
     since 2026-11-05; the API logs a warning in production when it is `none`). The cookie is then `Secure`. Browsers
     that block third-party cookies (Safari) will still drop it, so prefer the Vercel layout in
     [PMart_DEPLOYMENT.md](PMart_DEPLOYMENT.md), where the API is reached through a same-site rewrite.
3. Content-Security-Policy: `netlify.toml` allows API and socket connections only to `https://pmart-66mp.onrender.com`.
   If your Render URL is different, change the `connect-src` entry (both `https://` and `wss://`) before deploying,
   or every API call is blocked by the browser.

---

## 5. Post-Deployment Verification Checklist

- [ ] **Backend Health Check**: Open `https://pmart-backend.onrender.com/api/health` in your browser. It should return `{"status":"ok","database":"connected"}`.
- [ ] **Frontend SPA Routing**: Navigate to `https://your-site.netlify.app/login` and press Refresh (F5). It should reload the page without a 404 error.
- [ ] **Admin Sign-in**: Log in with your admin credentials at `/login`.
- [ ] **Live Sockets**: Open DevTools Network tab, filter by `WS` / `socket.io` to ensure WebSockets establish a connection with the Render backend.
- [ ] **Darkstore Setup**: From the Admin portal, create your first Darkstore/Store, add categories, and products.
