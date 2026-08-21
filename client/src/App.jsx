import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import PageTransition from './components/PageTransition.jsx';
import ViewTransitionProvider from './components/ViewTransitionProvider.jsx';
import { ToastHost } from './components/Toast.jsx';
import { useJsonLd } from './hooks/useJsonLd.jsx';
import { hotelLD } from './lib/seo.jsx';
import { ADMIN_PATH } from './lib/adminPath.jsx';
import {
  Rooms, RoomDetail, Experience, About, Gallery, Stories, Contact,
  NotFound, BookingSuccess, AdminLogin, AdminLayout,
  Overview, FrontDesk, Inbox, Bookings, AdminRooms, AdminSettings, Payments, Pricing, Upsells, Housekeeping, GuestMessaging, Loyalty,
} from './lib/routes.jsx';
// Home is the entry page — it must paint immediately, so it's eager (bundled
// with the entry) rather than a lazy chunk. Everything else is split.
import Home from './pages/Home.jsx';

// Minimal branded loader shown while a route chunk fetches (a beat at most on
// decent connections; invisible on warm caches).
function RouteFallback() {
  return (
    <div className="min-h-[60vh] grid place-items-center" role="status" aria-label="Loading page">
      <div className="spinner" />
    </div>
  );
}

// The old, guessable /admin path must not exist for the public: logged-out
// visitors get a clean 404, while logged-in staff are redirected to the real
// (non-obvious) admin panel.
function AdminDecoy() {
  const token = localStorage.getItem('wura_token');
  if (token) return <Navigate to={ADMIN_PATH} replace />;
  return <NotFound />;
}

export default function App() {
  // Structured data on every page: the Hotel block + AggregateRating.
  useJsonLd('seo-hotel', hotelLD());

  return (
    <>
      <ScrollToTop />
      <ToastHost />
      <ViewTransitionProvider>
      <PageTransition>
      <main id="main">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/about" element={<About />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path={`${ADMIN_PATH}/login`} element={<AdminLogin />} />
            <Route path={ADMIN_PATH} element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="front-desk" element={<FrontDesk />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="payments" element={<Payments />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="upsells" element={<Upsells />} />
              <Route path="housekeeping" element={<Housekeeping />} />
              <Route path="guest-messages" element={<GuestMessaging />} />
              <Route path="loyalty" element={<Loyalty />} />
            </Route>
            <Route path="/admin" element={<AdminDecoy />} />
            <Route path="/admin/*" element={<AdminDecoy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      </PageTransition>
      </ViewTransitionProvider>
    </>
  );
}
