# Plan: e2e-ci-pipeline

## 1. Davranış ve kabul ölçütleri

**Amaç.** GitHub'a yapılan her push'ta ve her pull request'te backend test paketi (`mvn -B -f backend/pom.xml package`) ile Playwright e2e paketi (`npm run test:e2e`) otomatik çalışsın. e2e paketi gerçek bir backend jar'ına ve geçici bir PostgreSQL'e karşı koşar. Frontend lint, vitest ve build de ayrı bir job olarak çalışır.

**Kapsam.** Yeni dosya `.github/workflows/ci.yml` ve doküman güncellemeleri.
**Kapsam dışı.** Deployment, release, Docker imajı yayınlama. `backend/src/**`, `frontend/src/**`, `frontend/e2e/**`, `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json`, `compose.yaml` değişmez. Yeni Maven/npm bağımlılığı yok. `.github/modernize/**` değişmez. Mühendislik içeriği yok.

**Kabul ölçütleri**
- AC1: Repodaki tek iş akışı dosyası `.github/workflows/ci.yml`. `.github/modernize/**` değişmez. Kapsam dışı listesindeki dosyalarda diff yok.
- AC2: Tetikleyiciler: `push` (tüm branch'ler), `pull_request` (tüm hedef branch'ler), `workflow_dispatch`. Path filtresi yok.
- AC3: Workflow düzeyinde `permissions: contents: read`. `concurrency`: `group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`. Her job'ın bir `timeout-minutes` değeri var.
- AC4: `backend` job'ı `ubuntu-latest`'te; `actions/setup-java` ile `distribution: microsoft`, `java-version: '21'` (pom: `<java.version>21</java.version>`), `cache: maven`. `mvn -B -f backend/pom.xml package` çalışır (testler H2'de). Başarıda `backend/target/kopruq-backend-*.jar` artifact olarak yüklenir. Hata durumunda `backend/target/surefire-reports/` yüklenir.
- AC5: `frontend` job'ı `actions/setup-node` ile Node 24, npm önbelleği `cache-dependency-path: frontend/package-lock.json`. `frontend/` içinde sırasıyla `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- AC6: `e2e` job'ı `needs: backend`, jar artifact'ını indirir. Sırasıyla: rastgele `DB_PASSWORD` üretip maskeler; `docker compose --profile postgres-test up -d --wait postgres-test`; jar'ı `DB_URL=jdbc:postgresql://localhost:5433/kopruq_test`, `DB_USERNAME=kopruq` ile arka planda başlatır; `http://localhost:8080/actuator/health` `"status":"UP"` yanıtını süre sınırıyla bekler (süre aşılırsa veya Java süreci ölürse job düşer); `npm ci`, `npm run test:e2e:install -- --with-deps`, `npm run test:e2e`.
- AC7: e2e başarısız olursa artifact olarak yüklenir: `frontend/playwright-report/`, `frontend/test-results/`, backend log dosyası, `docker compose logs postgres-test` çıktısı. Saklama süresi sınırlı.
- AC8: Repoya parola/sır yazılmaz. Workflow hiçbir GitHub secret'ına ihtiyaç duymaz (fork PR'larında da çalışır).
- AC9: Dokümanlar: kök `README.md` "Testler ve kalite kapıları" bölümüne CI paragrafı; aynı bölümdeki eski "her çalıştırma kalıcı `E2E-...` projeleri bırakır ve silme API'si yoktur" cümlesi e2e-test-data-cleanup sonrası duruma göre düzeltilir; `docs/e2e/README.md` otomatik çalıştırma bölümüne CI notu; `docs/architecture.md` ve `docs/roadmap.md`'ye yeni `e2e-ci-pipeline` bölümleri; roadmap'teki "a CI job" açık maddeleri (~1947, ~1953) bu bölüme referans verir.
- AC10: Workflow'daki komutlar yerelde aynı sırayla çalıştırıldığında geçer (bölüm 4).
- AC11: Kullanıcı push ettikten sonra GitHub Actions'ta bir push çalıştırması ve bir PR çalıştırması yeşil olur. Implementer yapamaz; kullanıcı doğrular.

## 2. Doğrulanmış mevcut durum

- `.github/`: yalnızca `.github/modernize/java-upgrade/{.gitignore,hooks/scripts/recordToolUse.ps1,recordToolUse.sh}`. `.github/workflows/` yok.
- `backend/pom.xml`: tek modül `kopruq-backend` `0.1.0-SNAPSHOT`, Java 21, Spring Boot 3.5.16, `spring-boot-maven-plugin repackage`. Maven wrapper yok.
- Backend testleri: `KOPRUQ_TEST_DB_URL` yoksa H2 (PostgreSQL modu); ayarlanmazsa testler atlanmaz, H2'de koşar. Testcontainers/Docker bağımlılığı yok. Tek koşullu test `BentleyProductionTerrainTest` (`@EnabledIfSystemProperty(named="kopruq.terrain.production")`, varsayılan atlanır).
- `application.properties`: `spring.datasource.password=${DB_PASSWORD}` varsayılansız (fail-fast); `DB_URL`, `DB_USERNAME` varsayılanlı; Flyway + `ddl-auto=validate`; `kopruq.cors.allowed-origins=http://localhost:5173`; actuator health açık.
- `compose.yaml`: `postgres-test` profili `postgres:17`, DB `kopruq_test`, kullanıcı `${DB_USERNAME:-kopruq}`, parola `${DB_PASSWORD:?...}` zorunlu, `tmpfs`, port `${DB_TEST_PORT:-5433}:5432`, healthcheck.
- `frontend/package.json`: `build` = `tsc -b && vite build`, `lint` = `oxlint`, `test` = `vitest run`, `test:e2e` = `playwright test`, `test:e2e:install` = `playwright install chromium`; `engines` yok; lockfile `package-lock.json` (v3). Playwright 1.64.1.
- Node sürümü hiçbir manifestte sabit değil (`.nvmrc`/`engines` yok). Lockfile kısıtları (undici `>=22.19.0`, vite `^20.19.0 || >=22.12.0`, `@types/node ^24.13.3`) kesişimi Node 22.19+ veya 24; karar Node 24 (çıkarım).
- `playwright.config.ts`: `workers: 1`, `retries: 0`, `forbidOnly: !!process.env.CI`, reporter `list` + `html`, `outputDir: 'test-results'`, trace/screenshot/video yalnız hatada, `webServer` `npm run dev -- --port 5173 --strictPort` (`reuseExistingServer: true`, 120 sn), `globalSetup` health `UP` ister.
- `frontend/e2e/support/env.ts`: varsayılanlar `http://localhost:5173` ve `http://localhost:8080`; CI'da korunur.
- `frontend/e2e/support/files.ts`: `../../../backend/src/test/resources/sample.landxml` yolu; tam checkout gerekir.
- Specler `projectCleanup` fixture'ı ile projelerini siler; CI veritabanı zaten geçici. `frontend/.gitignore` `test-results/` ve `playwright-report/`'u dışlar.

## 3. Tasarım kararları

- **Tek workflow, üç job:** `backend`, `frontend` (paralel), `e2e` (`needs: backend`, aynı commit'in jar'ını kullanır, yeniden derleme yok).
- **Runner `ubuntu-latest`:** Linux container ve Docker Compose v2 hazır; Windows runner'da Linux container çalışmaz.
- **PostgreSQL: `docker compose` (`postgres-test` profili), service container değil.** Repodaki tanım (imaj, tmpfs, healthcheck, 5433) yeniden kullanılır; parola step içinde üretilebilir (service container step'lerden önce başladığı için üretilen değeri alamaz). Sabit parolalı service container reddedildi ("repoya parola yazma" ilkesi).
- **Parola:** `pw=$(openssl rand -hex 24)`, `echo "::add-mask::$pw"`, `echo "DB_PASSWORD=$pw" >> "$GITHUB_ENV"`. GitHub secret gerekmez.
- **Backend başlatma:** `nohup java -jar <jar> > "$RUNNER_TEMP/backend.log" 2>&1 &`, PID kaydı. Bekleme döngüsü en fazla ~120 sn: `curl -fsS http://localhost:8080/actuator/health | grep -q '"status":"UP"'`, her turda `kill -0 $PID`. `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` step env'inden. CORS varsayılanı Playwright'ın Vite'ı ile uyumlu.
- **Önbellek:** Maven için `setup-java` `cache: maven`, npm için `setup-node` `cache: npm`. Playwright tarayıcıları önbelleğe alınmaz (`--with-deps` sistem paketleri de kurar).
- **Tarayıcı kurulumu:** `npm run test:e2e:install -- --with-deps` (script değişmez).
- **Action sürümleri:** yalnız resmi `actions/checkout`, `setup-java`, `setup-node`, `upload-artifact`, `download-artifact`; her biri güncel ana sürüm etiketine sabitlenir. Etiketler repodan doğrulanamaz; implementer resmi GitHub sayfalarından doğrulamalı. Ağ erişimi yoksa sürüm uydurmamalı, `blocked`/soru olarak raporlamalı. SHA ile sabitleme isteğe bağlı iyileştirme olarak notlanır.
- **Maven:** wrapper yok, runner'ın `mvn`'i kullanılır; `mvn -v` adımı eklenir. Wrapper eklemek kapsam dışı.
- **Zaman aşımları:** backend 20 dk, frontend 15 dk, e2e 30 dk (ilk gerçek koşudan sonra ayarlanabilir).
- **Artifact'lar:** jar her zaman (`retention-days: 1`, `if-no-files-found: error`); hata artifact'ları `if: failure()` ile (`retention-days: 7`): playwright-report, test-results, backend.log, compose logları, surefire-reports.
- **Frontend kalite job'ı** istekte yok ama README'deki kalite kapısı komutlarıyla aynı ve ucuz; dahil (açık soru 1, varsayılan evet).
- **Backend testleri PostgreSQL'de:** varsayılan hayır. e2e job'ı backend'i gerçek PostgreSQL'de Flyway + validate ile başlattığı için migration uyumu dolaylı doğrulanır.

Taslak iskelet (sürüm etiketleri implementer tarafından doğrulanacak):
```yaml
name: CI
on: { push: { branches: ['**'] }, pull_request: {}, workflow_dispatch: {} }
permissions: { contents: read }
concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }
jobs:
  backend:   # checkout, setup-java(microsoft,21,maven), mvn -v, mvn -B -f backend/pom.xml package, upload jar, failure: surefire-reports
  frontend:  # checkout, setup-node(24,npm,frontend/package-lock.json), working-directory frontend: npm ci, npm run lint, npm test, npm run build
  e2e:       # needs backend; checkout, setup-java(microsoft,21), setup-node, download jar, generate+mask DB_PASSWORD,
             # docker compose --profile postgres-test up -d --wait postgres-test, start jar + wait UP,
             # npm ci, npm run test:e2e:install -- --with-deps, npm run test:e2e, failure: artifacts
```

## 4. Uygulama adımları

1. Kapsam dışı dosyaların temiz olduğunu doğrula (`git status`).
2. `.github/workflows/ci.yml`: tetikleyiciler, permissions, concurrency (AC2, AC3).
3. `backend` job'ı (AC4); jar artifact adı sabit, örn. `backend-jar`.
4. `frontend` job'ı (AC5); `defaults.run.working-directory: frontend`.
5. `e2e` job'ı (AC6, AC7, AC8): checkout, Java ve Node kurulumu; jar'ı `$RUNNER_TEMP/backend-jar`'a indir; parolayı üret/maskele; compose ile `postgres-test`; backend'i başlat, sağlık kontrolünü bekle; `npm ci`, tarayıcı kurulumu, `npm run test:e2e`; `if: failure()` ile `docker compose --profile postgres-test logs postgres-test > $RUNNER_TEMP/postgres.log` ve artifact yüklemeleri.
6. Action sürüm etiketlerini resmi kaynaktan doğrula; seçilen sürümleri implementer raporuna yaz.
7. Dokümanlar (AC9): kök `README.md` (CI paragrafı, eski cümlenin düzeltilmesi), `docs/e2e/README.md` (CI notu: `postgres-test` ve üretilen parola, hata artifact'ları), `backend/README.md` "Testing" bölümüne isteğe bağlı kısa not, `docs/architecture.md` ("CI pipeline (feature e2e-ci-pipeline, 2026-10-20)"), `docs/roadmap.md` (`## e2e-ci-pipeline (2026-10-20)` ve önceki "a CI job" maddelerine referans).
8. Bölüm 5'teki yerel doğrulamaları çalıştır ve raporla.

## 5. Doğrulama

**Yerelde (implementer)**
- AC1: `git status --porcelain` ve `git diff --stat`: yalnız `.github/workflows/ci.yml` ve doküman dosyaları değişmiş.
- AC2, AC3, AC8: `ci.yml`'de tetikleyici, `permissions`, `concurrency`, `timeout-minutes` kontrolü; `password` / `DB_PASSWORD=` için sabit değer araması (beklenen: yok).
- YAML sözdizimi: ortamda varsa YAML ayrıştırıcı veya `actionlint`; yoksa "çalıştırılmadı" olarak raporla. Hiçbir araç kurma. `act` varsayılmaz.
- AC4: `mvn -B -f backend/pom.xml package` -> BUILD SUCCESS, jar oluşmuş.
- AC5: `frontend/` içinde `npm.cmd ci`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build` -> hepsi 0. (Not: `npm ci` mevcut `node_modules`'ı siler.)
- AC6, AC10: PowerShell'de CI'ı taklit et: rastgele geçici `$env:DB_PASSWORD`; `docker compose --profile postgres-test up -d --wait postgres-test`; `DB_URL=jdbc:postgresql://localhost:5433/kopruq_test`, `DB_USERNAME=kopruq` ile jar'ı başlat; health `UP`; `frontend/` içinde `npm.cmd run test:e2e` -> 19 spec geçer; sonra `docker compose --profile postgres-test stop postgres-test` ve `rm -f postgres-test` (`down -v` kullanma: ana veritabanı volume'unu siler). 5432'deki geliştirme veritabanına dokunulmaz.
- AC7: bilinçli hata simülasyonu zorunlu değil; `if: failure()` koşulları ve yollar kodda kontrol edilir.
- AC9: doküman diff'i okunur.

**GitHub'da (kullanıcı, push sonrası)**
- AC11: branch'i push et, Actions'ta üç job'ın yeşil olduğunu gör; PR aç, `pull_request` çalıştırmasının da yeşil olduğunu gör. Push/PR'ı implementer yapmaz (CLAUDE.md).

**Komutlar:** `mvn -B -f backend/pom.xml package`, `mvn -B -f backend/pom.xml test`, `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e:install`, `npm run test:e2e`, `docker compose --profile postgres-test up -d --wait postgres-test`.

## 6. Riskler

- **Windows/Linux farkı:** Linux'ta dosya adları büyük/küçük harfe duyarlı (import uyuşmazlığı `tsc -b`/vite'ı kırabilir); locale/saat dilimi farkı `toLocale*`/`Intl` kullanan ekranlarda (`frontend/src` içinde 9 dosya) e2e veya vitest beklentilerini bozabilir. Çıkarsa bu feature'da kaynak koda dokunulmaz; raporlanır, ayrı iş olur.
- **Lint/vitest'in mevcut durumu bilinmiyor:** başarısızsa frontend job'ı kırmızı olur; kaynak düzeltmesi kapsam dışı.
- **`xlsx` bağımlılığı `https://cdn.sheetjs.com/...` adresinden iner:** CDN erişilemezse `npm ci` düşer.
- **Kararsız specler:** 05 ve 18 için kararlılık denemesi önerilir; `retries: 0` olduğu için CI'da ara sıra rastgele kırmızı olabilir. Retry eklemek config değişikliği (kapsam dışı).
- **Çift çalıştırma:** aynı repodaki branch'ten açılan PR'da push ve pull_request ayrı koşar (dakika maliyeti); kabul edildi.
- **Runner imajındaki Maven/Compose sürümleri** zamanla değişebilir; `mvn -v` adımı görünür kılar.
- **Action sürüm etiketleri doğrulanamayabilir** (ağ yoksa); uydurulmaz.

## 7. Varsayımlar ve açık sorular

Varsayımlar: `distribution: microsoft` (yerel JDK Microsoft build); Node 24 lockfile kısıtlarından çıkarıldı; `ubuntu-latest`'te Maven 3.9.x ve Docker Compose v2 hazır; branch koruma/zorunlu check ayarları GitHub ayarıdır, kapsam dışı.

Açık sorular (kullanıcı aksini söylemezse varsayılan uygulanır):
1. Frontend lint, vitest, build da CI'da koşsun mu? Varsayılan: evet, ayrı `frontend` job'ı.
2. Tetikleyiciler tüm branch'ler mi, yalnız `main` mi? Varsayılan: tüm branch'ler + `workflow_dispatch`.
3. Backend testleri ayrıca gerçek PostgreSQL'de koşsun mu? Varsayılan: hayır (H2; PostgreSQL uyumu e2e job'ında dolaylı).
