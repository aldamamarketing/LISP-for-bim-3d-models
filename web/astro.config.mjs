// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://lispcentral.web.app',
  integrations: [react(), sitemap(), tailwind()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'pt'],
    routing: {
      prefixDefaultLocale: false
    }
  },
  vite: {
    build: {
      target: 'chrome65'
    },
    resolve: {
      preserveSymlinks: true
    }
  }
});