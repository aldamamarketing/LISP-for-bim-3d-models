import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src/palettes-entry',
  base: '/palette-builds/',
  plugins: [
    react()
  ],
  resolve: {
    preserveSymlinks: true
  },
  build: {
    target: 'chrome65',
    outDir: '../../public/palette-builds',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'palette': 'src/palettes-entry/palette.html',
        'resource-palette': 'src/palettes-entry/resource-palette.html',
        'properties-palette': 'src/palettes-entry/properties-palette.html'
      }
    }
  }
});
