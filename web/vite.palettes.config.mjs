import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 65'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true
    })
  ],
  build: {
    outDir: 'public',
    emptyOutDir: false, // Don't delete the rest of the public folder
    rollupOptions: {
      input: {
        'palette/index': 'src/palettes-entry/palette.html',
        'resource-palette/index': 'src/palettes-entry/resource-palette.html'
      }
    }
  }
});
