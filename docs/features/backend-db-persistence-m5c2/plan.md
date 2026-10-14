# Plan: backend-db-persistence-m5c2 (M5c geçişi)

Kaynak: architecture-planner çıktısı (READY). Üst plan: `docs/features/backend-db-persistence-m5/plan.md` Bölüm A; değiştirilmez. Bu plan üst planın M5c fazını güncel koda göre yeniden doğrular ve gereken yerleri düzeltir. Satır numaraları planlama anındaki diskteki hale göredir (HEAD `d221191`).

---

## 1. Amaç ve kapsam

**Amaç (tek ve atomik geçiş)**
- M5b oturum katmanını uygulamaya bağlamak: depolar, kabuk, URL, kaydetme göstergesi, kapı modalı, `beforeunload` ve kısayollar.
- Production frontend'den tamamen kaldırmak: `localStorage`, `sessionStorage`, `indexedDB`, File System Access API, `'storage'` olayı, `.kopruq` kodu ve UI'ı.
- Rüzgâr snapshot'ı **sonucuyla birlikte** backend'e yazılsın ve yeniden açılınca aynen gösterilsin (m3b).
- Global test oturumu kurulsun, testler taşınsın ya da silinsin, yeni testler eklensin, dokümanlar güncellensin.
- M5b nitleri ve m3b'den devreden riskler kapatılsın (bkz. 3.7).

**Kapsam dışı**
- `backend/**`, `frontend/package.json` ve lock dosyası değişmez. Yeni npm bağımlılığı ve yeni endpoint yok.
- Eski tarayıcı verisi ve `.kopruq` dosyaları taşınmaz. Import/Export yok.
- Auth, çevrimdışı mod, proje ya da graph silme yok.
- Hesaplama sürümü saklanmaz (R2, kabul edildi).
- Terrain'i projeye bağlama yok; `router.tsx:138/150` aynen kalır.
- Mühendislik kuralı, formül, varsayılan değer ya da birim dönüşümü eklenmez veya değişmez. Fallback'ler bugünkü koddaki sabitlerdir.

---

## 2. Doğrulanmış mevcut durum ve üst plandan sapmalar

### 2.1 Doğrulanan giriş noktaları (güncel kod)

**Oturum katmanı (M5b, `208dcea`)**
- `frontend/src/shared/project-store/activeProject.ts`: `activeProjectSession`, `activeWriteQueue`, `ACTIVE_PROJECT`, `activeProjectApi`, `setActiveProjectApi`, `createActiveSection`, `createActiveCollection`, `activeSections`, `onProjectSwitch`.
- `useSaveStatus.ts`.
- `serverSection.ts`: `write` proje yokken `false` döner (:82, :164). Wire aynıysa `true` döner ama aynayı güncellemez (:93, F1). `hydrate` `toWire` çağırır (:107). Ailelerde `clearable: false`; girder ve load bölümlerinde `true`.
- `writeQueue.ts`: `reportLocalRejection` → `rejected` ve kuyruk durur (:187). 400/422 → `rejected`, 409 → `conflict`, diğer hatalar → `error` (:89–93). `retry` tutulan hataları temizleyip flush eder. `discard` her şeyi geri alır.
- `app/project-session/`: `projectSections.ts` (`prepareLoadedProject`, `applyPreparedProject`, `closeActiveProject`), `useProjectSessionController.ts` (279 satır), `useProjectList.ts` (`PROJECT_LIST_QUERY_KEY`, `retry: false`), `ProjectListDialog.tsx`, `NewProjectDialog.tsx`, `SaveStatusIndicator.tsx`, `ProjectLoadScreen.tsx`, `projectDisplay.ts`, `saveStatusText.ts`, `projectDocument.ts`, `projectDocumentFixtures.ts` (`CANONICAL_PROJECT_DOCUMENT_JSON`, `NEW_PROJECT_DOCUMENT_JSON`).
- Bölüm örnekleri: `WORKSPACE_SERVER_SECTION`, `BRIDGE_DEFINITIONS_SERVER_SECTION`, `FAMILY_SERVER_SECTIONS.{PIER,PIER_CAP,FOUNDATION,BEARING,MATERIAL}`, `GIRDER_LIBRARY_SERVER_SECTION`, `PREFERRED_SPAN_RULES_SERVER_SECTION`, `CROSS_SECTION_SERVER_SECTION`, `SEISMIC|WIND|TEMPERATURE|SELF_WEIGHT|TRAFFIC_LM1|WIND_SNAPSHOT_SERVER_SECTION`, `GRAPH_SERVER_COLLECTION`. Çalışma zamanında yalnızca `activeProject` ve kendi wire dosyalarını import ediyor; planlanan bağlamalarda döngüsel import yok (`familyWire` → `familyRepository` yalnızca tip importu).
- Test yardımcıları (`src/test/`): `fakeProjectApi.ts` (`seed`, `requests`, `failNext`, `hold/release/unhold`, `pending`), `projectSessionTestUtils.ts` (`installFakeProjectApi`, `openTestProject`, `closeTestProject`, `resetActiveProject`, `flushProjectWrites`), `projectStoreTestUtils.ts` (hâlâ localStorage tabanlı), `setup.ts` (yalnızca `cleanup`).

**Kabuk (bugün)**
- `app/App.tsx`: `readProjectState(INITIAL_BRIDGES)` :53, persist effect'leri :54, :56, `PROJECT_MODULES.crossSectionValues` :70, bellekteki `windLoads` :71, `useProjectFile` :72, `showWelcome` :73, `showOpenFilePicker` :98, `beforeunload` :102, `WorkspacePage` key'i `file.sessionId` :176.
- `layout/TopWorkspaceNav.tsx`: Ctrl+S, Ctrl+Shift+S, Ctrl+O file input'a gidiyor; `Link to="/${id}"` query'yi düşürüyor (F8).
- `shared/ui/UnsavedChangesModal.tsx`: SAVE / DON'T SAVE / CANCEL.
- `main.tsx:4,6`: `migrateLegacyStorage`.
- `AppProviders.tsx:12`: modül düzeyinde `QueryClient`.
- react-router-dom ^7.18.3, react ^19.2.8.

**Depolar (bugün localStorage)**
- `shared/project-file/projectModuleStore.ts`, `useProjectModule.ts`
- `features/loads/model/loadsProjectModules.ts` (5 modül; `WIND_SNAPSHOT_MODULE` yok)
- `preferred-span/model/preferredSpanRulesProjectModule.ts`
- `superstructure-families/model/crossSectionProjectModule.ts`
- `family-registry/model/girderLibraryProjectModule.ts`
- `family-registry/model/familyRepository.ts` (`'storage'` :76–77)
- `family-registry/hooks/useFamilyCatalog.ts`: okurken yazıyor (:15, :29)
- `project/model/projectWorkspace.ts`
- `bridge-definition/model/store.ts`
- `graph/state/graphStore.ts` (`'storage'` :85–86; :100 zaten `readProjectUnits()`)
- `graph/family/graphRunValidity.ts`, `graph/state/graphViewPreferences.ts`
- `graph/family/familySnapshotStore.ts` zaten bellekte; `clearFamilySnapshots` var.
- `GraphWorkspace.tsx:73`: `persistGraphStore()`.

**Rüzgâr (m3b)**
- `loadsWire.ts:29–37`: `windResultWireSchema`, `windSnapshotWireSchema.result`. `WIND_SNAPSHOT_SECTION: SectionDefinition<WindCalculationSnapshot, WindSnapshotWire>` (:101). `windSnapshotToWire` sonluluk kontrolü yapmıyor (:72–80).
- `WindLoadsPanel.tsx`: başarılı hesaplamada `onSnapshot`'ı tam bir kez çağırıyor (:24); hata olursa çağırmıyor. STALE hesabı :27, gösterim kuralı :28. `WIND_DEFAULT_INPUTS` dosya içinde yerel sabit (:14).
- `LoadsPanel.tsx:51,56` ve `WorkspacePage.tsx:23` `windLoads`/`setWindLoads` prop'larını taşıyor.

**Mimari testler**
- `noBrowserStorage.test.ts`: `ALLOWED_FILES` 17 giriş, `STORAGE_LISTENER_ONLY_FILES` 3 giriş.
- `sessionLayerUnwired.test.ts`: M5c'de silinecek (kendi açıklamasında da böyle yazıyor).
- `layerRules.test.ts`, `sourceEncoding.test.ts`.

**Test taban çizgisi:** frontend 119 dosya / 1187 test (m3b sonrası), backend 732 test. Aşama 0'da yeniden ölçülecek.

### 2.2 Üst plandan sapmalar (düzeltilenler)

| # | Üst planda | Güncel kod veya karar |
|---|---|---|
| S1 | `BridgeDefinitionWorkspace.tsx:73`, `PreferredSpanPanel.tsx:71–72` | `'storage'` dinleyicileri `BridgeDefinitionWorkspace.tsx:69` (olay dizisi) ve `PreferredSpanPanel.tsx:64–65`'te; `SystemAssemblyPanel.tsx:41–43` doğru. |
| S2 | `graphStore.ts:100` M5c'de değişecek | M5a'da zaten `readProjectUnits()` yapılmış; yalnızca `readProjectUnits` içi değişir. |
| S3 | Silinecekler listesinde yok | `src/test/architecture/sessionLayerUnwired.test.ts` de silinir. |
| S4 | `projectStoreTestUtils` yalnızca semantik değiştirir | `loads.windSnapshot` anahtarı eklenir. `seedRawProjectData`, `readProjectDataText`, `browserStorageText` kalkar; bunları kullanan 6 dosya uyarlanır. |
| S5 | YB1, YB2, YB3 M5c'ye devrediliyor | Üçü de M5b'nin "YB1-YB3 review follow-up" adımında çözülmüş: controller :181/:195/:203 `setLoad(idle)`, test, `architecture.md:3301`. M5c'de yalnızca gerçek router adaptörüyle bir entegrasyon testi eklenir (3.7). |
| S6 | `loadsWire.ts` M5c'de değişmez | Sonlu olmayan değer koruması eklenir (3.6). Gerekçe: m3b'den devreden risk. |
| S7 | Controller M5c'de değişmez | `reloadProject` başına `pendingRef` koruması eklenir (Cancel-with-Reload, 3.7). |
| S8 | `ProjectListDialog` değişmez | Busy iken odak düzeltmesi yapılır (3.7). |
| S9 | `PierFamiliesPanel.test.tsx:16` RECT-M'in yazıldığını bekliyor | D14/AC27 gereği yazma kalkar (bugünkü kodda `useFamilyCatalog` fallback'i okurken yazıyor). Beklenti "UI'da RECT-M, bölüm `undefined`, 0 PUT" olur. Kullanıcı kararı Q2'den gelen bilinçli bir davranış değişikliği. |
| S10 | `readBridgeDefinitionStore` yalnızca memo'lanır | Okuma `ensureBridgeDefinitions(bölüm ?? {}, workspace.bridges)` ile uzlaştırılır ve memo'lanır. Bugünkü App başlangıç davranışıyla aynı. |
| S11 | App testleri `INITIAL_BRIDGES` ile açılıyor | D5 gereği tohum yok. Testler workspace'i açıkça tohumlar. |
| S12 | m3b commit'lenmemiş | Planlama anında `git status` yalnızca `?? docs/features/backend-db-persistence-m5c2/` gösteriyordu; m3b'nin HEAD'de olup olmadığı Aşama 0'da doğrulanmalı. |

---

## 3. Tasarım

### 3.1 Modül deposu (`shared/project-file`)

- `projectModuleStore.ts` → `createProjectModule<T>(section: ServerSection<T>): ProjectModule<T>`.
  - Yapı: `{ id, read, write(v): boolean, reset() (= section.write(undefined)), subscribe }`.
  - Kalkanlar: `key`, `parse`, iki olay sabiti ve zod bağımlılığı.
- `useProjectModule.ts`: `useSyncExternalStore(module.subscribe, module.read) ?? fallback`; imza aynı. Ek export `useProjectModuleValue(module): T | undefined` (rüzgâr snapshot'ının `null` fallback'i için).
- Modül dosyaları M5b bölüm örneklerinden kurulur; adlar aynı kalır: `SEISMIC|WIND|TEMPERATURE|SELF_WEIGHT|TRAFFIC_LM1_INPUTS_MODULE`, yeni `WIND_SNAPSHOT_MODULE: ProjectModule<WindCalculationSnapshot>`, `PREFERRED_SPAN_RULES_MODULE`, `CROSS_SECTION_VALUES_MODULE`, `GIRDER_LIBRARY_MODULE`.

### 3.2 Sahip depoları

**`familyRepository.ts`**
- `getFamilyRecords(c, fb)` = `FAMILY_SERVER_SECTIONS[c].read() ?? fb()`. `saveFamilyRecords` = `section.write(records)`.
- `getPrecastGirderDefinition(fb)`: `GIRDER_LIBRARY_SERVER_SECTION.read()`; değer `undefined` ya da dizi ise `fb`. `savePrecastGirderDefinition(v)` = `section.write(v)`; `[]` → wire `null` (R4).
- Modül yüklenirken her bölüme `subscribe` edilir ve `CATALOGS[c].event` ya da `kopruq:girder-catalog-changed` yayılır. `subscribeFamilyRecords` yalnızca adlı olayı dinler.
- Kalkanlar: `familyStorageKey`, `PRECAST_GIRDER_STORAGE_KEY`, `'storage'`, `PROJECT_DATA_CHANGED_EVENT`.

**`useFamilyCatalog.ts`**: okurken yazma kalkar (D14). Snapshot = `read() ?? fallbackCache[c]`; fallback bir kez hesaplanır ve kararlı referans tutulur. Abonelik bölüm `subscribe`'ı üzerinden.

**`projectWorkspace.ts`**
- `readProjectState(fb = [])`: bölüm değeri; yoksa `{INITIAL_PROJECT, ensureBridgeIds(fb)}`. Boş fallback memo'lanır.
- `writeProjectState(s)` = `WORKSPACE_SERVER_SECTION.write({...s, bridges: ensureBridgeIds(s.bridges)})`. `subscribeProjectState`. `readProjectUnits()` = `readProjectState().project.units`. `persistProjectState` kalkar.
- Yeni hook: `features/project/hooks/useProjectState.ts`.

**`bridge-definition/model/store.ts`**
- D6 UI katmanı (bellekte): `selectedBridgeId`; bridge başına `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`.
- `readBridgeDefinitionStore(bridges = readProjectState().bridges)` = `ensureBridgeDefinitions(bölüm+katman, bridges)`; memo anahtarı: bölüm, workspace ve katman referansları.
- `writeBridgeDefinitionStore(next)`: veri bölüme (wire UI alanlarını zaten atıyor), UI alanları katmana.
- `subscribeBridgeDefinitionStore` iki bölümü ve katmanı dinler; `useBridgeDefinitionStore` hook'u. `readStoredBridgeDefinitions()` = bölüm değeri. `onProjectSwitch` katmanı sıfırlar.
- Kalkanlar: `BRIDGE_DEFINITIONS_STORAGE_KEY`, `persistBridgeDefinitionStore`.

**`graphStore.ts`**
- `documents` koleksiyondan türetilir; liste boşsa bellekte yer tutucu graph. `activeGraphId` bellekte.
- `commit(next)` → `GRAPH_SERVER_COLLECTION.write(tüm liste)`; `false` dönerse değişiklik ve undo yok. Koleksiyon bildirimi snapshot'ı yeniler.
- `onProjectSwitch` (bildirimsiz): undo/redo, `dragStart`, `activeGraphId`, yer tutucu ve snapshot sıfırlanır.
- Kalkanlar: `persistGraphStore`, `export/import/reset/validateGraphDocuments`, `GRAPH_DOCUMENTS_STORAGE_KEY`, `'storage'`, `kopruq:project-data-changed`. `GraphWorkspace.tsx:73` silinir.

**`graphRunValidity.ts`, `graphViewPreferences.ts`**: modül düzeyinde bellek değişkeni; `onProjectSwitch`'te temizlenir ya da `DEFAULT_GRAPH_VIEW_PREFERENCES`'a döner. API aynı.

**`familySnapshotStore.ts`**: `onProjectSwitch` → map'i bildirim yapmadan temizler. Workspace epoch key'i ile yeniden mount edilir.

**Üç bileşen:** `'storage'` dinleyicileri silinir; adlı olaylar kalır (S1). `projectDataEvents.ts` silinir.

**Mount sırasında yazma (D9) korunur:** `MaterialsPanel` :45, `GirderLibraryPanel` :66, `PreferredSpanPanel.ensureRules`. Wire aynıysa PUT gitmez. İlk ziyarette bölüm başına en fazla 1 PUT.

**Fallback'ler (bugünkü sabitler):** `INITIAL_PROJECT` + `[]`; `INITIAL_CROSS_SECTION_VALUES`; `PRECAST_DIMENSIONS`; `NO_RULES`; `WIND_DEFAULT_INPUTS` (snapshot için `null`); `INITIAL_SELF_WEIGHT_INPUTS`; `NO_LM1_OVERRIDE`; `PIER_FALLBACK` (RECT-M); `INITIAL_MATERIALS`.

### 3.3 Kabuk

**`App.tsx`**
- Yapı: `<AppProviders><BrowserRouter><ProjectShell/></BrowserRouter></AppProviders>`.
- `ProjectShell`: `useUrlProjectId()` → `useProjectSessionController`. Nav her zaman görünür. Fazlar:
  - `welcome` → `WelcomeScreen` (New → `NewProjectDialog`, Open → `ProjectListDialog`)
  - `loading` / `load-error` → `ProjectLoadScreen` (Tekrar dene = `openProject(phase.projectId)`; liste; yeni proje)
  - `ready` → `RoutedApplication`; `WorkspacePage` key'i `file.sessionId` yerine `saveStatus.epoch`
- `actionError` kapatılabilir bant (`clearActionError`). `pendingSwitch` → `UnsavedChangesModal`.
- Veri bağlantıları:
  - `projectState` = `useProjectState()`; `setProjectState` = `writeProjectState(updater(readProjectState()))`.
  - `setBridges`: önce `writeProjectState`, sonra `writeBridgeDefinitionStore(ensureBridgeDefinitions(read, nextRows))`. İki seri PUT.
  - `bridgeDefinitions` = `useBridgeDefinitionStore()`.
  - `crossSectionValues` = `useProjectModule(CROSS_SECTION_VALUES_MODULE, INITIAL_CROSS_SECTION_VALUES)`.
  - `windLoads` = `useProjectModuleValue(WIND_SNAPSHOT_MODULE) ?? null`; `setWindLoads(s)` → `s ? write(s) : reset()`.
- `kopruq:project-units-changed` effect'i kalır (depolamasız).
- Kalkanlar: `.kopruq` ve Recent kodu, `showWelcome`, `INITIAL_BRIDGES` tohumu.

**`app/project-session/useUrlProjectId.ts` (yeni adaptör)**
- `urlProjectId` = `new URLSearchParams(useLocation().search).get('project') || null`.
- `setUrlProjectId(id)`: değer aynıysa hiçbir şey yapmaz; değilse `navigate({pathname: window.location.pathname, search, hash: window.location.hash}, {replace: true})`, senkron ve replace semantiğiyle.

**`TopWorkspaceNav.tsx`**
- Proje adı (`displayProjectName`) ve `SaveStatusIndicator` (`busy` = `busy || pendingSwitch !== null`).
- File menüsü: New…, Open…, Recent (`useProjectList(menuOpen)`, ilk 5; ad, tarih, kısa id), Exit.
- Ctrl+N isim diyaloğu, Ctrl+O liste, Ctrl+S `activeWriteQueue.flush().catch(()=>{})`.
- Kalkanlar: Save, Save As, Ctrl+Shift+S, file input, "Erişim yok".
- `Link` ve kabuk `Navigate`'leri `search`'ü korur. Diğer `navigate()` çağrıları controller'ın geri ekleme effect'ine (:265) bırakılır.

**`shared/ui/UnsavedChangesModal.tsx`**
- Props: `{open, busy, message, canRetry, onRetry, onDiscard, onCancel}`. Başlık "Kaydedilmemiş değişiklikler". Düğmeler TEKRAR DENE (`canRetry` false ise pasif), DEĞİŞİKLİKLERİ AT, İPTAL. `message` = `formatApiError(pending.error)`. `exit`'te hedef yok (union, M5b sapma 7).

**`beforeunload`** (`app/project-session/useBeforeUnloadWarning.ts`): olay anında `activeWriteQueue.pendingKeys().length > 0` ya da `status ∈ {error, rejected, conflict}` ise `preventDefault`.

**`main.tsx`:** `migrateLegacyStorage` kaldırılır.

### 3.4 Silinecek / değişecek / yeni dosyalar (`frontend/`)

**Silinecek production dosyaları**
- `src/shared/persistence/legacyStorageMigration.ts`
- `src/shared/project-file/projectDataEvents.ts`
- `src/app/project-file/{recentProjects,projectFileService,useProjectFile,projectDataContract,projectFileTypes,projectFileFixtures,projectModules}.ts` (dizinin tamamı)
- `src/shared/ui/RecentFileAccessModal.tsx`
- grep ile tüketicisi kalmadığı doğrulandıktan sonra: `src/features/project/model/projectStateSchema.ts`, `src/features/bridge-definition/model/schema.ts`, `src/features/family-registry/model/familySchemas.ts`, `src/features/graph/state/graphSchema.ts`
- `projectFileValidation.ts` kalır (`projectDataValidation.ts:2` kullanıyor).

**Silinecek testler (9)**
- `app/project-file/{useProjectFile.test.tsx, recentProjects.test.ts, projectModulesRoundTrip.test.ts, projectModules.test.ts, projectModuleRegistry.test.ts, projectFileService.test.ts, projectDataContract.test.ts, projectFileRealDefaults.test.tsx}`
- `test/architecture/sessionLayerUnwired.test.ts`

**Değişecek production dosyaları:** 3.1–3.3'tekiler; `features/graph/ui/GraphWorkspace.tsx`; `features/bridge-definition/components/BridgeDefinitionWorkspace.tsx`; `features/system-assembly/components/SystemAssemblyPanel.tsx`; `features/preferred-span/components/PreferredSpanPanel.tsx`; `features/loads/model/loadsWire.ts`; `app/workspaces/WorkspacePage.tsx` (gerekirse); `app/project-session/{useProjectSessionController.ts, ProjectListDialog.tsx}`; `features/*/index.ts` export'ları (grep ile).

**Yeni production dosyaları:** `features/project/hooks/useProjectState.ts`, `app/project-session/useUrlProjectId.ts`, `app/project-session/useBeforeUnloadWarning.ts`.

### 3.5 Test altyapısı

**`src/test/setup.ts`**
- `beforeEach`: `installFakeProjectApi(createFakeProjectApi())` ve `openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake)`.
- `afterEach`: önce `cleanup()`, sonra `resetActiveProject()`.

**`projectStoreTestUtils.ts`**
- `seedProjectData(key, v)` → ilgili bölümün `hydrate`'i (istek yok). `bridgeDefinitions` önce `ensureBridgeDefinitions(v, workspace.bridges)`'ten geçer; `graphDocuments` → koleksiyon `hydrate` + `selectGraphDocument`.
- `readProjectData(key)` → `read() ?? null`. `resetProjectData()` → `activeSections().hydrateEmpty()`. `loads.windSnapshot` eklenir.

**Proje kapalı başlaması gereken testler:** M5b testleri (`activeProject`, `projectSections`, `useProjectSessionController`, `serverSectionInstances`, `useSaveStatus`, `ProjectListDialog`, `useProjectList`, `SaveStatusIndicator`, `fakeProjectApi`) ve Welcome testleri kendi `beforeEach`'lerinde `resetActiveProject()` çağırır.

**`graphStore.test.ts`:** `vi.resetModules` yerine kapat/aç.

### 3.6 Rüzgâr ve m3b riskleri

**Akış (D13):** Calculate başarılı → tek `PUT loads/wind-snapshot` (sonuç dahil). Girdi değişince yalnızca `PUT loads/wind`; snapshot korunur ve STALE görünür. Hesaplama hata verirse yazma yok. `WindLoadsPanel.tsx` değişmez.

**Sonlu olmayan sonuç (m3b riski)**
- `windSnapshotToWire` şunlarda `typeof x === 'number' && Number.isFinite(x)` kontrol eder: 9 zorunlu sonuç alanı; dolu olduğunda `transverseKNm`; `inputs.deckWidthM` ve `inputs.drefM`.
- İhlalde `WireMappingError('result.<alan>' | 'inputs.<alan>', 'must be a finite number')`.
- Sonuç: `write` `false` döner, PUT gitmez, ayna eski snapshot'ta kalır. Durum `rejected` olur ve gösterge alan yolunu gösterir (yanıltıcı "is required" 400'ü oluşmaz). "Tekrar dene" kuyruğu sürdürür; "Değişiklikleri at" bekleyen her şeyi geri alır.
- Yapısal kontrol, backend sözleşmesinin aynısı; mühendislik kuralı değil. Backend'in sonlu olmayan değeri nasıl serileştirdiği doğrulanmadı; koruma her durumu kapsar.

**Ayrı PUT'lar (kısmi başarısızlık):** Kuyruk seri çalışır; `loads/wind` girdisi hesaplamadan önce kuyruğa girdiği için önce gider. Biri hata verirse kuyruk durur; snapshot bekler. Retry ikisini sırayla gönderir; Discard ikisini birlikte geri alır. Yeniden yüklemede uyumsuzluk varsa STALE kuralı sonucu gizler. Bölümler arası atomiklik yok (kabul edildi); davranış testle sabitlenir.

**Diğer m3b notları:** R2 kabul edildi, dokümanda kalır. Üst seviye `status` ile `result.status` farkı ve `-0` işareti kaybı: etkisiz, değişiklik yok.

### 3.7 M5b nitlerinin karşılığı

| Nit | Karar |
|---|---|
| YB1 `restoredUrlRef` testi | M5b'de çözüldü (S5). M5c: gerçek `useUrlProjectId` ile `AppSession` entegrasyon testi. URL Open B uçuşta iken listeden C seçilir; act'ler ayrılır; C açılır, URL C. |
| YB2 New sırasında loading fazı | M5b'de çözüldü (`:181`). M5c: kabuk testi. Bekletilen GET B + POST sırasında `ProjectLoadScreen` görünmez, Welcome görünür. |
| YB3 `architecture.md` boşluğu | M5b'de çözüldü (`:3301`). M5c bölümünde yalnızca adaptör sözleşmesi eklenir. |
| Cancel-with-Reload | `reloadProject` başına `if (pendingRef.current !== null) return`. Kabukta Reload düğmesi `busy` ya da `pendingSwitch` varken pasif. Testler: pending varken Reload GET göndermez ve pending korunur; Cancel uçuşta Reload bırakmaz. |
| ProjectListDialog odak | `section`'a `tabIndex={-1}` ve ref ile mount'ta odak; Kapat'tan `autoFocus` kalkar. Busy iken açılınca odak diyalogda; busy bitince Escape → `onClose`. Kabuk `onOpen`'dan hemen sonra diyaloğu kapatır. |
| Çift `setUrl` | Controller değişmez. Adaptör aynı değerde hiçbir şey yapmaz ve `replace` kullanır. Test: liste Open'ında `history.length` artmaz, son URL C. |

---

## 4. Görevler (sıralı aşamalar ve kontrol noktaları)

Aşamalar ara çalışma ağacı durumlarıdır. Teslim edilen sonuçta karma kaynak yoktur.

**Aşama 0 – Önkoşullar (salt okuma)**
1. Helper `check` çalıştırılır. `git status --short` temiz olmalı (m5c2 dokümanları hariç).
2. m3b HEAD'de olmalı: `git log --oneline -- backend/src/main/resources/db/migration/V6__wind_snapshot_result.sql frontend/src/features/loads/model/loadsWire.ts` bir commit göstermeli. Göstermiyorsa dur ve `blocked`.
3. `loadsWire.ts`'te `result: windResultWireSchema.nullable()` ve `WIND_SNAPSHOT_SECTION` tipinin `WindCalculationSnapshot` olduğu doğrulanır. Değilse dur ve `blocked`.
4. M5b YB1–YB3 kodu yerinde olmalı (controller :181/:195/:203, :256–260).
5. Taban çizgisi ölçülür: `npm test` (119/1187 beklenir), `npm run build`, `npm run lint`.

**Aşama 1 – Proje değişimi kancaları ve modül deposu**: `familySnapshotStore.ts`, `graphRunValidity.ts`, `graphViewPreferences.ts`, `projectModuleStore.ts`, `useProjectModule.ts`, 4 modül dosyası (+`WIND_SNAPSHOT_MODULE`), `loadsWire.ts` sonluluk koruması.

**Aşama 2 – Sahip depoları (3.2)** ve üç bileşenin `'storage'` silmesi; `GraphWorkspace.tsx:73`.

**Aşama 3 – Test altyapısı (3.5)**; 5 dosya yeniden yazılır, M5a'da taşınan testler uyarlanır. **Kontrol noktası:** `npx vitest run src/features src/shared` yeşil (App ve `project-file` hariç).

**Aşama 4 – Kabuk (3.3)**, controller ve dialog düzeltmeleri (3.7), silmeler (3.4). **Kontrol noktası:** `npx tsc -b` temiz ve tam `npm test` yeşil.

**Aşama 5 – Yeni ve uyarlanan testler (bölüm 5/6)**: `noBrowserStorage.test.ts` `ALLOWED_FILES = []`, `STORAGE_LISTENER_ONLY_FILES = []`; `sessionLayerUnwired.test.ts` silinir.

**Aşama 6 – Dokümanlar ve kontroller**
- `docs/architecture.md`: "BACKEND-DB-PERSISTENCE M5c (tarih)" bölümü (bağlama, D6 katmanı, adaptör sözleşmesi, sonluluk koruması, Reload koruması, silinenler); 3292 ve 3304'teki "not wired"/"Deferred to M5c" notlarına "superseded by M5c".
- `docs/roadmap.md`: `[x] M5c`, `:1922` M5 `[x]`, `:1851` notu.
- `frontend/README.md:21–24, 39–42`: localStorage ve `app/project-file` anlatımı yerine sunucu bölümleri.
- Tam kontroller çalıştırılır; 7.2 elle kontrol listesi engineer'a iletilir.

---

## 5. Kabul kriterleri (parantez içi: üst plandaki karşılığı)

- **AC1 (AC19):** `ALLOWED_FILES` ve `STORAGE_LISTENER_ONLY_FILES` boş; ratchet yeşil. 3.4'teki silinen dosyalar yok. Production kaynakta `\.kopruq` ve `kopruq.*` storage anahtarı literal'i yok.
- **AC2 (AC20):** `browserStorageRuntime.test.tsx`: tam akıştan (New, düzenleme, Open, Exit) sonra `localStorage.length === 0`, `sessionStorage.length === 0`, `Storage.prototype.setItem/getItem` çağrılmamış, stub'lanmış `indexedDB.open` 0 kez çağrılmış.
- **AC3 (AC21):** Welcome'da proje isteği yok. New → isim diyaloğu (boş adda pasif) → tek POST (`name.trim()`) → URL'de `?project=<id>`; nav'da ad ve "Kaydedildi". `/project`'te 1 s içinde başka istek yok. File menüsü açılınca `GET /api/projects`.
- **AC4 (AC22):** `PROJECT_SECTION_DEFINITIONS`'taki 16 path ve `graphs/<id>` için örnek düzenleme 300 ms sonra tek PUT; `expectedRevision` zincirlenir. `setBridges` sırayla workspace ve bridge-definitions PUT'ları gönderir. Yeniden açılınca değerler eşit.
- **AC5 (AC23):** 409'da conflict bandı görünür ve yeni PUT gitmez. "Yeniden yükle" GET yapar, durum `idle`. Otomatik merge yok.
- **AC6 (AC24):** 5xx/ağ hatasında `formatApiError`; bekleyenler korunur; Retry ve Discard çalışır. 400'de ilk 3 alan hatası gösterilir. `beforeunload` bekleyen ya da hatalı yazma varken uyarır, `idle` iken uyarmaz.
- **AC7 (AC25):** Liste ve Recent `updatedAt` azalan; Recent ilk 5. Proje değiştirmeden önce flush; başarısızsa modal (TEKRAR DENE / AT / İPTAL; conflict'te Retry pasif). Geçersiz doküman oturumu değiştirmez.
- **AC8 (AC24/26):** Proje değişiminde run validity, family snapshot'ları, graph görünümü, bridge UI katmanı, `activeGraphId` ve undo sıfırlanır. Hiçbir PUT gövdesinde `selectedBridgeId`, `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`, `keyBy`, `activeGraphId` yok.
- **AC9 (AC25/27):** Yazılmamış bölümlerde 3.2'deki fallback'ler görünür. Pier, PierCap, Foundation ve Bearing panelleri 0 PUT gönderir; Pier'de RECT-M görünür ve bölüm `undefined` kalır (S9). D9 panelleri ilk ziyarette ≤ 1 PUT. Mühendislik değeri ya da birim değişmez.
- **AC10 (AC28):** Yalnızca UI alanı değiştiren bridge işlemleri UI'ı günceller ve 0 PUT gönderir. Veri değişikliği tek `bridge-definitions` PUT'u gönderir.
- **AC11 (AC29):** Calculate → tek `PUT loads/wind-snapshot`; gövdedeki `result` servis yanıtıyla sayı sayı aynı. Kapatıp açınca panel aynı sonucu gösterir. Girdi değişince yalnızca `PUT loads/wind` ve STALE. Hesaplama hata verirse PUT yok. INVALID sonuç saklanır ve bugünkü gibi gösterilir.
- **AC12 (m3b riski):** `Infinity`, `NaN` ya da string sonuç alanında 0 PUT; durum `rejected`, hata yolu `result.<alan>`; panel önceki snapshot'ı korur; Retry → `idle`. `loads/wind` 500 verirse snapshot gönderilmez; Retry iki PUT'u sırayla gönderir; Discard ikisini geri alır.
- **AC13 (AC30):** Proje yokken sahip yazma API'leri `false` döner ve istek göndermez; workspace mount edilmez.
- **AC14 (AC31):** Uygulama içi gezinme `?project`'i korur ya da geri ekler. Farklı bir `?project` kapıdan geçip o projeyi açar. Exit parametreyi kaldırır. Adaptör aynı değerde hiçbir şey yapmaz ve `replace` kullanır.
- **AC15 (AC32):** İlk yükleme loading → ready. 404 ya da hata ekranında üç eylem var ve "Tekrar dene" yeniden açar. Kısmi hydrate yok.
- **AC16 (AC33):** Save, Save As, dosya seçici, "Erişim yok" ve `RecentFileAccessModal` yok. Ctrl+S flush, Ctrl+O liste, Ctrl+N isim diyaloğu.
- **AC17 (M5b nitleri):** 3.7'deki testler yeşil (Reload koruması, odak, `history.length`, YB1 ve YB2 entegrasyonu).
- **AC18 (AC34):** build, test ve lint çıkışı 0; `layerRules` ve `sourceEncoding` yeşil. `mvn -f backend/pom.xml -B package` başarılı (732 test). `git status --short -- backend frontend/package.json frontend/package-lock.json` boş. Yeni `.skip`/`.only` yok.
- **AC19 (AC35):** Architecture'da M5c bölümü var; roadmap'te M5c ve M5 `[x]`, 1851 güncel; README'de localStorage ya da `.kopruq` anlatımı kalmadı.

---

## 6. Doğrulama

### 6.1 Matris

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `npx vitest run src/test/architecture` + `Grep '\.kopruq'` | yeşil / 0 |
| AC2 | `browserStorageRuntime.test.tsx` | 0 çağrı |
| AC3, AC5–AC7, AC13–AC17 | yeni `src/app/AppSession.test.tsx`, uyarlanan `App.test.tsx`, `TopWorkspaceNav.test.tsx` (QueryClientProvider ile), `useProjectSessionController.test.tsx` (+Reload), `ProjectListDialog.test.tsx` (+odak) | yeşil; fake `requests` günlüğü |
| AC4 | yeni `src/app/project-session/sectionWrites.test.ts` (fake timers) | 17 path, tek PUT, revizyon zinciri |
| AC8, AC10 | yeni `src/features/bridge-definition/model/bridgeDefinitionUiState.test.ts`, `graphStore.test.ts`, gövde taraması | yeşil |
| AC9 | yeni `src/app/project-session/realDefaultsWire.test.ts`, `PierFamiliesPanel.test.tsx`, `MaterialsPanel.test.tsx` (G3 sayacı → fake PUT sayısı) | yeşil |
| AC11, AC12 | `WindLoadsPanel.test.tsx` (+yeniden açılış), `loadsWire.test.ts` (+sonluluk), `AppSession.test.tsx` | yeşil |
| AC18 | `cd frontend && npm run build && npm test && npm run lint` (PowerShell'de `npm.cmd`); `mvn -f backend/pom.xml -B package`; git status | çıkış 0 / boş |
| AC19 | inceleme | var |

Odaklı koşu: `cd frontend && npx vitest run <dosya>`. Tip kontrolü: `npx tsc -b`.

Test sayısı: 9 dosya silinir, 5 yeni dosya eklenir, mevcut testlere vaka eklenir. Implementer önce/sonra dosya ve test sayısını raporlar; sayı önceden tahmin edilmez.

### 6.2 Elle uçtan uca kontrol (gerçek backend)

Üst planın 7.2 listesi aynen geçerli. Rüzgâr adımı 7'ye ek: DevTools'ta `PUT loads/wind-snapshot` gövdesinde `result` görülür.

### 6.3 Riskler

- **Büyüklük:** yaklaşık 45 production ve 30 test dosyası. Aşama kontrol noktaları zorunlu.
- **Global açık proje:** "proje yok" varsayan testleri bozar; bunlar opt-out eder (3.5).
- **Modül düzeyindeki `QueryClient`:** App testleri arasında `['projects']` önbelleği paylaşılır. `staleTime: 0` yeniden çeker; testler `waitFor` kullanmalı.
- **`useSyncExternalStore` kararlılığı:** fallback'ler ve birleştirilmiş görünümler memo'lanmalı; aksi halde sonsuz render.
- **Grup sürükleme:** her harekette `write`; kuyruğun 300 ms debounce'u ve anahtar bazında birleştirme sayesinde tek PUT. Büyük graph'ta wire karşılaştırma maliyeti elle ölçülmeli.
- **`selectOrCreateBridgeGraph` (`GraphWorkspace.tsx:148`):** ilk köprü seçiminde bir graph PUT'u gönderir (bugünkü kalıcı davranışın sunucu karşılığı).
- **Switch dinleyicileri:** hydrate'ten önce çalışır, bölüm okumamalı ve bildirim yapmamalı.
- **Adaptör senkron değilse:** `restoredUrlRef` bayat kalır (M5b nit 5). Mutlak path ile `replace` kullanılır ve test edilir.
- **Bölümler arası atomiklik yok:** `setBridges` ve rüzgâr. Kuyruk durur; kullanıcı Retry ya da Discard eder.
- **Sekme kapanırken debounce içindeki son değişiklik kaybolabilir:** `beforeunload` uyarır.
- **CORS:** yalnızca `localhost:5173`.
- **R2:** saklı eski sonuç güncel görünebilir (kabul edildi).
- **Geri alma:** M5c geri alınırsa uygulama localStorage'a döner; DB verisi kalır.

### 6.4 Varsayımlar ve planlayıcı kararları

- **Varsayımlar:** m3b HEAD'de (Aşama 0'da doğrulanır). 732 ve 1187 sayıları koordinatörün raporu. React Router 7'de `navigate(..., {replace:true})` history'yi senkron günceller; testle doğrulanır.
- **Planlayıcı kararları (değiştirilebilir):** sonlu olmayan değerin yerel reddi; graph görünüm tercihinin proje değişiminde sıfırlanması; okumada bridge uzlaştırması (S10); Reload koruması; dialog odak çözümü; Recent'te 5 kayıt; Türkçe metinler; adaptör ve `beforeunload` için ayrı dosyalar.
- **Açık mühendislik/ürün sorusu:** Yok. Rüzgâr sonucunun saklanması, bugünkü fallback'ler ve New'da ad sorulması kullanıcı kararıyla sabit.

**READY** (koşul: Aşama 0'daki önkoşullar, özellikle m3b'nin HEAD'de olması ve temiz çalışma ağacı).
