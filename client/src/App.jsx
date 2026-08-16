import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import PageTransition from './components/PageTransition.jsx';
import ViewTransitionProvider from './components/ViewTransitionProvider.jsx';
import Home from './pages/Home.jsx';
import Rooms from './pages/Rooms.jsx';
import RoomDetail from './pages/RoomDetail.jsx';
import Experience from './pages/Experience.jsx';
import About from './pages/About.jsx';
import Gallery from './pages/Gallery.jsx';
import Stories from './pages/Stories.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
import BookingSuccess from './pages/BookingSuccess.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import { ADMIN_PATH } from './lib/adminPath.js';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Overview from './pages/admin/Overview.jsx';
import FrontDesk from './pages/admin/FrontDesk.jsx';
import Inbox from './pages/admin/Inbox.jsx';
import Bookings from './pages/admin/Bookings.jsx';
import AdminRooms from './pages/admin/Rooms.jsx';
import { ToastHost } from './components/Toast.jsx';
import { useJsonLd } from './hooks/useJsonLd.js';
import { hotelLD } from './lib/seo.js';

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
          <Route path="rooms" element={<AdminRooms />} />
        </Route>
        <Route path="/admin" element={<AdminDecoy />} />
        <Route path="/admin/*" element={<AdminDecoy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </PageTransition>
      </ViewTransitionProvider>
    </>
  );
}
