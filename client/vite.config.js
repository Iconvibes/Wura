import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The Express API runs on 5000 (falling back to 5001 etc. if busy).
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:5000';

// Chunk strategy: route code splitting is good (pages load on demand), but the
// auto-splitting of every tiny shared module (0.5–2 kB each) exploded the
// request count and hurt mobile TBT/LCP. Group deliberately instead:
//   vendor  — react + react-dom + react-router (one cached chunk)
//   shared  — the site's components/hooks/lib that every page uses
// leaving only the per-page route chunks on top.
function manualChunks(id) {
  if (!id.includes('node_modules')) {
    if (/[\\/]src[\\/](components|hooks|lib)[\\/]/.test(id)) return 'shared';
    return undefined;
  }
  if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
  return 'vendor';
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { output: { manualChunks } } },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Allow importing the shared room-photo registry from ../shared (repo root).
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      // Admin-uploaded room photos are served by the API from data/uploads.
      '/images/uploads': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.jsx'],
    css: false,
  },
});
