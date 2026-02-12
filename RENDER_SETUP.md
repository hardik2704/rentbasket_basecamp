# Deploying RentBasket to Render

This guide helps you configure the Environment Variables required for your RentBasket deployment on Render.

## 1. Backend Service (Web Service)

When deploying the `server` directory (or root if monorepo), set these Environment Variables:

| Variable | Value / Description | Required? |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `render_port` (Render sets this automatically, but you can set `5001`) | ⚠️ content |
| `JWT_SECRET` | A long, random string (e.g., generated via `openssl rand -hex 32`) | ✅ Yes |
| `JWT_EXPIRES_IN` | `7d` | ✅ Yes |
| `CLIENT_URL` | The URL of your **Frontend** (e.g., `https://rentbasket-client.onrender.com`). <br>If you are serving the frontend *from* the backend (monorepo), set this to your backend URL or `*` for testing. | ✅ Yes |
| `SUPABASE_URL` | Your Supabase Project URL | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Your Supabase Service Role Key (starts with `ey...`) | ✅ Yes |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key | ❌ Optional (Backend uses Service Key usually) |

### Important Notes
- **CORS Error**: If you see CORS errors in the browser console, ensure `CLIENT_URL` matches your frontend URL exactly (no trailing slash).
- **Database**: Ensure your Supabase project is active and accessible.

## 2. Frontend (Static Site)

If you are deploying the `client` directory as a separate Static Site:

| Variable | Value / Description | Required? |
| :--- | :--- | :--- |
| `VITE_API_URL` | The URL of your **Backend** (e.g., `https://rentbasket-api.onrender.com`). <br>**Must NOT have a trailing slash.** | ✅ Yes |

### Important Notes
- **Empty URL**: If `VITE_API_URL` is empty, the frontend will try to call `/api/...` on the *same domain*. This only works if you are serving the frontend static files FROM your backend Express server.
- **Re-build**: Changing environment variables for a Static Site requires a **new deployment (re-build)** to take effect.

## Debugging Login Issues

If you cannot log in ("Login failed" or "Network error"):

1.  **Check the Console**: Open Developer Tools (F12) -> Console. Look for red error messages.
2.  **Network Tab**: Check the Network tab for the failing request (e.g., `login`).
    -   **404 Not Found**: The `VITE_API_URL` might be wrong.
    -   **Network Error / CORS**: The backend `CLIENT_URL` does not match your frontend URL.
    -   **500 Internal Server Error**: Check the Render **Server Logs** for details.
