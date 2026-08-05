import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Дев-сервер фронта проксирует API и WebSocket на бэкенд (server/index.js, порт 8080)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
