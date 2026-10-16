import { HEALTH_URL } from './support/env.ts'

/** Stops the whole run before any test when the backend is not healthy. Message is in Turkish like the project docs. */
export default async function globalSetup(): Promise<void> {
  const hint = [
    `Backend sağlık kontrolü başarısız: ${HEALTH_URL}`,
    'Backend ve PostgreSQL ayakta olmadan e2e testleri çalıştırılamaz.',
    'Kök dizinde start-dev.bat çalıştırın veya kök README.md "Ayrı süreçler" bölümündeki adımları izleyin.',
    'UYARI: Testler sunucuda kalıcı E2E-... projeleri oluşturur (silme API\'si yok); yalnızca yerel/test veritabanı (önerilen: postgres-test profili) kullanın.',
  ].join('\n')
  let status: unknown
  try {
    const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    status = ((await response.json()) as { status?: unknown }).status
  } catch (error) {
    throw new Error(`${hint}\nNeden: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (status !== 'UP') throw new Error(`${hint}\nNeden: status=${String(status)} (beklenen: UP)`)
}
