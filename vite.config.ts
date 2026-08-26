import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  // Rutas relativas: el sitio funciona igual servido desde la raíz o desde
  // un subdirectorio, que es como GitHub Pages publica los repos.
  base: './',
  // Sin proxy: no hay servidor detrás. El motor corre entero en la pestaña.
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
