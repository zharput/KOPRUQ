# Plan: `playwright-e2e` — Playwright e2e altyapısı (frontend)

## 1. Davranış ve kabul kriterleri

**Kapsam.** `frontend/` içine Playwright altyapısı kurulur: config, TS config, fixture ve yardımcılar, npm script'leri, `.gitignore` girdileri, backend sağlık ön kontrolü ve kanıt olarak yalnız `docs/e2e/01-ortam-ve-gezinme.md` için bir smoke spec. Dokümantasyon da güncellenir.

**Kapsam dışı.** 02–19 senaryolarının spec'leri (her biri ayrı feature). Backend'de değişiklik yok (yeni DELETE endpoint'i de yok). CI kurulmuyor. Firefox ve WebKit eklenmiyor. Backend ve DB'yi Playwright'ın başlatması kapsam dışı.

**Kabul kriterleri**
- **AC1:** `frontend/package.json` devDependencies içinde yalnız `@playwright/test` yeni bağımlılık olarak eklenir. `package-lock.json` güncellenir. Başka runtime/dev bağımlılığı eklenmez.
- **AC2:** `npm run test:e2e:install` yalnız Chromium'u kurar (`playwright install chromium`).
- **AC3:** `npm test` (vitest) `e2e/` altındaki dosyaları toplamaz. Test dosyası sayısı değişiklikten önceki sayıyla aynı kalır.
- **AC4:** `npm run build` (`tsc -b && vite build`) başarılı olur. `tsc -b`, `e2e/**` ve `playwright.config.ts` dosyalarını da tip kontrolünden geçirir.
- **AC5:** `npm run lint` (oxlint) yeni hata veya yeni uyarı üretmez.
- **AC6:** Backend `http://localhost:8080/actuator/health` adresinde `UP` dönmüyorsa `npm run test:e2e` hiçbir test çalıştırmadan durur. Hata mesajı Türkçedir; URL'yi, `start-dev.bat` ve README "Ayrı süreçler" yolunu, ayrıca "yalnız yerel/test DB" uyarısını içerir.
- **AC7:** Vite 5173'te zaten çalışıyorsa yeniden kullanılır. Çalışmıyorsa Playwright `npm run dev -- --port 5173 --strictPort` ile başlatır. Port kayarsa (strictPort) test başlamadan hata verir.
- **AC8:** Backend ve DB ayaktayken `npm run test:e2e` çalıştırılınca `e2e/01-ortam-ve-gezinme.spec.ts` geçer ve AC9 adımlarını doğrular.
- **AC9 (smoke içeriği):**
  - (a) Sağlık yanıtının `status` değeri `UP`.
  - (b) Karşılama ekranında **New Project** ile `E2E-01-...` adlı proje oluşturulur. `POST /api/projects` 201 döner, URL'de `?project=<id>` bulunur; `<id>` yanıt gövdesindeki `projectId` ile aynıdır.
  - (c) Üst gezinmede Project, Graph, Family, Loads linklerine sırayla tıklanır; her adımda yol `/project`, `/graph`, `/family-tables`, `/loads` olur, ilgili link `aria-current="page"` taşır, `?project=<id>` korunur.
  - (d) `/graph?project=<id>` ve `/family-tables?project=<id>` doğrudan açılıp `page.reload()` yapılır; aynı ekran ve proje kimliği geri gelir.
  - (e) `goBack()` ve `goForward()` beklenen URL'lere gider.
  - (f) Test boyunca yakalanmamış `pageerror` veya `console.error` olmaz; backend'e giden 4xx/5xx yanıt olmaz.
- **AC10:** Fixture katmanı: benzersiz test projesi adı ve UI ile proje oluşturma yardımcısı, console/pageerror toplayıcı, API yanıt toplayıcı (method, URL, status, `X-Correlation-ID`), `correlationIdOf(response)`.
- **AC11:** `frontend/test-results/`, `frontend/playwright-report/`, `frontend/blob-report/`, `frontend/playwright/.cache/` git'e girmez.
- **AC12:** Güncellenen belgeler: `docs/e2e/README.md` ("otomatik değildir" cümlesi düzeltilir + otomatik çalıştırma bölümü), kök `README.md`, `frontend/README.md`, `docs/architecture.md` ve `docs/roadmap.md` (yeni dated bölüm; ertelenmiş Playwright notu kapanır).

## 2. Doğrulanmış olgular ve kararlar

- `frontend/package.json`: `type: module`; script'ler `dev`, `build`, `lint`, `test` (vitest run), `test:watch`.
- `frontend/vite.config.ts`: vitest `include/exclude` yok; varsayılan kalıp `e2e/*.spec.ts` dosyalarını da toplar → dışlanmalı.
- `tsconfig.json` yalnız `tsconfig.app.json` (include `src`) ve `tsconfig.node.json` referanslar. `@types/node ^24` mevcut.
- `.oxlintrc.json`: `react/rules-of-hooks: error`; fixture ikinci parametresi `use` yerine `provide` adlandırılır.
- Mimari testler yalnız `src/**` tarar; `e2e/` etkilemez.
- Kök `.gitignore`'da `test-results/` var, `playwright-report` yok.
- API tabanı `http://localhost:8080` (`VITE_API_BASE` override). CORS yalnız `http://localhost:5173` → baseURL tam bu olmalı; `X-Correlation-ID` exposed.
- `ProjectController`: `GET/POST /api/projects`, `GET /api/projects/{id}`, `PUT /api/projects/{id}/workspace`. **DELETE yok** → test projeleri silinemez.
- UI seçicileri: `WelcomeScreen` (`aria-label="KOPRUQ Welcome"`) "New Project"; `NewProjectDialog` (`role=dialog`, başlık "Yeni proje", label "Proje adı", buton "Oluştur"); `nav[aria-label="Workspaces"]` linkleri `aria-label`, aktifte `aria-current="page"`; workspace id'leri `project`, `graph`, `family-tables`, `loads`.
- `.github/workflows` yok → CI değişikliği yok.

**Kararlar**
1. Konum: `frontend/e2e/` (spec) + `frontend/playwright.config.ts`; yardımcılar `frontend/e2e/support/`. Spec adı: `docs/e2e/NN-<ad>.md` → `e2e/NN-<ad>.spec.ts`.
2. `webServer` yalnız Vite'ı başlatır/yeniden kullanır. Backend + PostgreSQL ön koşuldur (`start-dev.bat` veya README "Ayrı süreçler"). Ön kontrol `globalSetup` ile.
3. Env: `E2E_BASE_URL` (varsayılan `http://localhost:5173`, değiştirilmesi önerilmez), `E2E_API_BASE` (varsayılan `http://localhost:8080`; tanımlıysa `webServer.env.VITE_API_BASE`; çalışan Vite yeniden kullanılıyorsa etkisiz — belgelenir).
4. `workers: 1`, `fullyParallel: false` (paylaşılan gerçek DB).
5. Test verisi UI üzerinden oluşturulur; API ile oluşturma bu feature'da yazılmaz.
6. Temizlik yok (DELETE yok). Ad formatı `E2E-<NN>-<yyyyMMdd-HHmmss>-<4 hex>`. Belgeler yalnız yerel/test DB (önerilen `postgres-test` profili, port 5433) şart koşar.
7. Yeni `frontend/tsconfig.e2e.json`, `tsconfig.json` referanslarına eklenir.
8. `vite.config.ts`: `test.exclude: [...configDefaults.exclude, 'e2e/**']`.

## 3. Uygulama adımları

1. `frontend/` içinde `npm.cmd install -D @playwright/test`; kurulan sürüm `implementation.md`'ye yazılır.
2. `package.json` script'leri: `test:e2e` (`playwright test`), `test:e2e:ui`, `test:e2e:headed`, `test:e2e:report` (`playwright show-report`), `test:e2e:install` (`playwright install chromium`). `test` değişmez.
3. `vite.config.ts`: `configDefaults` import + `test.exclude`. Önce/sonra `npm test` sayıları karşılaştırılır (AC3).
4. `tsconfig.e2e.json`: mevcut `tsconfig.app.json` deseni (strict, noUnused*, erasableSyntaxOnly, verbatimModuleSyntax, bundler resolution, noEmit), `types ["node"]`, `lib ["ES2023","DOM"]`, `tsBuildInfoFile ./node_modules/.tmp/tsconfig.e2e.tsbuildinfo`, `include ["e2e","playwright.config.ts"]`; `tsconfig.json` referansına eklenir.
5. `playwright.config.ts`: `testDir ./e2e`, `outputDir test-results`, `fullyParallel false`, `workers 1`, `retries 0`, `forbidOnly !!CI`, `timeout 60_000`, `expect.timeout 10_000`, reporter `list` + `html` (`open: never`, `playwright-report`), `globalSetup ./e2e/global-setup.ts`, `use { baseURL, trace/screenshot/video: on-failure }`, tek proje `chromium` (Desktop Chrome), `webServer { command 'npm run dev -- --port 5173 --strictPort', url, reuseExistingServer true, timeout 120_000, env }`. Yerel importlarda `.ts` uzantısı; çalışmazsa uzantısız importa geçilip raporlanır.
6. `e2e/support/env.ts`: `E2E_BASE_URL`, `E2E_API_BASE` (sondaki `/` kırpılır), `HEALTH_URL`.
7. `e2e/global-setup.ts`: `fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) })`; ağ hatası/HTTP hatası/`status !== 'UP'` → AC6 Türkçe mesajıyla `Error`.
8. `e2e/support/projects.ts`: `uniqueProjectName(scenario)`, `createProjectViaUi(page, name)` (goto `/`, "New Project", dialog'da "Proje adı" doldur, "Oluştur" ile eşzamanlı `POST /api/projects` bekle, 201 + `projectId` doğrula, URL `?project=<id>`).
9. `e2e/support/correlation.ts`: `correlationIdOf(response)` → `x-correlation-id`.
10. `e2e/support/fixtures.ts`: `base.extend` ile otomatik `consoleErrors` (console error + pageerror), `apiResponses` (`E2E_API_BASE` ile başlayan yanıtlar; `net::ERR_ABORTED` filtrelenir), beklenmeyen dialog kaydı + dismiss; ikinci parametre `provide`; `test`, `expect`, `expectNoRuntimeErrors` export. Toplayıcılar otomatik fail etmez (11, 18 gibi 400 bekleyen senaryolar için).
11. `e2e/01-ortam-ve-gezinme.spec.ts`: tek `test`, AC9 (a)–(f) `test.step` ile; `request.get(HEALTH_URL)`; gezinme `getByRole('navigation', { name: 'Workspaces' })`; docs/e2e/01 referansı.
12. `frontend/.gitignore`: `# Playwright` altında `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`.
13. Belgeler: `docs/e2e/README.md` (3. satır düzeltme + "Otomatik çalıştırma (Playwright)": ön koşullar, `postgres-test` önerisi, komutlar, env, `E2E-` öneki, silme yok, `NN-*.spec.ts` kuralı); kök `README.md`; `frontend/README.md`; `docs/architecture.md` sonuna `## Playwright e2e infrastructure (feature playwright-e2e, 2026-10-16)` + 1506. satıra kısa not; `docs/roadmap.md` sonuna bölüm + 1051. satıra kısa not.
14. Kontroller çalıştırılır; sonuçlar "çalıştı/geçti" veya "çalıştırılamadı + neden" olarak ayrılır.

## 4. Doğrulama

Komutlar (`frontend/`, Windows'ta `npm.cmd`): `install`, `test`, `run build`, `run lint`, `run test:e2e:install`, `run test:e2e` (backend+DB ayakta).

| AC | Kontrol | Beklenen |
| --- | --- | --- |
| AC1 | package.json/lock diff | yalnız `@playwright/test` (+ transitive) |
| AC2 | `test:e2e:install` | Chromium inir, çıkış 0 |
| AC3 | `npm test` önce/sonra | aynı dosya/test sayısı |
| AC4 | `npm run build` | çıkış 0; e2e'ye kasıtlı tip hatası `tsc -b` ile yakalanır, sonra geri alınır |
| AC5 | `npm run lint` | 0 hata; e2e sonrası tekrar (gerekirse `ignorePatterns`) |
| AC6 | Backend kapalıyken `test:e2e` | 0 test, Türkçe mesaj |
| AC7 | Vite kapalı/açık | her ikisinde smoke başlar |
| AC8/9 | Yığın ayaktayken `test:e2e` | `1 passed`; DB'de `E2E-01-...` projesi |
| AC10 | Kod incelemesi | yardımcılar export edilmiş |
| AC11 | Çalıştırma sonrası `git status` | rapor/sonuç klasörleri izlenmiyor |
| AC12 | Belge diff'i | — |

**Riskler:** Docker/`.env`/DB yoksa AC6–AC9 doğrulanamaz → "doğrulanamadı" raporlanır, "geçti" denmez. Smoke kalıcı proje yazar (yanlış DB riski; `E2E-` öneki + `postgres-test` önerisi). CORS yalnız `localhost:5173`. Dev modda `console.error` gürültüsü smoke'u kırabilir; allow-list eklenmez, kullanıcıya raporlanır. `page.reload()` beforeunload dialog'una takılabilir (dialog fixture'ı kaydeder). TS 6 + `.ts` import uzantıları Playwright yükleyicisinde ilk çalıştırmada doğrulanır. Chromium indirmesi ağ gerektirir (repo dışına iner).

**Varsayımlar:** `@playwright/test` güncel sürümü projedeki Node LTS ile uyumlu (Node sürümü repoda sabit değil). Proje adı uzunluğu (~27 karakter) sorun değil. Bu feature onayı CLAUDE.md'deki "ahead-of-milestone bağımlılık yok" kuralı için yalnız `@playwright/test` devDependency'sini kapsar. Mühendislik içeriği yok.

**Açık sorular (engelleyici değil):** (1) Smoke'un bıraktığı kalıcı `E2E-...` projeleri kabul — varsayılan evet (DELETE gerekirse ayrı backend feature'ı). (2) `postgres-test` zorunlu mu öneri mi — varsayılan: öneri (backend'in bağlı olduğu DB HTTP'den güvenilir görülemez).
