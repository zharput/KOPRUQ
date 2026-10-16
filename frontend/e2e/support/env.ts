/** Environment of the e2e run. CORS of the backend only allows the origin http://localhost:5173, so keep the default base URL. */
const trimSlash = (value: string) => value.replace(/\/+$/, '')

export const E2E_BASE_URL = trimSlash(process.env.E2E_BASE_URL?.trim() || 'http://localhost:5173')
export const E2E_API_BASE = trimSlash(process.env.E2E_API_BASE?.trim() || 'http://localhost:8080')
export const HEALTH_URL = `${E2E_API_BASE}/actuator/health`
