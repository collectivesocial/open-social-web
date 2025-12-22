import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    proxy: {
      // Proxy API requests to backend
      '/login': 'http://127.0.0.1:3001',
      '/logout': 'http://127.0.0.1:3001',
      '/users': 'http://127.0.0.1:3001',
      '/oauth': 'http://127.0.0.1:3001',
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
