# Wura Grand Hotel — MERN Stack Edition

A fullstack hotel booking webapp: **MongoDB + Express + React + Node** (MERN), built with **Vite** and **Tailwind CSS v4**.

> Previous version (Node + SQLite, vanilla JS) still lives in `server.js` / `db.js` / `public/` at the root — run it with `npm start` (root package.json v1.0.0 legacy is kept in git history / the old files remain untouched).

## Architecture

```
├── server/            Express + Mongoose REST API (MongoDB)
│   ├── index.js       entry: DB connect → seed → routes → listen
│   ├── db.js          MONGODB_URI or in-memory MongoDB (mongodb-memory-server)
│   ├── models/        Room, Booking, User (Mongoose schemas)
│   ├── routes/        public.js (rooms, bookings) + admin.js (JWT-protected)
│   ├── stripe.js      payments adapter — real Stripe Checkout or in-app mock
│   ├── seed.js        50 rooms, 44 sample bookings, admin user
│   └── roomArt.js     deterministic SVG room art (data URIs)
└── client/            React 19 + Vite + Tailwind v4 + React Router 7
    └── src/
        ├── pages/     Home (landing), Rooms, RoomDetail, Experience, Gallery, Stories, Contact,
        │              NotFound, BookingSuccess, admin/{Login, Overview, FrontDesk, Bookings, Rooms}
        ├── components/ Navbar, Footer, PageHero, BookingWidget, RoomCard, BookingModal,
        │              FindBookingModal, ParallaxImage, Reveal, Toast…
        ├── lib/       content.jsx (shared copy), photos.jsx, adminPath.jsx
        └── api.js     fetch wrapper (Bearer token, error handling)
```

## Pages & signature animations

The guest site is **multi-page** — every route is its own URL (great for SEO and for
client presentations), each with a distinct scroll animation. Every navigation between
pages also plays a **route transition**, layered and **direction-aware**: on
browsers with the **View Transitions API** (Chromium 111+, Safari 18+, Firefox
140+) every nav link gets a true out-and-in **crossfade** via
`document.startViewTransition` (`ViewTransitionProvider` intercepts internal
anchor clicks and wraps the navigation). Everywhere else the CSS fallback plays
instead: `PageTransition` wraps `<Routes>` and re-mounts each route with a
fade + rise + de-blur, disabled under `prefers-reduced-motion`.

Navigating **deeper** into the site (home → section → room detail) slides the
new page in **from the right**; going **back** (browser back to a pushed entry)
slides it in **from the left** — the direction is derived from the URL depth for
the native crossfade and from the history index for the fallback.

As a brand signature, a **soft gold veil sweeps** across the screen during the
crossfade: a full-viewport element joins the transition as its own snapshot
(`vt-veil`) whose `::view-transition-new` pseudo animates a faint gold gradient
that sweeps in and fades out — a quiet “Wura” moment on every route change.
Two implementation notes: the route change is committed with `flushSync` inside
the transition callback (the browser captures the “new” snapshot as soon as the
callback resolves, and React otherwise commits asynchronously — the snapshots
would match and the crossfade would be skipped), and the veil is skipped under
`prefers-reduced-motion`.

## SEO readiness

- `public/sitemap.xml` lists all 57 public URLs (7 static pages + all 50 rooms), and
  `public/robots.txt` disallows `/admin`. The sitemap is pre-pointed at the
  live domain `wura-y0y5.onrender.com` — update the `<loc>` entries if you move
  to a custom domain.
- Every page sets its own `<title>` + meta description via the `usePageMeta` hook
  (including per-room titles like *“Deluxe King — Wura Grand Hotel”*), which also
  emits **Open Graph + Twitter Card tags** — `og:title`/`og:description`/`og:url`,
  `og:site_name`, `og:locale`, `twitter:card=summary_large_image` and a
  **per-page `og:image`**: a purpose-built **1200×630 branded social card**
  (navy + gold, Wura monogram, per-page headline — and one per room, keyed by
  `roomSlug` in `shared/roomPhotos.js`), so every link previews as a composed
  card on any platform. Images are absolute URLs, as social platforms require.
- **Social cards** are generated (not hand-made) by
  `npm run generate:social` → `scripts/generate-social-cards.mjs`, which renders
  57 branded cards (7 pages + 50 rooms) with `sharp` into
  `client/public/social/`; rerun it whenever room names change.
- **Responsive images**: `npm run generate:images` →
  `scripts/generate-image-variants.mjs` produces **480/800/1200w variants in
  AVIF, WebP and JPEG** of every self-hosted photo (`<dir>/resp/<base>-<w>.{avif,webp,jpg}`)
  with `sharp`. Every image renders through the `ResponsiveImage` component
  (`<picture>`: AVIF → WebP → JPEG srcset, via the `imgSrcset()` helper in
  `shared/roomPhotos.js`), so the browser downloads the smallest codec and
  width it supports — room cards, detail galleries + thumbs, page heroes, the
  gallery, booking-modal thumbs and the admin photo picker all benefit, and a
  phone loads a card photo at **~9 KB (AVIF) instead of the ~140 KB original**
  (~60-67% smaller than the JPEG variant at every width). The first room card
  in a grid and the page hero load eagerly (`loading="eager"`,
  `fetchpriority="high"` on the hero) so the above-the-fold image paints
  immediately; rerun the generator (≈90s, concurrent) after adding or
  replacing photography.
- **JSON-LD structured data** (`useJsonLd` + `lib/seo.jsx`): a `Hotel` block with
  `AggregateRating` (4.9 / 2,400) on every page, plus a per-room `HotelRoom`
  `Offer` (price, currency, occupancy) on each `/rooms/:id` page — injected in
  `<head>` and removed on navigation so stale data never leaks.
- Room URLs are descriptive name slugs, and `/api/rooms/:id` accepts both
  ObjectIds and name slugs.
- **Server-side prerendering** (`server/prerender.js`): crawlers and link-preview
  agents (Googlebot, Bingbot, Facebook/Twitter bots, etc.) get fully-rendered HTML —
  real title/meta, canonical + OG/Twitter tags (including the same per-room
  `og:image` social cards, via the slug registry shared in `shared/roomPhotos.js`), JSON-LD
  and page content straight from the DB — while real users get the SPA unchanged. Wired before the static fallback in
  `server/app.js`; API, `/admin` and any **file-path** request (`/images/…`,
  `/sitemap.xml`, `/robots.txt`, hashed bundles) are never prerendered —
  crawlers fetching an asset get the real file, so `og:image` previews and image
  search work. This closes the “crawlers need JS” gap: every page is crawlable
  without JavaScript.

## Admin dashboard

The **admin Overview** is a hand-rolled SVG dashboard (no chart library): KPI cards with a revenue sparkline, a draw-in revenue area chart with hover tooltips, a room-type donut, occupancy bars, and status/payment breakdowns — all fed by `GET /api/admin/overview`.

The **admin Inbox** (sidebar badge shows the live unread count) lists contact-form enquiries from MongoDB with read/unread states: open a message to mark it read, toggle it back, reply or delete it, or "Mark all read". Enquiries are saved to the `Message` collection by `POST /api/contact` (and still appended to `data/emails.log`); on boot, `seed.js` imports any existing contact entries from that log so the inbox starts populated.

| Route | Page | Signature motion |
| --- | --- | --- |
| `/` | Home — hero, featured rooms, teasers | Ken-burns hero + parallax banner |
| `/rooms` | Full search / sort / filter / pagination grid | Cards **zoom in** as they enter |
| `/rooms/:id` | Per-room detail: gallery, specs, amenities | Crossfading photo gallery |
| `/experience` | The six signature amenities | Rows **slide in from alternating sides** |
| `/gallery` | Categorized photo mosaic | Per-item parallax + zooming lightbox |
| `/stories` | Guest testimonials | Cards **flip in** |
| `/about` | Hotel history: timeline, founder, values | Timeline rows slide from alternating sides |
| `/contact` | Info cards + enquiry form | Fields stagger in from the right |

**Per-room photography** — all 50 seeded rooms have their own **unique** 2-photo
pool: 100 distinct photos, none shared between rooms (`shared/roomPhotos.js` →
`ROOM_PHOTOS_BY_NAME`; the client re-exports it from `client/src/lib/photos.jsx`,
and the prerender derives per-room `og:image` social cards from the same
registry). Room
detail pages use SEO-stable **name-slug URLs** (`/rooms/Deluxe%20King`) instead
of volatile ObjectIds, so bookmarks and search engines survive DB reseeds.

**Room numbers** — every room has a real physical identity. The seed assigns
deterministic numbers (`server/seed.js` → `assignRoomNumbers`): rooms named for
a floor keep it (`Deluxe King 12th Floor` → **1201**), the rest fill floors
2–20 by tier (2–4 classic, 5–9 deluxe, 10–17 suites, 18–20 penthouses), and the
three standalone villas are **V1–V3**. The `Room` model stores `room_number` +
`floor`; bookings expose them as `room_number`/`room_floor`, the guest-facing
pages (cards, booking modal, confirmation, find-my-booking) and every admin view
(bookings, front desk, overview, rooms table) display them. Admins can set a
number when adding/editing a room (blank auto-assigns the next free one), and
pre-numbering databases are backfilled on boot.

The booking flow carries dates/guests across pages: the hero widget hands off to
`/rooms?checkIn=…&checkOut=…&guests=…`, and every room card links to its detail page.
All animations respect `prefers-reduced-motion`.
```

## Deploying to Render

See **[DEPLOYMENT.md](DEPLOYMENT.md)** — credentials, env vars, pre/post-deploy
checklists, Stripe webhooks, and troubleshooting. Read the pre-deploy checklist
before your first push.

## Requirements

- **Node.js 20+** (24 recommended)
- **MongoDB** — optional! Without a `MONGODB_URI`, the server boots an **in-memory MongoDB** (`mongodb-memory-server`) automatically. For a persistent DB, install MongoDB locally or use Atlas and set the URI.

## Quick start

```bash
# 1. install all workspaces (root, server, client)
npm run setup

# 2. run API + client together
npm run dev
```

Then open:

| App | URL |
| --- | --- |
| Guest site (Vite) | http://127.0.0.1:5173 |
| Express API | http://127.0.0.1:5000/api |
| Admin panel | http://127.0.0.1:5173/hotel-staff-9k2x7 (access code `WURA-1962`, then admin / admin123) |

> The admin panel is deliberately not linked from the public site. Visiting `/admin` (or any `/admin/*` path) returns a clean **404** for logged-out visitors and redirects logged-in staff to the real panel.
>
> **Roles** — accounts are either **administrator** (everything: rooms & rates, bookings, settings, access code, staff accounts) or **front-desk staff** (check guests in/out and read the inbox, plus their own password). Staff are redirected to the Front Desk on sign-in and get a nav with just those two views; every admin-only API route returns `403` for them (`/api/admin/overview`, `/bookings`, `/rooms`, `/upload`, `/access-code`, `/users`), and booking status changes are restricted — staff may only send `checked_in`/`checked_out`. Admins manage accounts under **Settings → Staff accounts**: create staff/admin users, promote or demote, reset passwords, delete (guards: no self-delete, no self-demote, and the last admin can never be demoted or deleted). The seed creates `admin`/`admin123` (admin) and `desk`/`desk123` (staff). The panel itself lives behind a non-obvious URL (override at build time with `VITE_ADMIN_PATH`) and is gated by a **two-step staff login**: the credential form is hidden until a **staff access code** is accepted (`POST /api/admin/verify-code`, server-enforced, override with `ADMIN_ACCESS_CODE`; both steps share the 10 / 15 min per-IP login rate limit, and `/login` re-checks the code as defense in depth). Signed-in admins can **rotate the access code at runtime** from the panel's *Settings* view (`POST /api/admin/access-code` — requires the current code; the new value is stored in MongoDB and takes effect immediately, so the old code stops working). When no stored code exists the `ADMIN_ACCESS_CODE` env value (or the dev default) is used. If the code is ever forgotten, the login page's **Forgot the access code?** flow (`POST /api/admin/recover-access-code`, rate-limited like login) can set a new one using the deploy-level `ADMIN_RESET_SECRET` — no login or DB access required; the endpoint is disabled (403) unless that env var is configured, and comparisons are constant-time. Staff can also reveal a quick-access **Admin** link in the public navbar by visiting the site with the secret fragment `#staff-access-7k2x` appended (override at build time with `VITE_ADMIN_FRAGMENT`).

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | *(in-memory)* | MongoDB connection string. Set for Atlas/local/persistent DB. |
| `JWT_SECRET` | dev secret | Signs admin tokens. **Set in production.** |
| `PORT` | 5000 | Express API port (falls back to 5001, 5174, 8080, 3000). |
| `API_TARGET` | http://127.0.0.1:5000 | Vite proxy target for `/api`. |
| `STRIPE_SECRET_KEY` | *(mock mode)* | Real Stripe Checkout when set (test key for dev). See `server/.env.example`. |
| `STRIPE_WEBHOOK_SECRET` | — | Webhook signing secret from `stripe listen`. |
| `CLIENT_ORIGIN` | http://127.0.0.1:5173 | Base URL used for Stripe success/cancel redirects. |
| `ADMIN_ACCESS_CODE` | `WURA-1962` | Staff access code required on the admin login. |
| `ADMIN_RESET_SECRET` | *(recovery disabled)* | Long random secret that lets a locked-out admin rotate the access code from the login page (no login/DB needed). Leave unset to keep recovery off. |
| `VITE_ADMIN_PATH` | `/hotel-staff-9k2x7` | Client build-time override for the admin panel URL prefix. |
| `VITE_ADMIN_FRAGMENT` | `staff-access-7k2x` | Secret URL fragment (`/#…`) that reveals the Admin quick-access link in the public navbar. |
| `RENDER_EXTERNAL_URL` | — | Set by Render automatically. The keep-alive self-ping target (falls back to `APP_URL`, then `PUBLIC_URL`). |
| `KEEPALIVE` | *(auto)* | Keep-alive override: `0` disables in production, `1` forces it on in dev. |
| `KEEPALIVE_INTERVAL_MIN` | 8 | Self-ping interval in minutes (must stay under Render's ~15 min idle spin-down). |

## Keep-alive & uptime monitoring (Render free tier)

Render (and similar hosts) **spins a free instance down after ~15 minutes of inactivity** — the first request after that pays a cold start. The API has a built-in **keep robot** to prevent that:

- **`GET /health`** — a tiny, DB-aware probe (`200` + `{"status":"ok"}` while Mongo is connected, `503` while it isn't). No auth, no prerendering, `Cache-Control: no-store`.
- **Self-ping loop** (`server/keepalive.js`) — in production the API pings its own `/health` every **8 minutes** (well under the 15-min idle window), so the instance never goes cold. Target URL comes from `RENDER_EXTERNAL_URL` (set automatically by Render) or `APP_URL`/`PUBLIC_URL`; tune with `KEEPALIVE_INTERVAL_MIN`, force off with `KEEPALIVE=0`. The last ping is reported in the `/health` payload (`keepalive.lastPing`) so you can confirm it's running.

**To add it to UptimeRobot:** create an **HTTP(S)** monitor → URL `https://<your-app>.onrender.com/health` → interval 5 min → “Alert when down”. UptimeRobot's pings also wake the instance if it ever does spin down, so the two mechanisms back each other up. `render.yaml` already points Render's own health check at `/health`.

## Scripts

- `npm run dev` — API + client concurrently
- `npm run seed` — populate MongoDB (runs automatically on empty DB at boot)
- `npm run build` — production build of the client into `client/dist` (the API serves it)

**Bundle strategy** — every route is a lazy chunk (`client/src/lib/routes.jsx`); the entry page (Home) and the shared components/lib are bundled with the entry, and `react`/`react-router` sit in one long-cached `vendor-react` chunk (`manualChunks` in `client/vite.config.js`). Nav links prefetch their route chunk on hover/focus so navigations resolve without a Suspense flash. If you ever add a heavy dependency (charts, maps, a rich text editor), it should live in its own route's chunk — never in the entry.
- `npm run server` / `npm run client` — run one side
- `npm test` — run both test suites (server then client)
- `npm run test:server` / `npm run test:client` — run one suite

## Testing

Both workspaces use **Vitest**; no live servers or external services are needed.

- **Server** (`npm run test:server`) — **supertest** against the Express app with its own **in-memory MongoDB** (`mongodb-memory-server`) per run. Covers the public rooms API (search / sort / pagination / availability conflicts), booking creation (validation, 409 date conflicts, token-bucket **rate limiting**, reference lookup), JWT **auth**, admin room CRUD + delete guards, bookings payment filtering, and the full **mock checkout** → webhook → paid pipeline. The app is testable because the Express app is built by `server/app.js#createApp()` with no side effects; `server/index.js` only boots it.
- **Client** (`npm run test:client`) — **React Testing Library** + jsdom for `BookingModal` (steps, validation, checkout redirect), `BookingSuccess` (paid / pending / error states), `FindBookingModal`, the admin `Bookings` (payment pills + filters) and `FrontDesk` (unpaid badge, one-click check-in) views, and a `Home` smoke test. The `api` helper is mocked per file.

Tests use `NODE_ENV=test`, which silences the email stub, enables the mock checkout, and excludes mock-payment routes in production builds.

## Features

- **Guest site** — hero, live booking widget, rooms grid with **search / sort / pagination**, 3-step booking modal, booking lookup by reference, gallery, testimonials
- **Admin panel** — JWT login, stats dashboard with 30-day occupancy chart, **Front Desk** one-click check-in/out, booking management, room CRUD with maintenance toggle and a **photo picker** — when adding/editing a room the admin chooses up to 2 photos from the shared 100-photo pool or uploads their own (PNG/JPEG/WebP, stored in **MongoDB GridFS** so uploads survive redeploys — served at `/images/uploads/`, with a `data/uploads/` disk fallback for legacy files), which then override the type fallback on cards, detail galleries and social `og:image`
- **Payments** — real **Stripe Checkout** (card payment, webhook-verified) integrated into the 3-step booking modal; bookings carry a `payment_status` (unpaid → paid) shown in the admin bookings table and Front Desk. Without a Stripe key the app runs a **sandbox mock checkout** page so the whole flow works offline with zero setup.
- **Backend** — Express REST API, Mongoose models, token-bucket **rate limiting** on bookings *and* the contact form, plus **anti-bot defenses** on the contact form: a hidden **honeypot field** and a human-speed timing check (both silently 200-OK without storing, so spammers can't tell they're caught), **email confirmation stub** sent after payment (logged to `data/emails.log`), parameterized queries (no injection surface)
- **Contact form** — `POST /api/contact` validates the enquiry (name/email/message, email format, length caps, 5-per-10-min per-IP limit) and logs it to `data/emails.log` via the same email stub as booking confirmations — swap `sendContactMessage` for a real mailer or CRM webhook when you have credentials.
## Payments

Bookings are created unpaid, then the guest is handed off to a hosted checkout page (`POST /api/bookings` returns a `checkout_url`):

1. **Real mode** — set `STRIPE_SECRET_KEY` (test key). The guest pays on `checkout.stripe.com`; the `POST /api/webhooks/stripe` endpoint verifies `checkout.session.completed` and marks the booking paid. Run `stripe listen --forward-to localhost:5000/api/webhooks/stripe` for local webhooks, or rely on the success-page verify endpoint (`POST /api/bookings/:ref/payment/complete`).
2. **Mock mode** (default) — the checkout URL points at a sandbox page served by this API (`/mock-checkout/:id`) with a prefilled 4242 card and a Pay button; paying completes the same pipeline (mark paid + send confirmation email) and redirects to the success page.

Paid bookings unlock nothing extra yet — a booking that abandons checkout stays `unpaid` and still holds the room (it can be cancelled from the admin panel).

- **Design** — gold-on-navy luxury theme with **real photography** (self-hosted under `client/public/images/`, Unsplash License): a full-bleed hero banner with **scroll parallax + ken-burns drift**, room cards that zoom out as they scroll into view, and a gallery with per-item parallax. The admin panel keeps the inline SVG room art.

## Images

All photography is self-hosted in `client/public/images/` (no external CDNs, all Unsplash License). The mapping lives in `shared/roomPhotos.js` (re-exported by `client/src/lib/photos.jsx`): `HERO_IMAGE`, `ROOM_PHOTOS` (by room type — the fallback for admin-added rooms), `ROOM_PHOTOS_BY_NAME` (100 unique photos — every seeded room owns its pair, never shared), plus `EXPERIENCE_PHOTOS` and `GALLERY_PHOTOS`. A room's **admin-chosen `photos`** (set in the Rooms & Rates modal) always win over the pool, then the pool, then the type fallback — so `roomPhoto`/`roomPhotos` stay in sync for cards, galleries, the prerender and `og:image`. Swap a file to change a photo — paths are stable. Scroll effects are driven by `client/src/hooks/useParallax.jsx` + `client/src/components/ParallaxImage.jsx` and respect `prefers-reduced-motion`.
