import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    cors: true,
    proxy: {
      '/api': {
        // proxy now points to backend-data-intake running on port 3005
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
        // keep the /api prefix when forwarding to the backend
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    'process.env': {}
  }
})
