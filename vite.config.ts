import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5174,
    host: '127.0.0.1',
    proxy: {
      // Proxy API requests to backend
      '/login': 'http://127.0.0.1:3001',
      '/logout': 'http://127.0.0.1:3001',
      '/users': 'http://127.0.0.1:3001',
      '/oauth': 'http://127.0.0.1:3001',
      '/communities': {
        target: 'http://127.0.0.1:3001',
        bypass(req) {
          // When the browser navigates/refreshes (Accept: text/html),
          // serve the SPA index.html so React Router handles the route.
          // Fetch/XHR calls from the app won't include text/html in Accept.
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
