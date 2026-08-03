import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Overview from './pages/admin/Overview.jsx';
import FrontDesk from './pages/admin/FrontDesk.jsx';
import Bookings from './pages/admin/Bookings.jsx';
import Rooms from './pages/admin/Rooms.jsx';
import { ToastHost } from './components/Toast.jsx';

export default function App() {
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="front-desk" element={<FrontDesk />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="rooms" element={<Rooms />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
