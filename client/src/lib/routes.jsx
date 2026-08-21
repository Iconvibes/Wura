import { lazy } from 'react';

/*
 * Central route registry. Every page is a lazy chunk (code splitting — the
 * initial bundle only carries the shell + current page). The loader functions
 * are also the prefetch handles: hovering/focusing a nav link warms the chunk
 * so route changes resolve without a Suspense flash, even on first visit.
 */
// Home is the entry page — App imports it eagerly so first paint isn't gated
// on a lazy chunk. (No loadHome/prefetch: it's always in the initial bundle.)
export const loadRooms = () => import('../pages/Rooms.jsx');
export const loadRoomDetail = () => import('../pages/RoomDetail.jsx');
export const loadExperience = () => import('../pages/Experience.jsx');
export const loadAbout = () => import('../pages/About.jsx');
export const loadGallery = () => import('../pages/Gallery.jsx');
export const loadStories = () => import('../pages/Stories.jsx');
export const loadContact = () => import('../pages/Contact.jsx');
export const loadNotFound = () => import('../pages/NotFound.jsx');
export const loadBookingSuccess = () => import('../pages/BookingSuccess.jsx');
export const loadAdminLogin = () => import('../pages/admin/AdminLogin.jsx');
export const loadAdminLayout = () => import('../pages/admin/AdminLayout.jsx');
export const loadOverview = () => import('../pages/admin/Overview.jsx');
export const loadFrontDesk = () => import('../pages/admin/FrontDesk.jsx');
export const loadInbox = () => import('../pages/admin/Inbox.jsx');
export const loadBookings = () => import('../pages/admin/Bookings.jsx');
export const loadAdminRooms = () => import('../pages/admin/Rooms.jsx');
export const loadAdminSettings = () => import('../pages/admin/Settings.jsx');
export const loadPayments = () => import('../pages/admin/Payments.jsx');
export const loadPricing = () => import('../pages/admin/Pricing.jsx');
export const loadUpsells = () => import('../pages/admin/Upsells.jsx');
export const loadHousekeeping = () => import('../pages/admin/Housekeeping.jsx');
export const loadGuestMessaging = () => import('../pages/admin/GuestMessaging.jsx');
export const loadLoyalty = () => import('../pages/admin/Loyalty.jsx');

export const Rooms = lazy(loadRooms);
export const RoomDetail = lazy(loadRoomDetail);
export const Experience = lazy(loadExperience);
export const About = lazy(loadAbout);
export const Gallery = lazy(loadGallery);
export const Stories = lazy(loadStories);
export const Contact = lazy(loadContact);
export const NotFound = lazy(loadNotFound);
export const BookingSuccess = lazy(loadBookingSuccess);
export const AdminLogin = lazy(loadAdminLogin);
export const AdminLayout = lazy(loadAdminLayout);
export const Overview = lazy(loadOverview);
export const FrontDesk = lazy(loadFrontDesk);
export const Inbox = lazy(loadInbox);
export const Bookings = lazy(loadBookings);
export const AdminRooms = lazy(loadAdminRooms);
export const AdminSettings = lazy(loadAdminSettings);
export const Payments = lazy(loadPayments);
export const Pricing = lazy(loadPricing);
export const Upsells = lazy(loadUpsells);
export const Housekeeping = lazy(loadHousekeeping);
export const GuestMessaging = lazy(loadGuestMessaging);
export const Loyalty = lazy(loadLoyalty);

// Public nav destinations → their chunk loaders, for hover/focus prefetch.
export const ROUTE_LOADERS = {
  '/rooms': loadRooms,
  '/experience': loadExperience,
  '/about': loadAbout,
  '/gallery': loadGallery,
  '/stories': loadStories,
  '/contact': loadContact,
};

export function prefetchRoute(pathname) {
  const fn = ROUTE_LOADERS[pathname];
  if (fn) fn().catch(() => {});
}

// Room detail pages aren't in the nav, but card links lead there.
export function prefetchRoomDetail() {
  loadRoomDetail().catch(() => {});
}
