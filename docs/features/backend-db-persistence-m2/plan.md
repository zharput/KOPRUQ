# Plan: backend-db-persistence-m2 (yalnızca M2 fazı: backend tasarım sistemi bölümleri)

**Sonuç: READY.** Üst plan `docs/features/backend-db-persistence/plan.md` (3.1–3.3, 5 M2, 6 AC11–AC14, 9.2 Q1–Q5) esas alındı ve hiçbir karar yeniden açılmadı. M1 kodu okundu ve aynı desenle genişletiliyor. Alan şekilleri gerçek frontend tiplerinden ve zod şemalarından çıkarıldı. Kalan kararların hepsi yazılım kararı; mühendislik bilgisi gerektiren açık nokta yok.

> **Görevlendirmedeki iki noktanın düzeltmesi:**
> 1. `definitionKey`, `BridgeRow.no` değildir. Normalize edilmiş store'da (`keyBy: 'bridgeId'`) map anahtarı `bridge.id`, yani `definition.bridgeId` değeridir (`frontend/src/features/bridge-definition/model/store.ts:50-58`). `BridgeRow.no` yalnızca eski (legacy) store'larda anahtardı. Bu, üst plandaki K6 ile tutarlı.
> 2. M1 artık commit edilmiş durumda: `git status` yalnızca `docs/features/backend-db-persistence-m2/` dizinini izlenmeyen olarak gösteriyor; son commit `49f30c4 Implement backend-db-persistence M1 …`. Bu, planı değiştirmez.

---

## 1. Amaç ve kapsam dışı

**Amaç**
- Flyway `V4__project_design_system.sql` eklenir.
- Şu 9 bölüm için model, entity, adapter, DTO ve mapper yazılır: bridge definitions, 5 family kataloğu (piers, pier-caps, foundations, bearings, materials), girder library, preferred span rules, cross section.
- Yeni `ProjectDesignSystemController` 9 `PUT` endpoint'i sunar. Controller sayısı 13'ten 14'e, endpoint envanteri 25'ten 34'e çıkar.
- `GET /api/projects/{id}` ve `POST` 201 gövdesine `bridgeDefinitions`, `families`, `girderLibrary`, `preferredSpanRules`, `crossSection` alanları eklenir. Değişiklik yalnızca eklemedir; M1 alanları aynen kalır.
- Her `PUT` bölümü tek seferde (atomik) değiştirir; `expectedRevision` uyuşmazlığında 409 döner. Bunun için mevcut `ProjectService.replace` kullanılır.
- Testler güncellenir: mimari test, envanter, CORS. `docs/architecture.md` ve `docs/roadmap.md` güncellenir.

**Kapsam dışı**
- M3 (yükler, graph, `V5`), M4/M5 ve frontend'in tüm dosyaları.
- Satır seviyesinde CRUD, proje silme, auth, `.kopruq` taşıma.
- Mühendislik kuralı, aralık/limit, varsayılan değer veya birim dönüşümü. Yalnızca yapısal kontrol yapılır: alan var mı, sayı sonlu mu, enum bilinen mi, id boş mu, id tekil mi (yalnızca frontend'in tekilliği garanti ettiği yerlerde).
- UI-only durum: `selectedBridgeId`, `keyBy`, `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`. Bunlar DTO'da yoktur; gönderilirse 400 "is not a known field" döner.
- `pom.xml` değişmez (11 bağımlılık).
- **Onay:** `/feature-implement backend-db-persistence-m2` komutu bu 9 endpoint'in onayı sayılır. CORS'ta `PUT` M1'de zaten açıldı.

## 2. Mevcut durum (doğrulanmış; yollar `C:\Users\cemha\repos\KOPRUQ\` altında)

**Backend (M1)**
- `backend/src/main/java/com/kopruq/bridge/model/ProjectSection.java`: `public sealed interface ProjectSection permits ProjectWorkspace {}`. Javadoc "later milestones add their sections" der.
- `bridge/application/ProjectService.java`: `replace(UUID, long, ProjectSection)` tek transaction içinde şu sırayla çalışır: `findByIdForUpdate` → `requireRevision` → `contents.replace` → yalnızca `ProjectWorkspace` için ad güncelleme → `recordChange` → `save` → `ProjectRevision`. `document()` `new ProjectDocument(..., content.workspace())` döndürür; `create()` `new ProjectDocument(..., workspace)` döndürür.
- `bridge/application/ProjectContent.java`: `record ProjectContent(ProjectWorkspace workspace)`.
- `ProjectDocument.java`: `(projectId, revision, createdUtc, updatedUtc, ProjectWorkspace workspace)`.
- `ProjectContentRepository.java`: `load(UUID)`, `replace(UUID, ProjectSection)`.
- `bridge/infra/persistence/JpaProjectContentRepository.java`:
  - `@Repository @Transactional`.
  - `load`, `project_info` satırı yoksa hemen `new ProjectContent(null)` döndürür. M2'de bu davranış değişmeli.
  - `replace` sealed `switch (section) { case ProjectWorkspace … }` kullanır.
  - Silme deseni: `deleteByProjectId` → `flush()` → `saveAll` → `flush()`. Yorum: "Hibernate runs INSERTs before DELETEs".
- `ProjectBridgeRowEntity.java`: surrogate `@GeneratedValue(UUID)`, `ordinal`, `@ElementCollection(fetch = EAGER) @OrderColumn` listeleri, enum'lar `EnumType.STRING`, null listeyi `[]`'dan ayırmak için `hasGirderDepths` bayrağı. Kolon adı `inventory_no`, yani rezerve kelimeden kaçınılmış.
- `*Embeddable` deseni mevcut: `GirderEmbeddable.java` (`from`/`toDomain`).
- `bridge/api/ProjectController.java`:
  - Gövde `@RequestBody JsonNode`, ardından `ProjectRequestReader.read`.
  - `expectedRevision` ihlali ve `value` ihlalleri tek 400'de toplanır.
  - Yanıt `value` alanı `toDto(model)` ile üretilir.
- `ProjectRequestReader.java`: `FAIL_ON_UNKNOWN_PROPERTIES` açık, `ACCEPT_FLOAT_AS_INT` kapalı, hata yolu `value.bridges[0].foo` biçiminde. `Class<T>` alır.
- `ProjectWorkspaceMapper.java`:
  - Enum'lar DTO'da `String` tutulur; mapper `fromLabel` ile çevirir; hata metni `"must be one of: …"`.
  - `FieldChecks.requireFinite/requireNonNull/throwIfAny` kullanılır.
  - Tekrarlı id mesajı: `"duplicates bridges[i].id"`.
- `ProjectDocumentResponse.java`: `(projectId, revision, createdAt, updatedAt, WorkspaceDto workspace)`; `workspace` null olabilir ve anahtar her zaman gövdede bulunur.
- `backend/src/main/resources/application.properties:24-25`: `open-in-view=false`, `ddl-auto=validate`.
- Migration'lar V1–V3; sıradaki numara **V4**. V3 başlık ilkesi: DEFAULT yok, mühendislik CHECK'i yok, birim kolon adında.
- `bridge/enums` içinde `FoundationType` zaten var. Yeni enum'larda isim çakışmasına dikkat edilmeli.

**Testler (M1)**
- `ArchitectureTests.java:108-111`: `restControllers_onlyInDomainApi_andExactlyThirteen` → `assertEquals(13, …)`.
- `EndpointInventoryContractTest.java:41-67`: 25 endpoint.
- `LayoutKernelCorsContractTest.java`:
  - `:125` `"GET,POST,PUT,HEAD"`.
  - `:155-164` `corsPreflight_coversEveryControllerFamily`; `/api/projects` vakalarını içerir.
- `ProjectApiContractTest.java:136-137`: GET anahtar listesini birebir sabitler: `List.of("projectId","revision","createdAt","updatedAt","workspace")`. M2'de güncellenmeli.
- `bridge/infra/InMemoryProjectContentRepository.java`: exhaustive `switch`. Yeni permits olmadan derlenmez.
- `JpaProjectContentRepositoryTest.java`: `@DataJpaTest`, `replace = NONE`, `@Import({JpaProjectRepository.class, JpaProjectContentRepository.class})`.
- `bridge/WorkspaceFixtures.java`.
- `ProjectServiceTest.java:78,112,126-145,165`: `document(...).workspace()` çağrılarını kullanır.

**Frontend sözleşme kaynakları (değiştirilmez)**

*Bridge definition*
- `frontend/src/features/bridge-definition/model/types.ts`: `BridgeInstanceDefinition`, `BridgeAxis`, `AxisFamilyAssignments`, `BridgeConstraint`. Enum'lar `BridgeAxisType = 'ABUTMENT'|'PIER'` ve `ConstraintKind = 'ROAD_RAILWAY'|'RIVER'|'CLEARANCE'|'UTILITY'|'ENVIRONMENT'|'OTHER'`.
- `.../bridge-definition/model/schema.ts`: tanım şeması `.partial().passthrough()` (eski dosyaları içe aktarmak için).
- `.../bridge-definition/model/store.ts:33-58`:
  - `mergeDefinition` ve `ensureBridgeDefinitions` her zaman tam bir `BridgeInstanceDefinition` üretir.
  - `App.tsx:56,66` yalnızca normalize edilmiş store'u kalıcı yazar.
  - `axisAssignments` bir `Record<axisId, …>`.

*Family'ler*
- `frontend/src/features/family-registry/model/familySchemas.ts`:
  - `Loose<T> = Partial<T> & {id}`: `id` hariç tüm alanlar opsiyonel; `passthrough`.
  - `rule = {min,max,delta: number|null}`; `dimension = {key,label,min,max,delta}` (hepsi zorunlu).
  - `pierType` enum'u: `RECTANGULAR|CIRCULAR|OVAL|BOX|H_SECTION|H_TYPE|WALL` (eski değerler dahil).
  - `allowedConfigurations: z.array(z.string())` (enum değil).
  - `capType: RECTANGULAR|T_CAP`, `compatiblePierConfiguration: SINGLE_COLUMN|TWO_COLUMNS`, `foundationType: SHALLOW|PILED`, `bearingType: ELASTOMERIC`.
  - Material: `{id, no:number, element, concreteClass}` (name/enabled/source yok).
  - Kategori içinde id tekil (`parseFamilyRecords`).
- Tipler:
  - `pier-families/model/types.ts`: `heightApplicability` 4 nullable sayı; `twoColumnSpacing: Dimension|null`.
  - `pier-cap-families/model/types.ts`: `stemWidth: Rule|null`.
  - `foundation-families/model/types.ts`: `shallowGeneration|null`, `piledGeneration|null`; içlerindeki kurallar zorunlu.
  - `bearing-families/model/types.ts`.
  - `materials/components/MaterialsPanel.tsx:20-25`.
- Birimler (UI etiketlerinden doğrulandı):
  - Pier-cap kuralları m (`PierCapFamiliesPanel.tsx:33`).
  - Foundation m; pile count birimsiz (`FoundationFamiliesPanel.tsx:29,78`).
  - Bearing mm (`BearingFamiliesPanel.tsx:22`, `familyRepository.ts:101-105`).
  - Pier yükseklik uygulanabilirliği m (`PierFamiliesPanel.tsx:51,61`).
  - Dimension birimi yalnızca `label` içinde (`'H (cm)'`, `'(m)'`).
- Null ile `[]` farkı family'lerde anlamlı: `PierFamiliesPanel.tsx:14-19`'da kayıt yoksa `INITIAL` gösterilir, `[]` boş katalog demektir; `useFamilyCatalog.ts:15` de buna dayanır.

*Girder library*
- `family-registry/model/girderLibraryProjectModule.ts`: şema `z.union([z.array(z.unknown()), z.object({}).passthrough()])`; reset `[]` yazar.
- Okuyucular: `GirderLibraryPanel.tsx:61-66`, `registry.ts:30-31`, `PreferredSpanPanel.tsx:27-35`. `saved?.enabled ?? false` ve `saved?.dimensions ?? PRECAST_DIMENSIONS` kullanırlar. Dolayısıyla `null`, `[]` ve alan yokluğu aynı fallback'e düşer.

*Preferred span*
- `preferred-span/model/preferredSpanRulesProjectModule.ts`: dizi; her alan zorunlu; `superstructureType: z.string()`, `source: z.string()`; id tekilliği şemada yok.
- `PreferredSpanPanel.tsx:39`: id `girder-span-${variant.id}` biçiminde, tipten bağımsız.
- Birim m (`:94,98`).

*Cross section*
- `superstructure-families/model/crossSectionProjectModule.ts`: 5 zorunlu sayı içeren nesne. Reset anahtarı siler; okuma `undefined` döner ve `INITIAL_CROSS_SECTION_VALUES` fallback'i kullanılır.

## 3. Önerilen tasarım

### 3.1 Temel kararlar
- **D1 – Nullability kaynağı.**
  - Family'ler, girder library, preferred span ve cross section için zod şeması belirleyicidir. `Loose`/opsiyonel alanlar nullable olur; zorunlu alanlar NOT NULL olur.
  - Bridge definitions için normalize edilmiş TS tipi `BridgeInstanceDefinition` belirleyicidir. Gerekçe: yazma yolu her zaman `ensureBridgeDefinitions` üzerinden geçer; `.partial()` yalnızca eski dosya içe aktarımı içindir ve o iş kapsam dışı.
- **D2 – Enum'lar.** Yalnızca zod `z.enum` olan alanlar Java enum'u olur ve değerleri birebir aynıdır. `z.string()` olan alanlar `VARCHAR` kalır: `allowedConfigurations[]`, preferred `superstructureType`, `source`, bridge-def `superstructureType`. Bilinmeyen enum değeri 400 döner. DB'de enum sabit adıyla saklanır; JSON'daki değer de aynı sabit adıdır.
- **D3 – Tekillik** yalnızca frontend'in garanti ettiği yerde zorlanır:
  - Family id'leri (kategori içinde).
  - `definitionKey` (map anahtarı).
  - Tanım içindeki `axisAssignments[].axisId` (map anahtarı).
  - Axis/constraint id'leri ve preferred span `id` için zorlanmaz; zod'da yok ve preferred id çakışması mümkün.
  - Boş (blank) olamayanlar: family id'leri, `definitionKey`, `axisId`.
- **D4 – Hiç yazılmamış bölüm GET'te `null`, anahtar her zaman mevcut.** M1'deki `workspace: null` ile tutarlı. `families` nesnesi her zaman vardır; içindeki 5 üye ayrı ayrı `null` olabilir.
  - Liste bölümlerinde `null` ile `[]` farkı korunur. Bunun için `project_section_presence` tablosu kullanılır: bölüm yazıldıysa satırı vardır.
  - `girder_library` ve `cross_section` 1:1 satırdır; satır yoksa değer `null`.
  - M1 sözleşmesi bozulmaz: alanlar yalnızca eklenir ve M1 alanlarından sonra sıralanır. Yalnızca M1 testindeki tam anahtar listesi güncellenir.
- **D5 – `null` gönderilebilen bölümler** (frontend reset semantiği): `girder-library`, `preferred-span-rules`, `cross-section`. `value: null` gönderilirse bölüm temizlenir ve revizyon artar. Family'ler ve `bridge-definitions` için `value` zorunludur (`null` → 400). Girder library'de `[]` ↔ `null` dönüşümü M4 mapper'ının işidir; backend `value` olarak dizi alırsa 400 döner.
- **D6 – Opsiyonel alanların normalizasyonu.** Jackson record'larda alanın hiç gelmemesi ile `null` gelmesi ayırt edilemez. İkisi de `null` olarak saklanır ve yanıtta açık `null` döner. Tüm değerleri açık olan istekler birebir round-trip yapar.
- **D7 – Kural nesnesi** (`{min,max,delta}`) entity'de `*_present` bayrağı ve 3 nullable kolonla tutulur. Böylece "kural var ama içi tamamen null" durumu, "kural yok (null)" durumundan ayrılır. Hibernate, tüm kolonları null olan embeddable'ı null döndürdüğü için bu bayrak zorunlu.
- **D8 – Birimler (Q2).** Birim, ancak frontend alan adında veya UI etiketinde doğrulanmışsa kolon adına eklenir: `_m`, `_mm`, `skew_degrees`. Dimension satırlarında birim yalnızca `label` içinde kalır ve kolonlar `min_value/max_value/delta_value` olur. Dönüşüm yapılmaz.
- **D9 – Revizyon.** Her başarılı M2 `PUT`'u revizyonu 1 artırır; `null` yazma ve içerik değişmeyen yazma da buna dahildir. `ProjectService.replace` değişmez; yalnızca workspace ad güncellemesi M1'deki gibi kalır.

### 3.2 Veri akışı
```
ProjectDesignSystemController (bridge.api)
  ├─ ProjectRequestReader.read(body, <Section>Put.class)   (strict)
  ├─ BridgeDefinitionsMapper / FamilyCatalogMapper / DesignModuleMapper  (DTO ↔ model, alan yollu ihlaller)
  └─ ProjectService.replace(projectId, expectedRevision, ProjectSection)
        └─ ProjectContentRepository.replace ──► JpaProjectContentRepository
                                                   └─ switch: ProjectWorkspace (M1) | M2 bölümleri → DesignSystemContentStore
GET: ProjectService.document → contents.load (tüm bölümler) → ProjectDocumentResponse
```
`bridge` domain kenarları `{}` kalır. Yeni domain paketi yok.

### 3.3 Model (`com.kopruq.bridge.model` ve `bridge.enums`; Spring/JPA/application/api importu yok)

**Enum'lar (`bridge/enums`)**
- `BridgeAxisType{ABUTMENT,PIER}`
- `ConstraintKind{ROAD_RAILWAY,RIVER,CLEARANCE,UTILITY,ENVIRONMENT,OTHER}`
- `PierFamilyType{RECTANGULAR,CIRCULAR,OVAL,BOX,H_SECTION,H_TYPE,WALL}`
- `PierCapType{RECTANGULAR,T_CAP}`
- `PierCapConfiguration{SINGLE_COLUMN,TWO_COLUMNS}`
- `FoundationFamilyType{SHALLOW,PILED}` (mevcut `FoundationType` ile çakışmasın diye bu ad)
- `BearingFamilyType{ELASTOMERIC}`

Her biri `static Optional<E> fromValue(String)` sunar (sabit adıyla birebir eşleşme).

**Değer nesneleri (record)**

Ortak kurallar: sayılar sonlu olmalı; nullable `Double` alanlar null ise kontrol edilmez. Listeler `List.copyOf` ile kopyalanır ve null eleman içeremez. String'ler yorumlanmaz.

*Bridge definitions*
- `BridgeAxis(String id, String name, BridgeAxisType type, double chainageM, Double elevationM, Double skewDegrees)`
- `AxisFamilyAssignment(String axisId, String pierFamilyId, Double pierHeightM, String pierCapFamilyId, String foundationFamilyId, Double foundationElevationM, String soilReference, String bearingFamilyId, Double bearingQuantity, String bearingOrientation, String longitudinalBehavior, String transverseBehavior)`
  - `axisId` boş olamaz.
  - `soilReference`, `bearingOrientation`, `longitudinalBehavior`, `transverseBehavior` null olamaz.
- `BridgeConstraint(String id, ConstraintKind kind, String name, Double startChainageM, Double endChainageM, String note)`
- `BridgeDefinition(String definitionKey, String bridgeId, List<Double> spanLengthsM, List<BridgeAxis> axes, String superstructureType, String girderFamilyId, String girderVariantId, Double girderCount, Double deckWidthOverrideM, List<AxisFamilyAssignment> axisAssignments, String abutmentA1FamilyId, String abutmentA2FamilyId, String constructionMethod, String constructionStagesNote, List<BridgeConstraint> constraints)`
  - `definitionKey` boş olamaz.
  - `bridgeId`, `superstructureType`, `constructionMethod`, `constructionStagesNote` null olamaz.
  - `axisAssignments[].axisId` tekil.
  - `definitionKey` ile `bridgeId` eşitliği zorlanmaz (K6, FK yok).

*Family ortak yapıları*
- `RangeRule(Double min, Double max, Double delta)`
- `SweepDimension(String key, String label, double min, double max, double delta)`: key ve label null olamaz.

*Family'ler*
- `PierFamily(String id, String name, PierFamilyType pierType, Boolean enabled, List<SweepDimension> dimensions, List<String> allowedConfigurations, SweepDimension twoColumnSpacing, HeightApplicability heightApplicability, String source)`
  - İç içe `record HeightApplicability(Double minimumHeight, Double preferredHeightMin, Double preferredHeightMax, Double maximumHeight)`.
  - `id` dışındaki her alan nullable. `dimensions` ve `allowedConfigurations` için null ile `[]` farklıdır.
- `PierCapFamily(id, name, PierCapType capType, PierCapConfiguration compatiblePierConfiguration, RangeRule capTransverseLength, RangeRule capStructuralHeight, RangeRule stemWidth, Boolean enabled, String source)`
- `FoundationFamily(id, name, FoundationFamilyType foundationType, Boolean enabled, ShallowGeneration shallowGeneration, PiledGeneration piledGeneration, String source)`
  - `ShallowGeneration(RangeRule lengthX, lengthY, height)`
  - `PiledGeneration(pileDiameter, pileCountX, pileSpacingX, pileCountY, pileSpacingY, height)`
  - Generation var ise içindeki kurallar null olamaz.
- `BearingFamily(id, name, BearingFamilyType bearingType, Boolean enabled, RangeRule length, RangeRule width, RangeRule height, String source)`
- `MaterialAssignment(String id, Double no, String element, String concreteClass)`

*Diğer bölümler*
- `GirderLibrary(Boolean enabled, List<SweepDimension> dimensions)`: ikisi de nullable.
- `PreferredSpanRule(String id, String superstructureType, String girderVariantId, double minSpan, double maxSpan, double spanDelta, double primarySpan, boolean enabled, String source)`: hepsi zorunlu; id tekilliği yok.
- `CrossSectionValues(double platformWidthM, double leftWalkwayM, double rightWalkwayM, double spaceOfGirderM, double numberOfGirders)`

**Bölüm tipleri (`implements ProjectSection`)**
- `BridgeDefinitions(List<BridgeDefinition> definitions)`: `definitionKey` tekil.
- `PierFamilyCatalog(List<PierFamily>)`, `PierCapFamilyCatalog`, `FoundationFamilyCatalog`, `BearingFamilyCatalog`, `MaterialAssignmentCatalog`: liste null olamaz; id boş olamaz ve tekil.
- `GirderLibrarySection(GirderLibrary library)`, `PreferredSpanRulesSection(List<PreferredSpanRule> rules)`, `CrossSectionSection(CrossSectionValues values)`: içerik nullable; null "temizle" demektir.
- `ProjectSection` şöyle olur:
  `sealed interface ProjectSection permits ProjectWorkspace, BridgeDefinitions, PierFamilyCatalog, PierCapFamilyCatalog, FoundationFamilyCatalog, BearingFamilyCatalog, MaterialAssignmentCatalog, GirderLibrarySection, PreferredSpanRulesSection, CrossSectionSection`
- Yapısal kontrol yardımcısı olarak isteğe bağlı package-private `SectionInvariants` eklenebilir (`requireFinite`, `copyNonNull`, `requireUniqueNonBlank`).

İnvariant ihlali `IllegalArgumentException` fırlatır; bu ikinci savunma hattıdır (400 `INVALID_INPUT`).

### 3.4 Application
- **`ProjectContent`** şöyle olur: `(ProjectWorkspace workspace, BridgeDefinitions bridgeDefinitions, PierFamilyCatalog pierFamilies, PierCapFamilyCatalog pierCapFamilies, FoundationFamilyCatalog foundationFamilies, BearingFamilyCatalog bearingFamilies, MaterialAssignmentCatalog materialAssignments, GirderLibrary girderLibrary, List<PreferredSpanRule> preferredSpanRules, CrossSectionValues crossSection)`. Hepsi nullable; null "hiç yazılmamış" demektir. Ek olarak `static ProjectContent ofWorkspace(ProjectWorkspace)` fabrika metodu.
- **`ProjectDocument`** şöyle olur: `(UUID projectId, long revision, Instant createdUtc, Instant updatedUtc, ProjectContent content)`. Ek metot `public ProjectWorkspace workspace() { return content.workspace(); }` mevcut testleri derlenir halde tutar.
- **`ProjectService`**:
  - `create` → `new ProjectDocument(..., ProjectContent.ofWorkspace(workspace))`.
  - `document` → `content` olduğu gibi aktarılır.
  - `replace` değişmez.
- **`ProjectContentRepository`**: yalnızca javadoc güncellenir (M2 bölümleri).

### 3.5 Infra (`bridge.infra.persistence`; entity'ler package-private)

**Yeni dosyalar**
- `StoredSection` (infra içi enum): `BRIDGE_DEFINITIONS, FAMILY_PIER, FAMILY_PIER_CAP, FAMILY_FOUNDATION, FAMILY_BEARING, FAMILY_MATERIAL, PREFERRED_SPAN_RULES`.
  - `ProjectSectionPresenceEntity` (`project_section_presence`).
  - `ProjectSectionPresenceJpaRepository`: `findByProjectId`, `existsByProjectIdAndSection`, `deleteByProjectIdAndSection`.
- Embeddable'lar:
  - `RangeRuleEmbeddable(Double min, max, delta)`, `@AttributeOverrides` ile kullanılır.
  - `SweepDimensionEmbeddable` (element collection için, NOT NULL kolonlar).
  - `BridgeAxisEmbeddable`, `AxisAssignmentEmbeddable`, `BridgeConstraintEmbeddable`.
- Entity'ler (her biri `apply`/constructor + `toDomain()`):
  - `BridgeDefinitionEntity`: element collection'lar `@ElementCollection(fetch = LAZY) @OrderColumn`. 4 liste EAGER olursa kartezyen join oluşur; `toDomain` transaction içinde çağrılır.
  - `PierFamilyEntity`: dimensions ve configurations element collection'ları; `twoColumnSpacing` ve `heightApplicability` düz kolonlar + `_present` bayrakları.
  - `PierCapFamilyEntity`, `FoundationFamilyEntity`, `BearingFamilyEntity`, `MaterialAssignmentEntity`.
  - `GirderLibraryEntity`: `@Id project_id`; dimensions element collection'ı (`girder_library_dimension`, join kolonu `project_id`).
  - `PreferredSpanRuleEntity`.
  - `CrossSectionEntity`: `@Id project_id`.
- Spring Data arayüzleri:
  - Surrogate PK'li tablolar: `BridgeDefinitionJpaRepository`, `PierFamilyJpaRepository`, `PierCapFamilyJpaRepository`, `FoundationFamilyJpaRepository`, `BearingFamilyJpaRepository`, `MaterialAssignmentJpaRepository`, `PreferredSpanRuleJpaRepository`. Hepsinde `findByProjectIdOrderByOrdinalAsc`, `deleteByProjectId`.
  - `project_id` PK'li tablolar: `GirderLibraryJpaRepository`, `CrossSectionJpaRepository`.
- **`DesignSystemContentStore`** (package-private `@Component`). M1 adapter'ı şişmesin diye ayrı tutulur.
  - `void load(UUID, Builder)` veya bölüm başına `loadX(UUID)` metotları.
  - `replace(UUID, ProjectSection)`, M2 bölümleri için.
  - **Liste bölümü değiştirme:** `deleteByProjectId` → `flush()` → `saveAll` (ordinal = indeks) → presence upsert (yalnızca değer `null` değilse; `null` ise presence silinir) → `flush()`.
  - **1:1 bölümler:** varsa `deleteById` → `flush()` → değer null değilse `save` → `flush()`.
  - **Yükleme:** liste bölümü için presence satırı yoksa `null`; varsa satırlar ordinal sırasıyla okunur (`[]` olabilir).
- **`JpaProjectContentRepository`** değişiklikleri:
  - Constructor `DesignSystemContentStore` alır.
  - `load`: workspace yalnızca `project_info` satırı varsa doldurulur, M2 bölümleri her durumda yüklenir. Erken `return` kalkar.
  - `replace` switch'i 10 vakaya çıkar; M2 vakaları store'a delege edilir.

**Toplu bağlam:** `toDomain` içindeki LAZY koleksiyonlar sınıf seviyesindeki `@Transactional(readOnly = true)` `load` içinde okunur. `ProjectService` zaten `TransactionOperations` içinde çalışır.

### 3.6 API (`bridge.api`)
- **`ProjectDesignSystemController`**: `@RestController @RequestMapping("/api/projects/{projectId}")`, constructor injection ile `ProjectService` ve `ProjectRequestReader`.
  - 9 `@PutMapping`: `/bridge-definitions`, `/families/piers`, `/families/pier-caps`, `/families/foundations`, `/families/bearings`, `/families/materials`, `/girder-library`, `/preferred-span-rules`, `/cross-section`.
  - Hepsi `@PathVariable UUID projectId, @RequestBody JsonNode body` alır ve `SectionWriteResponse<…>` döndürür.
  - Ortak private yardımcı: `expectedRevision` ihlali ile mapper ihlallerini tek 400'de birleştirir (M1 deviation 4 ile aynı), sonra `projects.replace` çağrılır; yanıt `value`'su `toDto(model)` ile üretilir.
- **İstek record'ları** (`DesignSystemPutRequests.java` içinde iç içe):
  - `BridgeDefinitionsPut(Long expectedRevision, BridgeDefinitionsDto value)`
  - `PierFamiliesPut(Long, List<FamilyDtos.PierFamilyDto>)`
  - `PierCapFamiliesPut`, `FoundationFamiliesPut`, `BearingFamiliesPut`, `MaterialAssignmentsPut`
  - `GirderLibraryPut(Long, GirderLibraryDto)`, `PreferredSpanRulesPut(Long, List<PreferredSpanRuleDto>)`, `CrossSectionPut(Long, CrossSectionDto)`
- **Yanıtlar:**
  - `SectionWriteResponse<T>(UUID projectId, long revision, Instant updatedAt, T value)`.
  - `FamiliesDto(piers, pierCaps, foundations, bearings, materials)`.
  - `ProjectDocumentResponse` 5 bileşen ekler: `bridgeDefinitions, families, girderLibrary, preferredSpanRules, crossSection`.
- **DTO dosyaları:** `BridgeDefinitionsDto.java`, `FamilyDtos.java`, `GirderLibraryDto.java`, `PreferredSpanRuleDto.java`, `CrossSectionDto.java`.
  - Sayılar kutulu tiplerdir; enum'lar `String` tutulur.
  - `abutmentFamilyIds` için `AbutmentFamilyIdsDto(@JsonProperty("A1") String a1, @JsonProperty("A2") String a2)`.
- **Mapper'lar** (final, static, package-private):
  - `BridgeDefinitionsMapper`, `FamilyCatalogMapper`, `DesignModuleMapper`.
  - Ortak yardımcı `SectionChecks`: `text`, `optionalFinite`, `requiredFinite`, `enumValue(path, raw, Class)` (`"must be one of: A, B"`), `uniqueNonBlank(path, id, seen, listName)` (`"duplicates value[0].id"`), `nonNullElements`.
  - Önek `value`. Örnek yollar: `value[2].dimensions[1].label`, `value.definitions[0].axisAssignments[1].axisId`.
  - M1 mapper'ına dokunmak zorunlu değil.

### 3.7 JSON şekilleri

Ortak `PUT` zarfı:
- İstek: `{"expectedRevision": 7, "value": <V>}`
- Yanıt 200: `{"projectId","revision":8,"updatedAt","value":<V saklanan>}`
- Hatalar:
  - 400 `INVALID_REQUEST` (`errors[]` alan yollu): bilinmeyen alan, eksik/sonlu olmayan değer, bilinmeyen enum, tekrarlı/boş id, gerekli `value` null.
  - 400 `MALFORMED_REQUEST_BODY` (bozuk JSON).
  - 400 `INVALID_PARAMETER` (UUID olmayan yol).
  - 404 `PROJECT_NOT_FOUND`.
  - 409 `PROJECT_REVISION_CONFLICT`.

Örneklerdeki değerler test verisidir; mühendislik varsayılanı değildir.

**`PUT …/bridge-definitions`**: `value` zorunlu.
```json
{"definitions":[{"definitionKey":"b-1","bridgeId":"b-1","spanLengthsM":[30.0,35.0],
  "axes":[{"id":"A1","name":"A1","type":"ABUTMENT","chainageM":0.0,"elevationM":null,"skewDegrees":null}],
  "superstructureType":"Precast Girder","girderFamilyId":null,"girderVariantId":"PG-H160","girderCount":5.0,
  "deckWidthOverrideM":null,
  "axisAssignments":[{"axisId":"P1","pierFamilyId":"RECT-M","pierHeightM":12.5,"pierCapFamilyId":null,
    "foundationFamilyId":null,"foundationElevationM":null,"soilReference":"","bearingFamilyId":null,
    "bearingQuantity":null,"bearingOrientation":"","longitudinalBehavior":"","transverseBehavior":""}],
  "abutmentFamilyIds":{"A1":null,"A2":null},"constructionMethod":"","constructionStagesNote":"",
  "constraints":[{"id":"c-1","kind":"RIVER","name":"x","startChainageM":null,"endChainageM":null,"note":""}]}]}
```
`axisAssignments`, frontend map'inin anahtar sırasıyla gönderilen liste karşılığıdır.

**`PUT …/families/piers`**: `value` = dizi.
```json
[{"id":"RECT-M","name":"RECT-M","pierType":"H_TYPE","enabled":false,"source":"PROJECT_DESIGN_SYSTEM",
  "dimensions":[{"key":"B","label":"Transverse Length (m)","min":3.0,"max":6.0,"delta":1.0}],
  "allowedConfigurations":["SINGLE_COLUMN","TWO_COLUMNS"],
  "twoColumnSpacing":{"key":"spacing","label":"Transverse Spacing (m)","min":6.0,"max":10.0,"delta":1.0},
  "heightApplicability":{"minimumHeight":null,"preferredHeightMin":null,"preferredHeightMax":null,"maximumHeight":null}}]
```
**`/families/pier-caps`**:
```json
[{"id":"CAP-1","name":"…","capType":"T_CAP","compatiblePierConfiguration":"SINGLE_COLUMN","enabled":true,"source":"…",
  "capTransverseLength":{"min":null,"max":null,"delta":null},"capStructuralHeight":{"min":1.0,"max":2.0,"delta":0.5},"stemWidth":null}]
```
**`/families/foundations`**:
```json
[{"id":"F-1","name":"…","foundationType":"PILED","enabled":true,"source":"…","shallowGeneration":null,
  "piledGeneration":{"pileDiameter":{…},"pileCountX":{…},"pileSpacingX":{…},"pileCountY":{…},"pileSpacingY":{…},"height":{…}}}]
```
(`{…}` = `{"min":n|null,"max":n|null,"delta":n|null}`; `shallowGeneration` = `{"lengthX","lengthY","height"}`)

**`/families/bearings`**:
```json
[{"id":"B-1","name":"…","bearingType":"ELASTOMERIC","enabled":true,"source":"…","length":{…},"width":{…},"height":{…}}]
```
**`/families/materials`**:
```json
[{"id":"FOUNDATION","no":2.0,"element":"Foundation","concreteClass":"C30/37"}]
```
**`/girder-library`**: `value` = `null` veya:
```json
{"enabled":true,"dimensions":[{"key":"H","label":"H (cm)","min":160.0,"max":190.0,"delta":10.0}]}
```
`enabled` ve `dimensions` ayrı ayrı `null` olabilir.

**`/preferred-span-rules`**: `value` = `null` veya:
```json
[{"id":"girder-span-PG-H160","superstructureType":"PRECAST_GIRDER","girderVariantId":"PG-H160","minSpan":0.0,"maxSpan":0.0,"spanDelta":0.0,"primarySpan":0.0,"enabled":true,"source":"PROJECT_DESIGN_SYSTEM"}]
```
**`/cross-section`**: `value` = `null` veya:
```json
{"platformWidthM":13.8,"leftWalkwayM":1.0,"rightWalkwayM":1.5,"spaceOfGirderM":2.0,"numberOfGirders":5.0}
```
**`GET /api/projects/{id}`** (ve `POST` 201) anahtar sırası:
```json
{"projectId","revision","createdAt","updatedAt","workspace",
 "bridgeDefinitions": {...}|null,
 "families": {"piers":[...]|null,"pierCaps":…,"foundations":…,"bearings":…,"materials":…},
 "girderLibrary": {...}|null, "preferredSpanRules": [...]|null, "crossSection": {...}|null}
```
Yeni projede M2 alanları `null`; `families` ise 5 üyesi de `null` olan bir nesne.

### 3.8 SQL: `V4__project_design_system.sql`

Başlık yorumu V3 ile aynı ilkeyi tekrarlar: DEFAULT yok, mühendislik CHECK'i yok, string'ler `VARCHAR` (Q3), birim kolon adında (Q2), Dimension birimi `label` içinde. Kısaltma: `DP` = `DOUBLE PRECISION`. Tüm FK'lar `CASCADE`'siz (V2/V3 gibi). Surrogate PK'li tablolara `project_id` index'i eklenir.

```sql
CREATE TABLE project_section_presence (
  id UUID NOT NULL, project_id UUID NOT NULL, section_key VARCHAR(40) NOT NULL,
  CONSTRAINT pk_project_section_presence PRIMARY KEY (id),
  CONSTRAINT fk_project_section_presence_project FOREIGN KEY (project_id) REFERENCES project (id),
  CONSTRAINT uq_project_section_presence UNIQUE (project_id, section_key));

CREATE TABLE bridge_definition (
  id UUID NOT NULL, project_id UUID NOT NULL, ordinal INTEGER NOT NULL,
  definition_key VARCHAR NOT NULL, bridge_id VARCHAR NOT NULL, superstructure_type VARCHAR NOT NULL,
  girder_family_id VARCHAR, girder_variant_id VARCHAR, girder_count DP, deck_width_override_m DP,
  abutment_a1_family_id VARCHAR, abutment_a2_family_id VARCHAR,
  construction_method VARCHAR NOT NULL, construction_stages_note VARCHAR NOT NULL,
  PK(id), FK(project_id)→project, UNIQUE(project_id, definition_key));
CREATE TABLE bridge_definition_span (bridge_definition_id UUID NOT NULL, span_index INTEGER NOT NULL,
  length_m DP NOT NULL, PK(bridge_definition_id, span_index), FK→bridge_definition);
CREATE TABLE bridge_definition_axis (bridge_definition_id UUID NOT NULL, axis_index INTEGER NOT NULL,
  axis_id VARCHAR NOT NULL, name VARCHAR NOT NULL, axis_type VARCHAR(16) NOT NULL, chainage_m DP NOT NULL,
  elevation_m DP, skew_degrees DP, PK(bridge_definition_id, axis_index), FK);
CREATE TABLE bridge_definition_axis_assignment (bridge_definition_id UUID NOT NULL, assignment_index INTEGER NOT NULL,
  axis_id VARCHAR NOT NULL, pier_family_id VARCHAR, pier_height_m DP, pier_cap_family_id VARCHAR,
  foundation_family_id VARCHAR, foundation_elevation_m DP, soil_reference VARCHAR NOT NULL,
  bearing_family_id VARCHAR, bearing_quantity DP, bearing_orientation VARCHAR NOT NULL,
  longitudinal_behavior VARCHAR NOT NULL, transverse_behavior VARCHAR NOT NULL, PK(…, assignment_index), FK);
CREATE TABLE bridge_definition_constraint (bridge_definition_id UUID NOT NULL, constraint_index INTEGER NOT NULL,
  constraint_id VARCHAR NOT NULL, constraint_kind VARCHAR(32) NOT NULL, name VARCHAR NOT NULL,
  start_chainage_m DP, end_chainage_m DP, note VARCHAR NOT NULL, PK(…, constraint_index), FK);

CREATE TABLE family_pier (id UUID NOT NULL, project_id UUID NOT NULL, ordinal INTEGER NOT NULL,
  family_id VARCHAR NOT NULL, name VARCHAR, pier_type VARCHAR(16), enabled BOOLEAN, source VARCHAR,
  has_dimensions BOOLEAN NOT NULL, has_allowed_configurations BOOLEAN NOT NULL,
  two_column_spacing_present BOOLEAN NOT NULL, two_column_spacing_key VARCHAR, two_column_spacing_label VARCHAR,
  two_column_spacing_min DP, two_column_spacing_max DP, two_column_spacing_delta DP,
  height_applicability_present BOOLEAN NOT NULL, height_minimum_m DP, height_preferred_min_m DP,
  height_preferred_max_m DP, height_maximum_m DP,
  PK(id), FK(project_id), UNIQUE(project_id, family_id));
CREATE TABLE family_pier_dimension (pier_family_id UUID NOT NULL, dimension_index INTEGER NOT NULL,
  dimension_key VARCHAR NOT NULL, label VARCHAR NOT NULL, min_value DP NOT NULL, max_value DP NOT NULL,
  delta_value DP NOT NULL, PK(pier_family_id, dimension_index), FK→family_pier(id));
CREATE TABLE family_pier_configuration (pier_family_id UUID NOT NULL, configuration_index INTEGER NOT NULL,
  configuration VARCHAR NOT NULL, PK(…), FK→family_pier(id));

CREATE TABLE family_pier_cap (id, project_id, ordinal, family_id VARCHAR NOT NULL, name VARCHAR,
  cap_type VARCHAR(16), compatible_pier_configuration VARCHAR(16), enabled BOOLEAN, source VARCHAR,
  cap_transverse_length_present BOOLEAN NOT NULL, cap_transverse_length_min_m DP, cap_transverse_length_max_m DP, cap_transverse_length_delta_m DP,
  cap_structural_height_present BOOLEAN NOT NULL, cap_structural_height_min_m DP, …_max_m DP, …_delta_m DP,
  stem_width_present BOOLEAN NOT NULL, stem_width_min_m DP, stem_width_max_m DP, stem_width_delta_m DP,
  PK, FK, UNIQUE(project_id, family_id));

CREATE TABLE family_foundation (id, project_id, ordinal, family_id VARCHAR NOT NULL, name VARCHAR,
  foundation_type VARCHAR(16), enabled BOOLEAN, source VARCHAR,
  shallow_present BOOLEAN NOT NULL,
  shallow_length_x_min_m/max_m/delta_m DP, shallow_length_y_min_m/max_m/delta_m DP, shallow_height_min_m/max_m/delta_m DP,
  piled_present BOOLEAN NOT NULL,
  piled_pile_diameter_min_m/max_m/delta_m DP, piled_pile_count_x_min/max/delta DP,
  piled_pile_spacing_x_min_m/max_m/delta_m DP, piled_pile_count_y_min/max/delta DP,
  piled_pile_spacing_y_min_m/max_m/delta_m DP, piled_height_min_m/max_m/delta_m DP,
  PK, FK, UNIQUE(project_id, family_id));

CREATE TABLE family_bearing (id, project_id, ordinal, family_id VARCHAR NOT NULL, name VARCHAR,
  bearing_type VARCHAR(16), enabled BOOLEAN, source VARCHAR,
  length_present BOOLEAN NOT NULL, length_min_mm DP, length_max_mm DP, length_delta_mm DP,
  width_present BOOLEAN NOT NULL, width_min_mm DP, width_max_mm DP, width_delta_mm DP,
  height_present BOOLEAN NOT NULL, height_min_mm DP, height_max_mm DP, height_delta_mm DP,
  PK, FK, UNIQUE(project_id, family_id));

CREATE TABLE family_material (id, project_id, ordinal, assignment_id VARCHAR NOT NULL, material_no DP,
  element VARCHAR, concrete_class VARCHAR, PK, FK, UNIQUE(project_id, assignment_id));

CREATE TABLE girder_library (project_id UUID NOT NULL, enabled BOOLEAN, has_dimensions BOOLEAN NOT NULL,
  PK(project_id), FK→project);
CREATE TABLE girder_library_dimension (project_id UUID NOT NULL, dimension_index INTEGER NOT NULL,
  dimension_key VARCHAR NOT NULL, label VARCHAR NOT NULL, min_value DP NOT NULL, max_value DP NOT NULL,
  delta_value DP NOT NULL, PK(project_id, dimension_index), FK→girder_library(project_id));

CREATE TABLE preferred_span_rule (id UUID NOT NULL, project_id UUID NOT NULL, ordinal INTEGER NOT NULL,
  rule_id VARCHAR NOT NULL, superstructure_type VARCHAR NOT NULL, girder_variant_id VARCHAR NOT NULL,
  min_span_m DP NOT NULL, max_span_m DP NOT NULL, span_delta_m DP NOT NULL, primary_span_m DP NOT NULL,
  enabled BOOLEAN NOT NULL, source VARCHAR NOT NULL, PK(id), FK(project_id));   -- rule_id UNIQUE yok (D3)

CREATE TABLE cross_section (project_id UUID NOT NULL, platform_width_m DP NOT NULL, left_walkway_m DP NOT NULL,
  right_walkway_m DP NOT NULL, space_of_girder_m DP NOT NULL, number_of_girders DP NOT NULL,
  PK(project_id), FK→project);
```
Rezerve kelimeler bilerek kullanılmadı: `key`, `value`, `min`, `max`, `no`, `type`, `kind`. Bir kolon adı H2/PG'de hata verirse (örneğin `element`, `source`), entity ile tutarlı olarak yeniden adlandırılır (M1'deki `inventory_no` emsali).

## 4. Alternatifler

| Alternatif | Karar |
|---|---|
| Kural nesnelerini genel bir `family_range_rule(family_kind, family_row_id, rule_key)` tablosunda tutmak (üst planın taslağı) | **Reddedildi:** 4 farklı family tablosuna tek FK kurulamaz (polimorfik). Satır içi tipli kolonlar + `*_present` bayrağı daha katı ve mevcut `*Embeddable` desenine uyar. |
| Null ile `[]` farkını tutmamak (liste yoksa `[]`) | **Reddedildi:** `PierFamiliesPanel` null için başlangıç kataloğunu, `[]` için boş katalog gösteriyor; veri anlamı değişirdi. |
| Liste bölümleri için ayrı header tabloları | **Reddedildi:** 7 tablo yerine tek `project_section_presence` yeterli. |
| Hiç yazılmamış bölümü GET'te göstermemek (`NON_NULL`) | **Reddedildi:** M1'de `workspace: null` deseni var; anahtarı her zaman göstermek M4 mapper'ını basitleştirir. |
| Bridge definition'ı zod'a göre (her alanı nullable) modellemek | **Reddedildi:** yazma yolu her zaman normalize; katı tip daha doğru (D1). |
| `allowedConfigurations` ve preferred `superstructureType`'ı enum yapmak | **Reddedildi:** zod `z.string()`; frontend'in kabul ettiği veriyi reddederdi (D2). |
| Generic `PUT /sections/{key}` | Üst planda reddedildi. |
| EAGER element collection'lar (M1 gibi) | Bridge definition'da 4 liste kartezyen join üretir; **LAZY** seçildi. |

## 5. Sıralı görevler

Yollar `backend/src/` altında; Java dosyaları `main/java/com/kopruq/` altında.

1. **Migration:** `main/resources/db/migration/V4__project_design_system.sql` (3.8).
2. **Enum'lar:** `bridge/enums/{BridgeAxisType, ConstraintKind, PierFamilyType, PierCapType, PierCapConfiguration, FoundationFamilyType, BearingFamilyType}.java`.
3. **Model (2'ye bağlı):**
   - Yeni: `bridge/model/{BridgeAxis, AxisFamilyAssignment, BridgeConstraint, BridgeDefinition, BridgeDefinitions, RangeRule, SweepDimension, PierFamily, PierFamilyCatalog, PierCapFamily, PierCapFamilyCatalog, FoundationFamily, FoundationFamilyCatalog, BearingFamily, BearingFamilyCatalog, MaterialAssignment, MaterialAssignmentCatalog, GirderLibrary, GirderLibrarySection, PreferredSpanRule, PreferredSpanRulesSection, CrossSectionValues, CrossSectionSection}.java`.
   - İsteğe bağlı: `SectionInvariants.java`.
   - Güncelle: `ProjectSection.java` (permits + javadoc).
4. **Application (3):** `bridge/application/ProjectContent.java`, `ProjectDocument.java` (`content` + `workspace()`), `ProjectService.java` (`create`/`document`), `ProjectContentRepository.java` (javadoc).
5. **Infra (1, 4):**
   - Yeni: `bridge/infra/persistence/{StoredSection, ProjectSectionPresenceEntity, ProjectSectionPresenceJpaRepository, RangeRuleEmbeddable, SweepDimensionEmbeddable, BridgeAxisEmbeddable, AxisAssignmentEmbeddable, BridgeConstraintEmbeddable, BridgeDefinitionEntity, BridgeDefinitionJpaRepository, PierFamilyEntity, PierFamilyJpaRepository, PierCapFamilyEntity, PierCapFamilyJpaRepository, FoundationFamilyEntity, FoundationFamilyJpaRepository, BearingFamilyEntity, BearingFamilyJpaRepository, MaterialAssignmentEntity, MaterialAssignmentJpaRepository, GirderLibraryEntity, GirderLibraryJpaRepository, PreferredSpanRuleEntity, PreferredSpanRuleJpaRepository, CrossSectionEntity, CrossSectionJpaRepository, DesignSystemContentStore}.java`.
   - Güncelle: `JpaProjectContentRepository.java`.
6. **API (4):**
   - Yeni: `bridge/api/{ProjectDesignSystemController, DesignSystemPutRequests, SectionWriteResponse, BridgeDefinitionsDto, FamilyDtos, FamiliesDto, GirderLibraryDto, PreferredSpanRuleDto, CrossSectionDto, BridgeDefinitionsMapper, FamilyCatalogMapper, DesignModuleMapper, SectionChecks}.java`.
   - Güncelle: `ProjectDocumentResponse.java`.
7. **Mevcut testlerin güncellenmesi (`test/java/com/kopruq/`):**
   - `architecture/ArchitectureTests.java`: sayı 14; metot adı `…andExactlyFourteen`; mesaj "the 14 controllers".
   - `contract/EndpointInventoryContractTest.java`: `// backend-db-persistence M2` altında 9 satır: `"PUT /api/projects/{projectId}/bridge-definitions"`, `"PUT /api/projects/{projectId}/families/piers"`, `…/families/pier-caps`, `…/families/foundations`, `…/families/bearings`, `…/families/materials`, `…/girder-library`, `…/preferred-span-rules`, `…/cross-section`. Javadoc'ta toplam 34.
   - `contract/LayoutKernelCorsContractTest.java:163-164`: `{"/api/projects/00000000-0000-0000-0000-000000000001/families/piers","PUT"}` ve `{…/cross-section,"PUT"}`.
   - `contract/ProjectApiContractTest.java:136-137`: anahtar listesi 10 elemana çıkar; ayrıca POST 201'de yeni anahtarlar `null` olmalı.
   - `bridge/infra/InMemoryProjectContentRepository.java`: tüm bölümler için map'ler ve exhaustive switch.
   - `bridge/infra/persistence/JpaProjectContentRepositoryTest.java`: `@Import`'a `DesignSystemContentStore.class`.
   - `ProjectServiceTest`: gerekirse `document().content()` assert'leri.
8. **Yeni testler:**
   - `bridge/DesignSystemFixtures.java`: 9 bölüm için tam ve kenar durumu fixture'ları (Unicode, null'lar, `[]`, `H_TYPE`/`WALL`, negatif/sıfır sayılar, `0.30000000000000004`).
   - `bridge/model/DesignSystemSectionsTest.java`: invariant'lar.
   - `bridge/infra/persistence/JpaDesignSystemContentTest.java`: `@DataJpaTest` + `replace = NONE` + `@Import(JpaProjectRepository, JpaProjectContentRepository, DesignSystemContentStore)`.
   - `bridge/application/ProjectServiceIntegrationTest.java`'ya bir test: M2 `PUT`'u workspace, designSpace ve alternatives'i değiştirmez.
   - `contract/ProjectDesignSystemApiContractTest.java`: MockMvc + `@ParameterizedTest @MethodSource` ile 9 bölüm × (round-trip, 409, 400 vakaları, 404).
9. **Dokümanlar:**
   - `docs/architecture.md`: "BACKEND-DB-PERSISTENCE M2 (tarih)" bölümü. İçerik: V4 şeması, presence tablosu, null/`[]` semantiği, 9 endpoint, alınan/atılan alanlar, enum listeleri, birim kolonları, controller sayısı 14.
   - `docs/roadmap.md`: "BACKEND-DB-PERSISTENCE track" altında M2 `[x]`.
   - `bridge/package-info.java`: javadoc notu.
   - Yalnızca ekleme yapılır.
10. **Kontrol:** `clean package` yeşil (bkz. 7).

Tahmin: yaklaşık 70 yeni main dosyası (enum 7, model ~24, infra ~27, api ~13), ~10 güncellenen main/test dosyası, 5 yeni test dosyası.

## 6. Kabul kriterleri

- **AC1 – Migration.**
  - V4, H2 üzerinde Flyway ile uygulanır; tüm Spring context'leri `ddl-auto=validate` ile açılır.
  - V1–V3 byte düzeyinde değişmez.
  - M1 projeleri M2 tablolarında satır olmadan açılır.
- **AC2 – Endpoint'ler.**
  - Tam olarak 9 yeni `PUT` var; `EndpointInventoryContractTest` 34 endpoint'i birebir listeler.
  - `ArchitectureTests` 14 controller ile geçer: `bridge` kenarları `{}`, model/enums'ta Spring/JPA/application/api importu yok, JPA yalnızca `bridge.infra.persistence` içinde, pom'da 11 bağımlılık.
  - `Origin: http://localhost:5173` ile yeni yollara `PUT` preflight 200 döner.
- **AC3 – Round-trip (9 bölüm, parametrik).** Doğru `expectedRevision` ve tüm alanları açık gönderilen fixture ile `PUT` 200 döner. Yanıt `value`'su ve sonraki `GET`'teki karşılık gelen alan, gönderilen JSON ile derin eşittir. Bu kapsamda:
  - Sayılar bit düzeyinde aynı (`0.30000000000000004`).
  - Unicode string'ler korunur.
  - Liste sırası korunur (dimensions, axes, assignments, constraints, rules).
  - Eski `pierType` değerleri `H_TYPE`/`WALL` aynen döner.
- **AC4 – Revizyon.**
  - Her başarılı `PUT` `revision`'ı 1 artırır ve `updatedAt`'i günceller.
  - Bir bölüme yazmak diğer bölümleri, workspace'i, designSpace'i ve alternatives'i değiştirmez.
  - Aynı id'lerle sırası değiştirilmiş yeniden yazma UNIQUE hatası vermez.
  - Bölümden çıkarılan satırların alt tablo satırları da silinir (`JdbcTemplate` ile sayım).
- **AC5 – 409.** Her bölümde eski `expectedRevision` 409 `PROJECT_REVISION_CONFLICT` döner; `project.revision`, `updated_utc` ve ilgili tabloların satırları değişmez. Aynı revizyonla ardışık iki `PUT`'ta ilki 200, ikincisi 409 döner.
- **AC6 – 400.** Şunlar 400 `INVALID_REQUEST` döner, beklenen alan yolunu içerir ve DB değişmez:
  - Eksik `expectedRevision`.
  - Bilinmeyen alan: örneğin `value[0].foo` veya bridge definition'da `selectedAxisId`, `viewMode`, `terrainVisible`, `selectedConstraintId`; `value` seviyesinde `selectedBridgeId`, `keyBy`.
  - Sonlu olmayan veya taşan sayı: `1e999` (örneğin `value.platformWidthM`, `value[0].dimensions[0].min`).
  - Bilinmeyen enum: `pierType`, `capType`, `compatiblePierConfiguration`, `foundationType`, `bearingType`, axis `type`, constraint `kind`. Mesaj `"must be one of: …"`.
  - Tekrarlı ya da boş family `id`, tekrarlı `definitionKey`, tekrarlı `axisAssignments[].axisId`.
  - Zorunlu alanın null olması: cross section sayısı, preferred span alanı, dimension `label`, bridge definition `constructionMethod`.
  - Family'ler ve bridge-definitions için `value: null`.
  - Girder library için dizi `value`.
  - Bozuk JSON ise `MALFORMED_REQUEST_BODY` döner.
- **AC7 – 404/400 yol.** Var olmayan proje UUID'siyle 9 `PUT`'un hepsi 404 `PROJECT_NOT_FOUND` döner; UUID olmayan yol 400 `INVALID_PARAMETER` döner.
- **AC8 – Null ve `[]` semantiği.**
  - Yeni projede `GET` ve `POST` gövdelerinde `bridgeDefinitions`, `girderLibrary`, `preferredSpanRules`, `crossSection` `null`; `families` 5 üyesi de `null` olan bir nesne.
  - Family `PUT []` → `GET []` (null değil).
  - `preferred-span-rules`, `girder-library` ve `cross-section` için `value: null` → `GET null`, revizyon artar.
  - Girder library `{"enabled":null,"dimensions":null}` aynen döner.
  - Kural nesnesi `{"min":null,"max":null,"delta":null}` nesne olarak döner, `null` olmaz; `stemWidth: null` `null` kalır.
  - `dimensions`/`allowedConfigurations` için `null` ile `[]` ayrı kalır.
  - Opsiyonel family alanı hiç gönderilmezse yanıtta `null` olarak döner.
- **AC9 – M1 uyumluluğu.**
  - `GET`/`POST` gövdesinde M1 anahtarları aynı sırada ilk beştir; yeni anahtarlar onlardan sonra gelir.
  - `PUT …/workspace` davranışı ve mevcut M1 testleri (güncellenen anahtar listesi dışında) değişmez.
  - `GET /api/projects` özet şekli değişmez.
- **AC10 – Mühendislik güvenliği.** Negatif, sıfır ve `min > max` değerleri (örneğin `minSpan: 5, maxSpan: -1`, kural `min: 9, max: 1`) kabul edilir ve aynen saklanır. Eksik opsiyonel alan için varsayılan üretilmez. Birim dönüşümü yapılmaz. `definitionKey` ile `bridgeId` farklı olabilir ve aynen saklanır (FK yok).
- **AC11 – Model invariant'ları.**
  - Boş/tekrarlı anahtar, sonlu olmayan sayı ve null liste elemanı `IllegalArgumentException` fırlatır.
  - Preferred span'de tekrarlı `id` ile axis/constraint id tekrarları **kabul edilir** (D3).
- **AC12 – Build ve dokümanlar.**
  - `mvn -f backend/pom.xml -B clean package` başarılı.
  - `backend/pom.xml` ve `frontend/` değişmemiş.
  - `docs/architecture.md` ve `docs/roadmap.md` M2'yi anlatıyor.

## 7. Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Tüm Spring testleri (Flyway + `validate`), `JpaDesignSystemContentTest`; `git diff` V1–V3 | Yeşil; V1–V3 diff'i boş |
| AC2 | `ArchitectureTests`, `EndpointInventoryContractTest`, `LayoutKernelCorsContractTest` | Yeşil |
| AC3 | `ProjectDesignSystemApiContractTest.roundTrip(section)` (9 vaka); `JpaDesignSystemContentTest` (model eşitliği) | 200, derin eşitlik |
| AC4 | Contract testinde `revision`/`updatedAt` ve diğer bölümlerin `GET` eşitliği; `ProjectServiceIntegrationTest`; `JdbcTemplate` alt tablo sayımı | rev+1, yan etki yok |
| AC5 | Parametrik `staleRevision_is409_andChangesNothing` | 409, DB aynı |
| AC6 | Parametrik `invalid_is400(section, mutation, expectedField)` + DB anlık görüntüsü | 400, alan yolu, DB aynı |
| AC7 | Parametrik 404 + bir UUID olmayan yol vakası | 404 / 400 |
| AC8 | Contract: yeni proje gövdesi, `[]`/`null` vakaları; `JpaDesignSystemContentTest` presence ve 1:1 vakaları | Beklenen null/`[]` |
| AC9 | `ProjectApiContractTest` (güncel), M1 testlerinin tamamı | Yeşil |
| AC10 | Contract round-trip'te uç değer fixture'ları | 200, aynen |
| AC11 | `DesignSystemSectionsTest` | Yeşil |
| AC12 | Aşağıdaki komut; `git status -- backend/pom.xml frontend` | BUILD SUCCESS; değişiklik yok |

**Komutlar (PowerShell; `mvn` PATH'te değil, varsayılan `java` JDK 26):**
```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$mvn = 'C:\Users\cemha\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd'
# hedefli
& $mvn -f backend/pom.xml -B test "-Dtest=DesignSystemSectionsTest,JpaDesignSystemContentTest,JpaProjectContentRepositoryTest,ProjectServiceTest,ProjectServiceIntegrationTest,ProjectApiContractTest,ProjectDesignSystemApiContractTest,EndpointInventoryContractTest,LayoutKernelCorsContractTest,ArchitectureTests"
# zorunlu
& $mvn -f backend/pom.xml -B clean package
```
Not: M1 raporuna göre artımlı derleme bayat hata verebiliyor; bu yüzden zorunlu koşu `clean package` ile yapılır.

**İsteğe bağlı PG koşusu:** önce `docker compose --profile postgres-test up -d --wait postgres-test`, ardından `KOPRUQ_TEST_DB_URL=jdbc:postgresql://localhost:5433/kopruq_test` ve `.env.example`'daki kimlik bilgileriyle aynı Maven komutu.

**Bilinmeyenler:**
- CI yok.
- PG uyumluluğu yalnızca H2'nin PostgreSQL modunda doğrulanıyor (Docker gerekli).
- Frontend `npm` kontrolleri M2'de gerekmez.

## 8. Riskler
- **Hibernate flush sırası:** silmeden sonra `flush` yapılmazsa `UNIQUE(project_id, family_id/definition_key)` ihlal edilir. AC4'teki "aynı id'lerle yer değiştirme" testi bunu yakalar.
- **LAZY koleksiyonlar:** `toDomain` transaction dışında çağrılırsa `LazyInitializationException` oluşur. Tüm dönüşümler `load` içinde yapılmalı; `open-in-view=false`.
- **Tüm kolonları null embeddable'ın null dönmesi:** `*_present` bayrağı unutulursa "boş kural" `null` olur ve frontend'de `family.capTransverseLength.min` çöker. AC8 bunu yakalar.
- **Presence tablosu ile satırların tutarsızlığı:** presence ve satırlar her zaman aynı transaction'da yazılır. Presence satırı olup satır olmaması `[]` demektir; bu doğru durumdur.
- **Opsiyonel alanların normalizasyonu (D6):** gönderilmeyen alan `null` olarak döner. M4 mapper'ı her alanı açık göndermeli (üst plandaki K8 ile uyumlu).
- **Katı okuma:** M4 mapper'ı UI alanlarını (`selectedAxisId` vb.) ve `passthrough` alanlarını atmazsa 400 alır. Bu bilinçli bir sözleşme (K5/K8).
- **Preferred span id tekrarı** kabul edildiği için DB UNIQUE yok; frontend güncelleme mantığı tekil id varsayar. Mevcut davranış korunuyor.
- **Geniş tablolar ve dosya sayısı:** `family_foundation` ~40 kolon. Kolon adı yazım hatalarını `ddl-auto=validate` yakalar.
- **H2/PG farkları:** rezerve kelimeler (`element`, `source` vb.) ve `FOR UPDATE`. İsteğe bağlı `postgres-test` koşusu önerilir.
- **Sınırlar ve güvenlik:** auth yok, girdi boyutu sınırı yok (yerel tek kullanıcı). Her `GET` tüm bölümleri yükler; tek kullanıcı için kabul edilebilir.
- **Migration ve geri alma:** Flyway yalnızca ileri gider; kod geri alınırsa V4 tabloları kalır ama M1 kodu onları okumaz. Veri taşıma yok.
- **Mühendislik güvenliği:** aralık, varsayılan veya birim dönüşümü eklenmez. Kolon adındaki birim sonekleri yalnızca UI etiketlerinden ve alan adlarından doğrulanmış birimleri belgeler.

## 9. Varsayımlar ve açık sorular

**Doğrulanmış:** 2. bölümdeki yollar, satır numaraları ve frontend alan, enum ve nullability bilgileri; M1 desenleri; test sabitleri (13 controller, 25 endpoint, GET anahtar listesi); Maven ve JDK yolları.

**Planlayıcı kararları (yazılım; değiştirilebilir):** D1–D9; presence tablosu; `null` gönderilebilen bölümler (girder-library, preferred-span-rules, cross-section); `ProjectDocument`'ın `content` taşıması ve `workspace()` yardımcısı; `DesignSystemContentStore` ayrımı; LAZY koleksiyonlar; bridge-definitions `value`'sunun `{definitions:[…]}` olması (üst plan 3.3).

**Varsayımlar:**
- `axisAssignments` frontend map sırasıyla liste olarak gönderilir.
- Material `no` `DOUBLE` olarak saklanır (zod `z.number()`).
- M1 commit'li ve çalışma ağacı temiz; yalnızca feature dizini izlenmiyor.

**Açık soru:** Yok. Birimler etiketlerden doğrulandı ve dönüşüm yapılmıyor (Q2). Enum değerleri zod'dan birebir alındı. Hiçbir alan mühendislik kararı gerektirmiyor.

**READY**