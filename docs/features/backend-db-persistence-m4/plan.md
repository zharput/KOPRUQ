# Plan: backend-db-persistence-m4 (frontend altyapısı, UI'a henüz bağlanmamış)

**Sonuç: READY.** Üst plan `docs/features/backend-db-persistence/plan.md` (3.1 K1–K9, 3.4, 5 M4, AC15–AC16, 9.2 Q1–Q5) ve uygulanmış M1–M3 backend sözleşmesi esas alındı. Aşağıdaki bütün wire şekilleri, nullability'ler, enum değerleri ve hata mesajları gerçek Java DTO, mapper ve controller kodundan okundu. Kalan kararların hepsi yazılım kararı. Hiçbir mühendislik bilgisi, varsayılan değer ya da birim dönüşümü gerekmiyor. Kayıplı eşleme noktaları (8. bölüm, R1–R10) M5'e açıkça devredildi.

---

## 1. Amaç ve kapsam dışı olanlar

**Amaç (yalnızca M4)**
1. `frontend/src/shared/api/http.ts` dosyasına `putJson` eklenir (testleriyle).
2. Yeni generic `frontend/src/shared/project-store/` katmanı kurulur: `projectApi`, `projectDataValidation`, `projectSession`, `writeQueue`, `serverSection`. Bu katman `features/` veya `app/` import etmez.
3. 7 feature wire mapper'ı yazılır. Her biri strict zod yanıt şeması, `toWire`, `fromWire` ve `SectionDefinition` (path + codec) içerir.
4. `app/project-session/projectDocument.ts` eklenir. İçinde birleşik `ProjectDocument` zod şeması, saf bir yükleyici (GET dokümanı → bölüm bazında frontend değerleri; hiçbir store'a yazmaz), bölüm tanımları kaydı ve POST gövdesi yardımcısı bulunur.
5. Birim testleri yazılır: fetch mock, fake timers, T→W→T round-trip, W→T→W kanonik sözleşme fixture'ı, hata mesajı biçimi, 409/400/5xx/ağ hatası, kuyruk davranışı.

**Kapsam dışı**
- Backend'de hiçbir değişiklik yok (`backend/**` dokunulmaz).
- UI veya davranış değişikliği yok. Yeni modüller hiçbir bileşen, hook ya da store tarafından kullanılmaz.
- `localStorage`, `IndexedDB`, `.kopruq` kodu kaldırılmaz. `createProjectModule`, `familyRepository`, `graphStore`, `App.tsx`, `useProjectFile` değişmez (bunlar M5).
- React hook'ları (`useSaveStatus` vb.), singleton store örneği ve `app/project-session/{useProjectSession,projectSections,ProjectListDialog,SaveStatusIndicator}` M5'e kalır.
- Yeni npm bağımlılığı eklenmez (`package.json` değişmez). Mühendislik kuralı, varsayılan veya birim dönüşümü eklenmez.
- Mevcut testler değiştirilmez ve yeşil kalır.

## 2. Mevcut mimari (doğrulanmış)

### 2.1 Backend wire sözleşmesi (commit'li, gerçek kod)

**Ortak davranış**
- `ProjectRequestReader.read`: `FAIL_ON_UNKNOWN_PROPERTIES` açık ve `ACCEPT_FLOAT_AS_INT` kapalı. Bilinmeyen alan 400 `INVALID_REQUEST` döner, `errors[{field:"<yol>", message:"is not a known field"}]` ile (Jackson yalnızca ilk bilinmeyen alanı bildirir). Tip hatası `"has an invalid value"` verir. Gövde nesne değilse `body` / `"must be a JSON object"` döner.
- `SectionPutFlow.write`: `expectedRevision` yoksa `"expectedRevision"`/`"is required"`. `value` anahtarı yoksa `"value"`/`"is required"`. Mapper ihlallerinin yolu `value…` ile başlar.
- `ApiExceptionHandler` hata kodları:
  - 400 `INVALID_REQUEST` (alan ihlalleri)
  - 400 `MALFORMED_REQUEST_BODY` (`"The request body is missing or malformed."`)
  - 400 `INVALID_PARAMETER` (`"Parameter 'projectId' has an invalid value."`)
  - 404 `PROJECT_NOT_FOUND` (`ResourceNotFoundException.code()`)
  - 409 `PROJECT_REVISION_CONFLICT`
  - 500 `INTERNAL_ERROR`
- Gövde: `ApiErrorResponse(timestamp,status,error,code,message,path,correlationId,errors)`.
- `SectionChecks` mesajları: `"is required"`, `"must not be blank"`, `"must be a finite number"`, `"must be one of: A, B"`, `"duplicates <liste>[i].<alan>"`.
- Başarılı PUT yanıtı (`SectionWriteResponse<T>` ve `WorkspaceWriteResponse`) `{projectId, revision, updatedAt, value}` döner. `value` saklanan DTO'dur, null alanlar açık `null` olarak gelir (M2 D6).
- Tarihler ISO-8601 string olarak gelir ve `Z` ile biter (`ProjectApiContractTest.java:131`).

**Endpoint'ler (20 adet)**
- `GET /api/projects` → `ProjectSummaryResponse[]` = `{projectId,name,revision,createdAt,updatedAt}`.
- `POST /api/projects` gövdesi `{workspace}` (`CreateProjectRequest`), yanıt 201 `ProjectDocumentResponse`.
- `GET /api/projects/{projectId}` → `ProjectDocumentResponse`.
- 17 PUT:

| Bölüm | Path'ler |
|---|---|
| workspace | `/workspace` |
| tasarım sistemi | `/bridge-definitions`, `/families/{piers,pier-caps,foundations,bearings,materials}`, `/girder-library`, `/preferred-span-rules`, `/cross-section` |
| yükler | `/loads/{seismic,wind,temperature,self-weight,traffic-lm1,wind-snapshot}` |
| graph | `/graphs/{graphId}` (upsert; `value.id` ile path aynı olmalı, aksi halde `"must equal the graphId in the path"`; `null` → 400; silme yok) |

- `value: null` kabul edenler (bölümü temizler): `girder-library`, `preferred-span-rules`, `cross-section` ve 6 yük bölümü.
- `value: null` kabul etmeyenler: workspace, bridge-definitions, 5 family bölümü, graph.

**`ProjectDocumentResponse` anahtar sırası** (`ProjectDocumentResponse.java`, `ProjectApiContractTest.java:136`):
`projectId, revision, createdAt, updatedAt, workspace, bridgeDefinitions, families, girderLibrary, preferredSpanRules, crossSection, loads, graphs`.
- Hiç yazılmamış bölüm `null` gelir.
- `families` her zaman nesnedir: `{piers,pierCaps,foundations,bearings,materials}`, her üye ayrı ayrı nullable.
- `loads` her zaman nesnedir: `{seismic,wind,temperature,selfWeight,trafficLm1,windSnapshot}`, her üye nullable.
- `graphs` her zaman dizidir.

**Enum'lar (sabit adları)**
- `BridgeAxisType{ABUTMENT,PIER}`
- `ConstraintKind{ROAD_RAILWAY,RIVER,CLEARANCE,UTILITY,ENVIRONMENT,OTHER}`
- `PierFamilyType{RECTANGULAR,CIRCULAR,OVAL,BOX,H_SECTION,H_TYPE,WALL}`
- `PierCapType{RECTANGULAR,T_CAP}`
- `PierCapConfiguration{SINGLE_COLUMN,TWO_COLUMNS}`
- `FoundationFamilyType{SHALLOW,PILED}`
- `BearingFamilyType{ELASTOMERIC}`
- `ParameterProvenance{CODE_DEFAULT,NATIONAL_ANNEX,PROJECT_OVERRIDE}`
- `GraphParameterKind{NUMBER,BOOLEAN,STRING,NUMBER_ARRAY}`
- Workspace'te enum yerine etiketler kullanılır: `BridgeInventoryType` = "Precast Girder" | "Steel Composite Girder" | "Cantilever Bridge"; `InventoryPierShape` = "Rectangular" | "Circular" | "Box" | "Oval".
- `GraphDocument.SCHEMA_VERSION = 1`, `WindSnapshot.SCHEMA_VERSION = 1`.

**Kalıcılıkta null ile `[]` ayrımı korunuyor.** Kaynaklar: `PierFamilyEntity` `hasDimensions`, `hasAllowedConfigurations`, `*Present` bayrakları; `PierCapFamilyEntity` `*Present`; graph `groups` (M3 E9). H2, `-0.0` değerini `0.0`'a çevirir (M3 deviation 3).

### 2.2 Frontend (gerçek kod)

**Ortak katman**
- `src/shared/api/http.ts` şunları içerir: `API_BASE`, `ApiError{status,code,correlationId,fieldErrors,path}`, `toApiError` (önce gövde, sonra `X-Correlation-ID` başlığı), `requestJson`, `requestBinary`, `postJson`, `postForm`, `formatApiError`. **`putJson` yok.**
- `http.test.ts` deseni: `vi.stubGlobal('fetch', vi.fn(async () => json(...)))`, `afterEach(vi.unstubAllGlobals…)`.
- `src/shared/project-file/projectFileValidation.ts`: `ProjectFileValidationError` (`Invalid project file: <path> — <message>`, ilk 3 sorun + `(+N more)`), `formatIssuePath(prefix, path)`, `parseWithSchema`.
- `projectModuleStore.ts`: `ProjectModule<T>{id,key,parse,read,write(): boolean,reset}`. Aynı JSON'u yazmak no-op'tur.
- `useProjectModule.ts` `useSyncExternalStore` kullanır.

**Feature tipleri ve şemaları**
- **project**: `ProjectWorkspaceData` (tüm alanlar string; `environment` 2 nullable string), `BridgeRow` (`id?: string`, `girderDepthCm: number[]|null`, `girderNote: string|null`, `bridgeType: BridgeType` etiketi, `pierShape: PierShape` etiketi). Ayrıca `INITIAL_PROJECT`, `INITIAL_BRIDGES` (id yok), `normalizeProjectState(saved, fallbackBridges)` (`INITIAL_PROJECT` ile birleştirir, `normalizeUnitId`, `ensureBridgeIds`), `ensureBridgeIds` (boş veya tekrarlı id'yi rastgele yeniler).
- **bridge-definition**: `types.ts` (`BridgeInstanceDefinition`; UI alanları `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible`; `axisAssignments: Record<string, AxisFamilyAssignments>`; `abutmentFamilyIds{A1,A2}`), `BridgeDefinitionStore{keyBy?,selectedBridgeId,definitions}`. `store.ts` içinde `createBridgeDefinition` (UI varsayılanları: `selectedAxisId: null`, `selectedConstraintId: null`, `viewMode: 'PROFILE'`, `terrainVisible: true`), `mergeDefinition` (`selectedAxisId` = ilk aks), `ensureBridgeDefinitions(store, bridges)` var.
- **family-registry**: `familySchemas.ts` (`Loose<T> = Partial<T>&{id}`, passthrough; `pierType` enum'u eski `H_TYPE|WALL` değerlerini de kabul eder; `allowedConfigurations: z.array(text)`; `rule` alanları nullable; `dimension` alanları zorunlu). `familyRepository.ts` (`FamilyRepositoryCategory = 'PIER'|'PIER_CAP'|'FOUNDATION'|'BEARING'|'MATERIAL'`). Girder library: `girderLibraryProjectModule.ts` (şema `array | object passthrough`; reset `[]` yazar), `GirderLibraryPanel.tsx:66` `{enabled, dimensions}` yazar. Okuyucular `?.enabled ?? false` ve `?.dimensions ?? PRECAST_DIMENSIONS` kullanır.
- **Family tipleri**: `pier-families/model/types.ts` (`twoColumnSpacing: Dimension|null`, `heightApplicability` 4 nullable sayı, `source: 'PROJECT_DESIGN_SYSTEM'`), `pier-cap-families` (`Rule`, `stemWidth: Rule|null`), `foundation-families` (`shallowGeneration|null`, `piledGeneration|null`), `bearing-families` (`length/width/height: BearingRule`). Material satırı `MaterialsPanel.tsx:20-25` içinde: `{id,no,element,concreteClass}`. `Dimension{key,label,min,max,delta}` `shared/lib/parameterSweep.ts` içinde.
- **preferred-span**: `PreferredSpanRule` (`superstructureType: 'PRECAST_GIRDER'|'STEEL_GIRDER'` TS union'ı, zod'da `z.string()`; `source` literal).
- **superstructure-families**: `CrossSectionValues` (5 sayı), `INITIAL_CROSS_SECTION_VALUES`.
- **loads**: `loadsProjectModules.ts` (seismic/wind/temperature string nesneleri, self-weight 16 sayı, LM1 gevşek şema → `Lm1Parameters`). `api/trafficLoadsService.ts` (`ParameterValue{value:number|null, provenance, codeDefaultValue:number|null}`, `LaneFactor`, `Lm1Parameters`). `windTypes.ts` (`WindCalculationSnapshot{schemaVersion:1; status?: string; inputs{vb,terrain,ze,deckWidthM,drefM}; result: WindResult|null}`).
- **graph**: `domain/types.ts` (`KopruqGraph{id,name,schemaVersion:1,projectId?,bridgeId?,nodes,connections,groups?}`, `KopruqNode.parameters: Record<string, number|boolean|string|number[]>`, `GraphGroup{id,name,nodeIds,color}`). `state/graphSchema.ts` passthrough. `graphStore.ts` (`createEmptyGraph`; graph silme fonksiyonu yok).

**Mimari ve araç kuralları**
- `src/test/architecture/layerRules.test.ts`:
  - R1: `shared/**` → `features/`, `app/`, `pages/` import edemez.
  - R2: `features/**` → `app/`, `pages/` import edemez.
  - R4: `features/*/model/**` → `shared/ui` import edemez.
  - Test dosyaları muaf. İzin listesi boş.
- `sourceEncoding.test.ts`: cp1252 bozulma işaretleri yasak.
- `package.json` script'leri: `build` = `tsc -b && vite build`, `test` = `vitest run`, `lint` = `oxlint`. zod `^3.25.76`, vitest `^5.0.0`, jsdom.
- `vite.config.ts`: `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`.
- `tsconfig.app.json`: `strict`, `noUnusedLocals`, `verbatimModuleSyntax`, `erasableSyntaxOnly` (enum ve constructor parameter property yasak), `types: ["vite/client"]`. Bu yüzden `src` altında `node:fs` tip denetiminden geçmez.
- Projede şu ana kadar fake timer kullanılmamış. Yeni testler `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync` kullanacak.

## 3. Önerilen tasarım

### 3.1 Temel kararlar

- **D1 – Katmanlar.**
  - `shared/project-store` generic'tir. Yalnızca zod, `shared/api/http` ve `shared/project-file/projectFileValidation` (`formatIssuePath`) kullanır.
  - Feature mapper'ları kendi `model/` (graph için `state/`) klasöründedir. `shared/project-store` tiplerini (`SectionCodec`, `SectionDefinition`, `WireMappingError`) import ederler. Bu R1, R2 ve R4'e uyar.
  - Bölüm path'leri feature'ın `SectionDefinition`'ında durur, çünkü M5'te feature'lar modül yüklenirken `createServerSection` çağıracak ve `app` import edemez.
  - Doküman yükleyicisi 7 feature'ı birleştirdiği için `app/project-session/` içinde yer alır.
- **D2 – Strict yanıt şemaları.** Tüm wire zod nesneleri `.strict()` olur. Böylece bilinmeyen anahtar, frontend ile backend arasındaki kaymayı yüksek sesle bildirir (K8: "sessizce düşen alan = sessizce kaybolan veri"). Aynı repo ve aynı sürüm olduğu için additive alan riski kabul edilir (R11). Sayılar `z.number()` olur: zod 3 NaN'ı zaten reddeder, JSON'da Infinity olamaz. Tarihler `z.string()` olur (format sıkılaştırılmaz).
- **D3 – `toWire` saftır ve yalnızca DTO alanlarını DTO record sırasıyla kurar.** Opsiyonel her alan açık `null` gönderilir. UI-only ve passthrough alanlar düşer. Değer dönüşümü, birim dönüşümü veya yerel aralık/finite kontrolü yapılmaz. Sunucu tek otoritedir; NaN `JSON.stringify` ile `null` olur ve 400 alan yollu `rejected` döner. `toWire` yalnızca **temsil edilemeyen** girdide `WireMappingError` fırlatır: id'siz `BridgeRow`, legacy anahtarlı definition store'u, graph parametresinde 4 türe uymayan değer, temizlenemeyen bölüme `undefined`, graph silme.
- **D4 – `fromWire` null politikası.**
  - TS tipinde nullable olan alan `null` olarak kalır.
  - TS tipinde nullable olmayan ama frontend'de opsiyonel olan alan (Loose family alanları, `status?`, `projectId?`, `bridgeId?`, `groups?`) `null` geldiğinde **anahtarı yazılmaz**.
  - Bölüm seviyesinde `null` → `undefined` (hiç yazılmamış; bugünkü modül `read()` semantiği ve fallback'ler).
- **D5 – Normalizasyonlar.**
  - Workspace `fromWire`, `normalizeProjectState(wire, [])` üzerinden geçer. Wire tam olduğu için yalnızca `normalizeUnitId` etkilidir; `ensureBridgeIds` no-op'tur çünkü backend boş olmayan, tekil id garanti eder.
  - Bridge definitions `fromWire`, `ensureBridgeDefinitions` **çağırmaz**. Bu fonksiyon workspace ile uzlaştırma yapar, eşleşmeyen tanımları düşürür ve aksları yeniden hesaplar; saf ve kayıpsız bir yükleyicide yeri yoktur. Bugünkü `App.tsx` gibi M5 hydrate'te çağıracak.
- **D6 – Hata biçimi.** `ProjectDataValidationError` mesajı:
  `Invalid project data: <path> - <message>[; <path> - <message>…][ (+N more)]`
  - İlk 3 sorun listelenir. Ayraç üst plandaki gibi ASCII `" - "` olur (mevcut `.kopruq` hatası `" — "` kullanıyor, bilinçli olarak farklı).
  - GET dokümanında prefix `''` olur (`workspace.bridges[2].spansM[0]`), PUT yanıt değerinde `'value'`. Boş yol `(root)` olarak yazılır.
- **D7 – Yazma modeli (Q1, K4).**
  - Proje başına tek seri kuyruk; aynı anda en fazla 1 istek uçuşta.
  - Bölüm anahtarı (= path) ile birleştirme: gönderilmemiş girdi en yeni wire ile değişir ve **kuyruktaki ilk konumunu korur**.
  - Global trailing debounce `SAVE_DEBOUNCE_MS = 300`. Bu bir yazılım parametresidir ve enjekte edilebilir. Testler fake timers kullanır.
  - `expectedRevision` gönderim anında `session.revision`'dan alınır. 200 gelince revizyon yanıttan zincirlenir.
  - 409 → `conflict`; 400/422 → `rejected`; ağ hatası, 404, 5xx ve geçersiz 200 zarfı → `error`. Üç durumda da kuyruk durur.
  - Otomatik retry veya merge yok.
- **D8 – Ayna (mirror).** Her bölüm iki değer tutar: `confirmed {wire, value}` ve `current {wire, value}`.
  - `read()` senkron olarak `current.value`'yu döner; referansı kararlıdır.
  - `write` wire JSON'u `current.wire` ile aynıysa no-op'tur.
  - Onayda gönderilen wire sunucu değerine eşitse `current` referansı korunur. Böylece UI-only alanlar (ör. bridge definition seçimleri) korunur.
  - Ayna hiçbir yere kalıcı yazılmaz.
- **D9 – Graph'lar koleksiyon bölümüdür.** Graph başına PUT gider, yalnızca wire'ı değişen graph gönderilir. Koleksiyondan graph silinmesi `WireMappingError` olur (backend'de silme yok; frontend'de de `deleteGraph` yok).
- **D10 – Rüzgâr snapshot'ı (Q4).** `fromWire`, `WindSnapshotInputsValue = Omit<WindCalculationSnapshot,'result'>` döner. `result: null` uydurulmaz. Sonucun yeniden hesaplanması veya gösterimi M5'in işidir (R5).

### 3.2 Veri akışı (M5'te bağlanacak, M4'te yalnızca testlerde çalışır)

```
feature store (M5) --write(T)--> ServerSection --toWire--> WriteQueue (coalesce, debounce 300ms, serial)
     ^  read() sync                    |                         | putSection(projectId, path, session.revision, wire)
     |                                 |<-- onConfirmed(server)--| 200 -> session.setRevision(resp.revision)
     |<---------- hydrate(T) <---------+  <-- loadProjectDocument(GET json) (pure, all-or-nothing)
```

### 3.3 Genel API'ler (TypeScript taslakları)

**`src/shared/api/http.ts` (değişiklik)**
```ts
export function putJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T>
// requestJson<T>(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
```

**`src/shared/project-store/projectDataValidation.ts` (yeni)**
```ts
export type ProjectDataIssue = { path: string; message: string }
export class ProjectDataValidationError extends Error {   // erasableSyntaxOnly: alanlar gövdede atanır
  readonly issues: ProjectDataIssue[]; readonly path: string
}
export function parseProjectData<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown, prefix: string): T
/** toWire bir değeri temsil edemediğinde. message: `Cannot send project data: <path> - <message>` */
export class WireMappingError extends Error { readonly path: string }
```

**`src/shared/project-store/projectApi.ts` (yeni)**
```ts
export type ProjectSummary = { projectId: string; name: string; revision: number; createdAt: string; updatedAt: string }
export type SectionWriteEnvelope = { projectId: string; revision: number; updatedAt: string; value: unknown }
export const projectSummarySchema    // strict
export const sectionWriteEnvelopeSchema  // strict; value: z.unknown()
export function listProjects(signal?: AbortSignal): Promise<ProjectSummary[]>          // GET /api/projects
export function createProject(body: { workspace: unknown }, signal?: AbortSignal): Promise<unknown> // POST; ham doküman JSON'u
export function getProjectDocument(projectId: string, signal?: AbortSignal): Promise<unknown>    // GET /api/projects/{id}
export function putSection(projectId: string, path: string, expectedRevision: number, value: unknown, signal?: AbortSignal): Promise<SectionWriteEnvelope>
// URL: `/api/projects/${encodeURIComponent(projectId)}/${path}`; gövde tam olarak { expectedRevision, value }
export type ProjectApi = { listProjects; createProject; getProjectDocument; putSection }
export const projectApi: ProjectApi
```
Doküman şeması feature'lara bağlı olduğu için doğrulama `app` yükleyicisinde yapılır. `shared` katmanı ham `unknown` döndürür.

**`src/shared/project-store/projectSession.ts` (yeni)**
```ts
export type SaveStatus = 'idle' | 'saving' | 'error' | 'rejected' | 'conflict'
export type ProjectSessionSnapshot = Readonly<{
  projectId: string | null; revision: number | null; status: SaveStatus
  pendingCount: number; failedKey: string | null; lastError: unknown   // ApiError | ProjectDataValidationError | WireMappingError | Error | null
}>
export interface ProjectSession {
  getSnapshot(): ProjectSessionSnapshot   // değişene kadar aynı referans (useSyncExternalStore için)
  subscribe(listener: () => void): () => void
  begin(projectId: string, revision: number): void   // status idle, hata temizlenir
  end(): void
  setRevision(revision: number): void
  update(patch: Partial<Pick<ProjectSessionSnapshot, 'status' | 'pendingCount' | 'failedKey' | 'lastError'>>): void // kuyruk kullanır
}
export function createProjectSession(): ProjectSession
```

**`src/shared/project-store/writeQueue.ts` (yeni)**
```ts
export const SAVE_DEBOUNCE_MS = 300
export type QueuedWrite = {
  key: string            // birleştirme anahtarı = path (ör. 'families/piers', 'graphs/<id>')
  path: string
  wire: unknown          // JSON değer; null = temizle
  valueSchema: z.ZodTypeAny            // yanıt `value` doğrulaması (strict)
  onConfirmed(serverWire: unknown, sentWire: unknown): void
  onDiscarded(): void
}
export type WriteQueueOptions = { session: ProjectSession; putSection?: ProjectApi['putSection']; debounceMs?: number }
export interface WriteQueue {
  enqueue(write: QueuedWrite): void
  reportLocalRejection(key: string, error: WireMappingError): void   // status 'rejected', durur, istek yok
  flush(): Promise<void>    // debounce iptal, boşalana kadar gönder; hata/durmuş durumda lastError ile reject
  retry(): Promise<void>    // 'error' | 'rejected' için baştaki girdiden devam; 'conflict' için istek atmadan reject
  discard(): void           // uçuşta olmayan tüm girdileri düşür, sırayla onDiscarded, status idle
  reset(): void             // nesil++, timer iptal, callback çağırmadan hepsini düşür; uçuştaki yanıt yok sayılır
  pendingKeys(): string[]
}
export function createWriteQueue(options: WriteQueueOptions): WriteQueue
```

Durum makinesi:

| Durum | Ne zaman | Yeni `enqueue` | `retry` | `discard` | `flush` |
|---|---|---|---|---|---|
| `idle` | kuyruk boş, hata yok | → `saving`, timer başlar | resolve (no-op) | no-op | resolve |
| `saving` | girdi var (debounce bekleniyor veya uçuşta) | birleştir/ekle, timer yeniden başlar | – | uçuşta olmayanları düşürür | hemen pompalar |
| `error` | ağ hatası / 404 / 5xx / geçersiz zarf | birleştir/ekle, **gönderme** | baştan pompala | hepsini geri al → `idle` | `lastError` ile reject |
| `rejected` | 400/422 veya `reportLocalRejection` | aynı (başarısız girdinin wire'ı en yeniyle değişir) | aynı | aynı | aynı |
| `conflict` | 409 | aynı | istek atmadan 409 hatasıyla reject | aynı (M5 ardından yeniden yükler) | aynı |

Ek kurallar:
- 200 gelince `session.setRevision(env.revision)`, girdi kaldırılır, `onConfirmed(value, sentWire)` çağrılır. Kuyrukta girdi kaldıysa ve timer çalışmıyorsa pompalama sürer; timer çalışıyorsa onu bekler.
- Yanıt `value` doğrulaması başarısız olursa: revizyon yine güncellenir (sunucu yazdı), girdi kaldırılır, `onConfirmed(sentWire, sentWire)` çağrılır (backend sözleşmesi gereği saklanan = gönderilen), status `error` + `ProjectDataValidationError` olur ve kuyruk durur (kayma görünür olur).
- Aktif proje yokken `enqueue` `Error('No active project')` fırlatır. `ServerSection.write` bunu önceden kontrol edip `false` döner.

**`src/shared/project-store/serverSection.ts` (yeni)**
```ts
export type SectionCodec<T, W> = {
  schema: z.ZodType<W | null, z.ZodTypeDef, unknown>   // backend'in döndürdüğü değer (null dahil)
  clearable: boolean                                    // PUT `value: null` kabul eder mi
  toWire(value: T): W | null                             // yalnızca clearable codec null döndürebilir (girder `[]`)
  fromWire(wire: W | null): T | undefined
}
export type SectionDefinition<T, W> = { id: string; path: string; codec: SectionCodec<T, W> }
export interface ServerSection<T> {
  readonly id: string; readonly path: string
  read(): T | undefined
  write(next: T | undefined): boolean   // false: aktif proje yok | WireMappingError | temizlenemeyen bölüme undefined
  hydrate(value: T | undefined): void   // confirmed = current = value; wire = toWire(value); bildirim; ağ yok
  discard(): void                        // current = confirmed; bildirim
  subscribe(listener: () => void): () => void
}
export function createServerSection<T, W>(definition: SectionDefinition<T, W>, deps: { queue: WriteQueue; session: ProjectSession }): ServerSection<T>

export type CollectionCodec<T, W> = { schema: z.ZodType<W, z.ZodTypeDef, unknown>; idOf(item: T): string; toWire(item: T): W; fromWire(wire: W): T }
export type CollectionDefinition<T, W> = { id: string; pathOf(itemId: string): string; codec: CollectionCodec<T, W> }
export interface ServerSectionCollection<T> {
  list(): readonly T[]; get(id: string): T | undefined
  write(next: readonly T[]): boolean    // yalnızca eklenen/değişen öğeler için enqueue; silme → reportLocalRejection, false
  hydrate(items: readonly T[]): void; discard(): void   // hiç onaylanmamış yeni öğe discard'da listeden çıkar
  subscribe(listener: () => void): () => void
}
export function createServerSectionCollection<T, W>(definition: CollectionDefinition<T, W>, deps: { queue: WriteQueue; session: ProjectSession }): ServerSectionCollection<T>
```

`write(next)` adımları:
1. `session.projectId == null` ise `false`.
2. `wire = next === undefined ? (clearable ? null : WireMappingError) : toWire(next)`. Hata olursa `queue.reportLocalRejection` çağrılır ve `false` döner.
3. `JSON.stringify(wire) === JSON.stringify(current.wire)` ise `true` döner; bildirim ve istek yoktur.
4. Aksi halde `current = {wire, value: next}`, bildirim yapılır, `enqueue` çağrılır ve `true` döner.

`onConfirmed(server, sent)` kuralları:
- `current.wire` hâlâ `sent` ise (daha yeni düzenleme yoksa):
  - `server ≡ sent` → `confirmed = current` (referans korunur).
  - değilse → `current = confirmed = {server, fromWire(server)}`, bildirim yapılır.
- Daha yeni düzenleme varsa → yalnızca `confirmed = {server, fromWire(server)}`.

`onDiscarded` → `current = confirmed`, bildirim.

**`src/app/project-session/projectDocument.ts` (yeni)**
```ts
export const projectDocumentSchema  // strict; 12 anahtar backend sırasıyla
export type LoadedProjectDocument = {
  projectId: string; revision: number; createdAt: string; updatedAt: string
  workspace: PersistedProjectState | undefined
  bridgeDefinitions: BridgeDefinitionStore | undefined
  families: { [C in FamilyRepositoryCategory]: FamilyRecordOf<C>[] | undefined }
  girderLibrary: GirderLibraryValue | undefined
  preferredSpanRules: PreferredSpanRule[] | undefined
  crossSection: CrossSectionValues | undefined
  loads: { seismic: SeismicInputs | undefined; wind: WindInputs | undefined; temperature: TemperatureInputs | undefined
           selfWeight: SelfWeightInputs | undefined; trafficLm1: Lm1Parameters | undefined; windSnapshot: WindSnapshotInputsValue | undefined }
  graphs: KopruqGraph[]
}
/** Saf, ya hep ya hiç: geçersizse ProjectDataValidationError, hiçbir store'a, storage'a veya event'e dokunmaz. */
export function loadProjectDocument(json: unknown): LoadedProjectDocument
/** 16 statik bölüm, PUT path sırasıyla; M5 bunlardan ServerSection kurar. */
export const PROJECT_SECTION_DEFINITIONS: readonly SectionDefinition<any, any>[]
export const GRAPH_COLLECTION_DEFINITION: CollectionDefinition<KopruqGraph, GraphWire>
/** POST /api/projects gövdesi (K7: istemci INITIAL_PROJECT + bridges [] gönderir). */
export function createProjectRequestBody(state: PersistedProjectState): { workspace: WorkspaceWire }
```

### 3.4 Feature wire mapper'ları: alan tabloları

Gösterim: **W** = wire alanı, **F** = frontend alanı, "req" = null olamaz, "null" = nullable, "omit" = `fromWire`'da `null` gelirse anahtar yazılmaz.

**(1) `features/project/model/projectWorkspaceWire.ts`**
Exports: `workspaceWireSchema`, `WorkspaceWire`, `workspaceToWire(state: PersistedProjectState)`, `workspaceFromWire(w): PersistedProjectState`, `WORKSPACE_SECTION` (id `workspace`, path `workspace`, clearable `false`).

| F | W | Nullability / tür |
|---|---|---|
| `project.{name,id,client,designer,country,region,projectType,status,startDate,targetDate,description,locationStart,locationEnd,coordinateSystem,designStandardFamily,concreteCode,steelCode,compositeCode,seismicCode,geotechnicalCode,trafficLoadStandard,lastModified}` | aynı ad | string, req (boş string geçerli). `project.id` kullanıcıya görünen proje kodudur, `name` → `project.project_name` |
| `project.units.{length,force,moment,stress,mass,temperature}` | aynı | string, req; `fromWire` sonrası `normalizeUnitId` |
| `project.coordinate.{name,epsg,horizontalDatum,verticalDatum,originX,originY,originZ,northAngle}` | aynı | string, req |
| `project.criteria.{designLife,reliabilityClass,exposure,concreteClass,cover,philosophy}` | aynı | string, req |
| `project.environment.{terrainDatasetId,landXmlImportId}` | aynı | string, null (nesne req) |
| `bridges[i].id` (TS `?`) | `id` | string, req, boş olamaz, tekil. Yoksa veya boşsa `WireMappingError('bridges[i].id')` |
| `no,km,crossingType,terrain,status` | aynı | string, req |
| `estimatedLengthM, roadWidthM` | aynı | number, req |
| `bridgeType` | aynı | enum etiket: `'Precast Girder'\|'Steel Composite Girder'\|'Cantilever Bridge'` |
| `spansM` | aynı | number[], req |
| `girderDepthCm` (cm) | aynı | number[], null |
| `girderNote` | aynı | string, null |
| `pierShape` | aynı | enum etiket: `'Rectangular'\|'Circular'\|'Box'\|'Oval'` |

Birim dönüşümü yok (`girderDepthCm` cm olarak kalır).

**(2) `features/bridge-definition/model/bridgeDefinitionWire.ts`**
Exports: `bridgeDefinitionsWireSchema`, `BridgeDefinitionsWire`, `bridgeDefinitionsToWire(store)`, `bridgeDefinitionsFromWire(w): BridgeDefinitionStore`, `BRIDGE_DEFINITIONS_SECTION` (path `bridge-definitions`, clearable `false`).
- `toWire`: `store.keyBy !== 'bridgeId'` ise `WireMappingError('keyBy', 'must be bridgeId')`. Tanımlar `Object.entries(definitions)` sırasıyla gönderilir.
- `fromWire` şunu kurar: `{keyBy:'bridgeId', selectedBridgeId: null, definitions}`. UI alanları `createBridgeDefinition`/`mergeDefinition` ile aynı değerleri alır: `selectedAxisId = axes[0]?.id ?? null`, `selectedConstraintId: null`, `viewMode: 'PROFILE'`, `terrainVisible: true`. Bu değerler mapper'da sabittir; bir test bunların `createBridgeDefinition(row)` çıktısıyla eşit kaldığını doğrular (`store.ts` değişmez).

| F | W | Nullability / tür |
|---|---|---|
| `definitions` anahtarı | `definitionKey` | string, req, boş olamaz, tekil |
| `bridgeId` | aynı | string, req |
| `spanLengthsM` (m) | aynı | number[], req |
| `axes[].{id,name}` | aynı | string, req |
| `axes[].type` | aynı | `ABUTMENT\|PIER` |
| `axes[].chainageM` | aynı | number, req |
| `axes[].{elevationM,skewDegrees}` | aynı | number, null (`?? null` ile açık) |
| `superstructureType` | aynı | string, req |
| `girderFamilyId, girderVariantId` | aynı | string, null |
| `girderCount, deckWidthOverrideM` | aynı | number, null |
| `axisAssignments` (Record) | `axisAssignments[]` liste, `axisId` = Record anahtarı (boş olamaz, tekil), sıra `Object.entries` | – |
| …`pierFamilyId,pierCapFamilyId,foundationFamilyId,bearingFamilyId` | aynı | string, null |
| …`pierHeightM,foundationElevationM,bearingQuantity` | aynı | number, null |
| …`soilReference,bearingOrientation,longitudinalBehavior,transverseBehavior` | aynı | string, req |
| `abutmentFamilyIds.{A1,A2}` | `{A1,A2}` | string, null (nesne req) |
| `constructionMethod, constructionStagesNote` | aynı | string, req |
| `constraints[].{id,name,note}` | aynı | string, req |
| `constraints[].kind` | aynı | `ROAD_RAILWAY\|RIVER\|CLEARANCE\|UTILITY\|ENVIRONMENT\|OTHER` |
| `constraints[].{startChainageM,endChainageM}` | aynı | number, null |
| `keyBy, selectedBridgeId, selectedAxisId, selectedConstraintId, viewMode, terrainVisible` | **gönderilmez** | UI-only (K5) |

**(3) `features/family-registry/model/familyWire.ts`** (5 kategori + girder library)

Ortak yapılar:
- `sweepDimensionWireSchema {key,label: string req; min,max,delta: number req}` ↔ `Dimension` (birim yalnızca `label`'da).
- `rangeRuleWireSchema {min,max,delta: number|null}` ↔ `Rule`/`FoundationRule`/`BearingRule`.

Kayıt tipleri, Loose ve geniş türlerle:
- `PierFamilyRecord = {id} & Partial<Omit<PierFamily,'pierType'|'allowedConfigurations'|'source'>> & {pierType?: PierType|'H_TYPE'|'WALL'; allowedConfigurations?: string[]; source?: string}`
- `PierCapFamilyRecord`, `FoundationFamilyRecord`, `BearingFamilyRecord` (`source?: string`)
- `MaterialAssignmentRecord = {id; no?: number; element?: string; concreteClass?: string}`
- `FamilyRecordOf<C>`

Exports: `familiesWireSchema` (strict `{piers,pierCaps,foundations,bearings,materials}`, her biri `list.nullable()`), kategori başına `…ToWire`/`…FromWire`, `FAMILY_SECTIONS: { [C in FamilyRepositoryCategory]: SectionDefinition<FamilyRecordOf<C>[], …> }`. Path'ler: `families/piers`, `families/pier-caps`, `families/foundations`, `families/bearings`, `families/materials`. Hepsi clearable `false`. Bölüm `null` → `undefined` (INITIAL fallback), `[]` → `[]`.

| Kategori | W alanı (DTO sırası) | Tür | `fromWire` null |
|---|---|---|---|
| Pier | `id` | string, req, boş olamaz, tekil | – |
| | `name` | string\|null | omit |
| | `pierType` | `RECTANGULAR\|CIRCULAR\|OVAL\|BOX\|H_SECTION\|H_TYPE\|WALL`\|null (legacy değerler korunur; dönüşüm yok) | omit |
| | `enabled` | boolean\|null | omit |
| | `source` | string\|null | omit |
| | `dimensions` | SweepDimension[]\|null | omit |
| | `allowedConfigurations` | string[]\|null | omit |
| | `twoColumnSpacing` | SweepDimension\|null | **null kalır** |
| | `heightApplicability` | `{minimumHeight,preferredHeightMin,preferredHeightMax,maximumHeight: number\|null}`\|null (m) | omit |
| PierCap | `id,name,capType(RECTANGULAR\|T_CAP),compatiblePierConfiguration(SINGLE_COLUMN\|TWO_COLUMNS),enabled,source` | yukarıdaki gibi | omit |
| | `capTransverseLength, capStructuralHeight` | Rule\|null (m) | omit |
| | `stemWidth` | Rule\|null | **null kalır** |
| Foundation | `id,name,foundationType(SHALLOW\|PILED),enabled,source` | | omit |
| | `shallowGeneration` | `{lengthX,lengthY,height: Rule req}`\|null | **null kalır** |
| | `piledGeneration` | `{pileDiameter,pileCountX,pileSpacingX,pileCountY,pileSpacingY,height: Rule req}`\|null | **null kalır** |
| Bearing | `id,name,bearingType(ELASTOMERIC),enabled,source` | | omit |
| | `length,width,height` | Rule\|null (mm) | omit |
| Material | `id` | req | – |
| | `no` | number\|null | omit |
| | `element, concreteClass` | string\|null | omit |

Ek kurallar:
- `toWire` her alanı açık `null` ile gönderir.
- passthrough ve bilinmeyen alanlar düşer (K8).
- Kategori içinde tekrarlı id yerelde denetlenmez; backend 400 döner (`duplicates value[0].id`).

**Girder library**
- Exports: `GirderLibraryValue = { enabled?: boolean; dimensions?: Dimension[] }`, `girderLibraryWireSchema = {enabled: boolean|null, dimensions: SweepDimension[]|null}.strict()`, `GIRDER_LIBRARY_SECTION` (path `girder-library`, clearable `true`).
- `toWire(v: unknown[] | GirderLibraryValue)`: herhangi bir dizi (bugünkü reset `[]` dahil) → `null`; nesne → `{enabled: v.enabled ?? null, dimensions: v.dimensions ?? null}`.
- `fromWire`: `null` → `undefined`; nesnede null üyeler omit edilir.
- Okuyucuların `?.enabled ?? false` / `?.dimensions ?? PRECAST_DIMENSIONS` davranışı aynı kalır.

**(4) `features/preferred-span/model/preferredSpanWire.ts`**
`PreferredSpanRule[]` ↔ `[{id, superstructureType, girderVariantId: string req; minSpan, maxSpan, spanDelta, primarySpan: number req (m); enabled: boolean req; source: string req}] | null`.
- `superstructureType` ve `source` wire'da `z.string()`'dir; `fromWire` mevcut modül gibi tipe cast eder. Bilinmeyen string gelirse doğrulanmaz (bugünkü davranışla aynı).
- `null` → `undefined`, `[]` → `[]`.
- `PREFERRED_SPAN_RULES_SECTION`: path `preferred-span-rules`, clearable `true`.

**(5) `features/superstructure-families/model/crossSectionWire.ts`**
`CrossSectionValues` ↔ `{platformWidthM, leftWalkwayM, rightWalkwayM, spaceOfGirderM, numberOfGirders: number req} | null`.
- `null` → `undefined` (`INITIAL_CROSS_SECTION_VALUES` fallback'i M5'te).
- `CROSS_SECTION_SECTION`: path `cross-section`, clearable `true`.

**(6) `features/loads/model/loadsWire.ts`**
Tipler mevcut modüllerden türetilir: `SeismicInputs = NonNullable<ReturnType<typeof SEISMIC_INPUTS_MODULE.read>>` vb. Exports: `loadsWireSchema` (strict, 6 nullable üye), 6 `…_SECTION` (path'ler `loads/seismic|wind|temperature|self-weight|traffic-lm1|wind-snapshot`, hepsi clearable `true`), `WindSnapshotInputsValue`.

| Bölüm | W | Not |
|---|---|---|
| seismic | `{a,g,t,i: string req}` | yazıldığı gibi (Q3) |
| wind | `{vb,terrain,ze: string req}` | |
| temperature | `{min,max,t0: string req}` | |
| selfWeight | 16 `number` req: `asphaltThicknessM, asphaltUnitWeightKNm3, sidewalkThicknessM, sidewalkUnitWeightKNm3, faciaCount, faciaWidthM, faciaThicknessM, faciaUnitWeightKNm3, guardrailCount, guardrailUnitLoadKNm, pedestrianRailingCount, pedestrianRailingUnitLoadKNm, protectiveFenceCount, protectiveFenceUnitLoadKNm, soundPanelCount, soundPanelUnitLoadKNm` | adlar ve birimler aynı |
| trafficLm1 | `{tandemSystem: Lane[] req, udl: Lane[] req, remainingAreaUdl: Lane req}`; `Lane{label: string req, characteristicValue: PV req, adjustmentFactor: PV req}`; `PV{value: number\|null, provenance: CODE_DEFAULT\|NATIONAL_ANNEX\|PROJECT_OVERRIDE, codeDefaultValue: number\|null}` | `Lm1Parameters`; PV null'ları korunur |
| windSnapshot | `{schemaVersion: 1, status: string\|null, inputs{vb,terrain,ze: string; deckWidthM, drefM: number}}` | `toWire` `result`'ı düşürür. `status` yoksa `null` gönderilir; `fromWire`'da `null` → omit. Dönüş tipi `Omit<WindCalculationSnapshot,'result'>` (D10) |

**(7) `features/graph/state/graphWire.ts`**
Exports: `graphWireSchema`, `GraphWire`, `graphToWire(g: KopruqGraph)`, `graphFromWire(w): KopruqGraph`, `GRAPH_COLLECTION` (`pathOf: id => 'graphs/' + encodeURIComponent(id)`, `idOf: g => g.id`).

| F | W | Not |
|---|---|---|
| `id, name` | aynı | string req; `id` = path |
| `schemaVersion` | `1` literal | |
| `projectId?` | `projectId` string\|null | `toWire` `?? null`; `fromWire` omit |
| `bridgeId?` | `bridgeId` string\|null | aynı |
| `nodes[].{id,type,name}` | aynı | string req |
| `nodes[].position{x,y}` | aynı | number req |
| `nodes[].parameters` (Record) | `[{key, kind, value}]`, sıra `Object.entries` | number → `NUMBER`; boolean → `BOOLEAN`; string → `STRING`; `Array.isArray` ve her eleman `typeof 'number'` → `NUMBER_ARRAY` (`[]` dahil). Diğer her şey (null, nesne, karışık dizi) → `WireMappingError('nodes[i].parameters.<key>')` |
| `connections[]` | `{id, sourceNodeId, sourcePortId, targetNodeId, targetPortId}` | string req |
| `groups?` | `groups` `[{id,name,nodeIds: string[],color}]`\|null | `undefined` ↔ `null` (omit); `[]` korunur |

Wire zod şeması `z.discriminatedUnion('kind', …)` kullanır: `NUMBER` → `z.number()`, `BOOLEAN` → `z.boolean()`, `STRING` → `z.string()`, `NUMBER_ARRAY` → `z.array(z.number())`. `activeGraphId`, undo/redo, run validity ve görünüm tercihleri gönderilmez.

## 4. Alternatifler

| Alternatif | Karar |
|---|---|
| Section path'lerini `app` kaydında tutmak | Reddedildi. M5'te feature'lar `ServerSection`'ı modül yüklenirken kurar ve `app` import edemez (R2). |
| Doküman yükleyicisini `shared`'a koymak | Reddedildi. Feature şemalarına bağımlı (R1). |
| Response şemalarında `strip`/passthrough | Reddedildi (D2). Kaymayı sessizce yutar. |
| Yük, family ve bridge `fromWire`'ında `ensureBridgeDefinitions` çağırmak | Reddedildi. Workspace ile uzlaştırma kayıplıdır ve saf yükleyicinin işi değildir; M5 hydrate'te yapılır. |
| `toWire`'da yerel finite/aralık kontrolü | Reddedildi. Sunucu otoritedir, alan yollu 400 zaten var; tekrar mantığı ve mühendislik çağrışımı riski taşır. |
| Bölüm başına ayrı kuyruk veya paralel PUT | Reddedildi. Proje seviyesinde revizyon seri gönderimi gerektirir (aksi halde kendi yazmalarından 409 alınır). |
| `@tanstack/react-query` `useMutation` | M5'te liste için kullanılacak. Kuyruk senkron ayna ve birleştirme istediği için düz modül olarak kalır. |
| Backend Java DTO'larını vitest içinde okuyan otomatik sözleşme testi | Reddedildi. `tsconfig.app.json` `types: ["vite/client"]` olduğu için `node:fs` tip denetiminden geçmez; root dışı `import.meta.glob` doğrulanmadı. Yerine elle yazılmış kanonik doküman fixture'ı kullanılır (ucuz, backend değişikliği yok). |
| `store.ts`'ten UI varsayılanlarını export etmek | Gereksiz. Mapper'da sabit değerler ve eşitlik testi yeterli; mevcut dosya değişmez. |

Seçilen yaklaşım üst planın 3.4 tasarımının en küçük uygulanabilir hâlidir. Yalnızca graph için generic bir koleksiyon varyantı eklendi (graph başına PUT, üst plan M5).

## 5. Sıralı görevler

1. **`http.ts` + test.** `putJson` eklenir. `http.test.ts`'e iki test: PUT method/başlık/gövde/signal ile 200 JSON; 409 gövdesinden `ApiError{status:409, code:'PROJECT_REVISION_CONFLICT'}`. Mevcut testler aynen kalır.
2. **`shared/project-store/projectDataValidation.ts` + test.** `parseProjectData`, `ProjectDataValidationError` (D6 biçimi, `(root)`, `(+N more)`), `WireMappingError`. `formatIssuePath` `../project-file/projectFileValidation`'dan import edilir.
3. **`projectApi.ts` + test.** 4 fonksiyon, strict özet ve zarf şemaları, `encodeURIComponent`. Testlerde fetch mock ile URL, method, gövde (`{expectedRevision, value}`, `value: null` dahil) ve hata yayılımı (400/404/409/500, ağ `TypeError`) doğrulanır.
4. **`projectSession.ts` + test.** Snapshot referans kararlılığı, `subscribe`/`unsubscribe`, `begin`/`end`/`setRevision`/`update`.
5. **`writeQueue.ts` + test.** Görev 3–4'e bağlı. D7 ve durum makinesi. Testlerde `putSection` enjekte edilir, fake timers kullanılır.
6. **`serverSection.ts` + test.** Görev 5'e bağlı. `createServerSection` ve `createServerSectionCollection`, sentetik zod codec ile.
7. **7 wire mapper + test** (görev 2 ve 6'daki tiplere bağlı; birbirinden bağımsız):
   `features/project/model/projectWorkspaceWire.ts`, `features/bridge-definition/model/bridgeDefinitionWire.ts`, `features/family-registry/model/familyWire.ts`, `features/preferred-span/model/preferredSpanWire.ts`, `features/superstructure-families/model/crossSectionWire.ts`, `features/loads/model/loadsWire.ts`, `features/graph/state/graphWire.ts`.
8. **`app/project-session/projectDocumentFixtures.ts`** (görev 7'ye bağlı). `CANONICAL_PROJECT_DOCUMENT_JSON` (12 anahtarın hepsi dolu; `H_TYPE`, 4 parametre türü, `groups: null` ve `[]`, LM1 null'ları, `status: null`, `girderDepthCm: null`, `environment` null'ları) ve `NEW_PROJECT_DOCUMENT_JSON` (`POST` 201 şekli: workspace dolu, diğer her şey null; `families`/`loads` nesneleri null üyeli; `graphs: []`). Başlık yorumunda kaynak DTO dosyaları belirtilir.
9. **`app/project-session/projectDocument.ts` + `projectDocument.test.ts`.** Şema, `loadProjectDocument`, `PROJECT_SECTION_DEFINITIONS` (16), `GRAPH_COLLECTION_DEFINITION`, `createProjectRequestBody`.
10. **Dokümanlar.** `docs/architecture.md`'e "BACKEND-DB-PERSISTENCE M4" bölümü eklenir (katman, D1–D10, M5'e devredilenler). `docs/roadmap.md`'de M4 `[x]` yapılır. Mevcut çalışma ağacı değişiklikleri korunur, yalnızca ekleme yapılır.
11. **Kontroller.** `cd frontend && npm run build && npm test && npm run lint`. Ayrıca `git status --short -- backend frontend/package.json frontend/package-lock.json` boş olmalı.

**Dosya listesi**
- Değişecek (yalnızca bunlar): `frontend/src/shared/api/http.ts`, `frontend/src/shared/api/http.test.ts`, `docs/architecture.md`, `docs/roadmap.md`.
- Yeni production dosyaları (15):
  - `frontend/src/shared/project-store/{projectDataValidation,projectApi,projectSession,writeQueue,serverSection}.ts`
  - 7 feature dosyası:
    - `frontend/src/features/project/model/projectWorkspaceWire.ts`
    - `frontend/src/features/bridge-definition/model/bridgeDefinitionWire.ts`
    - `frontend/src/features/family-registry/model/familyWire.ts`
    - `frontend/src/features/preferred-span/model/preferredSpanWire.ts`
    - `frontend/src/features/superstructure-families/model/crossSectionWire.ts`
    - `frontend/src/features/loads/model/loadsWire.ts`
    - `frontend/src/features/graph/state/graphWire.ts`
  - `frontend/src/app/project-session/{projectDocument,projectDocumentFixtures}.ts`
- Yeni testler (13): yukarıdaki 5 shared dosyası + 7 feature dosyası + `projectDocument` için birer `*.test.ts`.

## 6. Kabul kriterleri

Üst plandaki AC15 burada AC4–AC12'ye, AC16 ise AC13–AC17'ye bölündü.

- **AC1** – `putJson('/p', body, signal)` fetch'i şu argümanlarla çağırır: `${API_BASE}/p`, `method: 'PUT'`, `Content-Type: application/json`, `body === JSON.stringify(body)`, aynı `signal`. 2xx'te JSON döner. 409 gövdesi `ApiError{status:409, code:'PROJECT_REVISION_CONFLICT', correlationId}` olur.
- **AC2** – `projectApi`:
  - `listProjects` → `GET /api/projects`.
  - `createProject(b)` → `POST /api/projects`, gövde `{"workspace":…}`.
  - `getProjectDocument(id)` → `GET /api/projects/{encodeURIComponent(id)}`.
  - `putSection(id,'families/pier-caps',7,v)` → `PUT /api/projects/{id}/families/pier-caps`, gövde tam olarak `{"expectedRevision":7,"value":v}`; `v = null` iken `"value":null` gönderilir.
  - Özet veya zarfta bilinmeyen anahtar ya da yanlış tip → `ProjectDataValidationError`.
- **AC3** – Hata biçimi:
  - Mesaj tam olarak `Invalid project data: workspace.bridges[0].spansM[0] - <zod mesajı>` biçimindedir.
  - 4 ve üzeri sorunda ilk 3 listelenir ve ` (+N more)` eklenir; `issues` ve `path` alanları dolu olur.
  - Boş yol `(root)` yazılır.
  - `WireMappingError` mesajı `Cannot send project data: <path> - <message>` biçimindedir.
- **AC4** – Debounce ve birleştirme: aynı anahtara 300 ms içinde 3 yazma → 299 ms'de 0 istek, 300 ms'de tam 1 PUT, son değerle.
- **AC5** – Seri gönderim ve revizyon zinciri: iki farklı bölüm → ikinci PUT birincinin yanıtı gelmeden başlamaz. `expectedRevision` değerleri `r` ve `r+1` olur (birinci yanıtın `revision`'ı). Kendi yazmalarından 409 alınmaz. Sonunda `session.revision === r+2`.
- **AC6** – Uçuştayken aynı bölüme yeni yazma → birinci tamamlanınca debounce sonrası ikinci PUT yeni değer ve zincirlenmiş revizyonla gider. Gönderilmemiş girdi birleştirilirken kuyruktaki konumunu korur.
- **AC7** – 409:
  - `status === 'conflict'`, `lastError.code === 'PROJECT_REVISION_CONFLICT'`, `failedKey` dolu.
  - Sonraki timer'lar ve yeni yazmalar hiçbir istek göndermez.
  - `retry()` istek atmadan reject olur.
  - `discard()` sonrası bölümlerin `read()` değeri son onaylı değere döner, abonelere bildirilir, `status === 'idle'`, `pendingCount === 0`.
  - Otomatik merge veya retry yok.
- **AC8** – 400:
  - `status === 'rejected'`, `lastError.fieldErrors` sunucu `errors[]`'ı içerir; kuyruk durur.
  - Aynı bölüme yeni yazma başarısız girdiyi günceller ama göndermez.
  - `retry()` en yeni değeri tek PUT ile gönderir; başarıda `idle`.
  - `discard()` geri alır.
- **AC9** – Ağ hatası (`fetch` reject), 404 ve 500:
  - `status === 'error'`, bekleyen girdiler korunur (`pendingKeys()` dolu), `formatApiError(lastError)` correlation id içerir.
  - `retry()` → 200 → `idle` ve revizyon güncellenir.
  - `discard()` → geri alma.
- **AC10** – `flush()`:
  - Debounce'u beklemeden gönderir ve kuyruk boşalınca resolve olur.
  - Gönderim hata verirse o hatayla reject olur.
  - Durmuş durumda hemen reject olur.
  - Boş kuyrukta hemen resolve olur.
- **AC11** – `reset()`: uçuştaki isteğin yanıtı revizyonu değiştirmez ve callback çağırmaz; tüm girdiler düşer, `status === 'idle'`. 200 yanıtında `value` şemaya uymazsa revizyon güncellenir, `status === 'error'` (`ProjectDataValidationError`) olur ve kuyruk durur.
- **AC12** – `ServerSection`:
  - `read()` senkrondur.
  - Wire'ı aynı olan `write` → `true`, istek ve bildirim yok.
  - Farklı değer → hemen `read()` yeni değeri döner ve 1 bildirim yapılır.
  - 200 ve sunucu değeri gönderilene eşit → `read()` aynı referansı döner (UI-only alanlar korunur).
  - Sunucu farklı değer döndürür ve daha yeni bekleyen yoksa → `read()` `fromWire(server)` olur.
  - `hydrate` istek atmaz.
  - Aktif proje yokken, `WireMappingError`'da veya temizlenemeyen bölüme `undefined` yazıldığında `write` → `false`, ayna değişmez. Son ikisinde `status === 'rejected'` olur.
  - Koleksiyon: yalnızca değişen graph için `PUT graphs/<id>` gider. Silme → `false` + `rejected`. Discard, hiç onaylanmamış graph'ı listeden çıkarır.
- **AC13** – Round-trip (T→W→T, `toEqual`) gerçekçi fixture'larla yapılır. Fixture'lar:
  - `INITIAL_PROJECT` + `INITIAL_BRIDGES` (id eklenmiş)
  - `ensureBridgeDefinitions` ile kurulan tanımlar (aks, kısıt, atama, abutment dahil)
  - tam Loose pier/pier-cap/foundation (shallow ve piled)/bearing/material kayıtları (legacy `H_TYPE` dahil)
  - `{enabled, dimensions: PRECAST_DIMENSIONS}`
  - preferred span ve cross section (`INITIAL_CROSS_SECTION_VALUES`)
  - 6 yük örneği (`projectModulesRoundTrip.test.ts`'teki `SAMPLE_MODULES` değerleriyle aynı veri)
  - 4 parametre türü, group ve sahiplik alanları olan graph ile groups/sahiplik içermeyen graph

  Sonuç derin eşittir. Belgelenmiş istisnalar testte açıkça doğrulanır:
  - bridge-def UI alanları varsayılana döner, `selectedBridgeId: null`
  - wind snapshot'ta `result` yok
  - girder `[]` → `undefined`
  - eksik nullable family alanı `null` olarak döner
- **AC14** – `toWire` çıktısı: her nesne seviyesinde `Object.keys` backend record bileşen sırasına birebir eşittir. Girdiye eklenen passthrough alanı (`extra`) ve UI-only alanlar (`selectedAxisId`, `viewMode`, `terrainVisible`, `selectedConstraintId`, `keyBy`, `selectedBridgeId`, `result`, `activeGraphId`) çıktıda yoktur. Opsiyonel alanlar açık `null`'dur. Hiçbir sayı veya string değişmez.
- **AC15** – Yanıt şemaları strict'tir:
  - Bilinmeyen anahtar, bilinmeyen enum (`pierType:'ROUND'`, `kind:'OBJECT'`), `schemaVersion: 2` ve kind/value uyuşmazlığı reddedilir; mesaj tam yolu içerir (ör. `graphs[0].nodes[1].parameters[0].value`).
  - `H_TYPE` ve `WALL` kabul edilir.
  - Bölüm `null` ile `[]` ayrı tutulur (families üyeleri, preferred span).
- **AC16** – Belgelenmiş `toWire` hataları: id'siz veya boş id'li `BridgeRow`, `keyBy` olmayan store ve `{a:{x:1}}` graph parametresi `WireMappingError`'ı doğru path ile fırlatır.
- **AC17** – Doküman:
  - `loadProjectDocument(CANONICAL…)` 12 anahtarın hepsini doğru frontend değerlerine çevirir.
  - `NEW_PROJECT_DOCUMENT_JSON` için workspace dolu, diğer her şey `undefined` ve `graphs: []` döner.
  - Her bölüm için W→T→W (`definition.codec.toWire(loaded.X)`) kanonik JSON'daki ilgili değerle derin eşittir.
  - Şemanın anahtar sırası backend listesiyle aynıdır.
  - Geçersiz dokümanda (ör. `workspace.bridges[0].spansM[0] = 'x'`) `ProjectDataValidationError` fırlar.
  - Çağrı sırasında `Storage.prototype.setItem` ve `window.dispatchEvent` hiç çağrılmaz.
- **AC18** – `PROJECT_SECTION_DEFINITIONS` 16 path'i tam olarak listeler: `workspace, bridge-definitions, families/piers, families/pier-caps, families/foundations, families/bearings, families/materials, girder-library, preferred-span-rules, cross-section, loads/seismic, loads/wind, loads/temperature, loads/self-weight, loads/traffic-lm1, loads/wind-snapshot`. Graph `graphs/<id>` üretir. `clearable` yalnızca son 9 path için `true`. `createProjectRequestBody({project: INITIAL_PROJECT, bridges: []})` `{workspace:{project:{…22 alan + 4 nesne}, bridges: []}}` üretir.
- **AC19** – Davranış ve UI değişmez:
  - Mevcut test dosyaları değişmemiştir (`http.test.ts` yalnızca test eklemesi).
  - Yeni modüller hiçbir production modülü tarafından import edilmez: `grep` ile `project-store` yalnızca `*Wire.ts` ve `app/project-session/*` içinde geçer.
  - `backend/**`, `package.json` ve lock dosyası değişmez.
- **AC20** – `layerRules.test.ts` ve `sourceEncoding.test.ts` geçer. `shared/project-store/**` hiçbir `features/` veya `app/` import'u içermez.
- **AC21** – `npm run build`, `npm test`, `npm run lint` başarılıdır. `docs/architecture.md` M4 bölümünü içerir, `docs/roadmap.md`'de M4 `[x]`.

## 7. Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `src/shared/api/http.test.ts` (yeni 2 test) | yeşil |
| AC2 | `src/shared/project-store/projectApi.test.ts` (fetch mock) | URL, method ve gövde birebir; hatalar doğru sınıf |
| AC3 | `projectDataValidation.test.ts` | mesaj string'i birebir |
| AC4–AC11 | `writeQueue.test.ts` (`vi.useFakeTimers()`, `await vi.advanceTimersByTimeAsync(…)`, kontrol edilebilir deferred `putSection` mock'u, `afterEach(vi.useRealTimers)`) | istek sayısı, sırası, `expectedRevision`, durumlar |
| AC12 | `serverSection.test.ts` (sentetik codec, gerçek kuyruk + mock `putSection`) | referans ve bildirim sayıları |
| AC13–AC16 | 7 adet `*Wire.test.ts` | derin eşitlik, anahtar listeleri, strict reddi, `WireMappingError` |
| AC17–AC18 | `src/app/project-session/projectDocument.test.ts` | yeşil; storage ve event spy'ları 0 çağrı |
| AC19 | `git status --short`, `git diff --stat` (yalnızca 5. bölümdeki dosyalar); `git status --short -- backend frontend/package.json frontend/package-lock.json` boş; mevcut test dosyalarında diff yok (http.test.ts hariç) | beklenen dosya listesi |
| AC20 | `layerRules.test.ts`, `sourceEncoding.test.ts` (`npm test` içinde) | yeşil |
| AC21 | `cd frontend && npm run build && npm test && npm run lint`; doküman incelemesi | hepsi başarılı |

Odaklı koşu: `cd frontend && npx vitest run src/shared/api src/shared/project-store src/app/project-session src/features/project/model src/features/bridge-definition/model src/features/family-registry/model src/features/preferred-span/model src/features/superstructure-families/model src/features/loads/model src/features/graph/state`

Bilinmeyenler:
- CI yapılandırması incelenmedi.
- Mevcut toplam frontend test sayısı ve yerel `npm` sürümü doğrulanmadı.
- vitest 5'te `advanceTimersByTimeAsync` API'sinin varlığı kurulu paketten kontrol edilmeli (vitest 1+ sürümlerinde mevcut).
- Backend'e karşı gerçek uçtan uca doğrulama M4 kapsamında yok; M5'teki manuel `start-dev.bat` akışına kalır.

## 8. Riskler

Kayıplı eşleme noktaları M5'e açıkça devredildi:

- **R1 – Bridge definition UI durumu.** `fromWire` varsayılanları döner. M5 hydrate'te `ensureBridgeDefinitions(store, workspace.bridges)` çağırmalı; bu, eşleşmeyen `definitionKey`'leri düşürür ve aksları yeniden hesaplar (bugünkü davranış). İlk yazmada sunucu da bu düzeltilmiş hâle gelir.
- **R2 – `BridgeRow.id` opsiyonel tipi.** M5 yazmadan önce `ensureBridgeIds`'ten geçmiş state göndermeli. Aksi halde `WireMappingError` → `rejected`.
- **R3 – Family Loose alanları.** Eksik nullable alan (`twoColumnSpacing`, `stemWidth`, `shallowGeneration`, `piledGeneration`) yeniden yüklenince `null` olarak gelir. Okuyucular `== null` / `?.` kullandığı için eşdeğer (`pier-cap-families/model/service.ts` `stemWidth == null`). passthrough alanlar kalıcı olarak düşer (K8, kabul edilmiş).
- **R4 – Girder library.** Diziler (`[]`) `null`'a, oradan `undefined`'a döner. M5'te reset `write(undefined)` olmalı (clearable).
- **R5 – Rüzgâr snapshot'ı.** Yeniden yüklemede `result` yok. `WindLoadsPanel` sonucu `null` iken "INVALID" gösterebilir (M3 notu). M5 ya yeniden hesaplamalı ya da "hesaplanmadı" göstermeli. M4 `result: null` uydurmaz.
- **R6 – Graph parametreleri.** Legacy dosyalardan gelebilecek 4 tür dışı değer `WireMappingError` verir. NaN `null` olarak gider ve 400 alır (alan yollu `rejected`). `-0` JSON'da `0` olur (H2 de normalize eder).
- **R7 – Tamsayı benzeri Record anahtarları.** `Object.fromEntries` → `Object.entries` sırasını değiştirebilir. Aks id'leri (`A1`, `P1`) ve parametre adları etkilenmez; derin eşitlik sıradan bağımsızdır.
- **R8 – Ağ veya 5xx sonrası belirsizlik.** İstek sunucuda commit olup yanıt kaybolduysa, Retry 409 alır → `conflict` → yeniden yükleme. Sessiz çift yazma veya üzerine yazma olmaz.
- **R9 – Yanıt `value`'su şemaya uymazsa.** Sunucu yazmıştır; revizyon güncellenir ve `error` gösterilir (kayma görünür olur). Aynanın onaylı değeri gönderilen değerdir.
- **R10 – Sekme kapanırken.** Debounce içindeki son değişiklik kaybolabilir. `beforeunload` M5'te `pendingKeys()` ile yapılacak.
- **R11 – Strict yanıt şemaları.** Backend additive bir alan eklerse frontend yüklemeyi reddeder. Aynı repo ve aynı sürümde bu bilinçli bir tercih. Kanonik fixture backend'den otomatik türetilmiyor; bir DTO değişikliğinde fixture ve mapper elle güncellenmeli. `docs/architecture.md`'ye not düşülür.
- **R12 – Güvenlik ve veri.** Auth yok (yerel tek kullanıcı). Kimlik veya kişisel veri işlenmez. Hata gövdeleri yalnızca `ApiError` üzerinden UI'a taşınır.
- **R13 – Geri alma.** Değişiklikler tamamen eklemedir; `putJson` dışında mevcut koda dokunulmaz. Geri almak için yeni dosyaları silmek ve `http.ts` eklemesini geri almak yeter. Migration ve veri etkisi yok.
- **R14 – Mühendislik güvenliği.** Hiçbir değer, birim, aralık veya varsayılan eklenmez ya da değiştirilmez. Yalnızca bugünkü UI varsayılanları (`viewMode`, `terrainVisible`, seçimler) ve mevcut normalizasyonlar (`normalizeUnitId`) kullanılır.

## 9. Varsayımlar ve açık sorular

**Doğrulanmış:** 2. bölümdeki tüm yollar, sınıf ve alan adları, enum değerleri, nullability'ler, hata mesajları, anahtar sırası, `package.json` script'leri, tsconfig kısıtları, katman kuralları, fixture kaynakları (`INITIAL_PROJECT`, `INITIAL_BRIDGES`, `PRECAST_DIMENSIONS`, `INITIAL_CROSS_SECTION_VALUES`, `createEmptyGraph`, `ensureBridgeDefinitions`; `SAMPLE_MODULES` verisi `src/app/project-file/projectModulesRoundTrip.test.ts` içinde).

**Planlayıcı kararları (yazılım; değiştirilebilir):**
- D1–D10.
- Hata ayracı `" - "`.
- `SAVE_DEBOUNCE_MS = 300`.
- 400/422 → `rejected`; 404, 5xx ve ağ hatası → `error`.
- Durmuş kuyrukta yeni yazmalar biriktirilir ama gönderilmez.
- Birleştirilen girdi kuyruktaki ilk konumunu korur.
- Singleton store örneği ve hook'lar M5'e kalır.

**Doğrulanmamış varsayımlar:**
- vitest 5 fake-timer API'leri beklendiği gibi çalışır.
- Jackson `DoubleNode` tamsayı değerleri (`1.0`) JSON'da sayı olarak gelir. Frontend için fark yok.

**Açık soru:** Yok. Mühendislik bilgisi gerektiren bir nokta yok. Kayıplı eşlemelerin hepsi (R1–R6) belgelendi ve M5'e devredildi.

**READY**
