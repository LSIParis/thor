import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    env: {
      ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
