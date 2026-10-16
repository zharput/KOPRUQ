# Uygulama raporu: playwright-e2e-all

Durum: **implemented** (reviewer çalıştırılmadı; bu rapor "reviewed" anlamına gelmez).
Plan hash: 27a40bb4dd4ca76377d5f302840d3c6359f56f0c5f6d69f92d594533a61ab46d, baseline HEAD 403f756.

## Değişen / yeni dosyalar
Değişen: `frontend/package.json`, `frontend/package-lock.json` (yalnız `@playwright/test ^1.64.1`; kurulu 1.64.1) + 5 script, `frontend/vite.config.ts` (vitest exclude `e2e/**`), `frontend/tsconfig.json` (referans), `frontend/.gitignore`, `frontend/README.md`, `README.md`, `docs/e2e/README.md`, `docs/architecture.md`, `docs/roadmap.md`.
Yeni: `frontend/playwright.config.ts`, `frontend/tsconfig.e2e.json`, `frontend/e2e/global-setup.ts`, `frontend/e2e/support/{env,fixtures,writes,projects,navigation,bridges,graph,files,api,evidence,scenarioData}.ts`, `frontend/e2e/01…19-*.spec.ts` (19 dosya).
`frontend/src/**` ve `backend/**` değişmedi (AC15).

## Kabul kriterleri
AC1–AC17 ve AC-S01…S19 implementer tarafından karşılandı olarak raporlandı. Kısmi: **AC7** (çalışan Vite yeniden kullanımı doğrulandı; Vite kapalıyken Playwright'ın `--strictPort` ile başlatma yolu çalıştırılmadı). AC2 yalnız Chromium kurulumu doğrulandı.

## Kontroller
Koordinatörün bağımsız doğruladıkları (bu oturumda):
- `frontend/e2e/*.spec.ts` = 19; `waitForTimeout` = 0; `expectClean` eksik spec = 0.
- `npm.cmd run build` çıkış 0. `npm.cmd test`: 124 dosya / 1183 test (değişiklik öncesi 124 / 1183). `npm.cmd run lint`: 0 hata, yalnız uyarılar. `npx playwright test --list`: 19 test / 19 dosya.
- `git status`: `frontend/src`, `backend` altında değişiklik yok; package.json farkı yalnız Playwright script'leri ve devDependency.

Implementer'ın bildirdiği, koordinatörün yeniden ÇALIŞTIRMADIĞI:
- Canlı yığın (backend UP, Vite 5173) ile tam paket `19 passed (3.1m)`; 05 ve 18 `--repeat-each=2` geçti; 07/08/09/10/14/15 annotation eklenmesinden sonra yeniden çalıştırıldı, geçti; tam paket son değişiklikten sonra tekrar koşulmadı.
- AC6: ölü `E2E_API_BASE` ile 0 test + Türkçe hata mesajı.
- AC4: e2e dosyasına kasıtlı tip hatası `tsc -b` ile yakalandı (sonra silindi).

## Gözlenen dallar
07 VALID; 08 `REVIEW_REQUIRED` (1 uyarı); 09 42 aday, uygunsuz satır var; 10 COMPLETED; 14 VALID; 15 VALID. WebGL/console hatası çıkmadı; 08'e özel izin yok.

## Bulgular
B1–B8 canlı doğrulandı. Yeni: N1 (11: 400 gövdesinde `violations` anahtarı yok), N2 (04: yeni projede köprüsüz "Untitled Graph" da yazılıyor; spec köprüye bağlı graph'ları sayar), N3 (08: multipart postData boş; yanıttaki `source.*` doğrulanır), N4 (09: `/api/alternatives` yanıtı doğrudan dizi), N5 (Bridge Information `Edit` düğme seçicisi), N6 (05: Family'ye dönüşte Steel Girder yeniden seçilmeli), N7 (05: Fit View sonrası sürükleme gerekmedi; planın "sola sürükle" adımı uygulanmadı).

## Kalan iş / sınırlamalar
- Manuel kalan: 05 adım 9, 08 adım 6 (backend yeniden başlatma), 11 adım 3 (log araması), 07'de gerçek ağ kesintisi.
- Her tam çalıştırma kalıcı `E2E-…` projeleri bırakır (DELETE API yok); DB'ye silme yapılmadı.
- React Flow bağlantı sürükleme en kırılgan nokta (2 deneme + kararlı konum bekleme var).
- 19: LM1 EN Base değerleri hem yanıttan türetilir hem belgedeki `30.59` / `0.9177` ile karşılaştırılır; backend varsayılanları değişirse bilerek kırılır.
- CI yok; isteğe bağlı `data-testid` eklemeleri kapsam dışı.
