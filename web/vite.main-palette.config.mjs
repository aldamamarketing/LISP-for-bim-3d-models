import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
    emptyOutDir: false, // Don't empty because other palettes are here
    rollupOptions: {
      input: {
        'main-palette': 'src/palettes-entry/main-palette.html'
      }
    }
  },
  esbuild: {
    charset: 'ascii'
  }
});
