# Implementation: e2e-ci-pipeline

Durum: **implemented** - workflow ve dokümanlar tamam; AC6 ve AC10'un e2e kısmı, Docker açıldıktan sonra koordinatör tarafından yerel CI simülasyonuyla doğrulandı (aşağıdaki bölüm). AC11 tasarım gereği kullanıcının GitHub doğrulamasıdır ve açık kalır. Rapor feature-implementer çıktısıdır; koordinatör `ci.yml`'i okuyup plana uygunluğunu kontrol etti ve Docker daemon'ın hâlâ kapalı olduğunu kendisi doğruladı.

## Değişen dosyalar
- YENİ `.github/workflows/ci.yml`: jobs `backend`, `frontend`, `e2e` (`needs: backend`).
  - Tetikleyiciler: `push` (`branches: ['**']`), `pull_request`, `workflow_dispatch`; path filtresi yok.
  - `permissions: contents: read`; `concurrency` grubu `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`; zaman aşımları 20 / 15 / 30 dk.
  - `backend`: setup-java (microsoft, 21, maven cache), `mvn -v`, `mvn -B -f backend/pom.xml package`, jar artifact `backend-jar` (`if-no-files-found: error`, 1 gün), hatada surefire-reports (7 gün).
  - `frontend`: Node 24, npm cache (`frontend/package-lock.json`), `npm ci`, `lint`, `test`, `build`, `working-directory: frontend`.
  - `e2e`: jar indirilir; `openssl rand -hex 24` ile parola üretilir, `::add-mask::` ile maskelenir, `GITHUB_ENV`'e yazılır; `docker compose --profile postgres-test up -d --wait postgres-test`; jar `nohup` ile `jdbc:postgresql://localhost:5433/kopruq_test` (kullanıcı `kopruq`) üzerinde başlatılır, `/actuator/health` `"status":"UP"` için 2 sn aralıkla en fazla 60 tur beklenir, her turda `kill -0` ile süreç kontrol edilir, ölürse/zaman aşımında log kuyruğuyla düşer; `npm ci`, `npm run test:e2e:install -- --with-deps`, `npm run test:e2e`; hatada (`if: failure()`, 7 gün, `if-no-files-found: ignore`) `playwright-report`, `playwright-test-results`, `e2e-logs` (backend.log, postgres.log) yüklenir.
- DEĞİŞTİ `README.md` (CI paragrafı; eski "silme API'si yok / kalıcı E2E projeleri" cümlesi düzeltildi), `docs/e2e/README.md` (CI notu), `docs/architecture.md` (yeni bölüm), `docs/roadmap.md` (yeni `## e2e-ci-pipeline (2026-10-20)` bölümü, iki eski "a CI job" maddesi buna yönlendirildi, AC11 açık madde), `backend/README.md` (tek satır CI notu).
- `backend/src`, `frontend/**`, `compose.yaml`, pom ve `.github/modernize` için diff yok.

## Action sürümleri
`curl` ile `api.github.com/repos/actions/<ad>/releases` ve `git ls-remote --tags` üzerinden 2026-10-20'de doğrulandı; ilk sürümü iki haftadan eski major etiketler seçildi: `actions/checkout@v7` (v7.0.1, 2026-07-20; v7.0.0 tarihi görülmedi, etiket en az ~3 aylık), `actions/setup-java@v6` (v6.0.0, 2026-08-24), `actions/setup-node@v7` (v7.0.0, 2026-07-14), `actions/upload-artifact@v7` (v7.0.0, 2026-02-26), `actions/download-artifact@v8` (v8.0.0, 2026-02-26).

## Kabul ölçütleri
| AC | Sonuç | Kanıt |
|---|---|---|
| AC1 | Karşılandı | `git status`/`git diff --stat`: yalnız `ci.yml` ve dokümanlar; kapsam dışı yollarda diff yok |
| AC2 | Karşılandı | Dosya okundu, PyYAML ayrıştırması: push `['**']`, pull_request, workflow_dispatch |
| AC3 | Karşılandı | permissions, concurrency ve üç `timeout-minutes` dosyada |
| AC4 | Karşılandı | Dosyada; yerelde `mvn -f backend/pom.xml -B package`: BUILD SUCCESS, 725 test, 0 hata, 1 atlanan; jar oluştu |
| AC5 | Karşılandı | Yerelde `npm.cmd ci`, `run lint`, `test` (124 dosya, 1183 test), `run build` hepsi exit 0 (yalnız uyarılar) |
| AC6 | Yerelde karşılandı | Job plana göre yazıldı; yerel simülasyon geçti (bkz. "Yerel CI simülasyonu"). Linux runner'daki gerçek koşu AC11'de |
| AC7 | Karşılandı | Tüm yüklemeler `if: failure()`, 7 gün, plandaki yollar (dosya okunarak) |
| AC8 | Karşılandı | `ci.yml`'de sabit parola yok, `secrets.*` yok; parola `openssl` ile üretilir |
| AC9 | Karşılandı | Doküman diff'i okundu, listedeki tüm dosyalar güncel |
| AC10 | Karşılandı | mvn, frontend ve e2e komutları workflow sırasında yerelde geçti |
| AC11 | Doğrulanmadı (tasarım gereği) | Kullanıcının push + PR sonrası Actions kontrolü |

## Çalıştırılan komutlar
- Geçti: `feature_state.py check` (iki kez), YAML ayrıştırma (`actionlint` kurulu değil, çalıştırılmadı), `mvn -f backend/pom.xml -B package`, frontend `npm ci` / lint / test / build.
- **Koşulmadı:** `docker compose --profile postgres-test up ...`, 5433'e karşı backend başlatma, health bekleme, `npm run test:e2e` (19 spec), teardown. Docker CLI kurulu ama daemon kapalı (`npipe:////./pipe/dockerDesktopLinuxEngine` yok). Docker Desktop `Start-Process` ile ~3 dk denendi, daemon gelmedi. Koordinatör da bitişte `docker version` ile daemon'ın kapalı olduğunu doğruladı. Hiçbir konteyner/servis başlatılmadı; 5432'deki geliştirme veritabanına dokunulmadı.
- `npm run test:e2e:install -- --with-deps` yerelde koşulmadı (`--with-deps` Linux'a özgü).

## Plandan sapmalar
Yok. Tek ekleme: hata artifact'larında `if-no-files-found: ignore`.

## Kalan iş ve sınırlamalar
- Docker Desktop'ı başlatıp planın bölüm 5'teki yerel e2e simülasyonunu koşmak (veya ilk GitHub çalıştırmasına dayanmak, AC11). Compose `--wait`, backend başlatma ve Linux'ta Playwright koşusu uçtan uca denenmedi. Aynı komut dizisinin yerel eşleniği (postgres-test + jar + `npm run test:e2e`) 2026-10-16'da e2e-test-data-cleanup kapsamında geçmişti; bu CI'nin kendisinin doğrulandığı anlamına gelmez.
- Plan riskleri geçerli: Linux büyük/küçük harf duyarlılığı ve locale etkileri, `xlsx` CDN bağımlılığı, `retries: 0` ile 05 ve 18 numaralı specların kararsızlığı.
- `frontend/node_modules` `npm ci` ile yeniden oluşturuldu, `backend/target` yeniden derlendi.

## Yerel CI simülasyonu (koordinatör, 2026-10-20)

Kullanıcı Docker Desktop'ı açtıktan sonra, workflow'un e2e job'ını Windows üzerinde taklit edecek şekilde koşuldu. Başlangıçta 8080, 5173, 5432 ve 5433'te dinleyen süreç yoktu; geliştirme veritabanına (5432) dokunulmadı.
- Rastgele 48 karakterlik hex `DB_PASSWORD` (workflow'daki `openssl rand -hex 24` karşılığı), `DB_URL=jdbc:postgresql://localhost:5433/kopruq_test`, `DB_USERNAME=kopruq`.
- `docker compose --profile postgres-test up -d --wait postgres-test`: konteyner `Healthy`.
- `backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar` (`.original` hariç) arka planda başlatıldı; workflow'daki gibi `/actuator/health` yoklandı: `UP`. `GET /api/projects` boş liste.
- `CI=true` ile `npm run test:e2e` (frontend/): **19 passed (3.1m)**. `forbidOnly` etkin koşulda da geçti.
- Koşu sonrası `GET /api/projects`: boş liste.
- Backend süreci durduruldu; `docker compose --profile postgres-test stop` ve `rm -f` çalıştırıldı (`down -v` kullanılmadı). Kalan konteynerler (`incidentinvestigator-*`) bu işten önce de vardı ve bu feature ile ilgisizdir.

Simülasyonun kapsamadığı: Linux runner, `docker compose` GitHub imajındaki sürümü, `npm run test:e2e:install -- --with-deps` (Linux'a özgü), `actions/*` adımları, artifact yüklemeleri. Bunların gerçek doğrulaması AC11 (ilk GitHub çalıştırması).
