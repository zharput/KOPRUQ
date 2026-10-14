# Plan: backend-db-persistence-m5b — Oturum katmanı (uygulamaya bağlanmamış)

Üst plan: `docs/features/backend-db-persistence-m5/plan.md` (Bölüm A: 3.1 D1–D16, 3.3, 3.6, 5 "M5b", 6 AC7–AC18). Ürün kararları tekrar açılmadı. Satır numaraları HEAD `1b81241` çalışma kopyasına göredir; `docs/features/backend-db-persistence-m5b/` dışında bekleyen değişiklik yok.

**Sonuç: READY.**

---

## 1. Davranış ve kabul kriterleri

### 1.1 Amaç
M4 altyapısının üzerine oturum katmanı kurulur. Bu katmanda şunlar var: tekil oturum ve kuyruk, 16 bölüm ile graph koleksiyonu örneği, iki adımlı yükleme (prepare/apply), proje kapatma, oturum denetleyicisi (Open/New/Reload/Exit, kapı, URL eşitleme), proje listesi sorgusu, dört UI bileşeni, sahte API ve test yardımcıları.

**Kullanıcının göreceği hiçbir şey değişmez (D1):**
- `App.tsx`, `main.tsx`, `TopWorkspaceNav.tsx`, `UnsavedChangesModal.tsx`, `RecentFileAccessModal.tsx` ve mevcut tüm depo/modüller değişmez.
- localStorage tek kaynak kalır.
- Yeni modülleri yalnızca yine yeni modüller ve testler import eder.

**Kapsam dışı:**
- M5c (bağlama, silme, kısayollar, `beforeunload`, `UnsavedChangesModal` yeni prop'ları, D6 UI katmanı, D9).
- m3b (rüzgâr sonucu), backend, `package.json` ve lock dosyası.

### 1.2 Kabul kriterleri (parantez içi: üst plandaki karşılığı)

- **AC1 (AC7) – `activeProject.ts`**
  - Modülde sıra şöyle: önce `activeProjectSession`, sonra `activeWriteQueue`, en son proje değişimi aboneliği. Gözlenebilir kanıt: bekleyen bir yazma varken `begin` çağrılınca, `onProjectSwitch` dinleyicisinin içinde `activeWriteQueue.pendingKeys()` zaten `[]` olur.
  - `setActiveProjectApi(fake)` önceki API'yi döndürür (ilk çağrıda `projectApi`). Sonraki PUT'lar o anki API'ye gider; değişiklik oturum ortasında da geçerlidir.
  - `onProjectSwitch` her `begin` ve `end` çağrısında tam bir kez çalışır (aynı id ile `begin` dahil). `setRevision`/`update` ve durum değişikliklerinde çalışmaz.
  - Abonelikten çıkış çalışır. Hata fırlatan bir dinleyici diğerlerini engellemez (`console.error`).
  - `createActiveSection`/`createActiveCollection` kayıt defterine ekler; aynı id tekrar kaydedilirse kayıt değiştirilir.
- **AC2 (AC7) – `useSaveStatus`:** Değişiklik yokken her render'da aynı snapshot referansını döndürür. `begin` veya kuyruk durumu değişince yeniden render eder.
- **AC3 (AC8) – Bölüm örnekleri**
  - 16 bölüm ve `graphs` koleksiyonu kayıtlı, toplam 17, id'ler benzersiz.
  - Her bölümün id ve path'i `PROJECT_SECTION_DEFINITIONS` ile aynı; koleksiyonun id'si `GRAPH_COLLECTION.id`.
  - Proje yokken `write` `false` döner ve sahte API'ye 0 istek gider.
- **AC4 (AC8, AC18) – Bağlanmamış**
  - `src/test/architecture/sessionLayerUnwired.test.ts` yeşil: yeni modüllerden birini import eden mevcut bir production dosyası yok.
  - Bölüm örneği dosyaları çalışma zamanında yalnızca `activeProject.ts`'i ve kendi `*Wire.ts` dosyasını import ediyor; diğer importlar `import type`.
- **AC5 (AC9) – `prepareLoadedProject`**
  - Kanonik fixture'da `bridgeDefinitions` uzlaştırılır: `keyBy:'bridgeId'`, `bridge-1` ve `bridge-2` için tanım var, `selectedBridgeId === 'bridge-1'`. `bridge-1`'in veri alanları yüklenen değere eşit.
  - Yeni proje fixture'ında `{keyBy:'bridgeId', selectedBridgeId:null, definitions:{}}` olur.
  - Gösterilemeyen bir değer (örn. workspace'te `bridges[0].id = ''` olan bir `LoadedProjectDocument`) `ProjectDataValidationError` fırlatır; mesaj `Invalid project data: workspace` ile başlar.
  - Hata durumunda session snapshot'ı (referans dahil), tüm bölüm okumaları ve `pendingKeys()` değişmez.
  - Proje açıkken çağrılsa da hiçbir yan etkisi yoktur.
- **AC6 (AC10) – `applyPreparedProject`**
  - Epoch +1; `projectId`/`revision` dokümandan gelir; durum `idle`; `pendingKeys()` `[]`.
  - Her bölümün `read()` değeri hazırlanan değerle derin eşit; `graphs.list()` eşit.
  - Bildirim sırası `PROJECT_SECTION_DEFINITIONS` sırasıdır, en son `graphs` gelir.
  - Fake timers ile 1000 ms ilerletildikten sonra 0 PUT.
  - Aynı projeye ikinci kez apply edilince epoch yine +1 olur.
- **AC7 – `closeActiveProject`:** `projectId === null`; 16 bölüm `undefined`, `graphs` `[]`; istek gitmez. Bekleyen yazma ve tutulan hatalar düşer. Sonraki `write` `false` döner.
- **AC8 (AC11) – New**
  - `newProject('  Köprü A  ')` yalnızca `[POST /api/projects]` gönderir. Gövde `createProjectRequestBody({project:{...INITIAL_PROJECT, name:'Köprü A'}, bridges:[]})` ile aynıdır.
  - `setUrlProjectId(<yeni id>)` çağrılır, faz `ready` olur, liste sorgusu `['projects']` invalidate edilir.
  - Sonraki 1 s içinde istek yok. Boş ya da yalnızca boşluk olan adda istek yok.
- **AC9 (AC12) – Open**
  - Bekleyen yazma varsa istek sırası `PUT …`, sonra `GET`.
  - Geçersiz dokümanda `actionError` `Invalid project data:` ile başlar; önceki oturumun `projectId`/`revision`/`epoch` değerleri ve bölüm değerleri aynen kalır.
  - 404'te mesaj `Proje bulunamadı: ` + `formatApiError(error)` olur. Proje yokken faz `load-error`, proje açıkken `actionError`.
  - Açık projenin id'siyle Open yapılınca istek gitmez.
  - Eski yanıt korumalı: A bekletilirken B açılırsa yalnızca B uygulanır, A'nın geç yanıtı yok sayılır, epoch yalnızca bir kez artar.
- **AC10 (AC13) – Kapı**
  - PUT 500 alırsa `pendingSwitch = {reason:'open', target, canRetry:true}` olur; GET/POST gitmez.
  - Retry: PUT yeniden gider (OK), ardından GET.
  - Discard: bölüm geri alınır, ardından GET; PUT gitmez.
  - Cancel: `pendingSwitch` `null` olur, GET gitmez, hata durumu kalır.
  - 409'da `canRetry:false`; `resolvePendingSwitch('retry')` bu durumda hiçbir şey yapmaz.
- **AC11 (AC14) – Reload:** Conflict durumunda ve bekleyen anahtarlar varken GET + apply; ardından `pendingKeys()` `[]`, durum `idle`, değerler sunucudaki gibi. GET başarısız olursa durum `conflict` kalır ve `actionError` set edilir.
- **AC12 (AC15) – Exit:** Kapıdan geçer. Ardından `projectId` `null`, bölümler `undefined`/`[]` ve `setUrlProjectId(null)` çağrılır. Kapı başarısız olursa hiçbir şey değişmez.
- **AC13 (D10) – URL ve ilk faz**
  - İlk render'da dört durum senkron hesaplanır: welcome / loading / ready / ready + URL geri ekleme.
  - URL başka bir id'ye değişirse Open (kapıdan geçer).
  - Proje açıkken URL'deki id silinirse `setUrlProjectId(session id)`.
  - Proje açıkken URL kaynaklı Open başarısız olursa URL eski id'ye döner ve `actionError` set edilir.
  - `<StrictMode>` altında URL kaynaklı açılış `ready` ile biter; epoch tam +1, apply bir kez.
- **AC14 (AC16) – `ProjectListDialog`**
  - Yükleniyor, hata (Tekrar dene ile) ve boş durumları var.
  - Sıralama `updatedAt` azalan. Boş ad "Untitled" olarak görünür. Kısa id 8 karakter. Açık proje `aria-current` ile işaretli.
  - Satır seçimi `onOpen(id)` çağırır.
  - Sorgu yalnızca `open` iken çalışır (kapalıyken 0 `listProjects` çağrısı) ve `retry:false` (hata sonrası tek çağrı).
- **AC15 (AC16) – `NewProjectDialog`**
  - Ad boş ya da yalnızca boşluksa Oluştur pasif. Enter ya da Oluştur `onCreate(name.trim())` çağırır.
  - İptal ve Escape yalnızca `onCancel` çağırır.
  - Yeniden açılınca alan boştur. `role="dialog"`, `aria-labelledby`, açılışta odak ad alanında.
- **AC16 (AC17) – `SaveStatusIndicator`:** Beş durum metni ve düğmeleri K7'deki gibi. Rejected'da ilk 3 alan hatası ve "+N hata daha" gösterilir. Proje yokken hiçbir şey render edilmez.
- **AC17 – `ProjectLoadScreen`:** Loading'de "Proje yükleniyor…" ve kısa id. load-error'da "Proje açılamadı", mesaj ve üç düğme (Tekrar dene / Proje listesi / Yeni proje) ilgili callback'leri çağırır.
- **AC18 – Test yardımcıları:** Sahte API'nin testi yeşil: revizyon zinciri, 409, 404, graph upsert, istek günlüğü, tek seferlik hata enjeksiyonu, yanıt bekletme. `openTestProject`/`closeTestProject`/`resetActiveProject` çalışıyor.
- **AC19 (AC18) – Değişmeyenler**
  - `git diff --name-only <baseline> -- frontend/src` yalnızca `frontend/src/app/styles/App.css`'i listeler; geri kalan her şey yeni dosya.
  - `backend/**`, `frontend/package.json`, `package-lock.json` değişmedi.
  - build/test/lint yeşil. `layerRules`, `noBrowserStorage` (`ALLOWED_FILES` aynı 17 giriş) ve `sourceEncoding` yeşil.
  - Yeni dosyalarda `WindSnapshotInputsValue` ve tarayıcı depolama sembolleri yok.
- **AC20 – Dokümanlar:** `docs/architecture.md`'de "BACKEND-DB-PERSISTENCE M5b" bölümü var; `docs/roadmap.md`'de `[x] M5b`.

---

## 2. Doğrulanmış mevcut durum, kararlar ve önerilen değişiklik

### 2.1 Doğrulanmış gerçekler (araştırma bulgularına düzeltmeler dahil)

**`shared/project-store/projectSession.ts`**
- `SaveStatus` :5; snapshot :6–16; arayüz :18–27; `createProjectSession()` parametresiz :31.
- `begin`/`end` epoch'u her zaman artırır :45–46.
- `set`, değişmeyen snapshot'ta bildirim yapmaz ve referansı korur :36. Dinleyici hataları yakalanır :39.

**`writeQueue.ts`**
- `SAVE_DEBOUNCE_MS=300` :29. Seçenekler :43.
- Varsayılan `putSection` oluşturma anında bir kez yakalanır :64. Bu yüzden `setActiveProjectApi` için bir dolaylılık (closure) gerekir.
- Kuyruk epoch'a bağlıdır :73, 101–104. `enqueue` önce `syncEpoch` çağırır, sonra proje yoksa hata fırlatır :178–179.
- Takılı (stalled) durumda `flush` saklanan hatayla reddedilir; conflict önceliklidir :167.
- `retry` takılı değilken hiçbir şey yapmaz, conflict'te reddeder :189–194.
- `discard` uçuştaki girdiyi de geri alır ve tüm hataları temizler :203–211. `reset` :213.
- Kuyruk session'a oluşturma anında abone olur :222. Bu yüzden aynı modülde sonra eklenen dinleyiciler kuyruk sıfırlandıktan sonra çalışır.
- 409 → conflict, 400/422 → rejected, diğerleri → error :89–93.

**`serverSection.ts`**
- Proje yokken `write` `false` döner :82, :164.
- Temizlenemeyen bölüme `undefined` yazmak `reportLocalRejection` ile sonuçlanır :86–90.
- Wire aynıysa `true` döner ama ayna güncellenmez :93.
- `hydrate` `toWire` çağırır ve hata fırlatabilir; `hydrate(undefined)` `toWire` çağırmaz :106–109.
- Koleksiyon `hydrate` her öğe için `idOf` ve `toWire` çağırır ve `rejectedKeys`'i düşürür :201–208. Silme reddedilir :176.

**`projectApi.ts`:** `listProjects` :31, `createProject(body:{workspace:unknown})` :34, `getProjectDocument` :37, `putSection` :40, `ProjectApi`/`projectApi` :49–50.

**`projectDataValidation.ts`:** `ProjectDataValidationError(issues)`; mesaj `Invalid project data: <path> - <msg>…` :11–20. `WireMappingError(path, message)`; mesaj `Cannot send project data: …` :23–29. Ham mesaj ayrı bir alanda saklanmıyor.

**`shared/api/http.ts`:** `ApiError` :23 (`fieldErrors` :27), `formatApiError` :84.
- **Düzeltme:** `formErrors.ts:19` `requestErrorMessage`, `ApiError` olmayan her `Error`'a " - is the backend running?" ekliyor; `Invalid project data` için yanıltıcı olur. Bu yüzden controller `formatApiError` kullanır.

**`app/project-session/projectDocument.ts`**
- Şema :29–34; `LoadedProjectDocument` :37–57; `loadProjectDocument` saf ve hep-ya-hiç :64.
- `PROJECT_SECTION_DEFINITIONS` (16, sıra :94–99), `GRAPH_COLLECTION_DEFINITION` :101, `createProjectRequestBody` :104.
- Fixture'lar `projectDocumentFixtures.ts`: `CANONICAL_PROJECT_DOCUMENT_JSON` :32, `NEW_PROJECT_DOCUMENT_JSON` :149.

**Temizlenemeyen bölümler:** workspace (`projectWorkspaceWire.ts:68`), bridge-definitions (`bridgeDefinitionWire.ts:86`), 5 family (`familyWire.ts:192`). **Temizlenebilenler:** girder (:226), preferred (:33), cross (:24), 6 load (`loadsWire.ts:79`). Kapatma bu yüzden yalnızca `hydrate(undefined)` ile yapılır.

**Bölüm tanımları ve id'ler**
- `WORKSPACE_SECTION` id `workspace` (`projectWorkspaceWire.ts:66`).
- `BRIDGE_DEFINITIONS_SECTION` `bridgeDefinitions` (`bridgeDefinitionWire.ts:84`).
- `FAMILY_SECTIONS` `families.piers|pierCaps|foundations|bearings|materials` (`familyWire.ts:195–203`; düz obje, `as const` değil).
- `GIRDER_LIBRARY_SECTION` `girderLibrary` (:224; tip `SectionDefinition<unknown[] | GirderLibraryValue, …>`).
- `PREFERRED_SPAN_RULES_SECTION` `preferredSpanRules` (`preferredSpanWire.ts:31`).
- `CROSS_SECTION_SECTION` `crossSectionValues` (`crossSectionWire.ts:22`).
- `SEISMIC/WIND/TEMPERATURE/SELF_WEIGHT/TRAFFIC_LM1/WIND_SNAPSHOT_SECTION` (`loadsWire.ts:82–87`). Rüzgâr snapshot'ı `WindSnapshotInputsValue` :14.
- `GRAPH_COLLECTION` id `graphs` (`graphWire.ts:63–64`).
- Wire dosyaları çalışma zamanında hiçbir depoyu import etmiyor; yalnızca zod, `projectDataValidation` ve `./…Model`/tipler.

**Uzlaştırma**
- `ensureBridgeDefinitions(store, bridges)` saftır ama `features/bridge-definition/model/store.ts:57` içindedir. Bu modül localStorage kullanır; yalnızca import etmek zararsızdır.
- Uzlaştırma, workspace'te olmayan tanımları düşürür ve aksları açıklıklardan yeniden üretir (`mergeDefinition` :33–41). Bugünkü `readBridgeDefinitionStore` ile aynı davranış.
- **Düzeltme / ek:** `ensureBridgeIds`'i ayrıca çağırmak gerekmiyor. `workspaceFromWire` zaten `normalizeProjectState` → `ensureBridgeIds` çağırıyor (`projectWorkspaceWire.ts:62–64`, `projectWorkspaceModel.ts:72–76`).
- `INITIAL_PROJECT`: `projectWorkspaceModel.ts:47` (saf model; `projectWorkspace.ts` yerine buradan import edilir).

**Mevcut kullanım (grep)**
- `shared/project-store/`'u import eden production dosyaları: 7 wire dosyası ve `projectDocument.ts`.
- Yeni sembollerin hiçbiri yok (grep 0).
- `useSearchParams` ve `@radix-ui/react-dialog` src içinde hiç kullanılmıyor.
- `renderHook` kullanılıyor (`useProjectModule.test.tsx`).

**Test altyapısı**
- `vite.config.ts:7–10`: `jsdom`, `setupFiles`; `isolate`/`pool` override yok. Varsayılan dosya izolasyonu geçerli, yani tekil nesneler her test dosyasında tazedir.
- `setup.ts` jest-dom ve `cleanup` yükler.
- `tsconfig.app.json` `include: ["src"]`: testler de tip kontrolünden geçer. `verbatimModuleSyntax`, `erasableSyntaxOnly` ve `noUnused*` açık.
- `.oxlintrc.json`: yalnızca `rules-of-hooks` (error) ve `only-export-components` (warn, sabitlere izin var).

**Mimari testler**
- `layerRules.test.ts` R1/R2/R4; `ALLOWED_VIOLATIONS` boş :19. `test/` ve `*.test.*` muaf.
- `noBrowserStorage.test.ts` 17 dosyalık liste :11–29; `src/test/` muaf.
- `sourceEncoding.test.ts` `.css` dosyalarını da tarar :30. Doğru UTF-8 Türkçe karakterler ve `…` (U+2026) sorun değil.

**Modal ve CSS**
- Modal deseni: `UnsavedChangesModal.tsx:4` (`spn-modal-backdrop` / `section.spn-modal[role=dialog][aria-modal][aria-labelledby]` / `spn-modal-actions`).
- CSS: `14-graph-interaction-final.css:269`. Stiller `App.css` içinde sıralı `@import` ile yüklenir (:4–20; son dosya `17-typography-and-alignment.css`).
- `spn-session` önekiyle hiçbir sınıf yok (grep 0). Mevcut hiçbir modalda odak yönetimi ya da Escape yok.

**Uygulama kabuğu:** `main.tsx:10` `<StrictMode>` kullanıyor (M5c'de effect'ler dev ortamında iki kez çalışır). `AppProviders.tsx:12` varsayılan `QueryClient`.

**Test sayısı:** Son ölçüm 105 dosya / 1070 test (`m5a/implementation.md:9`). F1/F2 takibi mevcut testleri değiştirdi; yeni test eklenip eklenmediği **doğrulanmadı**. Uygulayıcı 0. adımda yeniden ölçer.

### 2.2 Kararlar

**K1 – `activeProject.ts` konumu ve API'si**

Konum: `frontend/src/shared/project-store/activeProject.ts`. Generic olduğu ve feature import etmediği için R1'e uyar.

```ts
export const activeProjectSession: ProjectSession                 // 1) createProjectSession()
let currentApi: ProjectApi = projectApi
export function activeProjectApi(): ProjectApi
export function setActiveProjectApi(next: ProjectApi): ProjectApi  // önceki API'yi döndürür
export const activeWriteQueue: WriteQueue                          // 2) createWriteQueue({ session, putSection: (...a) => currentApi.putSection(...a) })
export const ACTIVE_PROJECT: SectionDeps                           // { queue: activeWriteQueue, session: activeProjectSession }
export type ActiveSectionEntry = Readonly<
  | { kind: 'section'; id: string; path: string; hydrateEmpty(): void }
  | { kind: 'collection'; id: string; hydrateEmpty(): void }>
export function createActiveSection<T, W>(definition: SectionDefinition<T, W>): ServerSection<T>
export function createActiveCollection<T, W>(definition: CollectionDefinition<T, W>): ServerSectionCollection<T>
export function activeSections(): readonly ActiveSectionEntry[]
export function onProjectSwitch(listener: () => void): () => void  // 3) aboneliği modülün sonunda kurulur
```

- **Kayıt defteri:** `Map<id, entry>`; ekleme sırası korunur.
  - Bölümde `hydrateEmpty = () => section.hydrate(undefined)` (`toWire` çağrılmaz). Koleksiyonda `() => collection.hydrate([])`.
  - Aynı id yeniden kaydedilirse giriş değiştirilir (gelecekteki Vite HMR yeniden çalıştırması hata vermesin diye). Tam 17 benzersiz kayıt AC3'te test edilir.
- **`onProjectSwitch`:**
  - Modül sonunda tek bir `activeProjectSession.subscribe` kurulur. Son görülen epoch'tan farklıysa dinleyicilerin bir kopyası üzerinde dönülür; her çağrı ayrı `try/catch` + `console.error('Active project: a project-switch listener threw', e)` ile sarılır.
  - Dinleyiciler `begin`/`end` içinde, senkron ve **hydrate'ten önce** çalışır. Yalnızca bellekteki durumu sıfırlamalıdır: bölüm okumaz, yazmaz, `begin`/`reset` çağırmaz (JSDoc'ta yazılır).
- **Production'a test sıfırlama kancası eklenmez.** Sıfırlama genel API'lerle test yardımcısında yapılır (K8). `dispose` hiçbir yerde çağrılmaz.
- **`useSaveStatus`:** `frontend/src/shared/project-store/useSaveStatus.ts` → `useSyncExternalStore(activeProjectSession.subscribe, activeProjectSession.getSnapshot, activeProjectSession.getSnapshot)`.

**K2 – Bölüm örnekleri (D3)**

Her feature kendi dosyasında `createActiveSection(DEF)` çağırır (features → shared serbest). Çalışma zamanı importları yalnızca `activeProject` ve kendi wire dosyası; ek tip gerekirse `import type`. Dışa aktarılan adlar:

| Dosya | Export |
|---|---|
| `features/project/model/projectWorkspaceServerSection.ts` | `WORKSPACE_SERVER_SECTION` |
| `features/bridge-definition/model/bridgeDefinitionServerSection.ts` | `BRIDGE_DEFINITIONS_SERVER_SECTION` |
| `features/family-registry/model/familyServerSections.ts` | `FAMILY_SERVER_SECTIONS: { [C in FamilyRepositoryCategory]: ServerSection<FamilyRecordOf<C>[]> }`, `GIRDER_LIBRARY_SERVER_SECTION` |
| `features/preferred-span/model/preferredSpanServerSection.ts` | `PREFERRED_SPAN_RULES_SERVER_SECTION` |
| `features/superstructure-families/model/crossSectionServerSection.ts` | `CROSS_SECTION_SERVER_SECTION` |
| `features/loads/model/loadsServerSections.ts` | `SEISMIC_/WIND_/TEMPERATURE_/SELF_WEIGHT_/TRAFFIC_LM1_/WIND_SNAPSHOT_SERVER_SECTION` |
| `features/graph/state/graphServerCollection.ts` | `GRAPH_SERVER_COLLECTION = createActiveCollection(GRAPH_COLLECTION)` |

- **Rüzgâr:** `WIND_SNAPSHOT_SERVER_SECTION`'ın tipi `WIND_SNAPSHOT_SECTION`'dan çıkarılır. Yeni kodda `WindSnapshotInputsValue` adı geçmez; m3b'den sonra tip kendiliğinden genişler.

**K3 – `app/project-session/projectSections.ts` (D8)**

```ts
declare const prepared: unique symbol
export type PreparedProject = Readonly<{
  projectId: string; revision: number
  workspace: PersistedProjectState | undefined
  bridgeDefinitions: BridgeDefinitionStore            // her zaman uzlaştırılmış, hiç undefined değil
  families: LoadedProjectDocument['families']; girderLibrary: LoadedProjectDocument['girderLibrary']
  preferredSpanRules: …; crossSection: …; loads: LoadedProjectDocument['loads']; graphs: readonly KopruqGraph[]
}> & { readonly [prepared]: true }
export function prepareLoadedProject(loaded: LoadedProjectDocument): PreparedProject  // saf; hata fırlatabilir
export function applyPreparedProject(project: PreparedProject): void                  // fırlatmaz (yalnızca prepare'den gelen değerle)
export function closeActiveProject(): void
```

**`prepare`:**
1. `bridges = loaded.workspace?.bridges ?? []`.
2. `bridgeDefinitions = ensureBridgeDefinitions(loaded.bridgeDefinitions ?? {}, bridges)` (R1).
3. Her bölüm için tanımlı değerlerde `definition.codec.toWire(value)`. Her graph için `GRAPH_COLLECTION.codec.idOf(g)` ve `toWire(g)` (hydrate'in yapacağı işin aynısı).
4. Bir `WireMappingError` olursa `new ProjectDataValidationError([{ path: <bölüm path'i | graphs[i]>, message: error.message }])` fırlatılır. Mesaj `Invalid project data: families/piers - Cannot send project data: [0].id - …` biçiminde olur. Diğer hatalar olduğu gibi yayılır.
5. Session'a, kuyruğa ve bölümlere dokunmaz.

**Tip güvenli bağlama:** İç yardımcı `bind<T, W>(definition, section: ServerSection<T>, value: T | undefined)` → `{ validate(), hydrate() }`. Bağlama listesi `PROJECT_SECTION_DEFINITIONS` sırasındadır; validate ve apply aynı listeyi kullanır.

**`apply`:**
1. `activeProjectSession.begin(projectId, revision)`. Kuyruk kendini sıfırlar, ardından switch dinleyicileri çalışır.
2. 16 `hydrate`, tanım sırasıyla.
3. `GRAPH_SERVER_COLLECTION.hydrate(graphs)`.

Aynı epoch içinde hydrate yoktur. `try/catch` ile hata yutulmaz: hata ancak prepare atlanırsa, yani bir programlama hatası varsa oluşabilir. Marka tipi prepare'in atlanmasını engeller.

**`closeActiveProject`:** `activeProjectSession.end()`, ardından `activeSections().forEach(e => e.hydrateEmpty())`. Temizlenemeyen bölümlerde de `write(undefined)` kullanılmaz.

**K4 – D6 (bridge UI katmanı) M5c'ye ait**
- Gerekçe: D6, `bridge-definition/model/store.ts` yeniden yazılırken kurulur (üst plan 3.4); D1 depolara dokunmayı yasaklıyor.
- F1 sorunu yalnızca UI yazmaları `section.write` üzerinden geçtiğinde ortaya çıkar; bu da M5c'de olur.
- M5b'de bölüm örneği, `fromWire`/uzlaştırma ile gelen UI varsayılanlarını içeren `BridgeDefinitionStore`'u tutar. Bu M5b için doğru ve kendi içinde tutarlıdır.

**K5 – `useProjectSessionController` (`app/project-session/useProjectSessionController.ts`)**

Üst plan 3.3'teki imza aynen korunur:

```ts
export type SessionPhase = { kind: 'welcome' } | { kind: 'loading'; projectId: string } | { kind: 'ready'; projectId: string } | { kind: 'load-error'; projectId: string; message: string }
export type PendingSwitch = { reason: 'new' | 'open' | 'exit'; target?: string; error: unknown; canRetry: boolean } | null
export type ProjectSessionControllerOptions = { urlProjectId: string | null; setUrlProjectId(id: string | null): void }
export function useProjectSessionController(o: ProjectSessionControllerOptions): {
  phase: SessionPhase; saveStatus: ProjectSessionSnapshot; pendingSwitch: PendingSwitch; busy: boolean; actionError: string | null
  newProject(name: string): Promise<void>; openProject(projectId: string): Promise<void>; reloadProject(): Promise<void>; exitProject(): Promise<void>
  retrySaves(): Promise<void>; discardSaves(): void; resolvePendingSwitch(choice: 'retry' | 'discard' | 'cancel'): Promise<void>; clearActionError(): void
}
```

- **URL bağımlılığı:** URL enjekte edilir; react-router'a bağımlılık yok. M5c `useSearchParams` ile bir adaptör yazar; `setUrlProjectId` replace semantiğiyle çalışmalıdır. `setUrlProjectId` her render'da bir ref'e yazılır.
- Promise'lerin hiçbiri reddedilmez; hatalar state'e yazılır.
- Mesaj: `describeLoadError(e)` → `ApiError` 404 ise `Proje bulunamadı: ${formatApiError(e)}`, değilse `formatApiError(e)`.
- **Eski yanıt koruması:** Her `new`/`open`/`reload`/`exit` çağrısında ve unmount cleanup'ında `requestRef` artar. Her `await`'ten sonra `if (my !== requestRef.current) return` kontrolü yapılır. Kuyrukta `AbortSignal` olmadığı için sayaç tek mekanizmadır. `inFlightTargetRef` tutulur: aynı hedefe ikinci bir Open yapılmaz.
- **Kapı (`passGate(reason, target)`):**
  - `await activeWriteQueue.flush()`. Reddedilirse `pendingSwitch = {reason, target, error, canRetry: activeProjectSession.getSnapshot().status !== 'conflict'}` ve `false` döner.
  - `pendingSwitch` doluyken `new`/`open`/`exit` çağrıları yok sayılır.
  - `resolvePendingSwitch`: `cancel` → `null`. `discard` → `activeWriteQueue.discard()`, ardından işlem kapı olmadan yürütülür. `retry` → `canRetry` `false` ise hiçbir şey yapmaz; değilse `await activeWriteQueue.retry()`, başarılıysa işlem yürütülür, reddedilirse `pendingSwitch` yeni hata ve `canRetry` ile güncellenir.
  - New için `target` isimdir.
- **New(name):**
  - `trimmed` boşsa hiçbir şey yapmaz.
  - Kapı → `activeProjectApi().createProject(createProjectRequestBody({ project: { ...structuredClone(INITIAL_PROJECT), name: trimmed }, bridges: [] }))` → `loadProjectDocument` → prepare → apply → `setUrlProjectId(id)` → `queryClient.invalidateQueries({ queryKey: PROJECT_LIST_QUERY_KEY })`.
  - Hata olursa `actionError` set edilir; oturum değişmez.
- **Open(id):**
  - `id === session.projectId` ya da `id === inFlightTarget` ise hiçbir şey yapmaz.
  - Proje yoksa iç durum `loading` olur.
  - Kapı → GET → load/prepare/apply → `setUrlProjectId(id)`.
  - Hata: proje açıksa `actionError` (URL kaynaklıysa URL session id'sine döndürülür); yoksa `load-error`.
- **Reload:** Proje yoksa hiçbir şey yapmaz. Kapıdan geçmez. GET aynı id ile → apply (epoch değişir, kuyruk sıfırlanır). Hata olursa `actionError` set edilir ve conflict kalır.
- **Exit:** kapı → `closeActiveProject()` → `setUrlProjectId(null)`.
- **`retrySaves`:** `activeWriteQueue.retry()`; hata yutulur, durum zaten göstergede görünür. **`discardSaves`:** `activeWriteQueue.discard()`. **`busy`:** Bir işlem sürerken `true`.
- **Faz türetimi (senkron):** iç `load` durumu `loading`/`load-error` ve session boşsa → o durum; değilse session dolu → `ready`; değilse `urlProjectId` var → `loading`; değilse → `welcome`.
- **URL effect'i:**
  - Bağımlılık yalnızca `[urlProjectId]`; mount'ta ve URL değişince çalışır. Session `getSnapshot()` ile okunur.
  - URL'de id var ve session'dan farklıysa → `openProject(url)`.
  - URL boş, session doluysa → `setUrlProjectId(session)`.
  - Controller'ın kendi `setUrlProjectId` çağrıları session ile aynı senkron devamda yapıldığı için effect yeni bir işlem başlatmaz.
- **`useQueryClient()`:** Controller bir `QueryClientProvider` içinde çalışmalıdır (M5c'de `AppProviders`).

**K6 – `useProjectList` (`app/project-session/useProjectList.ts`)**

```ts
export const PROJECT_LIST_QUERY_KEY = ['projects'] as const
export function useProjectList(enabled: boolean) // useQuery({ queryKey, queryFn: ({ signal }) => activeProjectApi().listProjects(signal), enabled, staleTime: 0, retry: false, select: sortProjectsByUpdatedAt })
```

`select` modül düzeyinde sabit bir fonksiyondur.

**K7 – UI bileşenleri** (`app/project-session/`, ham `<button>`, `spn-` sınıfları, `type="button"`)

Ortak a11y davranışı:
- `section.spn-modal[role=dialog][aria-modal=true][aria-labelledby={useId()}]`.
- Escape `busy` değilken kapatır (`onKeyDown`, `stopPropagation`).
- Açılışta tek bir `autoFocus`. Focus trap yok; repoda hiçbir modal bunu yapmıyor, bilinçli olarak eklenmedi.
- Bileşen dosyaları yalnızca bileşen export eder (lint kuralı `only-export-components`). Yardımcılar `.ts` dosyalarında durur.

| Bileşen | Props | Metinler |
|---|---|---|
| `ProjectListDialog` | `{ open: boolean; currentProjectId: string \| null; busy?: boolean; onOpen(projectId: string): void; onClose(): void }`; `useProjectList(open)` | Başlık "Proje aç"; "Projeler yükleniyor…"; "Proje listesi alınamadı: <formatApiError>" + [Tekrar dene] (`refetch`); "Kayıtlı proje yok."; satır: ad (`displayProjectName`), "Son güncelleme: <formatUpdatedAt>", `shortProjectId`, açık proje için " (açık)" + `aria-current="true"`; [Kapat] (autoFocus). Ek sınıf `spn-session-dialog-wide`. |
| `NewProjectDialog` | `{ open: boolean; busy?: boolean; onCreate(name: string): void; onCancel(): void }`; `open` iken içerik mount edilir, yeniden açılınca alan boş | Başlık "Yeni proje"; `<form onSubmit>` içinde `<label>` "Proje adı" + input (autoFocus); [Oluştur] `type=submit`, `disabled={trim()==='' \|\| busy}`; [İptal]. |
| `SaveStatusIndicator` | `{ status: ProjectSessionSnapshot; busy?: boolean; onRetry(): void; onDiscard(): void; onReload(): void }`; proje yokken `null` | idle "Kaydedildi" / saving "Kaydediliyor…" (`role=status`); error/rejected/conflict `role=alert`, metinler `saveStatusText.ts`'ten. |
| `ProjectLoadScreen` | `{ phase: Extract<SessionPhase, { kind: 'loading' \| 'load-error' }>; onRetry(): void; onOpenList(): void; onNew(): void }` | loading: "Proje yükleniyor…" + kısa id (`role=status`); load-error: h1 "Proje açılamadı", mesaj, [Tekrar dene] [Proje listesi] [Yeni proje]. |

**`saveStatusText.ts`** — `describeSaveProblem(snapshot): { title: string; details: string[]; actions: 'retry-discard' | 'reload' } | null`:
- **error:** `Kayıt hatası: ${formatApiError(lastError)}`. Detay: `failedKey` varsa `Bölüm: <failedKey>`. Aksiyonlar retry-discard.
- **rejected:** `Kayıt reddedildi`. Detaylar: `ApiError.fieldErrors` içinden ilk 3 tanesi `field: message` biçiminde; 3'ten fazlaysa `+N hata daha`. Alan hatası yoksa `formatApiError(lastError)`. Ayrıca `Bölüm: …`. Aksiyonlar retry-discard.
- **conflict:** `Çakışma: proje başka bir yerde değiştirildi.` Detay: `Yeniden yüklemek bekleyen değişiklikleri atar.` Aksiyon reload.
- **Düğmeler:** [Tekrar dene] [Değişiklikleri at] / [Yeniden yükle].
- M5c'deki modal da bu fonksiyonu kullanabilir.

**`projectDisplay.ts`:**
- `displayProjectName(name)` → `name.trim() === '' ? 'Untitled' : name` ("Untitled" İngilizce kalır).
- `shortProjectId(id)` → ilk 8 karakter.
- `formatUpdatedAt(iso)` → `Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' })`; geçersiz tarihte ham metin.
- `sortProjectsByUpdatedAt(list)` → yeni dizi; `Date.parse`'a göre azalan; NaN'ler sona; eşitlikte önce ad, sonra `projectId`.

**K8 – Test stratejisi**

`src/test/fakeProjectApi.ts`:
- `createFakeProjectApi(): FakeProjectApi`; `ProjectApi`'nin yanında şunlar var:
  - `requests: { method: 'LIST' | 'GET' | 'POST' | 'PUT'; path: string; body?: unknown }[]`
  - `seed(documentJson)`, `document(id)`
  - `failNext(method, error)`: tek seferlik hata.
  - `hold(method)` / `pending(method)` / `release(index?)`: yanıt bekletme ve sırasını belirleme.
- Bellek içi dokümanlarda `listProjects` özetleri `name = workspace?.project.name ?? ''` ile üretir.
- `createProject`: deterministik UUID biçimli id (sayaç), revision 1, yalnızca workspace dolu (`NEW_PROJECT_DOCUMENT_JSON` biçimi).
- `getProjectDocument`: klon döner; yoksa `ApiError` 404 `PROJECT_NOT_FOUND`.
- `putSection`: doküman yoksa 404; `expectedRevision` uymazsa `ApiError` 409 `PROJECT_REVISION_CONFLICT`; path eşlemesi 16 path + `graphs/<id>` upsert; revision +1; sayaca dayalı `updatedAt` (fake timers'tan etkilenmez); zarf `{projectId, revision, updatedAt, value}`.

`src/test/projectSessionTestUtils.ts`:
- `installFakeProjectApi(fake?)`: `setActiveProjectApi`.
- `openTestProject(json = NEW_PROJECT_DOCUMENT_JSON)`: dokümanı fake'e seed eder → `loadProjectDocument` → prepare → apply; `PreparedProject` döner.
- `closeTestProject()`: `closeActiveProject`.
- `resetActiveProject()`: `activeWriteQueue.reset()` → `closeActiveProject()` → `setActiveProjectApi(projectApi)`.
- `flushProjectWrites()`.

Diğer test kuralları:
- `projectStoreTestUtils.ts` M5b'de **değişmez**. 14 dosya onu localStorage semantiğiyle kullanıyor; `loads.windSnapshot` anahtarı için bugün bir depolama anahtarı yok. Bu iş M5c'ye kalır.
- Hook testleri `renderHook` ile ve `QueryClientProvider` içinde (`new QueryClient({ defaultOptions: { queries: { retry: false } } })`) yazılır.
- Fake timers kullanan testlerde `waitFor`/`findBy*` kullanılmaz. Bunun yerine `await act(async () => { await result.current.openProject(id) })` ve `await act(() => vi.advanceTimersByTimeAsync(1000))`. Bileşen testleri gerçek timer ve `findBy*` kullanır.
- Her oturum testi dosyası `afterEach(resetActiveProject)` çağırır ve kendi `onProjectSwitch` aboneliklerini kaldırır.

**K9 – Bağlanmadığının kanıtı:** `src/test/architecture/sessionLayerUnwired.test.ts`.
- `NEW_SESSION_MODULES` listesi: 18 production yolu, uzantısız `/src/...`.
- Production kaynakları taranır (`*.test.*` ve `/src/test/` hariç, yorumlar çıkarılır). Göreli import'lar çözülür; `.ts`/`.tsx` uzantısı atılır.
- Listede olmayan bir dosya listedeki bir modülü import ederse test kırılır. Listede olup bulunamayan bir girdi de (bayat) kırar.
- `layerRules.test.ts`'ten import edilmez, çünkü testleri iki kez kaydedilir; ayrıştırıcı kopyalanır (`noBrowserStorage` ile aynı gerekçe).
- M5c bu testi siler.

**K10 – CSS**
- Yeni dosya `frontend/src/app/styles/app/18-project-session.css`. `App.css`'in sonuna `@import './app/18-project-session.css';` eklenir; mevcut sıra değişmez.
- Yalnızca `.spn-session-*` önekli yeni seçiciler: `-dialog-wide` (`width: min(560px, calc(100vw - 32px))`), `-list`, `-list-row`, `-list-meta`, `-field`, `-status` (`[data-status]`), `-screen`.
- Renkler `var(--spn-…, fallback)` ile, `:269`'daki gibi. Mevcut sınıflara kural eklenmez, dolayısıyla görsel etki yoktur.
- Bileşenler CSS import etmez (repo konvansiyonu).

---

## 3. Sıralı uygulama adımları

0. **Baseline.** `cd frontend && npm test` ile dosya ve test sayısını kaydet (PowerShell'de `npm.cmd`). `git status --short` temiz olmalı (feature dokümanları hariç).
1. **`shared/project-store/activeProject.ts`, `useSaveStatus.ts`** ve testleri `activeProject.test.ts`, `useSaveStatus.test.tsx` (AC1, AC2).
2. **Test yardımcıları:** `src/test/fakeProjectApi.ts`, `src/test/projectSessionTestUtils.ts`, `src/test/fakeProjectApi.test.ts` (AC18).
3. **Yedi bölüm örneği dosyası** (K2) ve `app/project-session/serverSectionInstances.test.ts` (AC3). Test `projectSections.ts`'i import ederek tüm örneklerin kaydını garanti eder; kayıt defterini tanımlarla karşılaştırır.
4. **`app/project-session/projectSections.ts`** ve `projectSections.test.ts` (AC5–AC7; fake timers).
5. **`app/project-session/projectDisplay.ts`, `saveStatusText.ts`, `useProjectList.ts`** ve testleri `projectDisplay.test.ts`, `saveStatusText.test.ts`, `useProjectList.test.tsx`.
6. **`app/project-session/useProjectSessionController.ts`** ve `useProjectSessionController.test.tsx` (AC8–AC13). URL için harness: `useState` + sarmalayıcı; `setUrlProjectId` için spy; bir test `<StrictMode>` ile.
7. **Bileşenler:** `ProjectListDialog.tsx`, `NewProjectDialog.tsx`, `SaveStatusIndicator.tsx`, `ProjectLoadScreen.tsx`, her birinin `*.test.tsx`'i (AC14–AC17). Ardından `18-project-session.css` ve `App.css`'e tek satır import (K10).
8. **`src/test/architecture/sessionLayerUnwired.test.ts`** (AC4).
9. **Dokümanlar.**
   - `docs/architecture.md`: M5a bölümünden sonra "## BACKEND-DB-PERSISTENCE M5b (tarih)". İçerik: singleton sırası, `onProjectSwitch` sözleşmesi, prepare/apply/close, controller akışları, kapı, eski yanıt koruması, URL enjeksiyonu, D6'nın M5c'ye ertelendiği, bağlanmamışlık testi, CSS dosyası.
   - `docs/roadmap.md`: 1923'ten sonra `  - [x] M5b …`.
10. **Kontroller** (Bölüm 4). Satır sonları: yeni dosyalar komşu dosyaların biçimini izler (M5a CRLF'yi dosya bazında korudu).

**Değişen mevcut dosyalar:** `frontend/src/app/styles/App.css` (+1 satır), `docs/architecture.md`, `docs/roadmap.md`.

**Yeni production dosyaları (18):** 2 tane `shared/project-store` (`activeProject.ts`, `useSaveStatus.ts`); 7 tane feature bölüm örneği; 9 tane `app/project-session`: `projectSections.ts`, `useProjectSessionController.ts`, `useProjectList.ts`, `projectDisplay.ts`, `saveStatusText.ts` ve 4 bileşen. Ayrıca 1 CSS dosyası.

**Yeni test ve yardımcı dosyaları:** `activeProject.test.ts`, `useSaveStatus.test.tsx`, `serverSectionInstances.test.ts`, `projectSections.test.ts`, `projectDisplay.test.ts`, `saveStatusText.test.ts`, `useProjectList.test.tsx`, `useProjectSessionController.test.tsx`, 4 bileşen testi, `fakeProjectApi.ts`, `fakeProjectApi.test.ts`, `projectSessionTestUtils.ts`, `sessionLayerUnwired.test.ts`.

---

## 4. Doğrulama

### 4.1 Matris

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1, AC2 | `npx vitest run src/shared/project-store/activeProject.test.ts src/shared/project-store/useSaveStatus.test.tsx` | yeşil |
| AC3 | `npx vitest run src/app/project-session/serverSectionInstances.test.ts` | 17 kayıt; id/path eşit; 0 istek |
| AC4 | `npx vitest run src/test/architecture`; ayrıca 7 bölüm örneği dosyasının import satırları incelenir | yeşil; yalnızca `activeProject` ve kendi wire dosyası |
| AC5–AC7 | `npx vitest run src/app/project-session/projectSections.test.ts` | hata fırlatma ve değişmezlik; epoch +1; 1 s'de 0 PUT; kapatma sonrası boş |
| AC8–AC13 | `npx vitest run src/app/project-session/useProjectSessionController.test.tsx` | istek günlükleri AC'deki gibi |
| AC14–AC17 | `npx vitest run src/app/project-session` | yeşil |
| AC18 | `npx vitest run src/test/fakeProjectApi.test.ts` | yeşil |
| AC19 | `cd frontend && npm run build && npm test && npm run lint` (PowerShell: `npm.cmd`); `git diff --name-only <baseline> -- frontend/src`; `git status --short -- backend frontend/package.json frontend/package-lock.json`; yeni dosyalarda `WindSnapshotInputsValue` ve `localStorage\|sessionStorage\|indexedDB\|StorageEvent\|'storage'` için grep | çıkış 0; yalnızca `App.css`; boş; 0 eşleşme |
| AC20 | inceleme | var |

Beklenen test sayısı: baseline + yeni dosyalar (yaklaşık 15 yeni test dosyası). Silinen ya da atlanan test yok.

### 4.2 Riskler
- **Vitest fake timers ve RTL `waitFor`:** Birlikte takılabilir (RTL yalnızca jest timer'larını tanır). Kural K8'de tanımlı.
- **Switch dinleyicileri ve eski değerler:** Dinleyiciler hydrate'ten önce çalışır, bu anda bölümler eski projenin değerlerini tutar. Bu sözleşme JSDoc'ta yazılır; M5c'deki dinleyiciler buna uymalıdır.
- **StrictMode'da çift effect:** Dev'de iki GET gidebilir. Sayaç sayesinde tek apply yapılır; AC13 bunu sınar.
- **URL ve session güncellemelerinin toplanması:** Controller ikisini aynı senkron devamda günceller; effect yalnızca URL değişimine tepki verir. M5c adaptörü `setUrlProjectId`'yi senkron (replace) çağırmalıdır.
- **Uzlaştırma ayna ile sunucuyu ayırabilir:** Yetim tanımlar düşer, akslar yeniden üretilir. Bu durumda ayna sunucudan farklı olur ve bir sonraki bridge yazması uzlaştırılmış değeri gönderir. Bugünkü localStorage davranışıyla aynı (üst plan R1).
- **Kayıt defterinde değiştirme semantiği:** Yanlışlıkla iki örnek oluşturulmasını sessizce gizleyebilir. AC3'teki 17 benzersiz kayıt testi bunu yakalar.
- **`App.css` değişikliği:** Sona eklenen ve yalnızca yeni seçiciler içeren bir import; sıralamaya bağlı mevcut kurallar etkilenmez.
- **`formatUpdatedAt` ve yerel saat:** Testler aynı yardımcıyla karşılaştırır, sabit bir metin beklemez.

### 4.3 Varsayımlar
- Vitest varsayılan dosya izolasyonu sürüyor (`vite.config.ts`'te override yok, doğrulandı).
- `@tanstack/react-query` v5 API'si: `enabled`, `select`, `signal`, `invalidateQueries({ queryKey })`. Paket sürümü ^5.102.8 doğrulandı; API repo içinde ayrıca doğrulanmadı.
- 404 başlığındaki "Proje bulunamadı" metni planlayıcı kararıdır, değiştirilebilir. M5c elle kontrol adımı 12 ile uyumludur.
- Focus trap olmaması bilinçli (repo konvansiyonu).
- Hiçbir mühendislik değeri, varsayılan ya da birim eklenmedi. Yalnızca `INITIAL_PROJECT` ve mevcut fixture'lar kullanılıyor.

### 4.4 Açık sorular
Malzeme düzeyinde açık soru yok.

**READY**
