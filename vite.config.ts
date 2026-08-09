import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  // Rutas relativas: el sitio funciona igual servido desde la raíz o desde
  // un subdirectorio, que es como GitHub Pages publica los repos.
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.CASTRONEGRO_PORT ?? 8787}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
