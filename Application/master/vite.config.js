import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    cors: true,
    proxy: {
      '/master': 'http://localhost:5000',
      '/tenant': 'http://localhost:5000',
      '/auth': 'http://localhost:5000'
    }
  }
});
