import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    cors: true,
    proxy: {
      // forward /api calls to backend port during development
      // updated to match backend-data-intake default PORT=3005
      '/api': 'http://localhost:3005'
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
