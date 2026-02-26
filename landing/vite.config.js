import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
    port: 3000,
    strictPort: false,
    host: true,
    cors: true,
    proxy: {
      // route all API requests to the backend server (always localhost)
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});