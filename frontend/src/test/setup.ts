import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Without `test.globals: true` in vite.config.ts, @testing-library/react's
// automatic afterEach(cleanup) never registers, so every test's rendered
// tree stays mounted into the next test's jsdom document (this is what
// made the App routing test see 2 copies of the sidebar). Registering it
// explicitly here works regardless of the globals setting.
afterEach(() => {
  cleanup()
})
