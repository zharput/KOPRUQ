# Plan: g3 (G3 grubu: proje kapsamlı veri sözleşmesi, `.kopruq` kayıt doğrulaması, Recent kimliği; A-01, A-07, C-013-01, C-013-03)

Durum: READY. Kullanıcı Q1–Q5'te önerilen seçenekleri seçti; kararlar §9'da (K1–K5).

Kaynak: frontend review `docs/reviews/2026-10-11T14-19-35Z`. Kanıt: `architecture.md:63-75` (A-01), `:122-125` (A-07), `:77-87` (A-02, yalnızca işaretli); `batches/013.md:9-15` (C-013-01), `:24-29` (C-013-03); `report.md:140,142,203-204`; `code-quality.md:6-14`. Önceki işler: `docs/features/frontend-remediation/plan.md` (Faz 1-2), `docs/features/frontend-data-integrity/{plan,implementation}.md`, `docs/architecture.md:3042-3060,3102-3110`.

## 1. Amaç ve kapsam dışı
**Amaç**
- **A-01 / A-07:** Projeye ait, localStorage'da tutulan veri (graph, 5 aile kataloğu, 8 modül) tek bir tipli sözleşmede (registry) toplanır. Build, validate, apply, snapshot, restore ve reset bu listeden çalışır. Proje verisine yazan her yol `kopruq:project-data-changed` yayar (dirty takibi). Anahtar ve olay adları tek yerde tanımlanır.
- **C-013-01:** Mevcut TypeScript tiplerine göre yapı, tip ve zorunlu alan doğrulaması: `projectState` (proje ve köprü satırları), `bridgeDefinitions`, aile kayıtları, graph düğüm ve bağlantıları. Herhangi bir geçersiz kayıtta dosyanın tamamı reddedilir (K1); depo, React state, `ref` ve dirty değişmez; hata mesajı yolu söyler. Eski dosyalar mevcut normalizasyonlarla (`readProjectState`, `mergeDefinition`, `ensureBridgeIds`) açılmaya devam eder.
- **C-013-03:** Recent kaydının kimliği dosya adı olmaktan çıkar; aynı adlı farklı dosyalar tek kayıtta birleşmez.

**Kesin kapsam dışı:** Backend, REST, yeni npm bağımlılığı, `package.json`; yeni localStorage anahtarı; `.kopruq` dosya yerleşimi ve `schemaVersion` (1'de kalır, K4); IndexedDB adı/sürümü/keyPath'i ve `kopruq.recent-projects.metadata.v1`; yeni mühendislik sabiti, birim, sayısal aralık veya pozitiflik kuralı (sayılar yalnızca `number` olarak kontrol edilir).

**İşaretli ama planlanmayan:** A-02 (köprü tanımları `no` ile anahtarlı, `bridge-definition/model/store.ts:43,49`, `registry.ts:51`; `ensureBridgeDefinitions` karşılığı olmayan tanımları düşürür — yalnızca yeniden kullanılır, göç ayrı karar); C-012-09 (tekrarlanan/negatif `no`); A-08 (`shared/project-file` → `features` import yönü); `windLoads` snapshot'ı yalnızca React state'inde (`App.tsx:70`), kalıcı yapmak yeni anahtar gerektirir; ham okumalar (`registry.ts:17,24,49`, `BridgeDefinitionWorkspace.tsx:49`, `SystemAssemblyPanel.tsx:59`, `PreferredSpanPanel.tsx:28`, `FamilyTablesWorkspace.tsx:40` ölü ekran, `graphStore.ts:89`); diğer `kopruq:*-catalog-changed` olayları; normal Open'ın `showOpenFilePicker` ile handle alması.

## 2. Mevcut mimari ve bulguların yeniden doğrulanması
Yollar `frontend/src/` altında.

| ID | Sonuç | Kök neden ve kanıt |
|---|---|---|
| A-01 | Kısmen düzeltilmiş | Düzeltilen: 8 modül dosyaya giriyor (`shared/project-file/projectModules.ts:75-84`, `projectFileService.ts:15`); New/Open sıfırlama ve geri alma var (`:70-114`); cross-section ve self-weight kalıcı. Kalan kök neden: proje verisinin tek tanımı yok. Bölümler (projectState, bridgeDefinitions, graph, `CATEGORIES`, modüller, windLoads) her işlevde elle sayılıyor: build `projectFileService.ts:13-15`, validate `:17-31`, snapshot `:69-72`, restore `:73-77`, reset `:80-94`, apply `:95-114`. Reset'te girder özel durumu: `:85` ayrıca `savePrecastGirderDefinition([])`, `:86` `girderLibrary` hariç. Kategori listesi üç yerde: `projectFileService.ts:10`, `familyRepository.ts:10-16`, `useFamilyCatalog.ts:53-55`. Dirty takibi iki mekanizma: olay (`useProjectFile.ts:13`) ve üç React state'inin parmak izi (`:12,14`); `windLoads` yalnızca React state'inde (`App.tsx:70`). |
| A-07 | Kısmen düzeltilmiş | Düzeltilen: modüller (`projectModules.ts:40-44`), aileler (`familyRepository.ts:48`), girder (`:27`), graph (`graphStore.ts:66`), proje (`projectWorkspace.ts:85`) ve tanımlar (`store.ts:55`) `project-data-changed` yayıyor. Hâlâ geçerli: `materials/components/MaterialsPanel.tsx:46` MATERIAL anahtarına repository'yi atlayarak her mount'ta yazıyor ve yalnızca `kopruq:material-catalog-changed` yayıyor; malzeme dosyada olduğu halde değişiklik dirty yapmıyor. Tekrarlanan literal'ler: `PierFamiliesPanel.tsx:9`, `useFamilyCatalog.ts:54`, `registry.ts:24,49`, `BridgeDefinitionWorkspace.tsx:32`, `SystemAssemblyPanel.tsx:59`, `PreferredSpanPanel.tsx:8`, `FamilyTablesWorkspace.tsx:40`. Olay adı `'kopruq:project-data-changed'` 7 dosyada literal: `projectModules.ts:14`, `familyRepository.ts:27,48`, `graphStore.ts:66`, `projectWorkspace.ts:85`, `store.ts:55`, `useProjectFile.ts:13`. |
| C-013-01 | Kısmen düzeltilmiş | Düzeltilen: `modules` normalizasyonu ve 8 modülün zod doğrulaması (`projectFileService.ts:22-29`), `windLoads` şeması (`:9,24`), birim normalizasyonu (`:117`). Kalan: `:19` yalnızca truthy/dizi kontrolü; `:20` `validateGraphDocuments` (`graphStore.ts:53-57`) yalnızca graph düzeyinde, `nodes:[{}]` geçiyor; `:21` aile kayıtları için yalnızca `Array.isArray`, `PIER:[null]` geçiyor; açılan `projectState` normalize edilmeden `setProjectState` ile uygulanıyor (`useProjectFile.ts:17`). Çökme noktaları: `App.tsx:102-103` (`project.environment` eksikse); `store.ts:49` ve `BridgeDefinitionWorkspace.tsx:64` (`bridgeDefinitions:{}` iken `definitions` undefined). |
| C-013-03 | Kısmen düzeltilmiş | Düzeltilen: handle'sız kayıt başka dosyanın handle'ını devralmıyor (`recentProjects.ts:13` `retained=handle`; test `recentProjects.test.ts:19`). Kalan: `recentProjects.ts:13` `const id=fileName`; aynı id IndexedDB keyPath'inde (`:10`), `sessionHandles`'ta ve `TopWorkspaceNav.tsx:14` `key={entry.id}`'de. `X\Bridge.kopruq` ve `Y\Bridge.kopruq` tek kayda iniyor, sonuncusu öncekini eziyor. Normal Open handle taşımıyor (`TopWorkspaceNav.tsx:14` input, `App.tsx:90`); reselect yalnızca adı karşılaştırıyor (`App.tsx:99`). |

Diğer olgular: `zod ^3.25.76` zaten bağımlılık (`package.json:32`); `build` = `tsc -b && vite build`, `test` = `vitest run`, `lint` = `oxlint`; CI yok; son kayıt 79 dosya / 584 test yeşil (doğrulanmadı, geçerli olan T0 çıktısı); `src/test/setup.ts` testler arasında localStorage'ı temizlemiyor; repoda örnek `.kopruq` dosyası yok; `PierFamiliesPanel.tsx:17` eski `pierType` değerlerini (`H_TYPE`, `WALL`) göç ettiriyor; AGENTS.md:1274 "persistence backward compatibility" korunan sözleşme, AGENTS.md:1301,1309: `groups` alanı olmayan graph belgeleri geçerli kalmalı.

## 3. Tasarım

### 3.1 Tek sözleşme: `shared/project-file/projectDataContract.ts` (yeni)
```ts
export type ProjectDataEntry<T> = {
  id: string                 // 'graph' | 'families.PIER' … | 'modules.seismicInputs' …
  label: string
  filePath: readonly string[] // ['graph'] | ['families','PIER'] | ['modules','seismicInputs']
  storageKeys: readonly string[]
  presence: 'required' | 'optional-reset-and-report'
  exportValue(): T | null
  parse(value: unknown): T    // ProjectFileValidationError (path + message) fırlatır
  apply(value: T): void       // depolama reddederse fırlatır
  reset(): void               // fırlatır; sıfırlamanın gerçekten olduğunu doğrular
  snapshot(): unknown
  restore(snapshot: unknown): void
}
export const PROJECT_DATA_ENTRIES: readonly ProjectDataEntry<unknown>[]
```
Sıra: `graph`; `families.PIER`, `PIER_CAP`, `FOUNDATION`, `BEARING`, `MATERIAL`; `PROJECT_MODULE_IDS` sırasıyla 8 modül.
- **graph:** mevcut `graphStore` export/import/reset/validate fonksiyonları; snapshot `exportGraphDocuments` ile (graph bellekte de tutuluyor); `presence: 'required'`.
- **families:** `familyRepository` `FAMILY_CATEGORIES` ve `familyStorageKey(category)` dışa açar; `CATALOGS` tek kaynak. `apply`, `saveFamilyRecords` false dönerse `Unable to import family data: <CAT>` fırlatır. `presence: 'required'` (mevcut `Missing family data: <CAT>`).
- **modüller:** `PROJECT_MODULES` adaptörü; `presence: 'optional-reset-and-report'`; mevcut D-1 davranışı ve `kopruq.backup.*` yedeği korunur. `girderLibrary` reset'i bugünkü gibi `savePrecastGirderDefinition([])`; diğerlerinde `reset()` sonrası anahtarın silindiği doğrulanır. `resetProjectStorage:85-86` özel durumu entry'ye taşınır.

`projectFileService.ts` bu listeyle çalışır: `buildProjectFile`, `validateProjectFile`, `applyProjectFile`, `snapshotProjectStorage`, `restoreProjectStorage`, `resetProjectStorage` `PROJECT_DATA_ENTRIES` üzerinde döner; `CATEGORIES` kaldırılır; `ProjectStorageSnapshot` opak `Record<entryId, unknown>`. Mevcut hata metinlerinin hepsi aynen korunur: `Invalid or unsupported KOPRUQ project file.`, `Missing family data: <CAT>`, `Invalid project data in file: <id>`, `Invalid wind load data in project file.`, `Unable to import family data: <CAT>`, `Unable to reset family catalog: <CAT>`, `Unable to reset girder catalog.`, `Unable to reset project data: <id>`, `Project import failed and rollback failed: …`.

**React'in sahip olduğu bölümler:** `projectState`, `bridgeDefinitions`, `windLoads` aynı dosyada `PROJECT_FILE_SESSION_SECTIONS` (parse + normalize) olarak tanımlanır; uygulama bugünkü gibi `useProjectFile` setter'larıyla; dirty parmak izi `[projectState, bridgeDefinitions, windLoads]` aynı.

**Dirty sözleşmesi:** parametrik test her entry için: değişen `apply` `kopruq:project-data-changed` yayar; `exportValue → parse → apply` round-trip eşit; `snapshot → apply(başka) → restore` önceki değeri geri getirir; `reset` boş duruma götürür.

**Olay sabiti:** `PROJECT_DATA_CHANGED_EVENT`, `shared/project-file/projectDataEvents.ts` (yeni, bağımlılıksız); §2'deki 7 literal bununla değişir.

### 3.2 A-07 yazma yolları ve literal'ler
- `MaterialsPanel.tsx:46`: `saveFamilyRecords('MATERIAL', rows)`; yazma yalnızca `JSON.stringify(rows) !== JSON.stringify(getFamilyRecords('MATERIAL'))` ise. Boş katalogda ilk girişte varsayılan 8 satır yazılır ve proje bir kez dirty olur (K5). `saveFamilyRecords`'a global "değişmediyse yazma" eklenmez.
- Literal yerine sabit (davranış değişmez): `useFamilyCatalog.ts:53-55` → `familyStorageKey`; `PierFamiliesPanel.tsx:9` → `familyStorageKey('PIER')`; `registry.ts:24` → `familyStorageKey('MATERIAL')`; `registry.ts:49` → `store.ts`'ten dışa açılan `BRIDGE_DEFINITIONS_STORAGE_KEY`; `BridgeDefinitionWorkspace.tsx:32` ve `SystemAssemblyPanel.tsx:59` → `PROJECT_MODULES.preferredSpanRules.key`; `PreferredSpanPanel.tsx:8` → `PROJECT_MODULES.girderLibrary.key`; `FamilyTablesWorkspace.tsx:40` → `graphStore`'dan dışa açılan `GRAPH_DOCUMENTS_STORAGE_KEY`. Ham okumalar okuma olarak kalır.

### 3.3 C-013-01 kayıt doğrulaması (şemalar sahibi model dosyalarında)
Ortak kurallar: zod şemaları ilgili TS tipine `z.ZodType<…>` ile bağlanır (ayrışmayı `tsc -b` yakalar); bilinmeyen alanlar `passthrough`; sayılar yalnızca `z.number()` (aralık/pozitiflik yok); hata biçimi `Invalid project file: <path> — <message>` (ör. `projectState.bridges[2].spansM[0]`), ilk birkaç sorun listelenir; K1: herhangi bir sorun dosyanın tamamını reddeder, ayıklama yok.

- **`features/project/model/projectStateSchema.ts` (yeni):** `ProjectWorkspaceData` alanları dosyada isteğe bağlı ama varsa tipli (string alanlar; `units`, `coordinate`, `criteria` kısmi string nesneleri; `environment` `{terrainDatasetId, landXmlImportId}: string|null` kısmi); eksikler doldurulur (K2a). `BridgeRow`: tipte zorunlu her alan zorunlu — `no`, `km`, `crossingType`, `terrain`, `status` string; `estimatedLengthM`, `roadWidthM` number; `bridgeType ∈ BRIDGE_TYPES`; `spansM: number[]`; `girderDepthCm: number[]|null`; `girderNote: string|null`; `pierShape ∈ PIER_SHAPES`; `id?: string` eksikse normalizasyonda atanır. `projectWorkspace.ts`'ten saf `normalizeProjectState(saved, fallbackBridges)` çıkarılır (gövde bugünkü `readProjectState:76-80`: INITIAL_PROJECT birleştirme, `normalizeProjectUnits`, `ensureBridgeIds`); `readProjectState` bunu kullanır, davranış aynı.
- **`features/bridge-definition/model/schema.ts` (yeni):** `BridgeDefinitionStore`: `definitions` zorunlu ve nesne kaydı (dizi değil); `selectedBridgeId: string|null`. Her tanım: `BridgeInstanceDefinition` alanları isteğe bağlı ama varsa tipli (`BridgeAxis` `type ∈ BridgeAxisType`, kısmi `AxisFamilyAssignments`, `BridgeConstraint` `kind ∈ ConstraintKind`, `viewMode ∈ BridgeViewMode`, kısmi `abutmentFamilyIds`). Normalizasyon mevcut `ensureBridgeDefinitions(store, bridges)` ile (`mergeDefinition` varsayılanları + mevcut "span sonlu ve > 0" filtresi, `store.ts:33`, yeni kural değil).
- **`features/family-registry/model/familySchemas.ts` (yeni):** her kayıt null olmayan nesne ve `id: string` (K2b); kategoriye özel alanlar varsa tipli: `PierFamily`, `PierCapFamily`, `FoundationFamily`, `BearingFamily`, MATERIAL `{id, no:number, element, concreteClass}`, `Rule`/`FoundationRule`/`BearingRule` = `{min,max,delta: number|null}`, `Dimension` (`shared/ui/ParamSweepCard`); ayırt edici alanlar tip değerlerini kabul eder, `pierType` ek olarak eski `H_TYPE` ve `WALL` değerlerini kabul eder; aynı kategoride tekrarlanan `id` dosyayı reddeder (K2c), mesaj `families.<CAT>: duplicate id "<id>"`.
- **`features/graph/state/graphSchema.ts` (yeni):** `KopruqNode`: `id`, `type`, `name` string; `position {x,y}` number; `parameters` nesne (parametre değerleri doğrulanmaz, eski `tw*` göçü bunlara dayanıyor). `KopruqConnection`: 5 string alan. `groups?: GraphGroup[]`. `validateGraphDocuments` bu şemayı kullanır; mevcut metinler korunur.

**Akış:** `readProjectFile` = parse → `validateProjectFile` (şemalar) → `migrateLegacyBoxPierParameters` → yeni `normalizeProjectFile` (`normalizeProjectState`, `ensureBridgeDefinitions` normalize edilmiş köprülerle, bugünkü birim normalizasyonu). Doğrulama `useProjectFile.open`'da depo snapshot'ından ve `applyProjectFile`'dan önce çalışır (`useProjectFile.ts:17`). Ret durumunda depo, React state, `ref` ve dirty değişmez; önceki projenin dosya referansı geçerli kalır.

### 3.4 C-013-03 Recent kimliği (`recentProjects.ts`)
- Yeni kayıt id'si `crypto.randomUUID()`; yoksa `newBridgeId` desenindeki yedek. Mevcut id'ler (= dosya adı) opak string olarak korunur, göç yok (K3b); IndexedDB şeması ve metadata anahtarı aynı.
- Yeni `recordRecentProject(projectName, fileName, handle?, recentId?) → Promise<{ id, recent }>`; `rememberRecentProject` listeyi döndüren ince sarmalayıcı olarak kalır. Eşleşme sırası: (1) `recentId` verilmiş ve kayıt varsa → o kayıt; (2) handle varsa → handle taşıyan kayıtlar arasında `await handle.isSameEntry(existing)` (yoksa/hata verirse eşleşme yok sayılır); (3) handle yoksa → yalnızca aynı `fileName`'li handle'sız kayıtla birleşir, handle'lı kayda hiç dokunulmaz (K3a); (4) hiçbiri → yeni kayıt.
- IndexedDB uyarısı: `isSameEntry` eşleştirmesi readwrite transaction açılmadan önce yapılmalı (`readAll` + await); transaction içinde await otomatik commit eder.
- `FileRef` (`projectFileService.ts:11`): isteğe bağlı `recentId?: string`. `useProjectFile.open` ve `save` dönen id'yi `ref`'e yazar; `save(saveAs=true)` `recentId` geçirmez.
- `App.tsx`: `openRecentProject` `{ name, handle, recentId: entry.id }` geçirir; `repairRecentProject(entry, handle)` aynı kaydı `recentId: entry.id` ile onarır; ad kontrolü (`App.tsx:99`) korunur.
- `TopWorkspaceNav.tsx` (K3c): her Recent satırında `fileName` ve zamanın yanında `<small>` içinde `projectName`; `available` false ise mevcut Türkçe Recent mesajlarıyla uyumlu kısa "erişim yok" ibaresi; mevcut `title` ve `aria-label` korunur.

### 3.5 Uyumluluk
Dosya yerleşimi aynı: `format`, `schemaVersion: 1`, `applicationVersion`, `projectState`, `bridgeDefinitions`, `graph`, 5 `families`, `modules` (8 modül + `windLoads`); okuyucu eklenmez (K4). Mevcut uygulamanın ürettiği dosya yeni doğrulamadan geçmek zorunda (kabul testi). Eski dosyalarda eksik proje alanları, tanım alanları ve köprü id'leri mevcut normalizasyonlarla doldurulur; yanlış tipte alan, normalize edilmeyen `BridgeRow` alanı eksikliği, enum dışı değer veya tekrarlanan aile id'si dosyayı reddeder. localStorage anahtar kümesi değişmez; eski Recent kayıtları listelenir ve açılır.

## 4. Alternatifler
- Her bölüm için ayrı fonksiyonlar (bugünkü durum): her yeni veri için 6 yer elle güncellenir; A-01'in kök nedeni → reddedildi.
- `projectState`/`bridgeDefinitions`'ı depo entry'sine çevirmek: App state sahipliğini değiştirir → reddedildi; şema ve normalizasyon sözleşmede, uygulama setter'larda.
- Tüm bölümler için raw-key snapshot: graph bellekte tutulduğu için yetersiz; entry başına snapshot/restore.
- `saveFamilyRecords`'a global "değişmediyse yazma": geniş etkili, localStorage testler arası temizlenmediği için spy testlerini kırabilir; yerel karşılaştırma seçildi.
- Geçersiz kayıtları ayıklayarak açmak: mühendislik verisini düşürür, referansları sarkıtır → reddedildi (K1).
- Ailelerde tam katı tip: eski kayıtları reddeder → reddedildi (K2b).
- Recent için `fileName+projectName` veya içerik hash'i: güvenilir kimlik vermez; UUID + `isSameEntry` seçildi.
- Normal Open'ı `showOpenFilePicker` ile yapmak: kapsam dışı, ayrı iş.
- `schemaVersion` 2: biçim değişmediği için gereksiz (K4).

## 5. Sıralı görevler (test-first)
Komutlar `frontend/` içinde (PowerShell'de `npm.cmd` gerekebilir). Her görevde önce test yazılır ve kırmızı olduğu çalıştırılarak kaydedilir; sonra düzeltme. Uygulayıcı git işlemi yapmaz.

- **T0 Baseline (kod yok):** `npm run build`, `npm test`, `npm run lint`; exit kodları, dosya/test sayıları, başarısız test adları, dosya bazında oxlint uyarıları. `node_modules` yoksa dur, sessiz kurulum yapma.
- **T1 Sözleşme (bağ: T0):** Yeni `shared/project-file/projectDataEvents.ts`, `projectDataContract.ts`, `projectDataContract.test.ts`. Değişen: `projectFileService.ts`; `projectModules.ts` (olay sabiti, `snapshotModuleStorage`/`restoreModuleStorage` sözleşmeye taşınır veya sarmalanır); `family-registry/model/familyRepository.ts` (`FAMILY_CATEGORIES`, `familyStorageKey`); `family-registry/hooks/useFamilyCatalog.ts`. Testler: entry id/anahtar listesi = graph + 5 aile + 8 modül, toplam 14 anahtar; her entry için round-trip, `apply` olayı, snapshot/restore, reset; `buildProjectFile` çıktısının üst düzey ve `families`/`modules` anahtarları bugünküyle aynı; mevcut `projectFileService.test.ts`, `useProjectFile.test.tsx`, `projectModules.test.ts`, `App.test.tsx` değişmeden yeşil.
- **T2 A-07 yazma yolları ve literal'ler (bağ: T1):** `materials/components/MaterialsPanel.tsx`; olay sabiti için `features/project/model/projectWorkspace.ts`, `bridge-definition/model/store.ts`, `graph/state/graphStore.ts`, `useProjectFile.ts`; §3.2 literal noktaları. Yeni `MaterialsPanel.test.tsx`: sınıf değişimi `kopruq:project-data-changed` yayar ve `getFamilyRecords('MATERIAL')` günceldir; depo güncelken mount olay yaymaz; boş katalogda ilk mount 8 varsayılan satırı yazar ve bir kez yayar.
- **T3 C-013-01 (bağ: T1):** Yeni dört şema dosyası (§3.3) ve testleri; değişen `projectWorkspace.ts` (`normalizeProjectState`), `graphStore.ts` (`validateGraphDocuments`), `projectFileService.ts` (`validateProjectFile`, `readProjectFile`, `normalizeProjectFile`), gerekirse `useProjectFile.ts`. Önce kırmızı olacak testler (`projectFileService.test.ts`, `useProjectFile.test.tsx`):
  - Ret durumları (mesaj yolu adlandırır): `project.environment: 5`; `units.length: 5`; `bridges:[{}]`; `bridges[0].spansM:['x']`; `bridgeType:'X'`; `bridgeDefinitions:{}`; `definitions:[]`; `definitions.V.axes:[{}]`; `families.PIER:[null]`; `PIER:[{name:'x'}]`; aynı kategoride iki `{id:'p'}`; `graph…nodes:[{}]`; `connections:[{}]`.
  - Her ret durumunda `open` sonrası: graph, 5 aile ve 8 modül anahtarı bayt bazında aynı; `kopruq.project-workspace.v1` ve `kopruq.bridge-definitions.v1` aynı; `ref`, dirty ve React state değişmemiş.
  - Uyumluluk: `environment`/`criteria`/`coordinate` eksik → INITIAL değerleriyle dolar; tanımda alan eksik → `createBridgeDefinition` varsayılanları; `id`'siz köprü → id atanır; `groups`'suz graph açılır; eski box pier `tw` göçü çalışır; `modules`'suz dosya açılır; `pierType:'H_TYPE'` aile kabul edilir.
  - Gerçek varsayılanlar: `INITIAL_BRIDGES`, dolu bir tanım, PIER panelinin `INITIAL` ailesi ve MATERIAL satırlarıyla üretilen dosya doğrulamadan geçer.
- **T4 C-013-03 (bağ: T1; `useProjectFile` değişikliği T3'ten sonra):** `recentProjects.ts`, `recentProjects.test.ts`, `projectFileService.ts` (`FileRef.recentId`), `useProjectFile.ts`, `app/App.tsx`, `app/layout/TopWorkspaceNav.tsx`. Testler (jsdom'da IndexedDB yok; metadata yolu ve `isSameEntry` mock'ları): yeni kayıt id'si ≠ fileName; aynı adlı iki handle, `isSameEntry` false → iki kayıt, her biri kendi handle'ıyla; `isSameEntry` true → tek kayıt güncellenir; handle'sız açma yalnızca aynı adlı handle'sız kayıtla birleşir, aynı adlı handle'lı kayıt değişmez; `recentId` ile Save aynı kaydı günceller, Save As `recentId` taşımaz; repair seçilen kaydı onarır; eski `{id:'Bridge.kopruq'}` kaydı listelenir ve güncellenebilir; aynı adlı iki kayıt listede `projectName` ile görünür, `available:false` olanda "erişim yok" ibaresi var; mevcut `recentProjects.test.ts:8-19` yeşil.
- **T5 Dokümantasyon (bağ: T1–T4):** `docs/architecture.md` ve `docs/roadmap.md`'ye "G3 track" (sözleşme tablosu, doğrulama kuralları, Recent kimliği, K1–K5, işaretli kapsam dışı maddeler); `docs/kopruq-data-architecture.md`'ye MATERIAL'in artık repository üzerinden yazıldığı notu.

## 6. Kabul kriterleri
- **AC1** T0 baseline ve final build/test/lint çıktıları (exit, sayılar, başarısız adlar, dosya bazında uyarılar) kayıtlı.
- **AC2** `PROJECT_DATA_ENTRIES` 14 depo anahtarını tek listede tanımlar. `projectFileService.ts`'te `CATEGORIES` veya ayrı kategori/modül döngüsü yok. Aile anahtarları yalnızca `familyRepository.ts`'te.
- **AC3** Her entry için round-trip, değişiklikte `project-data-changed`, snapshot/restore ve reset testleri yeşil.
- **AC4** Dosya yerleşimi, `schemaVersion: 1` ve §3.1'deki hata metinleri değişmemiş; mevcut testler yeşil.
- **AC5** Malzeme sınıfı değişikliği projeyi dirty yapar. Depo güncelken Materials mount'u dirty yapmaz. Boş katalogda ilk giriş varsayılan satırları yazar ve bir kez dirty yapar.
- **AC6** §3.2'deki literal noktaları sabite bağlı. Grep: proje veri anahtarı literal'leri yalnızca sahibinde, testlerde ve `legacyStorageMigration.ts`'te.
- **AC7** §5 T3'teki her bozuk dosya, yolu adlandıran mesajla tamamen reddedilir; depo (14 anahtar + proje ve tanım anahtarları), React state, `ref` ve dirty değişmez.
- **AC8** Eski dosya uyumluluk testleri ve gerçek varsayılanlarla üretilen dosyanın doğrulamadan geçme testi yeşil; sayısal aralık veya pozitiflik kuralı eklenmemiş.
- **AC9** `environment`'sız dosya açılınca `projectState.project.environment` varsayılan değerlerini alır; App çökmez.
- **AC10** Recent kimliği: id dosya adı değil; aynı adlı farklı dosyalar ayrı kayıt; aynı dosya (`isSameEntry`/`recentId`) tek kayıt; handle'sız açma handle'lı kayda dokunmaz; Save As yeni dosyayı eski kayda bağlamaz; repair doğru kaydı günceller; eski kayıtlar çalışır; listede `projectName` ve "erişim yok" ibaresi görünür; IndexedDB ve metadata anahtarları aynı.
- **AC11** `git diff --stat` yalnızca `frontend/src` ve `docs`; `package.json`, backend, localStorage anahtar kümesi ve `schemaVersion` değişmemiş.
- **AC12** build ve lint exit 0, değişen dosyalarda yeni oxlint uyarısı yok; `npm test` başarısız kümesi T0 kümesinin alt kümesi, yeni testler yeşil.
- **AC13** Dokümanlar güncel; A-02 ve diğer işaretli maddeler açık olarak listeli.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | T0 ve final: `npm run build`, `npm test`, `npm run lint` | çıktılar kayıtlı |
| AC2 | `npm test -- src/shared/project-file/projectDataContract.test.ts`; Grep `CATEGORIES` ve `kopruq.project-design-system.` (`frontend/src`, testler hariç) | yeşil; tek tanım |
| AC3 | aynı test dosyası | yeşil |
| AC4 | `npm test -- src/shared/project-file src/app/App.test.tsx` | yeşil |
| AC5 | `npm test -- src/features/materials` | yeşil |
| AC6 | Grep (koordinatör) | §3.2 listesi temiz |
| AC7–AC9 | `npm test -- src/shared/project-file src/features/project src/features/bridge-definition src/features/family-registry src/features/graph/state` | yeşil |
| AC10 | `npm test -- src/shared/project-file/recentProjects.test.ts src/shared/project-file/useProjectFile.test.tsx src/app` | yeşil |
| AC11 | `git diff --stat` (koordinatör) | yalnızca `frontend/src` ve `docs` |
| AC12 | `npm run build`; `npm test`; `npm run lint` | 0 / alt küme / 0, yeni uyarı yok |
| AC13 | doküman diff incelemesi | bölümler mevcut |

Bilinmeyenler ve elle doğrulama (Chromium): gerçek `FileSystemFileHandle.isSameEntry` ve IndexedDB'de handle saklama; farklı klasörlerde aynı adlı iki dosyayla Save/Recent/Open akışı; kullanıcının elindeki gerçek eski `.kopruq` dosyalarının açılması (repoda örnek yok).

## 8. Riskler
- **Eski dosyaların reddi (en büyük risk):** K1/K2 gereği eksik `BridgeRow` alanı, enum dışı değer, yanlış tip veya tekrarlanan aile id'si içeren eski dosyalar artık açılmaz. Önlemler: eksik alanlar mevcut normalizasyonlarla doldurulur; ailelerde "varsa tipli"; eski `pierType` kabul; mesaj yolu söyler. Geri alma: şema dosyaları geri alınırsa davranış bugünküne döner.
- **Açılışta normalizasyon:** daha önce ilk yeniden yüklemede olan iki işlem artık açılışta hemen olur ve sonraki Save normalize edilmiş veriyi yazar: `ensureBridgeIds` id'siz köprülere id verir; `ensureBridgeDefinitions` `no` karşılığı olmayan tanımları ve sıfır/negatif span'leri düşürür (A-02 ile ilişkili).
- **Dirty davranışı:** MATERIAL artık dirty üretir (K5); `useFamilyCatalog`'un ilk mount yazımı bugünkü gibi.
- **Recent:** transaction içinde await otomatik commit'e yol açar; eşleştirme transaction'dan önce yapılmalı; `isSameEntry` jsdom'da yok, mock ile test; handle'sız kayıtlarda kimlik yapısal olarak bilinemez — aynı dosya bir kez handle'lı bir kez handle'sız açılırsa iki satır görünür, `projectName` ve "erişim yok" ibaresiyle ayırt edilir.
- **Kapsam kayması:** ham okumaların repository'ye taşınması ve A-08 yapılmaz.
- **Güvenlik:** dosya güvenilmeyen girdi; doğrulama depoya yazmadan önce çalışır. Prototip anahtarları sorun değil (review `013.md:13`). Kimlik doğrulama verisi yok.
- **Rollback:** göç ve yeni anahtar yok; her görev kendi dosya kümesiyle geri alınabilir.

## 9. Varsayımlar ve kararlar
**Kullanıcı kararları (bağlayıcı)**
- **K1:** Herhangi bir geçersiz kayıtta (proje, köprü satırı, tanım, aile kaydı, graph düğümü/bağlantısı) dosyanın tamamı reddedilir; depo, React state, `ref` ve dirty değişmez; hata yolu adlandırır.
- **K2:** (a) Normalize edilmeyen `BridgeRow` alanları TS tipine göre zorunlu, enum'lar katı; normalize edilen alanlar (proje alanları, tanım alanları, köprü id'si) mevcut normalizasyonlarla doldurulur. (b) Aile kaydı = null olmayan nesne + `id: string` + kategoriye özel alanlar varsa tipli; eski `pierType` (`H_TYPE`, `WALL`) kabul. (c) Kategori içinde tekrarlanan aile id'si reddedilir.
- **K3:** (a) Handle'sız açma yalnızca aynı adlı handle'sız Recent kaydıyla birleşir, handle'lı kayda dokunmaz. (b) Mevcut Recent id'leri (= dosya adı) opak korunur, göç yok. (c) Aynı adlı kayıtlar listede `projectName` ve "erişim yok" ibaresiyle ayırt edilir (küçük `TopWorkspaceNav` UI değişikliği).
- **K4:** `schemaVersion` 1'de kalır, dosya yerleşimi değişmez, okuyucu eklenmez.
- **K5:** Boş MATERIAL kataloğunda ilk giriş varsayılan satırları yazar ve projeyi bir kez dirty yapar.

**Varsayımlar (doğrulanmadı):** mevcut uygulamanın yazdığı dosyalar TS tiplerine uyuyor (T3 gerçek varsayılan testi kanıtlayacak); UI `bridgeType`/`pierShape` için yalnızca `BRIDGE_TYPES`/`PIER_SHAPES` üretiyor (`excelImport.ts:50,54` cast ediyor); `isSameEntry` Chromium'da mevcut; "erişim yok" ibaresinin kesin metni uygulayıcıya bırakıldı, mevcut Türkçe Recent mesajlarıyla tutarlı olmalı.

Mühendislik kararı gerekmiyor: hiçbir sabit, birim, aralık veya kural eklenmiyor.

READY
