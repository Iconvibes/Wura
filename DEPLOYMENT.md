# Deployment Guide — Server (Render / Railway) and Frontend (Netlify)

This document explains how to deploy the `server/` (Express + MongoDB) and `client/` (Vite React) parts of the project.

## Prerequisites
- GitHub repo with this project
- A cloud MongoDB (MongoDB Atlas) — you need a connection string
- Accounts on Render or Railway (for the server) and Netlify (for the client)

---

## 1) Create a MongoDB Atlas cluster

1. Sign in to https://www.mongodb.com/cloud/atlas and create a free cluster.
2. Create a database user and note the username and password.
3. In Network Access add your host IPs or allow access from anywhere (0.0.0.0/0) for quick testing (not recommended for production).
4. Get your connection string (URI) and replace `<PASSWORD>` with the database user's password. Example:

```
mongodb+srv://username:<PASSWORD>@cluster0.abcd.mongodb.net/wura_grand?retryWrites=true&w=majority
```

Use this as the `MONGODB_URI` environment variable for your server host.

---

## 2) Deploy the `server` on Render (recommended)

1. Go to https://render.com and create a new Web Service.
2. Connect your GitHub repository and select the `main` branch.
3. Set the following service settings:
   - Environment: `Node`
   - Build Command: `npm --prefix server install`
   - Start Command: `npm --prefix server start`
   - Health Check Path: `/api/rooms`
4. Add environment variables in Render dashboard:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — set a strong secret
5. Deploy. Render will run the build and start the service. Take note of the service URL (e.g. `https://wura-grand-server.onrender.com`).

### render.yaml
I added `render.yaml` at the repo root as a starter manifest. Edit the `repo` and values, then you can import it in Render.

---

## 3) Deploy the full-stack app on Render (single service)

This repo now supports a single full-stack Render deployment:

1. Create a new Web Service on Render and connect your GitHub repo.
2. Use the root repo settings.
3. Set the Build Command to:
   - `npm install && npm run setup && npm run build`
4. Set the Start Command to:
   - `npm start`
5. Set Environment Variables:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — a strong secret
   - `PORT` — `5000` (optional, Render sets a port automatically if missing)
6. Deploy and verify the service URL.

Because `server/index.js` serves `client/dist` when it exists, Render will serve the built React app and the Express API from one service.

---

## 4) Deploy the `server` on Railway (alternative)

1. Create a new project on https://railway.app and link GitHub.
2. Add an environment variable `MONGODB_URI` and `JWT_SECRET` in Railway project settings.
3. Set the service start command to `npm --prefix server start`.

---

## 5) Deploy frontend to Netlify

> If you use Render for the full-stack app, you do not need this Netlify step.

1. On Netlify create a new site and connect your GitHub repo.
2. Set the site build settings:
   - Base directory: `client`
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
3. (Optional) Add a redirect to the API by creating `client/public/_redirects` with:

```
/api/* https://your-server-url/:splat 200
```

or add the following to `netlify.toml` at the repo root:

```toml
[build]
  base = "client"
  publish = "client/dist"
  command = "npm ci && npm run build"

[[redirects]]
  from = "/api/*"
  to = "https://your-server-url/:splat"
  status = 200
  force = true
```

---

## 6) Environment variables you must set on your host
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — secret for signing admin tokens
- `PORT` — server port (Render usually provides one automatically, but `5000` is also supported)

---

## 6) Post-deploy checks
1. Visit the server URL and check `GET /api/rooms` in your browser or with `curl`.
2. Deploy the client and verify it can reach the API via the redirect or the absolute URL.

---

If you want, I can:
- create a `netlify.toml` and `_redirects` for you and open a PR; or
- create a Render importable `render.yaml` PR with repo replaced by your GitHub URL.

---

## 7) Firestore (Firebase) integration (optional migration)

If you prefer Firestore instead of MongoDB, follow these steps. The repo includes a lightweight Firestore initializer at `server/firestore.js` that supports three modes:

- `FIREBASE_SERVICE_ACCOUNT` (recommended for CI): base64-encoded service account JSON
- `FIREBASE_KEY_PATH`: path to a local service-account JSON file (less secure)
- `FIRESTORE_EMULATOR_HOST`: use the local Firestore emulator for development

Install the admin SDK in the server folder:

```bash
npm --prefix server install firebase-admin
```

Create a service account in the Firebase Console (Project Settings → Service accounts → Generate new private key). Then either:

- Base64 the JSON and set `FIREBASE_SERVICE_ACCOUNT` to the base64 string in your host/env (recommended for Render/Netlify CI):

```bash
base64 service-account.json | tr -d '\n'  # copy output
# then set as env var in Render/Railway: FIREBASE_SERVICE_ACCOUNT=<base64-string>
```

- Or upload the JSON to the server host and set `FIREBASE_KEY_PATH` to its path (e.g. `server/firebase-service-account.json`).

Local emulator (optional): install `firebase-tools`, start the emulator, and set `FIRESTORE_EMULATOR_HOST=localhost:8080` when running the server.

Notes on migration:
- The Firestore initializer exports a `Firestore` instance. You'll need to create lightweight helpers that map the existing Mongoose models (`server/models/*`) to Firestore collections (`rooms`, `bookings`, `users`).
- For a minimal scaffold I added `server/firestore.js` which returns a configured `Firestore` client. It does not modify routes or seed data — you can migrate incrementally.

If you'd like, I can open a PR that:
- adds `server/firestore.js` (already added),
- documents the expected env vars (done in this file), and
- scaffolds simple helpers and a migration `server/seed.firestore.js` that writes the same demo data into Firestore.

