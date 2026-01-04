import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5400,
    proxy: {
      '/api': {
        target: 'http://localhost:5401',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:5401',
        ws: true,
      },
      '/assets': {
        target: 'http://localhost:5401',
        changeOrigin: true,
      },
    },
  },
});
