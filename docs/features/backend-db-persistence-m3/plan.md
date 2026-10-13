# Plan: backend-db-persistence-m3 (yalnızca M3 fazı: yük girdileri ve graph dokümanları, backend)

**Sonuç: READY.** Üst plan (`docs/features/backend-db-persistence/plan.md` 3.1–3.3, 5 M3, AC11–AC14, 9.2 Q1–Q5) ile M1/M2 kodu ve raporları esas alındı. Hiçbir karar yeniden açılmadı. Alan şekilleri gerçek frontend tiplerinden ve zod şemalarından çıkarıldı. Açık kalan noktaların hepsi yazılım kararı; mühendislik bilgisi gerektiren bir alan yok.

> **Üst plan metnine göre üç düzeltme (doğrulandı):**
> 1. Graph sahiplik alanı `projectRef` değil, **`projectId?: string`** (`frontend/src/features/graph/domain/types.ts:40`, `graphSchema.ts:19`). DTO bu adı aynen kullanır.
> 2. **Group id'leri frontend'de tekil değil.** `createGraphGroup` id'yi `group-${groups.length+1}` diye üretir (`graphStore.ts:112-113`). `ungroupGraph` ya da `deleteNodes` (`:108`, 2'den az node'u kalan grubu siler) sonrasında aynı id tekrar oluşabilir. Bu yüzden group id tekilliği zorlanmaz.
> 3. `activeGraphId` UI-only. `GraphDocuments = { activeGraphId, graphs }` (`graphStore.ts:13`) içinde yalnızca seçim için tutulur (`selectGraphDocument`, `:187`); `KopruqGraph`'ın parçası değil. K5 doğrulandı: DTO'da yer almaz, gönderilirse 400 döner.

---

## 1. Amaç ve kapsam dışı

**Amaç**
- Flyway `V5__project_loads_graph.sql` eklenir.
- 6 yük bölümü eklenir: seismic, wind, temperature, self-weight, traffic-lm1, wind-snapshot.
- Graph dokümanları eklenir; her graph ayrı bir upsert ile yazılır.
- `ProjectLoadInputController` 6 `PUT` sunar, `ProjectGraphController` 1 `PUT` sunar. Controller sayısı 14 → 16, endpoint envanteri 34 → 41 olur.
- `GET /api/projects/{id}` ve `POST` 201 gövdesinin sonuna `loads` ve `graphs` anahtarları eklenir (yalnızca ekleme).
- Testler, `docs/architecture.md` ve `docs/roadmap.md` güncellenir.

**Kapsam dışı**
- Frontend, M4 ve M5.
- Graph silme, graph listesini toptan yazma, satır seviyesinde CRUD.
- `windLoads.result` (Q4) ve hesaplanmış sonuçlar: `graphRunValidity`, snapshot'lar, spektrum/rüzgâr/sıcaklık sonuçları.
- `activeGraphId`, undo/redo, `graphViewPreferences`.
- Node registry kopyası; port ve node tipi doğrulaması.
- Mühendislik kuralı, aralık, varsayılan değer, birim dönüşümü.
- `pom.xml` değişmez (11 bağımlılık). CORS'ta `PUT` M1'de zaten açıldı.
- **Onay:** `/feature-implement backend-db-persistence-m3` bu 7 endpoint'in onayı sayılır.

## 2. Mevcut durum (doğrulanmış; kök `C:\Users\cemha\repos\KOPRUQ\`)

### Backend (M1 + M2)

**Model ve application**
- `backend/src/main/java/com/kopruq/bridge/model/ProjectSection.java`: sealed; 10 permits (`ProjectWorkspace` + 9 M2 bölümü).
- `bridge/application/ProjectContent.java`: 10 bileşenli record ve `ofWorkspace`. `ProjectDocument.java` `content` taşır ve `workspace()` yardımcısı vardır.
- `ProjectService.replace` sırası: `findByIdForUpdate` → `requireRevision` → `contents.replace` → yalnızca workspace için ad güncelleme → `recordChange` → `save`. M3'te değişmez.

**Infra**
- `bridge/infra/persistence/JpaProjectContentRepository.java`: `load` = `designSystem.load(projectId, loadWorkspace(projectId))`; `replace` 10 vakalı exhaustive `switch`.
- `DesignSystemContentStore.java` (package-private `@Component`, kendi transaction'ı yok): `replaceList`: sil → `flush` → `saveAll` → presence güncelle → `flush`; 1:1 bölümler: `findById` → `delete` → `flush` → değer null değilse `save` → `flush`; `load` içinde `new ProjectContent(...10 arg...)` çağrısı var (`:106`).
- `StoredSection.java` (infra enum) ve `ProjectSectionPresenceEntity` (`section_key VARCHAR(40)`). V4'te `section_key` için CHECK yok, yani yeni sabit eklemek migration gerektirmez.

**API**
- `bridge/api/ProjectDesignSystemController.java`: özel `write(...)` akışı: `reader.read` (katı okuma), `expectedRevision` ve `value` ihlallerini tek 400'de toplama, `!body.has("value")` → `value is required`, `projects.replace`, `SectionWriteResponse`.
- `DesignSystemPutRequests.SectionPut<V>`; `SectionChecks` (`text`, `id`, `optionalFinite`, `requiredFinite`, `requiredEnum`/`optionalEnum` ile `"must be one of: …"`, `list`, `unique` ile `"duplicates <list>[k].<field>"`).
- `ProjectRequestReader`: `FAIL_ON_UNKNOWN_PROPERTIES` açık, `ACCEPT_FLOAT_AS_INT` kapalı; hata yolu `value.x[0].y`.
- `ProjectDocumentResponse.java`: 10 anahtar; `families` her zaman bir nesne.
- `shared/exception/ApiExceptionHandler`: `InvalidRequestException` → 400 `INVALID_REQUEST`; diğer `IllegalArgumentException` → 400 `INVALID_INPUT`; bozuk gövde → `MALFORMED_REQUEST_BODY`; UUID olmayan yol → `INVALID_PARAMETER`.

**Diğer**
- Migration'lar V1–V4; sıradaki **V5**.
- `com.kopruq.loads.enums.ParameterProvenance` {CODE_DEFAULT, NATIONAL_ANNEX, PROJECT_OVERRIDE} zaten var. Ancak `ArchitectureRules.CORE_DEPS`/`DOMAIN_DEPS` içinde `bridge` → `{}`, yani `bridge` bu enum'u import edemez.

**Testler**
- `ArchitectureTests.java:108-111`: `restControllers_onlyInDomainApi_andExactlyFourteen`, `assertEquals(14, …)`.
- `EndpointInventoryContractTest.java:42-78`: 34 endpoint.
- `LayoutKernelCorsContractTest.java:155-166`: preflight vakaları.
- GET anahtar listesi iki yerde sabit: `ProjectApiContractTest.java:136-137` ve `ProjectDesignSystemApiContractTest.java:541-542`.
- `bridge/infra/InMemoryProjectContentRepository.java`: 10 vakalı switch; her vaka 10 argümanlı `new ProjectContent`.
- `@Import({JpaProjectRepository, JpaProjectContentRepository, DesignSystemContentStore})`: `JpaProjectContentRepositoryTest.java:25`, `JpaDesignSystemContentTest.java:52`.
- Mevcut: `DesignSystemFixtures`, `ProjectServiceIntegrationTest`.

### Frontend sözleşme kaynakları (değiştirilmez)

**`frontend/src/features/loads/model/loadsProjectModules.ts`**
- seismic `{a,g,t,i: string}`, wind `{vb,terrain,ze: string}`, temperature `{min,max,t0: string}`.
- self-weight: 16 zorunlu `number`. Adlar `SelfWeightPermanent.tsx:50-67` ile birebir aynı: `asphaltThicknessM, asphaltUnitWeightKNm3, sidewalkThicknessM, sidewalkUnitWeightKNm3, faciaCount, faciaWidthM, faciaThicknessM, faciaUnitWeightKNm3, guardrailCount, guardrailUnitLoadKNm, pedestrianRailingCount, pedestrianRailingUnitLoadKNm, protectiveFenceCount, protectiveFenceUnitLoadKNm, soundPanelCount, soundPanelUnitLoadKNm`.
- traffic LM1 zod şeması gevşek (`z.array(z.unknown())`, passthrough). Belirleyici tip `Lm1Parameters` (M2 D1 benzeri: yazma yolu tipli).
- `g`/`t`/`terrain` UI'da select olsa da zod'da `z.string()` → enum değil (M2 D2).

**LM1 tipleri (`features/loads/api/trafficLoadsService.ts:3-37`)**
- `ParameterProvenance = 'CODE_DEFAULT'|'NATIONAL_ANNEX'|'PROJECT_OVERRIDE'`.
- `ParameterValue {value: number|null, provenance, codeDefaultValue: number|null}`.
- `LaneFactor {label, characteristicValue, adjustmentFactor}`.
- `Lm1Parameters {tandemSystem: LaneFactor[], udl: LaneFactor[], remainingAreaUdl: LaneFactor}`.
- Yazma yolu `TrafficLoadsPanel.tsx:34-40` ve `Lm1Panel.tsx:38-40`. Birimler (`Lm1Panel.tsx:53-55`): tandem kN, UDL ve remaining kN/m², α birimsiz.

**Rüzgâr snapshot'ı**
- `features/loads/model/windTypes.ts:2`: `WindCalculationSnapshot = {schemaVersion: 1; status?: string; inputs:{vb,terrain,ze: string; deckWidthM, drefM: number}; result: WindResult|null}`.
- `App.tsx:71`'de `useState(null)` ile tutulur. `WindLoadsPanel.tsx:21-24` snapshot'ı üretir.

**Modül davranışı**
- Modüller hiç yazılmamışsa `undefined` döner ve fallback gösterilir (`useProjectModule.ts:29`).
- `reset()` anahtarı siler (`projectModuleStore.ts:47-52`); M2'deki modüllerle aynı semantik.

**Graph**
- `graph/domain/types.ts:10-45`: `KopruqNode{id,type,name,position{x,y},parameters: Record<string, number|boolean|string|number[]>}`, `KopruqConnection{id,sourceNodeId,sourcePortId,targetNodeId,targetPortId}`, `GraphGroup{id,name,nodeIds[],color}`, `KopruqGraph{id,name,schemaVersion:1,projectId?,bridgeId?,nodes,connections,groups?}`.
- `graph/state/graphSchema.ts`: tüm alanlar zorunlu string/number; `projectId`, `bridgeId`, `groups` opsiyonel; `schemaVersion: z.literal(1)`; `parameters: z.record(z.string(), z.unknown())`; passthrough.
- `graph/state/graphStore.ts`: `createEmptyGraph` `groups: []` üretir (`:21-23`); yeni graph'lar listenin sonuna eklenir (`:186`, `:198`), yani graph sırası oluşturulma sırasıdır; node id'leri `randomUUID` (`:101`; paste'te yeni id'ler, `graphClipboard.ts:20`); `addConnection` aynı id'yi reddeder (`:120`); `deleteNodes` bağlantıları ve group üyeliklerini temizler (`:108`); `createGraphGroup` var olmayan node'u reddeder (`:111`).

## 3. Önerilen tasarım

### 3.1 Temel kararlar

- **E1 – Yük bölümleri M2 D5 ile aynı semantikte.** 6 yük bölümünün hepsi `"value": null` kabul eder: bölümü temizler, revizyon +1 olur. Gerekçe: frontend modül reset'i anahtarı siler; `windLoads` New Project'te `null` olur. `value` anahtarı hiç yoksa 400 `value is required` (M2 deviation 3).
- **E2 – 1:1 yük tabloları.** seismic, wind, temperature, self-weight ve wind-snapshot `project_id` PK'li 1:1 tablolardır (cross_section deseni): satır yoksa `null`. LM1 için satır tablosu kullanılır ve "yazıldı" bilgisi `project_section_presence`'ta tutulur (yeni sabit `StoredSection.TRAFFIC_LM1`). Yazılmış bir LM1'de her zaman tam olarak 1 `REMAINING_AREA_UDL` satırı vardır.
- **E3 – Wind snapshot yalnızca girdileri saklar (Q4).** PUT `value` = `{schemaVersion, status, inputs}`. `result` alanı gönderilirse 400 `value.result is not a known field` (katı sözleşme K8; M4 mapper bu alanı atar). GET `windSnapshot` aynı üç anahtarı döner; `result` anahtarı yoktur. `status` opsiyonel, nullable. `schemaVersion` zorunlu ve `1` olmalı (zod literal), aksi halde 400 `must be 1`.
- **E4 – Enum'lar.** `bridge.enums.ParameterProvenance {CODE_DEFAULT, NATIONAL_ANNEX, PROJECT_OVERRIDE}` frontend TS union'ıyla birebir. `loads` paketindeki aynı adlı enum import edilmez (domain kenarı `{}` kalır). `bridge.enums.GraphParameterKind {NUMBER, BOOLEAN, STRING, NUMBER_ARRAY}`: frontend'de böyle bir enum yok; bu, `GraphParameterValue = number|boolean|string|number[]` birliğinin backend'deki ayırıcısıdır. JSON ve DB'de sabit adıyla taşınır (M2 kuralı). Eşleme M4 mapper'ında `typeof` / `Array.isArray` ile yapılır. Diğer string alanlar (seismic `g`/`t`, wind `terrain`, `status`, node `type`, port id'leri, `color`) `VARCHAR` kalır.
- **E5 – Tekillik yalnızca frontend'in garanti ettiği yerde** (M2 D3):

  | Ne | Kural | Gerekçe |
  |---|---|---|
  | graph id | path anahtarı; `UNIQUE(project_id, graph_id)` | — |
  | node id (graph içinde) | boş olamaz, tekil | UUID üretimi; bağlantılar node'a id ile bağlanır |
  | connection id (graph içinde) | boş olamaz, tekil | `addConnection` tekrarı reddediyor |
  | parameter key (node içinde) | tekil, null olamaz | Record anahtarı; boş string'e izin var |
  | group id | **zorlanmaz** (null olamaz) | Başlıktaki düzeltme 2 |
  | `bridgeId` | graph'lar arasında zorlanmaz | — |
  | `nodeIds` (group içinde) | tekil olması zorlanmaz | — |
  | LM1 `label` | zorlanmaz | — |

- **E6 – Graph referans kuralları (yalnızca yapısal; AC9).** `connections[i].sourceNodeId` ve `targetNodeId` aynı gövdedeki bir `nodes[].id` olmalı. `groups[i].nodeIds[j]` var olan bir node id olmalı. Port id'leri ve node tipi kontrol edilmez (registry kopyalanmaz).
- **E7 – Graph upsert ve sıralama.** `PUT …/graphs/{graphId}`: graph varsa içeriği tamamen değişir ve **sırası (`ordinal`) korunur**. Yoksa `ordinal = max(ordinal) + 1` ile sona eklenir. GET `graphs` `ordinal` artan sırayla döner (frontend'in ekleme sırasını aynalar). Path ile gövdedeki `value.id` farklıysa 400 (`value.id` "must equal the graphId in the path"). `value: null` → 400 (silme yok).
- **E8 – `graphs` GET'te her zaman bir dizidir, `null` olmaz.** Hiç graph yazılmamışsa `[]`. Gerekçe: M2'deki `null`/`[]` ayrımı "boş liste yazıldı" ile "hiç yazılmadı"yı ayırır. Graph'larda liste seviyesinde yazma yoktur (yalnızca tek doküman upsert edilir); "boş liste yazıldı" durumu oluşamaz, bu yüzden `null` hiçbir bilgi taşımaz. `graphs`, `families` nesnesi gibi her zaman var olan bir kapsayıcıdır. Frontend boş listeye zaten `createEmptyGraph` fallback'iyle tepki verir (`graphStore.ts:34,38`). `loads` her zaman bir nesnedir; 6 üyesi hiç yazılmamışsa `null`.
- **E9 – Graph içinde `null` ile `[]` farkı.** `groups` opsiyonel (`groups?`): `null` (alan yok) ile `[]` ayrı tutulur; bunun için `has_groups` bayrağı kullanılır. `projectId` ve `bridgeId` nullable. `nodes`, `connections`, `parameters` ve NUMBER_ARRAY değeri zorunludur, `[]` olabilir.
- **E10 – Parametre değerleri.** Wire şekli `parameters: [{key, kind, value}]` (üst plan 3.3), sıra korunur. `kind` ile JSON tipi uyuşmalı: NUMBER → sonlu JSON sayı; BOOLEAN → JSON boolean; STRING → JSON string; NUMBER_ARRAY → elemanları sonlu sayı olan JSON dizi (`[]` serbest). `value: null` → 400 (TS tipi null içermiyor). String içindeki sayı yorumlanmaz.
- **E11 – Birimler (Q2).** Self-weight kolon adlarında birim, frontend alan adından alınır (`_m`, `_kn_m3`, `_kn_m`; sayaçlar birimsiz). LM1'de birim satır grubuna göre değişir; bu yüzden kolon adında yer almaz, yalnızca SQL yorumunda belgelenir (kaynak `Lm1Panel.tsx`). String girdilerin birimi yoktur (Q3). Dönüşüm yapılmaz.
- **E12 – Opsiyonel alanlar (M2 D6).** Gönderilmeyen ile `null` gönderilen ayırt edilmez; yanıtta açık `null` döner.
- **E13 – Ortak yazma akışı.** `ProjectDesignSystemController.write` içindeki akış, package-private `SectionPutFlow` (static `write(ProjectService, ProjectRequestReader, UUID, JsonNode, Class, toModel, toDto)`) sınıfına davranışı değiştirmeden taşınır; üç controller onu kullanır. M2 davranışını `ProjectDesignSystemApiContractTest` (89 vaka) korur.

### 3.2 Veri akışı
```
ProjectLoadInputController / ProjectGraphController (bridge.api)
  └─ SectionPutFlow.write: ProjectRequestReader.read (strict) → LoadInputMapper / GraphDocumentMapper
        → ProjectService.replace (değişmez)
             └─ JpaProjectContentRepository.replace (switch +7 vaka)
                   ├─ LoadInputContentStore (6 yük bölümü)
                   └─ GraphContentStore (GraphDocument upsert)
GET: ProjectService.document → JpaProjectContentRepository.load
       = designSystem.load(...).withLoadsAndGraphs(loadInputs.load(id), graphs.load(id))
```

### 3.3 Model (`com.kopruq.bridge.model` ve `bridge.enums`; yalnızca `java.*`)

**Enum'lar:** `ParameterProvenance`, `GraphParameterKind` (her ikisinde `static Optional<E> fromValue(String)`).

**Yükler**
- `SeismicInputs(String a, String g, String t, String i)`: hepsi null olamaz.
- `WindInputs(String vb, String terrain, String ze)`.
- `TemperatureInputs(String min, String max, String t0)`.
- `SelfWeightInputs(double × 16, frontend adlarıyla)`: hepsi `SectionInvariants.finite`.
- `Lm1ParameterValue(Double value, ParameterProvenance provenance, Double codeDefaultValue)`: `provenance` null olamaz; sayılar `finiteOrNull`.
- `Lm1LaneFactor(String label, Lm1ParameterValue characteristicValue, Lm1ParameterValue adjustmentFactor)`: üçü de null olamaz.
- `TrafficLm1Inputs(List<Lm1LaneFactor> tandemSystem, List<Lm1LaneFactor> udl, Lm1LaneFactor remainingAreaUdl)`: listeler `copyNonNull`, `remainingAreaUdl` null olamaz.
- `WindSnapshotInputs(String vb, String terrain, String ze, double deckWidthM, double drefM)`.
- `WindSnapshot(int schemaVersion, String status, WindSnapshotInputs inputs)`: `schemaVersion == 1`, `status` nullable, `inputs` null olamaz.
- Bölüm sarmalayıcıları (`implements ProjectSection`; içerik null ise "temizle"): `SeismicInputsSection(SeismicInputs inputs)`, `WindInputsSection(WindInputs)`, `TemperatureInputsSection(TemperatureInputs)`, `SelfWeightInputsSection(SelfWeightInputs)`, `TrafficLm1Section(TrafficLm1Inputs)`, `WindSnapshotSection(WindSnapshot)`.

**Graph**
- `sealed interface GraphParameterValue permits GraphNumberValue(double), GraphBooleanValue(boolean), GraphStringValue(String), GraphNumberListValue(List<Double>)`, ve `GraphParameterKind kind()`.
- `GraphNodeParameter(String key, GraphParameterValue value)`.
- `GraphNode(String id, String type, String name, double positionX, double positionY, List<GraphNodeParameter> parameters)`: id boş olamaz; parameter key'leri tekil.
- `GraphConnection(String id, String sourceNodeId, String sourcePortId, String targetNodeId, String targetPortId)`.
- `GraphGroup(String id, String name, List<String> nodeIds, String color)`.
- `GraphDocument(String id, String name, int schemaVersion, String projectId, String bridgeId, List<GraphNode> nodes, List<GraphConnection> connections, List<GraphGroup> groups) implements ProjectSection`. Invariant'lar: id boş olamaz; `schemaVersion == 1`; node id'leri tekil, boş olamaz; connection id'leri tekil, boş olamaz; E6 referans kuralları; `groups` null olabilir (`copyNonNullOrNull`).
- `ProjectSection` permits listesine 7 tip eklenir: 6 `*Section` + `GraphDocument`.
- `SectionInvariants`'a gerekirse `requireReferences` eklenir.

### 3.4 Application
- Yeni `bridge/application/ProjectLoadInputs(SeismicInputs seismic, WindInputs wind, TemperatureInputs temperature, SelfWeightInputs selfWeight, TrafficLm1Inputs trafficLm1, WindSnapshot windSnapshot)`: hepsi nullable; `static NONE`; `with<Üye>` metotları.
- `ProjectContent` değişiklikleri: kanonik constructor'a `ProjectLoadInputs loads` ve `List<GraphDocument> graphs` eklenir (compact constructor: `loads` null ise `NONE`, `graphs` null ise `List.of()`, değilse `List.copyOf`). **Mevcut 10 argümanlı imzayı koruyan ek constructor** (`NONE`, `List.of()`); `ofWorkspace` ve `DesignSystemContentStore.load` derlenmeye devam eder. `withLoadsAndGraphs(ProjectLoadInputs, List<GraphDocument>)`.
- `ProjectDocument` ve `ProjectService` değişmez. `ProjectContentRepository` yalnızca javadoc güncellemesi alır.

### 3.5 Infra (`bridge.infra.persistence`; entity'ler package-private)

**Yükler**
- 1:1 entity'ler (`@Id project_id`, `from`/`toDomain`): `SeismicInputEntity`, `WindInputEntity`, `TemperatureInputEntity`, `SelfWeightInputEntity`, `WindSnapshotEntity`; her birinin Spring Data repository'si.
- `TrafficLm1FactorEntity` (surrogate UUID): infra enum `Lm1FactorGroup {TANDEM_SYSTEM, UDL, REMAINING_AREA_UDL}` (yalnızca depolama ayırıcısı), `factor_index`; repository: `findByProjectIdOrderByFactorGroupAscFactorIndexAsc` ya da gruplama `toDomain` içinde; `deleteByProjectId`.
- `StoredSection` + `TRAFFIC_LM1`. `ProjectSectionPresenceJpaRepository` javadoc'u "used by DesignSystemContentStore and LoadInputContentStore" olur.
- `LoadInputContentStore` (`@Component`, transaction'sız): 1:1 bölümler: `findById` → `delete` → `flush` → null değilse `save` → `flush`. LM1: `deleteByProjectId` → `flush` → `saveAll` (tandem i, udl i, remaining 0) → presence upsert ya da sil → `flush`. `load(UUID)` → `ProjectLoadInputs`. LM1 presence satırı var ama `REMAINING_AREA_UDL` satırı yoksa `IllegalStateException` (bozuk veri).

**Graph**
- `GraphDocumentEntity`: surrogate UUID; `projectId`, `ordinal`, `graphId`, `name`, `schemaVersion`, `ownerProjectId`, `ownerBridgeId`, `hasGroups`. `@OneToMany(cascade = ALL, orphanRemoval = true, fetch = LAZY) @JoinColumn(graph_document_id) @OrderColumn(node_index)` → `GraphNodeEntity`. `@ElementCollection(LAZY) @OrderColumn(connection_index)` → `GraphConnectionEmbeddable`. `@OneToMany(...) @OrderColumn(group_index)` → `GraphGroupEntity`.
- `GraphNodeEntity` → `@OneToMany @OrderColumn(parameter_index)` → `GraphNodeParameterEntity` (`valueKind` STRING, `numberValue`, `booleanValue`, `stringValue`; `@ElementCollection(LAZY) @OrderColumn(item_index) List<Double> items`).
- `GraphGroupEntity` → `@ElementCollection @OrderColumn(node_index) List<String> nodeIds`.
- Eşleme stili implementer'a kalır. Bağlayıcı olan: tablo ve kolonlar 3.8'deki gibi olmalı (`ddl-auto=validate`); her şey LAZY; `toDomain` transaction içinde çağrılır.
- `GraphDocumentJpaRepository`: `findByProjectIdOrderByOrdinalAsc`, `findByProjectIdAndGraphId`, `@Query("select coalesce(max(g.ordinal), -1) …") maxOrdinal(projectId)`.
- `GraphContentStore` (`@Component`): `replace(UUID, GraphDocument)`: mevcut kaydı bul → ordinal'i koru ya da `max+1` → mevcutsa `delete` (cascade) → `flush` → yeni entity `save` → `flush`. `load(UUID)` → `List<GraphDocument>`.
- `JpaProjectContentRepository`: constructor `LoadInputContentStore` ve `GraphContentStore` alır; `load` = `designSystem.load(...).withLoadsAndGraphs(loadInputs.load(id), graphs.load(id))`; switch'e 7 vaka eklenir (17 vaka).

### 3.6 API (`bridge.api`)
- `SectionPutFlow` (package-private final, static). `ProjectDesignSystemController` buna geçer.
- `ProjectLoadInputController`: `@RestController @RequestMapping("/api/projects/{projectId}/loads")`; `@PutMapping` `/seismic`, `/wind`, `/temperature`, `/self-weight`, `/traffic-lm1`, `/wind-snapshot`; hepsi `SectionWriteResponse<…Dto>` döner.
- `ProjectGraphController`: `@RequestMapping("/api/projects/{projectId}/graphs")`, `@PutMapping("/{graphId}")` (`@PathVariable String graphId`) → `SectionWriteResponse<GraphDto>`.
- İstek record'ları: `LoadInputPutRequests`: `SeismicPut`, `WindPut`, `TemperaturePut`, `SelfWeightPut`, `TrafficLm1Put`, `WindSnapshotPut`; hepsi `DesignSystemPutRequests.SectionPut<V>` uygular. `GraphPutRequest(Long expectedRevision, GraphDto value)`.
- DTO'lar: `LoadInputDtos` (iç içe record'lar; sayılar kutulu tip, enum'lar `String`): `SeismicInputsDto(a,g,t,i)`, `WindInputsDto(vb,terrain,ze)`, `TemperatureInputsDto(min,max,t0)`, `SelfWeightInputsDto(16 Double)`, `Lm1ParameterValueDto(Double value, String provenance, Double codeDefaultValue)`, `Lm1LaneFactorDto`, `TrafficLm1Dto`, `WindSnapshotInputsDto`, `WindSnapshotDto(Integer schemaVersion, String status, WindSnapshotInputsDto inputs)`. `LoadsDto(seismic, wind, temperature, selfWeight, trafficLm1, windSnapshot)`. `GraphDtos`: `GraphDto(String id, String name, Integer schemaVersion, String projectId, String bridgeId, List<GraphNodeDto> nodes, List<GraphConnectionDto> connections, List<GraphGroupDto> groups)`, `GraphNodeDto(id, type, name, GraphPositionDto position, List<GraphParameterDto> parameters)`, `GraphPositionDto(Double x, Double y)`, `GraphParameterDto(String key, String kind, JsonNode value)`, `GraphConnectionDto`, `GraphGroupDto`.
- Mapper'lar (final, static, package-private; `SectionChecks` kullanır; önek `value`): `LoadInputMapper`; `GraphDocumentMapper.toModel(GraphDto, String path, String graphId)` ve `toDto`. JSON `null` değerli `JsonNode` alanı `NullNode` olarak gelebilir; `value == null || value.isNull()` → "is required".
- `ProjectDocumentResponse`: `crossSection`'dan sonra `LoadsDto loads` (her zaman nesne) ve `List<GraphDto> graphs` (her zaman dizi) eklenir.

### 3.7 JSON şekilleri

Ortak zarf ve hata kodları M2 ile aynıdır: istek `{"expectedRevision": n, "value": V}`, yanıt `{"projectId","revision","updatedAt","value"}`. Aşağıdaki değerler test verisidir, varsayılan değildir.

`PUT …/loads/seismic` (`value` null olabilir):
```json
{"a":"0.4","g":"B","t":"Type 1","i":"1"}
```
`/loads/wind`:
```json
{"vb":"27","terrain":"II","ze":"10"}
```
`/loads/temperature`:
```json
{"min":"-17","max":"34","t0":"10"}
```
`/loads/self-weight`:
```json
{"asphaltThicknessM":0.1,"asphaltUnitWeightKNm3":24.0,"sidewalkThicknessM":0.25,"sidewalkUnitWeightKNm3":25.0,
 "faciaCount":2.0,"faciaWidthM":0.7,"faciaThicknessM":0.08,"faciaUnitWeightKNm3":25.0,"guardrailCount":2.0,
 "guardrailUnitLoadKNm":2.0,"pedestrianRailingCount":2.0,"pedestrianRailingUnitLoadKNm":1.5,
 "protectiveFenceCount":2.0,"protectiveFenceUnitLoadKNm":1.0,"soundPanelCount":1.0,"soundPanelUnitLoadKNm":1.0}
```
`/loads/traffic-lm1`:
```json
{"tandemSystem":[{"label":"Q1k","characteristicValue":{"value":300.0,"provenance":"CODE_DEFAULT","codeDefaultValue":300.0},
   "adjustmentFactor":{"value":0.9,"provenance":"PROJECT_OVERRIDE","codeDefaultValue":1.0}}],
 "udl":[],
 "remainingAreaUdl":{"label":"qrk","characteristicValue":{"value":null,"provenance":"NATIONAL_ANNEX","codeDefaultValue":null},
   "adjustmentFactor":{"value":1.0,"provenance":"CODE_DEFAULT","codeDefaultValue":1.0}}}
```
`/loads/wind-snapshot` (`result` gönderilirse 400):
```json
{"schemaVersion":1,"status":"VALID","inputs":{"vb":"27","terrain":"II","ze":"10","deckWidthM":13.8,"drefM":3.0}}
```
`PUT …/graphs/{graphId}` (`value.id` = `graphId`; `value` null olamaz):
```json
{"id":"g-1","name":"Bridge B-1","schemaVersion":1,"projectId":"P-2026","bridgeId":"b-1",
 "nodes":[{"id":"n-1","type":"input.number","name":"Number-1","position":{"x":0.30000000000000004,"y":-12.5},
   "parameters":[{"key":"value","kind":"NUMBER","value":5.0},{"key":"enabled","kind":"BOOLEAN","value":false},
     {"key":"unit","kind":"STRING","value":"m"},{"key":"list","kind":"NUMBER_ARRAY","value":[1.0,2.5]}]},
   {"id":"n-2","type":"output.watch","name":"","position":{"x":100.0,"y":0.0},"parameters":[]}],
 "connections":[{"id":"e-1","sourceNodeId":"n-1","sourcePortId":"value","targetNodeId":"n-2","targetPortId":"value"}],
 "groups":[{"id":"group-001","name":"Group 1","nodeIds":["n-1","n-2"],"color":"#5C7C99"}]}
```
`groups` için `null` (alan yok) ile `[]` ayrı tutulur; `projectId` ve `bridgeId` `null` olabilir.

**`GET /api/projects/{id}` ve `POST` 201** anahtar sırası:
```
projectId, revision, createdAt, updatedAt, workspace, bridgeDefinitions, families, girderLibrary,
preferredSpanRules, crossSection, loads, graphs
```
- `loads` = `{"seismic":…|null,"wind":…,"temperature":…,"selfWeight":…,"trafficLm1":…,"windSnapshot":…}`.
- `graphs` = `[GraphDto…]`, `ordinal` sırasıyla; boşsa `[]`.
- Yeni projede `loads` 6 üyesi de `null` olan bir nesne, `graphs` ise `[]`.
- `activeGraphId` hiçbir yerde yer almaz.

### 3.8 SQL: `V5__project_loads_graph.sql`

Başlık yorumu V3/V4 ilkesini tekrarlar: DEFAULT yok, mühendislik CHECK'i yok, string'ler `VARCHAR` olarak aynen (Q3), birim yalnızca alan adı belirtiyorsa kolon adında (Q2), `windLoads.result` saklanmaz (Q4), FK'larda CASCADE yok. Kısaltmalar: DP = `DOUBLE PRECISION`, PK, FK. Surrogate PK'li tablolara `project_id` / `graph_document_id` index'i eklenir.

```sql
CREATE TABLE load_seismic_input (project_id UUID NOT NULL, reference_pga VARCHAR NOT NULL, ground_type VARCHAR NOT NULL,
  spectrum_type VARCHAR NOT NULL, importance_factor VARCHAR NOT NULL, PK(project_id), FK(project_id)->project);   -- a,g,t,i
CREATE TABLE load_wind_input (project_id UUID NOT NULL, basic_wind_velocity VARCHAR NOT NULL, terrain_category VARCHAR NOT NULL,
  reference_height VARCHAR NOT NULL, PK, FK);                                                                     -- vb,terrain,ze
CREATE TABLE load_temperature_input (project_id UUID NOT NULL, effective_minimum VARCHAR NOT NULL,
  effective_maximum VARCHAR NOT NULL, initial_temperature VARCHAR NOT NULL, PK, FK);                              -- min,max,t0
CREATE TABLE load_self_weight_input (project_id UUID NOT NULL,
  asphalt_thickness_m DP NOT NULL, asphalt_unit_weight_kn_m3 DP NOT NULL, sidewalk_thickness_m DP NOT NULL,
  sidewalk_unit_weight_kn_m3 DP NOT NULL, facia_count DP NOT NULL, facia_width_m DP NOT NULL, facia_thickness_m DP NOT NULL,
  facia_unit_weight_kn_m3 DP NOT NULL, guardrail_count DP NOT NULL, guardrail_unit_load_kn_m DP NOT NULL,
  pedestrian_railing_count DP NOT NULL, pedestrian_railing_unit_load_kn_m DP NOT NULL, protective_fence_count DP NOT NULL,
  protective_fence_unit_load_kn_m DP NOT NULL, sound_panel_count DP NOT NULL, sound_panel_unit_load_kn_m DP NOT NULL, PK, FK);
-- LM1: characteristic in kN (TANDEM_SYSTEM) or kN/m2 (UDL, REMAINING_AREA_UDL), adjustment factor unitless (Lm1Panel.tsx)
CREATE TABLE load_traffic_lm1_factor (id UUID NOT NULL, project_id UUID NOT NULL, factor_group VARCHAR(24) NOT NULL,
  factor_index INTEGER NOT NULL, label VARCHAR NOT NULL,
  characteristic_value DP, characteristic_provenance VARCHAR(32) NOT NULL, characteristic_code_default DP,
  adjustment_value DP, adjustment_provenance VARCHAR(32) NOT NULL, adjustment_code_default DP,
  PK(id), FK(project_id), UNIQUE(project_id, factor_group, factor_index));
CREATE TABLE load_wind_snapshot (project_id UUID NOT NULL, schema_version INTEGER NOT NULL, snapshot_status VARCHAR,
  basic_wind_velocity VARCHAR NOT NULL, terrain_category VARCHAR NOT NULL, reference_height VARCHAR NOT NULL,
  deck_width_m DP NOT NULL, dref_m DP NOT NULL, PK, FK);                                                 -- inputs only, no result

CREATE TABLE graph_document (id UUID NOT NULL, project_id UUID NOT NULL, ordinal INTEGER NOT NULL, graph_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL, schema_version INTEGER NOT NULL, owner_project_id VARCHAR, owner_bridge_id VARCHAR,
  has_groups BOOLEAN NOT NULL, PK(id), FK(project_id), UNIQUE(project_id, graph_id));
CREATE TABLE graph_node (id UUID NOT NULL, graph_document_id UUID NOT NULL, node_index INTEGER NOT NULL, node_id VARCHAR NOT NULL,
  node_type VARCHAR NOT NULL, name VARCHAR NOT NULL, position_x DP NOT NULL, position_y DP NOT NULL,
  PK(id), FK->graph_document, UNIQUE(graph_document_id, node_id));
CREATE TABLE graph_node_parameter (id UUID NOT NULL, graph_node_id UUID NOT NULL, parameter_index INTEGER NOT NULL,
  parameter_key VARCHAR NOT NULL, value_kind VARCHAR(16) NOT NULL, number_value DP, boolean_value BOOLEAN, string_value VARCHAR,
  PK(id), FK->graph_node, UNIQUE(graph_node_id, parameter_key));
CREATE TABLE graph_node_parameter_item (graph_node_parameter_id UUID NOT NULL, item_index INTEGER NOT NULL, item_value DP NOT NULL,
  PK(graph_node_parameter_id, item_index), FK->graph_node_parameter);
CREATE TABLE graph_connection (graph_document_id UUID NOT NULL, connection_index INTEGER NOT NULL, connection_id VARCHAR NOT NULL,
  source_node_id VARCHAR NOT NULL, source_port_id VARCHAR NOT NULL, target_node_id VARCHAR NOT NULL, target_port_id VARCHAR NOT NULL,
  PK(graph_document_id, connection_index), FK->graph_document, UNIQUE(graph_document_id, connection_id));
CREATE TABLE graph_group (id UUID NOT NULL, graph_document_id UUID NOT NULL, group_index INTEGER NOT NULL, group_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL, color VARCHAR NOT NULL, PK(id), FK->graph_document);                          -- group_id NOT unique (E5)
CREATE TABLE graph_group_node (graph_group_id UUID NOT NULL, node_index INTEGER NOT NULL, node_id VARCHAR NOT NULL,
  PK(graph_group_id, node_index), FK->graph_group);
```
Rezerve kelimelerden kaçınıldı (`key`, `value`, `min`, `max`, `type`, `status` yerine `snapshot_status`). H2 veya PG bir adı reddederse entity ile tutarlı olarak yeniden adlandırılır (M1 `inventory_no` emsali). Node referansları istemci string'leri olduğundan DB FK'sı yoktur; kontrol uygulama katmanında yapılır (E6).

## 4. Alternatifler

| Alternatif | Karar |
|---|---|
| `graphs` için hiç graph yokken `null` | Reddedildi: liste seviyesinde yazma yok, `null` bilgi taşımaz (E8). |
| Group id tekilliğini zorlamak | Reddedildi: frontend aynı id'yi üretebiliyor; geçerli kullanıcı verisi 400 alırdı. |
| `parameters` için JSON nesnesi (`{key: value}`), kind'ı tipten çıkarmak | Üst plan 3.3 `[{key,kind,value}]` olarak kararlaştırdı; yeniden açılmadı. |
| `kind` değerleri TS yazımıyla (`"number[]"`) | Reddedildi: frontend'de enum yok; M2 kuralı (JSON = sabit adı) korunur ve `SectionChecks.requiredEnum` yeniden kullanılır. |
| `loads.enums.ParameterProvenance`'ı kullanmak | Reddedildi: `bridge` → `loads` kenarı mimari testte yasak. |
| Wind snapshot'ta `result`'ı sessizce atmak | Reddedildi: katı sözleşme (K8, M2); M4 mapper atar. |
| LM1 için JSONB veya tek satır | JSONB kullanıcı tarafından reddedilmişti; satır tablosu + presence mevcut desene uyar. |
| Graph upsert'te yerinde güncelleme (diff) | Reddedildi: sil + flush + ekle M1/M2 deseni ve UNIQUE güvenliği. |
| Yazma akışını üç controller'da kopyalamak | Reddedildi: `SectionPutFlow` tek yer; M2 testleri regresyonu yakalar. |
| `ProjectContent`'e 7 ayrı bileşen eklemek | Reddedildi: `ProjectLoadInputs` + `graphs` daha az çağrı noktasını kırar; 10 argümanlı constructor korunur. |

## 5. Sıralı görevler

Yollar `backend/src/` altındadır; Java dosyaları `main/java/com/kopruq/` altında.

1. **Migration:** `main/resources/db/migration/V5__project_loads_graph.sql` (3.8).
2. **Enum'lar:** `bridge/enums/ParameterProvenance.java`, `bridge/enums/GraphParameterKind.java`.
3. **Model (2'ye bağlı):**
   - Yeni: `bridge/model/{SeismicInputs, SeismicInputsSection, WindInputs, WindInputsSection, TemperatureInputs, TemperatureInputsSection, SelfWeightInputs, SelfWeightInputsSection, Lm1ParameterValue, Lm1LaneFactor, TrafficLm1Inputs, TrafficLm1Section, WindSnapshotInputs, WindSnapshot, WindSnapshotSection, GraphParameterValue (sealed + 4 record), GraphNodeParameter, GraphNode, GraphConnection, GraphGroup, GraphDocument}.java`.
   - Güncelle: `ProjectSection.java` (permits + javadoc); gerekirse `SectionInvariants.java`.
4. **Application (3):** yeni `bridge/application/ProjectLoadInputs.java`; `ProjectContent.java` (2 bileşen, 10 argümanlı constructor, `withLoadsAndGraphs`); `ProjectContentRepository.java` (javadoc).
5. **Infra (1, 4):**
   - Yeni: `bridge/infra/persistence/{SeismicInputEntity, WindInputEntity, TemperatureInputEntity, SelfWeightInputEntity, WindSnapshotEntity, TrafficLm1FactorEntity, Lm1FactorGroup}` ve her birinin `*JpaRepository`'si; `GraphDocumentEntity`, `GraphNodeEntity`, `GraphNodeParameterEntity`, `GraphGroupEntity`, `GraphConnectionEmbeddable`, `GraphDocumentJpaRepository`, `LoadInputContentStore`, `GraphContentStore`.
   - Güncelle: `StoredSection.java` (`TRAFFIC_LM1`), `ProjectSectionPresenceJpaRepository.java` (javadoc), `JpaProjectContentRepository.java`.
6. **API (4):**
   - Yeni: `bridge/api/{SectionPutFlow, ProjectLoadInputController, ProjectGraphController, LoadInputPutRequests, GraphPutRequest, LoadInputDtos, LoadsDto, GraphDtos, LoadInputMapper, GraphDocumentMapper}.java`.
   - Güncelle: `ProjectDesignSystemController.java` (`SectionPutFlow`'a geçer; davranış aynı), `ProjectDocumentResponse.java` (+`loads`, `graphs`).
7. **Mevcut testlerin güncellenmesi (`test/java/com/kopruq/`):**
   - `architecture/ArchitectureTests.java`: sayı 16; metot `restControllers_onlyInDomainApi_andExactlySixteen`; mesaj "the 16 controllers".
   - `contract/EndpointInventoryContractTest.java`: `// backend-db-persistence M3` altında 7 satır: `"PUT /api/projects/{projectId}/loads/seismic"`, `…/loads/wind`, `…/loads/temperature`, `…/loads/self-weight`, `…/loads/traffic-lm1`, `…/loads/wind-snapshot`, `"PUT /api/projects/{projectId}/graphs/{graphId}"`. Javadoc toplamı 41.
   - `contract/LayoutKernelCorsContractTest.java:156-166`: `{…/loads/seismic,"PUT"}`, `{…/loads/wind-snapshot,"PUT"}`, `{…/graphs/g-1,"PUT"}` eklenir.
   - `contract/ProjectApiContractTest.java:136-137` ve `contract/ProjectDesignSystemApiContractTest.java:541-542`: anahtar listesi 12 elemana çıkar (`…,"crossSection","loads","graphs"`).
   - `bridge/infra/InMemoryProjectContentRepository.java`: 17 vaka. **Mevcut 10 vaka `loads`/`graphs`'ı korumalı** (`.withLoadsAndGraphs(c.loads(), c.graphs())`). Graph upsert'i sırayı korur.
   - `JpaProjectContentRepositoryTest.java:25` ve `JpaDesignSystemContentTest.java:52`: `@Import`'a `LoadInputContentStore.class` ve `GraphContentStore.class` eklenir.
   - `bridge/application/ProjectServiceIntegrationTest.java`: +2 test (M3 yazması diğer bölümleri değiştirmez; M1/M2 yazması loads/graphs'ı değiştirmez).
8. **Yeni testler:**
   - `bridge/LoadGraphFixtures.java`: 7 bölüm için tam ve kenar durumu JSON/model fixture'ları (Unicode, `0.30000000000000004`, negatif/sıfır, `null`'lar, `[]`, 4 parametre türü, boş NUMBER_ARRAY, `groups` null ve `[]`, tekrarlı group id).
   - `bridge/model/LoadGraphSectionsTest.java`: invariant'lar.
   - `bridge/infra/persistence/JpaLoadGraphContentTest.java`: `@DataJpaTest`, `replace = NONE`, 5 sınıflı `@Import`; round-trip, presence, upsert sırası, alt tablo sayımı (`JdbcTemplate`).
   - `contract/ProjectLoadGraphApiContractTest.java`: MockMvc, `@ParameterizedTest @MethodSource`; 7 bölüm × (round-trip, 409, 400 vakaları, 404) ve graph'a özel vakalar.
9. **Dokümanlar (yalnızca ekleme; uygulama başarılı olduktan sonra):**
   - `docs/architecture.md`: "## BACKEND-DB-PERSISTENCE M3 (tarih)" bölümü. İçerik: V5 tabloları; E1–E12 (null semantiği, `loads` nesnesi, `graphs` her zaman dizi, ordinal ve upsert, `activeGraphId` UI-only, `result` saklanmaz, enum'lar, tekillik tablosu, birimler); 7 endpoint; controller sayısı 16, endpoint sayısı 41.
   - `docs/roadmap.md` (~1920. satır): `- [ ] M3 Loads, graph and the remaining project sections.` satırı, M2 satırının üslubuyla `- [x] M3 Backend loads and graph documents (tarih; plan docs/features/backend-db-persistence-m3/): Flyway V5 (…), ProjectLoadInputController (6 PUT), ProjectGraphController (PUT /graphs/{graphId} upsert), document gains loads, graphs. Controllers 16, endpoints 41. No frontend change.` ile değiştirilir. **Yalnızca AC15 sağlandığında `[x]` yapılır**; aksi halde `[ ]` kalır.
   - `bridge/package-info.java`: M3 javadoc notu.
10. **Kontrol:** önce hedefli testler, sonra zorunlu `clean package` (bkz. 7).

Tahmin: yaklaşık 60 yeni main dosyası (enum 2, model ~25, application 1, infra ~22, api ~10); 9 güncellenen main/test dosyası; 4 yeni test dosyası.

## 6. Kabul kriterleri

- **AC1 – Migration.** V5, H2'de Flyway ile uygulanır ve tüm Spring context'leri `ddl-auto=validate` ile açılır. V1–V4 byte düzeyinde değişmez. M1/M2 projeleri V5 tablolarında satır olmadan açılır.
- **AC2 – Endpoint'ler ve mimari.** Tam olarak 7 yeni `PUT` var; envanter 41 endpoint'i birebir listeler. `ArchitectureTests` 16 controller ile geçer: `bridge` kenarları `{}` (yani `com.kopruq.loads` importu yok), model/enums Spring/JPA'sız, pom'da 11 bağımlılık. `Origin: http://localhost:5173` ile yeni yollara `PUT` preflight 200 döner.
- **AC3 – Yük round-trip (6 bölüm, parametrik).** Tüm alanları açık fixture ile `PUT` 200 döner. Yanıt `value`'su ve sonraki `GET`'teki `loads.<üye>` gönderilen JSON ile derin eşittir: sayılar bit düzeyinde aynı (`0.30000000000000004`); Unicode ve boş string korunur; LM1 satır sırası ile `value: null` / `codeDefaultValue: null` korunur; `udl: []` ve `tandemSystem: []` `[]` olarak döner.
- **AC4 – Yüklerde null semantiği.** Yeni projede `GET` ve `POST` 201 gövdesinde `loads` 6 üyesi de `null` olan bir nesnedir. Her yük bölümü için `"value": null` → 200, revizyon +1, `GET` `null`. `value` anahtarı yoksa 400 `value is required`.
- **AC5 – Wind snapshot yalnızca girdileri tutar.** GET `windSnapshot` anahtarları tam olarak `schemaVersion, status, inputs`; `result` yoktur. `value.result` gönderilirse 400 (`value.result`, "is not a known field"). `status` gönderilmezse `null` döner. `schemaVersion: 2` → 400 (`value.schemaVersion`).
- **AC6 – LM1 kuralları.** `provenance` yalnızca `CODE_DEFAULT|NATIONAL_ANNEX|PROJECT_OVERRIDE`; başka değer 400 `"must be one of: CODE_DEFAULT, NATIONAL_ANNEX, PROJECT_OVERRIDE"`. `remainingAreaUdl: null`, `adjustmentFactor: null` ve `label: null` 400 döner. Tekrarlı `label` kabul edilir.
- **AC7 – Graph round-trip.** Fixture graph'ı `PUT` 200 döner; yanıt ve `GET` `graphs[k]` derin eşittir. Korunanlar: 4 `kind` (NUMBER, BOOLEAN, STRING, NUMBER_ARRAY dahil `[]`); parametre, node, connection ve group sırası; konumlar (bit düzeyinde); `projectId`/`bridgeId` dolu ve `null` hâlleri; `groups: null` ile `groups: []` ayrımı; boş node/graph adı; registry'de olmayan node tipi.
- **AC8 – Graph upsert ve sıralama.** Yeni projede `graphs` `[]` döner. A, B, C sırasıyla yazılırsa `GET` sırası A, B, C olur. B yeniden yazılırsa sıra yine A, B, C kalır, B'nin içeriği tamamen yeni gövdeyle değişir ve A ile C değişmez. B'den çıkarılan node, parametre, item, connection ve group satırları silinir (`JdbcTemplate` sayımı). Aynı node/connection id'leriyle sırası değiştirilmiş yeniden yazma UNIQUE hatası vermez. Her upsert revizyonu +1 artırır.
- **AC9 – Graph invariant'ları.** Şunlar 400 `INVALID_REQUEST` döner, beklenen alan yolunu içerir ve DB değişmez: path ile `value.id` uyuşmazlığı (`value.id`); var olmayan node'a bağlantı (`value.connections[0].sourceNodeId` / `targetNodeId`); var olmayan group node'u (`value.groups[0].nodeIds[1]`); tekrarlı ya da boş node id (`value.nodes[1].id`, "duplicates nodes[0].id"); tekrarlı ya da boş connection id; tekrarlı parametre key'i; bilinmeyen `kind`; `kind`/`value` uyuşmazlığı (örn. NUMBER + `"5"`, NUMBER_ARRAY + `[1,"a"]`); parametre `value: null`; `schemaVersion ≠ 1`; `value: null`; bilinmeyen alan: graph seviyesinde `activeGraphId`, node seviyesinde `selected`. **Kabul edilenler** (200): tekrarlı group id, graph'lar arasında aynı `bridgeId`, bilinmeyen port id'leri.
- **AC10 – 409/404/yol.** 7 endpoint'in her biri için: eski `expectedRevision` → 409 `PROJECT_REVISION_CONFLICT`; `project.revision`, `updated_utc` ve ilgili tabloların satırları değişmez; aynı revizyonla ardışık iki `PUT`'ta ilki 200, ikincisi 409; bilinmeyen proje UUID'si → 404 `PROJECT_NOT_FOUND`; UUID olmayan `projectId` → 400 `INVALID_PARAMETER`.
- **AC11 – Ortak 400 vakaları (7 bölüm, parametrik).** Hepsinde DB değişmez: eksik `expectedRevision`; bilinmeyen alan (`value.foo`); `1e999` (örn. `value.asphaltThicknessM`, `value.inputs.deckWidthM`, `value.nodes[0].position.x`); zorunlu alanın `null` olması (örn. seismic `value.a`); bozuk JSON → `MALFORMED_REQUEST_BODY`.
- **AC12 – M1/M2 uyumluluğu ve yalıtım.** GET/POST gövdesinde 12 anahtar bulunur; ilk 10'u M1/M2 sırasıyla aynıdır. Bir M3 yazması workspace'i, M2 bölümlerini, designSpace'i ve alternatives'i değiştirmez. Workspace ve M2 yazmaları `loads`/`graphs`'ı değiştirmez. `GET /api/projects` özet şekli değişmez. M1/M2 testlerinin tamamı (güncellenen anahtar listeleri ve sayaçlar dışında) değişmeden yeşil kalır; `SectionPutFlow` geçişinden sonra `ProjectDesignSystemApiContractTest` yeşildir.
- **AC13 – Mühendislik güvenliği.** Negatif/sıfır self-weight değerleri, `"abc"` gibi string yük girdileri, `"Z"` ground type ve `-1` LM1 değeri kabul edilir ve aynen saklanır. Eksik alan için varsayılan üretilmez; birim dönüşümü yapılmaz.
- **AC14 – Model invariant'ları.** Model doğrudan kurulduğunda E5/E6 ihlalleri, sonlu olmayan sayı, `schemaVersion ≠ 1` ve null liste elemanı `IllegalArgumentException` fırlatır. Tekrarlı group id ve LM1 label'ı kabul edilir.
- **AC15 – Build ve dokümanlar.** `mvn -f backend/pom.xml -B clean package` başarılı. `backend/pom.xml` ve `frontend/` değişmemiş. `docs/architecture.md` M3 bölümünü içeriyor; `docs/roadmap.md`'de M3 `[x]`.

## 7. Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Tüm Spring testleri (Flyway + `validate`), `JpaLoadGraphContentTest.projectWithNothingStored_…`; `git diff --stat -- backend/src/main/resources/db/migration` | Yeşil; yalnızca V5 yeni |
| AC2 | `ArchitectureTests`, `EndpointInventoryContractTest`, `LayoutKernelCorsContractTest`, `ProjectLoadGraphApiContractTest.corsPreflight_…` | Yeşil; 16 / 41; preflight 200 |
| AC3 | `ProjectLoadGraphApiContractTest.put_roundTripsDeepEqual(section)` (6 yük); `JpaLoadGraphContentTest` model eşitliği | 200, derin eşitlik |
| AC4 | Contract: yeni proje gövdesi; `put_null_clears…`; `missingValueKey_is400` | Beklenen `null` / 400 |
| AC5 | Contract: wind-snapshot anahtar listesi, `result` → 400, `schemaVersion` → 400 | Eşleşir |
| AC6 | Contract: LM1 enum ve null vakaları | 400 / 200 |
| AC7 | Contract graph round-trip; `JpaLoadGraphContentTest` | Derin eşitlik |
| AC8 | Contract: A/B/C sırası, B upsert; `JpaLoadGraphContentTest` alt tablo sayımı ve yer değiştirme | Sıra korunur, sayımlar doğru |
| AC9 | Parametrik `graph_invalid_is400(mutation, expectedPath)` + DB anlık görüntüsü; kabul edilen vakalar 200 | 400 + yol / 200 |
| AC10 | Parametrik `staleRevision_is409_andChangesNothing`, `sameRevisionTwice`, `unknownProject_is404`, `nonUuidPath` | 409 / 404 / 400 |
| AC11 | Parametrik `invalid_is400(section, mutation, path)` | 400, DB aynı |
| AC12 | `ProjectApiContractTest`, `ProjectDesignSystemApiContractTest`, `ProjectServiceIntegrationTest` (+2), tüm M1/M2 testleri | Yeşil |
| AC13 | Round-trip uç değer fixture'ları | 200, aynen |
| AC14 | `LoadGraphSectionsTest` | Yeşil |
| AC15 | Aşağıdaki komutlar; `git status --short -- backend/pom.xml frontend` | BUILD SUCCESS; çıktı boş |

**Komutlar (PowerShell; `mvn` PATH'te yok):**
```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$mvn = 'C:\Users\cemha\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd'
# hedefli
& $mvn -f backend/pom.xml -B clean test "-Dtest=LoadGraphSectionsTest,JpaLoadGraphContentTest,JpaDesignSystemContentTest,JpaProjectContentRepositoryTest,ProjectServiceTest,ProjectServiceIntegrationTest,ProjectApiContractTest,ProjectDesignSystemApiContractTest,ProjectLoadGraphApiContractTest,EndpointInventoryContractTest,LayoutKernelCorsContractTest,ArchitectureTests"
# zorunlu
& $mvn -f backend/pom.xml -B clean package
```
Beklenti: BUILD SUCCESS, 0 failure, 0 error. Tek skipped test önceden var olan `BentleyProductionTerrainTest`'tir. M2'de 579 test vardı; sayı artmalı.

**İsteğe bağlı PostgreSQL koşusu:** `docker compose --profile postgres-test up -d --wait postgres-test`, ardından `KOPRUQ_TEST_DB_URL=jdbc:postgresql://localhost:5433/kopruq_test` ve `.env.example`'daki kimlik bilgileriyle aynı Maven komutu.

**Bilinmeyenler:** CI yapılandırması yok. PG uyumluluğu yalnızca H2'nin PostgreSQL modunda doğrulanıyor (Docker gerekir). Frontend `npm` kontrolleri M3 için gerekmez.

## 8. Riskler
- **Hibernate flush sırası ve cascade:** silmeden sonra `flush` yapılmazsa `UNIQUE(project_id, graph_id)`, `(graph_document_id, node_id)` ve `(graph_document_id, connection_id)` ihlal edilir. AC8'deki yer değiştirme testi bunu yakalar. İç içe `@OneToMany` cascade silmesi alt satırları yükler; yavaştır ama doğrudur.
- **LAZY ve N+1:** GET tüm graph'ları node → parametre → item zinciriyle yükler. Frontend stres testi graph başına 80 node kullanıyor; tek kullanıcı için kabul edilebilir. Gerekirse `@BatchSize` (Hibernate anotasyonu yalnızca `infra.persistence` içinde serbest) eklenebilir. `toDomain` mutlaka transaction içinde çağrılmalı (`open-in-view=false`).
- **`ProjectContent` constructor'ı:** InMemory test double'ı ve `DesignSystemContentStore` 10 argümanlı constructor'ı kullanır. Workspace veya M2 yazması `loads`/`graphs`'ı sıfırlarsa (InMemory'de `withLoadsAndGraphs` unutulursa) AC12 bunu yakalar.
- **`SectionPutFlow` refactor'ı:** M2 davranışı değişmemeli; 89 vakalık M2 contract testi korur.
- **M4/M5'e etkiler (bu fazda iş değil, belgelenir):**
  - Wind snapshot yeniden yüklendiğinde `result` olmaz. M4 `fromWire` `result: null` üretirse `WindLoadsPanel` "Wind result is INVALID" gösterebilir (`WindLoadsPanel.tsx:28-29`); M4/M5'te ele alınmalı.
  - Frontend'de `Number(...)` sonucu NaN olan bir parametre JSON'da `null` olur ve 400 alır. M4 mapper ve hata yolu bunu göstermeli.
  - `lm1-defaults` yanıtına fazladan alan sızarsa (örn. `effectiveValue`; Jackson record'da get-önekli olmadığı için beklenmiyor, doğrulanmadı) katı okuma 400 verir. M4 mapper yalnızca bilinen alanları kurar (K8).
- **Ad çakışması:** `bridge.enums.ParameterProvenance` ile `loads.enums.ParameterProvenance` aynı basit ada sahip. Yanlış import `ArchitectureTests` (kenar `{}`) tarafından yakalanır.
- **Graph id'nin URL'de taşınması:** id'ler pratikte UUID. `/` içeren bir id adreslenemez; frontend böyle id üretmiyor.
- **H2/PG farkları:** rezerve kelimeler, `FOR UPDATE`, sınırsız `VARCHAR`. İsteğe bağlı `postgres-test` koşusu önerilir.
- **Güvenlik ve sınırlar:** auth yok, girdi boyutu sınırı yok (yerel tek kullanıcı). Büyük graph gövdeleri tek transaction'da yazılır.
- **Migration ve geri alma:** Flyway yalnızca ileri gider. Kod geri alınırsa V5 tabloları kalır; M2 kodu onları okumaz (`ddl-auto=validate` yalnızca entity'si olan tabloları doğrular). Veri taşıma yok.
- **Mühendislik güvenliği:** aralık, varsayılan ve birim dönüşümü yok. Birim sonekleri yalnızca frontend alan adlarından (self-weight) alınır; LM1 birimleri yalnızca SQL yorumunda, `Lm1Panel` etiketlerine dayanarak belgelenir.

## 9. Varsayımlar ve açık sorular

**Doğrulanmış:** 2. bölümdeki yollar, satır numaraları, frontend alan adları, nullability ve enum değerleri; M1/M2 desenleri; test sabitleri (14 controller, 34 endpoint, iki dosyadaki 10 anahtarlık liste); `StoredSection`'a sabit eklemek migration gerektirmiyor (`section_key` için CHECK yok); `bridge` → `loads` kenarı yasak.

**Planlayıcı kararları (yazılım; değiştirilebilir):** E1–E13; `loads` üye adları (`seismic`, `wind`, `temperature`, `selfWeight`, `trafficLm1`, `windSnapshot`); `kind` için sabit adları; `ProjectLoadInputs` read modeli; iki ayrı content store; `SectionPutFlow`; kolon adları; `schema_version` kolonlarının saklanması.

**Varsayımlar:**
- Self-weight sayaçları `DOUBLE` olarak saklanır ve tam sayı oldukları zorlanmaz (zod `number`, material `no` emsali).
- Parametre key'i boş string olabilir (yalnızca null değil ve tekil).
- Graph sırası frontend'deki ekleme sırasıdır; ilk yazma sırası M5 hidrasyonunda korunur.
- Çalışma ağacında yalnızca `docs/features/backend-db-persistence-m3/` izlenmiyor; M2 commit'li (`dad0b80`).

**Açık soru:** Yok. Tüm şekiller ve enum değerleri frontend kaynağından alındı. Hiçbir alan için mühendislik kararı (aralık, varsayılan, birim dönüşümü) gerekmiyor.

**READY**
