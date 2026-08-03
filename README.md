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
│   ├── seed.js        10 rooms, 10 sample bookings, admin user
│   └── roomArt.js     deterministic SVG room art (data URIs)
└── client/            React 19 + Vite + Tailwind v4 + React Router 7
    └── src/
        ├── pages/     Home, admin/{Login, Overview, FrontDesk, Bookings, Rooms}
        ├── components/ Navbar, Footer, BookingWidget, RoomCard, BookingModal, FindBookingModal, Toast…
        └── api.js     fetch wrapper (Bearer token, error handling)
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
| Admin panel | http://127.0.0.1:5173/admin (admin / admin123) |

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | *(in-memory)* | MongoDB connection string. Set for Atlas/local/persistent DB. |
| `JWT_SECRET` | dev secret | Signs admin tokens. **Set in production.** |
| `PORT` | 5000 | Express API port (falls back to 5001, 5174, 8080, 3000). |
| `API_TARGET` | http://127.0.0.1:5000 | Vite proxy target for `/api`. |

## Scripts

- `npm run dev` — API + client concurrently
- `npm run seed` — populate MongoDB (runs automatically on empty DB at boot)
- `npm run build` — production build of the client into `client/dist` (the API serves it)
- `npm run server` / `npm run client` — run one side

## Features

- **Guest site** — hero, live booking widget, rooms grid with **search / sort / pagination**, 3-step booking modal, booking lookup by reference, gallery, testimonials
- **Admin panel** — JWT login, stats dashboard with 30-day occupancy chart, **Front Desk** one-click check-in/out, booking management, room CRUD with maintenance toggle
- **Backend** — Express REST API, Mongoose models, token-bucket **rate limiting** on bookings, **email confirmation stub** (logged to `data/emails.log`), parameterized queries (no injection surface)
- **Design** — gold-on-navy luxury theme, inline SVG room art, no external images or CDNs
