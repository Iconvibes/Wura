import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta.jsx';

export default function NotFound() {
  usePageMeta('Page not found — Wura Grand Hotel', 'The page you are looking for has checked out. Head back to the lobby.');
  return (
    <div className="login-wrap">
      <div className="w-full max-w-md fade-up text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950 text-2xl mx-auto shadow-[0_0_40px_rgba(212,175,55,0.45)]">
          W
        </div>
        <div className="font-serif text-[96px] leading-none text-gold-400 mt-8 tracking-wide">404</div>
        <h1 className="font-serif text-[26px] text-cream mt-3">This page has checked out</h1>
        <p className="text-[13.5px] text-muted mt-2 leading-relaxed max-w-sm mx-auto">
          The room you're looking for doesn't exist — or has been moved somewhere
          quieter. Our front desk is happy to point you back to the lobby.
        </p>
        <Link to="/" className="btn btn-gold mt-8 inline-flex">
          Back to the hotel
        </Link>
      </div>
    </div>
  );
}
