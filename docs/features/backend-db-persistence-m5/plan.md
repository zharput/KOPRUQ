# Plan: backend-db-persistence-m5 (frontend geçişi) — revizyon 2, kullanıcı cevaplarıyla

**Sonuç: READY.** Kullanıcı üç soruyu yanıtladı (9.3). Kalan bir mühendislik sorusu yok:
- WindResult'ın şekli, birimleri ve null olabilirliği frontend tiplerinden ve backend `WindResult`/`WindLoadsService` kodundan tamamen belli (bkz. Bölüm B).
- Q1 kararı (`windLoads.result` saklanır) için bir **önkoşul feature** gerekiyor: `backend-db-persistence-m3b`. Backend'e ek olarak M4 mapper'ını ve fixture'ını da kapsıyor ve bu belgenin **Bölüm B**'sinde ayrıca planlandı.
- Bağımlılık: **yalnızca M5c, m3b'ye bağlı.** M5a ve M5b m3b'den bağımsız ilerleyebilir.

Okunan kaynaklar: `.claude/workflows/feature.md`, `.claude/project-context.md`, `CLAUDE.md`, üst plan `docs/features/backend-db-persistence/plan.md` (K1–K9, 3.2, 3.4, M5, AC17–AC27, 8, 9.2), yerine geçilen `docs/features/frontend-backend-persistence/plan.md`, M1–M4 plan ve implementation dosyaları, M4 `review.md` (PASS), `docs/architecture.md` 3090–3101 ve 3210–3277, `docs/roadmap.md` 1840–1922. Gerçek kaynak kod da okundu. Satır numaraları HEAD `b2a78e3`'e göredir.

---

# BÖLÜM A — M5 planı

## 1. Amaç ve kapsam dışı olanlar

**Amaç (M5)**
- M4'te yazılmış ama hiçbir yerden kullanılmayan altyapıyı uygulamaya bağlamak: `shared/project-store/*`, 7 wire mapper, `app/project-session/projectDocument.ts`. Proje verisi backend'den okunur ve bölüm bazında write-through autosave ile yazılır (K1–K4).
- Production frontend'den şunları tamamen kaldırmak:
  - `localStorage`, `sessionStorage`, `indexedDB`/`IDBDatabase`
  - File System Access API (`showOpenFilePicker`, `showSaveFilePicker`, `FileSystemFileHandle`)
  - `'storage'` event dinleyicileri
  - `.kopruq` kodu ve UI'ı
  - Recent için kullanılan IndexedDB
- Proje listesi, Open, New (isim diyaloğu ile), Recent, kaydetme durumu göstergesi, 409/hata/400 bantları (Retry/Discard/Reload), `?project=<uuid>` URL'si ve `pendingKeys()` tabanlı `beforeunload`.
- Rüzgâr snapshot'ının **sonucu dahil** saklanması ve yeniden açılınca aynen gösterilmesi (Q1; m3b'den sonra, M5c'de).
- Test göçü, `src/test/architecture/noBrowserStorage.test.ts`, dokümanlar.

**Kapsam dışı**
- M5'in kendisinde backend değişikliği yok. Gereken backend işi önkoşul `backend-db-persistence-m3b`'de (Bölüm B).
- Yeni npm bağımlılığı yok. M5'te yeni endpoint yok.
- Eski tarayıcı verisinin ya da `.kopruq` dosyalarının taşınması; Import/Export.
- Auth, çevrimdışı mod, proje silme UI'ı, graph silme.
- Rüzgâr sonucu dışındaki hesaplanmış durumların saklanması: `graphRunValidity`, family snapshot'ları, kural/yerleşim/analiz sonuçları.
- Terrain'in proje UUID'sine bağlanması. `router.tsx:147` aynen kalır.
- Mühendislik kuralı, varsayılan değer veya birim dönüşümü eklemek ya da değiştirmek. Mevcut fallback sabitleri olduğu gibi kullanılır.
- Üst plan değiştirilmez. Q4'ün (yalnızca girdiler) kullanıcı tarafından değiştirildiği m3b'de belgelenir.

---

## 2. Mevcut mimari (doğrulanmış)

### 2.1 M4 API'leri

- **`shared/project-store/projectSession.ts`**
  - Snapshot: `{epoch, projectId, revision, status, pendingCount, failedKey, lastError}`.
  - `begin` ve `end` `epoch`'u artırır.
- **`shared/project-store/writeQueue.ts`**
  - API: `enqueue`, `reportLocalRejection`, `flush`, `retry`, `discard`, `drop`, `reset`, `dispose`, `pendingKeys()`.
  - Debounce süresi `SAVE_DEBOUNCE_MS = 300`.
  - Kuyruk session epoch'una bağlıdır; `enqueue` önce epoch'u senkronlar (H1).
  - 409 → `conflict` (yapışkan), 400/422 → `rejected`, diğer hatalar → `error`.
  - Proje yokken `enqueue` hata fırlatır (:179).
- **`shared/project-store/serverSection.ts`**
  - Bölüm ve koleksiyon. Proje yokken `write` `false` döner (:82, :164).
  - `hydrate` `toWire` çağırır ve hata fırlatabilir (:107).
  - Koleksiyon silmeyi reddeder (:176).
  - **F1:** wire değişmediyse `write` `true` döner ama aynayı güncellemez (:93). Bu yüzden bridge definition'ın yalnızca UI'da kullanılan alanları (`selectedBridgeId`, `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`) bölüm içinde kalırsa değişiklik kaybolur.
- **`projectApi.ts`:** `listProjects`, `createProject`, `getProjectDocument`, `putSection`, `projectApi`, `SectionEnvelopeError`.
- **`app/project-session/projectDocument.ts`:** `loadProjectDocument`, `PROJECT_SECTION_DEFINITIONS` (16), `GRAPH_COLLECTION_DEFINITION`, `createProjectRequestBody`. Fixture'lar: `CANONICAL_PROJECT_DOCUMENT_JSON`, `NEW_PROJECT_DOCUMENT_JSON`.
- **F2 (döngüsel import riski):** `projectWorkspaceWire.ts:4`, `./projectWorkspace`'ten değer import ediyor. Store tarafı bu wire'ı import ettiğinde çalışma zamanında döngü oluşur.
- **F3 (döngüsel tip):** `loadsWire.ts:4,12–15` tiplerini `typeof SEISMIC_INPUTS_MODULE.read` üzerinden türetiyor. Modül bölüm üzerine kurulduğunda tip kendine referans verir.
- **Rüzgâr (m3b öncesi):** `loadsWire.ts:16–17,70–90` `result`'ı atıyor (`WindSnapshotInputsValue`). Backend `WindSnapshotDto` (`LoadInputDtos.java:46`) `result`'ı reddediyor (`ProjectLoadGraphApiContractTest.java:524–534`). Bölüm B bunu değiştiriyor.
- **M4 review nitleri:** `section.hydrate` yerel reddi düşürmüyor; `rejectedKeys` budanmıyor; `setRevision` dinleyicisi içinde `begin` sorunu; `guard` `fromWire` hatasını yutuyor; `AbortSignal` yok; `bridgeDefinitionWire.ts:49` yolunda sondaki nokta.

### 2.2 Production'da tarayıcı depolaması

20 dosya; `main.tsx` dolaylı olarak.

| Dosya | Satırlar | Ne yapıyor |
|---|---|---|
| `shared/project-file/projectModuleStore.ts` | 32, 41, 42, 49 | modül okuma/yazma; `PROJECT_MODULE_CHANGED_EVENT`, `PROJECT_DATA_CHANGED_EVENT` |
| `shared/project-file/useProjectModule.ts` | 8, 18–19 (`'storage'`) | ham-string önbellek |
| `shared/persistence/legacyStorageMigration.ts` | 11–17 (çağıran: `main.tsx:4,6`) | `spanova.*` → `kopruq.*` |
| `app/App.tsx` | 98 (ayrıca 19–21, 72, 79–102, 119) | Recent yeniden seçimi; `.kopruq` akışları |
| `app/project-file/recentProjects.ts` | 2, 6, 8–12, 17, 25, 32, 50–52 | IndexedDB `kopruq-project-files`, metadata anahtarı |
| `app/project-file/projectFileService.ts` | 11, 57, 59, 129 | `kopruq.backup.*`, `showSaveFilePicker` |
| `app/project-file/projectDataContract.ts` | 69, 71, 74 | modül snapshot/restore |
| `app/project-file/projectModules.ts` | 7 (yorum) | kayıt defteri |
| `features/family-registry/model/familyRepository.ts` | 28, 33–34, 41, 43, 55, 76–77 (`'storage'`) | kataloglar + girder |
| `features/family-registry/hooks/useFamilyCatalog.ts` | 15, 29 | okurken yazma |
| `features/family-registry/model/registry.ts` | 19, 49, 51 | ham okuma |
| `features/bridge-definition/model/store.ts` | 45, 62 | bridge definitions |
| `features/bridge-definition/components/BridgeDefinitionWorkspace.tsx` | 50, 73 (`'storage'`) | ham preferred-span okuması |
| `features/system-assembly/components/SystemAssemblyPanel.tsx` | 41–43 (`'storage'`), 60 | ham preferred-span okuması |
| `features/preferred-span/components/PreferredSpanPanel.tsx` | 30, 71–72 (`'storage'`) | ham girder okuması |
| `features/pier-families/components/PierFamiliesPanel.tsx` | 17 | fallback (F7) |
| `features/project/model/projectWorkspace.ts` | 83, 90 | workspace |
| `features/graph/state/graphStore.ts` | 32, 54, 85–86 (`'storage'`), 100 | graph dokümanları; birim okuma |
| `features/graph/state/graphViewPreferences.ts` | 8, 14 | görünüm tercihi |
| `features/graph/family/graphRunValidity.ts` | 8, 23, 26 | başarılı çalıştırmalar |

`sessionStorage` hiçbir yerde yok.

### 2.3 Senkron okuma API'lerinin tüketicileri (test dışı)

- **`readProjectState`:** `App.tsx:53`, `registry.ts:53`, `graphStore.ts:100`, `GraphWorkspace.tsx:143`, `FamilyResultsViewer.tsx:22,25`, `FamilyWorkspaceShell.tsx:9`, `CircularPierFamilyPreview.tsx:21,34`, `PierFamilyPreview.tsx:25,53`, `PrecastGirderFamilyPreview.tsx:27–29`, `PrecastGirderSectionProperties.tsx:18`, `features/project/index.ts:5`.
- **`getFamilyRecords` / `getPrecastGirderDefinition`:** `BridgeDefinitionWorkspace.tsx:52–53`, `SystemAssemblyPanel.tsx:59,61–63,80`, `MaterialsPanel.tsx:38,45`, `GirderLibraryPanel.tsx:61`, `registry.ts:30,35`.
- **`useFamilyCatalog`:** Bearing:15, Foundation:19, PierCap:13, Pier:23. Fallback'i olan yalnızca Pier.
- **`useProjectModule`:** `App.tsx:70`, `WindLoadsPanel.tsx:17`, `TrafficLoadsPanel.tsx:34`, `SelfWeightPermanent.tsx:89`, `UniformTemperaturePanel.tsx:11`, `SeismicPanel.tsx:12`, `PreferredSpanPanel.tsx:60`.
- **Bridge-definition store:** `App.tsx:37,55–56,66,81`.
- **graphStore:** `GraphWorkspace.tsx:9,73` (mount'ta persist), `79`, `93`, `148`.
- **Event'ler:**
  - `PROJECT_DATA_CHANGED_EVENT`: tek dinleyici `useProjectFile.ts:14`.
  - `kopruq:project-units-changed`: yayan `App.tsx:54`, dinleyen `FamilyResultsViewer.tsx:25`.
  - `*-catalog-changed`: dinleyenler `BridgeDefinitionWorkspace.tsx:73`, `SystemAssemblyPanel.tsx:41–43`.
- **Rüzgâr akışı:**
  - `App.tsx:71`: `windLoads` yalnızca bellekte; eskiden `.kopruq` dosyasında `result` ile birlikte saklanıyordu.
  - `WindLoadsPanel.tsx:19–28`: hesapla → `onSnapshot({schemaVersion:1,status,inputs,result})`; hata alınırsa snapshot değişmez.
  - STALE durumu girdi karşılaştırmasıyla hesaplanır (`:27`). Gösterim yalnızca `current && valid` iken yapılır (`:28`).

### 2.4 Okuma ya da mount sırasında yazan kod

- **`useFamilyCatalog.ts:15,29`:** okurken yazıyor; kaldırılacak.
- **`MaterialsPanel.tsx:45`:** ilk mount'ta bir kez yazıyor (G3 kararı; `MaterialsPanel.test.tsx:36–47`).
- **`GirderLibraryPanel.tsx:65–68`:** mount dahil yazıyor.
- **`PreferredSpanPanel.tsx:65–67`:** `ensureRules`.
- **`GraphWorkspace.tsx:73`:** mount'ta `persistGraphStore`.
- **`graphStore.ts:30–40`:** yer tutucu graph.
- **`App.tsx:54,56`:** persist effect'leri.
- **F7:** `PierFamiliesPanel.readFamilies` (:14–20) içindeki legacy normalizasyona hiç ulaşılmıyor; fiilen her zaman `INITIAL` (RECT-M) dönüyor.

### 2.5 App ve oturum

- App, localStorage boşsa `INITIAL_BRIDGES` ile açılır. `showWelcome` başlangıçta `false`.
- `setBridges` (`:58–67`) üç bölümü birlikte günceller.
- `WorkspacePage`'in key'i `file.sessionId`'dir.
- `BrowserRouter` App içinde; `:section` rotaları `router.tsx:61–64`.
- **F8:** `TopWorkspaceNav.tsx:14` `Link` bileşenleri ve feature'lardaki `navigate()` çağrıları query string'i düşürüyor.
- `UnsavedChangesModal` ve `RecentFileAccessModal` `shared/ui/` altında.
- `AppProviders.tsx:12`'deki `QueryClient` varsayılan `retry: 3` kullanıyor.

### 2.6 Test envanteri

Sayım aynı regex ile yapıldı: 27 dosya, 167 eşleşme. Üst plandaki "26/128" daha dar bir regex'le sayılmış.

| Grup | Dosyalar (eşleşme) |
|---|---|
| M5a'da taşınır (13) | `registry.test`(6), `familyRepository.test`(2), `FoundationFamiliesPanel.test`(9), `FamilyResultsViewer.test`(2), `BearingFamiliesPanel.test`(6), `store.test`(2), `MaterialsPanel.test`(3), `WindLoadsPanel.test`(1), `projectWorkspace.test`(2), `LoadsPanel.test`(2), `SeismicPanel.test`(1), `PreferredSpanPanel.test`(8), `UniformTemperaturePanel.test`(1) |
| Kısmen (1) | `App.test.tsx`(38): veri satırları M5a'da, `.kopruq` akışları (312–395, 420–435) M5c'de |
| M5c'de yeniden yazılır (5) | `useProjectModule.test`(6), `projectModuleStore.test`(5), `graphStore.test`(5; `vi.resetModules` kullanıyor), `graphRunValidity.test`(1), `graphViewPreferences.test`(2) |
| M5c'de silinir (8) | `useProjectFile.test`(14), `recentProjects.test`(15), `projectModulesRoundTrip.test`(12), `projectModules.test`(3), `projectModuleRegistry.test`(1), `projectFileService.test`(17), `projectDataContract.test`(2), `projectFileRealDefaults.test`(1) |

Ayrıca değişecek: `TopWorkspaceNav.test.tsx`.

Test altyapısı:
- `vite.config.ts`: `jsdom`, `setupFiles: ['./src/test/setup.ts']`. `setup.ts` yalnızca `cleanup` çağırıyor.
- `vi.resetModules` kullananlar: `http.test.ts`, `graphStore.test.ts`.
- Mimari testler: `layerRules.test.ts`, `sourceEncoding.test.ts`.
- Script'ler: `build` (`tsc -b && vite build`), `test` (`vitest run`), `lint` (`oxlint`). Son sayım: 102 dosya, 1042 test.

### 2.7 Backend

- **CORS** (`WebCorsConfiguration.java:27–32`): `GET, POST, PUT, HEAD`; origin varsayılan olarak `http://localhost:5173`; `X-Correlation-ID` dışa açık.
- **`ProjectInfo.name`** yalnızca non-null kontrolünden geçiyor (`ProjectInfo.java:39`); boş ad kabul ediliyor.

### 2.8 Dokümanlar

- `frontend/README.md`: 21–24, 39–42, 119.
- `docs/roadmap.md`: 1851 ve 1922.
- `docs/architecture.md:3095`: "Not persisted: computed results …". 3244/3250/3254 ve 3275/3277'de rüzgâr sonucunun saklanmadığı yazıyor. Bunlar m3b'de güncellenir.

---

## 3. Önerilen tasarım

### 3.1 Temel kararlar

- **D1 – Alt fazlar.**
  - Sıra: `-m5a` → `-m5b` → `-m5c`. Her biri bu plana referans veren kendi plan dosyasıyla uygulanır.
  - Önkoşul: `-m3b` (Bölüm B), M5c'den önce bitmeli.
  - Kullanıcının fark edeceği geçiş yalnızca M5c'de olur ve atomiktir.
  - localStorage, M5a ve M5b boyunca tek veri kaynağıdır; M5c sonunda tamamen kalkar.
- **D2 – Singleton oturum.**
  - Yeni `shared/project-store/activeProject.ts`: aynı modülde önce `activeProjectSession`, sonra `activeWriteQueue` oluşturulur (H1).
  - API, değiştirilebilir bir referans üzerinden çağrılır (`setActiveProjectApi`).
  - Uygulama `dispose` çağırmaz; testler `reset()` ve `end()` kullanır.
- **D3 – Bölüm örnekleri.**
  - Her feature, modül yüklenirken `createActiveSection(DEF)` ile kendi bölümünü kurar.
  - `app/project-session/projectSections.ts` dokümanı bu örneklere dağıtır.
- **D4 – Senkron public API'ler korunur.**
  - Korunanlar: family fonksiyonları, girder get/save, `readProjectState`, `useProjectModule`, `useFamilyCatalog`, graphStore düzenleme fonksiyonları. `*-catalog-changed` event'leri artık bölüm bildiriminden yayılır.
  - Kaldırılanlar: iki proje event'i, storage anahtar sabitleri, `ProjectModule.key`/`parse`, `persistGraphStore`, `import/export/reset/validateGraphDocuments`.
  - `persistProjectState` → `writeProjectState`; `persistBridgeDefinitionStore` → `writeBridgeDefinitionStore`.
- **D5 – Proje açılmadan yazma yok.**
  - `?project` yoksa Welcome ekranı gelir; workspace mount edilmez.
  - `write` `false` döner. Scratch proje yok. `INITIAL_BRIDGES` tohum olarak kullanılmaz.
- **D6 – UI-only alanlar bölüm dışında (F1, K5).**
  - `store.ts` içinde bir bellek katmanı tutulur.
  - Okuma: bölüm verisi + katman birleşimi.
  - Yazma: veri bölüme, UI alanları katmana.
  - Proje değişince katman sıfırlanır.
- **D7 – `onProjectSwitch(listener)`.**
  - Epoch değiştiğinde bir kez çağrılır.
  - Abone olanlar: graphStore, bridge UI katmanı, `familySnapshotStore`, `graphRunValidity` (bellekte).
  - Dinleyiciler yazmaz ve `begin`/`reset` çağırmaz.
- **D8 – İki adımlı hydrate.**
  - `prepareLoadedProject` saftır, uzlaştırma yapar ve `toWire` doğrulaması yapar; hata fırlatabilir.
  - `applyPreparedProject` önce `begin`, sonra `hydrate` çağırır.
  - Production'da aynı epoch içinde `hydrate` yok.
- **D9 – Mount sırasında yazma.**
  - `useFamilyCatalog`'daki okurken yazma kaldırılır.
  - `MaterialsPanel`, `GirderLibraryPanel` ve `PreferredSpanPanel.ensureRules` mevcut davranışını korur: ilk ziyarette en fazla bir PUT.
- **D10 – URL.**
  - Session otoritedir; `?project` onun aynasıdır.
  - Parametre farklıysa → Open (kapıdan geçer).
  - Parametre yok ama proje açıksa → `replace` ile geri eklenir (F8).
  - İkisi de yoksa → Welcome.
  - Exit → parametre kaldırılır.
  - Open/New → `replace`.
- **D11 – Liste sorgusu.** `useQuery({queryKey:['projects'], enabled, staleTime: 0, retry: false})`. Yalnızca menü veya diyalog açıkken çalışır. Create sonrası invalidate edilir.
- **D12 – New Project isim diyaloğu (Q3).**
  - New (Welcome, File menüsü, Ctrl+N) önce `NewProjectDialog` açar. Alan: "Proje adı", zorunlu.
  - "Oluştur" düğmesi `name.trim() === ''` iken pasiftir. Gönderilen değer `name.trim()`.
  - Sıra: diyalog → flush kapısı → `POST`. Gövde: `createProjectRequestBody({project: {...structuredClone(INITIAL_PROJECT), name: trimmed}, bridges: []})`.
  - Ad listede ve nav'da gösterilir. Boş adlı mevcut projeler (örn. Project formunda ad silinmişse) "Untitled" olarak görünür.
  - Bu bir UI doğrulamasıdır, mühendislik kuralı değil. Backend boş adı kabul etmeye devam eder.
- **D13 – Rüzgâr snapshot'ı (Q1, m3b'ye bağlı).**
  - `WIND_SNAPSHOT_MODULE` sonucu da taşır: `ProjectModule<WindCalculationSnapshot>`.
  - `windLoads = useProjectModule(WIND_SNAPSHOT_MODULE, null-fallback)`.
  - `setWindLoads(s)` → `WIND_SNAPSHOT_MODULE.write(s ?? undefined)`.
  - App'te ayrı bellek state'i kalmaz.
  - `WindLoadsPanel` değişmez. Yeniden açılınca saklı girdiler ve sonuç aynen gelir. STALE mantığı (girdi karşılaştırması) ve "yalnızca güncel + VALID ise göster" kuralı korunur.
  - Girdi değişince yalnızca `loads/wind` yazılır; snapshot ve sonucu korunur ve STALE görünür (bugünkü davranış).
  - Hesaplama hata verirse snapshot değişmez.
  - Başarılı hesaplama tek bir `PUT loads/wind-snapshot` gönderir (sonuç dahil).
- **D14 – Hiç yazılmamış family katalogları (Q2-A).**
  - Mevcut fallback'ler gösterilir: Pier için RECT-M, Materials için `INITIAL_MATERIALS`, diğerleri `[]`.
  - Kullanıcı düzenleyene kadar yazılmaz. İstisna: D9'daki Materials ilk ziyareti.
- **D15 – `beforeunload`.** `pendingKeys().length > 0` veya `status ∈ {error, rejected, conflict}` ise uyarı.
- **D16 – Klavye.** Ctrl+N → isim diyaloğu, Ctrl+O → Open diyaloğu, Ctrl+S → `flush()`. Ctrl+Shift+S kalkar.

### 3.2 Alt fazlar ve gerekçe

| Alt faz | İçerik | localStorage | Davranış | Bağımlılık |
|---|---|---|---|---|
| **M5a** Hazırlık | ham okumalar sahip fonksiyonlara; saf model ayrımı (F2/F3); test yardımcısı ve 13+1 dosyanın taşınması; ratchet testi | tek kaynak | değişmez | M4 |
| **M5b** Oturum katmanı (bağlanmamış) | `activeProject`, bölüm örnekleri, `projectSections`, controller, `ProjectListDialog`, `NewProjectDialog`, `SaveStatusIndicator`, sahte API | tek kaynak | değişmez | M5a (m3b gerekmez) |
| **M5c** Geçiş | depolar, kabuk, URL, silmeler, global test oturumu, testler, dokümanlar | **kalkar** | yeni | M5b **ve m3b** |

Notlar:
- **Neden bölündü:** saf refactor (M5a) ve yeni oturum mantığı (M5b), davranışı değiştirmeden ayrı ayrı incelenip yeşil tutulabiliyor.
- **Neden daha fazla bölünmedi:** kısmi bağlama karma veri kaynağı demek ve üst plan bunu yasaklıyor. Ayrıca `.kopruq` kodu eski depo API'lerine bağlı, dolayısıyla silme işi M5c'de kalmalı.
- **m3b ile ilişki:**
  - m3b, M5a ile paralel ya da önce yapılabilir.
  - M5b'deki rüzgâr bölüm örneği `WIND_SNAPSHOT_SECTION`'dan tip çıkarımıyla kurulur. m3b önce ya da sonra gelse de çalışır; m3b sonra gelirse tip otomatik genişler.
  - M5c'nin başında `loadsWire.ts`'te `result` alanının bulunduğu kontrol edilir (AC29 önkoşulu). Yoksa M5c `blocked` olur.

### 3.3 Singleton ve oturum (M5b) – imzalar

```ts
// frontend/src/shared/project-store/activeProject.ts
export const activeProjectSession: ProjectSession            // önce
export const activeWriteQueue: WriteQueue                     // sonra; putSection: (...a) => api.putSection(...a)
export const ACTIVE_PROJECT: SectionDeps
export function activeProjectApi(): ProjectApi
export function setActiveProjectApi(next: ProjectApi): ProjectApi
export function createActiveSection<T, W>(def: SectionDefinition<T, W>): ServerSection<T>
export function createActiveCollection<T, W>(def: CollectionDefinition<T, W>): ServerSectionCollection<T>
export function activeSections(): readonly { kind: 'section' | 'collection'; id: string; hydrateEmpty(): void }[]
export function onProjectSwitch(listener: () => void): () => void
// frontend/src/shared/project-store/useSaveStatus.ts
export function useSaveStatus(): ProjectSessionSnapshot
```

Feature bölüm örnekleri (M5b'de oluşturulur):
- `features/project/model/projectWorkspaceServerSection.ts`
- `features/bridge-definition/model/bridgeDefinitionServerSection.ts`
- `features/family-registry/model/familyServerSections.ts` (5 + girder)
- `features/preferred-span/model/preferredSpanServerSection.ts`
- `features/superstructure-families/model/crossSectionServerSection.ts`
- `features/loads/model/loadsServerSections.ts` (6; wind-snapshot dahil)
- `features/graph/state/graphServerCollection.ts`

```ts
// frontend/src/app/project-session/projectSections.ts
export function prepareLoadedProject(loaded: LoadedProjectDocument): PreparedProject   // ensureBridgeDefinitions(loaded.bridgeDefinitions ?? {}, bridges) (R1); her toWire önceden
export function applyPreparedProject(p: PreparedProject): void                         // begin → hydrate (PROJECT_SECTION_DEFINITIONS sırası) → koleksiyon
export function closeActiveProject(): void                                             // end → hydrateEmpty
// frontend/src/app/project-session/useProjectSessionController.ts
export type SessionPhase = { kind: 'welcome' } | { kind: 'loading'; projectId: string } | { kind: 'ready'; projectId: string } | { kind: 'load-error'; projectId: string; message: string }
export type PendingSwitch = { reason: 'new' | 'open' | 'exit'; target?: string; error: unknown; canRetry: boolean } | null
export function useProjectSessionController(o: { urlProjectId: string | null; setUrlProjectId(id: string | null): void }): {
  phase: SessionPhase; saveStatus: ProjectSessionSnapshot; pendingSwitch: PendingSwitch; busy: boolean; actionError: string | null
  newProject(name: string): Promise<void>; openProject(projectId: string): Promise<void>; reloadProject(): Promise<void>; exitProject(): Promise<void>
  retrySaves(): Promise<void>; discardSaves(): void; resolvePendingSwitch(choice: 'retry' | 'discard' | 'cancel'): Promise<void>; clearActionError(): void
}
```

**Akışlar**
- **Kapı:** `flush()` reddedilirse `pendingSwitch` set edilir. Seçenekler:
  - Retry: `retry()`; conflict durumunda `canRetry=false`.
  - Discard: `discard()`.
  - Cancel.
- **New(name):** kapı → POST (D12) → load → prepare → apply → URL → liste invalidate. Hata olursa `actionError` set edilir ve oturum değişmez.
- **Open(id):**
  - Aynı id ise no-op.
  - Kapı → GET → load/prepare/apply → URL.
  - İstek sayacı ile eski yanıtlar yok sayılır.
  - Bir proje açıkken hata olursa `actionError`, yokken `load-error`.
  - `Invalid project data: …` mesajı olduğu gibi gösterilir.
- **Reload:** kapıdan geçmez. GET → apply; epoch değiştiği için kuyruk sıfırlanır. GET başarısız olursa `conflict` kalır.
- **Exit:** kapı → `closeActiveProject()` → `setUrlProjectId(null)`.
- **İlk faz senkron hesaplanır:**
  - `urlId === session.projectId` → ready.
  - Yalnızca `urlId` var → loading.
  - Yalnızca session var → ready ve URL geri eklenir.
  - Hiçbiri yok → welcome.

### 3.4 Depoların yeniden bağlanması (M5c)

| Depo | Yeni yapı | API ve event'ler |
|---|---|---|
| `projectModuleStore.ts` | `createProjectModule<T>(section)`; `{id, read, write, reset (= write(undefined)), subscribe}` | `key`, `parse` ve iki event kalkar |
| `useProjectModule.ts` | `useSyncExternalStore(module.subscribe, () => module.read() ?? fallback)` | imza aynı |
| Modüller: loads (+`WIND_SNAPSHOT_MODULE: ProjectModule<WindCalculationSnapshot>`), preferred, cross, girder | bölüm örnekleriyle kurulur | adlar aynı |
| `familyRepository.ts` | `read() ?? fallback()`; `write`; bildirimde `CATALOGS[c].event` / `kopruq:girder-catalog-changed`; girder `[]` → wire `null` (R4) | `'storage'` ve anahtarlar kalkar |
| `useFamilyCatalog.ts` | bölüm snapshot'ı ya da önbellekteki fallback; okurken yazma yok | imza aynı |
| `registry.ts` | M5a'dan; `readStoredBridgeDefinitions()` | aynı |
| `projectWorkspace.ts` | `readProjectState(fb = [])`, `writeProjectState` (`ensureBridgeIds`, R2), `subscribeProjectState`, `readProjectUnits`; hook `features/project/hooks/useProjectState.ts` | `persistProjectState` kalkar |
| `bridge-definition/model/store.ts` | bölüm + D6 katmanı; `readBridgeDefinitionStore` (memo), `writeBridgeDefinitionStore`, `subscribe…`, `readStoredBridgeDefinitions`, `useBridgeDefinitionStore` | persist ve anahtar kalkar |
| `graphStore.ts` | `documents` = koleksiyon listesi (boşsa bellekte yer tutucu); `commit(next)` → `collection.write(tüm liste)` (yalnızca yeni/değişen PUT), `false` ise değişiklik ve undo yok; `onProjectSwitch` → undo/redo, `activeGraphId`, yer tutucu sıfırlanır; `:100` `readProjectUnits()` | düzenleme API'leri aynı; persist/import/export/reset/validate ve `'storage'` kalkar |
| `GraphWorkspace.tsx` | `:73` silinir | – |
| `graphRunValidity.ts` / `graphViewPreferences.ts` / `familySnapshotStore.ts` | bellekte / `onProjectSwitch` ile temizlenir | API aynı |
| Ham okuyucular | M5c'de yalnızca `'storage'` dinleyicileri silinir (`BridgeDefinitionWorkspace.tsx:73`, `SystemAssemblyPanel.tsx:41–43`, `PreferredSpanPanel.tsx:71–72`) | – |

**`setBridges`:** önce `writeProjectState`, sonra `writeBridgeDefinitionStore(ensureBridgeDefinitions(...))`. İki PUT seri gider. Discard ikisini birlikte geri alır.

**Fallback'ler (bölüm `undefined` olduğunda):**
- Proje: `INITIAL_PROJECT` + `[]`
- Kesit: `INITIAL_CROSS_SECTION_VALUES`
- Girder: `PRECAST_DIMENSIONS`
- Kurallar: `NO_RULES`
- Rüzgâr girdileri: `WIND_DEFAULT_INPUTS`; rüzgâr snapshot'ı: `null`
- Öz ağırlık: `INITIAL_SELF_WEIGHT_INPUTS`
- LM1: backend kod varsayılanı (yazılmaz)
- Pier: RECT-M; Materials: `INITIAL_MATERIALS`

### 3.5 UI (M5c)

- **`App.tsx`**
  - Yapı: `<AppProviders><BrowserRouter><ProjectShell/></BrowserRouter></AppProviders>`. Nav her zaman görünür.
  - Fazlar:
    - welcome → `WelcomeScreen`
    - loading → `ProjectLoadScreen`
    - load-error → mesaj + [Tekrar dene] [Proje listesi] [Yeni proje]
    - ready → `RoutedApplication`; key `saveStatus.epoch`.
  - `actionError` bir bant olarak gösterilir.
- **`TopWorkspaceNav.tsx`**
  - Proje adı (`name || 'Untitled'`) ve `SaveStatusIndicator`.
  - Menü: New… (diyalog), Open…, Recent (5 kayıt, `updatedAt` azalan; ad, tarih, kısa id), Exit.
  - Save, Save As, file input ve "Erişim yok" kalkar.
- **`SaveStatusIndicator`**

  | Durum | Gösterim |
  |---|---|
  | idle | "Kaydedildi" |
  | saving | "Kaydediliyor…" |
  | error | "Kayıt hatası: <formatApiError>" + [Tekrar dene] [Değişiklikleri at] |
  | rejected | ilk 3 alan hatası + [Tekrar dene] [Değişiklikleri at] |
  | conflict | "Çakışma … Yeniden yüklemek bekleyen değişiklikleri atar." + [Yeniden yükle] |

- **`ProjectListDialog`:** `spn-modal` deseni. Ad, son güncelleme, kısa id; yükleniyor ve hata durumları.
- **`NewProjectDialog`:** "Proje adı" alanı, [Oluştur] (boşken pasif), [İptal]. Enter gönderir, Escape kapatır.
- **`shared/ui/UnsavedChangesModal.tsx`**
  - Props: `{open, busy, message, canRetry, onRetry, onDiscard, onCancel}`.
  - Başlık: "Kaydedilmemiş değişiklikler".
  - Düğmeler: TEKRAR DENE, VAZGEÇ (AT), İPTAL.
- **`WindLoadsPanel.tsx`:** değişmez (D13).
- **`main.tsx`:** `migrateLegacyStorage` kaldırılır.
- **Backend kapalıyken:** hata mesajı gösterilir. Yazmalar `error` durumuna geçer ve Retry edilebilir.

### 3.6 Test stratejisi

- **M5a:** `src/test/projectStoreTestUtils.ts`
  - `seedProjectData(key, value)`, `readProjectData(key)`, `resetProjectData()`.
  - Anahtarlar: `workspace`, `bridgeDefinitions`, `families.PIER|PIER_CAP|FOUNDATION|BEARING|MATERIAL`, `girderLibrary`, `preferredSpanRules`, `crossSection`, `loads.seismic|wind|temperature|selfWeight|trafficLm1|windSnapshot`.
  - Sahip API'leri üzerinden çalışır. Mevcut `expect` satırları değişmez.
- **M5b:**
  - `createFakeProjectApi()`: bellek içi backend; revizyon/409; graph upsert; hata enjeksiyonu; istek günlüğü.
  - `openTestProject(partial?)`: wire üzerinden `loadProjectDocument` → `prepare` → `apply`.
  - `closeTestProject()`, `flushProjectWrites()`.
- **M5c:**
  - `setup.ts`: global `beforeEach(setActiveProjectApi(fake); openTestProject())` ve `afterEach(reset; closeTestProject)`.
  - `seedProjectData` → `hydrate`; `readProjectData` → `read`.
  - Legacy bridge tohumları doğrudan `ensureBridgeDefinitions` çağrısına çevrilir.
  - `graphStore.test.ts`: `resetModules` yerine kapatıp yeniden açma.
  - Yeni testler: `AppSession.test.tsx`, `sectionWrites.test.ts`, `realDefaultsWire.test.ts`, `bridgeDefinitionUiState.test.ts`, `noBrowserStorage.test.ts`, `browserStorageRuntime.test.tsx`.

---

## 4. Alternatifler

| Alternatif | Karar |
|---|---|
| Tek atomik M5 | Reddedildi: yaklaşık 75 dosya tek diff'te. |
| Feature feature kademeli geçiş | Reddedildi: karma kaynak, üst plan yasaklıyor. |
| M5a'da çift modlu kaynak soyutlaması | Reddedildi: tüm depolara iki kez dokunulur. |
| M4 `ServerSection`'ı UI alanları için değiştirmek | Reddedildi: incelenmiş `confirmed`/`current` semantiğini bozar. |
| `useQuery`/`useMutation`'a çevirme | Reddedildi. |
| `/p/:id/:section` rotası | Reddedildi: `:section` korunmalı. |
| Global `vi.mock` | Reddedildi: setupFiles'ta doğrulanmadı. |
| Rüzgâr sonucunu yalnızca bellekte tutup yeniden açınca yeniden hesaplamak | Kullanıcı Q1'de saklamayı seçti. |
| Rüzgâr sonucunu JSON blob olarak saklamak | Reddedildi: program kuralı tipli ilişkisel model (Bölüm B). |

---

## 5. Sıralı görevler

### M5a – Hazırlık (davranış değişmez)

1. **Saf model.** Yeni `features/project/model/projectWorkspaceModel.ts`:
   - İçerik: tipler, `INITIAL_PROJECT`, `normalizeUnitId`, `normalizeProjectUnits`, `ensureBridgeIds`, `normalizeProjectState`.
   - `projectWorkspace.ts` bunları yeniden export eder ve `readProjectUnits()` ekler.
   - Wire dosyası artık model dosyasından import eder.
2. **Yük girdi tipleri.** Yeni `features/loads/model/loadsInputs.ts`: 4 şema ve tipleri. `loadsProjectModules.ts` ve `loadsWire.ts` buradan import eder.
3. **Sahip fonksiyonları.**
   - `store.ts`: `readStoredBridgeDefinitions()`.
   - `registry.ts:19,49–51`.
   - `BridgeDefinitionWorkspace.tsx:32–34,50,53`.
   - `SystemAssemblyPanel.tsx:60`.
   - `PreferredSpanPanel.tsx:10,27–35` (+ `kopruq:girder-catalog-changed`).
   - `PierFamiliesPanel.tsx:10,14–20` (`PIER_FALLBACK`).
   - `graphStore.ts:100`.
4. `src/test/projectStoreTestUtils.ts`.
5. **Test göçü:** 13 dosya ve `App.test.tsx`'in veri satırları (14–20, 94, 146, 158–160, 171–172, 185, 191, 267, 402–408, 458).
6. **`src/test/architecture/noBrowserStorage.test.ts`.**
   - Production kaynakları yorumsuz taranır. Regex 2.2'deki sembolleri, `StorageEvent`'i ve `'storage'` dinleyicisini yakalar.
   - `ALLOWED_FILES`: 2.2'deki dosyalardan `registry.ts` ve `PierFamiliesPanel.tsx` çıkarılır. Üç bileşen yalnızca `'storage'` dinleyicisi için listede kalır.
   - Test hem listede olmayan bir eşleşmede hem de artık eşleşmeyen (bayat) bir liste girdisinde kırılır.
7. **Dokümanlar:** architecture'a "M5a" notu; roadmap'te `[x] M5a`.
8. **Kontroller.**

### M5b – Oturum katmanı (bağlanmamış)

1. `activeProject.ts`, `useSaveStatus.ts`, testleri.
2. 7 bölüm-örneği dosyası ve `app/project-session/serverSectionInstances.test.ts`.
3. `projectSections.ts` ve testi.
4. `useProjectSessionController.ts`, `useProjectList.ts` ve testleri.
5. `ProjectListDialog.tsx`, `NewProjectDialog.tsx`, `SaveStatusIndicator.tsx`, `ProjectLoadScreen.tsx` ve testleri.
6. Test yardımcısının genişletilmesi.
7. Dokümanlar: "M5b" notu ve `[x] M5b`.

Kısıt: App, main, nav ve depolar değişmez.

### M5c – Geçiş (önkoşul: m3b uygulanmış)

0. `loadsWire.ts`'te `result` alanının bulunduğu, `WIND_SNAPSHOT_SECTION` tipinin `WindCalculationSnapshot` olduğu doğrulanır. Değilse dur, durum `blocked`.
1. Proje değişimi kancaları: `familySnapshotStore.ts`, `graphRunValidity.ts`, `graphViewPreferences.ts`.
2. `projectModuleStore.ts`, `useProjectModule.ts`; `projectDataEvents.ts` silinir.
3. Depolar (3.4): `familyRepository.ts`, `girderLibraryProjectModule.ts`, `useFamilyCatalog.ts`, `loadsProjectModules.ts` (+`WIND_SNAPSHOT_MODULE`), `preferredSpanRulesProjectModule.ts`, `crossSectionProjectModule.ts`, `projectWorkspace.ts` + `hooks/useProjectState.ts`, `bridge-definition/model/store.ts`, `graphStore.ts`.
4. Bileşenler: `GraphWorkspace.tsx:73` ve üç `'storage'` dinleyicisi.
5. Kabuk: `App.tsx` (rüzgâr dahil, D13), `TopWorkspaceNav.tsx`, `UnsavedChangesModal.tsx`, `main.tsx`.
6. Silinecek dosyalar:
   - `legacyStorageMigration.ts`
   - `app/project-file/{recentProjects,projectFileService,useProjectFile,projectDataContract,projectFileTypes,projectFileFixtures,projectModules}.ts`
   - `shared/ui/RecentFileAccessModal.tsx`
   - `projectDataEvents.ts`
   - Grep ile tüketicisi olmadığı doğrulandıktan sonra: `projectStateSchema.ts`, `bridge-definition/model/schema.ts`, `familySchemas.ts`, `graphSchema.ts`.
   - `projectFileValidation.ts` kalır.
7. Test altyapısı: `setup.ts` ve yardımcıların M5c sürümü.
8. Testler:
   - 8 dosya silinir; 5 dosya yeniden yazılır.
   - Uyarlanır: `App.test.tsx`, `TopWorkspaceNav.test.tsx`, `MaterialsPanel.test.tsx`, `store.test.ts:44`, `WindLoadsPanel.test.tsx` (yeniden açılış senaryosu).
   - Yeniler: 3.6'daki liste; `noBrowserStorage` testinde `ALLOWED_FILES = []`.
9. Dokümanlar:
   - Architecture'a "BACKEND-DB-PERSISTENCE M5" bölümü.
   - Roadmap: `[x] M5c`, M5 `[x]`, 1851 notu.
   - `frontend/README.md`.
10. Kontroller ve elle uçtan uca test (7.2).

---

## 6. Kabul kriterleri

### M5a
- **AC1:** `registry.ts`, `PierFamiliesPanel.tsx` ve `graphStore.ts:100` içinde `localStorage` geçmiyor. Üç bileşende yalnızca `'storage'` dinleyicisi kalıyor. Ratchet testi yeşil; listede olmayan dosyada kırmızı.
- **AC2:** `projectWorkspaceWire.ts` `./projectWorkspace`'i, `loadsWire.ts` `./loadsProjectModules`'i import etmiyor. `projectWorkspace.ts`'in eski export'ları aynen var.
- **AC3:** Katalog yokken Pier paneli RECT-M'yi gösteriyor. Saklı `H_TYPE` değeri aynen kalıyor.
- **AC4:** PreferredSpanPanel, `savePrecastGirderDefinition` sonrasında boyutları yeniden okuyor.
- **AC5:** 13 dosyada `localStorage`/`StorageEvent` yok. `App.test.tsx`'te yalnızca `.kopruq` akış testlerinde var. `expect` satırları değişmedi.
- **AC6:** build/test/lint yeşil. `backend/**`, `package.json` ve lock dosyası değişmedi. Davranış değişmedi.

### M5b
- **AC7:** `activeProject.ts`: session kuyruktan önce oluşturuluyor. `setActiveProjectApi` öncekini döndürüyor. `onProjectSwitch` yalnızca `begin`/`end`'de, bir kez çağrılıyor. `createActive*` kayıt defterine ekliyor.
- **AC8:** 16 bölüm ve koleksiyon, tanımlarla aynı id ve path'e sahip. Hiçbir depo bunları import etmiyor.
- **AC9:** `prepareLoadedProject` bridge definition'ları uzlaştırıyor. Geçersiz girdide hata fırlatıyor; hiçbir şey değişmiyor.
- **AC10:** `apply` sonrasında 1 s içinde 0 PUT. Değerler eşit. Epoch +1.
- **AC11:** `newProject('Köprü A')` yalnızca `[POST /api/projects]` gönderiyor. Gövdede `workspace.project.name === 'Köprü A'`, diğer alanlar `INITIAL_PROJECT`, `bridges: []`. `setUrlProjectId(id)` çağrılıyor. Sonraki 1 s içinde istek yok.
- **AC12:** Open: önce flush, sonra GET. Geçersiz dokümanda `Invalid project data: …` ve önceki oturum değişmiyor. 404'te `formatApiError`. Aynı id ile istek gitmiyor.
- **AC13:** Kapı: hata varken GET/POST yok. Retry, Discard ve Cancel anlamına uygun davranıyor. Conflict'te `canRetry=false`.
- **AC14:** Reload: GET + apply, `pendingKeys()` boş ve durum `idle`. GET başarısızsa `conflict` kalıyor.
- **AC15:** Exit: kapıdan geçiyor; session `null`; bölümler `undefined`; URL `null`.
- **AC16:** `ProjectListDialog`: yükleniyor, hata ve `updatedAt` azalan sıralama durumları; boş ad → "Untitled"; satır seçimi `onOpen` çağırıyor; sorgu yalnızca açıkken ve `retry: false`. `NewProjectDialog`: boş ya da boşluklu adda Oluştur pasif; `onCreate(name.trim())`; İptal ve Escape istek göndermiyor.
- **AC17:** `SaveStatusIndicator` beş durumu doğru gösteriyor.
- **AC18:** App, main, nav ve depolar değişmedi. build/test/lint yeşil.

### M5c (parantez içi: üst plandaki karşılığı)
- **AC19 (AC17, AC26):** `ALLOWED_FILES` boş, eşleşme 0. Production'da `.kopruq` literal'i ve silinen dosyalar yok.
- **AC20 (AC18):** Tüm akışlardan sonra `localStorage.length === 0`, `sessionStorage.length === 0`, `indexedDB.open` 0 kez çağrılmış. Elle DevTools kontrolü.
- **AC21 (AC19):** Welcome'da hiç `fetch` yok. New → isim diyaloğu → POST → `?project=<id>`; nav ve listede girilen ad görünüyor. `/project`'te 1 s içinde başka istek yok. İstisna yalnızca D9 panellerinin ilk ziyareti (her biri ≤ 1 PUT). File menüsü açılınca `GET /api/projects` yapılıyor.
- **AC22 (AC20):** 16 path ve `graphs/<id>` için örnek düzenleme 300 ms sonra tek PUT gönderiyor; `expectedRevision` zincirleniyor. App örnekleri: ad, köprü satırı (workspace, ardından bridge-definitions), family, sismik, graph. Gösterge "Kaydediliyor…" → "Kaydedildi". Sahte backend'den yeniden açınca aynı değerler geliyor.
- **AC23 (AC21):** 409 bandı görünüyor; yeni PUT gitmiyor. "Yeniden yükle" GET yapıyor ve atılan değişiklikleri bildiriyor. Otomatik retry ya da merge yok.
- **AC24 (AC22):** Ağ/5xx hatasında `formatApiError` (Ref ile). Bekleyen yazmalar korunuyor; Retry ve Discard çalışıyor. `beforeunload` bekleyen ya da hatalı yazma varken uyarıyor, `idle` iken uyarmıyor. 400'de alan hataları ve Discard.
- **AC25 (AC23):** Liste ve Recent sıralaması doğru. Proje değiştirmeden önce flush; başarısızsa modal. Geçersiz doküman önceki oturumu değiştirmiyor.
- **AC26 (AC24):** Proje değişiminde run validity, snapshot'lar, görünüm, seçimler, `activeGraphId` ve undo sıfırlanıyor. Hiçbir PUT gövdesinde `selectedBridgeId`, `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`, `keyBy`, `activeGraphId` yok.
- **AC27 (AC25):** Mühendislik değeri ya da birim değişmiyor. Yazılmamış bölümlerde 3.4'teki fallback'ler görünüyor. Pier, PierCap, Foundation ve Bearing panelleri 0 PUT gönderiyor (okurken yazma yok). Pier'de RECT-M görünüyor (Q2-A).
- **AC28:** Yalnızca UI alanını değiştiren bridge işlemleri UI'ı güncelliyor ve PUT göndermiyor. Veri değişikliği tek bir `bridge-definitions` PUT'u gönderiyor.
- **AC29 (Q1, m3b):**
  - Calculate başarılı → tek `PUT loads/wind-snapshot`; gövdede `result` backend'in döndürdüğü değerle sayı sayı aynı.
  - Proje yeniden açılınca panel aynı sonucu gösteriyor (girdiler eşit ve VALID ise).
  - Girdi değişirse yalnızca `PUT loads/wind` gidiyor; snapshot korunuyor ve STALE görünüyor.
  - Hesaplama hata verirse PUT gitmiyor.
  - INVALID sonuç da saklanıyor ve bugünkü gibi gösteriliyor.
- **AC30:** Proje yokken sahip yazma API'leri `false` dönüyor ve istek göndermiyor. Workspace mount edilmiyor.
- **AC31:** Uygulama içi gezinme `?project`'i geri ekliyor. Farklı bir `?project` kapıdan geçip o projeyi açıyor. Exit parametreyi kaldırıyor.
- **AC32:** İlk yükleme loading → ready. 404 ya da backend kapalıyken hata ekranında üç eylem var. Kısmi hydrate yok.
- **AC33 (AC26):** Save, Save As, dosya seçici, "Erişim yok" ve `RecentFileAccessModal` yok. Ctrl+S flush, Ctrl+O diyalog, Ctrl+N isim diyaloğu.
- **AC34 (AC27):** build/test/lint ve `layerRules` yeşil. `mvn -f backend/pom.xml -B package` başarılı. M5'te `backend/**`, `package.json` ve lock dosyası değişmedi.
- **AC35:** architecture'da M5 bölümü var. Roadmap'te M5a, M5b, M5c ve M5 `[x]`, 1851 güncel. README'de localStorage ya da `.kopruq` anlatımı kalmadı.

---

## 7. Doğrulama

### 7.1 Matris

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1, AC19 | `npx vitest run src/test/architecture` | yeşil; M5c'de liste boş |
| AC2 | grep + `npx tsc -b` | 0 / temiz |
| AC3, AC4 | Pier testi, `PreferredSpanPanel.test.tsx` | yeşil |
| AC5 | 13 dosyada grep | 0 |
| AC6, AC18, AC34 | `cd frontend && npm run build && npm test && npm run lint` (PowerShell'de `npm.cmd`); `git status --short -- backend frontend/package.json frontend/package-lock.json` | çıkış 0 / boş |
| AC7 | `activeProject.test.ts` | yeşil |
| AC8 | `serverSectionInstances.test.ts` + grep | eşit / yok |
| AC9, AC10 | `projectSections.test.ts` (fake timers) | 0 PUT |
| AC11–AC15 | `useProjectSessionController.test.tsx` | istek günlüğü |
| AC16, AC17 | dialog/indicator testleri | yeşil |
| AC20 | `browserStorageRuntime.test.tsx` + DevTools | 0 |
| AC21, AC23–AC25, AC30–AC33 | `AppSession.test.tsx`, `App.test.tsx`, `TopWorkspaceNav.test.tsx` | yeşil |
| AC22 | `sectionWrites.test.ts` | 17 path |
| AC26, AC28 | `bridgeDefinitionUiState.test.ts`, graph testleri, gövde taraması | yeşil |
| AC27 | `realDefaultsWire.test.ts`, panel testleri | yeşil |
| AC29 | `WindLoadsPanel.test.tsx` + `AppSession.test.tsx` (hesapla → kapat → aç) | sonuç aynı |
| AC35 | inceleme | var |

Bilinmeyenler: CI yapılandırması; yerel npm sürümü.

### 7.2 Elle uçtan uca kontrol listesi (M5c sonrasında, gerçek backend ile)

1. `.env` dosyasında `DB_PASSWORD` dolu olsun. `start-dev.bat` çalıştırın. `http://localhost:8080/actuator/health` → UP.
2. `http://localhost:5173` açın. DevTools'ta "Clear site data" yapın.
3. Welcome ekranı gelmeli ve hiç `/api` isteği olmamalı.
4. New Project → "Test Köprüsü" girin → Oluştur: tek POST, URL'de `?project=`, nav'da "Test Köprüsü" ve "Kaydedildi". Boş adla Oluştur pasif olmalı.
5. Adı değiştirin: tek `PUT …/workspace`. F5 sonrası ad korunmalı.
6. Sırayla düzenleyin ve her birinden sonra F5 ile kontrol edin: köprü satırı (2 PUT), aks ataması, 4 family, Materials, Girder, Preferred Span, kesit, Seismic, Temperature, Self Weight, LM1, Graph (node, parametre, bağlantı, grup).
7. **Rüzgâr:**
   - Girdileri gir → Calculate → tek `PUT loads/wind-snapshot` (Network'te gövdede `result` var).
   - F5 → aynı sonuçlar.
   - vb'yi değiştir → yalnızca `PUT loads/wind`; panelde STALE.
   - F5 → STALE devam etmeli; yeniden Calculate edilebilmeli.
   - İsteğe bağlı: `select * from load_wind_snapshot` ile sonuç kolonlarını kontrol edin.
8. Bridge seçimi ya da görünüm modu değiştirin: PUT gitmemeli. F5 sonrası varsayılana dönmeli.
9. Open ve Recent: sıralama doğru olmalı, URL değişmeli.
10. İki sekmede çakışma oluşturun: 409 bandı → Yeniden yükle.
11. Backend'i kapatıp düzenleyin: hata ve `beforeunload` uyarısı. Backend'i açıp Tekrar dene.
12. `?project=` ile var olmayan bir UUID: "Proje bulunamadı". Bozuk değer (`abc`): hata ekranı.
13. Exit → Welcome.
14. DevTools Storage: Local Storage, Session Storage ve IndexedDB boş olmalı.
15. 400 durumunu UI'dan tetiklemenin güvenilir bir yolu yok; otomatik testlerle kapsandı.

---

## 8. Riskler

- **F1:** D6 olmadan bridge seçimleri çalışmaz. AC28 bunu doğruluyor.
- **F2/F3 döngüleri:** M5a'daki saf ayrım zorunlu.
- **`useSyncExternalStore` snapshot kararlılığı:** fallback'ler ve birleştirilmiş görünümler memo edilmeli.
- **Global test oturumu ve `vi.resetModules`:** yalnızca `graphStore.test` etkileniyor; o dosya yeniden yazılacak.
- **Performans:** her graph değişikliğinde tüm koleksiyonun wire'ı karşılaştırılıyor. Konum yalnızca sürükleme bitince yazıldığı için kabul edilebilir. Büyük graph'ta elle ölçülmeli.
- **Bölümler arası atomiklik yok:** `setBridges` iki ayrı PUT. Biri hata verirse kuyruk durur.
- **Mount sırasında yazma (D9):** bugünkü davranış.
- **Saklanan rüzgâr sonucu hesaplanmış bir değer:** geçerliliği yalnızca girdi karşılaştırmasıyla (STALE) belirleniyor. Backend'deki `WindLoadsService` sabitleri ya da formülü değişirse, eşit girdilerle saklı eski sonuç "güncel" görünür. Eski `.kopruq` davranışıyla aynı risk. Kullanıcı kararıyla kabul edildi; hesaplama sürümü izlenmiyor. Bölüm B R-B2'de belgeleniyor.
- **Sekme kapanırken debounce içindeki son değişiklik kaybolabilir (R10).** R8 ve R11 aynen geçerli.
- **CORS:** 5173 dışındaki bir portta `kopruq.cors.allowed-origins` ayarlanmalı.
- **Güvenlik:** auth yok; kişisel veri yok.
- **Geri alma:** M5a ve M5b iz bırakmaz. M5c geri alınırsa uygulama localStorage'a döner; DB verisi kalır. m3b için bkz. Bölüm B.
- **Backend boşlukları:** DELETE ve graph silme yok (kapsam dışı). Rüzgâr sonucu m3b ile kapanıyor.

---

## 9. Varsayımlar, kararlar ve cevaplar

### 9.1 Doğrulanmış
2. bölümdeki yollar, satırlar ve semboller; M4 davranışı (F1); CORS; boş ad kabulü; rüzgâr akışı; test envanteri.

### 9.2 Planlayıcı kararları (değiştirilebilir)
- D1–D16.
- `setActiveProjectApi` dikişi.
- Ctrl+S ile flush.
- Recent'te 5 kayıt.
- Kısa id gösterimi.
- Türkçe durum metinleri.
- D9 istisnaları.
- New'de adın `trim` edilmesi ve boş adın engellenmesi.

### 9.3 Kullanıcı cevapları (2026-10-14)
- **Q1:** `windLoads.result` backend'de saklanır (Q4 "yalnızca girdiler" kararının yerine geçer). → D13, AC29, Bölüm B.
- **Q2:** Mevcut fallback'ler gösterilir; düzenlenene kadar yazılmaz. → D14.
- **Q3:** New Project'te ad sorulur. → D12. Boş ad UI'da engellenir, değer `trim` edilir.

**READY** (koşul: önkoşul `backend-db-persistence-m3b`, M5c'den önce uygulanmalı).

---

# BÖLÜM B — Önkoşul feature: `backend-db-persistence-m3b` (rüzgâr sonucunun saklanması)

**Durum: READY.** Bu feature için ayrı bir slug açılmalı; plan dosyası bu bölümden üretilebilir. Kullanıcı kararı 2026-10-14 tarihli Q1 cevabıdır. Üst plan 9.2'deki Q4 ("yalnızca inputs") ve M3/M4'teki "result saklanmaz" kararları bu kararla değişir.

## B1. Amaç ve kapsam

**Amaç**
- `PUT /api/projects/{id}/loads/wind-snapshot` ve proje dokümanı `loads.windSnapshot` alanı, rüzgâr snapshot'ının `result` değerini tipli ve ilişkisel olarak kabul eder, saklar ve döndürür.
- M4 frontend mapper'ı ve fixture'ları buna göre güncellenir. Kod hâlâ uygulamaya bağlı değildir.

**Kapsam dışı**
- Yeni endpoint yok; controller sayısı (16) ve endpoint sayısı (41) değişmez.
- Yeni Maven veya npm bağımlılığı yok.
- `WindLoadsService` ve `/api/wind-loads/resolve` değişmez.
- Diğer hesaplanmış sonuçlar saklanmaz.
- Hesaplama sürümü takibi yapılmaz (R-B2).
- Uygulama bağlaması M5c'nin işidir.

## B2. Mevcut durum (doğrulanmış)

**Frontend**
- `features/loads/model/windTypes.ts:1–2`:
  - `WindResult = {status: 'VALID'|'INVALID'; z0M; zminM; kr; cr; vmMs; turbulenceIntensity; qpKNm2; bOverD; cfx: number; transverseKNm: number|null; missing: string|null}`
  - `WindCalculationSnapshot = {schemaVersion: 1; status?: string; inputs{vb, terrain, ze: string; deckWidthM, drefM: number}; result: WindResult|null}`
- `windLoadsService.ts:6–8`: `POST /api/wind-loads/resolve` yanıtı doğrudan `WindResult`.
- `WindLoadsPanel.tsx:24`: snapshot'ı `{schemaVersion:1, status: result.status, inputs, result}` olarak kurar.

**Backend hesaplama**
- `loads.model.WindResult` (Java record): `status: String`; 9 alan primitive `double` (asla null değil); `transverseKNm: Double` (null olabilir); `missing: String` (null olabilir).
- `WindLoadsService.resolve`:
  - Yalnızca `"VALID"` ya da `"INVALID"` döner.
  - INVALID durumunda sabit değerler `0, …, cfx 1.3`, `transverseKNm null` ve bir `missing` metni döner.
  - VALID durumunda tüm sayılar sonlu girdilerden hesaplanır; `transverseKNm` dolu, `missing` null.

**Backend saklama**
- `bridge.model.WindSnapshot(int schemaVersion, String status, WindSnapshotInputs inputs)`: "result never persisted".
- `WindSnapshotEntity` ve `V5` tablosu `load_wind_snapshot` (yalnızca girdi kolonları).
- `LoadInputDtos.WindSnapshotDto(Integer schemaVersion, String status, WindSnapshotInputsDto inputs)`.
- `LoadInputMapper.toWindSnapshot` (:127–155) ve `windSnapshotDto` (:219–222).
- `LoadInputContentStore.replace` (:105–107) için `replaceOne` kullanılır.
- `ProjectLoadGraphApiContractTest.java:524–534` `result` alanının reddedildiğini doğrular.
- `bridge` domain kenarları boş; `bridge`, `loads` paketini import edemez.

**Dokümanlar:** `architecture.md:3095` ("Not persisted: computed results …"); M3 bölümü 3244, 3250, 3254; M4 bölümü 3275 (D10), 3277; `V5` SQL yorumu (Flyway nedeniyle değiştirilmez).

**Mühendislik açısından açık nokta:** Yok.
- Alanlar, null olabilirlik ve enum değerleri hem TS tipinden hem Java record'undan belli.
- Birimler alan adlarında: `z0M` ve `zminM` m, `vmMs` m/s, `qpKNm2` kN/m², `transverseKNm` kN/m. `kr`, `cr`, `turbulenceIntensity`, `bOverD`, `cfx` birimsiz.
- İç içe dizi yok.
- Değerler hesaplandığı gibi saklanır; hiçbir değer yorumlanmaz ya da dönüştürülmez.

## B3. Tasarım

**Model (`com.kopruq.bridge.model`, Spring yok)**
- Yeni `WindSnapshotResult(WindResultStatus status, double z0M, double zminM, double kr, double cr, double vmMs, double turbulenceIntensity, double qpKNm2, double bOverD, double cfx, Double transverseKNm, String missing)`.
  - Yalnızca yapısal invariant'lar: `status` zorunlu; 9 sayı sonlu; `transverseKNm` null değilse sonlu.
  - Değer aralığı ya da tutarlılık kuralı yok. Örneğin `status=VALID` iken `missing` dolu olabilir.
- `WindSnapshot(int schemaVersion, String status, WindSnapshotInputs inputs, WindSnapshotResult result)`; `result` null olabilir. Javadoc güncellenir.
- Yeni `bridge.enums.WindResultStatus {VALID, INVALID}` (sabit adıyla).
  - Neden ayrı enum: `bridge`, `loads` paketini import edemez.
- `schemaVersion` 1 kalır. Wire'a ek bir alan geliyor; eski istemciler `result` göndermezse `null` kabul edilir.

**API (`bridge.api`)**
- Yeni `LoadInputDtos.WindSnapshotResultDto(String status, Double z0M, Double zminM, Double kr, Double cr, Double vmMs, Double turbulenceIntensity, Double qpKNm2, Double bOverD, Double cfx, Double transverseKNm, String missing)`. Alan sırası `WindResult` ile aynı.
- `WindSnapshotDto(Integer schemaVersion, String status, WindSnapshotInputsDto inputs, WindSnapshotResultDto result)`.
- `LoadInputMapper`:
  - `result` `null` ya da yok → sonuçsuz snapshot.
  - Varsa: `value.result.status` → "is required" ya da "must be one of: INVALID, VALID" (mevcut `SectionChecks` sırası).
  - 9 sayı → "is required" ya da "must be a finite number".
  - `transverseKNm` → null olabilir, doluysa sonlu olmalı.
  - `missing` → null olabilir.
  - `result` içinde bilinmeyen alan → 400 `value.result.<alan>` "is not a known field" (`ProjectRequestReader` strict).
- Yanıt ve dokümanda `result` anahtarı her zaman bulunur; sonuç yoksa açıkça `null`.
- Controller, endpoint envanteri ve CORS değişmez.

**Kalıcılık (`bridge.infra.persistence`)**
- `V6__wind_snapshot_result.sql`. Tablo `load_wind_snapshot`'a satır içi kolonlar eklenir; M2'deki `*_present` deseni izlenir; JSON blob yok:

```sql
-- V6: wind snapshot result (backend-db-persistence-m3b, user decision 2026-10-14: the calculated wind result is stored
-- with its inputs). Values are stored exactly as calculated; units only where the frontend field name states them.
-- result_present tells "no result" from a result; the result columns are nullable because a snapshot may have none
-- (required-ness when present is checked in the application layer). No DEFAULT (except the back-fill below), no CHECK.
ALTER TABLE load_wind_snapshot ADD COLUMN result_present BOOLEAN;
UPDATE load_wind_snapshot SET result_present = FALSE;
ALTER TABLE load_wind_snapshot ALTER COLUMN result_present SET NOT NULL;   -- V3 ile aynı sözdizimi (H2 + PG)
ALTER TABLE load_wind_snapshot ADD COLUMN result_status VARCHAR;
ALTER TABLE load_wind_snapshot ADD COLUMN result_z0_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_zmin_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_kr DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_cr DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_vm_ms DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_turbulence_intensity DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_qp_kn_m2 DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_b_over_d DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_cfx DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_transverse_kn_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_missing VARCHAR;
```

  - Mevcut satırlar `result_present = FALSE` alır; bu satırlar "sonuç yok" olarak okunur.
  - Alternatif olarak ayrı bir 1:1 tablo düşünüldü. Seçilmedi: `replaceOne` tek entity ile çalışıyor ve `*_present` deseni M2'den beri mevcut.
- `WindSnapshotEntity`: yeni alanlar eklenir. `toDomain` `result_present` true ise `WindSnapshotResult`'ı kurar ve invariant'lar okuma sırasında yeniden kontrol edilir.
- `replaceOne` mantığı değişmez (sil, `flush`, ekle).

**Frontend M4 güncellemesi (bağlanmamış kod)**
- `features/loads/model/loadsWire.ts`:
  - Yeni `windResultWireSchema` (strict, aynı sıra): `status: z.enum(['VALID','INVALID'])`, 9 × `z.number()`, `transverseKNm: z.number().nullable()`, `missing: z.string().nullable()`.
  - `windSnapshotWireSchema` + `result: windResultWireSchema.nullable()`.
  - `windSnapshotToWire(v: WindCalculationSnapshot)` sonucu açık sırayla yazar; sonuç yoksa `null` gönderir.
  - `windSnapshotFromWire` → `WindCalculationSnapshot`; `result` aynen, `null` kalır. `status` alanındaki "null ise omit" kuralı korunur.
  - `WIND_SNAPSHOT_SECTION: SectionDefinition<WindCalculationSnapshot, WindSnapshotWire>`.
  - `WindSnapshotInputsValue` kaldırılır.
- `app/project-session/projectDocument.ts`: `LoadedProjectDocument.loads.windSnapshot: WindCalculationSnapshot | undefined`.
- `projectDocumentFixtures.ts`: kanonik dokümanda `windSnapshot.result` bir VALID sonuç nesnesi olur. Yeni-proje dokümanı değişmez (`windSnapshot: null`). Ayrıca test içinde `result: null` ve INVALID (`transverseKNm: null`, `missing` metni) varyantları kullanılır.

**Geçerlilik ve STALE anlamı (hesaplanmış değer)**
- Saklanan sonuç, hesaplandığı andaki girdilerle birlikte saklanır (`inputs`).
- Geçerlilik okunurken mevcut frontend kuralıyla belirlenir (`WindLoadsPanel.tsx:27–28`): saklı girdiler güncel girdilerden farklıysa STALE olur ve sonuç gizlenir. Yalnızca güncel ve `VALID` olan sonuç gösterilir.
- Girdi değişince snapshot temizlenmez; frontend yalnızca `loads/wind` yazar. Backend iki bölüm arasında uyum zorlamaz.
- Yeni bir hesaplama snapshot'ı tamamen değiştirir.
- Bu kurallar `docs/architecture.md`'ye yazılır.

## B4. Görevler

1. `bridge.enums.WindResultStatus`, `bridge.model.WindSnapshotResult`, `WindSnapshot` (4. bileşen).
2. `V6__wind_snapshot_result.sql`, `WindSnapshotEntity`.
3. `LoadInputDtos`, `LoadInputMapper` (`toWindSnapshot`, `windSnapshotDto`).
4. Backend testleri:
   - `LoadGraphSectionsTest`: sonuç invariant'ları.
   - `LoadGraphFixtures`: sonuçlu snapshot.
   - `JpaLoadGraphContentTest`: sonuçlu, sonuçsuz, INVALID ve `transverse=null` round-trip; değiştirme; sayıların bit düzeyinde aynı kalması.
   - V6 migration testi (`V3MigrationTest` deseni): mevcut snapshot satırı `result: null` okunur.
   - `ProjectLoadGraphApiContractTest`:
     - :524–534 tersine çevrilir: `result` round-trip; dokümanda `result` var.
     - `result.x` → 400; `status: "OK"` → 400 "must be one of"; eksik `kr` → 400 "is required"; `result` yok → `null` saklanır; 409/revizyon semantiği aynı.
   - `InMemoryProjectContentRepository` gerekirse güncellenir.
   - `EndpointInventoryContractTest` ve `ArchitectureTests` değişmeden yeşil kalmalı.
5. Frontend: `loadsWire.ts` ve testi, `projectDocument.ts`, `projectDocumentFixtures.ts`, `projectDocument.test.ts`. Testler: byte düzeyinde yeniden serileştirme, anahtar sırası, strict ret, T→W→T eşitliği (sonuç dahil).
6. Dokümanlar:
   - `architecture.md:3095`: "Not persisted: computed results" cümlesine istisna eklenir: "except the wind calculation snapshot result (stored with its inputs by user decision 2026-10-14; validity is decided at read time by comparing the stored inputs with the current inputs, STALE hides the result)".
   - Yeni "BACKEND-DB-PERSISTENCE M3b" bölümü; M3 (3244/3250/3254) ve M4 (D10, 3277) notlarına "superseded by M3b" eklenir.
   - `roadmap.md`: track'e `[x] M3b`.
7. Kontroller: `mvn -f backend/pom.xml -B package`; `cd frontend && npm run build && npm test && npm run lint`; isteğe bağlı `postgres-test` koşusu.

## B5. Kabul kriterleri (m3b)

- **B-AC1:** V6 hem H2'de hem PG'de uygulanır. V1–V5 değişmez. Mevcut `load_wind_snapshot` satırları `result_present = false` olur ve `result: null` döner.
- **B-AC2:** `PUT …/loads/wind-snapshot` ile `result` (VALID; ayrıca `transverseKNm: null` ve `missing` dolu INVALID) gönderildiğinde 200 döner; revizyon +1; yanıttaki `value` ve sonraki `GET` gönderilenle derin eşit ve sayılar bit düzeyinde aynı. Anahtar sırası `schemaVersion, status, inputs, result`; `result` içinde `status, z0M, zminM, kr, cr, vmMs, turbulenceIntensity, qpKNm2, bOverD, cfx, transverseKNm, missing`.
- **B-AC3:** `result: null` ya da `result` anahtarı hiç yoksa 200 döner ve `result: null` okunur.
- **B-AC4:** `result` içinde bilinmeyen alan, bilinmeyen `status`, eksik ya da sonlu olmayan zorunlu sayı → 400 ve `value.result.*` alan yolu; hiçbir şey yazılmaz; revizyon değişmez.
- **B-AC5:** Değer, birim ya da aralık kontrolü yok; DB'de DEFAULT (backfill dışında) ve CHECK yok; `bridge` domain'i `loads` import etmiyor (`ArchitectureTests` yeşil). Controller sayısı 16, endpoint sayısı 41 (`EndpointInventoryContractTest` yeşil).
- **B-AC6:** Frontend `loadsWire` için T→W→T (sonuç dahil) derin eşit. Kanonik doküman byte düzeyinde yeniden serileşiyor. Strict şema fazladan `result` alanını reddediyor. Uygulama davranışı değişmiyor (mapper hâlâ bağlı değil).
- **B-AC7:** `mvn -f backend/pom.xml -B package` ve frontend build/test/lint başarılı. Dokümanlar (`3095` istisnası, M3b bölümü, M3/M4 notları, roadmap) güncel.

## B6. Riskler ve açık sorular (m3b)

- **R-B1:** Strict şema nedeniyle m3b'den önceki frontend M4 kodu yeni dokümanı (`result` anahtarlı) reddeder. Bu yüzden backend ve frontend mapper değişikliği aynı feature'da, birlikte yapılır.
- **R-B2:** Hesaplanmış değer saklanıyor. Geçerlilik yalnızca girdi karşılaştırmasıyla belirleniyor. `WindLoadsService` değişirse, eşit girdilerle saklı eski sonuç güncel görünür. Hesaplama sürümü saklanmıyor. Kullanıcı kararıyla kabul edildi ve dokümanda açıkça yazılacak. İleride gerekirse ayrı bir feature olarak eklenebilir; o durumda mühendis onayı gerekir.
- **R-B3:** H2 ile PG arasında `ALTER … SET NOT NULL` farkı olabilir; V3'teki sözdizimi kullanılır ve `postgres-test` önerilir.
- **Geri alma:** Flyway yalnızca ileri gider. Kod geri alınırsa V6 kolonları kalır ama eski kod onları okumaz. `result_present NOT NULL` olduğu için eski kodun insert'ü başarısız olur; tek yazan endpoint olduğundan kod ve migration birlikte geri alınmalıdır.
- **Açık mühendislik sorusu:** Yok (B2).

**READY**
