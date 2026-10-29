// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/consts.ts';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  build: {
    format: 'file',
    // CSS sempre em ficheiro: permite uma CSP sem 'unsafe-inline'.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // Scripts e recursos nunca embutidos no HTML (CSP estrita).
      assetsInlineLimit: 0,
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  image: {
    responsiveStyles: false,
  },
});
