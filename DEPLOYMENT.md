# Deploying Wura Grand Hotel to Render

Everything needed to go from this repo to a live site — credentials, env vars, and
the steps to run before and after pushing. Work through **Section 1 before the
first deploy** and **Section 4 after every deploy**.

---

## 0. Credentials at a glance

| Item | Value | Where to change it |
| --- | --- | --- |
| **Admin panel URL** | `https://<your-app>.onrender.com/hotel-staff-9k2x7` | `VITE_ADMIN_PATH` env var (build-time) |
| **Staff access code** (first login gate) | `WURA-1962` | `ADMIN_ACCESS_CODE` env, or Settings → *Rotate the staff access code* |
| **Admin account** | `admin` / `admin123` (role: administrator) | Settings → *Change your sign-in password* |
| **Demo staff account** | `desk` / `desk123` (role: front-desk) | Settings → *Staff accounts* (admin only) |
| **Roles** | admin = everything; staff = front desk + inbox | Settings → *Staff accounts* to create/promote/demote |
| **Recovery secret** (forgot-code flow) | *not set* | `ADMIN_RESET_SECRET` env var |
| **MongoDB** | *in-memory unless set* | `MONGODB_URI` env var |

> ⚠️ **`admin` / `admin123` and `WURA-1962` are public demo credentials.** Change
> the password and rotate the access code **immediately after the first deploy**
> (both can be done from the admin panel's Settings view — no code needed).

---

## 1. Pre-deploy checklist (run once, before the first push)

1. **Domain is already wired** — the sitemap, robots, OG tags and JSON-LD all
   point at `https://wura-y0y5.onrender.com`. Only touch them if you move to a
   custom domain (`client/public/sitemap.xml` has all 58 `<loc>` entries).
2. **Generate a `JWT_SECRET`** (long random value — see Section 3).
3. **Generate an `ADMIN_RESET_SECRET`** so a forgotten access code is recoverable
   without DB access (optional but strongly recommended).
4. **Decide your admin URL.** If you don't want `/hotel-staff-9k2x7`, set
   `VITE_ADMIN_PATH` — **it is baked into the build**, so set it *before* Render
   runs the build command.
5. **Have an Atlas MongoDB cluster ready** (free M0 is fine). Without
   `MONGODB_URI` the server runs an in-memory Mongo that **wipes all data on
   every restart/redeploy** — rooms you add, bookings, inbox messages, and even
   a rotated access code would all reset.
6. **Stripe keys** (optional): grab `sk_test_*` + `whsec_*` from the Stripe
   dashboard if you want real card payments; otherwise the app runs in sandbox
   mock-checkout mode with zero setup.

---

## 2. Creating the Render service

### Option A — Blueprint (easiest; render.yaml already in the repo)

1. Render Dashboard → **New → Blueprint**.
2. Connect your GitHub repo (`Iconvibes/Wura`).
3. Render reads `render.yaml` (web service `wura-grand-server`, build + start
   commands, `/health` health check) and creates the service.
4. Add the env vars from Section 3 in the service's **Environment** tab, then
   **Manual Deploy → Deploy latest commit**.

### Option B — Manual web service

1. Render Dashboard → **New → Web Service** → connect the repo.
2. Settings:
   - **Root Directory:** *(repo root — leave blank)*
   - **Environment:** Node
   - **Build Command:** `npm install && npm run setup && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. Add env vars (Section 3) and deploy.

> The build runs `npm run build` (Vite → `client/dist`), and the Express server
> serves that built SPA plus the API from one process — **one service is enough**,
> no separate static host needed.

---

## 3. Environment variables (Render → service → Environment)

| Var | Example | Required? | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/wura` | **Yes (prod)** | Without it data resets on every restart. Use Atlas. |
| `JWT_SECRET` | `openssl rand -hex 32` | **Yes** | Signs admin tokens. Keep secret. |
| `ADMIN_RESET_SECRET` | `openssl rand -hex 32` | Recommended | Enables the forgot-code recovery flow on the login page. Unset = recovery disabled (403). |
| `ADMIN_ACCESS_CODE` | `WURA-1962` | Optional | Initial staff access code. Rotating it in Settings overrides this. |
| `VITE_ADMIN_PATH` | `/hotel-staff-9k2x7` | Optional | **Build-time.** Admin panel URL prefix. Set *before* the build runs. |
| `VITE_ADMIN_FRAGMENT` | `staff-access-7k2x` | Optional | **Build-time.** Secret fragment that reveals the public-nav Admin link. |
| `STRIPE_SECRET_KEY` | `sk_test_…` | Optional | Real Stripe Checkout. Unset = sandbox mock checkout. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Only with Stripe | Signing secret; must match the webhook endpoint you create (see Section 5). |
| `CLIENT_ORIGIN` | `https://<your-app>.onrender.com` | With Stripe | Base URL for Stripe success/cancel redirects. |
| `RENDER_EXTERNAL_URL` | *(auto)* | — | Set by Render; the keep-alive self-ping uses it. |
| `KEEPALIVE` | `1` | Optional | `0` disables the keep-alive in production. Default auto-on. |
| `PORT` | `10000` | — | Render injects this automatically; the server respects it. |

**UptimeRobot:** create an **HTTP(S)** monitor → URL
`https://<your-app>.onrender.com/health` → interval **5 min** → "Alert when down".
The built-in keep-alive self-pings every 8 minutes, and UptimeRobot's probes
back it up — the instance never hits Render's ~15-minute idle spin-down.

---

## 4. Post-deploy verification checklist

- [ ] `https://<your-app>.onrender.com/health` → `200 {"status":"ok"}`
- [ ] Home page loads (hero, booking widget), `/rooms`, a room detail page, `/about`, `/contact`
- [ ] `/sitemap.xml` and `/robots.txt` are served (robots blocks `/admin`)
- [ ] **Admin login works** — visit `…/hotel-staff-9k2x7`, enter `WURA-1962`,
      then `admin` / `admin123`
- [ ] **Change the admin password** (Settings → *Change your sign-in password*)
- [ ] **Rotate the access code** (Settings → *Rotate the staff access code*) — or
      set `ADMIN_ACCESS_CODE` before the next deploy
- [ ] **Review staff accounts** (Settings → *Staff accounts*) — delete the demo
      `desk` account or reset its password, and create a real account per staff
      member (front-desk role can only check in/out + read the inbox)
- [ ] Submit the contact form; confirm it lands in the admin **Inbox**
- [ ] Make a test booking → mock/Stripe checkout → booking shows `paid` in admin
      **Bookings** (confirm the confirmation email line in the server logs)
- [ ] Paste a page URL into a link-preview tool (WhatsApp/Facebook/Slack) — the
      branded `og:image` card should render
- [ ] Google Search Console: submit the sitemap; test a page in the Rich Results
      tool (JSON-LD Hotel/Offer should validate)
- [ ] Check the server log after ~10 min — a keep-alive ping line should appear
      (proof the instance isn't going to sleep)

---

## 5. Stripe webhook (only if using real payments)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
   URL `https://<your-app>.onrender.com/api/webhooks/stripe`, event
   `checkout.session.completed`.
2. Copy the `whsec_…` signing secret into `STRIPE_WEBHOOK_SECRET` and re-deploy.
3. Set `CLIENT_ORIGIN` to your Render (or custom) URL so checkout redirects go
   to the right place.
4. Locally, mirror the flow with `stripe listen --forward-to localhost:5000/api/webhooks/stripe`.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Site works but data disappears after redeploy | `MONGODB_URI` not set — the server used in-memory Mongo. Set the Atlas URI. |
| Admin URL is the default even though you set `VITE_ADMIN_PATH` | Build-time var — it must be set **before** the build runs. Change it and deploy again. |
| `og:image` / link previews show no card | Social cards are committed in `client/public/social/` — if you renamed rooms, regenerate with `npm run generate:social` before building. |
| Prerender serves generic titles for crawlers | Confirm the request comes with a bot User-Agent; real browsers get the SPA by design. |
| Admin-uploaded room photos | Stored in **MongoDB GridFS** (bucket `uploads`) since the uploads upgrade — they persist across redeploys as long as `MONGODB_URI` points at your Atlas DB. Older uploads still on local `data/uploads/` are served as a fallback but won't survive a redeploy; re-upload them once to move them into GridFS. |
| First request is slow | Render free tier cold start — the keep-alive + UptimeRobot monitor prevent it in practice. |

---

## 7. First-login security routine (after deploy)

1. Settings → **Change your sign-in password** → set a real password.
2. Settings → **Rotate the staff access code** → set a code staff can type
   (e.g. `WURA-2026`) — or set `ADMIN_ACCESS_CODE` in env and redeploy.
3. Generate `ADMIN_RESET_SECRET` in env if not already set — it's the one
   credential that can recover a forgotten code, so treat it like a root password.
4. Share the new code with staff; the old ones stop working immediately.
