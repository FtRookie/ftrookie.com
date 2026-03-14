import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: "https://www.ftrookie.com",
  trailingSlash: "never",
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),
});