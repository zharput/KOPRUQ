# Plan: backend-db-persistence-m5a — M5 Hazırlık (davranış değişmez)

Üst plan: `docs/features/backend-db-persistence-m5/plan.md`, Bölüm A, §5 "M5a". Satır numaraları çalışma ağacına göre (HEAD `f34792e`) kod okunarak doğrulandı. Kapsam yalnızca frontend. M4 store bağlanmıyor, depolama kodu silinmiyor, localStorage tek kaynak olarak kalıyor (D1). Backend, `package.json` ve lock dosyası değişmiyor.

**Sonuç: READY.**

---

## 1. Davranış ve kabul kriterleri

Kullanıcının göreceği davranış değişmiyor. Yapılacaklar:
- Doğrudan depolama okumalarını sahip fonksiyonlara yönlendirmek.
- Saf model dosyasını ve yük girdisi tiplerini ayırmak (F2/F3).
- Ortak test yardımcısını yazmak, 13 test dosyasını ve `App.test.tsx`'in veri satırlarını ona taşımak.
- `noBrowserStorage` ratchet testini eklemek ve dokümanları güncellemek.

**Kabul kriterleri**

- **AC1 (üst AC1)**
  - `features/family-registry/model/registry.ts` ve `features/pier-families/components/PierFamiliesPanel.tsx` içinde ratchet sembollerinden hiçbiri kalmıyor.
  - `graphStore.ts` içindeki `addNode` birimleri `readProjectUnits()` ile okuyor (eski `:100` satırı).
  - `BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx` ve `PreferredSpanPanel.tsx`'te ratchet yalnızca `'storage'` literal'ini buluyor.
  - `src/test/architecture/noBrowserStorage.test.ts` yeşil. Sentetik testlerde listede olmayan bir dosyadaki eşleşme ve bayat bir liste girdisi testi kırıyor.
- **AC2 (üst AC2)**
  - `projectWorkspaceWire.ts`, `./projectWorkspace`'i import etmiyor; `./projectWorkspaceModel`'i import ediyor.
  - `loadsWire.ts`, `./loadsProjectModules`'i import etmiyor.
  - `projectWorkspace.ts` şu export'ları aynen sunmaya devam ediyor: `ProjectWorkspaceData`, `PersistedProjectState`, `INITIAL_PROJECT`, `normalizeUnitId`, `normalizeProjectUnits`, `ensureBridgeIds`, `normalizeProjectState`, `readProjectState`, `persistProjectState`. Yeni olarak `readProjectUnits` ekleniyor.
  - `loadsWire.ts` `SeismicInputs`, `WindInputs`, `TemperatureInputs` ve `SelfWeightInputs` tiplerini export etmeye devam ediyor. `projectDocument.ts:16` değişmiyor.
  - `tsc -b` temiz.
- **AC3 (üst AC3)**
  - Pier kataloğu yokken panel RECT-M'yi gösteriyor. Okurken yazma bugünkü gibi RECT-M'yi depoya yazıyor.
  - Depoda saklı `pierType: 'H_TYPE'` olduğu gibi kalıyor; okurken normalize edilmiyor.
- **AC4 (üst AC4, yeniden tanımlandı; bkz. K2)**
  - `PreferredSpanPanel` boyutları `getPrecastGirderDefinition` üzerinden okuyor.
  - `'storage'` ile yenileme çalışmaya devam ediyor; mevcut test değişmeden yeşil.
  - `kopruq:girder-catalog-changed` aboneliği M5a'da **eklenmiyor**, M5c'ye taşınıyor.
- **AC5 (üst AC5, yorumlandı; bkz. K1)**
  - 13 test dosyasında `localStorage` veya `StorageEvent` eşleşmesi 0.
  - `App.test.tsx`'te `localStorage` geçen satırlar yalnızca 6 `.kopruq`/Recent/New-Project-rollback testinde kalıyor (§4).
  - Taşınan her `expect` aynı değeri aynı matcher ile doğruluyor; yalnızca okuma ifadesi yardımcıya geçiyor.
  - `beforeEach` izolasyonu genişlemiyor ve daralmıyor.
- **AC6 (yeni: sahip okuması eşdeğerliği)** Yeni ya da genişletilmiş testler eski ham okumayla aynı sonucu doğruluyor:
  - `getFamilies('MATERIAL')` nesne olmayan satırları yine eliyor.
  - `getFamilyReferences` bozuk JSON'da `[]`, anahtar yokken `[]` dönüyor; legacy `keyBy` yokken `bridgeNo = bridgeId` oluyor.
  - `readStoredBridgeDefinitions()` normalize edilmemiş ham değeri dönüyor.
  - `readProjectUnits()` normalize edilmiş birimleri, depo boşsa `INITIAL_PROJECT.units`'i dönüyor.
  - Geçerli tercih edilen açıklık kuralları SystemAssembly inspector'ında bugünkü gibi görünüyor.
- **AC7 (üst AC6)**
  - `npm run build`, `npm test` ve `npm run lint` çıkış kodu 0. `layerRules` ve `sourceEncoding` yeşil.
  - `backend/**`, `frontend/package.json` ve `frontend/package-lock.json` değişmedi.
- **AC8** Dokümanlar:
  - `docs/architecture.md`'de "BACKEND-DB-PERSISTENCE M5a" bölümü var.
  - `docs/roadmap.md` M5 altında `[x] M5a` var.

---

## 2. Doğrulanmış mevcut durum, düzeltmeler ve kararlar

### 2.1 Araştırma bulgularına düzeltmeler ve eklemeler (doğrulandı)

1. **KRİTİK, araştırmada yoktu.** `src/test/architecture/sourceEncoding.test.ts:25-28`, `ALLOWED_FILES` içinde `'/src/features/project/model/projectWorkspace.ts'` dosyasını tutuyor.
   - Mojibake işaretleri yalnızca `normalizeUnitId` içinde (`projectWorkspace.ts:35-41`, `'kNÂ·mm'` gibi).
   - `normalizeUnitId` taşınınca `projectWorkspace.ts` için "bayat girdi", yeni dosya için "beklenmeyen" hatası çıkar.
   - Liste güncellenmeli: `projectWorkspace.ts` → `projectWorkspaceModel.ts`. Test dosyası `projectWorkspace.test.ts` listede kalır.
   - Dizgeler bayt bayt aynı kopyalanmalı.
2. **`'storage'` kuralı.** `BridgeDefinitionWorkspace.tsx:73`'te `'storage'` bir dizi literal'i içinde: `const events = ['storage', …]`. Burada `addEventListener('storage'` deseni yok. Bu yüzden ratchet kuralı tırnaklı `storage` literal'i olmalı (`(['"\`])storage\1`). `addEventListener('storage'` deseni bu dosyayı kaçırır.
3. **`loads.windSnapshot` için localStorage anahtarı yok.** `App.tsx:71`'de `useState` ile yalnızca bellekte tutuluyor. Bu anahtar M5a yardımcısına **eklenmez**; M5b/M5c ekler.
4. **Anahtarlar doğrulandı:**
   - Yük modülleri (`loadsProjectModules.ts:17-21`): `kopruq.seismic`, `kopruq.wind-load.inputs`, `kopruq.uniform-temperature.inputs`, `kopruq.loads.self-weight.v1`, `kopruq.loads.traffic-lm1.v1`.
   - Graph: `GRAPH_DOCUMENTS_STORAGE_KEY = 'kopruq.graph.documents.v1'` (`graphStore.ts:10`, export'lu).
   - Workspace: `'kopruq.project-workspace.v1'` (`projectWorkspace.ts:56`, export'suz).
   - Girder: `PRECAST_GIRDER_STORAGE_KEY` (`familyRepository.ts:24`) ile `GIRDER_LIBRARY_MODULE.key` aynı.
5. **PierFamiliesPanel (F7) doğrulandı.**
   - `getFamilyRecords` (`familyRepository.ts:40-47`) fallback'i yalnızca anahtar yokken, değer dizi değilken veya JSON bozukken çağırıyor.
   - Bu durumların hepsinde `readFamilies` içindeki ham okuma (`PierFamiliesPanel.tsx:14-20`) `null` görüyor, ya da `saved.map` bir TypeError atıyor ve `catch` → `INITIAL` dönüyor.
   - Yani fonksiyon her zaman **aynı `INITIAL` referansını** dönüyor. Yerine `() => INITIAL` konunca davranış birebir aynı kalıyor.
   - `useFamilyCatalog.ts:41,49` `[category, fallback]` bağımlılığını kullanıyor. Fallback modül düzeyinde sabit bir referans olmalı.
6. **`PreferredSpanPanel.dimensionsFromStorage` (`:27-35`) ile `getPrecastGirderDefinition<{dimensions?: Dimension[]} | null>(null)?.dimensions ?? PRECAST_DIMENSIONS` birebir eşdeğer.** Yok, `'null'`, `[]` (reset yazar), bozuk JSON ve depo erişilemez (try/catch) durumlarının hepsinde aynı sonucu veriyor.
7. **`registry.ts:18-20` `readArray`** nesne olmayan satırları eliyor; `getFamilyRecords` elemiyor. Eşdeğerlik için registry'de aynı `filter` korunmalı.
8. **`registry.ts:48-55` `getFamilyReferences`**
   - Sıra: `typeof localStorage` koruması → parse (hata → `[]`) → anahtar yoksa `{}`.
   - JSON `'null'` saklıysa `stored.definitions` try dışında TypeError atar. Uygulama bu değeri hiç yazmıyor (`persistBridgeDefinitionStore` her zaman nesne yazıyor).
   - Karar: birebir korunur (K3). Bu davranış test ile sabitlenmez.
9. **`projectModules.ts:7`** yalnızca yorumda `localStorage` geçiyor. Yorumlar çıkarılınca eşleşme kalmaz; `ALLOWED_FILES`'a girmez.
10. **Geri kalan production dosyaları (20)** grep ile doğrulandı; liste §2.3 K6'da.
11. **`App.test.tsx`**
    - `localStorage` satırları: 14-20, 94, 146, 158-160, 171-172, 185, 191, 267, 314, 319, 332, 376, 402-403, 407-408, 420, 435, 458. Ayrıca 421 ve 436'da `Storage.prototype` var.
    - Üst plana göre M5c'ye kalanlar: 314, 319, 332, 376, 420/421, 435/436.
12. **Test sayısı.** `frontend/src/**/*.test.{ts,tsx}` = **102 dosya** (Glob ile doğrulandı). Test sayısı 1042 koordinatörün bildirdiği değer; bu planlamada doğrulanmadı.

### 2.2 Mevcut yaklaşım ve önerilen değişiklik (dosya / sembol)

| Dosya | Bugün | Değişiklik |
|---|---|---|
| `features/project/model/projectWorkspace.ts` | tipler, saf fonksiyonlar ve depolama tek dosyada | Saf kısım yeni `projectWorkspaceModel.ts`'e taşınır. Burada `STORAGE_KEY`, `readProjectState`, `persistProjectState` ve yeni `readProjectUnits()` kalır; eski isimler re-export edilir (`export type {…}` + `export {…}`; `verbatimModuleSyntax`). |
| **yeni** `features/project/model/projectWorkspaceModel.ts` | – | `ProjectWorkspaceData`, `PersistedProjectState` (`import type { BridgeRow } from './types'`), `normalizeUnitId`, `normalizeProjectUnits`, `INITIAL_PROJECT`, private `newBridgeId`, `ensureBridgeIds`, `normalizeProjectState`. Depolama yok, event yok. |
| `features/project/model/projectWorkspaceWire.ts:4` | `from './projectWorkspace'` | `from './projectWorkspaceModel'` |
| **yeni** `features/loads/model/loadsInputs.ts` | – | Export edilen `seismicInputsSchema`, `windInputsSchema`, `temperatureInputsSchema`, `selfWeightInputsSchema` (birebir aynı) ve `export type SeismicInputs = z.infer<typeof seismicInputsSchema>` gibi 4 tip. |
| `features/loads/model/loadsProjectModules.ts:5-14` | 4 şema yerel | 4 şema `./loadsInputs`'tan import edilir. `trafficLm1Schema` ve `number` (yalnız LM1 kullanıyorsa) burada kalır. |
| `features/loads/model/loadsWire.ts:4,12-15` | tipler `typeof X_MODULE.read` ile türetiliyor | `import type {…} from './loadsInputs'` + `export type {…} from './loadsInputs'`. `loadsProjectModules` import'u kalkar. |
| `features/bridge-definition/model/store.ts` | – | `readStoredBridgeDefinitions()` eklenir (imza aşağıda). |
| `features/family-registry/model/registry.ts:6-9,18-20,26,48-51` | ham okumalar | MATERIAL için `getFamilyRecords('MATERIAL').filter(row => Boolean(row) && typeof row === 'object')`. Referanslar `readStoredBridgeDefinitions()` ile okunur. `readArray`, `familyStorageKey` ve `BRIDGE_DEFINITIONS_STORAGE_KEY` import'ları kalkar. |
| `features/pier-families/components/PierFamiliesPanel.tsx:7,10,14-20,23` | `readFamilies` ham okuma | `const PIER_FALLBACK = (): PierFamily[] => INITIAL` (modül düzeyi) → `useFamilyCatalog<PierFamily>('PIER', PIER_FALLBACK)`. `STORAGE_KEY` ve `familyStorageKey` import'u silinir. `PierType` import'u kalır (`:44`'te kullanılıyor). |
| `features/bridge-definition/components/BridgeDefinitionWorkspace.tsx:32-34,50,53` | `CATALOG_KEYS`, `readCatalog` | `preferred: PREFERRED_SPAN_RULES_MODULE.read() ?? []`. `CATALOG_KEYS` ve `readCatalog` silinir. `:71-76` event listesi **değişmez**. |
| `features/system-assembly/components/SystemAssemblyPanel.tsx:60` | ham `readSpanRules` | `return PREFERRED_SPAN_RULES_MODULE.read() ?? []`. `:41-43` dinleyicileri değişmez. |
| `features/preferred-span/components/PreferredSpanPanel.tsx:2,10,27-35` | `GIRDER_KEY` ham okuma | `getPrecastGirderDefinition<{ dimensions?: Dimension[] } \| null>(null)?.dimensions ?? PRECAST_DIMENSIONS`. Import `'../../family-registry/model/familyRepository'`'den (aynı desen `BridgeDefinitionWorkspace.tsx:18` ve `SystemAssemblyPanel.tsx:15`'te var). `GIRDER_LIBRARY_MODULE` import'u ve `GIRDER_KEY` silinir. `:69-73` effect'i **aynen** kalır. |
| `features/graph/state/graphStore.ts:8,100` | `typeof localStorage … readProjectState([])…` | `const projectUnits = readProjectUnits()`. `readProjectState` import'u kalkar. |
| `features/family-registry/model/familySchemas.ts:24` | bayat yorum ("PierFamiliesPanel … migrates to H_SECTION on read") | Yorum düzeltilir: legacy değerler kabul edilir ve olduğu gibi saklanır, okurken taşınmaz. Kod değişmez. |
| `src/test/architecture/sourceEncoding.test.ts:25-28` | `projectWorkspace.ts` | `projectWorkspaceModel.ts` |

İmzalar:

```ts
// features/bridge-definition/model/store.ts
export type StoredBridgeDefinitions = { keyBy?: 'bridgeId'; selectedBridgeId?: string | null; definitions?: Record<string, Record<string, unknown>> }
/** Raw, un-normalized stored value (legacy number-keyed stores stay as they are). undefined: storage unavailable or unreadable JSON; {} when absent. */
export function readStoredBridgeDefinitions(): StoredBridgeDefinitions | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredBridgeDefinitions } catch { return undefined }
}
// registry.ts getFamilyReferences: const stored = readStoredBridgeDefinitions(); if (stored === undefined) return []   // `=== undefined`, NOT `!stored` (K3)

// features/project/model/projectWorkspace.ts
export function readProjectUnits(): ProjectWorkspaceData['units'] | undefined {
  return typeof localStorage === 'undefined' ? undefined : readProjectState([]).project.units
}
```

`readBridgeDefinitionStore` (`store.ts:43`) ham okuma yerine **kullanılmaz**, çünkü `ensureBridgeDefinitions` ile normalize ediyor ve eşdeğer değil.

### 2.3 Temel kararlar

- **K1 – AC5'in yorumu.** "`expect` satırları değişmez" şu anlama gelir: aynı değer, aynı matcher, aynı beklenen değer. Okuma ifadesi yardımcıya geçebilir.
  - Örnek: `expect(localStorage.getItem(K)).toBeNull()` → `expect(readProjectDataText('families.MATERIAL')).toBeNull()`.
  - `toContain('P-01')` ham metin üzerinde çalıştığı için `readProjectDataText` gerekiyor.
  - Veri yokken test bugün kırılıyorsa yine kırılmalı. Örneğin `JSON.parse(x ?? '{}').bridges[0]` → `readProjectData<…>(k)!.bridges[0]`; ikisi de TypeError atar.
  - Assertion silinmez, gevşetilmez. Yeni assertion eklenebilir.
- **K2 – Üst AC4 (girder event aboneliği) M5c'ye ertelenir.**
  - Gerekçe 1: Panel bugün yalnızca `'storage'` dinliyor. `PreferredSpanPanel` ve `GirderLibraryPanel` ayrı rotalarda (`router.tsx:128-129`), birlikte mount olmuyorlar.
  - Gerekçe 2: Aynı belgede girder'ı yazan diğer yollar `.kopruq` Open/New sırasındaki `projectDataContract` girişleri (`projectDataContract.ts:65-67`). Bunlardan sonra workspace yeniden mount ediliyor (`useProjectFile.ts:18-19` `setSessionId`, `App.tsx:176` key).
  - Gerekçe 3: Dinleyici eklenirse `ensureRules` effect'i (`PreferredSpanPanel.tsx:65-67`) remount'tan **önce**, `await` arasında kural yazabilir. Bu da dirty işaretinin zamanlamasını değiştirebilir; D1'e aykırı.
  - M5c'de `'storage'` dinleyicisi silineceği için abonelik orada bölüm bildirimiyle zorunlu olarak gelir.
  - Alternatif: üst plana harfiyen uyup M5a'da eklemek (`familyRepository.ts`'e yalnızca `'kopruq:girder-catalog-changed'` dinleyen bir `subscribePrecastGirderDefinition` ekleyip panelde `'storage'` ile birlikte kullanmak). Bu küçük ama gerçek bir davranış eklemesi olur ve dirty-zamanlaması riski taşır. Önerilmez.
- **K3 – Ham okuma ile sahip okumasının farkı.**
  - **Birebir korunanlar:** registry MATERIAL (filtre korunuyor), `getFamilyReferences` (`=== undefined` sayesinde JSON `null` durumu bile bugünkü gibi davranıyor), Pier fallback, PreferredSpan girder boyutları, `graphStore` birimleri.
  - **Sahip semantiği kabul edilen tek yer:** tercih edilen açıklık kuralları (BridgeDefinitionWorkspace `:53`, SystemAssembly `:60`).
    - Ham okuma şemasız. Sahip okuması (`projectModuleStore.ts:30-37`) zod `safeParse` yapıyor; geçersiz ya da kısmi bir dizi tümüyle `[]` oluyor.
    - Neden güvenli: uygulama kuralları yalnızca `module.write` ile tam `PreferredSpanRule` nesneleri olarak yazıyor (`newRule` + `Number()` yamaları). Geçerli veride sonuç aynı.
    - Fark yalnızca dışarıdan bozulmuş depoda çıkıyor. Bu durumda `PreferredSpanPanel` aynı şema ile zaten "kural yok" görüyor (`useProjectModule(…, NO_RULES)`) ve ziyarette üzerine yazıyor.
    - SystemAssembly'de dizi olmayan bir değer bugün `rules.find` TypeError'ına yol açıyor; sahip okuması bunu çöktürmüyor.
    - M5c zaten `module.read()` kullanacak.
    - Birebir korumak için bileşene ham okuma bırakmak gerekirdi (AC1'e aykırı) ya da yeni bir depolama dosyası açmak gerekirdi (ratchet'i büyütür).
- **K4 – `readProjectUnits` kapsamı yalnızca `graphStore.ts:100`.**
  - `CircularPierFamilyPreview`, `PierFamilyPreview`, `PrecastGirderSectionProperties` ve `FamilyResultsViewer` doğrudan depolamaya dokunmuyor; sahip API'si `readProjectState`'i çağırıyorlar ve ratchet'e girmiyorlar.
  - Bu bileşenler M5a'da değişmez. Tüketici sayısı az olduğundan geçişleri M5c'de yapılır.
- **K5 – `trafficLm1Schema` taşınmaz.** Kendi tipi var (`Lm1Parameters`, `../api/trafficLoadsService`). `loadsWire.ts` bu tipi doğrudan alıyor (`:3`); döngü riski yok. `SelfWeightPermanent.tsx:50`'deki yerel `SelfWeightInputs` ile çakışma yok, çünkü o dosya `loadsInputs`'u import etmiyor.
- **K6 – Ratchet (`noBrowserStorage.test.ts`).**
  - Kurallar, yorumlar çıkarıldıktan sonra her dosyaya uygulanır:
    - `\b(localStorage|sessionStorage|indexedDB|IDBDatabase|showOpenFilePicker|showSaveFilePicker|FileSystemFileHandle|StorageEvent)\b`
    - `'storage' literal`: `(['"\`])storage\1`
  - Desenler satır yerine dosya üzerinde aranır; `recentProjects.ts`'teki gibi minify edilmiş tek satırlarda da çalışır.
  - Kapsam: `import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })`. Production filtresi `layerRules.test.ts:54` ile aynı: `*.test.ts(x)` ve `test/**` hariç.
  - `stripComments` `layerRules.test.ts:23-25`'ten **kopyalanır**. O dosyadan import edilirse `describe` blokları ikinci kez kaydedilir.
  - `ALLOWED_FILES` (17, sıralı, `/src/` önekli):
    ```
    /src/app/App.tsx
    /src/app/project-file/projectDataContract.ts
    /src/app/project-file/projectFileService.ts
    /src/app/project-file/recentProjects.ts
    /src/features/bridge-definition/components/BridgeDefinitionWorkspace.tsx
    /src/features/bridge-definition/model/store.ts
    /src/features/family-registry/hooks/useFamilyCatalog.ts
    /src/features/family-registry/model/familyRepository.ts
    /src/features/graph/family/graphRunValidity.ts
    /src/features/graph/state/graphStore.ts
    /src/features/graph/state/graphViewPreferences.ts
    /src/features/preferred-span/components/PreferredSpanPanel.tsx
    /src/features/project/model/projectWorkspace.ts
    /src/features/system-assembly/components/SystemAssemblyPanel.tsx
    /src/shared/persistence/legacyStorageMigration.ts
    /src/shared/project-file/projectModuleStore.ts
    /src/shared/project-file/useProjectModule.ts
    ```
  - `STORAGE_LISTENER_ONLY_FILES`: üç bileşen (`BridgeDefinitionWorkspace.tsx`, `PreferredSpanPanel.tsx`, `SystemAssemblyPanel.tsx`). Bu dosyalarda bulunan kural kümesi tam olarak `["'storage' literal"]` olmalı.
  - Export edilen saf fonksiyonlar: `findBrowserStorageUses(files): Record<string, string[]>` ve `diffAllowList(found, allowed): { unexpected; stale }`.
- **K7 – Test yardımcısı `src/test/projectStoreTestUtils.ts`.**
  - M5a'da doğrudan localStorage'a yazar ve okur; event göndermez. Böylece taşınan testlerle bugünkü testler aynı şeyi yapar.
  - Anahtar türü:
    ```ts
    export type ProjectDataKey = 'workspace' | 'bridgeDefinitions' | 'families.PIER' | 'families.PIER_CAP' | 'families.FOUNDATION' | 'families.BEARING' | 'families.MATERIAL'
      | 'girderLibrary' | 'preferredSpanRules' | 'crossSection' | 'loads.seismic' | 'loads.wind' | 'loads.temperature' | 'loads.selfWeight' | 'loads.trafficLm1' | 'graphDocuments'
    ```
  - Anahtarlar export'lu sabitlerden türetilir: `BRIDGE_DEFINITIONS_STORAGE_KEY`, `familyStorageKey(c)`, `PRECAST_GIRDER_STORAGE_KEY`, `PREFERRED_SPAN_RULES_MODULE.key`, `CROSS_SECTION_VALUES_MODULE.key`, `SEISMIC_INPUTS_MODULE.key` (ve diğer 4 modül), `GRAPH_DOCUMENTS_STORAGE_KEY`.
  - Yalnızca `workspace` export edilmediği için yardımcıda literal `'kopruq.project-workspace.v1'` olarak tutulur ve yorumla belirtilir. Production'a export eklenmez.
  - API:
    ```ts
    seedProjectData(key: ProjectDataKey, value: unknown): void          // localStorage.setItem(k, JSON.stringify(value)); normalize yok
    seedRawProjectData(key: ProjectDataKey, text: string): void         // bozuk-veri testleri için
    readProjectData<T = unknown>(key: ProjectDataKey): T | null         // yoksa null, varsa JSON.parse
    readProjectDataText(key: ProjectDataKey): string | null             // ham metin
    resetProjectData(keys?: readonly ProjectDataKey[]): void            // argümansız = localStorage.clear() (bugünkü clear semantiği); anahtarlı = removeItem
    browserStorageText(storageKey: string): string | null               // YALNIZCA registry.test.ts:10 ('kopruq.family-registry' yokluğu); M5c'de çalışma zamanı depolama kontrolüyle değişir
    ```
  - `src/test/` altında olduğu için ratchet ve layer kurallarının dışında. `tsc -b`, oxlint ve sourceEncoding taramasına giriyor.

---

## 3. Sıralı uygulama adımları

1. **Saf model.** `projectWorkspaceModel.ts` oluşturulur.
   - Mojibake dizgeleri bayt bayt korunur; UTF-8 olarak kaydedilir.
   - `projectWorkspace.ts` model dosyasını import eder, re-export eder ve `readProjectUnits` eklenir.
   - `projectWorkspaceWire.ts:4` güncellenir.
   - `sourceEncoding.test.ts` `ALLOWED_FILES` güncellenir.
2. **Yük girdileri.** `loadsInputs.ts` oluşturulur; `loadsProjectModules.ts` ve `loadsWire.ts` güncellenir.
3. **Sahip fonksiyonları.**
   - `store.ts`'e `readStoredBridgeDefinitions` eklenir.
   - Sırayla değiştirilir: `registry.ts`, `PierFamiliesPanel.tsx`, `BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx`, `PreferredSpanPanel.tsx`, `graphStore.ts`.
   - `familySchemas.ts:24` yorumu düzeltilir.
   - Kullanılmayan import'lar silinir (`noUnusedLocals`).
4. **`src/test/projectStoreTestUtils.ts`** yazılır.
5. **Test göçü** (assertion anlamı değişmez):
   - **`registry.test.ts`**: `:4` → `resetProjectData()`; `:8,14,22,23` → `seedProjectData`; `:10` → `browserStorageText(...)`.
   - **`familyRepository.test.ts`**: `:4` → `resetProjectData()`; `:17` → `readProjectDataText('families.PIER')`.
   - **`FoundationFamiliesPanel.test.tsx`**: `const key` silinir; `:14,19,52,56,61,68,85` → `readProjectData<…>('families.FOUNDATION') ?? []`; `:45,73` → `resetProjectData(['families.FOUNDATION'])`.
   - **`BearingFamiliesPanel.test.tsx`**: aynı desen, `families.BEARING`.
   - **`store.test.ts`**: `:16` → `resetProjectData()`; `:44` → `seedProjectData('bridgeDefinitions', {…})`. `BRIDGE_DEFINITIONS_STORAGE_KEY` import'u kullanılmaz hale gelirse silinir.
   - **`MaterialsPanel.test.tsx`**: `:9`, `:16` → `readProjectData`; `:37` → `readProjectDataText(...)).toBeNull()`.
   - **`WindLoadsPanel.test.tsx:21`, `SeismicPanel.test.tsx:22`, `UniformTemperaturePanel.test.tsx:10`, `projectWorkspace.test.ts:4`, `LoadsPanel.test.tsx:23`** → `resetProjectData()`. Ayrıca `projectWorkspace.test.ts:15` → seed, `LoadsPanel.test.tsx:46` → `readProjectData('loads.trafficLm1')`.
   - **`FamilyResultsViewer.test.tsx`**: `:16` → `clearFamilySnapshots(); resetProjectData()`; `:68` → `seedProjectData('workspace', …)`.
   - **`PreferredSpanPanel.test.tsx`**: `RULES_KEY` ve `GIRDER_KEY` sabitleri silinir; `:9,11,15,16,20,26` → yardımcı. `window.dispatchEvent(new Event('storage'))` (`:21,27`) **kalır**, çünkü panel hâlâ `'storage'` dinliyor.
   - **`App.test.tsx`**:
     - `:14-20` → `resetProjectData(['workspace','bridgeDefinitions','families.PIER','families.PIER_CAP','families.FOUNDATION','families.BEARING','graphDocuments'])`. Tam olarak aynı 7 anahtar.
     - `:94,146,171,172,402,403` → `seedProjectData`.
     - `:158-160,185,191,267,407,408,458` → `readProjectData` / `readProjectDataText`. `:407-408` için `readProjectDataText('loads.seismic')` / `('crossSection')` + `.toBeNull()`.
     - `:312-395` ve `:416-441` **dokunulmaz**.
6. **Yeni ya da genişletilmiş testler** (AC3, AC6):
   - `registry.test.ts`:
     - MATERIAL `[null, 5, {concreteClass:'C30/37'}, {concreteClass:'C30/37'}]` → tek kayıt, hata yok.
     - `seedRawProjectData('bridgeDefinitions','{bad')` → `getFamilyReferences` `[]`.
     - Anahtar yokken `[]`.
   - `store.test.ts`:
     - Legacy kayıt (`keyBy` yok, `bridge.no` anahtarlı) `readStoredBridgeDefinitions()` ile aynen geri geliyor (`toEqual(seed)`).
     - Yokken `{}`; bozuk JSON'da `undefined`.
   - `projectWorkspace.test.ts`: `readProjectUnits()` etiket içeren seed'i normalize ediyor (`moment: 'kNm'`); boş depoda `INITIAL_PROJECT.units`'e eşit.
   - **yeni** `features/pier-families/components/PierFamiliesPanel.test.tsx`:
     - (a) Boş depo → `RECT-M` görünüyor ve `readProjectData('families.PIER')[0].id === 'RECT-M'`. Okurken yazma bugünkü davranış; M5c'de bu assertion değişir.
     - (b) `pierType:'H_TYPE'` seed'i render'dan sonra depoda hâlâ `'H_TYPE'`.
     - `useFamilyCatalog` modül önbelleği (`useFamilyCatalog.ts:4`) nedeniyle seed'li test önce çalıştırılır ya da ayrı dosyaya konur.
   - **yeni** `features/system-assembly/components/SystemAssemblyPanel.test.tsx` (`MemoryRouter`):
     - Seed `preferredSpanRules = [PG-H160, 20, 30, 5, 25, enabled, …]`, girder yok (varsayılan H 160-190).
     - GIRDER inspector'ında "20, 25, 30" ve "25 m" görünüyor.
7. **`src/test/architecture/noBrowserStorage.test.ts`** (K6). Testler:
   - Gerçek ağaç taranıyor (>200 dosya).
   - Beklenmeyen dosya yok.
   - Bayat girdi yok.
   - Üç bileşende yalnızca `'storage' literal` var.
   - Sentetik testler:
     - Her sembol tek tek yakalanıyor; minify edilmiş satırda da.
     - `'storage'`, `"storage"` ve `` `storage` `` yakalanıyor; dizi literal'i içindeki de yakalanıyor.
     - `familyStorageKey` ve `'kopruq.storage'` **yakalanmıyor**.
     - Satır ve blok yorumu yok sayılıyor.
     - `*.test.ts` ve `/src/test/` hariç tutuluyor.
     - `diffAllowList` beklenmeyen ve bayat sonuçları iki yönde de veriyor.
8. **Dokümanlar.**
   - `docs/architecture.md` sonuna "## BACKEND-DB-PERSISTENCE M5a (2026-10-14)" eklenir: amaç, D1, sahip fonksiyonları, saf ayrım, yardımcı, ratchet (17 dosya), K2 ertelemesi, K3 kabul edilen farkı.
   - `docs/roadmap.md:1922` altına `  - [x] M5a …` alt maddesi eklenir; M5 `[ ]` kalır.
   - Üst plan değiştirilmez.
9. **Kontroller** (§4).

---

## 4. Doğrulama

**Komutlar** (PowerShell'de `npm.cmd`):
- `cd frontend; npm.cmd run build; npm.cmd test; npm.cmd run lint`
- Odaklı: `cd frontend; npx vitest run src/test/architecture src/features/family-registry src/features/pier-families src/features/system-assembly src/features/preferred-span src/features/bridge-definition src/features/project src/features/loads src/features/foundation-families src/features/bearing-families src/features/materials src/features/family-tables src/app/App.test.tsx`
- `git status --short -- backend frontend/package.json frontend/package-lock.json` → boş

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `npx vitest run src/test/architecture`; `registry.ts` ve `PierFamiliesPanel.tsx`'te sembol grep'i | yeşil / 0 |
| AC2 | `projectWorkspaceWire.ts` içinde `from './projectWorkspace'`, `loadsWire.ts` içinde `loadsProjectModules` grep'i; `npm run build` | 0 / çıkış 0 |
| AC3 | `PierFamiliesPanel.test.tsx` | yeşil |
| AC4 | mevcut `PreferredSpanPanel.test.tsx` (`'storage'` ile yenileme) | yeşil |
| AC5 | 13 dosyada `localStorage\|StorageEvent` grep'i; `App.test.tsx`'te `localStorage` | 0 / yalnızca şu 6 testte: "completes New Project after a successful controlled Save", "opens a selected project through the Dont Save path…", "opens a new project only after Open + Save completes", "closes the File dropdown on an outside click…", "keeps the project and its dirty mark when New Project reset fails…", "detaches the file reference when the New Project rollback also fails…". Satır numaraları kayacağı için kontrol test adıyla yapılır. |
| AC6 | `registry.test.ts`, `store.test.ts`, `projectWorkspace.test.ts`, `SystemAssemblyPanel.test.tsx` | yeşil |
| AC7 | tam komut zinciri + `git status` | çıkış 0 / boş |
| AC8 | inceleme | bölüm ve madde var |

**Taban:** 102 test dosyası (doğrulandı); 1042 test (doğrulanmadı; implementer çalıştırmadan önce yeniden saymalı). Beklenen: 105 dosya (+`noBrowserStorage`, +`PierFamiliesPanel`, +`SystemAssemblyPanel`). Test sayısı tabandan ve eklenen testlerden az olmamalı. Eski testlerin hiçbiri silinmiyor ve atlanmıyor.

**Riskler**
- Mojibake kopyalanırken bozulabilir. `projectWorkspace.test.ts:8-9` ve `sourceEncoding` testi bunu yakalar.
- `stripComments` bir dizge içindeki `/*` dizisinde fazla metin silebilir ve eşleşme kaçırılabilir (layerRules ile aynı sınırlama). İzinli dosyalarda bunu bayat testi yakalar; listede olmayan dosyalarda düşük olasılıklı bir yanlış negatif kalır.
- K3'teki bozuk/kısmi tercih edilen açıklık deposunda gösterim değişir; kabul edildi.
- `useFamilyCatalog` modül önbelleği yeni Pier testinin sırasını etkiler.
- Yardımcı feature modüllerini import ediyor (`createProjectModule` ve `graphStore` import sırasında depoyu okumuyor; doğrulandı). `graphStore.test.ts`'in `vi.resetModules` kullanımı bu yardımcıyı etkilemez, çünkü o dosya M5a'da taşınmıyor.
- R3 sayacı (zorlanmıyor) ±1 değişebilir.

**Varsayımlar (doğrulanmadı)**
- Vitest her test dosyasında ayrı bir jsdom ortamı kullanıyor (varsayılan `isolate`). Bugünkü testler de buna dayanıyor.
- `typescript/no-explicit-any` oxlint varsayılanında açık değil; yine de yardımcıda `any` kullanılmaz.
- Test sayısı 1042.

**Açık sorular:** malzeme düzeyinde yok. K2 (AC4'ün M5c'ye ertelenmesi), D1'i önceleyen bir sıralama kararı.

**İlgili dosyalar** (frontend/src altında): `features/project/model/{projectWorkspace,projectWorkspaceWire}.ts`, `features/loads/model/{loadsProjectModules,loadsWire}.ts`, `features/bridge-definition/model/store.ts`, `features/family-registry/model/{registry,familyRepository,familySchemas}.ts`, `features/family-registry/hooks/useFamilyCatalog.ts`, `features/pier-families/components/PierFamiliesPanel.tsx`, `features/bridge-definition/components/BridgeDefinitionWorkspace.tsx`, `features/system-assembly/components/SystemAssemblyPanel.tsx`, `features/preferred-span/components/PreferredSpanPanel.tsx`, `features/graph/state/graphStore.ts`, `test/architecture/{sourceEncoding,layerRules}.test.ts`, `app/App.test.tsx`, `app/project-file/{projectDataContract,useProjectFile}.ts`; `docs/architecture.md`, `docs/roadmap.md`.

**READY**
