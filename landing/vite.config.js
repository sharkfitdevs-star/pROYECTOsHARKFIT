import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ensure that nothing accidentally runs on a different port
// strictPort:true later will make Vite refuse a non-5173 listen socket,
// but we can catch misconfigured env early and exit loudly.
const expectedPort = process.env.VITE_PORT || '5173';
if (process.env.PORT && process.env.PORT !== expectedPort) {
  console.error(
    `ERROR: landing/vite.config.js requires PORT=${expectedPort} (found ${process.env.PORT}).\n` +
      'Please unset PORT or use the correct value or set VITE_PORT in root .env.local.'
  );
  process.exit(1);
}

// Proxy fixed to localhost so that any client IP works (192.168.x.x, 10.x.x.x, localhost)
const target = 'http://127.0.0.1:3005';

// keep a small log for debugging
console.log('Vite proxy target fixed as', target);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: true,
    host: true,
    cors: true,
    proxy: {
      // auth endpoint must come first or `/api` will match it and override.
      '/api/auth': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
        secure: false,
      },
      // route all other API requests to the main backend server
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          if (process.env.NODE_ENV === 'production') return;
          proxy.on('error', (err, req) => console.log('[VITE PROXY ERROR]', err.message, req && req.url));
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[VITE PROXY REQ]', req.method, req.url);
            if (req.url && req.url.startsWith('/api/clientes')) {
              console.log('[VITE PROXY CLIENTES ->]', proxyReq.getHeader('host'));
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[VITE PROXY RES]', proxyRes.statusCode, req.method, req.url);
            if (req.url && req.url.startsWith('/api/clientes')) {
              console.log('[VITE PROXY CLIENTES RES]', proxyRes.statusCode);
            }
          });
        }
      }
    },
  },
});