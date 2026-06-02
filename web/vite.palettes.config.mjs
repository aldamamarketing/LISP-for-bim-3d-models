import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src/palettes-entry',
  base: '/palette-builds/',
  plugins: [
    react()
  ],
  build: {
    target: 'chrome65',
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
