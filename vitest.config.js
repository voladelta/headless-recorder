import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/__tests__/build.spec.js',
      'src/content-scripts/__tests__/attributes.spec.js',
      'src/content-scripts/__tests__/forms.spec.js',
    ],
    globals: true,
    setupFiles: ['./vitest.setup.js'],
  },
})
