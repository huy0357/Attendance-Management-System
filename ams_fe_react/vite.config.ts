import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://14.225.212.113',
        changeOrigin: true,
      },
      '/avatars': {
        target: 'http://14.225.212.113',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://14.225.212.113',
        ws: true,
      },
    },
  },
});