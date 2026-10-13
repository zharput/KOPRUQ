# Plan: backend-db-persistence-m1 (yalnızca M1 fazı: backend proje + workspace)

**Sonuç: READY.** Üst plan `docs/features/backend-db-persistence/plan.md` (2.1, 3.1–3.3, 5 M1, 6 AC1–AC10, 7, 8, 9.2) esas alındı. Q1–Q5 kararları yeniden açılmadı. Üst planın iddiaları gerçek kodla karşılaştırıldı; sapmalar 3.6'da gerekçeleriyle listelendi. Malzeme niteliğinde açık soru yok.

---

## 1. Amaç ve kapsam dışı olanlar

**Amaç**
- Flyway `V3__project_workspace.sql`: `project` tablosuna `revision` ve `updated_utc` eklenir. Yeni tablolar: `project_info`, `project_bridge_row`, `project_bridge_row_span`, `project_bridge_row_girder_depth`.
- `Project` domain revizyonu: `requireRevision`, `recordChange`. `Clock` bean'i.
- Workspace modeli: `ProjectSection` (sealed), `ProjectWorkspace`, `ProjectInfo`, `BridgeInventoryRow`, enum'lar `BridgeInventoryType` ve `InventoryPierShape`.
- `ResourceNotFoundException` (404) ve `RevisionConflictException` (409), `ApiExceptionHandler`'a bağlanır.
- Port ve servis: `ProjectRepository` genişler, yeni port `ProjectContentRepository`, yeni `ProjectService`, JPA entity'leri ve adapter'lar.
- `ProjectController` tam olarak 4 endpoint: `GET /api/projects`, `POST /api/projects`, `GET /api/projects/{projectId}`, `PUT /api/projects/{projectId}/workspace`.
- CORS'a `PUT`. Testler. `ArchitectureTests` controller sayısı 12 → 13, `EndpointInventoryContractTest`'e 4 endpoint. `docs/architecture.md` ve `docs/roadmap.md` güncellenir.

**Kapsam dışı**
- M2/M3: bridge definitions, family'ler, girder library, preferred span, cross section, yükler, graph. Tablo, endpoint ve model eklenmez. `GET` dokümanında yalnızca `workspace` bulunur.
- Frontend'in hiçbir dosyasına dokunulmaz (M4/M5).
- Proje silme, auth, çevrimdışı mod, `.kopruq` taşıma, terrain/LandXML'in proje UUID'sine bağlanması.
- Mühendislik kuralı, aralık/limit, birim dönüşümü veya varsayılan değer eklenmez. Yalnızca yapısal kontroller: alan var mı, sayı sonlu mu, id boş mu, id tekil mi, enum bilinen mi.
- Yeni Maven bağımlılığı yok; `pom.xml` değişmez.
- **Onay:** CLAUDE.md onaylı milestone olmadan yeni endpoint eklenmesini yasaklar. Kullanıcının `/feature-implement backend-db-persistence-m1` komutu bu 4 endpoint'in ve CORS `PUT`'unun onayıdır.

## 2. Mevcut mimari (doğrulanmış)

Yollar `C:\Users\cemha\repos\KOPRUQ\` altındadır.

- **Migration'lar:** yalnızca `backend/src/main/resources/db/migration/V1__terrain_landxml.sql` ve `V2__bridge_project.sql`; **V3 boş**. V2 `project`: `id UUID PK, project_name VARCHAR (nullable), created_utc TIMESTAMP WITH TIME ZONE NOT NULL, selected_alternative_id UUID, row_version BIGINT NOT NULL`. Child FK'larda `ON DELETE CASCADE` yok; liste indeks kolonu adı `span_index`; mühendislik kolonlarında DEFAULT/CHECK yok.
- **`backend/src/main/java/com/kopruq/bridge/model/Project.java`:** mutable, setter'lı. Alanlar: `id`, `projectName = ""`, `createdUtc = Instant.now()`, `bridge`, `designSpace`, `generatedAlternatives`, `selectedAlternativeId`. Revizyon/`updatedUtc` yok.
- **`bridge/infra/persistence/ProjectEntity.java`** (package-private): `apply(Project)` `createdUtc`'yi `ChronoUnit.MICROS`'a keser; `@Version row_version` ("Technical optimistic-lock counter only; not a domain revision"); `bridge`/`designSpace` `@OneToOne(mappedBy)`; alternatives id ile birleştirilir.
- **`ProjectJpaRepository`:** düz `JpaRepository<ProjectEntity, UUID>`. **`JpaProjectRepository`:** `@Repository @Transactional`; `save` = `findById` + yeni entity + `apply` + `saveAndFlush`; `findById` readOnly.
- **Port `bridge/application/ProjectRepository.java`:** `save`, `findById`; production'da kullanan servis/controller yok, yalnızca testler.
- **`shared/exception/ApiExceptionHandler.java`:** `InvalidRequestException` → 400 `INVALID_REQUEST` (`errors[]`); `IllegalArgumentException` → 400 `INVALID_INPUT`; `HttpMessageNotReadableException` → 400 `MALFORMED_REQUEST_BODY`; `MethodArgumentTypeMismatchException` → 400 `INVALID_PARAMETER`; `ResponseStatusException`/`ErrorResponse` durumu korur; diğerleri 500 `INTERNAL_ERROR`; ortak `build(...)` → `ApiErrorResponse(timestamp,status,error,code,message,path,correlationId,errors)`. 404/409 için domain istisnası yok (mevcut 404'ler `ResponseStatusException`: `TerrainController:106`, `LandXmlController:99`).
- **`shared/config/WebCorsConfiguration.java`:** `allowedMethods("GET", "POST", "HEAD")`.
- **CORS testi (üst plandaki doğrulanmamış madde çözüldü):** `backend/src/test/java/com/kopruq/contract/LayoutKernelCorsContractTest.java:125` izin verilen metotları birebir sabitler (`assertEquals("GET,POST,HEAD", …"Access-Control-Allow-Methods")`); `:148` DELETE preflight 403; `:155` `corsPreflight_coversEveryControllerFamily`. Başka dosya metot listesini sabitlemiyor.
- **`shared/config/CoreConfiguration.java`:** framework'süz servisler `@Bean`; `TransactionOperations` bean'i var (desen: `landxml/application/LandXmlImportUseCase`); **`Clock` bean'i yok.**
- **`shared/validation/FieldChecks.java`:** `requireFinite`, `requireNonNull`, `throwIfAny`. DTO deseni: record + `validate()`/`collectViolations(violations, prefix)` + `toX()` (`layout/api/LayoutGenerationRequest.java`, `bridge/api/KernelStateRequest.java`); iç içe yol biçimi `noPierZones[0].endChainageM`.
- **Jackson:** `FAIL_ON_UNKNOWN_PROPERTIES` hiçbir yerde açık değil; bilinmeyen alanlar sessizce yok sayılıyor.
- **Mimari testler** (`backend/src/test/java/com/kopruq/architecture/ArchitectureRules.java`, `ArchitectureTests.java`): `ArchitectureTests:108-111` `restControllers_onlyInDomainApi_andExactlyTwelve` → `assertEquals(12, …)`; `CORE_DEPS`/`DOMAIN_DEPS` `bridge` = `{}`; `SHARED_DEPS = {"shared.exception": {"landxml"}}` (kullanılmayan sabit kenar ihlal); core katmanları `shared.exception|quantity|validation` import edebilir; JPA/Spring Data/Hibernate yalnızca `<domain>.infra.persistence`; pom tam 11 onaylı bağımlılık; `@RestController` yalnızca `<domain>.api`; controller'da `new …Service(` yasak.
- **`backend/src/test/java/com/kopruq/contract/EndpointInventoryContractTest.java`:** 21 endpoint'i birebir sabitler.
- **Test altyapısı:** `backend/src/test/resources/config/application.properties` H2 (`jdbc:h2:mem:kopruq;MODE=PostgreSQL;…;DB_CLOSE_DELAY=-1`), aynı JVM'deki tüm context'lerce **paylaşılır**; contract testleri (`ContractTestSupport`, `@SpringBootTest @AutoConfigureMockMvc`) commit eder; `@DataJpaTest` testleri rollback; `KOPRUQ_TEST_DB_URL` ile gerçek PG (`compose.yaml` `postgres-test`, port 5433). Mevcut: `bridge/model/ProjectTest.java`, `bridge/infra/persistence/JpaProjectRepositoryTest.java`, `shared/exception/ApiExceptionHandlerTest.java` (`Thrower` controller), `contract/PersistenceContractTest.java`. `.github/workflows` yok (CI tanımlı değil).
- **Frontend sözleşme kaynağı** (değiştirilmez): `frontend/src/features/project/model/projectWorkspace.ts` `ProjectWorkspaceData`: `name, id, client, designer, country, region, projectType, status, startDate, targetDate, description, locationStart, locationEnd, coordinateSystem, designStandardFamily, concreteCode, steelCode, compositeCode, seismicCode, geotechnicalCode, trafficLoadStandard, units{length,force,moment,stress,mass,temperature}, coordinate{name,epsg,horizontalDatum,verticalDatum,originX,originY,originZ,northAngle}, criteria{designLife,reliabilityClass,exposure,concreteClass,cover,philosophy}, environment{terrainDatasetId: string|null, landXmlImportId: string|null}, lastModified` (hepsi string). `frontend/src/features/project/model/types.ts` `BridgeRow`: `id?: string, no, km, crossingType: string, estimatedLengthM, roadWidthM: number, terrain, status: string, bridgeType: 'Precast Girder'|'Steel Composite Girder'|'Cantilever Bridge', spansM: number[], girderDepthCm: number[]|null, girderNote: string|null, pierShape: 'Rectangular'|'Circular'|'Box'|'Oval'` (TS'te `id` opsiyonel; `ensureBridgeIds` her satıra id verir).
- **Çalışma ağacı:** `docs/architecture.md`, `docs/roadmap.md` ve bazı frontend dosyalarında commit edilmemiş değişiklikler olabilir; M1 bu iki dokümanı da düzenler, mevcut değişiklikler korunmalı.

## 3. Önerilen tasarım

### 3.1 Katmanlar ve veri akışı
```
ProjectController (bridge.api)
  ├─ ProjectRequestReader (bridge.api, @Component): JsonNode → DTO, bilinmeyen alanı reddeder
  ├─ ProjectWorkspaceMapper (bridge.api): DTO ↔ model, FieldChecks ile alan yollu ihlaller
  └─ ProjectService (bridge.application, CoreConfiguration'da @Bean)
       ├─ ProjectRepository (port) ──► JpaProjectRepository (+ findByIdForUpdate, findSummaries)
       ├─ ProjectContentRepository (port) ──► JpaProjectContentRepository
       ├─ TransactionOperations (mevcut bean)
       └─ Clock (yeni bean)
Project (model): requireRevision / recordChange → RevisionConflictException (shared.exception)
```
`bridge` domain kenarları `{}` kalır; `shared.exception` yeni domain kenarı almaz.

### 3.2 Model (`com.kopruq.bridge.model` ve `enums`; Spring/JPA/application/api importu yok)
- **`Project`** genişler: `private long revision = 0;`, `private Instant updatedUtc` (yapıcıda `createdUtc` ile aynı `Instant`, tek `Instant.now()`); `getRevision()`, `getUpdatedUtc()`; `restoreRevision(long revision, Instant updatedUtc)` (persistence ve oluşturma için; `revision < 0` veya `updatedUtc == null` → `IllegalArgumentException`); `requireRevision(long expected)` (uyuşmazlıkta `RevisionConflictException(expected, revision)`); `recordChange(Instant now)` (`revision++`, `updatedUtc = Objects.requireNonNull(now)`).
- **`ProjectSection`:** `public sealed interface ProjectSection permits ProjectWorkspace {}` (M2 listeyi genişletir).
- **`ProjectWorkspace(ProjectInfo project, List<BridgeInventoryRow> bridges)`**: ikisi de null olamaz; `bridges` `List.copyOf`; satır `id`'leri tekil (`IllegalArgumentException("duplicate bridge id …")`).
- **`ProjectInfo`** record, frontend alanlarıyla birebir: `name, code` (frontend `id`), `client, designer, country, region, projectType, status, startDate, targetDate, description, locationStart, locationEnd, coordinateSystem, designStandardFamily, concreteCode, steelCode, compositeCode, seismicCode, geotechnicalCode, trafficLoadStandard, Units units, Coordinate coordinate, Criteria criteria, Environment environment, lastModified`. İç içe: `Units(length, force, moment, stress, mass, temperature)`, `Coordinate(name, epsg, horizontalDatum, verticalDatum, originX, originY, originZ, northAngle)`, `Criteria(designLife, reliabilityClass, exposure, concreteClass, cover, philosophy)`, `Environment(terrainDatasetId, landXmlImportId)` (nullable). Compact constructor'lar yalnızca `Objects.requireNonNull`; boş string geçerli; hiçbir alan yorumlanmaz (Q3).
- **`BridgeInventoryRow(String id, String no, String km, String crossingType, double estimatedLengthM, double roadWidthM, String terrain, String status, BridgeInventoryType bridgeType, List<Double> spansM, List<Double> girderDepthCm, String girderNote, InventoryPierShape pierShape)`**: `id` blank olamaz; string alanlar (`girderNote` hariç) null olamaz; `estimatedLengthM`, `roadWidthM` sonlu (**işaret/aralık kontrolü yok**); `spansM` null olamaz, elemanlar null olmayan sonlu sayı; `girderDepthCm` null olabilir (null ≠ `[]`), doluysa elemanlar sonlu; listeler `List.copyOf`. Birimler alan adında (Q2).
- **`bridge/enums/BridgeInventoryType`:** `PRECAST_GIRDER("Precast Girder")`, `STEEL_COMPOSITE_GIRDER("Steel Composite Girder")`, `CANTILEVER_BRIDGE("Cantilever Bridge")`; `label()`, `static Optional<BridgeInventoryType> fromLabel(String)`.
- **`bridge/enums/InventoryPierShape`:** `RECTANGULAR("Rectangular")`, `CIRCULAR("Circular")`, `BOX("Box")`, `OVAL("Oval")`; aynı metotlar.

### 3.3 Hata sözleşmesi (`com.kopruq.shared.exception`)
- **`ResourceNotFoundException extends RuntimeException`** `(String code, String message)`, `code()`. Handler 404, `code` istisnadan. Proje: `new ResourceNotFoundException("PROJECT_NOT_FOUND", "No project with id " + id)`.
- **`RevisionConflictException extends RuntimeException`** `(long expectedRevision, long currentRevision)` + getter'lar. Mesaj: `"Expected revision 3 but the project is at revision 5."`. Handler 409 `PROJECT_REVISION_CONFLICT`, `errors: []`. `IllegalArgumentException`'dan **türemez** (`INVALID_INPUT` ile karışmasın).
- `ApiExceptionHandler`'a iki `@ExceptionHandler`, mevcut `build(...)`; sınıf javadoc tablosu güncellenir.

### 3.4 Application (`com.kopruq.bridge.application`)
Spring'den yalnızca `TransactionOperations` (`LandXmlImportUseCase` deseni).
- **`ProjectRepository`**: `Optional<Project> findByIdForUpdate(UUID id)` (pessimistic write), `List<ProjectSummary> findSummaries()`.
- **`ProjectContentRepository`** (yeni port): `ProjectContent load(UUID projectId)`, `void replace(UUID projectId, ProjectSection section)`.
- **Read modelleri:** `ProjectSummary(UUID projectId, String name, long revision, Instant createdUtc, Instant updatedUtc)`; `ProjectContent(ProjectWorkspace workspace)` (workspace yalnızca V3 öncesi `project_info` satırı olmayan projelerde null); `ProjectDocument(UUID projectId, long revision, Instant createdUtc, Instant updatedUtc, ProjectWorkspace workspace)`; `ProjectRevision(UUID projectId, long revision, Instant updatedUtc)`.
- **`ProjectService(ProjectRepository, ProjectContentRepository, TransactionOperations, Clock)`:**
  - `list()`: `findSummaries()` sonucu `updatedUtc` azalan, eşitlikte `projectId` artan (serviste sıralama).
  - `create(ProjectWorkspace ws)`: tek transaction: `now = clock.instant().truncatedTo(MICROS)` → `new Project()` → `setProjectName(ws.project().name())` → `setCreatedUtc(now)` → `restoreRevision(0, now)` → `projects.save` → `contents.replace(id, ws)` → `ProjectDocument`.
  - `document(UUID id)`: transaction: `findById` (yoksa 404) → `contents.load` → `ProjectDocument`.
  - `replace(UUID id, long expectedRevision, ProjectSection section)`: tek transaction: (1) `findByIdForUpdate` (yoksa 404); (2) `requireRevision` (409, henüz yazma yok); (3) `contents.replace`; (4) `ProjectWorkspace w` ise `setProjectName(w.project().name())`; (5) `recordChange(clock.instant().truncatedTo(MICROS))`; (6) `projects.save`; (7) `ProjectRevision`. İstisnada rollback.
  - Ad tek yerde: `project.project_name`; `project_info`'da ad kolonu yok.

### 3.5 Infra (`com.kopruq.bridge.infra.persistence`; entity'ler package-private, adapter'lar public)
- **`ProjectEntity`**: `@Column(name="revision", nullable=false) long revision`, `@Column(name="updated_utc", nullable=false) Instant updatedUtc`; `apply` kopyalar (`updatedUtc` MICROS'a kesilir); `toDomain` `restoreRevision` çağırır; `row_version` aynen kalır.
- **`ProjectJpaRepository`**: `@Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from ProjectEntity p where p.id = :id") Optional<ProjectEntity> findByIdForUpdate(@Param("id") UUID id);` ve `@Query("select new com.kopruq.bridge.application.ProjectSummary(p.id, p.projectName, p.revision, p.createdUtc, p.updatedUtc) from ProjectEntity p") List<ProjectSummary> findSummaries();`.
- **`JpaProjectRepository`**: iki yeni metot; `findByIdForUpdate` readOnly **değil**.
- **`ProjectInfoEntity`** (`project_info`): `@Id @Column(name="project_id") UUID projectId`, ilişki tanımı yok (FK yalnızca DB'de); `apply(ProjectInfo)` adı yazmaz; `toDomain(String projectName)`.
- **`ProjectBridgeRowEntity`** (`project_bridge_row`): `@Id @GeneratedValue(strategy = GenerationType.UUID) UUID id`; `projectId`, `ordinal`, `rowId`, string ve double alanlar; `@Enumerated(EnumType.STRING)` `bridgeType`, `pierShape` (DB'de sabit adı, JSON'da etiket); `hasGirderDepths` boolean (null ≠ `[]`); span'ler `@ElementCollection @CollectionTable(name="project_bridge_row_span", joinColumns=@JoinColumn(name="bridge_row_id")) @OrderColumn(name="span_index") @Column(name="length_m", nullable=false) List<Double>`; girder derinlikleri aynı biçimde (`project_bridge_row_girder_depth`, `depth_index`, `depth_cm`).
- **`ProjectInfoJpaRepository`** (`JpaRepository<ProjectInfoEntity, UUID>`); **`ProjectBridgeRowJpaRepository`** (`findByProjectIdOrderByOrdinalAsc(UUID)`, `deleteByProjectId(UUID)` — türetilmiş delete entity'leri yükleyip siler, element collection'lar da silinir).
- **`JpaProjectContentRepository implements ProjectContentRepository`** (`@Repository @Transactional`): `load` adı `ProjectJpaRepository.findById` ile alır; info yoksa `new ProjectContent(null)`, varsa satırları ordinal sırasıyla okur. `replace` (sealed `switch`, `ProjectWorkspace`): (1) info upsert; (2) `rows.deleteByProjectId(id)`; (3) **`rows.flush()`** (Hibernate INSERT'i DELETE'ten önce çalıştırır, flush yoksa `UNIQUE(project_id,row_id)` ihlali); (4) yeni satırlar `saveAll` (ordinal = indeks); (5) `flush()`.
- Tüm `toDomain` dönüşümleri transaction içinde (`open-in-view=false`).

### 3.6 API (`com.kopruq.bridge.api`)
- **`ProjectController`** (`@RestController @RequestMapping("/api/projects")`; constructor injection `ProjectService`, `ProjectRequestReader`): `@GetMapping List<ProjectSummaryResponse> list()`; `@PostMapping ResponseEntity<ProjectDocumentResponse> create(@RequestBody JsonNode body)` → **201** + `Location: /api/projects/{id}`; `@GetMapping("/{projectId}") get(@PathVariable UUID)`; `@PutMapping("/{projectId}/workspace") putWorkspace(@PathVariable UUID, @RequestBody JsonNode)`. Geçersiz UUID mevcut handler ile 400 `INVALID_PARAMETER`.
- **`ProjectRequestReader`** (`@Component`, `ObjectMapper`): `<T> T read(JsonNode body, Class<T> type)` = `mapper.readerFor(type).with(FAIL_ON_UNKNOWN_PROPERTIES).without(ACCEPT_FLOAT_AS_INT).readValue(body)`; gövde nesne değilse `InvalidRequestException(FieldViolation("body","must be a JSON object"))`; `UnrecognizedPropertyException` → `FieldViolation(<yol>, "is not a known field")`; diğer `JsonProcessingException` → `"has an invalid value"`; yol `e.getPath()`'ten (`value.bridges[0].foo`). Bozuk JSON/eksik gövde Spring'ce `MALFORMED_REQUEST_BODY`. Global `FAIL_ON_UNKNOWN_PROPERTIES` açılmaz (mevcut 21 endpoint etkilenmesin).
- **DTO'lar (record):** `WorkspaceDto(ProjectInfoDto project, List<BridgeRowDto> bridges)` (+ iç içe `ProjectInfoDto`, `UnitsDto`, `CoordinateDto`, `CriteriaDto`, `EnvironmentDto`, `BridgeRowDto`; ayrı dosyalara bölünebilir); `CreateProjectRequest(WorkspaceDto workspace)`; `WorkspacePutRequest(Long expectedRevision, WorkspaceDto value)`; `ProjectSummaryResponse(UUID projectId, String name, long revision, Instant createdAt, Instant updatedAt)`; `ProjectDocumentResponse(UUID projectId, long revision, Instant createdAt, Instant updatedAt, WorkspaceDto workspace)`; `WorkspaceWriteResponse(UUID projectId, long revision, Instant updatedAt, WorkspaceDto value)`. Sayılar kutulu tipler (eksik alan 0'a dönüşmez).
- **`ProjectWorkspaceMapper`** (final, static): `toModel(WorkspaceDto dto, String prefix)` tüm ihlalleri toplar sonra `throwIfAny`: null string → `"is required"`; sayı `requireFinite`; bilinmeyen etiket → `"must be one of: Precast Girder, Steel Composite Girder, Cantilever Bridge"` (`pierShape` için benzer); boş `id` → `"must not be blank"`; tekrarlı `id` → `"duplicates bridges[i].id"`; null liste elemanı → `spansM[1] "is required"`. `toDto(ProjectWorkspace)`. Önek POST `workspace.`, PUT `value.`; `expectedRevision` null → `"expectedRevision" is required`. Mapper hataları 400 `INVALID_REQUEST`; model invariant'ları ikinci savunma (400 `INVALID_INPUT`).
- PUT yanıtındaki `value` saklanan modelden `toDto` ile üretilir (round-trip birebir).

**Üst plandan bilinçli sapmalar (yazılım kararı):** (1) Bilinmeyen alan 400 `INVALID_REQUEST` + alan yolu (üst plan `MALFORMED_REQUEST_BODY`); AC7 "400" der, yine sağlanır. (2) Alt tablo kolonları V2 ile tutarlı: `idx` yerine `span_index`/`depth_index`, FK kolonu `bridge_row_id`. (3) `ProjectContentRepository.load` bir `ProjectContent` döndürür.

### 3.7 JSON şekilleri
`WorkspaceDto` (değerler örnek; backend varsayılan üretmez):
```json
{
  "project": {
    "name": "Koridor A", "id": "PRJ-01", "client": "", "designer": "", "country": "", "region": "",
    "projectType": "", "status": "", "startDate": "", "targetDate": "", "description": "",
    "locationStart": "", "locationEnd": "", "coordinateSystem": "", "designStandardFamily": "",
    "concreteCode": "", "steelCode": "", "compositeCode": "", "seismicCode": "", "geotechnicalCode": "",
    "trafficLoadStandard": "",
    "units": {"length": "m", "force": "kN", "moment": "kNm", "stress": "MPa", "mass": "t", "temperature": "C"},
    "coordinate": {"name": "", "epsg": "", "horizontalDatum": "", "verticalDatum": "", "originX": "", "originY": "", "originZ": "", "northAngle": ""},
    "criteria": {"designLife": "", "reliabilityClass": "", "exposure": "", "concreteClass": "", "cover": "", "philosophy": ""},
    "environment": {"terrainDatasetId": null, "landXmlImportId": null},
    "lastModified": ""
  },
  "bridges": [
    {"id": "b-1", "no": "VIA-02", "km": "14+170.000", "crossingType": "Valley", "estimatedLengthM": 205.0,
     "roadWidthM": 13.8, "terrain": "—", "status": "—", "bridgeType": "Precast Girder",
     "spansM": [30.0, 35.0, 40.0], "girderDepthCm": [160.0, 190.0], "girderNote": null, "pierShape": "Circular"}
  ]
}
```
- `POST /api/projects` istek `{"workspace": WorkspaceDto}`; yanıt **201** `{"projectId","revision":0,"createdAt","updatedAt"(aynı),"workspace"}`.
- `GET /api/projects` 200: `[{"projectId","name","revision","createdAt","updatedAt"}]`, `updatedAt` azalan.
- `GET /api/projects/{projectId}` 200: `{"projectId","revision","createdAt","updatedAt","workspace": WorkspaceDto|null}`; M1'de başka anahtar yok.
- `PUT /api/projects/{projectId}/workspace` istek `{"expectedRevision":7,"value":WorkspaceDto}`; yanıt 200 `{"projectId","revision":8,"updatedAt","value":WorkspaceDto}`.
- Hatalar: 400 `INVALID_REQUEST` (`errors[]` alan yollu), 400 `MALFORMED_REQUEST_BODY`, 400 `INVALID_PARAMETER`, 404 `PROJECT_NOT_FOUND`, 409 `PROJECT_REVISION_CONFLICT`.
- `Instant` alanları ISO-8601 string.

### 3.8 SQL: `V3__project_workspace.sql`
Başlık yorumu V1/V2 ile aynı ilke: DEFAULT/mühendislik CHECK'i yok; string girdiler `VARCHAR` (Q3); birimler kolon adında (Q2).
```sql
ALTER TABLE project ADD COLUMN revision BIGINT;
ALTER TABLE project ADD COLUMN updated_utc TIMESTAMP WITH TIME ZONE;
UPDATE project SET revision = 0, updated_utc = created_utc;
ALTER TABLE project ALTER COLUMN revision SET NOT NULL;
ALTER TABLE project ALTER COLUMN updated_utc SET NOT NULL;

CREATE TABLE project_info (
  project_id UUID NOT NULL,
  project_code VARCHAR NOT NULL, client VARCHAR NOT NULL, designer VARCHAR NOT NULL, country VARCHAR NOT NULL,
  region VARCHAR NOT NULL, project_type VARCHAR NOT NULL, status VARCHAR NOT NULL, start_date VARCHAR NOT NULL,
  target_date VARCHAR NOT NULL, description VARCHAR NOT NULL, location_start VARCHAR NOT NULL,
  location_end VARCHAR NOT NULL, coordinate_system VARCHAR NOT NULL, design_standard_family VARCHAR NOT NULL,
  concrete_code VARCHAR NOT NULL, steel_code VARCHAR NOT NULL, composite_code VARCHAR NOT NULL,
  seismic_code VARCHAR NOT NULL, geotechnical_code VARCHAR NOT NULL, traffic_load_standard VARCHAR NOT NULL,
  unit_length VARCHAR NOT NULL, unit_force VARCHAR NOT NULL, unit_moment VARCHAR NOT NULL,
  unit_stress VARCHAR NOT NULL, unit_mass VARCHAR NOT NULL, unit_temperature VARCHAR NOT NULL,
  coordinate_name VARCHAR NOT NULL, coordinate_epsg VARCHAR NOT NULL, coordinate_horizontal_datum VARCHAR NOT NULL,
  coordinate_vertical_datum VARCHAR NOT NULL, coordinate_origin_x VARCHAR NOT NULL, coordinate_origin_y VARCHAR NOT NULL,
  coordinate_origin_z VARCHAR NOT NULL, coordinate_north_angle VARCHAR NOT NULL,
  criteria_design_life VARCHAR NOT NULL, criteria_reliability_class VARCHAR NOT NULL, criteria_exposure VARCHAR NOT NULL,
  criteria_concrete_class VARCHAR NOT NULL, criteria_cover VARCHAR NOT NULL, criteria_philosophy VARCHAR NOT NULL,
  environment_terrain_dataset_id VARCHAR, environment_land_xml_import_id VARCHAR,
  last_modified VARCHAR NOT NULL,
  CONSTRAINT pk_project_info PRIMARY KEY (project_id),
  CONSTRAINT fk_project_info_project FOREIGN KEY (project_id) REFERENCES project (id)
);

CREATE TABLE project_bridge_row (
  id UUID NOT NULL, project_id UUID NOT NULL, ordinal INTEGER NOT NULL, row_id VARCHAR NOT NULL,
  no VARCHAR NOT NULL, km VARCHAR NOT NULL, crossing_type VARCHAR NOT NULL,
  estimated_length_m DOUBLE PRECISION NOT NULL, road_width_m DOUBLE PRECISION NOT NULL,
  terrain VARCHAR NOT NULL, status VARCHAR NOT NULL, bridge_type VARCHAR(32) NOT NULL,
  girder_note VARCHAR, pier_shape VARCHAR(32) NOT NULL, has_girder_depths BOOLEAN NOT NULL,
  CONSTRAINT pk_project_bridge_row PRIMARY KEY (id),
  CONSTRAINT fk_project_bridge_row_project FOREIGN KEY (project_id) REFERENCES project (id),
  CONSTRAINT uq_project_bridge_row_row_id UNIQUE (project_id, row_id)
);
CREATE INDEX ix_project_bridge_row_project ON project_bridge_row (project_id);

CREATE TABLE project_bridge_row_span (
  bridge_row_id UUID NOT NULL, span_index INTEGER NOT NULL, length_m DOUBLE PRECISION NOT NULL,
  CONSTRAINT pk_project_bridge_row_span PRIMARY KEY (bridge_row_id, span_index),
  CONSTRAINT fk_project_bridge_row_span_row FOREIGN KEY (bridge_row_id) REFERENCES project_bridge_row (id)
);
CREATE TABLE project_bridge_row_girder_depth (
  bridge_row_id UUID NOT NULL, depth_index INTEGER NOT NULL, depth_cm DOUBLE PRECISION NOT NULL,
  CONSTRAINT pk_project_bridge_row_girder_depth PRIMARY KEY (bridge_row_id, depth_index),
  CONSTRAINT fk_project_bridge_row_girder_depth_row FOREIGN KEY (bridge_row_id) REFERENCES project_bridge_row (id)
);
```
`no` kolon adı H2'de hata verirse `inventory_no` olarak yeniden adlandırılabilir (entity ile tutarlı). `ddl-auto=validate` entity/kolon tiplerini doğrular.

## 4. Alternatifler
| Alternatif | Karar |
|---|---|
| Global `spring.jackson.deserialization.fail-on-unknown-properties=true` | Reddedildi: mevcut 21 endpoint'in sözleşmesini değiştirebilir. |
| DTO'larda `@JsonAnySetter` | Reddedildi: record desteği Jackson sürümüne bağlı, doğrulanmadı. |
| Proje endpoint'lerinde katı okuyucu | **Seçildi:** sürümden bağımsız, alan yolu verir, bağımlılık eklemez. |
| `project_info`'yu `ProjectEntity`'ye `@OneToOne` bağlamak | Reddedildi: `ProjectEntity.apply` ve alternatives akışına dokunur. |
| Satırları id ile birleştirmek | Reddedildi: sil + `flush` + ekle daha basit. |
| `revision` olarak `row_version` | Reddedildi: domain revizyonu teknik kilitten ayrı. |
| 404 için `ResponseStatusException` | Reddedildi: `PROJECT_NOT_FOUND` kodu gerekli. |

## 5. Sıralı görevler
Yollar `backend/src/` altında.

1. **Migration:** `main/resources/db/migration/V3__project_workspace.sql`.
2. **İstisnalar:** `main/java/com/kopruq/shared/exception/ResourceNotFoundException.java`, `RevisionConflictException.java`; `ApiExceptionHandler.java` 2 handler + javadoc.
3. **Model (2'ye bağlı):** `bridge/model/Project.java`; yeni `ProjectSection.java`, `ProjectWorkspace.java`, `ProjectInfo.java`, `BridgeInventoryRow.java`; `bridge/enums/BridgeInventoryType.java`, `InventoryPierShape.java`.
4. **Application (3):** `ProjectRepository.java` (2 metot); yeni `ProjectContentRepository.java`, `ProjectService.java`, `ProjectSummary.java`, `ProjectContent.java`, `ProjectDocument.java`, `ProjectRevision.java`.
5. **Infra (1, 4):** güncelle `ProjectEntity.java`, `ProjectJpaRepository.java`, `JpaProjectRepository.java`; yeni `ProjectInfoEntity.java`, `ProjectBridgeRowEntity.java`, `ProjectInfoJpaRepository.java`, `ProjectBridgeRowJpaRepository.java`, `JpaProjectContentRepository.java`.
6. **Config (4):** `shared/config/CoreConfiguration.java`: `@Bean Clock clock()` (`Clock.systemUTC()`), `@Bean ProjectService projectService(...)`; `shared/config/WebCorsConfiguration.java`: `allowedMethods("GET","POST","PUT","HEAD")` + javadoc.
7. **API (4, 6):** yeni `bridge/api/ProjectController.java`, `ProjectRequestReader.java`, `ProjectWorkspaceMapper.java`, `WorkspaceDto.java`, `CreateProjectRequest.java`, `WorkspacePutRequest.java`, `ProjectSummaryResponse.java`, `ProjectDocumentResponse.java`, `WorkspaceWriteResponse.java`.
8. **Mevcut testlerin güncellenmesi:** `ArchitectureTests.java` (sayı 13; metot adı `…andExactlyThirteen`; mesaj "the 13 controllers"); `EndpointInventoryContractTest.java` (`"GET /api/projects"`, `"POST /api/projects"`, `"GET /api/projects/{projectId}"`, `"PUT /api/projects/{projectId}/workspace"` + javadoc); `LayoutKernelCorsContractTest.java` (satır 125 `"GET,POST,PUT,HEAD"`; DELETE test adı `…OutsideGetPostPutHead…`; `coversEveryControllerFamily`'e `{"/api/projects","GET"}`, `{"/api/projects","POST"}`, `{"/api/projects/00000000-0000-0000-0000-000000000001/workspace","PUT"}`); `ProjectTest.java` (revizyon); `JpaProjectRepositoryTest.java` (`assertSameProject`'a `revision`/`updatedUtc` MICROS; `findByIdForUpdate`, `findSummaries`); `ApiExceptionHandlerTest.java` (`Thrower`'a `"notfound"`, `"conflict"` + 2 test); isteğe bağlı `ContractTestSupport.putJson`.
9. **Yeni testler:** `ProjectWorkspaceTest` (blank/tekrarlı id, sonlu olmayan sayı, null eleman, null ≠ `[]`, liste kopyası); `ProjectServiceTest` (sahte `InMemoryProjectRepository`/`InMemoryProjectContentRepository` `test/java/com/kopruq/bridge/infra/` altında, `TransactionOperations.withoutTransaction()`, ilerletilebilir `Clock`); `JpaProjectContentRepositoryTest` (`@DataJpaTest` + `replace = NONE` + `@Import`); `ProjectServiceIntegrationTest` (`@SpringBootTest`; alternatives/designSpace korunur); `ProjectApiContractTest` (MockMvc, `ContractTestSupport`); `V3MigrationTest` (düz JUnit, ayrı H2 `jdbc:h2:mem:v3migration;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1`: `Flyway.configure()...target("2").load().migrate()` → `project` satırı ekle → hedefsiz migrate → `revision=0`, `updated_utc=created_utc`; yalnızca mevcut `flyway-core` ve `h2`).
10. **Dokümanlar:** `bridge/package-info.java` ve `ProjectRepository` javadoc notu; `docs/architecture.md` yeni bölüm "BACKEND-DB-PERSISTENCE M1 (2026-10-13)" (V3 şeması, revizyon/409, 4 endpoint, CORS PUT, katı okuma, controller sayısı 13); `docs/roadmap.md` yeni bölüm "BACKEND-DB-PERSISTENCE track (2026-10-13)" (M1 `[x]`, M2–M5 `[ ]`; 1839. satıra not). Çalışma ağacındaki mevcut değişiklikler korunur, yalnızca ekleme yapılır.
11. **Kontrol:** `mvn -f backend/pom.xml -B package` yeşil.

Yaklaşık 24 yeni main/test dosyası, yaklaşık 14 güncellenen dosya.

## 6. Kabul kriterleri
- **AC1:** V3 Flyway ile H2'de (ve `KOPRUQ_TEST_DB_URL` verilirse PG'de) uygulanır; V1/V2 byte düzeyinde değişmez. V2 şemasındaki mevcut `project` satırı V3 sonrası `revision=0`, `updated_utc=created_utc` alır. `ddl-auto=validate` ile context açılır.
- **AC2:** `GET /api/projects` 200, `updatedAt` azalan (iki proje oluşturup ilkine `PUT` → o önce gelir); proje yoksa `[]` (servis testi).
- **AC3:** `POST /api/projects` 201, `Location` `/api/projects/{projectId}`, `revision` 0, `createdAt == updatedAt`, `workspace` gönderilenle derin eşit (null `girderDepthCm`, `[]` `spansM`, null environment id'leri, Unicode dahil). `project.project_name` = `workspace.project.name`; `project_info.project_code` = `workspace.project.id`.
- **AC4:** Var olmayan UUID ile `GET` ve `PUT …/workspace` → 404 `PROJECT_NOT_FOUND`; UUID olmayan yol → 400 `INVALID_PARAMETER`; gövde `ApiErrorResponse`.
- **AC5:** Doğru `expectedRevision` ile `PUT` 200: `revision` = önceki + 1, `updatedAt` saat değerine güncellenir (servis testinde sabit `Clock` ile tam değer). Yanıt `value` ve sonraki `GET` `workspace` derin eşit. Satır sırası, ekleme, çıkarma ve aynı id'lerle yer değiştirme `UNIQUE` hatası vermeden yansır. Ad değişikliği `GET /api/projects` özetinde görünür.
- **AC6:** Eski `expectedRevision` → 409 `PROJECT_REVISION_CONFLICT`; `project.revision`, `updated_utc`, `project_name`, `project_info`, `project_bridge_row` değişmez (`JdbcTemplate` ve `GET`). Aynı revizyonla art arda iki `PUT`: ilki 200, ikincisi 409.
- **AC7:** Şunlar 400 ve DB değişmez: eksik `expectedRevision` (`INVALID_REQUEST`, alan `expectedRevision`); `"NaN"`/`1e999` (`value.bridges[0].estimatedLengthM`, `value.bridges[0].spansM[1]`); tekrarlı satır `id` (`value.bridges[1].id`); bilinmeyen `bridgeType`/`pierShape`; eksik zorunlu string (`value.project.units.length`); bilinmeyen alan (`INVALID_REQUEST`, `"is not a known field"`, `value.bridges[0].foo`, `value.extra`); bozuk JSON (`MALFORMED_REQUEST_BODY`). `POST` için `workspace.` öneki; geçersiz `POST` hiçbir `project` satırı oluşturmaz.
- **AC8:** `Origin: http://localhost:5173` + `Access-Control-Request-Method: PUT` ile `OPTIONS /api/projects/{id}/workspace` 200, `Access-Control-Allow-Methods` = `GET,POST,PUT,HEAD`; başka origin 403, `DELETE` preflight 403.
- **AC9:** `designSpace`, `bridge`, alternatives ve `selectedAlternativeId` ile kaydedilmiş projede workspace `PUT` sonrası bunlar `ProjectRepository.findById` ile birebir aynı.
- **AC10:** `ArchitectureTests` geçer (tam 13 `@RestController`; `bridge` kenarları `{}`, `SHARED_DEPS` değişmedi; model/enums'ta Spring/JPA/application/api importu yok; JPA yalnızca `bridge.infra.persistence`; pom 11 bağımlılık). `EndpointInventoryContractTest` eski 21 + yeni 4 = 25 endpoint'i birebir listeler.
- **AC11:** `ApiExceptionHandlerTest`: `ResourceNotFoundException` → 404 + istisnadaki `code`; `RevisionConflictException` → 409 `PROJECT_REVISION_CONFLICT`, mesajda iki revizyon numarası; gövde 8 anahtarı taşır.
- **AC12:** Model invariant'ları: blank/tekrarlı id, sonlu olmayan sayı, null liste elemanı `IllegalArgumentException`; negatif/sıfır uzunluk **kabul edilir** (mühendislik aralığı yok). `requireRevision` uyuşmazlıkta `RevisionConflictException`; `recordChange` revizyonu 1 artırır.
- **AC13:** `mvn -f backend/pom.xml -B package` başarılı; frontend dosyası değişmemiş; `docs/architecture.md` ve `docs/roadmap.md` M1'i anlatıyor.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `V3MigrationTest`; tüm Spring testleri context açarken Flyway + `validate`; isteğe bağlı PG: `docker compose --profile postgres-test up -d --wait postgres-test`, sonra `KOPRUQ_TEST_DB_URL=jdbc:postgresql://localhost:5433/kopruq_test KOPRUQ_TEST_DB_USERNAME=… KOPRUQ_TEST_DB_PASSWORD=… mvn -f backend/pom.xml -B test` | Yeşil; `revision=0`, `updated_utc=created_utc` |
| AC2 | `ProjectServiceTest` (boş liste, sıralama), `ProjectApiContractTest` (göreli sıra) | `[]`; güncellenen önce |
| AC3 | `ProjectApiContractTest` + `JdbcTemplate`, `JpaProjectContentRepositoryTest` round-trip | 201, derin eşitlik |
| AC4 | `ProjectApiContractTest`, `ProjectServiceTest` | 404 / 400 |
| AC5 | `ProjectApiContractTest`, `ProjectServiceTest` (sabit `Clock`), `JpaProjectContentRepositoryTest` | 200, rev+1, eşitlik, UNIQUE hatası yok |
| AC6 | `ProjectApiContractTest` (öncesi/sonrası `JdbcTemplate` + `GET`), `ProjectServiceTest` | 409, değişiklik yok |
| AC7 | `ProjectApiContractTest` parametrik vakalar + satır sayıları | 400, alan yolları, DB değişmemiş |
| AC8 | `LayoutKernelCorsContractTest` (güncel) + `ProjectApiContractTest` preflight | 200 / 403 |
| AC9 | `ProjectServiceIntegrationTest` | Eşit |
| AC10 | `ArchitectureTests`, `EndpointInventoryContractTest` | Yeşil |
| AC11 | `ApiExceptionHandlerTest` | 404/409 gövdeleri |
| AC12 | `ProjectTest`, `ProjectWorkspaceTest` | Yeşil |
| AC13 | `mvn -f backend/pom.xml -B package`; `git status` ile frontend değişmemiş; doküman incelemesi | BUILD SUCCESS |

Hedefli koşu: `mvn -f backend/pom.xml -B test -Dtest=ProjectTest,ProjectWorkspaceTest,ProjectServiceTest,ProjectServiceIntegrationTest,JpaProjectRepositoryTest,JpaProjectContentRepositoryTest,V3MigrationTest,ProjectApiContractTest,ApiExceptionHandlerTest,LayoutKernelCorsContractTest,EndpointInventoryContractTest,ArchitectureTests`

**Bilinmeyenler:** CI yok; bu makinede `mvn`'in PATH'te olup olmadığı doğrulanmadı (CLAUDE.md'deki `C:\Users\harput\tools\` başka kullanıcıya ait); `postgres-test` kimlik bilgileri `.env.example`'da; `V3MigrationTest` her zaman H2 (PG'de `UPDATE` yolu yalnızca dolu DB'de elle doğrulanabilir); frontend `npm` kontrolleri M1'de gerekmez.

## 8. Riskler
- **Paylaşılan H2 bellek DB'si:** contract testlerinin projeleri kalıcı; "proje yoksa `[]`" yalnızca servis testinde; contract testleri mutlak sayı yerine kendi id'lerine bakmalı.
- **Hibernate flush sırası:** `deleteByProjectId` sonrası `flush` unutulursa `uq_project_bridge_row_row_id` ihlali; AC5 "aynı id'lerle yer değiştirme" testi yakalar.
- **Kilitleme:** `PESSIMISTIC_WRITE` H2/PG'de desteklenir; `@Version row_version` ikinci savunma. Eşzamanlılık testi yok; sıralı iki `PUT` ile 409 doğrulanır.
- **Rollback:** revizyon kontrolü yazmadan önce; yazma ortasındaki hata `TransactionTemplate` ile geri alınır; özel test yok (kabul edilen boşluk).
- **Katı okuma yalnızca proje endpoint'lerinde:** mevcut endpoint'ler bilinmeyen alanları yok saymaya devam eder; Jackson string↔sayı zorlamaları açık kalır; ondalıklı `expectedRevision` reddedilir.
- **Girdi boyutu sınırı yok, auth yok** (yerel tek kullanıcı); CORS yalnızca yapılandırılan origin, `PUT` eklendi, `DELETE` kapalı.
- **Migration/geri alma:** Flyway ileri gider; kod geri alınırsa V3 kolon/tabloları kalır; eski kodla yeni `project` satırı eklemek `revision NOT NULL` ihlali verir (bugün böyle production yolu yok).
- **Çalışma ağacı kirli olabilir:** helper `start`'ı "dirty source" nedeniyle reddedebilir; coordinator karar verir. Implementer mevcut değişiklikleri korumalı.
- **Mühendislik güvenliği:** aralık, varsayılan veya birim dönüşümü eklenmez; string girdiler yorumlanmaz.

## 9. Varsayımlar ve açık sorular
**Doğrulanmış:** 2. bölümdeki yollar ve sayılar (12 controller, 21 endpoint, 11 bağımlılık), V3 numarasının boş olması, CORS testinin metotları sabitlemesi (`LayoutKernelCorsContractTest:125`), `Clock` bean'inin olmaması, Jackson'ın bilinmeyen alanları varsayılan olarak yok saymaşı, frontend alan listeleri.

**Planlayıcı varsayımları (yazılım kararları, değiştirilebilir):**
- Bilinmeyen alan → `INVALID_REQUEST` + alan yolu.
- Workspace'in tüm string alanları zorunlu (boş string geçerli); yalnızca `environment.*`, `girderNote`, `girderDepthCm` null olabilir. M4 frontend mapper'ı normalize edilmiş tam nesne gönderir.
- `bridges[].id` backend'de zorunlu.
- DB'de enum sabit adı, JSON'da frontend etiketi.
- `project_info` satırı olmayan (V3 öncesi) projelerde `GET` `workspace: null`; `PUT` satırı oluşturur.
- PUT yanıtındaki `value` saklanan modelden üretilir.
- `ProjectService` Spring'den yalnızca `TransactionOperations` kullanır, `@Service` değildir; `CoreConfiguration`'da `@Bean` (R12).
- Zaman damgaları mikrosaniyeye kesilir.
- `/feature-implement` bu 4 endpoint'in ve CORS `PUT`'unun onayıdır.

**Açık soru:** Yok. Mühendislik bilgisi gerektiren nokta yok; Q1–Q5 yeterli.
