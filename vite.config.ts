import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The dev server proxies /api and /public to the Spring Boot backend, so the browser never hits CORS.
// Change the target with VITE_API_TARGET in .env.local (default http://localhost:8081).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'http://localhost:8081';
  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
      port: 5173,
      // The browser sees these calls as same-origin, so drop its Origin header: otherwise the backend's CORS check
      // rejects any dev port other than FRONTEND_URL (e.g. 5174 when 5173 is taken).
      proxy: Object.fromEntries(['/api', '/public'].map((p) => [p, {
        target, changeOrigin: true,
        configure: (proxy: { on: (e: string, cb: (req: { removeHeader: (h: string) => void }) => void) => void }) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      }])),
    },
  };
});
