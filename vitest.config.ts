import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '#src': path.resolve('src'),
      '#common': path.resolve('src/common'),
      '#commands': path.resolve('src/commands'),
      '#utils': path.resolve('src/utils'),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
  },
})
