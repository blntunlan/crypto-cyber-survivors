# 🛤️ Railway Deployment Roadmap - Crypto Cyber Survivors

This document outlines the step-by-step process for deploying the **Crypto Cyber Survivors** web application to [Railway.app](https://railway.app/).

---

## 📅 Phase 1: Preparation (Local Environment)

### 1. Build Verification
Ensure the production build works locally before attempting to deploy.
- [ ] Run `npm run build`
- [ ] Run `npm run preview` to verify the `dist` folder serves correctly.

### 2. Add Production Server
Railway needs a way to serve the static files. Adding `serve` is the most reliable method for Vite SPAs.
- [ ] Install serve: `npm install serve`
- [ ] Update `package.json` scripts:
  ```json
  "start": "serve -s dist -l $PORT"
  ```
  *Note: Railway automatically provides the `$PORT` environment variable.*

### 3. Environment Variables Check
Railway needs to know about any API keys or configuration.
- [ ] Identify required variables (`GEMINI_API_KEY`, etc.).
- [ ] Ensure all client-side variables intended for Vite are prefixed with `VITE_` if used via `import.meta.env`.
  *Note: Currently `vite.config.ts` uses `process.env` definitions. Ensure these are set in Railway.*

---

## 🚀 Phase 2: Deployment (Railway Dashboard)

### 1. Connect Repository
- [ ] Login to Railway and Create a "New Project".
- [ ] Select "Deploy from GitHub repo".
- [ ] Select `blntunlan/crypto-cyber-survivors`.

### 2. Configure Variables
Navigate to the **Variables** tab in your Railway service:
- [ ] Add `GEMINI_API_KEY` (if required for production).
- [ ] Add `NODE_ENV=production`.

### 3. Build & Deploy
Railway should automatically detect the `package.json` and start the build:
- **Build Command:** `npm run build` (auto-detected)
- **Start Command:** `npm start` (which runs `serve -s dist`)

---

## 🌐 Phase 3: Post-Deployment

### 1. Domain Setup
- [ ] Go to the **Settings** tab of your service.
- [ ] Click **Generate Domain** or add a custom domain.

### 2. Health Check
- [ ] Open the generated URL on a mobile device and desktop.
- [ ] Verify WebSockets are connecting to Binance/Coinbase (check browser console).
- [ ] Ensure "Landscape Lock" and "Safe Area" padding work as expected on the live URL.

### 3. Automatic Deployments
- [ ] Confirm that pushing to the `main` branch triggers a new build and deployment automatically.

---

## 🛠️ Infrastructure Checklist

| Component | Requirement | Status |
| :--- | :--- | :--- |
| **Node.js Version** | 18+ (Railway defaults to latest stable) | ✅ |
| **Port Handling** | Must listen on `$PORT` | ⏳ |
| **External APIs** | WebSockets (Outgoing) | ✅ (Unblocked) |
| **SSL/HTTPS** | Automatic via Railway | ✅ |

---

## 📈 Success Metrics
- [ ] Build time < 2 minutes.
- [ ] Initial load time < 1.5 seconds.
- [ ] 0 Console errors on live environment.
