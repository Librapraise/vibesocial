# Deploying VibeSocial Backend to Render

This guide outlines the steps to host the Express backend of VibeSocial on [Render](https://render.com) for free.

---

## Step 1: Connect your GitHub Account to Render
1. In your **Render Dashboard**, click on your avatar/profile picture in the top-right corner and go to **Account Settings**.
2. Scroll down to the **GitHub** integration section and click **Connect**.
3. Authorize Render to access your GitHub repositories.

---

## Step 2: Create a New Web Service
1. In the top navigation bar of your Render Dashboard, click the **New +** button and select **Web Service**.
2. Choose **Build and deploy from a Git repository**, then click **Next**.
3. Under **Connect a repository**, find your `vibesocial` repository and click **Connect**.

---

## Step 3: Configure Web Service Settings
Fill in the configuration details exactly as follows:

*   **Name**: `vibesocial-backend` (or any custom name)
*   **Region**: Select the region closest to your users (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`)
*   **Branch**: `main` (or whichever branch you push your changes to)
*   **Root Directory**: `server`
    > [!IMPORTANT]
    > You must set this to `server` so Render knows to run build and start scripts from the backend folder instead of the root directory.
*   **Runtime**: `Node`
*   **Build Command**: `npm install && npm run build`
*   **Start Command**: `npm start`
*   **Instance Type**: Select the **Free** tier.

---

## Step 4: Add Environment Variables
Before clicking "Deploy", scroll down to the **Environment Variables** section and add the keys from your `server/.env`:

| Key | Value | Notes |
|---|---|---|
| `PORT` | `5000` | (Render will override this, but safe to set) |
| `NODE_ENV` | `production` | Enables production mode |
| `SUPABASE_URL` | *your-supabase-url* | From Supabase API settings |
| `SUPABASE_ANON_KEY` | *your-supabase-anon-key* | From Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | *your-supabase-service-role-key* | Keep secure (never expose to frontend) |
| `CORS_ORIGINS` | `*` | Or change to your frontend Vercel URL once deployed |

---

## Step 5: Deploy
Click **Create Web Service** at the bottom of the page. Render will pull your repository, build the project via `tsc`, and launch the web server.

Once the deployment status updates to **Live**, your backend URL will be displayed in the top-left corner of the dashboard (e.g., `https://vibesocial-backend.onrender.com`). Use this URL (with `/api` appended) for your frontend's `VITE_API_BASE_URL` environment variable!
