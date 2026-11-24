import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    cors: true,
    proxy: {
      '/students': 'http://localhost:5000',
      '/master': 'http://localhost:5000',
      '/tenant': 'http://localhost:5000',
      '/auth': 'http://localhost:5000'
    }
  }
});
