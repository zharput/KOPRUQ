# Implementation: e2e-testid-stabilization

Durum: **implemented**. Rapor feature-implementer çıktısıdır. Koordinatör bağımsız olarak şunu doğruladı: `git status` kapsamı, `frontend/src` diff'inin tüm değişen satırları (yalnız `data-testid` attribute'ları, `RangeField.testId` / `FormulaRow.testKey` prop'ları, `domAttributes` alanı ve `Lm1Panel` içindeki tek yerel `rowKey` değişkeni) ve plan hash eşleşmesi. vitest/lint/build/e2e sayıları implementer'ın raporudur; koordinatör yeniden koşmadı.

## Değişen dosyalar

**src (yalnız `data-testid` ve prop'lar)**
- `frontend/src/features/materials/components/MaterialsPanel.tsx`: `materials-row-<id>` (tr), `materials-concrete-class-<id>` (select).
- `frontend/src/features/layout-generator/components/SiteLayoutPanel.tsx`: isteğe bağlı `RangeField.testId` (kök, `-min`, `-max`); "Span length (m)" -> `layout-span-length`.
- `frontend/src/features/bridge-alternatives/components/GenerateWorkflow.tsx`: aynı `RangeField.testId`; "Span (m)" -> `generate-span`.
- `frontend/src/features/loads/components/SelfWeightPermanent.tsx`: zorunlu `FormulaRow.testKey` (7 çağrı: asphalt, sidewalk, facia, guardrail, pedestrianRailing, protectiveFence, soundPanel) + satır içi `concrete` ve `total`; 9 satır ve 8 sonuç id'si.
- `frontend/src/features/loads/components/wind/WindLoadsPanel.tsx`: `wind-transverse-without-traffic`.
- `frontend/src/features/loads/components/temperature/UniformTemperaturePanel.tsx`: `temperature-{concrete,steel}-{contraction,expansion}`.
- `frontend/src/features/loads/components/traffic/Lm1Panel.tsx`: `lm1-{row,base,effective,unit}-<section>-<i>`.
- `frontend/src/features/graph/adapters/reactFlowAdapter.ts`: `domAttributes: { 'data-testid': \`graph-node-${node.id}\` } as NonNullable<FlowGraphNode['domAttributes']>`.
- `frontend/src/features/loads/components/seismic/SeismicPanel.tsx`: `data-testid="seismic-spectrum-chart"` (`ResponsiveContainer`).

**e2e**
- Spec'ler: `06-trafik-yukleri`, `07-ruzgar-guncellik`, `09-yerlesim-alternatif`, `11-api-hata-sozlesmesi`, `12-malzeme-katalogu`, `14-sicaklik-durumu`, `15-deprem-durumu`, `19-yuk-birimleri`.
- `frontend/e2e/support/navigation.ts`: `selfWeightRow(page, key)` (`SelfWeightKey` birliği), yeni `selfWeightResult`, `temperatureResultCells`.
- `frontend/e2e/support/graph.ts`: `canvasNodes`, `addLibraryNode`, `nodeById` `graph-node-*` kullanır.

**Docs:** `docs/roadmap.md` (takip maddesi işaretlendi, yeni bölüm), `docs/e2e/README.md` (seçici kuralı cümlesi), `docs/architecture.md` (Playwright e2e bölümü sonuna not).

CSS, `package.json`, backend, `.github`, `playwright.config.ts` değişmedi (`git status` yalnız yukarıdaki dosyaları gösterir).

## Kabul kriterleri
| AC | Sonuç | Kanıt |
|---|---|---|
| AC1 Materials | Karşılandı | 8 satır + 8 select etiketli; spec 12'de `table.spn-table` yok, diğer 7 satır id anahtarlı karşılaştırılıyor; spec 12 e2e'de geçti |
| AC2 Aralıklar | Karşılandı | `layout-span-length[-min\|-max]`, `generate-span[-min\|-max]`; spec 09 ve 11'de `.spn-range-` yok; ikisi de geçti |
| AC3 Self Weight | Karşılandı | 9 satır, 8 sonuç; `e2e/` içinde `spn-formula` yok; spec 19 geçti |
| AC4 Wind | Karşılandı | id var, spec 07 `'Without Traffic'` seçicisi yok; geçti |
| AC5 Temperature | Karşılandı | 4 hücre; `e2e/` içinde `nth-child` yok; spec 14 ve 19 geçti |
| AC6 LM1 | Karşılandı | Dört id ailesi; spec 06/19'da LM1 için `locator('table').nth(` ve `td').nth(` yok (kalan `td').nth(` kullanımları plan bölüm 6 kapsamında: 06:27, 19:109/112) |
| AC7 Graph | Karşılandı | Assertion `tsc -b` altında derlendi; `e2e/` içinde `react-flow__node` yok; spec 04 ve 05 geçti. Grup düğümlerinin id almadığı tarayıcıda ayrıca denenmedi (planın "grup düğümleri adapter'dan geçmez" bulgusuna dayanır) |
| AC8 Seismic | Karşılandı | id `ResponsiveContainer` üzerinde; spec 15 kutunun görünürlüğünü doğrular ve eğriyi kutu içinde arar; geçti |
| AC9 Davranış değişmez | Karşılandı | Koordinatör `frontend/src` diff'ini satır satır inceledi: yalnız attribute/prop/`domAttributes`, bir yerel `rowKey` const; metin, sınıf, stil, DOM hiyerarşisi değişmedi |
| AC10 Kontroller | Karşılandı (raporlanan) | Aşağıdaki tablo |
| AC11 Docs | Karşılandı | roadmap, e2e README, architecture güncel |

## Baseline - final (implementer raporu)
| Kontrol | Baseline | Final |
|---|---|---|
| `npm test` | 1183/1183, 124 dosya | 1183/1183, 124 dosya |
| `npm run lint` | yalnız uyarı, 0 hata | yalnız uyarı, 0 hata (aynı mevcut uyarılar) |
| `npm run build` (tsc -b + vite) | başarılı, chunk-size uyarısı | başarılı, aynı |
| `tsc -p tsconfig.e2e.json --noEmit` | koşulmadı | temiz |
| `npx playwright test --list` | koşulmadı | 19 test, 19 dosya |
| e2e (`CI=true npm run test:e2e`) | 19 passed (3.1m) | 19 passed (3.1m) |

Spec 05 ve 18 her iki koşuda da ilk denemede geçti; `--repeat-each` koşulmadı. Kategori başına e2e koşulmadı, tam paket sonda bir kez koşuldu. Per-kategori vitest: `src/features/loads` 91, `src/features/graph` 487 geçti. Lint uyarı sayısı kaydedilmedi.

## Grep kontrolleri
1. `frontend/e2e` içinde `spn-formula|nth-child|react-flow__node|spn-range-|locator('table').nth`: 0 eşleşme.
2. Spec 12'de `table.spn-table`: 0 eşleşme.
3. Production `src` (test dışı): yalnız attribute tanım satırları ve prop geçirmeleri; `querySelector`/CSS/mantık okuması yok. (`graph-node-` ilk koşuda mevcut `.spn-graph-node-*` CSS sınıflarına yanlış pozitif verdi; çapalı yeniden koşu temiz.)
4. `src` CSS'te `data-testid`: yalnız mevcut `section-properties` (25) ve `girder-preview-viewport` (4); CSS dosyası değişmedi. `family-parameters-panel` regex'in `]` ile durması nedeniyle ayrıca doğrulanmadı.

## Sapmalar ve notlar
- Spec 12 `readRows` artık `id` de döndürür; küçük genel `byId` ve `exceptDrilledPiles` yardımcıları eklendi ("id anahtarlı" karşılaştırmanın uygulaması).
- Spec 06'da satır locator'ı satır içine alındı (ayrı değişken kullanılmayacaktı); spec 19'da taban/birim hücreleri için `panel.getByTestId(...)`, plana eşdeğer.
- Bazı çalışma kopyaları CRLF, bazıları LF; her dosyanın mevcut biçimi korundu (Git yalnız LF->CRLF uyarısı verir).

## Ortam
- Docker çalıştı; 8080, 5173, 5433 boştu. Rastgele geçici `DB_PASSWORD` ve `postgres-test` (5433) kullanıldı; mevcut `kopruq-backend-0.1.0-SNAPSHOT.jar` yeniden derlenmeden başlatıldı; iki e2e koşusundan önce health `UP` idi.
- Temizlik: PowerShell durdurma komutu, komut satırında jar adı geçen iki java sürecini (PID 39108 ve 12360) durdurdu. Yalnız biri implementer'ın başlattığıydı; ikincisi muhtemelen başlatıcı/alt süreç ama doğrulanamadı. Hiçbiri 8080/5173/5433 üzerinde dinleyen yabancı süreç değildi. `postgres-test` konteyneri `stop` + `rm -f` ile kaldırıldı (`down -v` yok); sonra 8080, 5173, 5433'te dinleyen süreç kalmadı. 5432'deki geliştirme veritabanına dokunulmadı.

## Kalan iş ve sınırlamalar
- Plan bölüm 6'daki kırılgan seçiciler ve a11y `aria-label` adayları bilinçli olarak dokunulmadı.
- Review yapılmadı.
