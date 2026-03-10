import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5400,
    strictPort: true,
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/testing/setup-tests.ts',
    coverage: {
      include: ['src/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/testing/**'],
    },
  },
});
