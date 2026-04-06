# Railway Integration for Crypto Survivors

This project is configured solely for Railway's **Hobby Plan**, leveraging persistent services and enhanced resources (8GB RAM / 8vCPU).

## 🚀 Services Overview

We have configured two primary services:

1.  **Frontend (Web App)**: The Vite-based React application.
2.  **Market Server (Backend)**: Real-time crypto price logger and anti-cheat system.

## 🛠 Optimizations for Hobby Plan

We have implemented the following features to utilize your Hobby Plan benefits:

### 1. Robust Service Configuration (`railway.json`)
Both the root project and `railway-market-server` now have dedicated `railway.json` configurations.
*   **Restart Policies:** Set to `ON_FAILURE` (max 5-10 retries) to ensure high availability.
*   **Health Checks:** The backend exposes `/health` which Railway monitors. If the process hangs, Railway automatically restarts it.
*   **Persistent Process:** The Market Server runs continuously (not serverless), allowing consistent `setInterval` execution for `CleanupCron` and logging.

### 2. Structured JSON Logging
The Market Server (`railway-market-server`) has been upgraded to output structured JSON logs in production.
*   **Benefit:** Railway's dashboard can parse these logs, allowing you to filter by `level: ERROR` or track custom metrics easily.
*   **History:** Your Hobby plan includes 7 days of log history usage.

### 3. Convenience Scripts
New scripts added to `package.json`:
*   `npm run railway:link` - Link your local project to Railway Project.
*   `npm run railway:deploy` - Deploy the Frontend.
*   `npm run railway:market:deploy` - Deploy the Backend Market Server.

## 📦 Deployment Instructions

### Step 1: Link Project
If you haven't linked the root folder yet:
```bash
npm run railway:link
```
Select your `crypto-survivors` project.

### Step 2: Create & Link Market Service
For the backend, you likely need a separate service in the same project.
1.  Navigate to `railway-market-server`.
2.  Run `railway link` and select the **same project** (`crypto-survivors`).
3.  Are you asked to link to a service? If "Crypto Survivors" (frontend) is the only one, select **Create a new Service** and name it `market-server`.

### Step 3: Deploy
Deploy both services:
```bash
# Deploy Frontend
npm run railway:deploy

# Deploy Backend
npm run railway:market:deploy
```

## 📊 Monitoring
Visit your Railway Dashboard to see:
*   Real-time CPU/RAM usage (you have 8GB available!).
*   Structured logs from the Market Server.
*   Auto-restart events if the server crashes.
