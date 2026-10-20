# Plan: e2e-testid-stabilization

## 1. Amaç, kapsam ve davranış

**Amaç:** `docs/roadmap.md` satır 1947'deki "Optional follow-up" listesinde geçen elemanlara kararlı `data-testid` eklemek. `frontend/e2e/**` spec'lerindeki ve `frontend/e2e/support/**` yardımcılarındaki yapısal seçiciler (CSS sınıfı, `nth()`, `:nth-child`, tablo konumu) bu id'lere taşınacak. Davranış, görünüm, yerleşim, metin ve mühendislik değerleri değişmeyecek.

**Kapsam (roadmap listesindeki 7 kategori):** Materials satır select'leri, Layout/Generate aralık girdileri, Self Weight formül satırları, Wind ve Temperature sonuç hücreleri, LM1 tablo hücreleri, graph node kökü, Seismic grafik kutusu.

**Kapsam dışı:**
- Mühendislik değeri, formül ya da davranış değişikliği.
- Görünür metin, sınıf, stil veya DOM yapısı değişikliği. Sarmalayıcı `div` eklenmeyecek.
- Yeni bağımlılık; backend, CI ve `playwright.config.ts` değişikliği.
- Yeni `aria-label` (karar K4).
- Listede olmayan kırılgan seçiciler (bölüm 6; kullanıcı kararı için ayrı listelendi).

## 2. Doğrulanmış mevcut durum

**Mevcut konvansiyon:** `frontend/src` içinde test id'leri inline string, kebab-case: `family-candidate-sections-panel` (`features/family-tables/components/CandidateSectionsPanel.tsx:9`), `family-information-panel`, `family-library-region`, `family-parameters-panel`, `section-properties`, `girder-preview-viewport`, `visual-candidates`. Sabitler modülü yok. Spec 05 zaten `getByTestId('family-candidate-sections-panel')` kullanıyor (satır 93, 131). `playwright.config.ts` içinde `use.testIdAttribute` yok (varsayılan `data-testid`); Testing Library'de `configure(` çağrısı yok.

**Dikkat: production CSS `data-testid` seçicisi okuyor** (`app/styles/app/15-family-workspace-v2-v3.css`, `16-family-desktop-contracts.css`, `03-family-workspace-v1.css`, `01-family-region-contracts.css`, `17-typography-and-alignment.css`: `section-properties`, `girder-preview-viewport`, `family-parameters-panel`). Yeni id'ler hiçbir CSS'te kullanılmayacak ve bu adlarla çakışmayacak.

**Lint:** `frontend/.oxlintrc.json` yalnız `react`, `typescript`, `oxc` eklentilerini açıyor; jsx-a11y kuralı yok.

**Snapshot/DOM testleri:** `src` içinde `toMatchSnapshot`, `toMatchInlineSnapshot`, `innerHTML`, `outerHTML` yok.

**Mimari testler:** `layerRules.test.ts` yalnız import yönlerini denetler (inline string etkilenmez); `sourceEncoding.test.ts` cp1252 bozulma işaretlerini arar (id'ler ASCII); `noBrowserStorage.test.ts` ilgisiz.

**İlgili birim testleri (kırılmaması beklenir):** `MaterialsPanel.test.tsx` (`getAllByRole('combobox')`), `LoadsUnits.test.tsx:36,39` (`.spn-formula-label`, `.spn-formula-result`; sınıflar korunur), `SeismicPanel.test.tsx:8` (`recharts` mock'u; `ResponsiveContainer` mock'u prop'ları yok sayar), `reactFlowAdapter.test.ts` (node nesnesini tümüyle `toEqual` ile karşılaştırmaz).

**Üçüncü parti (node_modules'ten doğrulandı):**
- `@xyflow/react` 12.11.3: `Node.domAttributes` var (`dist/esm/types/nodes.d.ts:24`), node wrapper'a yayılır (`dist/esm/index.mjs:2356`). Tip `Omit<HTMLAttributes<HTMLDivElement>, ...>` ve `data-${string}` index imzası yok; düz literal excess-property hatası verir.
- `recharts` `ResponsiveContainer`: Props `HTMLAttributes` genişletir, kalan prop'lar kök `div`'e yayılır (`es6/component/ResponsiveContainer.js:140-151`); `data-testid` doğrudan iletilir.
- `shared/ui/DecimalInput.tsx:28-38` ek prop iletmez; Self Weight girdileri satır içinde konumsal kalır (K5).

## 3. Etiketlenecek elemanlar ve dönüştürülecek seçiciler

### 3.1 Materials
- Kaynak `frontend/src/features/materials/components/MaterialsPanel.tsx`: satır 73 `<tr key={row.no}>` -> `data-testid={`materials-row-${row.id}`}`; satır 77 `<select>` -> `data-testid={`materials-concrete-class-${row.id}`}`. `row.id`: `DRILLED_PILES`, `FOUNDATION`, ..., `TRANSVERSE_BEAMS` (satır 28-37).
- Spec `frontend/e2e/12-malzeme-katalogu.spec.ts`: satır 18-23 `readRows` (`table.spn-table tbody tr`, `td[1]`, `querySelector('select')`) yerine `[data-testid^="materials-row-"]` (8 satır); id `data-testid` önekinden, sınıf `[data-testid^="materials-concrete-class-"]` select'inden okunur. "Drilled piles" metni `getByTestId('materials-row-DRILLED_PILES')` + `toContainText` ile korunur. Satır 40 `.first().locator('select')` -> `getByTestId('materials-concrete-class-DRILLED_PILES')`. "Diğer 7 satır değişmez" karşılaştırması id anahtarlı yapılır.

### 3.2 Layout/Generate aralık girdileri
- `frontend/src/features/layout-generator/components/SiteLayoutPanel.tsx`: `RangeField` (satır 240-259) isteğe bağlı `testId?: string` alır; kök `div.spn-range-field` -> `data-testid={testId}`, min input `${testId}-min`, max input `${testId}-max`; `testId` yoksa attribute yazılmaz. Satır 132-137 "Span length (m)" -> `testId="layout-span-length"`.
- `frontend/src/features/bridge-alternatives/components/GenerateWorkflow.tsx`: `RangeField` (satır 286-305) aynı değişiklik; satır 127 "Span (m)" -> `testId="generate-span"`.
- Spec: `e2e/11-api-hata-sozlesmesi.spec.ts:40-41` `range` = `getByTestId('layout-span-length')`, min/max = `-min`/`-max`; `range.getByText('Max span must be ≥ min span')` kalır. `e2e/09-yerlesim-alternatif.spec.ts:65-67` `generate-span-min` ve `generate-span-max`.

### 3.3 Self Weight formül satırları
- `frontend/src/features/loads/components/SelfWeightPermanent.tsx`: `FormulaRow` (satır 241) zorunlu `testKey: string` alır. Satır 243 kök -> `self-weight-row-${testKey}`, satır 277 sonuç `span` -> `self-weight-result-${testKey}`. Çağrılar: satır 133 `asphalt`, 144 `sidewalk`, 160 `facia`, 172 `guardrail`, 182 `pedestrianRailing`, 197 `protectiveFence`, 212 `soundPanel`. Inline: satır 126 `self-weight-row-concrete`; satır 222 `self-weight-row-total`, satır 225 `self-weight-result-total`.
- `frontend/e2e/support/navigation.ts` satır 50-52 `selfWeightRow(page, label)` -> `selfWeightRow(page, key)` (literal union), `getByTestId(`self-weight-row-${key}`)`; yeni `selfWeightResult(page, key)`. `rowInputValues` (satır 55-58) değişmez.
- `frontend/e2e/19-yuk-birimleri.spec.ts`: satır 30-37 `selfWeightSignature` `.spn-formula-row/-label/-result` yerine `[data-testid^="self-weight-row-"]`; imza `{ key, inputs, result }`. Satır 55-57 çağrıları `'guardrail'`, `'asphalt'`, `'concrete'`; satır 62, 71, 86 `guardrail.locator('.spn-formula-result')` -> `selfWeightResult(page, 'guardrail')`.

### 3.4 Wind sonuç hücresi
- `frontend/src/features/loads/components/wind/WindLoadsPanel.tsx:19` (`Summary`): "Without Traffic" satırının ikinci `td` hücresi -> `data-testid="wind-transverse-without-traffic"`.
- `e2e/07-ruzgar-guncellik.spec.ts:41` `page.locator('tr', { hasText: 'Without Traffic' }).locator('td').nth(1)` -> `page.getByTestId('wind-transverse-without-traffic')`.

### 3.5 Temperature sonuç hücreleri
- `frontend/src/features/loads/components/temperature/UniformTemperaturePanel.tsx:17`: dört hücre `temperature-concrete-contraction`, `temperature-concrete-expansion`, `temperature-steel-contraction`, `temperature-steel-expansion`.
- `navigation.ts`'e `temperatureResultCells(page)`: dört id'yi virgüllü tek CSS seçicide birleştirir (DOM sırası concrete-con, concrete-exp, steel-con, steel-exp = mevcut `[c, e, c, e]` beklentisi).
- `e2e/14-sicaklik-durumu.spec.ts:41` ve `e2e/19-yuk-birimleri.spec.ts:179` `td:nth-child(2), td:nth-child(3)` -> `temperatureResultCells(page)`.

### 3.6 LM1 tablo hücreleri
- `frontend/src/features/loads/components/traffic/Lm1Panel.tsx` `cell` (satır 44-53). Anahtar `${entry.section}-${entry.i}` (edit/reset'te kullanılan alan anahtarı; `tandemSystem[i]` ile aynı; `remainingAreaUdl` için i=0). Satır 49 `<tr>` -> `lm1-row-${section}-${i}`; EN Base `td` -> `lm1-base-...`; Effective `td` -> `lm1-effective-...` (satır 52); Unit `td` -> `lm1-unit-...`. α girdisinin mevcut `aria-label` değeri korunur.
- Spec 06: satır 47 `getByRole('textbox', { name: / α$/ }).first()` -> `trafficPanel(page).getByTestId('lm1-row-tandemSystem-0').getByRole('textbox')`; satır 51-52 `row...locator('td').nth(3)` -> `getByTestId('lm1-effective-tandemSystem-0')`.
- Spec 19: satır 119-120 `panel.locator('table').nth(0|1).locator('tbody tr').first()` -> `getByTestId('lm1-row-tandemSystem-0')` ve `getByTestId('lm1-row-udl-0')`; satır 125-128 `td nth(1)`/`nth(4)` -> `lm1-base-*`/`lm1-unit-*`; satır 121 α okuma -> satır içinde `getByRole('textbox')`.

### 3.7 Graph node kökü
- `frontend/src/features/graph/adapters/reactFlowAdapter.ts:116` `toReactFlowNodes` dönüş nesnesine: `domAttributes: { 'data-testid': `graph-node-${node.id}` } as NonNullable<FlowGraphNode['domAttributes']>`. Tip assertion gerekli (`data-*` adı tipte yok); excess-property/weak-type denetimi karşılaştırılabilirlikte yapılmadığı için derlenmesi beklenir, `tsc -b` ile doğrulanacak. `any`, `as unknown as` veya global modül augmentation kullanılmayacak. Assertion derlenmezse implementer durur ve raporlar; `BaseNode`, `EngineeringNodeShell`, `AssemblyNodeShell`, `ListOutputNode` ve notes köklerini tek tek etiketlemeye geçmez (daha geniş, karar gerektirir).
- Grup düğümleri (`GraphWorkspace.tsx:205`, `type: 'graphGroup'`) adapter'dan geçmez, id almaz; `flowNodes` (`GraphWorkspace.tsx:199-204`) nesneyi yaydığı için alan korunur.
- `frontend/e2e/support/graph.ts`: satır 9 `canvasNodes` `.react-flow__node:not(.react-flow__node-graphGroup)` -> `[data-testid^="graph-node-"]`; satır 13 ve 16 `addLibraryNode` id `data-id` yerine `data-testid` değerinden `graph-node-` öneki atılarak okunur; satır 23 `nodeById` -> `page.getByTestId(`graph-node-${id}`)`. Handle (satır 53-54) ve `.react-flow__edge` (satır 58) kapsam dışı. Spec 04 ve 05 yalnız helper kullanır; spec 05 satır 128 `.react-flow__edge` kalır.

### 3.8 Seismic grafik kutusu
- `frontend/src/features/loads/components/seismic/SeismicPanel.tsx:12` `<ResponsiveContainer width="100%" height={280}>` -> `data-testid="seismic-spectrum-chart"` (doğrudan iletilir, sarmalayıcı yok; CSS'teki `:has(.recharts-responsive-container)` kuralları etkilenmez).
- `e2e/15-deprem-durumu.spec.ts:27` `page.locator('.recharts-line-curve')` -> `page.getByTestId('seismic-spectrum-chart').locator('.recharts-line-curve')` (eğri SVG yolu Recharts'a ait kapsamlı sınıf olarak kalır). Adım 1'e `await expect(page.getByTestId('seismic-spectrum-chart')).toBeVisible()` eklenir ("eğri sayısı 0" kontrolü kutu yokken boş geçmesin).

## 4. Temel kararlar

- **K1 Adlandırma:** `<feature>-<element>[-<domainKey>]`; özellik/eleman kısmı küçük harf kebab-case İngilizce (kod tanımlayıcısı, UI metni değil). Dinamik kısım kararlı alan anahtarından olduğu gibi: `row.id`, `inputs` alan kökü, LM1 `section` ve alan indeksi, graph `node.id`. Kararlı anahtar varken render indeksi kullanılmaz; LM1'deki indeks alanın kendi dizi indeksi.
- **K2 Inline string, sabitler modülü yok:** mevcut konvansiyonla aynı; `tsconfig.e2e.json` yalnız `e2e` ve `playwright.config.ts` içerir, spec'lerin `src`'den import etmesi e2e derlemesine `src` dosyalarını çeker ve katman kurallarına yeni yüzey açar.
- **K3 Yalnız gerekli yerler:** `RangeField.testId` isteğe bağlı (yalnız iki çağrıda dolu); `FormulaRow.testKey` zorunlu (7 çağrının hepsine verilir).
- **K4 Yeni `aria-label` yok:** değişiklik yardımcı teknolojiye görünmez kalsın, "davranış değişmez" garantisi tam olsun. Materials select'i ve aralık input'larının erişilebilir adı yok; ad eklemek gerçek a11y iyileştirmesi ama ekran okuyucu çıktısını değiştirir; bölüm 6'da isteğe bağlı aday.
- **K5 Self Weight input'ları satır kökü içinde konumsal kalır:** `DecimalInput` prop iletmez ve `shared/ui` değiştirilmez; terim sırası formülün sabit parçası.
- **K6 Production kodu yeni id'leri okumaz:** CSS seçicisi, `querySelector` veya mantıkta kullanılmaz.

## 5. Uygulama sırası

Her kategori: önce `src`'ye attribute, sonra spec/helper dönüşümü, sonra ilgili vitest dosyası ve o kategorinin spec'i.

0. **Baseline (temiz HEAD):** `frontend/` içinde `npm test`, `npm run lint`, `npm run build` çalıştır, sonuçları kaydet. ortam hazırsa `npm run test:e2e` da (05 ve 18'in mevcut kararlılığını not et).
1. Materials: `MaterialsPanel.tsx`, `e2e/12-...`. Kontrol: `npm test -- src/features/materials`.
2. Aralıklar: `SiteLayoutPanel.tsx`, `GenerateWorkflow.tsx`, `e2e/11-...`, `e2e/09-...`. Kontrol: `npm test -- src/features/layout-generator src/features/bridge-alternatives`.
3. Self Weight: `SelfWeightPermanent.tsx`, `e2e/support/navigation.ts`, `e2e/19-...`. Kontrol: `npm test -- src/features/loads`.
4. Wind: `WindLoadsPanel.tsx`, `e2e/07-...`.
5. Temperature: `UniformTemperaturePanel.tsx`, `navigation.ts` (`temperatureResultCells`), `e2e/14-...`, `e2e/19-...`.
6. LM1: `Lm1Panel.tsx`, `e2e/06-...`, `e2e/19-...`.
7. Graph: `reactFlowAdapter.ts`, `e2e/support/graph.ts`. Kontrol: `npm test -- src/features/graph` ve `npm run build` (tip assertion doğrulaması).
8. Seismic: `SeismicPanel.tsx`, `e2e/15-...`. Kontrol: `npm test -- src/features/loads/components/seismic`.
9. Tam doğrulama: bölüm 7 komutları ve grep kontrolleri.
10. Belgeler: `docs/roadmap.md` satır 1947 işaretlenir veya yeni `## e2e-testid-stabilization (2026-10-20)` bölümü; `docs/e2e/README.md` "Kurallar" paragrafına seçici kuralı (K1, K2, K6) bir cümle; `docs/architecture.md` "Playwright e2e" bölümü sonuna kısa not (hangi elemanlar id aldı, `domAttributes` ve Recharts iletimi).

## 6. Listede olmayan kırılgan seçiciler (kullanıcı kararı; varsayılan: kapsam dışı)

- **Ortak helper'lar:** `support/projects.ts:43` ve `18-...:100` `.spn-active-project strong`; `support/navigation.ts:15`, `projects.ts:80`, `16-...:18`, `18-...:36` `main.spn-project-center`; `navigation.ts:42,46` `.spn-traffic-workspace [role=tabpanel][data-state=active]`; `graph.ts:5` `.spn-graph-library`; `graph.ts:53-54` `.react-flow__handle...`; `graph.ts:58` ve `05-...:128` `.react-flow__edge`; `graph.ts:75` `button[title="Run graph"]`; `bridges.ts:21-22` `div.spn-card` + heading + `.last()`, `label.spn-field` + span metni; `fixtures.ts:178` `.spn-save-toast`.
- **Spec'e özel:** 05: satır 34 `aside[aria-label="Family Library"]`, satır 37 `.family-freshness-badge strong`, satır 114 `tr` + `.first()`. 06: satır 27 Preview `tr` 'Project overrides (LM1)' `td nth(1)`. 07 ve 19: 07 satır 40 ve 19 satır 154 `p.spn-hint strong` (STALE); 07 satır 105 `p[role=alert].spn-error`. 08: satır 27-28 `main.spn-bridge-center`, `label.spn-field` -> select; satır 67 `canvas`; satır 77 `.spn-bd-editor-title span`. 09: satır 36, 42-43, 52-53 aday satırları `table.spn-table tbody tr` `nth(index)` ve `td.last()`; satır 63 `label.spn-field` "Bridge Length (m)". 10: satır 29 `label.spn-field`; satır 42 `p.spn-error.first()`; satır 49, 53, 55 `.spn-card` + heading + `.last()`; satır 57 `form`. 13: satır 20-26 `table.spn-bd-axis-table` `nth` ve `td nth`; satır 51 `.spn-bd-fact strong`; satır 68 `.spn-bd-view-modes`. 14 ve 15: Details satırları `.spn-seismic-report-rows > div` (14 satır 77, 15 satır 54). 16: satır 31-35 `table.spn-table` `th`/`td`, `.spn-error`. 19: satır 58 `.spn-card` + `.last()`; satır 106-111 Carriageway şerit `td nth(1)` (`CarriagewayNotionalLanes.tsx:73-77`) ve Preview 'Carriageway width' (`TrafficPreviewValidation.tsx:44-47`).
- **A11y adayları (K4):** Materials select'i için `aria-label={`${row.element} concrete class`}`; aralık input'ları için `aria-label="<label> min|max"`.

## 7. Kabul kriterleri ve doğrulama

- **AC1 Materials:** 8 satırın her biri `materials-row-<id>`, select'i `materials-concrete-class-<id>` taşır. Spec 12 bunları kullanır ve `table.spn-table` içermez.
- **AC2 Aralıklar:** `layout-span-length[-min|-max]` ve `generate-span[-min|-max]` var. Spec 09 ve 11'de `.spn-range-` geçmez.
- **AC3 Self Weight:** 9 satır kökü ve 8 sonuç `span` etiketli (concrete satırında sonuç yok). `e2e/**` içinde `spn-formula` geçmez.
- **AC4 Wind:** `wind-transverse-without-traffic` var. Spec 07'de `'Without Traffic'` seçicisi kalmaz.
- **AC5 Temperature:** 4 hücre etiketli. `e2e/**` içinde `nth-child` geçmez.
- **AC6 LM1:** `lm1-row|base|effective|unit-<section>-<i>` var. Spec 06 ve 19'da `locator('table').nth(` ve LM1 için `td').nth(` geçmez.
- **AC7 Graph:** kanvastaki her kopruq düğümünün React Flow kökünde `graph-node-<id>` var, grup düğümlerinde yok. `e2e/**` içinde `react-flow__node` geçmez. Handle ve edge seçicileri bilinçli olarak kalır.
- **AC8 Seismic:** `seismic-spectrum-chart` `ResponsiveContainer` kökünde. Spec 15 eğriyi bu kutu içinde arar ve kutunun görünürlüğünü doğrular.
- **AC9 Davranış değişmez:** `src` diff'i yalnız `data-testid` attribute'ları, `RangeField.testId` ve `FormulaRow.testKey` prop'ları ve `domAttributes` alanından oluşur. Metin, sınıf, stil, DOM hiyerarşisi, `package.json` ve CSS değişmez. `backend/**`, `.github/**`, `playwright.config.ts` değişmez.
- **AC10 Kontroller yeşil:** `npm test` hepsi geçer (test sayısı baseline ile aynı; 1183 bildirildi); `npm run lint` hatasız; `npm run build` (tsc -b, e2e tip denetimi dahil, ardından vite build) başarılı; `npm run test:e2e` 19/19 geçer.
- **AC11 Belgeler:** roadmap, `docs/e2e/README.md`, `docs/architecture.md` güncel.

**Komutlar** (`frontend/` içinde; PowerShell'de `npm.cmd`): `npm test`; `npm run lint`; `npm run build`; `npx playwright test --list` (backend olmadan 19 spec listelenmeli); `npm run test:e2e`; tek spec `npm run test:e2e -- e2e/12-malzeme-katalogu.spec.ts`; kararlılık `npm run test:e2e -- --repeat-each=2 e2e/05-graph-family.spec.ts`.

**E2E ön koşulları** (`docs/e2e/README.md`): `docker compose --profile postgres-test up -d --wait postgres-test` (5433); jar `mvn -f backend/pom.xml -B package` ile derlenir; jar `DB_URL=jdbc:postgresql://localhost:5433/kopruq_test` ve geçici bir `DB_PASSWORD` ile başlatılır; `/actuator/health` `UP` olmalı.

**Grep kontrolleri:**
1. `frontend/e2e` içinde `spn-formula|nth-child|react-flow__node|spn-range-|locator\('table'\)\.nth` -> 0 eşleşme.
2. `frontend/e2e/12-malzeme-katalogu.spec.ts` içinde `table.spn-table` -> 0 eşleşme (spec 09 ve 16'daki bölüm 6 kapsamında kalır).
3. `frontend/src` içinde (`*.test.*` hariç) `materials-row-|materials-concrete-class-|layout-span-length|generate-span|self-weight-|wind-transverse|temperature-(concrete|steel)-|lm1-(row|base|effective|unit)-|graph-node-|seismic-spectrum-chart` -> yalnız attribute tanım satırları; `querySelector` veya CSS eşleşmesi yok.
4. `frontend/src/**/*.css` içinde `data-testid` eşleşmeleri baseline ile aynı, yalnız mevcut üç id.

## 8. Riskler

- **`domAttributes` tipi:** assertion derlenmezse implementer durur ve raporlar. `@xyflow/react` ileride `domAttributes`'i değiştirirse e2e yakalar.
- **Recharts:** prop iletimi kurulu sürümün derlenmiş kodundan doğrulandı; `.recharts-line-curve` üçüncü parti sınıfı olarak kalır, kapsamı daraltıldı.
- **DecimalInput:** Self Weight girdileri konumsal kalır; terim sırası değişirse spec 19 kırılır (bilinçli kabul).
- **Tekrarlanan id:** LM1 `section`+`i`, Materials `id`, graph `node.id` tekil; Temperature satırları statik; aynı anda tek graph kanvası ve tek LM1 paneli mount olur. `getByTestId` strict mode'da tek eleman bekler; çakışma olursa e2e açıkça düşer.
- **CSS'in `data-testid` okuması (mevcut anti-pattern):** yeni adlar mevcutlarla çakışmaz; grep 4 korur.
- **Memo/sanallaştırma:** etkilenen listeler sanallaştırılmış değil; `RangeField` ve `FormulaRow` memo değil.
- **i18n:** yok; id'ler UI metni değil.
- **E2E kararsızlığı:** 05'teki sürükleme ve 18'deki zamanlama bu değişiklikten bağımsız; baseline ile karşılaştırılmalı.

## 9. Varsayımlar

- Baseline'da 19 e2e spec ve vitest yeşil (bildirildi, planlayıcı doğrulamadı; adım 0'da kontrol edilecek).
- Spec'lerdeki yapısal seçiciler bölüm 3'te sayılanlardan ibaret. 19 spec ve tüm `support` dosyaları okundu; `global-setup.ts`, `env.ts`, `api.ts`, `evidence.ts` ve `scenarioData.ts` DOM seçicisi açısından ayrıca incelenmedi (`support` içinde `locator(` grep'i yalnız yukarıdaki dosyaları gösterdi).
- `vitest run <path-filter>` biçimi (`npm test -- src/features/...`) dosya filtresi olarak çalışır; çalışmazsa tam `npm test` kullanılır.
