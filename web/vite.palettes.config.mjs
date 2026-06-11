import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src/palettes-entry',
  base: '/palette-builds/',
  plugins: [
    react(),
    viteSingleFile()
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
        'palette': 'src/palettes-entry/palette.html'
      }
    }
  },
  esbuild: {
    charset: 'ascii'
  }
});
