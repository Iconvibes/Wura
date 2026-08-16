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
        ├── lib/       content.js (shared copy), photos.js, adminPath.js
        └── api.js     fetch wrapper (Bearer token, error handling)
```

## Pages & signature animations

The guest site is **multi-page** — every route is its own URL (great for SEO and for
client presentations), each with a distinct scroll animation. Every navigation between
pages also plays a **route transition** (`PageTransition` wraps `<Routes>` — a 0.5s
fade + rise + de-blur on mount, disabled under `prefers-reduced-motion`):

## SEO readiness

- `public/sitemap.xml` lists all 57 public URLs (7 static pages + all 50 rooms), and
  `public/robots.txt` disallows `/admin`. **Replace the placeholder domain
  `wuragrand.example` with the live domain before deploying.**
- Every page sets its own `<title>` + meta description via the `usePageMeta` hook
  (including per-room titles like *“Deluxe King — Wura Grand Hotel”*).
- **JSON-LD structured data** (`useJsonLd` + `lib/seo.js`): a `Hotel` block with
  `AggregateRating` (4.9 / 2,400) on every page, plus a per-room `HotelRoom`
  `Offer` (price, currency, occupancy) on each `/rooms/:id` page — injected in
  `<head>` and removed on navigation so stale data never leaks.
- Room URLs are descriptive name slugs, and `/api/rooms/:id` accepts both
  ObjectIds and name slugs.
- **Server-side prerendering** (`server/prerender.js`): crawlers and link-preview
  agents (Googlebot, Bingbot, Facebook/Twitter bots, etc.) get fully-rendered HTML —
  real title/meta, canonical + OG tags, JSON-LD and page content straight from the
  DB — while real users get the SPA unchanged. Wired before the static fallback in
  `server/app.js`; API and `/admin` paths are never prerendered. This closes the
  “crawlers need JS” gap: every page is crawlable without JavaScript.

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

**Per-room photography** — every one of the ten seeded rooms has its own 2-photo
pool (`client/src/lib/photos.js` → `ROOM_PHOTOS_BY_NAME`), and room detail pages
use SEO-stable **name-slug URLs** (`/rooms/Deluxe%20King`) instead of volatile
ObjectIds, so bookmarks and search engines survive DB reseeds.

The booking flow carries dates/guests across pages: the hero widget hands off to
`/rooms?checkIn=…&checkOut=…&guests=…`, and every room card links to its detail page.
All animations respect `prefers-reduced-motion`.
```

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

> The admin panel is deliberately not linked from the public site. Visiting `/admin` (or any `/admin/*` path) returns a clean **404** for logged-out visitors and redirects logged-in staff to the real panel. The panel itself lives behind a non-obvious URL (override at build time with `VITE_ADMIN_PATH`) and is gated by a **two-step staff login**: the credential form is hidden until a **staff access code** is accepted (`POST /api/admin/verify-code`, server-enforced, override with `ADMIN_ACCESS_CODE`; both steps share the 10 / 15 min per-IP login rate limit, and `/login` re-checks the code as defense in depth). Staff can also reveal a quick-access **Admin** link in the public navbar by visiting the site with the secret fragment `#staff-access-7k2x` appended (override at build time with `VITE_ADMIN_FRAGMENT`).

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
| `VITE_ADMIN_PATH` | `/hotel-staff-9k2x7` | Client build-time override for the admin panel URL prefix. |
| `VITE_ADMIN_FRAGMENT` | `staff-access-7k2x` | Secret URL fragment (`/#…`) that reveals the Admin quick-access link in the public navbar. |

## Scripts

- `npm run dev` — API + client concurrently
- `npm run seed` — populate MongoDB (runs automatically on empty DB at boot)
- `npm run build` — production build of the client into `client/dist` (the API serves it)
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
- **Admin panel** — JWT login, stats dashboard with 30-day occupancy chart, **Front Desk** one-click check-in/out, booking management, room CRUD with maintenance toggle
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

All photography is self-hosted in `client/public/images/` (no external CDNs). The mapping lives in `client/src/lib/photos.js`: `HERO_IMAGE`, `ROOM_PHOTOS` (by room type), `EXPERIENCE_PHOTOS` and `GALLERY_PHOTOS`. Swap a file to change a photo — paths are stable. Scroll effects are driven by `client/src/hooks/useParallax.js` + `client/src/components/ParallaxImage.jsx` and respect `prefers-reduced-motion`.
