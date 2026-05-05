// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [],
  security: {
    checkOrigin: false,
  },
  server: {
    host: true,
    port: 4322
  },
  vite: {
    server: {
      strictPort: true
    },
    build: {
      rollupOptions: {
        external: ['sharp']
      }
    }
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  }
});
