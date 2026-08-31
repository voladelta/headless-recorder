import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/__tests__/build.spec.js',
      'src/content-scripts/__tests__/attributes.spec.js',
      'src/content-scripts/__tests__/forms.spec.js',
    ],
  },
})
