import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to suppress WebSocket proxy errors
const suppressProxyErrors = () => {
  return {
    name: 'suppress-proxy-errors',
    configureServer(server) {
      // Suppress EPIPE and ECONNRESET errors from WebSocket proxy
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Override console.error to filter proxy errors
      console.error = (...args) => {
        const message = args.join(' ');
        // Filter out common WebSocket proxy errors
        if (
          message.includes('ws proxy socket error') ||
          message.includes('Error: write EPIPE') ||
          message.includes('Error: read ECONNRESET') ||
          message.includes('EPIPE') ||
          message.includes('ECONNRESET')
        ) {
          // Suppress these errors - they're harmless during development
          return;
        }
        originalError.apply(console, args);
      };
      
      // Also filter warnings
      console.warn = (...args) => {
        const message = args.join(' ');
        if (
          message.includes('ws proxy socket error') ||
          message.includes('EPIPE') ||
          message.includes('ECONNRESET')
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };
    },
  };
};

export default defineConfig({
  plugins: [react(), suppressProxyErrors()],
  root: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  publicDir: 'public', // Enable public folder for static assets like board images
  server: {
    port: 5173,
    cors: true,
    proxy: {
      // Proxy socket.io connections to backend (development only)
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      // Proxy API endpoints to backend (development only)
      '/create-game': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    // Better handling for static assets
    fs: {
      strict: false,
    },
    // Suppress HMR connection errors
    hmr: {
      overlay: false, // Disable error overlay for connection errors
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

