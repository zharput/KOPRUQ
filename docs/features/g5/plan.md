# g5 planı (revize): `shared/project-file` bölünmesi, sorumluluk ve sahiplik ayrımıyla (A-08b)

Durum: READY (kullanıcı onayı bekleniyor; `planned` henüz çalıştırılmadı). Kullanıcının K1–K8 yanıtları uygulandı: K4, K7 ve K8 önerildiği gibi kabul edildi; K1–K3 ve K6 revize edildi. Satır numaraları HEAD `2d7d583`'ten (dal `codex/landxml-terrain-import`).

## 1. Amaç ve kapsam dışı
**Amaç**
- `frontend/src/test/architecture/layerRules.test.ts` içindeki `ALLOWED_VIOLATIONS` boş olacak ve R1, R2, R4 kuralları yine geçecek.
- R3 sayısı **artmayacak** (hedef: Δ = 0).
- `shared` katmanında yalnızca saf, alan bağımsız parçalar kalacak: mevcut olay ve doğrulama dosyaları, jenerik localStorage modül mekanizması, jenerik abonelik hook'u.
- Sekiz proje modülünün her biri (zod şeması, anahtar, özel yazma/sıfırlama) sahibi olan feature'a taşınacak.
- Merkezi kayıt defteri (`PROJECT_MODULES`, `PROJECT_MODULE_IDS`, `PROJECT_MODULE_LABELS`) ve orkestratör `app/project-file` altına taşınacak.
- `WindResult` ve `WindCalculationSnapshot` tipleri `features/loads/model/windTypes.ts` dosyasına taşınacak.

**Kapsam dışı ve korunacaklar**
- Davranış değişmez: `.kopruq` yerleşimi ve modül sırası, `schemaVersion` 1, `applicationVersion` `'1.0.0'`; localStorage anahtarları, `kopruq.backup.<ISO>.<key>` yedek anahtarları; olay adları (`kopruq:project-data-changed`, `kopruq:project-module-changed`, `kopruq:girder-catalog-changed`); hata metinleri; IndexedDB `kopruq-project-files` / `recent-projects` ve `kopruq.recent-projects.metadata.v1`.
- g3 sözleşme dosyaları (`projectDataContract.ts`, `projectDataEvents.ts`, `projectFileValidation.ts`, şema dosyaları) yalnızca import satırları değişebilir.
- Backend, REST, `package.json`, bağımlılık ve CSS değişmez. Yeni mühendislik sabiti, birim veya kural eklenmez.
- Kapsam dışı diğer işler: R3'ü zorlamak; barrel düzenini genel olarak elden geçirmek; `windLoads` değerini localStorage'a almak; ham localStorage okumalarını (`SystemAssemblyPanel.tsx:60`, `PreferredSpanPanel.tsx:29`) temizlemek; yedekleme/snapshot/geri yükleme/sıfırlama ilkellerini paylaşılan koda taşımak (`PROJECT_DATA_ENTRIES` üzerinde döndüğü ve g3 sözleşmesi değişmeyeceği için `app` içinde kalır; `projectFileService.ts:54-61` `backupModuleValue` özel kalır).

## 2. Mevcut mimari (doğrulanmış)
**Kural testi (`layerRules.test.ts`):** R1 `:96`, R2 `:97`, R4 `:98`, R3 sayacı `:99`; yalnızca `.` ile başlayan göreli import'ları tarıyor (`:93`), projede alias yok; `*.test.*` ve `test/**` kuralların dışında (`:82`); R3, `features/a` → `features/b` import'unu hedef `features/b` ya da `features/b/index` değilse sayıyor; izin listesinde 23 R1 kaydı var (`:23-47`); sentetik testler `:107-123` (ayrıştırıcı) ve `:125-147` (`analyze` R1/R2/R4/R3'ü yakalar); gerçek ağaç testleri `:158` (listede olmayan ihlal) ve `:162` (bayat kayıt); `:166-172` testi liste boşalınca boşu boşuna geçer.

**`projectModules.ts`'teki sekiz modül ve sahipleri**
| id | Satır | Anahtar | Tip ve yardımcı bağımlılığı | Önerilen sahip |
|---|---|---|---|---|
| `girderLibrary` | :17, :76 | `PRECAST_GIRDER_STORAGE_KEY` = `'kopruq.girder-library.precast'` (`familyRepository.ts:24`) | özel `write`/`reset` → `savePrecastGirderDefinition` (`familyRepository.ts:30`) | `features/family-registry` |
| `preferredSpanRules` | :18, :77 | `'kopruq.project-design-system.girder-span-rules'` | `PreferredSpanRule` (`preferred-span/model/types.ts:5`) | `features/preferred-span` |
| `seismicInputs` | :19, :78 | `'kopruq.seismic'` | — | `features/loads` |
| `windInputs` | :20, :79 | `'kopruq.wind-load.inputs'` | — | `features/loads` |
| `temperatureInputs` | :21, :80 | `'kopruq.uniform-temperature.inputs'` | — | `features/loads` |
| `crossSectionValues` | :22, :81 | `'kopruq.superstructure.cross-section.v1'` | `CrossSectionValues` (`superstructure-families/model/types.ts:1`) | `features/superstructure-families` |
| `selfWeightInputs` | :23-28, :82 | `'kopruq.loads.self-weight.v1'` | — | `features/loads` |
| `trafficLm1` | :29, :83 | `'kopruq.loads.traffic-lm1.v1'` | `Lm1Parameters` (`loads/api/trafficLoadsService.ts`) | `features/loads` |

**Jenerik mekanizma:** `PROJECT_MODULE_CHANGED_EVENT` (:14), `ProjectModule<T>` (:31-38), `emit` (:40-44), `createModule` (:46-73); hiçbiri alan bilgisi içermiyor. `useProjectModule.ts` yalnızca `PROJECT_MODULES[id]` araması yüzünden kayıt defterine bağlı (:2, :7, :34); önbellek `id` ile anahtarlanıyor (:4, :10-13). **Kayıt defteri:** `PROJECT_MODULES` (:75-84), `ProjectModules`, `ProjectModuleId`, `ProjectModuleValue` (:85-87), `PROJECT_MODULE_IDS` (:88), `PROJECT_MODULE_LABELS` (:91-94).

**Önce: `shared/project-file`'dan sembol alan dosyalar**
| Dosya:satır | Semboller | Kaynak |
|---|---|---|
| `bridge-definition/model/store.ts:2` | `PROJECT_DATA_CHANGED_EVENT` | projectDataEvents |
| `family-registry/model/familyRepository.ts:6` | `PROJECT_DATA_CHANGED_EVENT` | projectDataEvents |
| `project/model/projectWorkspace.ts:1` | `PROJECT_DATA_CHANGED_EVENT` | projectDataEvents |
| `graph/state/graphStore.ts:2,7` | `parseWithSchema`, `PROJECT_DATA_CHANGED_EVENT` | validation, events |
| `family-registry/model/familySchemas.ts:2` | `parseWithSchema`, `ProjectFileValidationError` | projectFileValidation |
| `materials/components/MaterialsPanel.test.tsx:5` | `PROJECT_DATA_CHANGED_EVENT` | projectDataEvents |
| `bridge-definition/components/BridgeDefinitionWorkspace.tsx:11` (:33) | `PROJECT_MODULES` → `.preferredSpanRules.key` | projectModules |
| `system-assembly/components/SystemAssemblyPanel.tsx:16` (:60) | `PROJECT_MODULES` → `.preferredSpanRules.key` | projectModules |
| `preferred-span/components/PreferredSpanPanel.tsx:2,3` (:9, :59) | `PROJECT_MODULES.girderLibrary.key`, `useProjectModule('preferredSpanRules', NO_RULES)` | modules, hook |
| `loads/components/SelfWeightPermanent.tsx:1` (:88) | `useProjectModule('selfWeightInputs', …)` | hook |
| `loads/components/seismic/SeismicPanel.tsx:4` (:11) | `useProjectModule('seismicInputs', …)` | hook |
| `loads/components/temperature/UniformTemperaturePanel.tsx:4` (:10) | `useProjectModule('temperatureInputs', …)` | hook |
| `loads/components/traffic/TrafficLoadsPanel.tsx:1` (:33) | `useProjectModule('trafficLm1', NO_LM1_OVERRIDE)` | hook |
| `loads/components/wind/WindLoadsPanel.tsx:3,7` (:16) | `useProjectModule('windInputs', …)`, `WindCalculationSnapshot` | hook, types |
| `loads/components/wind/WindLoadsPanel.test.tsx:6` | `WindCalculationSnapshot` | types |
| `loads/components/LoadsPanel.tsx:15` | `WindCalculationSnapshot` | types |
| `loads/api/windLoadsService.ts:2` | `WindResult` | types |
| `app/App.tsx:14,16,19,20,21,148` (:69) | `useProjectModule('crossSectionValues', INITIAL_CROSS_SECTION_VALUES)`, `useProjectFile`, recent, service, `WindCalculationSnapshot`, satır içi `import()` | çeşitli |
| `app/App.test.tsx:5` | `buildProjectFile`, `projectFileText` | service |
| `app/workspaces/WorkspacePage.tsx:13` | `WindCalculationSnapshot` | types |
| `app/layout/TopWorkspaceNav.tsx:5` | `RecentProject` | recentProjects |

**Diğer doğrulanan olgular:** hiçbir feature orkestratörü (service, contract, `useProjectFile`, recent, `ProjectFile`, fixtures) kullanmıyor; `vi.mock`/`vi.doMock`/`vi.importActual` çağrılarının hiçbiri bu yolları hedeflemiyor (mock'lar yalnızca `App.test.tsx:8`, `TerrainDtmPanel.test.tsx:9-10`, `ProjectDashboardPanel.test.tsx:6`, `SeismicPanel.test.tsx:7`); `React.lazy`/dinamik route import'u yok (`App.tsx:148` dışındaki `import()` kullanımları yalnızca tip); mevcut barrel'lar: `preferred-span/index.ts` (`PreferredSpanPanel`, `type PreferredSpanRule`), `superstructure-families/index.ts` (panel, `CrossSectionValues`, `INITIAL_CROSS_SECTION_VALUES`, `carriagewayWidthM`), `loads/index.ts` (yalnızca `LoadsPanel`), `girder-library/index.ts` (yalnızca panel), `family-registry` için barrel yok; mevcut, bu işten etkilenmeyen derin R3 import'ları: `BridgeDefinitionWorkspace.tsx:10` ve `:18`, `SystemAssemblyPanel.tsx:6` ve `:15`, `PreferredSpanPanel.tsx:4`; `girder-library/model/variants.ts` yalnızca `shared/lib/parameterSweep`'i import ediyor (döngü yok); `tsconfig.app.json`: `verbatimModuleSyntax: true` (:14), `noUnusedLocals`/`noUnusedParameters` (:21-22), TypeScript `~6.0.2`; `recentProjects.ts:52` Türkçe metin içeriyor; `sourceEncoding.test.ts` izin listesinde project-file dosyası yok.

## 3. Önerilen tasarım
**Bağımlılık yönü:** `app/project-file` (kayıt defteri, sözleşme, servis, hook, recent) → `features/<sahip>/model/*ProjectModule*` → `shared/project-file` (events, validation, `projectModuleStore`, `useProjectModule`). Feature'lar kendi modüllerini kendi tanımları ve paylaşılan hook ile kullanır; kayıt defterini ya da `app/` katmanını hiç import etmez. Cross-feature erişim yalnızca barrel üzerinden yapılır, bu yüzden R3'e eklenmez.

### 3.1 Shared (saf, alan bağımsız)
`shared/project-file/projectModuleStore.ts` (YENİ): içeriği `projectModules.ts:14`, `:31-73`'ten aynen alınır; `createModule` adı `createProjectModule` olarak export edilir: `export const PROJECT_MODULE_CHANGED_EVENT = 'kopruq:project-module-changed'`, `export type ProjectModule<T>`, `export function createProjectModule<S extends z.ZodTypeAny>(id, key, schema, custom?)`. Import'ları: `import type { z } from 'zod'` ve `./projectDataEvents`. Olay sabiti `projectDataEvents.ts`'e eklenmez (g3 sözleşmesi).

`shared/project-file/useProjectModule.ts` (aynı yol, jenerik hale getirilir): yeni imza `useProjectModule<T>(module: ProjectModule<T>, fallback: NoInfer<NonNullable<T>>)`, dönüş `readonly [NonNullable<T>, set]`; kayıt defteri araması yerine `module.key` ve `module.read()`; önbellek yine `module.id` ile anahtarlanır; abonelik (`PROJECT_MODULE_CHANGED_EVENT` ve `storage`) ve `set` mantığı aynen kalır; `fallback` sabit referans olmalı. `projectDataEvents.ts` ve `projectFileValidation.ts` içerikleri değişmez.

### 3.2 Feature tanımları (her modül, ihtiyaç duyduğu tiplerin yanında)
Her dosya `createProjectModule` ile tanımlanır; id, anahtar ve şema metni `projectModules.ts`'tekiyle birebir aynıdır (yerel `const number = z.number()` kısaltması dahil).
- `features/family-registry/model/girderLibraryProjectModule.ts` → `GIRDER_LIBRARY_MODULE`; özel `write`/`reset` → `savePrecastGirderDefinition`; import `./familyRepository`. `features/family-registry/index.ts` (YENİ, en küçük barrel): `export { GIRDER_LIBRARY_MODULE } from './model/girderLibraryProjectModule'`.
- `features/preferred-span/model/preferredSpanRulesProjectModule.ts` → `PREFERRED_SPAN_RULES_MODULE`; `import type { PreferredSpanRule } from './types'`; `preferred-span/index.ts`'e bu sabitin export'u eklenir.
- `features/loads/model/loadsProjectModules.ts` → `SEISMIC_INPUTS_MODULE`, `WIND_INPUTS_MODULE`, `TEMPERATURE_INPUTS_MODULE`, `SELF_WEIGHT_INPUTS_MODULE`, `TRAFFIC_LM1_MODULE`; `import type { Lm1Parameters } from '../api/trafficLoadsService'` (aynı feature); `loads` barrel'ına eklenmez.
- `features/loads/model/windTypes.ts` (YENİ): `projectFileTypes.ts:7-8` metni aynen.
- `features/superstructure-families/model/crossSectionProjectModule.ts` → `CROSS_SECTION_VALUES_MODULE`; barrel'a eklenmez (yalnızca `app` kullanıyor).
- Ayrı feature wrapper hook'ları eklenmez; bağlama `useProjectModule(MODULE, fallback)` çağrısıyla yapılır (en küçük public API).

### 3.3 App (merkezi kayıt defteri ve orkestratör)
`app/project-file/projectModules.ts` (kayıt defteri, yeniden yazılır): feature tanımlarını derin model yollarından import eder (`app` → `features` R3'e sayılmaz); `PROJECT_MODULES = { girderLibrary, preferredSpanRules, seismicInputs, windInputs, temperatureInputs, crossSectionValues, selfWeightInputs, trafficLm1 }` aynı sırayla ve feature'lardaki **aynı nesne örnekleriyle**; `ProjectModules`, `ProjectModuleId`, `PROJECT_MODULE_IDS`, `PROJECT_MODULE_LABELS` (metin aynen) korunur; `ProjectModuleValue` kullanılmayacağı için kaldırılır; `PROJECT_MODULE_CHANGED_EVENT` yeniden export edilmez.

`app/project-file/` altına taşınanlar: `projectFileTypes.ts` (rüzgâr tipleri çıkarılır, `windTypes`'tan import), `projectDataContract.ts`, `projectFileService.ts`, `useProjectFile.ts`, `recentProjects.ts`, `projectFileFixtures.ts` ve testleri. `App.tsx:69` → `useProjectModule(PROJECT_MODULES.crossSectionValues, INITIAL_CROSS_SECTION_VALUES)` (app merkezi kayıt defterini kullanabilir, K8).

### 3.4 Sembol düzeyinde import haritası (sonra)
| Dosya | Yeni import / çağrı |
|---|---|
| `PreferredSpanPanel.tsx` | `:2` → `import { GIRDER_LIBRARY_MODULE } from '../../family-registry'`; `:3` hook yolu aynı; yeni `import { PREFERRED_SPAN_RULES_MODULE } from '../model/preferredSpanRulesProjectModule'`; `:9` → `GIRDER_LIBRARY_MODULE.key`; `:59` → `useProjectModule(PREFERRED_SPAN_RULES_MODULE, NO_RULES)` |
| `BridgeDefinitionWorkspace.tsx` | `:11` → `import { PREFERRED_SPAN_RULES_MODULE } from '../../preferred-span'`; `:33` → `PREFERRED_SPAN_RULES_MODULE.key` |
| `SystemAssemblyPanel.tsx` | `:16` → aynı barrel import; `:60` → `PREFERRED_SPAN_RULES_MODULE.key` |
| `SelfWeightPermanent.tsx` | `:1` aynı; `+ import { SELF_WEIGHT_INPUTS_MODULE } from '../model/loadsProjectModules'`; `:88` modül argümanı |
| `SeismicPanel.tsx`, `UniformTemperaturePanel.tsx`, `TrafficLoadsPanel.tsx`, `WindLoadsPanel.tsx` | hook yolu aynı; `+ '../../model/loadsProjectModules'`; çağrılar `:11`, `:10`, `:33`, `:16` → ilgili `*_MODULE` sabiti |
| `WindLoadsPanel.tsx:7`, `WindLoadsPanel.test.tsx:6` | `'../../model/windTypes'` |
| `LoadsPanel.tsx:15`, `windLoadsService.ts:2` | `'../model/windTypes'` |
| `App.tsx` | `:14` aynı; `+ import { PROJECT_MODULES } from './project-file/projectModules'`; `:16` `'./project-file/useProjectFile'`; `:19` `'./project-file/recentProjects'`; `:20` `'./project-file/projectFileService'`; `:21` `'../features/loads/model/windTypes'`; `:148` `import('./project-file/recentProjects')` |
| `App.test.tsx:5` | `'./project-file/projectFileService'` |
| `WorkspacePage.tsx:13` | `'../../features/loads/model/windTypes'` |
| `TopWorkspaceNav.tsx:5` | `'../project-file/recentProjects'` |
| `app/project-file/projectDataContract.ts` | `'./projectFileValidation'` (:4 ve :8) → `'../../shared/project-file/projectFileValidation'`; `:10` iki satıra bölünür: `{ PROJECT_MODULES, PROJECT_MODULE_IDS, type ProjectModuleId } from './projectModules'` ve `{ PROJECT_MODULE_CHANGED_EVENT } from '../../shared/project-file/projectModuleStore'`; gövde bayt-özdeş |
| `app/project-file/projectFileService.ts` | yalnızca `:7` bölünür: `type WindCalculationSnapshot` → `'../../features/loads/model/windTypes'`; diğer import'lar değişmez |
| `app/project-file/useProjectFile.ts` | `:6` → `'../../features/loads/model/windTypes'`; `:9` → `'../../shared/project-file/projectDataEvents'` |
| `app/project-file/projectDataContract.test.ts` | `:3` → `'../../shared/project-file/projectDataEvents'` |

Değişmeyen import'lar: §2 tablosundaki events ve validation kullanıcıları (ilk 6 satır).

## 4. Dizin haritası ve etkilenen dosyalar
```
src/shared/project-file/
  projectDataEvents.ts, projectFileValidation.ts          (değişmez)
  projectModuleStore.ts            (YENİ)   projectModuleStore.test.ts  (YENİ)
  useProjectModule.ts              (jenerik) useProjectModule.test.tsx  (YENİ)
src/features/family-registry/index.ts                          (YENİ)
src/features/family-registry/model/girderLibraryProjectModule.ts (YENİ)
src/features/preferred-span/index.ts                           (+1 export)
src/features/preferred-span/model/preferredSpanRulesProjectModule.ts (YENİ)
src/features/loads/model/loadsProjectModules.ts, windTypes.ts  (YENİ)
src/features/superstructure-families/model/crossSectionProjectModule.ts (YENİ)
src/app/project-file/
  projectModules.ts (kayıt defteri), projectFileTypes.ts, projectDataContract.ts, projectFileService.ts,
  useProjectFile.ts, recentProjects.ts, projectFileFixtures.ts
  projectModules.test.ts, projectModulesRoundTrip.test.ts, projectDataContract.test.ts, projectFileService.test.ts,
  projectFileRealDefaults.test.tsx, recentProjects.test.ts, useProjectFile.test.tsx,
  projectModuleRegistry.test.ts (YENİ)
```
- **(a) Bayt-özdeş taşınanlar** (`shared/project-file/` → `app/project-file/`): `recentProjects.ts`, `projectFileFixtures.ts`, `projectFileService.test.ts`, `projectFileRealDefaults.test.tsx`, `recentProjects.test.ts`, `useProjectFile.test.tsx`, `projectModulesRoundTrip.test.ts`, `projectModules.test.ts` (son ikisi artık `app`'teki kayıt defterini test eder).
- **(b) Taşınıp yalnızca import satırı değişenler:** `projectDataContract.ts`, `projectFileService.ts`, `useProjectFile.ts`, `projectDataContract.test.ts`.
- **(c) Bölünenler:** `projectModules.ts` → shared `projectModuleStore.ts` + 4 feature tanım dosyası + app kayıt defteri (eski dosya silinir); `projectFileTypes.ts` → `app/project-file/projectFileTypes.ts` + `features/loads/model/windTypes.ts`.
- **(d) Yeniden yazılan:** `shared/project-file/useProjectModule.ts` (jenerik imza).
- **(e) Yeni dosyalar:** 6 üretim dosyası (§3.2), `family-registry/index.ts`, 3 test dosyası (`projectModuleStore.test.ts`, `useProjectModule.test.tsx`, `projectModuleRegistry.test.ts`).
- **(f) Import ve çağrı değişikliği olanlar:** `PreferredSpanPanel.tsx`, `BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx`, `SelfWeightPermanent.tsx`, `SeismicPanel.tsx`, `UniformTemperaturePanel.tsx`, `TrafficLoadsPanel.tsx`, `WindLoadsPanel.tsx`, `WindLoadsPanel.test.tsx`, `LoadsPanel.tsx`, `windLoadsService.ts`, `preferred-span/index.ts`, `App.tsx`, `App.test.tsx`, `WorkspacePage.tsx`, `TopWorkspaceNav.tsx`, `layerRules.test.ts`.
- **(g) Silinenler:** `shared/project-file/` altındaki `projectModules.ts`, `projectFileTypes.ts`, `projectDataContract.ts`, `projectFileService.ts`, `useProjectFile.ts`, `recentProjects.ts`, `projectFileFixtures.ts` ve 7 test dosyası (hepsi taşınmış ya da bölünmüş olacak).
- **(h) Dokümanlar:** `frontend/README.md:21-24` (istisna paragrafı kaldırılır) ve `:39` (yeni yerleşim); `docs/architecture.md`'ye "G5 track" (sahiplik tablosu, eski→yeni yol haritası, R1/R2/R4/R3 önce ve sonra); `docs/roadmap.md`'ye G5 bölümü, `:1883` satırına "g5 ile yapıldı" notu. Tarihsel G3/G4 metinleri, `docs/features/**` ve `docs/reviews/**` değişmez.

## 5. Kural analizi (önce → sonra)
- **R1: 23 → 0.** `shared` artık yalnızca zod, React ve kendi dosyalarını import ediyor.
- **R2: 0 → 0.** Hiçbir feature `app/` import etmiyor; feature'lar kayıt defterini kullanmıyor.
- **R4: 0 → 0.** Yeni `model/` dosyaları yalnızca zod, `shared/project-file` ve aynı feature'ı import ediyor, `shared/ui` import'u yok.
- **R3: Δ = 0.** Kaldırılan import'lar `shared` hedefliydi (zaten sayılmıyordu). Eklenen cross-feature import'ların hepsi barrel üzerinden ve sayılmıyor (`BridgeDefinitionWorkspace`, `SystemAssemblyPanel` → `'../../preferred-span'`; `PreferredSpanPanel` → `'../../family-registry'`); diğer yeni import'lar aynı feature içinde; `app` → `features` kenarları R3'e sayılmaz; `projectModules.ts`'in eski 3 derin import'u, tanımlar kendi tiplerinin yanına taşındığı için ortadan kalkıyor. g4 raporunda baseline 90 idi; implementer T0'da ölçecek, beklenen final değer baseline ile aynı.
- **Döngüler:** eski `shared ↔ features` döngüleri tamamen kalkıyor; yeni zincirler `bridge-definition`/`system-assembly` → `preferred-span` → (`girder-library`, `family-registry`) → `shared`, geri dönen kenar yok. Barrel üzerinden `PreferredSpanPanel` modülü artık `BridgeDefinitionWorkspace` ile de yükleniyor; bundle'da zaten var (`router.tsx:14`, lazy yok), üst düzey yan etkisi yalnızca `GIRDER_KEY` sabiti.

## 6. Alternatifler
- `PROJECT_MODULES`'u bir feature klasörüne toplu taşımak (önceki öneri): kullanıcı reddetti; sahipliği karıştırıyor ve R3'ü +3/+12 artırıyordu.
- Tanımları `shared`'de tutmak: feature tiplerini ve `familyRepository`'yi `shared`'e çekmeyi gerektirir → reddedildi.
- `girderLibrary` tanımını `girder-library` feature'ına koymak: anahtar ve `save` fonksiyonu `family-registry`'de olduğu için derin import (R3 +1) ya da daha geniş barrel gerekir → sahip `family-registry`.
- Feature'ların derin model yollarını import etmesi: R3 +3 → reddedildi, barrel kullanılıyor.
- Her feature için wrapper hook: gereksiz yeni API → reddedildi.
- Olay sabitini `projectDataEvents.ts`'e koymak: g3 sözleşme dosyasına dokunur → reddedildi.
- Kayıt defterinden `PROJECT_MODULE_CHANGED_EVENT`'i yeniden export edip sözleşmenin `:10` satırını bayt-özdeş bırakmak: aynı sabit için ikinci bir yol açar → reddedildi; import satırının bölünmesi g3 kuralına uygun.

## 7. Sıralı görevler
- **T0 Baseline** (`frontend/`): `npm run build`, `npm test`, `npm run lint`, dist CSS sha256 ve R3 değeri (`[layer rules]` console satırı). Beklenen: 84 dosya / 830 test, 66 uyarı, sha256 `4936a632b1ffe1bfb36cca27d4768458fc0caf85936802f5e1402bc1ff16fa2d`. Sapma varsa durulur ve raporlanır.
- **T1 Shared mekanizma (bağ: T0):** `projectModuleStore.ts` eklenir; `projectModuleStore.test.ts` sentetik anahtar ve şemayla: bozuk/geçersiz veride `read` → `undefined`; `write` her iki olayı tam bir kez yayar, aynı değerde olay yaymaz; storage hata verince `false` döner; `reset` olay yayar, değer yoksa sessiz kalır; özel `write`/`reset` desteklenir. `useProjectModule.ts` jenerikleştirilir; `useProjectModule.test.tsx`: değer yokken fallback; kayıtlı değeri okur; `set` ile değer ve fonksiyon güncellemesi; `storage` olayıyla yenilenir.
- **T2 Feature tanımları (bağ: T1):** 4 tanım dosyası, `windTypes.ts`, `family-registry/index.ts`, `preferred-span/index.ts` export'u; §3.4'teki feature dosyaları güncellenir.
- **T3 App (bağ: T2):** `app/project-file/` taşımaları ve bölmeleri (kopyala + sil, UTF-8 ve satır sonları korunur); kayıt defteri `app/project-file/projectModules.ts`; `projectModuleRegistry.test.ts`: her `PROJECT_MODULES[id].id === id`; 8 anahtar eski literal anahtarlara eşit; nesneler feature export'larıyla aynı örnek (`toBe`); `App.tsx`, `App.test.tsx`, `WorkspacePage.tsx`, `TopWorkspaceNav.tsx` güncellenir.
- **T4 `layerRules.test.ts` (bağ: T3):** `ALLOWED_VIOLATIONS: readonly Violation[] = []`, `Violation` tipi ve ratchet korunur; `:18-22` yorumu güncellenir; saf fonksiyon `export function diffAllowList(found: string[], allowed: string[]): { unexpected: string[]; stale: string[] }` eklenir, `:158` ve `:162` testleri bunu kullanır (anlamları aynı); yeni sentetik testler: `diffAllowList(['R1 a -> b'], [])` → `unexpected`; `diffAllowList([], ['R1 x -> y'])` → `stale`; `analyze`, `shared/... -> app/...` ve `shared/... -> pages/...` için R1 üretir; `:166-172` testinin yerine `expect(ALLOWED_VIOLATIONS).toEqual([])`; `:107-147` sentetik testleri ve R3 testi aynen kalır (kaynak tarama ve gerçek ihlal yakalayan testler korunur).
- **T5 Bayat kalıntı taraması (bağ: T4):** §9 AC8 komutları.
- **T6 Dokümanlar (bağ: T5):** §4 (h).
- **T7 Final ölçüm:** baseline ile karşılaştırma.

## 8. Kabul kriterleri
- **AC1** T0 baseline değerleri kayıtlı.
- **AC2** `src/shared/project-file/` altında yalnızca şu üretim dosyaları var: `projectDataEvents.ts`, `projectFileValidation.ts` (ikisi de bayt-özdeş), `projectModuleStore.ts`, `useProjectModule.ts`; hiçbiri `features/`, `app/` veya `pages/` import etmiyor.
- **AC3** `ALLOWED_VIOLATIONS` boş, `layerRules.test.ts` tamamen yeşil (R1 = R2 = R4 = 0); sentetik testler listede olmayan ihlalin ve bayat kaydın yakalandığını kanıtlıyor; `:107-147` testleri korunmuş.
- **AC4** R3 final değeri baseline'a eşit (Δ = 0), iki değer de raporlanmış.
- **AC5** Sekiz modülün id, anahtar, şema metni ve özel yazma/sıfırlama davranışı §2 tablosundaki sahip dosyalarda ve eskisiyle aynı. `PROJECT_MODULE_IDS` sırası `['girderLibrary','preferredSpanRules','seismicInputs','windInputs','temperatureInputs','crossSectionValues','selfWeightInputs','trafficLm1']`. Kayıt defteri feature nesnelerinin aynı örneklerini tutuyor.
- **AC6** Hiçbir `features/**` dosyası kayıt defterini (`app/project-file/projectModules`) ya da `app/` katmanını import etmiyor; feature'lar modüllerini kendi tanımları ve shared hook ile kullanıyor; `useProjectModule('…')` string id çağrısı kalmamış.
- **AC7** `projectDataContract.ts` gövdesi bayt-özdeş, yalnızca import satırları farklı; §4 (a) listesi bayt-özdeş, (b) listesinde yalnızca import satırları değişmiş.
- **AC8** Bayat yol taraması 0 sonuç: eski `shared/project-file/(projectModules|projectFileTypes|projectFileService|projectDataContract|useProjectFile|recentProjects|projectFileFixtures)` yolları, `vi.mock` ve `importActual` yolları dahil.
- **AC9** `WindResult` ve `WindCalculationSnapshot` yalnızca `features/loads/model/windTypes.ts`'te tanımlı, metinleri aynı; `projectFileTypes` bunları re-export etmiyor.
- **AC10** `npm run build` exit 0. `npm test` hepsi yeşil: dosya sayısı 84 + 3 = 87; test sayısı 830 + yeni `it` sayısı (implementer kesin sayıyı raporlar); silinen tek eski test `:166` testinin yerine geçen kontrol. `npm run lint` exit 0 ve 66 uyarı (fark varsa gerekçesi). dist CSS sha256 değişmemiş.
- **AC11** Davranış korunmuş: taşınan proje dosyası testleri değişmeden yeşil (round-trip, rejections, contract, recent, `useProjectFile`, `projectModules`); panel testleri (`PreferredSpanPanel`, `SeismicPanel`, `UniformTemperaturePanel`, `Lm1Panel`, `LoadsPanel`, `WindLoadsPanel`, `MaterialsPanel`, `App`) değişmeden yeşil.
- **AC12** Dokümanlar güncel (T6).
- **AC13** Backend, `package*.json` ve CSS diff'i boş.

## 9. Doğrulama matrisi
Komutlar `frontend/` altında.
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | T0 komutları | 84/830, 66 uyarı, hash `4936a632…16fa2d` |
| AC2 | `ls src/shared/project-file`; `grep -rnE "from '\.\./\.\./(features|app|pages)" src/shared` | 4 üretim + 2 test dosyası; 0 sonuç |
| AC3 | `npx vitest run src/test/architecture/layerRules.test.ts` | hepsi yeşil, sentetik testler dahil |
| AC4 | `[layer rules]` console satırı, T0 ile T7 | aynı sayı |
| AC5 | `projectModules.test.ts`, `projectModuleRegistry.test.ts`, `projectDataContract.test.ts` | yeşil |
| AC6 | `grep -rnE "app/|project-file/projectModules'" src/features`; `grep -rn "useProjectModule('" src` | 0; 0 |
| AC7 | koordinatör diff'i / eski ve yeni dosya karşılaştırması | yalnızca import satırları farklı |
| AC8 | `grep -rnE "shared/project-file/(projectModules\|projectFileTypes\|projectFileService\|projectDataContract\|useProjectFile\|recentProjects\|projectFileFixtures)" src` | 0 |
| AC9 | `grep -rnE "export type Wind(Result\|CalculationSnapshot)" src` | tek dosya |
| AC10 | `npm test`, `npm run build`, `npm run lint`, CSS sha256 | §8 AC10'daki değerler |
| AC11 | `npm test` dosya bazında çıktı | listelenen testler yeşil |
| AC12 | dokümanların okunması | G5 track var; README'de istisna yok |
| AC13 | `git status`, `git diff --stat` (koordinatör) | yalnızca `frontend/src` ve 3 doküman |

Bilinmeyenler: g4'te CSS hash'inin hangi komutla ölçüldüğü kayıtlı değil (implementer kullandığı komutu raporuna yazmalı); güncel R3 baseline'ını implementer ölçmeli.

## 10. Riskler
- **Tip çıkarımı:** jenerik hook'ta `fallback` tipi `T` çıkarımını bozabilir; `NoInfer` kullanılmalı, `tsc -b` doğrular; eski tipler `ProjectModuleValue<K>` ile eşdeğer olmalı (özellikle `SelfWeightInputs` ve zod çıktısı uyumu, `NO_LM1_OVERRIDE` `undefined as unknown as Lm1Parameters`).
- **Nesne kimliği:** kayıt defteri modülleri yeniden oluşturursa feature ve app farklı nesneler kullanır; önbellek `id` ile anahtarlandığı için veri tutarlı kalır, ama `projectModuleRegistry.test.ts` `toBe` ile aynı örneği zorunlu kılar.
- **id, anahtar ya da şema kayması:** metin aynen kopyalanmalı; kayma eski `.kopruq` dosyalarını ve localStorage verisini okunamaz yapar ("persistence backward compatibility" korunan sözleşmesi, `AGENTS.md:1274`); round-trip, `projectModules` ve registry testleri yakalar.
- **`girderLibrary` sıfırlama yolu:** özel yazma/sıfırlama mantığı ve sözleşmenin `:66`'daki özel durumu değişmeden kalmalı.
- **Barrel yükleme sırası:** döngü yok, lazy route yok; `PreferredSpanPanel`'in üst düzey `GIRDER_LIBRARY_MODULE.key` erişimi ESM sırasıyla güvende.
- **Kodlama ve satır sonu:** `recentProjects.ts` Türkçe metin içeriyor; kopyalama bayt-özdeş olmalı; `sourceEncoding.test.ts` bozulmayı yakalar.
- **Veri ve kalıcılık:** migrasyon yok; geri dönüş dosya taşımalarının geri alınmasıyla yapılır (git işlemi kullanıcıda); yetkilendirme etkisi yok.

## 11. Varsayımlar ve kararlar
**Doğrulanmış:** §2'deki tüm import haritası ve satırlar, mock'ların ve lazy route'ların bulunmaması, barrel içerikleri, sahiplik için gereken tiplerin konumu.
**Bu planda verilmiş kararlar** (kullanıcı yönergelerinden türetildi): `girderLibrary` sahibi `family-registry` (`PreferredSpanPanel` için yeni en küçük barrel); `crossSectionValues` sahibi `superstructure-families` (barrel'a eklenmiyor, `App` modüle kayıt defterinden erişiyor); hook yolu `shared/project-file/useProjectModule.ts` olarak kalıyor, imza modül nesnesi alacak şekilde değişiyor; feature'lara wrapper hook eklenmiyor; yeni test dosyaları: 2 shared + 1 app.
**Varsayım:** T0 baseline sayıları istekte ve g4 raporunda verilen değerlerle aynı çıkacak.

Gerçekten çözümsüz kalan bir karar yok.

READY
