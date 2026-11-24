import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
      'axios': path.resolve(__dirname, 'node_modules/axios')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'axios']
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/tenant': 'http://localhost:5000',
      '/master': 'http://localhost:5000',
      '/students': 'http://localhost:5000',
      '/departments': 'http://localhost:5000'
    }
  }
});
