# Deployment Guide

This project is set up as a Monorepo with a React frontend (`client`) and a Node.js/Express backend (`server`).

To make this project "live", we recommend checking the code into GitHub and then deploying the **Frontend to Netlify** and the **Backend to Render** (or a similar Node.js host).

## 1. Preparation

1.  **GitHub**: Ensure this project is pushed to a GitHub repository.
    *   `node_modules` and sensitive files like `.env` and `service-account.json` are properly ignored.

## 2. Deploy Backend (Server)

The backend runs scheduled jobs (Cron) and uses Puppeteer, which requires a persistent server environment (Netlify Functions are too limited for this). We recommend **Render** or **Railway**.

### Using Render.com:
1.  Create a new **Web Service**.
2.  Connect your GitHub repository.
3.  **Root Directory**: `server`
4.  **Build Command**: `npm install`
5.  **Start Command**: `npm start`
6.  **Environment Variables**:
    *   `PORT`: `5000` (or let Render assign one)
    *   `GOOGLE_SHEET_ID`: (Your Google Sheet ID)
    *   `GOOGLE_SERVICE_ACCOUNT`: (Paste the *content* of your `service-account.json` file here as a single line string)
    *   `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: `false` (Ensure Chromium is available)
    *   *Note*: You may need to add a "Buildpack" or use a Dockerfile if Puppeteer has trouble launching. Render has native support for Chrome if you disable the sandbox in Puppeteer (already handled in code via `--no-sandbox`).

Once deployed, copy the **Backend URL** (e.g., `https://my-stock-app.onrender.com`).

## 3. Deploy Frontend (Client) to Netlify

1.  Log in to **Netlify**.
2.  "Add new site" -> "Import from an existing project" -> **GitHub**.
3.  Select your repository.
4.  **Build Settings** (Should be auto-detected from `netlify.toml`):
    *   **Base directory**: `client`
    *   **Build command**: `npm run build`
    *   **Publish directory**: `client/dist` (or `dist`)
5.  **Environment Variables**:
    *   `VITE_API_URL`: **Paste your Backend URL here** (e.g., `https://my-stock-app.onrender.com/api`).
    *   *Note*: Ensure you add `/api` at the end if your backend routes require it (your code expects the base URL to include it).

6.  Click **Deploy**.

## Summary of Changes Made
*   **`netlify.toml`**: Added to configure Netlify build settings and SPA redirects.
*   **`client/src/services/api.js`**: Updated to use `VITE_API_URL` environment variable.
*   **`server/src/services/googleSheetsService.js`**: Updated to support reading credentials from environment variables for cloud deployment.
*   **`.gitignore`**: Added `service-account.json` to prevent security leaks.
