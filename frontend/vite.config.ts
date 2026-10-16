import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright e2e specs run with `npm run test:e2e`, not with vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
