import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Multi-page feel: every route change starts at the top of the new page.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
