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
      // authentication requests should hit the users microservice (default port 4000)
      '/api/auth': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/api/auth')
      },
      // everything else continues to point at backend-data-intake on 3005
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
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
