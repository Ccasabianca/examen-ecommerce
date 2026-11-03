import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // REACT_APP_ gardé : render.yaml et le Dockerfile posent REACT_APP_API_URL à la build
  envPrefix: ['VITE_', 'REACT_APP_'],
  // même port et même proxy que create react app : /api reste sur la même origine en dev
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
  // build/ comme create react app : render publie ce dossier
  build: { outDir: 'build', sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
