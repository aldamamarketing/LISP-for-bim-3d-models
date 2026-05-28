// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://lispcentral.web.app',
  integrations: [react(), sitemap()],
  vite: {
    resolve: {
      preserveSymlinks: true
    }
  }
});