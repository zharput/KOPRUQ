# Plan: frontend-remediation

Durum: **READY**. Mühendis kararı gereken tek faz (Faz 5) ayrı tutuldu. Mühendis onay vermeden Faz 5'te kod değişmez, diğer fazlar ondan bağımsız ilerler.

---

## 1. Amaç ve kapsam dışı

**Amaç:** 2026-10-11 frontend review'ının öncelikli bulgularını güncel kodda doğrulamak. Doğrulananları küçük ve ayrı ayrı doğrulanabilir fazlarla düzeltmek. Öncelik sırası: veri kaybı, yanlış hesap ya da gösterim, bayat sonucun geçerli görünmesi, girdi doğrulama ve HTTP katmanı. Frontend, backend'in yeni hata sözleşmesine (`ApiErrorResponse`), `INVALID` sonuçlarına ve terrain import `status`/`warnings` alanlarına uyarlanacak. Mevcut vitest hataları önce kayda geçirilecek, böylece değişiklikten doğan regresyon önceden var olan hatadan ayrılabilecek.

**Kapsam dışı:**
- Backend'de değişiklik, yeni REST endpoint'i, yeni npm bağımlılığı. Gereken her şey zaten mevcut: `@tanstack/react-query`, `zod`, `@radix-ui/*`.
- Yeni mühendislik formülü, sınır, katsayı ya da varsayılan. Mevcut mühendislik sabitlerine dokunulmaz: `INITIAL_SELF_WEIGHT_INPUTS`, wind `drefM: 3`, seismic ξ/η metinleri, `PRECAST_DIMENSIONS`.
- Listede olmayan review bulguları: A-02…A-08, A-10…A-16 ve C-0xx'lerin geri kalanı. İstisna: aynı dosyada kaçınılmaz olarak dokunulan küçük parçalar. Bunlar fazlarda açıkça adıyla yazılı (C-001-01 gibi).
- Baseline'da kırmızı olan 26 testin onarımı (C-007-11, C-001-02, C-006-06, A-03). Bunlar ayrı bir iş.
- Stil, `App.css`, ölü kod temizliği, `strict` modu, katman taşımaları (A-08).
- `frontend/vitest-errors.txt` dosyasının silinmesi (A-16). Kullanıcı kararı gerektirir.

---

## 2. Mevcut mimari (kanıtlı)

### 2.1 Frontend araç zinciri (doğrulandı)
- `frontend/package.json` script'leri: `build` = `tsc -b && vite build`, `test` = `vitest run`, `lint` = `oxlint`, `test:watch`. **`npm run lint` mevcut** (oxlint ^1.79, `frontend/.oxlintrc.json`: react/typescript/oxc eklentileri; `rules-of-hooks` error). ESLint yapılandırması yok, gerekmiyor.
- `frontend/vite.config.ts`: jsdom, `setupFiles: ./src/test/setup.ts` (jest-dom + açık `cleanup`). Proxy yok, `VITE_*` env kullanımı yok.
- `frontend/tsconfig.app.json`: `strict` kapalı, `types: ["vite/client"]`.
- Hiçbir test `fetch`'i mock'lamıyor (Grep). HTTP'ye dokunan yeni testler `vi.stubGlobal('fetch', …)` kullanmalı.
- `AppProviders.tsx`: tek `QueryClient`. Seismic, Wind ve Temperature panelleri bunu kullanmıyor.
- Review analyzer kanıtı (`docs/reviews/2026-10-11T14-19-35Z/analyzers/`): oxlint 85 uyarı / 0 hata / exit 0; `tsc --noEmit` hatasız. Build review sırasında çalıştırılmamış. `docs/features/backend-remediation/implementation.md:14` frontend `npm run build` için exit 0 bildiriyor (yalnızca chunk-size uyarısı; uygulayıcı raporu, bağımsız doğrulanmadı).

### 2.2 Bulgu doğrulama tablosu (güncel `frontend/src`, satırlar yeniden okundu)

| ID | Sonuç | Güncel kanıt (file:line) | Not |
|---|---|---|---|
| A-01 | CONFIRMED | `shared/project-file/projectFileService.ts:7,12`: yalnızca 5 aile kategorisi, graph, projectState, bridgeDefinitions ve `modules.windLoads` yazılıyor. `app/App.tsx:70`: `crossSectionValues` yalnızca `useState`. `App.tsx:84`: New Project girder'ı sıfırlıyor, diğerlerini sıfırlamıyor. Proje dışında, global localStorage'da kalanlar: `SeismicPanel.tsx:7` (`kopruq.seismic`), `WindLoadsPanel.tsx:9` (`kopruq.wind-load.inputs`), `UniformTemperaturePanel.tsx:6` (`kopruq.uniform-temperature.inputs`), `PreferredSpanPanel.tsx:6,75`, `familyRepository.ts:19-28` (`kopruq.girder-library.precast`). Hiç kalıcı olmayan: `SelfWeightPermanent.tsx:88`. `useProjectFile.ts:14` (open) bunların hiçbirini geri yüklemiyor. | Projeler arası sızıntı ve kayıp |
| C-013-02 | CONFIRMED | `useProjectFile.ts:14` sırası: `applyProjectFile` → `setProjectState` → `setBridgeDefinitions` → `next.modules.windLoads` → `setRef`. `projectFileService.ts:16` `modules` alanını doğrulamıyor. `catch` yok, `ref` eski dosyada kalıyor. `:57` `ref.handle`'a yazıyor. | `modules`'suz dosyada TypeError → sonraki Save önceki dosyanın üzerine yazar |
| C-013-03 | CONFIRMED | `recentProjects.ts:13`: `id=fileName`, `retained=handle??previous?.handle??sessionHandles.get(id)`. `TopWorkspaceNav.tsx:14` `onOpen?.(file)` handle geçmiyor. `App.tsx:91,94`. | Aynı adlı başka dosyanın handle'ı devralınıyor |
| C-010-03 | CONFIRMED | `shared/ui/TabDetailPanel.tsx:51-55` Radix `Tabs.Content`'i `forceMount` olmadan kullanıyor (Radix varsayılanı pasif sekmeyi unmount eder; kütüphane davranışı varsayımı, çalıştırılmadı). `SelfWeightPermanent.tsx:88`, `traffic/TrafficLoadsPanel.tsx:29-35` yerel state tutuyor. | |
| C-010-04 | CONFIRMED | `loads/components/LoadsPanel.tsx:56` snapshot `inputs: { vb:'', terrain:'', ze:'' … }`. `WindLoadsPanel.tsx:9`: `result` prop'u girdiye bağlı değil, Details mevcut girdiyi eski sonuçla yan yana gösteriyor, `if(res.ok)` hatayı sessiz yutuyor. | |
| C-011-06 | CONFIRMED | `preferred-span/components/PreferredSpanPanel.tsx:43-45,65-72,78-82`: `syncRules` yalnızca güncel varyantlara ait kuralları döndürüyor. `:74-76` sonucu kalıcı yazıyor. | Varyant geri gelince kural 0'larla yeniden oluşuyor |
| C-011-07 | PARTIALLY | Sabit değerler `project/components/ProjectDashboardPanel.tsx:46-49`'da duruyor. Ancak panele yalnızca `ProjectWorkspace.tsx:111` fallback'i (bilinmeyen `/project/<slug>`) ve legacy `router.tsx:102` ile ulaşılıyor. Ana Overview (`ProjectWorkspace.tsx:87-95`) proje verisini kullanıyor. | Etki review'ın söylediğinden düşük |
| C-005-01 | CONFIRMED (kod) | `graph/domain/girderCandidates.ts:17` `Wy: Iy/Math.max(Btf,Bbf)/2`, oysa steel `:23` `Iy/(Math.max(Btf,Bbf)/2)`. | Doğruluk mühendis kararı. Ek: review A-05'e göre Graph yolu `tf/bf/w` anahtarlarını geçiriyor, bu yüzden precast özellikleri orada NaN olabilir (A-05 yeniden doğrulanmadı, kapsam dışı). |
| C-006-01 | CONFIRMED (kod) | `graph/domain/pierSectionProperties.ts:17-19`: oval `wx: modulus(ix, B), wy: modulus(iy, D)`. Diğer kesitler `:12,:24,:31` `wx=ix/(D/2)`, `wy=iy/(B/2)`. | Mühendis kararı (eksen konvansiyonu, A-03) |
| C-004-01 | CONFIRMED | `family-tables/model/graphFamilyPresentation.ts:96-97`: `startsWith('stiffness.k')` `kr*` anahtarlarını da yakalıyor, `:97` dalına hiç ulaşılmıyor. | Mekanik düzeltme |
| C-016-01 | CONFIRMED | `shared/ui/generation.ts:4,7`: `Math.round(v*100)/100` ve birikimli toplama. | Hassasiyet mühendis kararı |
| C-003-01 | CONFIRMED | `FamilyResultsViewer.tsx:27`: kanonik (m) değerler `toFixed(2)` ile basılıyor. `:29` birim hücresi düğümün yerel birimini (`nodeParameters[…Unit] ?? 'm'`) gösteriyor. | Mekanik düzeltme |
| C-012-01 | CONFIRMED | `project/model/projectWorkspace.ts:35` birimleri etiketle tutuyor (`'kN·m'`, `'°C'`). `graph/ui/EngineeringNodeInspector.tsx:108` `'kN·m/rad'` üretiyor ama `quantities.ts:6,11` kimlikleri `kNm/rad`. `convertQuantity` (`quantities.ts:18`) fırlatıyor, `:109`'da catch yok. | Mekanik düzeltme |
| C-006-02 | CONFIRMED | `graph/family/familyResults.ts:47` ve `graphRunValidity.ts:9-13` parmak izine birim almıyor. `graphEngine.ts:89` `projectUnits` kullanıyor. `GraphWorkspace.tsx:47,422`. | |
| C-006-03 | CONFIRMED | `graphRunValidity.ts:10,13` düğüm parmak izi yalnızca kendi parametreleri. `adapters/reactFlowAdapter.ts:114`. | |
| C-006-04 | CONFIRMED (review kısmen eksik) | `markFamilySnapshotsStale` çağrılıyor (`GraphWorkspace.tsx:47,92`) ama olay yaymıyor (`familySnapshotStore.ts:10`). `clearFamilySnapshots` üretimde hiç çağrılmıyor. `FamilyResultsViewer.tsx:23` `freshness` okumuyor. `GraphWorkspace.tsx:84-90` publish'te run başındaki graph kullanılıyor. Publish silinen düğümlerin snapshot'larını temizlemiyor (`:6`). | |
| C-008-01 | CONFIRMED | `GraphWorkspace.tsx:49`: `executionDisplay` `outputs` alanını boşaltmıyor. `:130` ham `nodeOutputs`'u canvas'a ve inspector'a geçiriyor. | |
| A-09 | CONFIRMED | `API_BASE='http://localhost:8080'` 9 modülde: alternativesService:26, layoutService:26, fastSolverService:41, trafficLoadsService:1, temperatureService:1, terrainViewerService:2, terrainImportService:1, landXmlImportService:1, graphMaterialService:5. Satır içi çağrılar: `WindLoadsPanel.tsx:9`, `SeismicPanel.tsx:7`, `TerrainMesh.tsx:59`. Yalnızca `landXmlImportService.ts:94-97` gövdeden `message` okuyor; hiçbir servis `code`, `correlationId` ya da `errors[]` okumuyor. | |
| C-010-01 | CONFIRMED | `SeismicPanel.tsx:7`: `ok` kontrolü yok, catch yok, iptal yok, her tuşta istek. `UniformTemperaturePanel.tsx:6`: `void update(...)` catch'siz, yanıtlar sıra dışı gelebilir. | |
| C-010-02 | CONFIRMED | `traffic/Lm1Panel.tsx:11` `Number(e.target.value)`: `''` → 0 ve `PROJECT_OVERRIDE` olarak yazılıyor. | |

**Review'da olmayan, backend değişikliğinden doğan yeni boşluklar (doğrulandı):**
- **B-1:** `terrain-dtm/api/terrainImportService.ts:9-20` `TerrainImportResult` tipinde `status`/`warnings` yok. `TerrainDtmPanel.tsx:60` her durumda `onImported` çağırıyor ve uyarıları hiç göstermiyor.
- **B-2:** Wind ve Seismic `INVALID` sonucu HTTP 200 ile, sıfır değerlerle dönüyor. `WindLoadsPanel.tsx:5,7` bunları `0.000` olarak, `SeismicPanel.tsx:6` `S=0`, `TB=0.000` olarak gösteriyor.
- **B-3:** Temperature `INVALID` olsa bile değer hesaplıyor (`UniformTemperatureService.java:24-29`). UI durumu yalnızca Details içinde gösteriyor, `missingParameters`'ı hiç göstermiyor.
- **B-4:** Servislerin çoğu yalnızca `HTTP <status>` metni fırlatıyor. Backend'in `message`, `code`, `correlationId` ve `errors[]` alanları kayboluyor.

### 2.3 Backend sözleşmeleri (koddan doğrulandı; frontend bunlara uymalı)
- **Hata gövdesi** (`backend/.../shared/exception/ApiErrorResponse.java`): `{ timestamp, status:int, error:string, code:string, message:string, path:string, correlationId:string|null, errors: {field:string, message:string}[] }`. `timestamp` bir `Instant`; JSON biçimi Jackson yapılandırmasına bağlı, doğrulanmadı, frontend'de kullanılmamalı.
  - Kodlar (`ApiExceptionHandler.java`):

    | code | HTTP | `errors[]` | Kaynak |
    |---|---|---|---|
    | `INVALID_REQUEST` | 400 | dolu | `InvalidRequestException` |
    | `INVALID_LANDXML` | 400 | boş | |
    | `INVALID_INPUT` | 400 | boş | `IllegalArgumentException`; ör. XYZ'de hiç nokta yok |
    | `MALFORMED_REQUEST_BODY` | 400 | boş | |
    | `INVALID_PARAMETER` | 400 | boş | |
    | `UPLOAD_TOO_LARGE` | 413 | boş | |
    | `UPLOAD_UNREADABLE` | 400 | boş | |
    | `HttpStatus` adı | durumun kendisi | boş | `ResponseStatusException` ya da Spring `ErrorResponse`; ör. `NOT_FOUND` + "No terrain with id …" |
    | `INTERNAL_ERROR` | 500 | boş | genel mesaj |
  - `errors[]` dolduran endpoint'ler: `LayoutGenerationRequest.validate()` (`/api/layout/generate`), `KernelStateRequest`, `AlignmentSampleRequest`, `FastSolverModelBuilder`. Alan adları JSON istek adlarıyla aynı; frontend şema alanlarıyla eşleşiyor (`layoutGenerationSchema.ts`, `kernelStateSchema.ts`).
  - Header `X-Correlation-ID` her yanıtta var, CORS ile expose ediliyor (`CorrelationIdFilter.java:32`, `WebCorsConfiguration.java:31`). CORS yalnızca GET, POST ve HEAD'e izin veriyor.
- **INVALID yanıtları (HTTP 200):**
  - `WindResult {status:'VALID'|'INVALID', z0M, zminM, kr, cr, vmMs, turbulenceIntensity, qpKNm2, bOverD, cfx, transverseKNm:number|null, missing:string|null}`. INVALID'de sayılar 0, `transverseKNm=null`.
  - `SeismicSpectrumResult {status, ag, s, tb, tc, td, peakElasticAcceleration, points:{period,acceleration}[]}`. INVALID'de hepsi 0, `points=[]`.
  - `UniformTemperatureResult`: frontend tipi `temperatureService.ts:3-19` ile birebir aynı. `status` ve `temperatureActionStatus` `VALID|INVALID`, `missingParameters: string[]`.
  - `FastSolverResponse.status`: `COMPLETED` ya da `FAILED`, ek olarak `errorMessage`. Frontend zaten işliyor (`FastSolverPanel.tsx:133-137`).
- **TerrainImportResponse** (`terrain/api/TerrainImportResponse.java`): `{ id, pointCount, triangleCount, minXM, maxXM, minYM, maxYM, minElevationM, maxElevationM, previewPoints:{x,y,z}[], status:'IMPORTED'|'VALID'|'REVIEW_REQUIRED', warnings:string[] }`. XYZ import yalnızca `IMPORTED` ya da `REVIEW_REQUIRED` üretiyor (`TerrainImportService.java:131`). REVIEW_REQUIRED durumunda 0 üçgenle de 200 dönebiliyor.
- **LandXML:** `LandXmlImportSummaryResponse.status` `VALID` ya da `REVIEW_REQUIRED` (`LandXmlTerrainMapper.java:77`). Frontend tipiyle uyumlu ve zaten gösteriliyor.

### 2.4 Mevcut vitest başarısızlıkları (baseline referansı)
**Dosya uyuşmazlığı:** `frontend/vitest-errors.txt` 26 hatayı göstermiyor. Dosya UTF-16 kodlu ve eski bir çalıştırmaya ait: yol `C:/_ZHarput_Data/SPANOVA/frontend`; sonuç "Test Files 1 failed | 41 passed (42)", "Tests 4 failed | 334 passed (338)", 4 hatanın hepsi `NodeInspector.test.tsx`'te. Bu dosya baseline olarak kullanılmamalı.

"26 hata" sayısı `docs/reviews/2026-10-11T14-19-35Z/analyzers/vitest.txt:2168-2169` kaydından geliyor: "Test Files 6 failed | 56 passed (62)", "Tests 26 failed | 430 passed (456)". Aşağıdaki tablo o kayda dayanıyor. Planlayıcı testleri çalıştıramadı; geçerli sayı Faz 0'ın gerçek çıktısıdır.

| Test dosyası | Test adı | Neden kategorisi |
|---|---|---|
| `src/app/App.test.tsx` | opens the read-only Graph-generated Family Workspace | Bayat test: UI metni değişmiş (C-001-02) |
| `src/features/graph/ui/BaseNode.test.tsx` | renders editable Range Start/End/Step… | Bayat: `textbox` → `spinbutton` (C-007-11) |
| 〃 | input.number keeps the editor… | 〃 |
| 〃 | input.integer keeps the editor… | 〃 |
| `src/features/graph/ui/EditableNumericInput.test.tsx` | supports select-all replacement… | Bayat: `type=number` değer tipi (C-007-11) |
| 〃 | retains an empty blurred editor as invalid… | 〃 |
| 〃 | rejects decimal text in Integer editors… | 〃 |
| `src/features/graph/ui/EngineeringNodeShell.test.tsx` | keeps rectangular pier B/D … B=3, D=1.5 | Bayat: detay butonu artık yok (C-008-04) |
| 〃 | … B=5, D=1.5 | 〃 |
| 〃 | … B=3, D=4 | 〃 |
| 〃 | projects substructure.pier.circular local lengths… | Bayat: spinbutton (C-007-11) |
| 〃 | projects substructure.pier.rectangular… | Sözleşme çelişkisi B/D etiketi (A-03, mühendis kararı) |
| 〃 | projects substructure.pier.box… | 〃 |
| 〃 | projects substructure.pier.h_section… | 〃 |
| `src/features/graph/ui/ListOutputNode.test.tsx` | renders the full Elastomeric Bearing candidate… | Hassasiyet politikası (C-006-06) |
| 〃 | renders shallow and piled foundation candidates… | 〃 |
| 〃 | expands a PierCandidate… | 〃 / etiket adı |
| 〃 | renders compact Rectangular and T-Cap… | 〃 |
| `src/features/graph/ui/NodeInspector.test.tsx` | converts a local numeric value when its unit selector changes | Bayat: spinbutton (C-007-11) |
| 〃 | uses a rounded obround for Oval Pier… | Hassasiyet / etiket (C-006-06) |
| 〃 | shows H-section dimensions with B transverse and D longitudinal | 〃 (A-03 ile ilişkili) |
| 〃 | draws T-Cap flange at the bottom… | 〃 |
| 〃 | shows shallow foundation PLAN and SECTION… | 〃 |
| 〃 | shows piled foundation pile grid… | 〃 |
| 〃 | converts schematic values to Project display units… | 〃 |
| 〃 | updates the schematic from changed local parameters… | 〃 |

Kategorilerin kaynağı `docs/reviews/.../code-quality.md` §12; yeniden çalıştırılmadı. Toplam 1+3+3+7+4+8 = 26.

---

## 3. Önerilen tasarım

1. **Proje modülleri deposu.** Yeni `frontend/src/shared/project-file/projectModules.ts`. Proje kapsamlı ve localStorage destekli verinin tek listesi:

   | Modül | Anahtar | Not |
   |---|---|---|
   | `girderLibrary` | `kopruq.girder-library.precast` | `familyRepository` get/save üzerinden |
   | `preferredSpanRules` | `kopruq.project-design-system.girder-span-rules` | |
   | `seismicInputs` | `kopruq.seismic` | |
   | `windInputs` | `kopruq.wind-load.inputs` | |
   | `temperatureInputs` | `kopruq.uniform-temperature.inputs` | |
   | `crossSectionValues` | `kopruq.superstructure.cross-section.v1` | yeni anahtar |
   | `selfWeightInputs` | `kopruq.loads.self-weight.v1` | yeni anahtar |
   | `trafficLm1` | `kopruq.loads.traffic-lm1.v1` | yeni anahtar |

   Her modülde şunlar var: `key`, `parse(unknown)` (zod; geçersizse fırlatır), `read()` (bozuk JSON → `undefined`, çökmez), `write(v)` (`kopruq:project-data-changed` yayar, dirty takibi için), `reset()`. Okuma ve yazma için tek hook: `useProjectModule<T>(id, fallback)`, `useSyncExternalStore` ile.
   - `buildProjectFile` bu modülleri `modules.<id>` altına yazar. Mevcut `modules.windLoads` aynen korunur. `schemaVersion` 1'de kalır, eklemeler geriye uyumlu.
   - `validateProjectFile`: `modules ?? {}` normalizasyonu; her modül varsa `parse` edilir. Önce doğrula, sonra uygula.
   - `applyProjectFile` modülleri de yazar. Mevcut graph/aile rollback'ine modüller eklenir.
2. **Proje oturumu.** `useProjectFile`, open ve New Project başarılı olunca artan bir `sessionId` döndürür. `App.tsx` bunu `WorkspacePage`'in `key`'ine ekler, böylece mount anında localStorage okuyan paneller yeni projeyle yeniden kurulur. Open ve New sırasında ayrıca `clearFamilySnapshots()` ve `clearSuccessfulGraphRuns()` çağrılır.
3. **Wind snapshot.** Snapshot gerçek girdileri taşır: `{vb, terrain, ze, deckWidthM, drefM}`. STALE durumu = snapshot girdileri ≠ güncel girdiler. Details snapshot'ın girdilerini gösterir. `status !== 'VALID'` ise sayısal satırlar `—` olur ve `missing` mesajı gösterilir.
4. **Graph tazeliği.**
   - `graphFingerprint(graph, projectUnits)` normalize edilmiş birimleri de içerir.
   - Düğüm parmak izi geçişli olur: üst kapanıştaki düğümler + gelen kenarlar, `stableStringify` ile.
   - Dirty durumda `executionDisplay.outputs = {}` (saf fonksiyon olarak `graph/ui/executionDisplay.ts`'e çıkarılır).
   - Snapshot store: publish aynı graph'ın önceki snapshot'larını değiştirir; `markStale` olay yayar.
   - `FamilyResultsViewer` freshness rozetini gösterir.
   - Run sonunda graph store'un güncel parmak izi run başındakinden farklıysa snapshot STALE olarak yayınlanır.
5. **Ortak HTTP katmanı.** Yeni `frontend/src/shared/api/http.ts`:
   - `API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'` (varsayılan davranış değişmez).
   - `ApiError extends Error { status; code?; correlationId?; fieldErrors: {field,message}[]; path? }`.
   - `requestJson<T>(path, init)` ve `requestBinary(path, init)`: `ok` kontrolü; gövde zod ile `ApiErrorResponse` olarak ayrıştırılır, JSON değilse `HTTP <status>`; `correlationId` yoksa header'dan alınır; `AbortSignal` desteklenir.
   - `formatApiError(e)` → `"<message> (Ref: <correlationId>)"`.
   - 9 servis ve 3 satır içi `fetch` bu katmana taşınır. Satır içiler kendi feature `api/` dosyalarına alınır.
6. **Loads sorguları.** Seismic ve Temperature, TanStack `useQuery` hook'larına taşınır (`features/loads/hooks/useSeismicSpectrum.ts`, `useUniformTemperature.ts`). Query key girdileri içerir; girdi geçersizse `enabled:false`; önceki veri tutulmaz (`placeholderData` yok).
7. **Birim kimliği.** `normalizeUnitId` (bugünkü `ProjectWorkspace.tsx:39-47` `unitCode`'u, mojibake dahil) modele taşınır (`projectWorkspace.ts`). `INITIAL_PROJECT.units` kimlik kullanır (`kNm`, `C`). `readProjectState` ve dosya açma normalize eder. Inspector'ın kaynak birimi normalize edilmiş kimlikten üretilir; dönüşüm hatası istisna olarak fırlamaz, input invalid işaretlenir.

**Uyumluluk:** Eski `.kopruq` dosyaları açılmaya devam eder. Eksik modüller D-1'e göre ele alınır. Eski uygulama yeni dosyadaki bilinmeyen `modules` anahtarlarını yok sayar (`validateProjectFile` onları kontrol etmiyor). localStorage anahtarları korunur, yalnızca 3 yeni anahtar eklenir.

---

## 4. Alternatifler

- **Radix `forceMount` ile sekmeleri mount'ta tutmak (C-010-03):** Sekme değişiminde kaybı önler. Ama ne proje dosyasına kaydı (A-01) ne de workspace geçişini çözer; ayrıca tüm Loads panellerini mount ederek istek tetikler. Reddedildi.
- **Her şeyi `App.tsx` state'ine taşımak:** ~25 prop'lu kabuğu büyütür, A-07/A-08 kapsamına girer. Bunun yerine localStorage destekli modül deposu ve tek hook seçildi; mevcut anahtarlar korunur, en küçük değişiklik budur.
- **Recent için `isSameEntry` eşleştirmesi (C-013-03):** Handle'sız açmada karşılaştırılacak handle yok. En basit güvenli çözüm, handle'sız kayıtta eski handle'ı devralmamak.
- **Seismic/Temperature için elle AbortController:** TanStack Query zaten bağımlılık olarak var ve key'e bağlı veri sunuyor; yarış durumunu daha az kodla çözüyor. Query seçildi.
- **Birim etiketlerini registry'de arama vs. kimliğe normalize etme:** Normalizasyon tek noktada, dosya ve depo verisini de düzeltiyor. Seçildi.

---

## 5. Fazlar (sıralı)

Genel kurallar: Her faz ayrı doğrulanır. Önce testler yazılır, kırmızı oldukları görülür, sonra düzeltme yapılır. Komutlar `frontend/` içinde çalıştırılır. Odaklı test için `npm test -- <yol>`.

Her fazın sonunda:
- `npm run build` exit 0.
- `npm test`: başarısız testler Faz 0 listesinin alt kümesi; yeni başarısız test yok; yeni testler yeşil. Baseline'dan yeşile dönen test raporlanır.
- `npm run lint` exit 0; değişen dosyalarda yeni oxlint uyarısı yok (baseline sayısıyla dosya bazında karşılaştırılır).

### Faz 0: Baseline (kod değişikliği yok)
- **Amaç:** Regresyonu önceden var olan hatadan ayırmak.
- **Adımlar:** `frontend/node_modules` yoksa durulur ve raporlanır; sessizce kurulum yapılmaz. `npm run build`, `npm test`, `npm run lint` çalıştırılır. Çıktılar `docs/features/frontend-remediation/baseline-vitest.md` (başarısız test listesi ve özet satırları), `baseline-lint.md` (dosya bazında uyarı sayıları) ve `baseline-build.md` dosyalarına yazılır. Liste §2.4 tablosuyla karşılaştırılır, farklar not edilir.
- **Kabul:** AC1.
- **Risk:** Yok. `vitest-errors.txt`'e dokunulmaz.

### Faz 1: Proje dosyası açma/kaydetme bütünlüğü (C-013-02, C-013-03, ek olarak C-001-01)
- **Değişecek dosyalar:** `shared/project-file/projectFileService.ts` (`modules` normalizasyonu, `modules.windLoads` şema kontrolü), `useProjectFile.ts` (önce tamamen oku/doğrula; apply ya da state adımlarında hata olursa `setRef(undefined)` ve dirty=true; `savedFingerprint` korunur), `recentProjects.ts` (handle verilmezse `previous.handle`/`sessionHandles` devralınmaz, kayıt `metadata-only` olur), `app/App.tsx:164` (Save/Save As hatası, `AbortError` hariç, mevcut `window.alert` deseniyle gösterilir; `App.tsx:77` ile aynı).
- **Korunacak davranışlar:** Rollback (`projectFileService.ts:41-51`), eşzamanlı değişiklikte dirty korunması (`useProjectFile.test.tsx:12`), download fallback'i, Save As'te gerçek handle adı.
- **Önce yazılacak testler:**
  - `projectFileService.test.ts`: "modules alanı olmayan geçerli dosya `modules:{}` olarak normalize edilir"; "modules.windLoads şekli bozuksa dosya reddedilir ve depoya hiçbir şey yazılmaz".
  - `useProjectFile.test.tsx`: "apply başarısız olursa ref sıfırlanır; ardından Save eski handle'ın `createWritable`'ını çağırmaz, `showSaveFilePicker`'ı çağırır"; "modules'suz dosya açılır, windLoads null olur".
  - `recentProjects.test.ts`: "X\Bridge.kopruq handle ile, ardından aynı adlı dosya handle'sız kaydedilince giriş `available:false` olur, handle devralınmaz" (jsdom'da IndexedDB yok, metadata yolu test edilir).
  - `App.test.tsx`: "Save hatası (Error('disk full')) kullanıcıya gösterilir; AbortError gösterilmez".
- **Kabul:** AC2, AC3, AC4.
- **Rollback:** 4 dosya geri alınır. Veri göçü yok.
- **Bağımlılık:** Faz 0.

### Faz 2: Proje kapsamlı veri round-trip (A-01, C-010-03, C-011-06, C-011-07)
- **Değişecek dosyalar:**
  - yeni `shared/project-file/projectModules.ts` (+ `useProjectModule`)
  - `projectFileService.ts` (build/validate/apply + modül rollback)
  - `projectFileTypes.ts` (modül tipleri)
  - `useProjectFile.ts` (`sessionId`, modüller fingerprint'e dahil)
  - `app/App.tsx` (`crossSectionValues` modülden; New Project tüm modülleri sıfırlar, girder için mevcut `savePrecastGirderDefinition([])` davranışı korunur; `WorkspacePage` key'ine `sessionId`)
  - `family-registry/model/familyRepository.ts` (`savePrecastGirderDefinition` ek olarak `kopruq:project-data-changed` yayar)
  - `loads/components/SelfWeightPermanent.tsx`, `traffic/TrafficLoadsPanel.tsx`, `seismic/SeismicPanel.tsx`, `temperature/UniformTemperaturePanel.tsx`, `wind/WindLoadsPanel.tsx`: localStorage yerine `useProjectModule`. Hesap ve istek mantığı bu fazda değişmez.
  - `preferred-span/components/PreferredSpanPanel.tsx`: yetim kurallar saklanır; görünür liste yalnızca güncel varyantlar; "N kural mevcut olmayan varyantlara ait (saklandı)" notu.
  - `project/components/ProjectDashboardPanel.tsx` + çağıranları `ProjectWorkspace.tsx:111` ve `router.tsx:102`: sabit `useState`'ler kaldırılır, `project` prop'undan salt okunur gösterilir; boşsa "Not defined".
- **Korunacak davranışlar:** Mevcut localStorage anahtarları ve şekilleri. `INITIAL_SELF_WEIGHT_INPUTS` ve tüm mühendislik varsayılanları aynen kalır. LM1 ilk değeri backend varsayılanından gelir. `kopruq.girder-library.precast` şekli değişmez. Eksik modül D-1'e göre (önerilen: New Project gibi sıfırla ve "Bu dosyada şu veriler yoktu: …" bildirimi göster).
- **Önce yazılacak testler:**
  - yeni `projectModules.test.ts`: read bozuk JSON'da `undefined` döner; write olay yayar; parse geçersizde fırlatır.
  - `projectFileService.test.ts`: tüm modüller için round-trip; "A'yı düzenle → modülsüz B'yi aç → A'nın seismic/wind/temperature/girder/span/crossSection değerleri görünmez"; "modül yazımı başarısız olursa önceki modüller ve graph/aileler geri yüklenir".
  - yeni `loads/components/LoadsPanel.test.tsx` (QueryClient wrapper, fetch stub): "Self Weight girdisi Traffic sekmesine geçip dönünce korunur"; "LM1 α override'ı Loads sekmesi değişince korunur".
  - yeni `preferred-span/components/PreferredSpanPanel.test.tsx`: "varyant kaldırılınca kural silinmez; varyant geri gelince min/max/delta/primary aynen döner".
  - yeni `project/components/ProjectDashboardPanel.test.tsx`: "ad, ülke ve durum project'ten gelir; 'Sibiu-Pitesti-Lot2' görünmez".
  - `App.test.tsx`: "New Project modülleri sıfırlar ve dirty false olur".
- **Kabul:** AC5, AC6, AC7, AC8, AC9.
- **Risk:** GirderLibraryPanel mount'ta depoya yazıyor (C-004-08). Açmak dirty yapabilir; davranış değişmez, raporlanır. Remount mevcut sekmenin geçici UI durumunu sıfırlar (beklenen).
- **Rollback:** Yeni anahtarlar zararsızca kalabilir; dosyalar geri alınır.
- **Bağımlılık:** Faz 1.

### Faz 3: Wind snapshot ve STALE (C-010-04, B-2 wind kısmı)
- **Değişecek dosyalar:** `loads/components/LoadsPanel.tsx` (snapshot gerçek girdilerle), `wind/WindLoadsPanel.tsx` (STALE rozeti; Details snapshot girdilerini gösterir; `status!=='VALID'` ise `—` ve `missing`; `!res.ok` ise gövdedeki `message` ya da `HTTP n` hatası, önceki snapshot korunur ama "hata" olarak etiketlenir), `projectFileTypes.ts` (`WindCalculationSnapshot.result` tipi `WindResult`).
- **Korunacak davranışlar:** İstek gövdesi ve `drefM: 3` aynen; `CATEGORIES`; EN 1991-1-4 metinleri.
- **Önce yazılacak testler:** yeni `wind/WindLoadsPanel.test.tsx`:
  - "Calculate sonrası snapshot.inputs = {vb, terrain, ze, deckWidthM, drefM:3}"
  - "vb değişince STALE görünür ve sonuç 'güncel' olarak sunulmaz"
  - "deckWidthM (crossSection) değişince STALE"
  - "INVALID yanıt: missing metni görünür, z0M/kr satırları '—'"
  - "HTTP 400 yanıtı: backend message görünür"
- **Kabul:** AC10, AC11.
- **Bağımlılık:** Faz 2. Faz 7 hata ayrıştırmasını ortak katmana taşır.

### Faz 4: Mekanik gösterim ve birim düzeltmeleri (C-004-01, C-003-01, C-012-01)
Üçü de **mekanik**; mühendislik kararı gerektirmez. Formül değişmez, yalnızca birim kimliği, dönüşüm sırası ve etiket düzelir.
- **Değişecek dosyalar:**
  - `family-tables/model/graphFamilyPresentation.ts`: `kr` kontrolü önce. `parameterRangeDisplay(values, localUnit, units)` saf fonksiyonu eklenir: birim türüne göre kanonik değer proje birimine çevrilir, etiket proje birimi olur; aralık yoksa yerel değer de kanoniğe ve oradan proje birimine çevrilir.
  - `family-tables/components/FamilyResultsViewer.tsx:27,29`: bu fonksiyonu kullanır.
  - `project/model/projectWorkspace.ts`: `normalizeUnitId`, `INITIAL_PROJECT.units` kimliklerle, `readProjectState` normalize eder.
  - `project/components/ProjectWorkspace.tsx`: `unitCode` yerine `normalizeUnitId` import edilir.
  - `shared/project-file/useProjectFile.ts` (open'da `projectState.project.units` normalize edilir).
  - `graph/ui/EngineeringNodeInspector.tsx:108-109`: kaynak birim kimlikten; dönüşüm try/catch ile, hata durumunda commit edilmez ve invalid gösterilir.
- **Korunacak davranışlar:** `toFixed(2)` hassasiyeti (C-006-06 kapsam dışı). Görünen birim etiketleri (`kN·m`, `°C`) aynı. `UNIT_LABELS` seçici gösterimi aynı.
- **Önce yazılacak testler:**
  - `graphFamilyPresentation.test.ts`: `units {force:'kN',length:'mm',moment:'kNmm'}`, kanonik `stiffness.kx=1000` → `"1.00"` (kN/mm); `stiffness.krx=1000` → `"1000000.00"` (kN·mm/rad). Ayrıca `parameterRangeDisplay`: length mm, kanonik 1.6 → `"1600.00"`, etiket `mm`. (Beklenen değerler uygulayıcı tarafından `quantities.ts` dönüşüm tablosuyla yeniden türetilip doğrulanmalı; tablo değeri uydurulmaz.)
  - yeni `project/model/projectWorkspace.test.ts`: `'kN·m'`, `'kNÂ·m'`, `'°C'` → `kNm`, `C`; `INITIAL_PROJECT.units.moment === 'kNm'`.
  - `NodeInspector.test.tsx`: "INITIAL_PROJECT birimleriyle bearing krx girişi istisna atmadan kanonik değeri kaydeder" (dosyada baseline hataları var; yeni test ayrıca yeşil olmalı).
- **Kabul:** AC12, AC13, AC14.
- **Risk:** localStorage'daki proje birimleri kimliğe yeniden yazılır. Geri uyumlu, çünkü `displayUnit` hem kimlik hem etiket kabul ediyor (`quantities.ts:26`).
- **Bağımlılık:** Faz 0 (Faz 2'den bağımsız; Faz 2 sonrası önerilir).

### Faz 5: Mühendis onaylı hesap düzeltmeleri (C-005-01, C-006-01, C-016-01). Onay gelmeden uygulanmaz
- **Mekanik mi:** Hayır. Üçü de mühendislik çıktısını değiştirir. CLAUDE.md "never invent" kuralı gereği mühendis formülü veya politikayı onaylamalı, kaynak ve referans örnek vermelidir.
- **Geçici davranış (onay gelene kadar):** Kod değişmez. `docs/architecture.md`'ye "doğrulanmamış" notu düşülür (Faz 9).
- **Onaydan sonra:**
  - `graph/domain/girderCandidates.ts:17` (Q1)
  - `graph/domain/pierSectionProperties.ts:19` (Q2)
  - `shared/ui/generation.ts` (Q3; indeksten adım + onaylı hassasiyet; yinelenen değer politikası)
- **Önce yazılacak testler:** `girderCandidates.test.ts`, `pierSectionProperties.test.ts`, `ParamSweepCard.test.ts`. Değerler mühendisin verdiği referans örnekten, birimleri ve kaynağıyla.
- **Kabul:** AC15 (koşullu).
- **Bağımlılık:** Q1–Q3 cevapları. Ek not: C-005-01 düzeltmesinin Graph yolunda etkili olması A-05'e (anahtar uyumsuzluğu) bağlı; A-05 kapsam dışı.

### Faz 6: Graph bayat sonuçlar (C-008-01, C-006-02, C-006-03, C-006-04)
- **Değişecek dosyalar:**
  - `graph/family/familyResults.ts`: `graphFingerprint(graph, units?)`.
  - `graph/family/graphRunValidity.ts`: geçişli `nodeFingerprint`, birimler, `stableStringify`.
  - `graph/family/familySnapshotStore.ts`: publish graph bazında değiştirir; `markStale` olay yayar.
  - `graph/ui/GraphWorkspace.tsx`: `executionDisplay.outputs`; `:47` deps'e `project.units`; `:422` imzaya birimler; run sonunda store'daki güncel graph ile karşılaştırma.
  - yeni `graph/ui/executionDisplay.ts`.
  - `adapters/reactFlowAdapter.ts:114`: `nodeRunValidity(graph,id,units)`.
  - `family-tables/components/FamilyResultsViewer.tsx`: kaynak başına freshness rozeti; STALE/FAILED adaylar "geçerli" sunulmaz.
  - `app/App.tsx` / `useProjectFile.ts`: Open ve New'de `clearFamilySnapshots` + `clearSuccessfulGraphRuns`.
- **Korunacak davranışlar:** Run, abort ve log akışı; snapshot şekli (`FamilyCalculationSnapshot`).
- **Önce yazılacak testler:**
  - `graphRunValidity.test.ts`: "üst Range parametresi değişince alt düğüm `nodeRunValidity` false"; "kenar yeniden bağlanınca false"; "proje length m→mm değişince `graphRunValidity` INVALID".
  - `familyResults.test.ts`: "birim farkı parmak izini değiştirir".
  - `familySnapshotStore.test.ts`: "yeniden publish silinen düğümün snapshot'ını kaldırır"; "markStale `kopruq:family-snapshots-changed` yayar".
  - yeni `graph/ui/executionDisplay.test.ts`: "dirty iken outputs/states/errors/resolvedInputs boş".
  - yeni `family-tables/components/FamilyResultsViewer.test.tsx`: "STALE snapshot 'STALE' rozetiyle gösterilir".
  - `useProjectFile.test.tsx`: "open sonrası snapshot store boş".
- **Kabul:** AC16, AC17, AC18, AC19.
- **Risk ve göç:** Parmak izi biçimi değiştiği için kayıtlı başarılı run'lar (`kopruq.graph.successful-runs.v1`) INVALID görünür ve yeniden Run gerekir. Bu güvenli yön.
- **Bağımlılık:** Faz 0. Faz 2'deki `sessionId` ile çakışmaması için Faz 2 sonrası önerilir.

### Faz 7: Ortak HTTP katmanı ve hata sözleşmesi (A-09, B-1, B-4)
- **Değişecek dosyalar:**
  - yeni `shared/api/http.ts`
  - 9 servis: `bridge-alternatives/api/alternativesService.ts`, `layout-generator/api/layoutService.ts`, `kopruq-fast-solver/api/fastSolverService.ts`, `loads/api/trafficLoadsService.ts`, `loads/api/temperatureService.ts`, `terrain-viewer/api/terrainViewerService.ts`, `terrain-dtm/api/terrainImportService.ts`, `landxml-import/api/landXmlImportService.ts`, `graph/api/graphMaterialService.ts`. Yerel `API_BASE` export'ları kaldırılır; Grep'e göre hiçbir yerde import edilmiyorlar.
  - satır içi çağrılar servise taşınır: yeni `loads/api/windLoadsService.ts`, `loads/api/seismicService.ts`; `terrain-viewer/api/terrainViewerService.ts`'e diagnostics fonksiyonu (`TerrainMesh.tsx:59`).
  - `terrain-dtm/components/TerrainDtmPanel.tsx`: `status` ve `warnings`; REVIEW_REQUIRED uyarı bandı. `onImported` davranışı D-3'e göre (önerilen: mevcut gibi çağrılır, uyarıyla).
  - `layout-generator/components/SiteLayoutPanel.tsx` ve `bridge-alternatives/components/GenerateWorkflow.tsx`: `ApiError.fieldErrors` adı eşleşirse react-hook-form `setError` ile alana, eşleşmezse liste olarak; correlationId gösterilir.
- **Korunacak davranışlar:** URL'ler, method'lar, gövdeler, multipart; `graphMaterialService` kimlik ve özellik doğrulaması; `decodeTerrainMesh`.
- **Önce yazılacak testler:**
  - yeni `shared/api/http.test.ts`: tam `ApiErrorResponse` (`INVALID_REQUEST` + `errors[]`) `ApiError`'a eşlenir; JSON olmayan 502 → `HTTP 502`; gövdede correlationId yoksa header'dan alınır; abort sinyali iletilir; `VITE_API_BASE` yoksa varsayılan `http://localhost:8080`.
  - yeni `terrain-dtm/components/TerrainDtmPanel.test.tsx`: "REVIEW_REQUIRED ve warnings görünür".
  - yeni `layout-generator/components/SiteLayoutPanel.test.tsx`: "400 `errors[{field:'minSpanM'}]` ilgili alanda görünür".
- **Kabul:** AC20, AC21, AC22.
- **Bağımlılık:** Faz 0. Faz 3 ve 8'den önce yapılırsa onların hata kodu bu katmanı kullanır; sıra değişirse Faz 3'teki yerel ayrıştırıcı burada kaldırılır.

### Faz 8: Loads girdi doğrulama ve yarış (C-010-01, C-010-02, B-2 seismic, B-3)
- **Değişecek dosyalar:** yeni `loads/hooks/useSeismicSpectrum.ts` ve `useUniformTemperature.ts`; `seismic/SeismicPanel.tsx`; `temperature/UniformTemperaturePanel.tsx`; `traffic/Lm1Panel.tsx` (metin tamponu; commit yalnızca blur/Enter'da ve sonlu sayıda; boş ya da geçersiz → `aria-invalid`, commit yok; satır başına "EN varsayılanına dön" düğmesi `useLm1Defaults` değerini ve provenance'ını geri yükler).
- **Korunacak davranışlar:** İstek gövdeleri; formül metinleri; grafik; α için yeni aralık sınırı eklenmez (Q4).
- **Önce yazılacak testler:**
  - yeni `seismic/SeismicPanel.test.tsx` (ertelenmiş fetch'ler): "eski yanıt yeni girdinin sonucunu ezmez"; "HTTP 500 mesajı görünür"; "girdi boşalınca grafik ve değerler temizlenir, istek atılmaz"; "INVALID → 'INVALID' durumu, 0 değerleri gösterilmez".
  - yeni `temperature/UniformTemperaturePanel.test.tsx`: "sıra dışı yanıtlarda son girdinin sonucu"; "INVALID'de missingParameters listelenir".
  - yeni `traffic/Lm1Panel.test.tsx`: "'0.8' yazılınca 0.8 commit edilir"; "boş bırakılınca commit yok, invalid"; "reset varsayılan değeri ve provenance'ı geri getirir".
- **Kabul:** AC23, AC24, AC25.
- **Bağımlılık:** Faz 2 (modül hook'ları), Faz 7.

### Faz 9: Dokümantasyon
- `docs/architecture.md` ve `docs/roadmap.md` güncellenir (CLAUDE.md çalışma yöntemi): proje modülleri listesi, HTTP katmanı ve `VITE_API_BASE`, freshness kuralları, Faz 5'in durumu ve doğrulanmamış formüller.
- **Kabul:** AC26.

---

## 6. Kabul kriterleri

- **AC1:** Faz 0 çıktıları üç baseline dosyasında kayıtlı; başarısız test listesi açıkça yazılı.
- **AC2:** `modules`'suz dosya açılınca çökme yok. Açma herhangi bir adımda başarısız olursa `ref` boşalır ve sonraki Save önceki dosyaya yazmaz.
- **AC3:** Handle'sız açılan dosyanın Recent girişi başka bir dosyanın handle'ını taşımaz.
- **AC4:** Save/Save As hatası kullanıcıya gösterilir; kullanıcı iptali gösterilmez.
- **AC5:** §3'teki 8 modül `.kopruq` dosyasına yazılır ve açılınca birebir geri gelir (round-trip).
- **AC6:** A'yı düzenleyip B'yi açınca A'nın modül değerleri hiçbir ekranda görünmez. Eksik modül D-1'e göre ele alınır ve bildirilir.
- **AC7:** Self Weight ve LM1 düzenlemeleri sekme ya da workspace değişiminde ve sayfa yenilemede korunur.
- **AC8:** Preferred Span kuralı, varyantı geçici olarak kaybolsa da silinmez.
- **AC9:** Dashboard proje verisini gösterir; sabit "Sibiu-Pitesti-Lot2" yok.
- **AC10:** Wind snapshot gerçek girdileri içerir. Girdi ya da deck genişliği değişince STALE gösterilir; Details snapshot girdilerini gösterir.
- **AC11:** Wind INVALID ve HTTP hatası görünür; sıfır değerler geçerli sonuç gibi sunulmaz.
- **AC12:** Family tablosunda dönme rijitliği dönme birimiyle dönüştürülür.
- **AC13:** Family parametre aralıkları proje birimiyle ve doğru etiketle gösterilir.
- **AC14:** Varsayılan proje birimleriyle Inspector rijitlik girişi istisna atmaz; birimler kimlik olarak saklanır ve eski etiketler normalize edilir.
- **AC15 (koşullu):** Mühendis onayı varsa C-005-01, C-006-01 ve C-016-01 referans testleriyle uygulanır. Onay yoksa ilgili kodda değişiklik yoktur.
- **AC16:** Dirty graph'ta önceki Run çıktıları canvas'ta ve inspector'da gösterilmez.
- **AC17:** Proje birimi değişince graph run'ı INVALID olur.
- **AC18:** Üst düğüm ya da bağlantı değişince alt düğüm SUCCESS göstermez.
- **AC19:** Family görünümü STALE ve FAILED snapshot'ları rozetle gösterir. Silinen düğüm snapshot'ı kalmaz. Open ve New sonrası eski snapshot görünmez.
- **AC20:** Frontend'de `localhost:8080` yalnızca `shared/api/http.ts`'te varsayılan olarak geçer; tüm istekler bu katmandan geçer.
- **AC21:** Backend hatasında kullanıcı `message`'ı ve correlationId'yi görür; `INVALID_REQUEST` alan hataları ilgili alanlarda ya da listede görünür.
- **AC22:** XYZ terrain import `status` ve `warnings` gösterir; REVIEW_REQUIRED belirgin şekilde işaretlenir.
- **AC23:** Seismic ve Temperature'da ekrandaki sonuç her zaman ekrandaki girdilere aittir; hatalar görünür.
- **AC24:** Seismic ve Temperature INVALID sonuçları sıfır ya da geçerli değer gibi sunulmaz; Temperature `missingParameters` gösterir.
- **AC25:** LM1 α boşken 0 olarak yazılmaz; ondalık giriş yapılabilir; EN varsayılanına dönüş mümkün.
- **AC26:** `docs/architecture.md` ve `docs/roadmap.md` güncel.
- **AC27 (genel):** Her fazdan sonra build ve lint exit 0. Başarısız test kümesi Faz 0 kümesinin alt kümesi. Yeni npm bağımlılığı yok, backend değişikliği yok, yeni mühendislik değeri yok.

## 7. Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Faz 0 komutları | Dosyalar mevcut; liste §2.4 ile karşılaştırılmış |
| AC2 | `npm test -- src/shared/project-file` | Faz 1 testleri yeşil |
| AC3 | `npm test -- src/shared/project-file/recentProjects.test.ts` | Yeşil |
| AC4 | `npm test -- src/app/App.test.tsx` | Yeni test yeşil; başarısızlar yalnızca baseline'daki test |
| AC5, AC6 | `npm test -- src/shared/project-file` | Round-trip ve izolasyon testleri yeşil |
| AC7 | `npm test -- src/features/loads` | Yeşil |
| AC8 | `npm test -- src/features/preferred-span` | Yeşil |
| AC9 | `npm test -- src/features/project` | Yeşil |
| AC10, AC11 | `npm test -- src/features/loads/components/wind` | Yeşil |
| AC12, AC13 | `npm test -- src/features/family-tables` | Yeşil |
| AC14 | `npm test -- src/features/project src/features/graph/ui/NodeInspector.test.tsx` | Yeni testler yeşil; NodeInspector'da yalnızca baseline'daki başarısızlar |
| AC15 | Mühendis cevabı + Faz 5 testleri | Onay varsa yeşil; yoksa `git diff` ilgili 3 dosyada boş (koordinatör kontrolü) |
| AC16–AC19 | `npm test -- src/features/graph src/features/family-tables src/shared/project-file` | Yeşil (baseline hariç) |
| AC20 | Grep `localhost:8080` `frontend/src` | Tek eşleşme `shared/api/http.ts` |
| AC21 | `npm test -- src/shared/api src/features/layout-generator` | Yeşil |
| AC22 | `npm test -- src/features/terrain-dtm` | Yeşil |
| AC23–AC25 | `npm test -- src/features/loads` | Yeşil |
| AC26 | Doküman diff incelemesi (koordinatör) | Bölümler güncel |
| AC27 | `npm run build`, `npm test`, `npm run lint` | exit 0 / alt küme / exit 0, yeni uyarı yok |

**Bilinmeyenler:** CI workflow'u bulunamadı (review raporu). Gerçek tarayıcıda File System Access API ve IndexedDB davranışı jsdom'da test edilemiyor; manuel doğrulama önerilir (Chromium'da Open → Save → Recent). Backend çalışırken uçtan uca kontrol (correlationId gösterimi) manuel yapılmalı.

## 8. Riskler

- **Veri:** Faz 2 açma akışını değiştiriyor. Rollback testleri olmadan uygulanmamalı. Eski dosyaları açma kararı (D-1) kullanıcıya bildirilmeli.
- **Göç:** Faz 4 birim normalizasyonu localStorage'a yazar (geri uyumlu). Faz 6 kayıtlı run geçerliliklerini düşürür (yeniden Run gerekir). Faz 2 üç yeni localStorage anahtarı ekler. Hiçbir fazda backend veya dosya `schemaVersion` değişmiyor.
- **Remount:** Faz 2'deki `sessionId` key'i open ve new anında tüm workspace'i yeniden kurar. Graph seçim durumu sıfırlanır (beklenen).
- **Test kırılganlığı:** `App.test.tsx` ağır ve bir baseline hatası taşıyor. Yeni testler mümkün olduğunca birim ya da bileşen düzeyinde tutulmalı.
- **Güvenlik/gizlilik:** correlationId kullanıcıya gösterilir; kimlik doğrulama bilgisi değil (backend yalnızca `[A-Za-z0-9-]{1,64}` kabul ediyor). Hata mesajları backend'in mesajlarıdır; 500'de genel mesaj gelir.
- **Mühendislik güvenliği:** Faz 5 dışındaki fazlar hesap sonucu değiştirmez; yalnızca gösterim, birim ve tazelik düzelir. Faz 4 bir mühendislik değerini değiştirmeye kayarsa durulur.
- **Rollback:** Her faz kendi dosya kümesiyle ayrılabilir. Uygulayıcı git işlemi yapmaz; geri alma koordinatör ya da kullanıcı kararıdır.

## 9. Varsayımlar, sorular

**Varsayımlar:**
- Review'daki satır numaraları güncel kodla eşleşti (yukarıdaki tablo yeniden okunarak doğrulandı). Review'dan beri frontend kodu değişmemiş görünüyor (`backend-remediation/implementation.md:4`: "Frontend dosyası değişmedi").
- Radix Tabs pasif içeriği unmount eder (kütüphane varsayılanı; çalıştırılmadı).
- `tsconfig`'deki `types:["vite/client"]` `import.meta.env.VITE_API_BASE` erişimini tip açısından karşılar.
- A-05 (precast anahtar uyumsuzluğu) yeniden doğrulanmadı.

**Kullanıcı (yazılım) kararları.** Engelleyici değil, önerilen varsayılanlarla ilerlenir:
- **D-1 (Faz 2):** Açılan dosyada yeni modüller yoksa: önerilen, New Project gibi sıfırla ve bildirim göster. Alternatif: mevcut yerel değerleri koru (A-01 sızıntısını sürdürür).
- **D-2 (Faz 1):** Handle'sız açılan dosyanın Recent girişi `metadata-only` olur; Recent'ten açarken dosyanın yeniden seçilmesi gerekir. Önerilen bu.
- **D-3 (Faz 7):** Terrain REVIEW_REQUIRED (ör. 0 üçgen) olsa da projeye bağlanır mı? Önerilen: bağlanır (mevcut davranış) ve uyarı gösterilir.
- **D-4 (Faz 2):** Dashboard'daki sabit proje değerleri ("Sibiu-Pitesti-Lot2", "Romania", "Continue...") kaldırılıp proje verisine bağlanır. Onay istenir; önerilen bu.
- **D-5 (Faz 7):** `VITE_API_BASE` env değişkeni eklenir; varsayılan değişmez.

**Mühendis kararı gereken sorular:**

| # | Soru | Etkilenen faz | Güvenli geçici davranış |
|---|---|---|---|
| Q1 | Precast girder `Wy`, `Iy / (bmax/2)` mi olmalı? Bugün `Iy / (2·bmax)` hesaplanıyor, steel `Iy/(bmax/2)`. Kaynak ve sayısal referans örneği (birimleriyle) rica edilir. | Faz 5 (C-005-01) | Kod değişmez; dokümanda "doğrulanmamış" |
| Q2 | Oval pier: düz kısım D yönündeyken `Wx = Ix/(D/2)`, `Wy = Iy/(B/2)` mi? B/D eksen konvansiyonu (A-03 ile bağlantılı) nedir? Referans örnek. | Faz 5 (C-006-01) | Kod değişmez |
| Q3 | Parametrik taramada üretilen uzunluklar 0,01 m ızgarasına yuvarlanmalı mı (0,125 → 0,13)? İzin verilen çözünürlük nedir? Yuvarlamadan doğan yinelenen adaylar elenmeli mi? | Faz 5 (C-016-01) | Kod değişmez |
| Q4 | LM1 α düzeltme katsayıları için geçerli aralık var mı (ör. >0, üst sınır)? | Faz 8 (C-010-02) | Yalnızca "sonlu sayı" kontrolü; aralık uygulanmaz |
| Q5 | (Bilgi, kapsam dışı) Wind `drefM = 3` ve diğer kaynaksız sabitler (A-06) için kaynak. | Bu planda yok | Değer aynen korunur |
