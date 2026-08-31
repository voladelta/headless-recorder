import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    vue(),
    webExtension({
      manifest: 'src/manifest.json',
      additionalInputs: ['src/content-scripts/index.js'],
      disableAutoLaunch: true,
      scriptViteConfig: {
        build: {
          lib: {
            cssFileName: 'src/content-scripts/index',
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'chrome100',
  },
})
