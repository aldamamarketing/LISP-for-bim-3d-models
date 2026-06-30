import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __configDir = fileURLToPath(new URL('.', import.meta.url));

// Plugin: sincroniza el HTML de la paleta hacia dist/palette-builds después de cada build.
// Firebase Hosting sirve desde web/dist, y sin este plugin hay que hacer un rebuild
// completo de Astro para que el nuevo HTML llegue a producción.
function syncToDistPlugin() {
  return {
    name: 'sync-palette-to-dist',
    closeBundle() {
      const src  = path.join(__configDir, 'public/palette-builds/resource-palette.html');
      const dest = path.join(__configDir, 'dist/palette-builds/resource-palette.html');
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        console.log('\n[sync-palette-to-dist] Copiado → dist/palette-builds/resource-palette.html');
      } catch (e) {
        console.warn('\n[sync-palette-to-dist] Aviso: no se pudo copiar a dist:', e.message);
      }
    }
  };
}

export default defineConfig({
  root: 'src/palettes-entry',
  base: '/palette-builds/',
  plugins: [
    react(),
    viteSingleFile(),
    syncToDistPlugin(),
  ],
  resolve: {
    preserveSymlinks: true
  },
  build: {
    target: 'chrome65',
    outDir: '../../public/palette-builds',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'resource-palette': 'src/palettes-entry/resource-palette.html'
      }
    }
  },
  esbuild: {
    charset: 'ascii'
  }
});
