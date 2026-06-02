import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  root: 'src/palettes-entry',
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 65'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true
    })
  ],
  build: {
    outDir: '../../public/palette-builds',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'palette': path.resolve(__dirname, 'src/palettes-entry/palette.html'),
        'resource-palette': path.resolve(__dirname, 'src/palettes-entry/resource-palette.html')
      }
    }
  }
});
