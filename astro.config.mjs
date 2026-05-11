// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact()],
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
    resolve: {
      alias: {
        '@': './src',
        '@styles': './src/styles',
        '@lib': './src/lib',
        '@data': './src/data',
        '@components': './src/components',
        '@layouts': './src/layouts',
        '@pages': './src/pages',
        '@stores': './src/stores',
        '@utils': './src/utils',
        '@mocks': './src/mocks',
        '@hooks': './src/hooks',
        '@types': './src/types'
      }
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