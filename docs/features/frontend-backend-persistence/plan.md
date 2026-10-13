# Plan: frontend-backend-persistence (revizyon 2, kullanıcı cevaplarıyla)

**Sonuç: READY.** Plan, ayrı backend feature'ı `backend-project-api` **sert ön koşul** olarak tamamlandığında uygulanmaya hazır. Bu feature'da backend kodu yazılmıyor; frontend'in beklediği sözleşme 3.3'te tanımlı. Backend modellemesi için gereken mühendislik ve model kararları 9.2'de açık soru olarak listeli; bunlar backend feature'ında cevaplanmalı.

Kullanıcı kararları: Q1 ayrı backend feature önce; Q2 ilişkisel tipli model; Q3/Q6 `.kopruq` tamamen kalkar, tarayıcı verisi taşınmaz; Q4 açık Save + dirty + `beforeunload`; Q5 hesaplanmış/UI durumları yalnızca bellekte; Q7/Q8/Q9 varsayılanlar (yerel tek kullanıcı, backend kapalıysa hata mesajı, silme UI yok).

---

## 1. Amaç ve kapsam dışı olanlar

**Amaç:**
- Frontend'deki tüm tarayıcı kalıcı depolamasını (`localStorage`, `IndexedDB`) ve `.kopruq` dosya desteğini tamamen kaldırmak.
- Projeyi backend veritabanından tipli bir aggregate olarak açmak ve kaydetmek. Kayıt açık bir Save ile, tek bir transactional `PUT` ile yapılır.
- Çalışma verisini yalnızca bellekte tutmak. Dirty takibi ve `beforeunload` uyarısı korunur.
- "Recent" listesini backend'deki proje listesinden almak.

**Kapsam dışı:**
- **Backend kodu.** Endpoint'ler, migration'lar, entity'ler ve typed model `backend-project-api` feature'ının işi. CLAUDE.md'ye göre onaysız endpoint eklenmez.
- **`.kopruq` Import/Export ve tarayıcı verisinin taşınması** (Q3/Q6).
- **Proje silme UI'ı** (Q9). Yeniden adlandırma mevcut `ProjectWorkspaceData.name` alanı + Save ile yapılır.
- **Auth ve çok kullanıcı** (Q7). **Çevrimdışı mod** (Q8).
- **Mühendislik.** Hiçbir mühendislik kuralı, birim dönüşümü veya varsayılan eklenmez ya da değişmez. Frontend değerleri mevcut alan adları ve birimleriyle olduğu gibi gönderir.
- **Hesaplanmış sonuçların kalıcılığı.** `graphRunValidity` ve family snapshot'ları bellekte kalır; wind sonucu için bkz. E-B6.
- **Yeni npm bağımlılığı yok.** `@tanstack/react-query`, `react-router-dom` ve `zod` zaten var.

## 2. Mevcut mimari (doğrulanmış)

### 2.1 Frontend depolama envanteri (test dışı kaynak)

| Veri | Dosya / sembol | Anahtar |
|---|---|---|
| Proje + köprü satırları | `frontend/src/features/project/model/projectWorkspace.ts` (`readProjectState`, `persistProjectState`, `normalizeProjectState`, `ensureBridgeIds`) | `kopruq.project-workspace.v1` |
| Bridge definitions | `frontend/src/features/bridge-definition/model/store.ts` (`readBridgeDefinitionStore`, `persistBridgeDefinitionStore`, `ensureBridgeDefinitions`) | `kopruq.bridge-definitions.v1` |
| Graph dokümanları | `frontend/src/features/graph/state/graphStore.ts` (`GraphDocuments`, `exportGraphDocuments`, 100. satırda `readProjectState`) | `kopruq.graph.documents.v1` |
| 5 family kataloğu + girder library | `frontend/src/features/family-registry/model/familyRepository.ts` (`CATALOGS`, `getFamilyRecords`, `saveFamilyRecords`, `getPrecastGirderDefinition`, `savePrecastGirderDefinition`, `subscribeFamilyRecords` içindeki `storage` event'i) | `kopruq.project-design-system.*`, `kopruq.girder-library.precast` |
| 8 proje modülü | `frontend/src/shared/project-file/projectModuleStore.ts` (`createProjectModule`); `useProjectModule.ts`; kayıt defteri `frontend/src/app/project-file/projectModules.ts` (`PROJECT_MODULES`) | `features/loads/model/loadsProjectModules.ts`, `preferred-span/model/preferredSpanRulesProjectModule.ts`, `superstructure-families/model/crossSectionProjectModule.ts`, `family-registry/model/girderLibraryProjectModule.ts` |
| Ham okumalar | `family-registry/model/registry.ts`, `family-registry/hooks/useFamilyCatalog.ts`, `bridge-definition/components/BridgeDefinitionWorkspace.tsx`, `system-assembly/components/SystemAssemblyPanel.tsx`, `preferred-span/components/PreferredSpanPanel.tsx`, `pier-families/components/PierFamiliesPanel.tsx` | – |
| Hesaplanmış / UI | `features/graph/family/graphRunValidity.ts`, `features/graph/state/graphViewPreferences.ts` | `kopruq.graph.successful-runs.v1`, `kopruq.graph.view-preferences.v1` |
| Recent + dosya | `frontend/src/app/project-file/recentProjects.ts` (IndexedDB `kopruq-project-files`, `kopruq.recent-projects.metadata.v1`); `projectFileService.ts` (`writeProjectFile`, `readProjectFile`, `projectFileText`, `KOPRUQ_FILE_PICKER_OPTIONS`, `migrateLegacyBoxPierParameters`, `backupModuleValue` → `kopruq.backup.*`); `projectFileFixtures.ts` | – |
| Eski namespace taşıması | `frontend/src/shared/persistence/legacyStorageMigration.ts`, `frontend/src/main.tsx:6` | `spanova.*` |

**Oturum mantığı:**
- `frontend/src/app/project-file/useProjectFile.ts`: dirty takibi `PROJECT_DATA_CHANGED_EVENT` ve parmak izi ile; `FileRef` ve `recentId` burada.
- `frontend/src/app/project-file/projectDataContract.ts`: `PROJECT_DATA_ENTRIES` (snapshot, restore, reset, apply, export) ve `PROJECT_FILE_SESSION_SECTIONS`.
- `frontend/src/app/App.tsx`: 53–56 başlangıç durumu `readProjectState(INITIAL_BRIDGES)`; 79–101 New/Open/Recent/`reselectRecentProject`; 102 `beforeunload` uyarısı **zaten var**; 119 `RecentFileAccessModal`; 70–71 `windLoads` ve `crossSectionValues` React state.

**Doğrulama şemaları (yeniden kullanılacak):** `features/project/model/projectStateSchema.ts`, `features/bridge-definition/model/schema.ts`, `features/family-registry/model/familySchemas.ts` (`parseFamilyRecords`), `features/graph/state/graphSchema.ts`, modül zod şemaları, `shared/project-file/projectFileValidation.ts` (`ProjectFileValidationError`).

**Diğer:** HTTP `frontend/src/shared/api/http.ts` (`API_BASE`, `ApiError`, `requestJson`, `postJson`, `formatApiError`; `putJson` yok). React Query `frontend/src/app/providers/AppProviders.tsx`. Testler: 26 dosyada 128 localStorage/indexedDB kullanımı.

### 2.2 Backend (doğrulanmış)

- Proje endpoint'i yok. `docs/roadmap.md` 1839. satır: "use case/endpoint that saves a bridge `Project` ... frontend localStorage migration" henüz yapılmadı.
- Var olanlar: `com.kopruq.bridge.application.ProjectRepository` (yalnızca `save`, `findById`); `backend/src/main/resources/db/migration/V2__bridge_project.sql`: `project` (`row_version`), `project_bridge`, `project_design_space`, `bridge_alternative`, `bridge_alternative_span`.
- `com.kopruq.bridge.model.Project` yalnızca `projectName`, `bridge`, `designSpace` ve alternatives taşıyor; frontend verisinin neredeyse tamamı backend modelinde yok.
- `docs/architecture.md` 3095. satır: hesaplanmış sonuçlar kalıcı tutulmaz.

## 3. Önerilen tasarım

### 3.1 Sınırlar

1. **Sunucu (ön koşul):** Proje aggregate'i tipli ve ilişkisel olarak backend'de saklanır. Frontend yalnızca 3.3'teki JSON sözleşmesini bilir.
2. **Bellek içi oturum deposu.** Yeni `frontend/src/shared/persistence/projectSessionStore.ts`: senkron `getItem`, `setItem`, `removeItem`, `clear`, `keys`; `Map<string,string>` tabanlı. Mevcut depolar `localStorage` yerine bunu kullanır; senkron okuma API'leri, olaylar (`PROJECT_DATA_CHANGED_EVENT`, `PROJECT_MODULE_CHANGED_EVENT`, `kopruq:*-catalog-changed`), `PROJECT_DATA_ENTRIES` snapshot/restore/reset semantiği ve dirty takibi değişmeden kalır. Anahtar sabitleri bellekteki bölüm adları olarak kalır. `subscribeFamilyRecords` içindeki `storage` event dinleyicisi kaldırılır.
3. **Aggregate eşleyici (saf serileştirme, domain mantığı yok).** Yeni `frontend/src/app/project-store/projectAggregate.ts`: `ProjectAggregate` tipi + zod yanıt şeması; `buildProjectAggregate(projectState, bridgeDefinitions, windLoads)` (`buildProjectFile`'ın yerini alır, `PROJECT_DATA_ENTRIES.exportValue()` kullanır); `applyProjectAggregate(aggregate)` (validation → normalizasyon → bellek deposuna atomik uygulama, hata olursa snapshot'a geri dönüş). Yalnızca şekil dönüşümü (map ↔ dizi); birim/değer dönüşümü yok.
4. **API istemcisi.** Yeni `frontend/src/app/project-store/projectApi.ts`: `listProjects`, `getProject`, `createProject`, `saveProject` (`http.ts` üzerinden; `putJson` eklenir).
5. **Oturum hook'u.** `useProjectFile.ts` → `frontend/src/app/project-store/useProjectSession.ts`: `FileRef` yerine `{ projectId, revision }`; dirty, `save`, `open(projectId)`, `resetForNewProject`, `closeSession` semantiği korunur.

### 3.2 Veri akışı

**Başlangıç:** Aktif proje `?project=<uuid>` sorgu parametresinde (`router.tsx`'teki `:section` route'larına dokunulmaz). Parametre varsa `GET` + yükleme göstergesi; yoksa Welcome ekranı (New / Open). Open, backend proje listesini gösteren dialog. Bellek deposu boşken başlangıç bugünkü "boş depolama" fallback'i (`readProjectState(INITIAL_BRIDGES)`) ile aynı; Save edilmedikçe hiçbir yere yazılmaz.

**Open:** (1) `GET /api/projects/{projectId}`; (2) zod doğrulama; (3) `applyProjectAggregate` → `clearFamilySnapshots()` ve `clearSuccessfulGraphRuns()` → React state güncelleme; (4) `revision` saklanır, dirty false, URL güncellenir; (5) hatada bellek ve React state önceki hale döner, hata gösterilir.

**Save** (açık, tek transactional istek): (1) `buildProjectAggregate`; (2) proje yoksa `POST /api/projects` → `projectId` + `revision` saklanır, URL güncellenir; (3) varsa `PUT /api/projects/{projectId}` + `expectedRevision`; (4) kayıt sırasındaki değişiklikler korunur (`changeVersion`), dirty kapanmaz; (5) 409: "Proje başka bir yerde değiştirildi" mesajı, dirty true, bellek değişmez, otomatik retry/merge yok; (6) 400: `ApiError.fieldErrors` ilk üç alanla; (7) ağ/5xx: `formatApiError` + correlation id, dirty true.

**New Project:** `resetProjectStorage()` belleği temizler, `projectId` undefined, URL parametresi kalkar; ilk Save'de `POST`.
**Recent:** `useQuery(['projects'])` ile `GET /api/projects`, `updatedAt` azalan; Save/New sonrası invalidate.
**Exit:** `closeSession` URL parametresini kaldırır, Welcome gösterir.
**`beforeunload`:** `App.tsx` 102. satırdaki mevcut uyarı korunur.

### 3.3 Backend sözleşmesi (`backend-project-api` feature'ının sağlaması gereken)

Hatalar mevcut `ApiErrorResponse` biçiminde.

| Metot | Yol | İstek | Yanıt | Hatalar |
|---|---|---|---|---|
| GET | `/api/projects` | – | `ProjectSummary[]` | 5xx |
| POST | `/api/projects` | `ProjectAggregate` | `ProjectSaved` | 400 |
| GET | `/api/projects/{projectId}` | – | `ProjectDocument` | 404 |
| PUT | `/api/projects/{projectId}` | `{ expectedRevision: number } & ProjectAggregate` | `ProjectSaved` | 400, 404, **409** (`code`: örn. `PROJECT_REVISION_CONFLICT`) |

Tipler: `ProjectSummary = { projectId (UUID), name, updatedAt (ISO-8601), revision }`; `ProjectSaved = { projectId, revision, updatedAt }`; `ProjectDocument = { projectId, revision, updatedAt } & ProjectAggregate`.

PUT semantiği: tüm aggregate tek transaction; `expectedRevision` uyuşmazsa hiçbir şey yazılmaz, 409; `revision` her yazmada artar (`project.row_version` kullanılabilir); backend'in yönettiği bölümler (`designSpace`, `generatedAlternatives`, `selectedAlternativeId`) gövdede yoktur ve PUT ile **silinmez**.

**`ProjectAggregate`** (alan adları mevcut frontend tipleriyle birebir, değerler bugünkü birimleriyle):

| Bölüm | Şekil (kaynak tip) | Not |
|---|---|---|
| `project` | `ProjectWorkspaceData` (`features/project/model/projectWorkspace.ts`): ~25 string alan + `units`, `coordinate`, `criteria`, `environment { terrainDatasetId, landXmlImportId }`, `lastModified` | `project.id` kullanıcı alanı; `projectId` (UUID) ile karıştırılmamalı. |
| `bridges` | `BridgeRow[]` (`features/project/model/types.ts`): `id`, `no`, `km`, `crossingType`, `estimatedLengthM`, `roadWidthM`, `terrain`, `status`, `bridgeType`, `spansM: number[]`, `girderDepthCm: number[] \| null`, `girderNote`, `pierShape` | Sıra korunur; `ensureBridgeIds` Save öncesi. |
| `bridgeDefinitions` | `{ selectedBridgeId, definitions: Array<{ definitionKey } & BridgeInstanceDefinition> }`; `axes`, `axisAssignments`, `constraints` sıralı; `abutmentFamilyIds { A1, A2 }`; UI alanları | `definitionKey` = bugünkü map anahtarı (E-B2). |
| `graph` | `GraphDocuments`: `{ activeGraphId, graphs: KopruqGraph[] }` (`features/graph/domain/types.ts`) | Parametreler node tipine göre değişir (E-B3). |
| `families` | `{ PIER, PIER_CAP, FOUNDATION, BEARING, MATERIAL }` kayıt dizileri | Bilinmeyen alanlar bugün korunuyor (E-B4). |
| `girderLibrary` | `{ enabled?, dimensions? }` veya eski dizi \| `null` | E-B5. |
| `preferredSpanRules` | `PreferredSpanRule[] \| null` | |
| `crossSectionValues` | `{ platformWidthM, leftWalkwayM, rightWalkwayM, spaceOfGirderM, numberOfGirders } \| null` | |
| `loads` | `{ seismicInputs, windInputs, temperatureInputs, selfWeightInputs, trafficLm1, windLoads } ` her biri `\| null` | String girdiler string kalır (E-B1); `windLoads.result` hesaplanmış (E-B6). |

Uyumluluk: sunucu alanı `null`/boş döndürürse mevcut normalizasyonlar (`normalizeProjectState`, `ensureBridgeDefinitions`, `ensureBridgeIds`) uygulanır. Doğrulama hatası: `Invalid project data: <path> - <message>`, proje açılmaz.

### 3.4 Bellekte kalanlar (yenilemede sıfırlanır)
`projectSessionStore`'un tamamı (kaydedilmemiş çalışma kopyası); `graphRunValidity` ve family snapshot'ları; `graphViewPreferences` (varsayılana döner); graph undo/redo yığınları.

## 4. Alternatifler
- Save: tek aggregate PUT (seçilen) vs bölüm başına PUT (atomik değil, kısmi kayıt riski).
- Bellek deposu (seçilen) vs her depoyu async React Query'ye çevirmek (onlarca senkron çağrı, snapshot/rollback ve 26 test dosyası kırılır, çok endpoint).
- Opak `ProjectFile` blob'u: Q2 ile reddedildi.
- Frontend'de birim dönüşümü: reddedildi (domain mantığı; E-B1).

## 5. Sıralı implementasyon görevleri

**T0 – Ön koşul kontrolü (kod yok):** `backend-project-api` implement edilmiş ve endpoint'ler 3.3 ile uyuşmalı (controller/DTO incelenir). Uyuşmazlık varsa implementasyon `blocked`; yeni slug ile yeniden plan.

**T1 – Bellek deposu:** Oluştur `shared/persistence/projectSessionStore.ts` (+ test). Sil `shared/persistence/legacyStorageMigration.ts`. Değiştir `main.tsx` (`migrateLegacyStorage` çağrısı).

**T2 – Depoları bağla (T1):** `shared/project-file/projectModuleStore.ts`, `useProjectModule.ts`; `family-registry/model/familyRepository.ts` (`storage` dinleyicisi kalkar), `registry.ts`, `hooks/useFamilyCatalog.ts`; `bridge-definition/model/store.ts`; `project/model/projectWorkspace.ts`; `graph/state/graphStore.ts`, `graph/family/graphRunValidity.ts`, `graph/state/graphViewPreferences.ts`; ham okumalar (`BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx`, `PreferredSpanPanel.tsx`, `PierFamiliesPanel.tsx`) sahibi repository fonksiyonlarına yönlendirilir; `app/project-file/projectDataContract.ts`. Kural: `shared` → `features` importu eklenmez (`layerRules.test.ts`).

**T3 – HTTP ve sözleşme (T1'den bağımsız):** `shared/api/http.ts` `putJson` (+ test); `app/project-store/projectApi.ts`, `projectAggregate.ts` + testler.

**T4 – Oturum (T2, T3):** `useProjectFile.ts` → `app/project-store/useProjectSession.ts`. `projectFileService.ts` küçülür (`snapshotProjectStorage`, `restoreProjectStorage`, `resetProjectStorage`, `ProjectStorageRollbackError` kalır); silinir: `writeProjectFile`, `readProjectFile`, `projectFileText`, `KOPRUQ_FILE_PICKER_OPTIONS`, `backupModuleValue`, `missingModulesMessage` yedek metni, `migrateLegacyBoxPierParameters` (önce grep ile başka çağıran olmadığı doğrulanır). `projectFileTypes.ts`/`projectFileFixtures.ts` aggregate fixture'larına dönüşür. Sil `recentProjects.ts` ve testi.

**T5 – UI (T4):** `app/App.tsx`: `openProject(File)`, `openRecentProject`, `reselectRecentProject`, `RecentFileAccessModal` kalkar; proje listesi Open dialog'u; `?project=` okuma/yazma; yükleme/hata durumları; `reportSaveError` 409/`ApiError` için güncellenir. `app/layout/TopWorkspaceNav.tsx`: Recent backend listesine bağlanır, "Erişim yok"/dosya adı kalkar, Open proje listesini açar. Welcome metni "Open Project". `router.tsx` yalnızca gerekirse.

**T6 – Testler:** 26 test dosyasındaki localStorage kurulumları `projectSessionStore` yardımcılarına; `fetch` mock'u ile list/open/create/save/409/404/400/ağ hatası testleri; yeni `src/test/architecture/noBrowserStorage.test.ts`.

**T7 – Dokümantasyon:** `frontend/README.md` 23. satır; `docs/architecture.md`, `docs/roadmap.md` (1839. satırdaki "frontend localStorage migration" kapatılır).

## 6. Kabul kriterleri

- **AC1:** `frontend/src` test dışı kaynakta `localStorage`, `sessionStorage`, `indexedDB`, `IDBDatabase`, `showOpenFilePicker`, `showSaveFilePicker`, `FileSystemFileHandle` geçmez.
- **AC2:** Kullanım sırasında tarayıcıda `kopruq.*`/`spanova.*` anahtarı veya `kopruq-project-files` IndexedDB'si oluşmaz.
- **AC3:** Yeni projede Save `POST /api/projects` ile 3.3 `ProjectAggregate` gövdesini gönderir; dönen `projectId` URL'ye yazılır, dirty false.
- **AC4:** Var olan projede Save `PUT /api/projects/{projectId}` ile `expectedRevision` = son revision, tek istek. Başarıda revision güncellenir, dirty false; Save sırasındaki değişiklik dirty'yi açık tutar.
- **AC5:** Open yanıtı doğrular ve uygular; proje, köprüler, bridge definitions, graph, 5 family kataloğu, girder library, preferred span rules, cross section, 5 yük modülü ve `windLoads` Save öncesiyle aynı (round-trip testi).
- **AC6:** Geçersiz yanıtta `Invalid project data: <path> - <message>`; bellek deposu, React state, `projectId`/revision ve dirty değişmez.
- **AC7:** 409'da çakışma mesajı; veri ve dirty=true korunur, otomatik retry yok.
- **AC8:** Ağ hatası/5xx'te `formatApiError` metni (correlation id); yerel yedek yazılmaz, dirty true. 400'de alan hataları gösterilir.
- **AC9:** Recent listesi `GET /api/projects` sonucunu `updatedAt` azalan gösterir; seçim Unsaved-changes modal'ından geçerek AC5 akışını başlatır.
- **AC10:** *(kaldırıldı: `.kopruq` desteği yok)*
- **AC11:** `?project=<uuid>` ile açılan/yenilenen sayfa projeyi backend'den yükler; parametre yoksa Welcome; kaydedilmemiş değişiklikle çıkışta `beforeunload` uyarısı.
- **AC12:** New Project tüm `PROJECT_DATA_ENTRIES` girdilerini bellekte sıfırlar ve URL parametresini kaldırır; backend'e yazılmaz.
- **AC13:** Hiçbir mühendislik değeri, varsayılan, birim veya kural değişmez; gönderilen değerler bellektekilerle birebir aynıdır.
- **AC14:** Yenileme sonrası `graphRunValidity`, family snapshot'ları ve graph görünüm tercihi sıfırdır.
- **AC15:** `.kopruq` ile ilgili tüm UI ve kod kaldırılmıştır.
- **AC16:** `npm run build`, `npm test`, `npm run lint` (`frontend/`) başarılı; `layerRules.test.ts` geçer.

## 7. Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1, AC15 | `src/test/architecture/noBrowserStorage.test.ts` | 0 eşleşme |
| AC2 | Manuel Chromium DevTools > Application (gerçek backend) | Anahtar/DB yok |
| AC3, AC4 | `useProjectSession.test.tsx` + `projectApi.test.ts` (fetch mock) | Metot/yol/gövde, revision, dirty doğru |
| AC5 | `projectAggregate.test.ts` round-trip | Derin eşitlik |
| AC6 | `projectAggregate.test.ts` + `useProjectSession.test.tsx` | Mesaj, durum değişmemiş |
| AC7, AC8 | `useProjectSession.test.tsx` 409/400/500/ağ | Mesaj, dirty=true |
| AC9, AC11, AC12 | `App.test.tsx` (fetch mock, `MemoryRouter` `?project=`) | Sıra, yükleme, Welcome, reset |
| AC13 | Mevcut family/graph/loads testleri + gövde eşitlik testi | Geçer |
| AC14 | `graphRunValidity.test.ts`, `graphViewPreferences.test.ts` | Varsayılanlar |
| AC16 | `cd frontend && npm run build && npm test && npm run lint` | Başarılı |
| Uçtan uca | Ön koşul sonrası `start-dev.bat` veya `compose.yaml` + backend jar (`DB_PASSWORD`); Save → yenile → aynı veri; iki sekmede 409 | Elle |

Komutlar `frontend/package.json` (`build` = `tsc -b && vite build`, `test` = `vitest run`, `lint` = `oxlint`) ve CLAUDE.md'den. CI yapılandırması incelenmedi.

## 8. Riskler
- Backend sözleşmesi 3.3'ten saparsa uyumsuzluk; T0 engeller.
- Yenileme/kapatma kaydedilmemiş işi siler; eski tarayıcı verisi görünmez olur (taşıma yok kararı).
- Tipli modelde bilinmeyen family/graph alanları düşebilir (E-B3, E-B4); gerçek backend ile manuel doğrulama gerekir.
- Backend `expectedRevision` kontrolü yapmazsa sessiz üzerine yazma; 409 zorunlu.
- Auth yok; CORS yalnızca `http://localhost:5173`.
- Backend JSON gövde boyutu sınırı bilinmiyor.
- Geri alma: git revert; geri alınan sürüm yine localStorage kullanır ve backend verisini görmez.

## 9. Varsayımlar ve açık sorular

### 9.1 Kararlar
Kullanıcı kararları yukarıda. Planlayıcı kararları: silme yok, yeniden adlandırma `name` + Save; aktif proje `?project=`; başlangıç bellek durumu bugünkü boş depolama fallback'i; `migrateLegacyBoxPierParameters` silinir; `bridgeDefinitions` UI alanları aggregate'e dahil.

### 9.2 `backend-project-api` feature'ında cevaplanacak sorular (frontend planı cevaplamaz)
- **E-B1 – Birimler ve tipler.** `girderDepthCm` (cm), bearing `length/width/height` (mm), girder library birimleri (E4) ve string yük girdileri SI kuralıyla nasıl saklanacak? Dönüşüm nerede (backend API mapper)? Birim/kaynak mühendisten gelmeli.
- **E-B2 – Bridge definitions anahtarı.** Map anahtarı `no` tabanlı (A-02, C-012-09). Tipli modelde köprüye FK `bridgeId`? A-02 önce düzeltilmeli mi?
- **E-B3 – Graph node `parameters`.** Tipli mi key/value mi? Bilinmeyen alanlar korunacak mı?
- **E-B4 – Family kayıtları.** `loose`+`passthrough` bilinmeyen alanlar ve eski `pierType` (`H_TYPE`, `WALL`) korunacak mı?
- **E-B5 – Girder library.** Payload'ın kesin şekli, birimi, `PG-H160` id biçimi (E4).
- **E-B6 – `windLoads.result`.** Yalnızca `inputs` mı saklanacak? Saklanmazsa frontend `result: null` alır ve "snapshot yok / STALE" davranışı gösterir.
- **E-B7 – Mevcut `Project` aggregate ile ilişki.** `designSpace`/`generatedAlternatives` ile yeni bölümlerin ilişkisi; PUT bunlara dokunmamalı.
