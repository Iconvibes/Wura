import { useState, useEffect } from 'react';

const PHONE = '2348101035359'; // +234 810 1035359 (country code stripped)
const MSG = encodeURIComponent('Hello! I would like to enquire about booking a room at De Wura & Alfred Exotic Place Hotel.');

export default function WhatsAppButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    // Show immediately on mobile (no need to wait for scroll)
    if (window.innerWidth < 768) setVisible(true);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href={`https://wa.me/${PHONE}?text=${MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={`fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full grid place-items-center shadow-[0_4px_24px_rgba(37,211,102,0.45)] hover:shadow-[0_6px_32px_rgba(37,211,102,0.65)] hover:scale-110 active:scale-95 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{ backgroundColor: '#25D366' }}
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 32 32" width="28" height="28" fill="white">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.132 6.744 3.058 9.374L1.054 31.25l6.118-1.97C9.702 30.83 12.756 32 16.004 32 24.83 32 32 24.822 32 16S24.83 0 16.004 0zm9.318 22.594c-.39 1.094-1.932 2.006-3.148 2.27-.826.18-1.904.322-5.54-1.19-4.66-1.934-7.652-6.71-7.882-7.02-.224-.31-1.824-2.424-1.824-4.624s1.156-3.28 1.564-3.724c.39-.444.926-.574 1.232-.574.148 0 .284.008.406.014.412.018.618.042.888.67.34.792 1.156 2.808 1.256 3.01.1.2.168.434.034.7-.13.268-.196.434-.39.668-.194.234-.408.522-.582.7-.194.198-.396.41-.168.804.228.394 1.016 1.68 2.178 2.722 1.494 1.34 2.752 1.756 3.146 1.954.394.198.628.164.858-.1.23-.264.982-1.146 1.244-1.544.262-.398.524-.33.886-.198.362.13 2.308 1.086 2.704 1.284.396.198.66.296.76.46.1.164.1.954-.294 2.048z" />
      </svg>
    </a>
  );
}
