# Plan: backend-db-persistence (frontend doğrudan backend DB'sini kullanır)

**Sonuç: READY.** Kullanıcı Q1–Q5'in hepsini planlayıcının önerisiyle yanıtladı (bkz. 9.2); plan o varsayımlarla kurulduğundan değişiklik gerekmedi. Bu plan, `frontend-backend-persistence` planının (bellek içi oturum + açık Save) yerine geçer; o slug `planned` durumunda kalır ama uygulanmamalıdır.

Mimari yön: backend tek veri kaynağı; her kalıcı düzenleme bölüm bazında hemen backend'e yazılır (write-through). Tarayıcıda kalıcı hiçbir şey saklanmaz.

---

## 1. Amaç ve kapsam dışı olanlar

**Amaç**
- `localStorage`, `sessionStorage`, `IndexedDB` ve `.kopruq` dosya/File System Access kodunu frontend'den tamamen kaldırmak.
- Proje verisinin tek kaynağını backend PostgreSQL yapmak: tipli ilişkisel tablolar, Flyway migration'ları.
- Frontend her kalıcı düzenlemeyi ilgili bölümün endpoint'ine `PUT` ile hemen yazar; proje açılınca veri backend'den okunur; yenilemede veri yine backend'den gelir.
- Gereken backend işini (domain modeli, tablolar, endpoint'ler, revizyon/409, testler) frontend işiyle birlikte, bağımsız derlenip test edilebilen fazlar halinde yapmak.

**Kapsam dışı**
- Auth/çok kullanıcı (yerel tek kullanıcı), çevrimdışı mod (backend kapalıysa yalnızca hata mesajı), proje silme UI'ı.
- Eski tarayıcı verisi ve `.kopruq` taşıma/Import/Export.
- Hesaplanmış sonuçların kalıcılığı: rule/layout/analysis sonuçları, `graphRunValidity`, family snapshot'ları, `windLoads.result`.
- Mühendislik kuralı, birim dönüşümü veya varsayılan eklemek/değiştirmek.
- Terrain/LandXML importlarının backend `Project` UUID'sine bağlanması (bugün `project.id || 'default'`, `frontend/src/app/router.tsx:147`; roadmap 1839 açık madde olarak kalır).
- Satır seviyesinde REST ve yeni backend domain paketi.
- **Uygulama onayı:** CLAUDE.md onaylı milestone öncesi yeni endpoint/bağımlılık eklenmesini yasaklar. Bu plan bir öneridir; aşağıdaki **20 yeni endpoint** ve CORS'a `PUT` eklenmesi ancak `/feature-implement` onayıyla uygulanır. **Yeni Maven veya npm bağımlılığı eklenmez.**

## 2. Mevcut mimari (doğrulanmış)

### 2.1 Backend
- Tek modül `backend/pom.xml`, Spring Boot 3.5.16, Java 21; web, actuator, jts, jackson, data-jpa, flyway(-postgresql), postgresql, h2(test). Bean Validation yok; doğrulama elle (`shared/validation/FieldChecks`, `shared/exception/InvalidRequestException`).
- Migration'lar: `V1__terrain_landxml.sql`, `V2__bridge_project.sql`; sıradaki **V3**. V2: `project(id, project_name, created_utc, selected_alternative_id, row_version)`, `project_bridge`, `project_design_space`, `bridge_alternative`, `bridge_alternative_span`. Mühendislik kolonlarında DEFAULT ve değer CHECK'i yok.
- `com.kopruq.bridge.model.Project` mutable (`id`, `projectName`, `createdUtc`, `bridge`, `designSpace`, `generatedAlternatives`, `selectedAlternativeId`); domain revizyonu yok.
- Port `bridge.application.ProjectRepository` (`save`, `findById`); adapter `bridge.infra.persistence.JpaProjectRepository` + `ProjectEntity.apply/toDomain`; `ProjectEntity` içinde `@Version row_version` ("not a domain revision").
- Proje endpoint'i yok. `EndpointInventoryContractTest` mevcut 21 endpoint'i birebir sabitler.
- `ArchitectureTests`/`ArchitectureRules` (saf JUnit): sabit `DOMAINS`; `bridge` için `CORE_DEPS` ve `DOMAIN_DEPS` boş; JPA/Hibernate/Spring Data yalnızca `<domain>.infra.persistence`; controller sayısı tam **12**; pom tam 11 onaylı bağımlılık; core katmanları yalnızca `java.*`, kendi domain'i ve `shared.{quantity,validation,exception}` import eder.
- Hata sözleşmesi: `ApiExceptionHandler` + `ApiErrorResponse(timestamp,status,error,code,message,path,correlationId,errors)`; 404/409 için domain istisnası yok.
- CORS: `shared/config/WebCorsConfiguration` yalnızca `GET, POST, HEAD`; **PUT engelli**. `LayoutKernelCorsContractTest` içeriği doğrulanmadı (implementer kontrol etmeli).
- `shared/config/CoreConfiguration` framework'süz servisleri `@Bean` kurar; çok repository'li atomik yazma `TransactionOperations` ile (`LandXmlImportUseCase` deseni). `Clock` bean'i yok.
- Test altyapısı: `src/test/resources/config/application.properties` H2 (PG modu); `KOPRUQ_TEST_DB_URL` ile gerçek PG; `compose.yaml` `postgres-test` profili (5433); Testcontainers yok. Mevcut: `JpaProjectRepositoryTest`, `PersistenceContractTest`, `ContractTestSupport` (MockMvc).

### 2.2 Frontend
Önceki planın envanteri doğrulandı: production'da 22 dosya, testler dahil toplam 45 dosya `localStorage/indexedDB` kullanıyor.

Senkron okuma API'leri (test dışı 27 dosyada 82 kullanım): `familyRepository.ts` (`getFamilyRecords`, `getPrecastGirderDefinition`, `graphFamilyAdapter.resolve/getParameterSchema`; graph yürütmesinde senkron), `projectModuleStore.ts` (`createProjectModule().read()`), `useProjectModule.ts`/`useFamilyCatalog.ts` (`useSyncExternalStore`), `projectWorkspace.ts` (`readProjectState`; `graphStore.ts:100` de kullanır), `bridge-definition/model/store.ts`, `registry.ts` (`readArray`, `getFamilyReferences`), doğrudan localStorage okuyan `BridgeDefinitionWorkspace.tsx:50`, `SystemAssemblyPanel.tsx:60`, `PreferredSpanPanel.tsx:30`, `PierFamiliesPanel.tsx:17`. Okurken yazan kod: `useFamilyCatalog.ts:15,29`.

App state: `App.tsx:53-56` `projectState`/`bridgeDefinitions` React state + persist effect'leri; `App.tsx:71` `windLoads` yalnızca bellekte; `App.tsx:58-67` `setBridges` bridges, `lastModified` ve definitions'ı birlikte günceller. Oturum: `useProjectFile.ts`, `projectDataContract.ts` (`PROJECT_DATA_ENTRIES`), `recentProjects.ts` (IndexedDB), `RecentFileAccessModal.tsx`, `main.tsx:4-6` `migrateLegacyStorage`.

Ortak: `shared/api/http.ts` (`requestJson`, `postJson`, `ApiError`, `formatApiError`; **`putJson` yok**); `AppProviders.tsx` tek `QueryClient`; `@tanstack/react-query` ^5.102.8; `layerRules.test.ts` (shared → features/app yok; features → app yok).

Fallback'ler (yerel veri yokken): `INITIAL_PROJECT`, `INITIAL_BRIDGES` (12 satır), `INITIAL_CROSS_SECTION_VALUES`, `PRECAST_DIMENSIONS`, `NO_RULES`. New Project bugün family kataloglarına `[]`, girder library'ye `[]` yazar, modülleri siler.

Birimler/ham tipler: `BridgeRow.girderDepthCm` (cm); bearing `length/width/height` (mm, `graphFamilyAdapter.getParameterSchema`); `Dimension{key,label,min,max,delta}` birimi yalnızca etikette (`'H (cm)'`, `'(m)'`); yük girdileri string (seismic `a,g,t,i`; wind `vb,terrain,ze`; temperature `min,max,t0`); `ProjectWorkspaceData` alanlarının çoğu string (`originX`, `cover`, `designLife`); graph `parameters: Record<string, number|boolean|string|number[]>`; zod şemaları `passthrough`.

## 3. Önerilen tasarım

### 3.1 Temel kararlar
- **K1 – Write-through autosave (Q1).** Save/Save As kalkar. Her kalıcı düzenleme bölüm bazında `PUT`. Nav'da "Kaydediliyor… / Kaydedildi / Kayıt hatası / Çakışma" göstergesi. `beforeunload` yalnızca bekleyen/başarısız yazma varsa uyarır.
- **K2 – Bölüm granülerliği.** Her mantıksal bölüm (workspace, bridge definitions, 5 family kataloğu, girder library, preferred span, cross section, 6 yük bölümü, graph başına doküman) tek tipli `PUT` ile tamamen değiştirilir. Satır seviyesinde CRUD yok.
- **K3 – Proje seviyesinde revizyon (R13).** Her `PUT` `expectedRevision` taşır; uyuşmazlıkta 409 ve hiçbir şey yazılmaz; her başarılı yazma `revision`'ı 1 artırır ve `updated_utc` günceller. Teknik kilit `@Version row_version` + `PESSIMISTIC_WRITE`.
- **K4 – Senkron ayna + seri yazma kuyruğu.** Sunucunun onayladığı dokümanın bellekte aynası tutulur; mevcut senkron okuma API'leri bu aynadan okur. Yazmalar iyimser uygulanır ve seri kuyruğa girer. Ayna hiçbir yere kalıcı yazılmaz; yenilemede backend'den yüklenir. İçinde yalnızca onaylı veri ile bekleyen/gönderilmekte olan/başarısız yazmalar bulunur (uzun ömürlü çalışma kopyası değil).
- **K5 – Hesaplanmış ve UI-only durum bellekte kalır.** `graphRunValidity`, family snapshot'ları, `graphViewPreferences`, graph undo/redo, `activeGraphId`, bridge-definition seçimleri (`selectedBridgeId`, `selectedAxisId`, `selectedConstraintId`), `viewMode`, `terrainVisible` backend'e gönderilmez; yenilemede varsayılana döner (`createBridgeDefinition`, `createEmptyGraph` değerleri).
- **K6 – Bridge definition anahtarı.** `definition_key` bugünkü map anahtarını (`bridge.id`) aynen tutar; FK yok. A-02/C-012-09 ayrı iş.
- **K7 – Yeni projede backend varsayılan uydurmaz.** `POST /api/projects` gövdesini istemci gönderir (`INITIAL_PROJECT` + `bridges: []`); family'ler `[]`, modüller `null` (bugünkü New Project). Hiç yazılmamış bölümlerde frontend bugünkü fallback'leri gösterir. Okurken yazma kaldırılır. `INITIAL_BRIDGES` başlangıç tohumu olarak kullanılmaz; açılışta Welcome.
- **K8 – Katı tipli sözleşme.** Section DTO'larında bilinmeyen alan 400; frontend wire mapper'ları yalnızca bilinen alanları kurar; `passthrough` alanlar saklanmaz; eski `pierType` değerleri (`H_TYPE`, `WALL`) frontend zod enum'uyla aynı kabul edilir.
- **K9 – Tüm bölümler `com.kopruq.bridge` içinde.** `Project` aggregate genişletilir; `bridge` domain kenarları `{}` kalır; yeni domain paketi yok.

### 3.2 Backend tasarımı

**Model (`com.kopruq.bridge.model`; Spring/JPA/application/api importu yok)**
- `Project`: `long revision`, `Instant updatedUtc`, `requireRevision(long expected)` (uyuşmazlıkta `RevisionConflictException`), `recordChange(Instant now)`. `designSpace`, alternatives, `selectedAlternativeId` aynen kalır.
- `ProjectSection` sealed arayüzü: `ProjectWorkspace(ProjectInfo, List<BridgeInventoryRow>)`, `BridgeDefinitions`, `PierFamilyCatalog`, `PierCapFamilyCatalog`, `FoundationFamilyCatalog`, `BearingFamilyCatalog`, `MaterialAssignmentCatalog`, `GirderLibrary`, `PreferredSpanRules`, `CrossSectionValues`, `SeismicInputs`, `WindInputs`, `TemperatureInputs`, `SelfWeightInputs`, `TrafficLm1Inputs`, `WindSnapshotInputs`, `GraphDocument`; yardımcı `RangeRule(min,max,delta; nullable)`, `SweepDimension(key,label,min,max,delta)`.
- **Invariant'lar yalnızca yapısal:** id boş olamaz, liste içinde id tekil, sayılar sonlu, graph bağlantıları var olan node'lara, group node'ları var olan node'lara işaret eder. Aralık/limit/mühendislik kuralı eklenmez.
- `bridge.enums`: `BridgeInventoryType` (etiketlerle), `InventoryPierShape`, `PierFamilyType`, `PierCapType`, `FoundationFamilyType`, `BearingFamilyType`, `ConstraintKind`, `BridgeAxisType`, `GraphParameterKind`, `ParameterProvenance`; değerler frontend tiplerinden birebir.

**Hata sözleşmesi (`shared.exception`)**: `ResourceNotFoundException(code,message)` → 404 `PROJECT_NOT_FOUND`; `RevisionConflictException(expected,current)` → 409 `PROJECT_REVISION_CONFLICT`; `ApiExceptionHandler` handler'ları.

**Application (`com.kopruq.bridge.application`)** — Spring'siz, `CoreConfiguration`'da `@Bean`.
- `ProjectRepository` genişler: `findByIdForUpdate(UUID)`, `findSummaries()`. Yeni port `ProjectContentRepository`: `load(UUID)`, `replace(UUID, ProjectSection)`.
- `ProjectService`: `list()`, `create(ProjectWorkspace)`, `document(UUID)`, `replace(UUID, long expectedRevision, ProjectSection)`; `replace` tek `TransactionOperations` içinde: `findByIdForUpdate` (404) → `requireRevision` → `content.replace` → workspace ise `project.setProjectName(info.name)` → `recordChange(clock.instant())` → `projects.save`; hatada rollback, revizyon değişmez.
- Read modelleri `ProjectSummary`, `ProjectDocument`. `Clock` bean'i `shared/config`'e (R12).

**Infra (`bridge.infra.persistence`)**: bölüm başına JPA entity + Spring Data arayüzleri; bölüm değiştirme = satırları sil, `flush`, yenilerini ekle (PK çakışması önlemi); surrogate `UUID id` + `UNIQUE(project_id, <client_id>)`; istemci id'leri `VARCHAR`; elle mapping.

**API (`bridge.api`)**: `ProjectController` (M1), `ProjectDesignSystemController` (M2), `ProjectLoadInputController` ve `ProjectGraphController` (M3); DTO'lar, mapper'lar (`FieldChecks` ile alan yollu ihlal, örn. `value.bridges[2].spansM[0]`).

**Flyway** (ek niteliktedir; mühendislik kolonlarında DEFAULT/CHECK yok; `DOUBLE PRECISION`)
- **V3__project_workspace.sql (M1):** `project` + `revision BIGINT`, `updated_utc TIMESTAMPTZ` (mevcut satırlar `revision=0`, `updated_utc=created_utc`, sonra `SET NOT NULL`); `project_info` (1:1, ad dışındaki `ProjectWorkspaceData` alanları, string alanlar `VARCHAR`; `name` → `project.project_name`, kullanıcı alanı `id` → `project_code`); `project_bridge_row` (`row_id, ordinal, no, km, crossing_type, estimated_length_m, road_width_m, terrain, status, bridge_type, girder_note, pier_shape, has_girder_depths`); `project_bridge_row_span(idx, length_m)`; `project_bridge_row_girder_depth(idx, depth_cm)`.
- **V4__project_design_system.sql (M2):** `bridge_definition` + `_span`, `_axis`, `_axis_assignment`, `_constraint`; `family_pier`, `family_pier_cap`, `family_foundation`, `family_bearing`, `family_material`; `family_range_rule`, `family_sweep_dimension`, `family_pier_configuration`; `girder_library` + `girder_library_dimension`; `preferred_span_rule`; `cross_section`. Birimler kolon adlarında (`depth_cm`, bearing `_mm`).
- **V5__project_loads_graph.sql (M3):** `load_seismic_input`, `load_wind_input`, `load_temperature_input` (`VARCHAR`); `load_self_weight_input` (16 `DOUBLE`); `load_traffic_lm1_factor` (section `TANDEM|UDL|REMAINING`, idx, label, characteristic_*, adjustment_* değer/provenance/codeDefault); `load_wind_snapshot` (yalnızca inputs); `graph_document`, `graph_node`, `graph_node_parameter(value_kind, number_value, boolean_value, string_value)`, `graph_node_parameter_item`, `graph_connection`, `graph_group`, `graph_group_node`.

### 3.3 Endpoint'ler (20 yeni; hepsi kullanıcı onayı gerektirir)

`PUT` ortak zarfı: istek `{ "expectedRevision": 7, "value": <SectionDto> }`; yanıt 200 `{ "projectId", "revision": 8, "updatedAt", "value": <saklanan SectionDto> }`. Ortak hatalar: 400 `INVALID_REQUEST` (eksik `expectedRevision`, sonlu olmayan sayı, tekrarlı id, bilinmeyen enum, path/body id uyuşmazlığı; `errors[]` alan yolları), 400 `MALFORMED_REQUEST_BODY` (bilinmeyen alan/bozuk JSON), 404 `PROJECT_NOT_FOUND`, 409 `PROJECT_REVISION_CONFLICT`.

| Faz | Metot ve yol | Gövde / yanıt |
|---|---|---|
| M1 | `GET /api/projects` | `ProjectSummary[]` = `{projectId,name,revision,createdAt,updatedAt}`, `updatedAt` azalan |
| M1 | `POST /api/projects` | `{workspace: WorkspaceDto}` → **201** `ProjectDocument` (`revision: 0`) |
| M1 | `GET /api/projects/{projectId}` | `ProjectDocument` = `{projectId,revision,createdAt,updatedAt, workspace, bridgeDefinitions?, families?, girderLibrary?, preferredSpanRules?, crossSection?, loads?, graphs?}` (M2/M3 alanları additive); geçersiz UUID → 400 `INVALID_PARAMETER` |
| M1 | `PUT …/{projectId}/workspace` | `WorkspaceDto = {project: ProjectInfoDto (ProjectWorkspaceData alanları birebir), bridges: BridgeRowDto[]}` |
| M2 | `PUT …/bridge-definitions` | `{definitions:[{definitionKey, bridgeId, spanLengthsM[], axes[], superstructureType, girderFamilyId, girderVariantId, girderCount, deckWidthOverrideM, axisAssignments:[{axisId,…}], abutmentFamilyIds{A1,A2}, constructionMethod, constructionStagesNote, constraints[]}]}`; UI alanları yok |
| M2 | `PUT …/families/piers`, `/pier-caps`, `/foundations`, `/bearings`, `/materials` | ilgili frontend tipinin alanları; `id` zorunlu, diğerleri nullable |
| M2 | `PUT …/girder-library` | `{enabled: boolean\|null, dimensions: SweepDimension[]} \| null` (`[]` ↔ `null`) |
| M2 | `PUT …/preferred-span-rules` | `PreferredSpanRule[]` |
| M2 | `PUT …/cross-section` | `CrossSectionValues \| null` |
| M3 | `PUT …/loads/seismic`, `/wind`, `/temperature`, `/self-weight`, `/traffic-lm1`, `/wind-snapshot` | ilgili modül şeması; `wind-snapshot` = `{schemaVersion, status, inputs{vb,terrain,ze,deckWidthM,drefM}}` |
| M3 | `PUT …/graphs/{graphId}` | `GraphDto = {id,name,schemaVersion:1,projectRef?,bridgeId?,nodes[{id,type,name,position{x,y},parameters[{key,kind,value}]}],connections[],groups[]}`; upsert, graph silme yok |

Ek: `WebCorsConfiguration`'a `PUT`; controller sayısı 12 → 13 (M1) → 14 (M2) → 16 (M3); `EndpointInventoryContractTest` her fazda güncellenir.

### 3.4 Frontend tasarımı

**Yeni `frontend/src/shared/project-store/` (generic; `features` import etmez)**
- `projectApi.ts`: `listProjects`, `createProject`, `getProjectDocument`, `putSection(path, expectedRevision, value)`; `http.ts`'e `putJson`.
- `projectSession.ts`: aktif `{projectId, revision, status: 'idle'|'saving'|'error'|'rejected'|'conflict', lastError}` store'u, `useSaveStatus()`.
- `serverSection.ts`: `createServerSection<T>({ key, path, toWire, fromWire, schema })` → `read()` (senkron, aynadan), `write(next)` (wire JSON onaylı/bekleyen değerle aynıysa no-op; değilse iyimser uygula + kuyruğa), `subscribe`, `hydrate(value)`, `discard()`.
- `writeQueue.ts`: proje başına tek seri kuyruk; bölüm başına birleştirme (gönderilmemiş girdi en yeni değerle değişir); ~300 ms debounce (yazılım parametresi); `expectedRevision` gönderim anında `projectSession.revision`'dan; 200 → revizyon güncelle, o bölüm için daha yeni bekleyen yoksa ayna sunucu değeriyle değişir; 409 → `conflict`, kuyruk durur; 400 → `rejected` + `fieldErrors`; ağ/5xx → `error`, kuyruk durur, Retry/Discard; `flush(): Promise<void>`; otomatik retry/merge yok.

**Feature wire mapper'ları (saf; yalnızca şekil dönüşümü, birim dönüşümü yok):** `features/project/model/projectWorkspaceWire.ts`, `bridge-definition/model/bridgeDefinitionWire.ts`, `family-registry/model/familyWire.ts` (5 kategori + girder library), `preferred-span/model/preferredSpanWire.ts`, `superstructure-families/model/crossSectionWire.ts`, `loads/model/loadsWire.ts`, `graph/state/graphWire.ts`. Her biri zod yanıt şeması, `toWire`, `fromWire`; `fromWire` sonrası mevcut normalizasyonlar.

**Depoların yeniden bağlanması (public API'ler senkron kalır):** `createProjectModule` aynı `read/write/reset` ile `serverSection` üzerine; `familyRepository` (`storage` dinleyicisi kalkar), `useFamilyCatalog` (okurken yazma kalkar), `registry.ts` (sahip fonksiyonlara); `bridge-definition/model/store.ts`; `projectWorkspace.ts`; `graphStore.ts` (graph başına yazma, yalnızca değişen graph; `activeGraphId` bellekte; `storage` dinleyicisi kalkar; 100. satır workspace aynasından); `graphRunValidity.ts`, `graphViewPreferences.ts` bellek içi `Map`; dört doğrudan okuyan bileşen sahip fonksiyonlara.

**App ve oturum:** yeni `app/project-session/` (`useProjectSession.ts`, `projectSections.ts` kayıt defteri + atomik hydrate, `ProjectListDialog.tsx`, `SaveStatusIndicator.tsx`).
- **Açılış:** `?project=<uuid>` varsa `GET` + yükleme göstergesi, hatada mesaj + Retry; yoksa Welcome.
- **Open:** önce `flush`; gelen tüm bölümler zod ile doğrulanır, hepsi geçerse ayna tek adımda değişir; `clearFamilySnapshots`, `clearSuccessfulGraphRuns`, undo sıfırlama, URL güncelleme; doğrulama hatasında hiçbir şey değişmez (`Invalid project data: <path> - <message>`).
- **New:** `flush` → `POST` → hydrate. **Recent:** `useQuery(['projects'])`, yazma/oluşturma sonrası invalidate. **Exit:** `flush`, URL parametresi kalkar, Welcome.
- `flush` başarısızsa `UnsavedChangesModal` yeni etiketlerle ("Tekrar dene / Vazgeç (at) / İptal").
- `App.tsx`: state'ler bölüm hook'larından; `setBridges` iki bölüme yazar (workspace + bridge-definitions); `ensureBridgeDefinitions` ara tutarsızlığı uzlaştırır. `TopWorkspaceNav.tsx`: Save/Save As kalkar, kaydetme göstergesi; Open proje listesini açar; Recent backend'den.
- Silinecek: `legacyStorageMigration.ts`, `recentProjects.ts`, `projectFileService.ts`, `useProjectFile.ts`, `projectDataContract.ts`, `projectFileTypes.ts`, `projectFileFixtures.ts`, `RecentFileAccessModal.tsx` ve testleri; `main.tsx`'ten `migrateLegacyStorage` çağrısı.

## 4. Alternatifler
| Alternatif | Değerlendirme |
|---|---|
| Açık Save + bellek içi aggregate | Kullanıcı reddetti. |
| Write-through ama tüm aggregate tek `PUT` | Her düzenlemede tüm proje yazılır, çakışma yüzeyi en geniş; yine senkron ayna gerekir. Reddedildi. |
| **Bölüm bazlı write-through + senkron ayna (seçilen)** | Küçük yazma hacmi, tipli sözleşme, mevcut senkron API'ler korunur. Maliyet: 20 endpoint, 3 migration. |
| Tüm tüketicileri `useQuery`/`useMutation`'a çevirmek | 27 dosya async'e döner, 45 test etkilenir; doğruluk kazancı yok. Reddedildi (kademeli yapılabilir). |
| Satır seviyesinde REST | Bugün listeyi toptan değiştiren bileşenler yeniden yazılmak zorunda. Reddedildi. |
| Tek generic `PUT /sections/{key}` | Sözleşme belirsiz, envanter bilgi taşımaz. Reddedildi. |
| Bölüm başına revizyon | Ek karmaşıklık; tek kullanıcı için proje revizyonu yeterli. |
| Bölüm başına JSONB blob | Kullanıcı reddetti. |
| JPA yerine `JdbcClient` | Mevcut adapter deseni JPA; tutarlılık için JPA + `flush`. |

## 5. Sıralı görevler (fazlar)

Her faz tek başına derlenir ve test edilir; önce backend. Her faz ayrı onay ister. Öneri: fazları bu plana referans veren ayrı slug'larla uygulamak (`backend-db-persistence-m1` … `-m5`).

**M1 – Backend çekirdeği (proje + workspace).**
1. `V3__project_workspace.sql`. 2. Model: `Project` (revision, `requireRevision`, `recordChange`), `ProjectSection`, `ProjectWorkspace`, `ProjectInfo`, `BridgeInventoryRow`, enum'lar. 3. `shared/exception`: `ResourceNotFoundException`, `RevisionConflictException`, `ApiExceptionHandler`. 4. `shared/config`: `Clock`, `ProjectService` bean'leri; `WebCorsConfiguration` `PUT`. 5. Application: port genişlemesi, `ProjectContentRepository`, `ProjectService`, `ProjectSummary`, `ProjectDocument`. 6. Infra: `ProjectEntity` (revision, updated_utc), `ProjectInfoEntity`, `ProjectBridgeRowEntity` (+span/depth), `JpaProjectContentRepository`, `findByIdForUpdate`. 7. API: `ProjectController` + DTO + mapper. 8. Testler: `ProjectTest`, `ProjectWorkspaceTest`, `JpaProjectContentRepositoryTest` (round-trip, null/[], değiştirme, alternatives korunur), `ProjectServiceTest` (404, 409, artış, rollback), `ProjectApiContractTest` (MockMvc; durum kodları, bilinmeyen alan, CORS PUT preflight), `ApiExceptionHandlerTest`, `ArchitectureTests` sayaç 13, `EndpointInventoryContractTest` +4. 9. `docs/architecture.md`, `docs/roadmap.md`.

**M2 – Backend tasarım sistemi bölümleri** (M1'e bağlı). `V4`; bridge definition, 5 family, girder library, preferred span, cross section için model/entity/adapter, `ProjectDesignSystemController`, DTO'lar; parametrik testler (round-trip, tekrarlı id 400, bilinmeyen enum 400, 409, revizyon artışı); sayaç 14, envanter +9, dokümanlar.

**M3 – Backend yükler + graph** (M1'e bağlı). `V5`; `ProjectLoadInputController`, `ProjectGraphController`; graph invariant testleri (bağlantı/group referansları, dört `value_kind` round-trip, path/body id uyuşmazlığı 400); `GET` dokümanı tüm bölümleri içerir; sayaç 16, envanter +7, dokümanlar; isteğe bağlı `postgres-test` koşusu.

**M4 – Frontend altyapısı (henüz bağlanmamış)** (M1–M3 sözleşmesine bağlı). `putJson` + test; `shared/project-store/{projectApi,projectSession,serverSection,writeQueue}.ts` + testler; 7 wire mapper + testler. UI değişikliği yok; `npm run build/test/lint` yeşil.

**M5 – Frontend geçişi (cutover)** (M4'e bağlı; atomik, kısmi geçiş yok). 3.4'teki tüm yeniden bağlamalar, `app/project-session/*`, `App.tsx`, `TopWorkspaceNav.tsx`, `UnsavedChangesModal.tsx` etiketleri, `main.tsx`, silmeler. Test göçü: localStorage kurulumları `src/test/projectStoreTestUtils.ts` içindeki `hydrateTestProject()`/`mockProjectApi()` yardımcılarına. Yeni `src/test/architecture/noBrowserStorage.test.ts`. `frontend/README.md`, `docs/architecture.md`, `docs/roadmap.md` (1839. satır kapanır).

Boyut tahmini (doğrulanmadı): M1 ~20, M2 ~30, M3 ~25 backend dosyası; M4 ~20; M5 ~45 production + ~30 test dosyası.

## 6. Kabul kriterleri

**M1**
- **AC1:** V3 H2'de ve PG'de uygulanır; V1/V2 değişmez; mevcut `project` satırları `revision=0` alır.
- **AC2:** `GET /api/projects` `updatedAt` azalan; proje yoksa `[]`.
- **AC3:** `POST /api/projects` 201, `revision` 0, workspace değerleri birebir; `name` → `project.project_name`.
- **AC4:** Bilinmeyen id `GET` → 404 `PROJECT_NOT_FOUND`; geçersiz UUID → 400 `INVALID_PARAMETER`.
- **AC5:** Doğru `expectedRevision` ile `PUT workspace` 200: `revision+1`, `updatedAt` değişir; yanıt `value` ile sonraki `GET` aynı.
- **AC6:** Eski `expectedRevision` → 409 `PROJECT_REVISION_CONFLICT`; veri/revizyon değişmez; aynı revizyonla iki ardışık `PUT`'ta ikincisi 409.
- **AC7:** Eksik `expectedRevision`, sonlu olmayan sayı, tekrarlı `row id`, bilinmeyen `bridgeType` veya bilinmeyen alan → 400; hiçbir şey yazılmaz.
- **AC8:** `http://localhost:5173` origin'inden `PUT` preflight izinli.
- **AC9:** Mevcut `designSpace` ve alternatives workspace `PUT` sonrası değişmez.
- **AC10:** `ArchitectureTests` geçer (controller sayısı güncel, `bridge` kenarları `{}`, model/domain'de Spring/JPA yok, pom değişmemiş); `EndpointInventoryContractTest` eski 21 + yeni endpoint'leri birebir listeler.

**M2/M3**
- **AC11:** Her bölüm `PUT`'u round-trip: gönderilen ile `GET` derin eşit, sayılar bit düzeyinde aynı (girder library `[]` ↔ `null`; liste modüllerinde `null` ≡ `[]`; opsiyonel family alanlarında `null`).
- **AC12:** Her bölüm yazması revizyonu artırır ve AC6/AC7 semantiğine uyar (parametrik test).
- **AC13:** Graph: dört parametre türü, groups ve konumlar korunur; var olmayan node'a bağlantı/group 400; path/body `graphId` uyuşmazlığı 400.
- **AC14:** `wind-snapshot` yalnızca inputs saklar. Hiçbir bölümde birim dönüşümü, varsayılan veya aralık kontrolü yok.

**M4**
- **AC15:** `writeQueue` testleri: aynı bölümde birleştirme, bölümler arası seri gönderim, revizyon zincirleme (kendi yazmalarından 409 almaz), 409'da durma, 400'de `rejected`, ağ hatasında Retry/Discard, `flush`.
- **AC16:** 7 wire mapper için feature tipi → wire → feature tipi derin eşit; geçersiz yanıtta `Invalid project data: <path> - <message>`.

**M5**
- **AC17:** Production kaynaklarında `localStorage`, `sessionStorage`, `indexedDB`, `IDBDatabase`, `showOpenFilePicker`, `showSaveFilePicker`, `FileSystemFileHandle` ve `'storage'` event dinleyicisi geçmez.
- **AC18:** Kullanım sırasında `kopruq.*`/`spanova.*` anahtarı veya IndexedDB oluşmaz.
- **AC19:** `?project` yokken Welcome. New Project `POST` yapar, URL `?project=<uuid>` olur; kullanıcı düzenleyene kadar başka istek gitmez.
- **AC20:** Örnek düzenlemeler (proje adı, köprü satırı, family ekleme, yük girdisi, graph node) debounce sonrası doğru endpoint'e tek `PUT` gönderir, `expectedRevision` son revizyondur; gösterge "Kaydediliyor → Kaydedildi"; yenilemede aynı veri backend'den gelir.
- **AC21:** 409'da çakışma bandı, kuyruk durur; "Yeniden yükle" dokümanı çeker ve bekleyen yazmaları açıkça atar; otomatik merge/retry yok.
- **AC22:** Ağ/5xx'te `formatApiError` metni (correlation id); bekleyen yazmalar korunur; Retry yeniden gönderir, Discard son onaylı değere döner; bekleyen/hatalı yazma varken `beforeunload` uyarır; 400'de alan hataları + Discard.
- **AC23:** Open listesi ve Recent `updatedAt` azalan; proje değiştirmeden önce `flush`, başarısızsa modal; geçersiz dokümanda önceki oturum değişmez.
- **AC24:** `graphRunValidity`, family snapshot'ları, graph görünüm tercihleri, seçimler ve `activeGraphId` yenilemede sıfırlanır ve backend'e gönderilmez.
- **AC25:** Hiçbir mühendislik değeri, varsayılan veya birim değişmez; hiç yazılmamış bölümlerde bugünkü fallback'ler gösterilir.
- **AC26:** `.kopruq` ile ilgili UI ve kod (Save As, dosya seçici, `RecentFileAccessModal`, `recentProjects`) kaldırılmıştır.
- **AC27:** `npm run build`, `npm test`, `npm run lint` başarılı; `layerRules.test.ts` geçer. Her fazda `mvn -f backend/pom.xml -B package` başarılı ve dokümanlar güncel.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Spring context testleri (H2 Flyway) + `PersistenceContractTest`; isteğe bağlı `docker compose --profile postgres-test up -d --wait postgres-test` ve `KOPRUQ_TEST_DB_URL=jdbc:postgresql://localhost:5433/kopruq_test KOPRUQ_TEST_DB_USERNAME=… KOPRUQ_TEST_DB_PASSWORD=… mvn -f backend/pom.xml -B test` | Migration'lar uygulanır, testler yeşil |
| AC2–AC8 | `ProjectApiContractTest` (MockMvc), `ProjectServiceTest` | Durum kodları, `code`, gövdeler; 409/400'de DB değişmemiş (`JdbcTemplate` sayımı) |
| AC9 | `JpaProjectContentRepositoryTest` | Alternatives eşit |
| AC10 | `ArchitectureTests`, `EndpointInventoryContractTest` | Yeşil |
| AC11–AC14 | Bölüm round-trip testleri (repository + MockMvc), graph invariant testleri | Derin eşitlik; 400/409 |
| AC15–AC16 | `writeQueue.test.ts`, `serverSection.test.ts`, `*Wire.test.ts` (fetch mock, fake timers) | Yeşil |
| AC17, AC26 | `src/test/architecture/noBrowserStorage.test.ts` | 0 eşleşme |
| AC18 | Manuel Chromium DevTools > Application, gerçek backend | Anahtar/DB yok |
| AC19–AC23 | `App.test.tsx`, `useProjectSession.test.tsx` (`mockProjectApi`, `MemoryRouter` `?project=`) + manuel `start-dev.bat`: düzenle → yenile; iki sekmede 409 | İstek dizisi ve UI durumları |
| AC24–AC25 | Mevcut family/graph/loads testleri + `graphRunValidity.test.ts`, `graphViewPreferences.test.ts` + wire eşitlik testleri | Yeşil |
| AC27 | `mvn -f backend/pom.xml -B package`; `cd frontend && npm run build && npm test && npm run lint` | Başarılı |

Bilinmeyenler: CI yapılandırması incelenmedi; `LayoutKernelCorsContractTest` izin verilen metotları sabitliyor mu açılıp okunmadı (implementer kontrol etmeli); Testcontainers yok, PG doğrulaması manuel compose profiliyle.

## 8. Riskler
- **Yazma hacmi:** debounce + birleştirme olmadan istek seli; AC15 korur.
- **Bölümler arası atomiklik yok:** `setBridges` iki `PUT` gönderir; biri başarısız olursa geçici tutarsızlık hata durumunda görünür; `ensureBridgeDefinitions` uzlaştırır.
- **İki sekme/pencere:** 409 sonrası yeniden yükleme o sekmedeki bekleyen düzenlemeleri atar (açıkça bildirilir); sessiz üzerine yazma yok.
- **Bekleyen yazma varken kapatma:** `beforeunload` uyarır; zorla kapanmada debounce içindeki son değişiklik kaybolabilir.
- **Bilinmeyen alanlar:** `passthrough` alanlar düşer; taşıma olmadığından etki sınırlı; family/graph tipleri implementasyonda tam çıkarılmalı.
- **Backend kapalıysa uygulama kullanılamaz** (kabul edilmiş karar); eski tarayıcı anahtarları profilde kalır ama koda dokunmaz.
- **H2/PG farkları:** `FOR UPDATE`, `ALTER … SET NOT NULL`, identity sözdizimi; `postgres-test` koşusu önerilir.
- **Güvenlik:** auth yok, CORS yalnızca yapılandırılan origin, girdi boyutu sınırı yok (yerel tek kullanıcı).
- **Geri alma:** Flyway yalnızca ileri; kod geri alınırsa V3–V5 tabloları kalır; eski kod `project` satırı eklerse `revision NOT NULL` hatası (bugün bunu yapan endpoint yok). Frontend geri alınırsa yine localStorage kullanır ve DB verisini görmez.
- **Kapsam büyük:** M5 geniş regresyon yüzeyi açar; mevcut test paketi ve manuel uçtan uca kontrol zorunlu.

## 9. Varsayımlar ve kararlar

### 9.1 Planlayıcı kararları (değiştirilebilir)
K1–K9; proje seviyesinde revizyon; `expectedRevision` gövdede (If-Match değil); ~300 ms debounce; otomatik retry yok; `ProjectWorkspaceData.name` = `project.project_name`; tüm bölümler `bridge` domain'inde; JPA ile sil + `flush` + ekle; fazlara bölme.
Doğrulanmamış varsayımlar: `LayoutKernelCorsContractTest` içeriği; aile TS tiplerinin `passthrough` dışında gizli alan taşımadığı; `GirderLibraryPanel`/`MaterialsPanel` effect'lerinin yalnızca değişiklikte yazdığı (değer aynıysa yazma no-op).

### 9.2 Kullanıcı kararları (çözüldü)
- **Q1:** Write-through autosave; Save/Save As kalkar.
- **Q2:** SI olmayan birimler bugünkü birimleriyle aynen saklanır; kolon adları birimi gösterir (`depth_cm`, bearing `_mm`); `Dimension` satırları `label` ile tutulur; SI'ya geçiş mühendisin birim tablosuyla ayrı iş.
- **Q3:** String mühendislik girdileri girildiği gibi `VARCHAR`; yorum/dönüşüm yok.
- **Q4:** `windLoads.result` saklanmaz; yalnızca inputs (`schemaVersion`, `status`, `vb`, `terrain`, `ze`, `deckWidthM`, `drefM`).
- **Q5:** Graph node parametreleri tipli key/value satırları (`number|boolean|string|number[]`), birim dönüşümü yok.
