# Mimari İnceleme Raporu — `frontend` (phase=architecture)

> project-reviewer ajanının (phase=architecture) raporu; koordinatör tarafından aynen kaydedildi.

- **Kök:** `C:\Users\cemha\repos\KOPRUQ`
- **Kapsam:** `frontend` (backend kapsam dışı; kök dokümanlar yalnızca bağlam olarak okundu)
- **HEAD:** `0cc62f9bab8a69b9ab348d8673aa28402d53b620`
- **Envanter parmak izi:** `248ac885b5e76abe3a8e5ad20f77be1e20cfb237eaeb27193d74477576125a7a`
- **Envanter:** `inventory-before.json`. 345 seçili dosya: 307 metin, 19 büyük boyutlu, 19 ikili/UTF-8 dışı. Git'in yok saydığı dosyalar (`node_modules`, `dist`) envanterde yok.
- **Yöntem:** Bağımlılık haritası dizin adlarından değil, kaynak `import` satırlarından (Grep) ve tam okunan dosyalardan çıkarıldı. Yalnızca keyword araması yapılan dosyalar "incelendi" sayılmadı.
- **Faz kararı girdisi:** Doğrulanmış, eylem gerektiren bulgular var (ACTION_REQUIRED). Kapsamın çoğu bu fazda tam okunmadığı için genel karar **INCOMPLETE** ile sınırlı.

---

## 1. Mimari harita (kaynaktan doğrulanmış)

### 1.1 Giriş noktaları ve kabuk
- `frontend/src/main.tsx:4-7` önce `migrateLegacyStorage()` çağrısını, ardından `App` importunu içeriyor. ES modüllerinde importlar yukarı taşındığı için `App` ve alt bağımlılıkları göç kodundan **önce** değerlendiriliyor (bkz. H-07).
- `src/app/App.tsx` uygulamanın tek durum sahibi. Proje durumu, köprü tanımları, `crossSectionValues`, `windLoads`, `layoutSeed`, `summary`, terrain/LandXML ID'leri, dosya oturumu, kaydedilmemiş değişiklik modalı ve son projeler burada (`App.tsx:50-122`). Hepsi `RoutedApplication` üzerinden aşağı aktarılıyor (yaklaşık 25 prop, `App.tsx:125-152`).
- İki katmanlı yönlendirme:
  - `workspaces/registry.ts`: `/:workspace` → `WorkspacePage`.
  - `router.tsx`: eski `/:section` yolları, `WorkspacePage` içinde `mainContentOverride` olarak işleniyor (`App.tsx:174-184`).
- `WorkspacePage.tsx:18-21`: Graph, Project, Bridge Definition ve Family bileşenleri doğrudan feature iç dosyalarından import ediliyor (`WorkspacePage.tsx:3-9`). Family çalışma alanı yalnızca `FamilyResultsViewer`'ı (Graph sonuçları) monte ediyor.

### 1.2 Katmanlar ve gerçek bağımlılık yönü
README'nin beyan ettiği yön `app → pages → features → shared`, tek yönlü (`frontend/README.md:10-30`). Kaynakta gözlenen:

| Kenar | Kanıt |
|---|---|
| app → features (barrel) | `router.tsx:6-23` |
| app → features (iç dosyalar) | `App.tsx:14,35-38`, `WorkspacePage.tsx:3-10` |
| **shared → features** (ihlal) | `shared/project-file/projectFileService.ts:1-4`, `projectFileTypes.ts:1-3`, `useProjectFile.ts:3-4` |
| **features → app** (ters yön) | `features/graph/ui/GraphWorkspace.tsx:4`, `features/family-tables/components/FamilyTablesWorkspace.tsx:11` (`app/layout/WorkspaceLayout`) |
| features → features, barrel atlanarak | 13 feature (ör. `system-assembly/components/SystemAssemblyPanel.tsx:5-15`, `bridge-definition/components/BridgeDefinitionWorkspace.tsx:3-17`, `family-tables/components/*` → `graph/{family,domain,registry,state}`) |
| features → shared/ui içindeki domain fonksiyonu | `pier-families/model/service.ts:1`, `bearing-families/model/service.ts:1`, `girder-library/model/variants.ts:1` → `shared/ui/ParamSweepCard` (`generateValues` yeniden export, `ParamSweepCard.tsx:21-22`) |

- Döngüsel import: izlenen zincirlerde kanıtlanmış döngü yok. `graph` içi zincir `state → engine/registry → domain`; `registry` `state`'i import etmiyor.
- Barrel eksikliği: `graph`, `family-tables`, `family-registry`, `bridge-definition` feature'larında `index.ts` yok.

### 1.3 Graph alt sistemi
- `ui/GraphWorkspace` → `state/graphStore` (modül düzeyi tekil store, `useSyncExternalStore`) → `engine/graphEngine` → `registry/nodeRegistry` → `domain/*`.
- `domain/*` React'a bağımlı değil; belgelenen "headless" kararla tutarlı (`docs/architecture.md:2544`).
- `nodeRegistry.ts` tek dosyada: düğüm tanımları/varsayılanlar; math semantiği (`:199-220`); birim çözümleme (`:265-271`); **ikinci bir önizleme yürütücüsü** (`previewDesignOutput`, `:276-346`) ve istatistikler (`:347-369`); Range üretimi (`:371-380`); bağlantı uyumluluğu (`canConnect`, `:381-395`).
- Graph sonuçları `family-tables`'a modül düzeyi `Map` (`graph/family/familySnapshotStore.ts:3`) ve `window` olaylarıyla akıyor.

### 1.4 Kalıcılık
- Doğrudan `localStorage` erişimi (testler hariç) ~20 modülde, UI bileşenleri dahil: `SeismicPanel.tsx:7`, `WindLoadsPanel.tsx:9`, `UniformTemperaturePanel.tsx:6`, `MaterialsPanel.tsx:39,46`, `PreferredSpanPanel.tsx:27,37,75`, `FamilyResultsViewer.tsx:21,25`, `FamilyTablesWorkspace.tsx:40`, `BridgeDefinitionWorkspace.tsx:49`, `SystemAssemblyPanel.tsx:59`, `PierFamiliesPanel.tsx:16`.
- `family-registry/model/familyRepository.ts` "tek erişim sınırı" olarak tanımlı (`:1-5`; `docs/kopruq-data-architecture.md:6`) ama yukarıdaki modüller onu atlıyor.
- Anahtar sabitleri tekrarlanıyor: `familyRepository.ts:11-15` ile `useFamilyCatalog.ts:54` aynı eşleme; `kopruq.graph.documents.v1` üç yerde literal; `kopruq.girder-library.precast` ve `...girder-span-rules` birden fazla yerde.
- Feature'lar arası senkronizasyon string literal `window` olaylarıyla (`kopruq:*`, ~12 ad), merkezi tanım yok.
- `.kopruq` dosyası (`projectFileService.ts:7-13`): `projectState`, `bridgeDefinitions`, `graph`, 5 aile kategorisi, `windLoads`. Eksikler A-01'de.
- Son projeler: IndexedDB + `localStorage` metadata (`recentProjects.ts:8-10`).

### 1.5 API servis katmanı
- Ortak HTTP istemcisi yok. `const API_BASE = 'http://localhost:8080'` dokuz modülde ayrı ayrı (alternatives, layout, fast-solver, loads traffic, loads temperature, terrain-viewer, terrain-dtm, landxml, graph material).
- Bileşen içinde satır içi `fetch`: `WindLoadsPanel.tsx:9`, `SeismicPanel.tsx:7`, `TerrainMesh.tsx:59`.
- TanStack Query yalnızca bazı akışlarda (`hooks/use*`); seismic, wind ve temperature atlıyor.

---

## 2. Doğrulanmış bulgular

### A-01 — Proje dosyası/kalıcılık sınırı eksik; projeye ait mühendislik girdileri projeler arasında sızıyor
- **Kategori:** Kalıcılık / veri sahipliği · **Önem:** CRITICAL · **Güven:** high
- **Kanıt:**
  - `shared/project-file/projectFileService.ts:7,10-13`: dosyaya yalnızca PIER, PIER_CAP, FOUNDATION, BEARING, MATERIAL, graph, projectState, bridgeDefinitions, windLoads yazılıyor.
  - Dosya dışında global `localStorage`'da kalanlar: `kopruq.girder-library.precast` (`familyRepository.ts:19-28`, `GirderLibraryPanel.tsx:66`), `kopruq.project-design-system.girder-span-rules` (`PreferredSpanPanel.tsx:6,75`), `kopruq.seismic` (`SeismicPanel.tsx:7`), `kopruq.wind-load.inputs` (`WindLoadsPanel.tsx:9`), `kopruq.uniform-temperature.inputs` (`UniformTemperaturePanel.tsx:6`).
  - Hiç kalıcı olmayanlar: `crossSectionValues` (`App.tsx:70`, yalnızca `useState`), self-weight girdileri (`SelfWeightPermanent.tsx:88`).
  - Kaydedilen wind snapshot'ında girdiler boş: `LoadsPanel.tsx:56` → `inputs: { vb: '', terrain: '', ze: '' ... }`.
  - "New Project" girder tanımını sıfırlıyor (`App.tsx:84`); "Open" (`useProjectFile.ts:14` → `applyProjectFile`) girder, span kuralları ve yük girdilerini geri yüklemiyor.
- **Tetikleyici:** A projesinde girder library, preferred span, seismic/wind/temperature değerlerini düzenleyin, sonra B'yi dosyadan açın: B, A'nın değerleriyle çalışır. B kaydedilince bu değerler dosyaya girmez; başka makinede kaybolur. Yeniden yüklemede cross-section ve self-weight varsayılana döner; wind `deckWidthM` (`LoadsPanel.tsx:56`) varsayılan platform genişliğinden yeniden hesaplanır.
- **Etki:** Yanlış projenin girdileriyle hesap, sessiz veri kaybı; "Kaydedildi" durumu gerçeği yansıtmıyor.
- **Gerekçe:** `docs/kopruq-data-architecture.md:5-6` bu verileri Project/Repository sahipliğinde tanımlıyor.
- **En küçük onarım:** Proje kapsamlı anahtarların tek listesi; `buildProjectFile`/`applyProjectFile` `modules` altına ekleme; `newProject`'te sıfırlama; `crossSectionValues` kalıcılığı; wind snapshot'ında gerçek girdiler.
- **Doğrulama:** `projectFileService.test.ts`'e "A'yı düzenle → B'yi aç → A'nın değerleri görünmüyor" ve round-trip testleri.

### A-02 — Köprü kimliği iki anahtarla tutuluyor; `no` değişince köprü tanımı kayboluyor
- **Kategori:** Domain kimliği / veri bütünlüğü · **Önem:** MAJOR · **Güven:** high
- **Kanıt:**
  - Kalıcı `id`: Graph (`graphStore.ts:183-186`), Family görüntüleyici (`FamilyResultsViewer.tsx:20`); doküman da bunu söylüyor (`docs/architecture.md:28-32`).
  - Görünen `no` anahtar olarak: `bridge-definition/model/store.ts:23,43,49`; `BridgeDefinitionWorkspace.tsx:63-64,83`; `family-registry/model/registry.ts:49-57`.
  - `no` düzenlenebilir (`ProjectPanel.tsx:313`); kayıtta `originalNo` ile eşlenip yeni `no` ile yazılıyor (`ProjectPanel.tsx:108`).
  - `ensureBridgeDefinitions` yalnızca mevcut `no` değerleri için tanım üretiyor (`store.ts:48-51`); eski anahtar düşüyor ve kalıcı hale geliyor (`App.tsx:56`).
- **Tetikleyici:** Köprü numarasını VIA-01 → VIA-01A yapın.
- **Etki:** Span dizisi, aks atamaları, kısıtlar ve aile referansları sessizce silinir; `getFamilyReferences` yanlış kimlik raporlar.
- **Onarım:** Store ve `getFamilyReferences`'ı `bridge.id`'ye taşıma; `no → id` tek seferlik göç.
- **Doğrulama:** "no yeniden adlandırılınca tanım korunur" testi.

### A-03 — Aynı mühendislik kuralı/üreteci Family Tables ve Graph'ta ayrı ayrı; "tek kaynak" iddiası tutmuyor
- **Kategori:** Tekrarlanan domain kuralı · **Önem:** MAJOR · **Güven:** high
- **Kanıt:**
  - Kazıklı temel Lx/Ly iki yerde, farklı yuvarlamayla: `foundation-families/model/service.ts:12-14` (`toFixed(10)`), `graph/domain/foundationCandidates.ts:49-50` (`toPrecision(12)`); doküman "yalnızca `derivePiledFoundationDimensions`" diyor (`docs/architecture.md:2528`, `docs/kopruq-data-architecture.md:22`).
  - Parametre taraması en az dört semantikle: `shared/ui/generation.ts:2-9` (0,01 yuvarlama, birikimli toplama), `pier-cap-families/model/service.ts:2`, `foundation-families/model/service.ts:3-10`, `graph/registry/nodeRegistry.ts:371-380`.
  - Pier B/D yönü ters: `nodeRegistry.ts:42-45` "Longitudinal Length (B)"/"Transverse Length (D)"; `pier-families/model/service.ts:40-43` B=Transverse, D=Longitudinal; `docs/architecture.md:2708` "B is transverse and D is longitudinal".
- **Etki:** Aynı girdiden iki ekranda farklı aday kümeleri/kimlikler; B/D tutarsızlığı Ix/Iy'yi yanlış eksene atayabilir.
- **Onarım:** Lx/Ly ve sweep için tek framework'süz domain modülü; B/D etiketlerini dokümana hizalama (mühendis onayıyla).
- **Doğrulama:** Ortak fonksiyon için tablo testi ve iki üreticinin karşılaştırma testi.

### A-04 — `nodeRegistry.ts` aşırı sorumluluk; önizleme ve yürütme yolları ayrışmış
- **Kategori:** God object / tekrar / shotgun surgery · **Önem:** MAJOR · **Güven:** high
- **Kanıt:**
  - `executor` ile `previewDesignOutput` aynı işi iki kez yapıyor.
  - Abutment önizlemesi tanımda olmayan adları okuyor: tanım `front_h`, `found_th`, `sei_uValue/sei_uUnit` (`nodeRegistry.ts:90-94`); önizleme `Front_fhValue`, `Foun_fhValue`, `seiUValue/seiUUnit` (`:342-343`). Bağlı geometri girişlerini de yok sayıyor; önizleme gerçekten kullanılıyor (`reactFlowAdapter.ts:48,93`).
  - Steel girder önizlemesi `preferredSpanValue`'yu birim dönüştürmeden kullanıyor (`:324`); yürütücü `canonicalGirderLength(...unit)` uyguluyor (`:76`).
  - Yeni düğüm için birden çok elle tutulan liste: `reactFlowAdapter.ts:48`, `EngineeringNodeShell.tsx:123`, `nodeVisualThemes.ts:64-65`, `nodeLogos.ts:32`, `FamilyResultsViewer.tsx:17`, `NodeLibrary` prefix filtresi.
  - Dokümanda kayıtlı geçmiş hatalar: `docs/architecture.md:2750,2762,2778`.
- **Etki:** mm birimi veya bağlı abutment girdisinde Run öncesi önizleme Run sonucundan farklı; abutment önizlemesi büyük olasılıkla geçersiz aday gösteriyor.
- **Onarım:** Önizlemeyi aynı executor üzerinden çalıştırma; tip listelerini `NodeDefinition` metadata'sına taşıma; dosyayı `registry/definitions/*.ts` olarak bölme.
- **Doğrulama:** Her structural düğüm için "preview == executor" parametrik testi.

### A-05 — Precast girder geometri anahtarları iki sözlükte; Graph yolunda kesit özellikleri NaN olabilir
- **Kategori:** Sözleşme · **Önem:** MAJOR · **Güven:** medium-high (kod izlemesi, çalıştırılmadı)
- **Kanıt:** Graph alanları `['H','tf','bf','w','th1','bh1','th2','bh2']` (`nodeRegistry.ts:73,320`), `generatePrecastGirderCandidates`'e aynen geçiyor (`girderCandidates.ts:26`); `precastSectionProperties` `{H,Btf,Bbf,tw,...}` bekliyor (`girderCandidates.ts:11-12`) → `Btf/Bbf/tw` tanımsız, NaN, yine de `validationStatus:'VALID'`. Testler `Btf/Bbf/tw` ile yazılmış (`girderCandidates.test.ts:5-6`). Family tarafı `canonicalPrecastParameters` ile çeviriyor (`graphFamilyPresentation.ts:68`, `PrecastGirderSectionProperties.tsx:16`); `superstructureCandidates.ts:6` `tf` kullanıyor.
- **Etki:** Graph List/Watch/Inspector'da precast A/Ix/Iy/Wx/Wy geçersiz; aşağı akışa yanlış veri.
- **Onarım:** Tek `PrecastGeometry` tipi ve tek eşleme; testleri gerçek düğüm çıktısıyla kurma.

### A-06 — Mühendislik kuralları/sabitleri frontend'de ve kaynaksız; malzeme özellikleri iki kaynaktan
- **Kategori:** Yanlış yerleşmiş iş mantığı / mühendislik güvenliği · **Önem:** MAJOR · **Güven:** high (konum); onay için H-01
- **Kanıt:** Seismic blok eşiği `abutmentCandidates.ts:65-66` (`seiW < .2` ERROR, `< .3` WARNING), varsayılan `seiU .03` (`:38`, `nodeRegistry.ts:94`); structural steel E=210000 MPa, ν=0,3, ρ=7,85 t/m³, γ=76,98 kN/m³ sabit (`nodeRegistry.ts:221`), concrete ise backend `EurocodeConcrete`'ten (`graphMaterialService.ts:8-18`); wind `drefM: 3` iki yerde (`WindLoadsPanel.tsx:7,9`, `LoadsPanel.tsx:56`); seismic `ξ=5,0%`, `η=1.00` sabit metin (`SeismicPanel.tsx:6`); `abutmentCandidates.ts:64` `Math.min(x, x)` (muhtemel hata). Hiçbiri için kaynak/madde/doğrulama örneği yok (CLAUDE.md engineering safety rules).
- **Onarım:** Her sabit için mühendisten kaynak/onay; steel'i backend'e taşıma; kuralları kaynaklı tek modülde toplama (tercihen `rules-engine`).

### A-07 — Kalıcılık deposu ve olay veriyolu dağınık; repository ve dirty takibi atlanıyor
- **Kategori:** Paylaşılan değiştirilebilir durum · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `MaterialsPanel.tsx:46` repository'yi atlayıp yazıyor, ilk mount'ta da yazıyor, yalnızca `kopruq:material-catalog-changed` yayınlıyor; `useProjectFile.ts:11` yalnızca `kopruq:project-data-changed` dinliyor → MATERIAL dosyada olduğu halde (`projectFileService.ts:7`) dirty işaretlenmiyor. `registry.ts:24,49` ham JSON okuyor; `FamilyResultsViewer.tsx:21,25`, `FamilyTablesWorkspace.tsx:40` graph belgelerini `localStorage`'dan okuyor; `BridgeDefinitionWorkspace.tsx:72` girder/span olaylarını dinlemiyor; `graphStore.ts:89`, `FamilyResultsViewer.tsx:20`, `PrecastGirderSectionProperties.tsx:18` proje birimlerini kalıcı depodan okuyor.
- **Onarım:** `shared/persistence` altında tipli storage modülü (anahtar ve olay sabitleri); tüm yazmalar oradan, her yazma `project-data-changed` yayınlasın.

### A-08 — Beyan edilen katman kuralları uygulanmıyor
- **Kategori:** Sınır ihlali · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `projectFileService.ts:1-4` (shared → features; aslında uygulama orkestratörü); `GraphWorkspace.tsx:4`, `FamilyTablesWorkspace.tsx:11` (features → app); 13 feature'da barrel atlanıyor; `ParamSweepCard.tsx:21-22`. README iddialarıyla çelişki (`frontend/README.md:25-30`).
- **Onarım:** `project-file`'ı `app/`'e taşıma; `WorkspaceLayout`'u `shared/ui`'ye; `generateValues`'i `shared/lib`'e; barrel'lar ve import kısıtı kuralı ya da mimari test.

### A-09 — HTTP katmanı yok; backend adresi ve hata/yarış davranışı dağınık
- **Kategori:** Altyapı / hata yönetimi · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `API_BASE` dokuz modülde; satır içi URL `TerrainMesh.tsx:59`, `WindLoadsPanel.tsx:9`, `SeismicPanel.tsx:7`. `SeismicPanel.tsx:7` `.then(x=>x.json()).then(setR)`: `res.ok` yok, `catch` yok, iptal yok, her tuşta istek. `UniformTemperaturePanel.tsx:6` `void update(...)` catch'siz, yanıtlar sıra dışı gelebilir. `WindLoadsPanel.tsx:9` `!res.ok` sessiz. Yanıtlar şema doğrulamasız cast ediliyor (`graphMaterialService.ts` hariç).
- **Etki:** localhost dışına dağıtılamaz; eski yanıt yeni sonucu ezebilir; hatalar gösterilmiyor.
- **Onarım:** Tek `shared/api/http.ts` (`VITE_API_BASE`, `ok` kontrolü, `AbortController`); seismic/temperature/wind'i TanStack Query'ye taşıma.

### A-10 — SI birim kuralı ihlali (girder library cm)
- **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `girder-library/model/variants.ts:6,10-19,24-28` (`heightCm`, `PRECAST_DIMENSIONS` cm, ID `PG-H160`); Graph metre (`nodeRegistry.ts:69`).
- **Onarım:** Depolamayı metreye geçirme (göç), cm yalnızca görüntülemede; ID formatı için mühendise sorma.

### A-11 — Doküman kayması (README, architecture, roadmap)
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** README'de olup kodda olmayan `ThemeToggle` (`README.md:27-28`), "3 real backend calls" (`README.md:53-54`; gerçekte 9+), "nothing reaches into another feature's internal files". Roadmap/architecture Phase 3G'de (2026-09-19) bitiyor; Abutment, Span Arrangement, Assembly düğümleri (`nodeRegistry.ts:29-39,79-97,222-247`), Wind/Seismic/Temperature panelleri, `.kopruq` dosyası dokümanda yok. `index.css:107` olmayan ThemeToggle'a referans.

### A-12 — TypeScript strict kapalı
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** `tsconfig.app.json`, `tsconfig.node.json` içinde `strict` yok; testler hariç 6 dosyada 13 `any` (Grep), yoğunluk `SeismicPanel.tsx`, `WindLoadsPanel.tsx`.
- **Onarım:** `strictNullChecks`'ten başlayarak kademeli açma.

### A-13 — Ölü/erişilemeyen kabuk kodu
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** Import edilmeyen dosyalar: `FamilyTablesWorkspace.tsx` (17 KB), `pages/home/HomePanel.tsx`, `app/layout/Sidebar.tsx`, `app/layout/TopBar.tsx`, `LayoutDesignSpacePanel`. `router.tsx:102-104,120,130-150` dallarına ulaşılamıyor (`App.tsx:161-173` önceden yönlendiriyor). `summary` (`App.tsx:51`) gösterilmiyor; `WorkspacePage.tsx:16` `void setCrossSectionValues`. Doküman "bilerek tutuldu" diyor (`architecture.md:2454-2456`); silme kararı kullanıcıda.

### A-14 — Tek global stil dosyası
- **Önem:** MINOR · **Güven:** high (Grep sayımı)
- **Kanıt:** `src/app/styles/App.css` 325.160 bayt; 596 `!important` (Grep). İçerik okunmadı.

### A-15 — Kaynakta kodlama bozulması (mojibake)
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** 7 dosyada 23 eşleşme (`Â`, `â€`): `WorkspacePage.tsx:24,27`, `BridgeDefinitionWorkspace.tsx:122,130,140`, `ProjectWorkspace.tsx` (6 yer).
- **Onarım:** UTF-8 düzeltme ve `.editorconfig`.

### A-16 — Repoda takip edilen test log artefaktı (INFO)
- `frontend/vitest-errors.txt` UTF-16, eski çalıştırma çıktısı; yerel yol ve eski ürün adı içeriyor (satır 2). `.gitignore`'a eklenmesi önerilir.

---

## 3. Doğrulanmamış hipotezler
- **H-01 — Milestone onayı:** Abutment, Span Arrangement, Assembly düğümleri, Wind/Seismic/Temperature, `.kopruq` dosyası ve A-06 sabitleri için belgelenmiş mühendis onayı yok.
- **H-02 — Sınırsız aday üretimi:** Family Tables üreteçlerinde üst sınır yok (`foundation-families/model/service.ts:40` altı iç içe döngü; `pier-families/model/service.ts:8`; `generateValues`). Graph'ta 10.000 limiti var (`foundationCandidates.ts:75`).
- **H-03 — 0,01 m yuvarlama:** `shared/ui/generation.ts:4,7`; 0,125 m → 0,13. Mühendis karar vermeli.
- **H-04 — Seismic/Temperature yarış durumu:** Koddan çıkarıldı, çalıştırılmadı.
- **H-05 — `migrateLegacyStorage` döngüsü:** İndeksle gezinirken `setItem` (`legacyStorageMigration.ts:11-17`); anahtarlar atlanabilir.
- **H-06 — `JSON.parse` hatası:** `SeismicPanel.tsx:7`, `WindLoadsPanel.tsx:9` render sırasında try/catch'siz parse.
- **H-07 — `main.tsx` import sırası:** Şu an okumalar tembel; gelecekte risk.
- **H-08 — Bayat sonuçlar:** `familySnapshotStore.ts:3` yalnızca bellek; proje açma/yeni projede `clearFamilySnapshots` çağrısı yok.

---

## 4. Code fazı için kritik yollar
1. Proje yaşam döngüsü: `App.tsx` → `useProjectFile.ts` → `projectFileService.ts` → `graphStore.ts` / `familyRepository.ts` / `bridge-definition/model/store.ts` / `projectWorkspace.ts`.
2. Graph yürütme ve önizleme: `GraphWorkspace.tsx` → `graphEngine.ts` → `nodeRegistry.ts` (özellikle 126-192) → `domain/*Candidates.ts` → `reactFlowAdapter.ts` → `EngineeringNodeInspector.tsx` / `NodeInspector.tsx`.
3. Graph → Family: `familyResults.ts` → `familySnapshotStore.ts` → `FamilyResultsViewer.tsx` → `graphFamilyPresentation.ts` → Precast/Pier önizlemeleri.
4. Family Tables üreteçleri: `*-families/model/service.ts`, `useFamilyCatalog.ts`, `registry.ts`, `SystemAssemblyPanel.tsx`, `PreferredSpanPanel.tsx`, `GirderLibraryPanel.tsx`.
5. Loads: `LoadsPanel.tsx`, `SeismicPanel.tsx`, `WindLoadsPanel.tsx`, `UniformTemperaturePanel.tsx`, `traffic/*`, `trafficLoadsService.ts`.
6. Bridge Definition: `BridgeDefinitionWorkspace.tsx` (145-213), `ProjectPanel.tsx`.
7. Terrain/LandXML: `TerrainMesh.tsx`, `terrainViewerService.ts`, `landXmlImportService.ts`.

Test boşlukları (envanterde test yok): `bridge-definition/model/store.ts`, `useFamilyCatalog.ts`, `loads/components/*`, `landxml-import`, `terrain-dtm`, `GirderLibraryPanel`/`PreferredSpanPanel` kalıcılığı; proje dosyası round-trip ve `no` yeniden adlandırma. Sayısal coverage ölçülmedi.

---

## 5. Bu fazın kapsamı
- **Tam okunan (49):** `package.json`, `README.md`, `vite.config.ts`, `tsconfig*.json` (3), `.oxlintrc.json`, `main.tsx`, `legacyStorageMigration.ts`, `App.tsx`, `router.tsx`, `workspaces/registry.ts`, `WorkspacePage.tsx`, `AppProviders.tsx`, `TopWorkspaceNav.tsx`, `WorkspaceLayout.tsx`, `SeismicPanel.tsx`, `WindLoadsPanel.tsx`, `UniformTemperaturePanel.tsx`, `LoadsPanel.tsx`, `SelfWeightPermanent.tsx`, `temperatureService.ts`, `familyRepository.ts`, `family-registry/model/registry.ts`, `useFamilyCatalog.ts`, `projectFileService.ts`, `projectFileTypes.ts`, `useProjectFile.ts`, `graphStore.ts`, `projectWorkspace.ts`, `bridge-definition/model/store.ts`, `pierSectionProperties.ts`, `circularSectionProperties.ts`, `foundationCandidates.ts`, `girderCandidates.ts`, `abutmentCandidates.ts`, `bridgeAssembly.ts`, `superstructureCandidates.ts`, `pierSectionGeometry.ts`, `foundation-families/model/service.ts`, `pier-families/model/service.ts`, `pier-cap-families/model/service.ts`, `bearing-families/model/service.ts`, `girder-library/model/variants.ts`, `shared/ui/generation.ts`, `alternativesService.ts`, `graphMaterialService.ts`, `familySnapshotStore.ts`, `FamilyResultsViewer.tsx`.
- **Kısmen (6):** `nodeRegistry.ts` (126-192 okunmadı), `BridgeDefinitionWorkspace.tsx` (1-144), `graphFamilyPresentation.ts` (1-80), `PierFamiliesPanel.tsx` (1-40), `MaterialsPanel.tsx` (1-60), `vitest-errors.txt` (1-30).
- **Yalnızca Grep:** `GraphWorkspace.tsx`, `EngineeringSchematics.tsx`, `EngineeringNodeShell.tsx`, `EngineeringNodeInspector.tsx`, `NodeInspector.tsx`, `reactFlowAdapter.ts`, `graphEngine.ts`, `ProjectPanel.tsx`, `ParamSweepCard.tsx`, `PreferredSpanPanel.tsx`, `SystemAssemblyPanel.tsx`, `GirderLibraryPanel.tsx`, `FamilyTablesWorkspace.tsx`, `PrecastGirderFamilyPreview.tsx`, `PrecastGirderSectionProperties.tsx`, `TerrainMesh.tsx`, `api/*Service.ts`, `recentProjects.ts`, `App.css`, `index.css`, test başlıkları.
- **İncelenmeyen:** kalan ~252 metin dosyası (code fazında).
- **Atlanan:** 19 ikili + 19 büyük boyutlu (görseller).
- **Yalnızca bağlam:** `.claude/*` workflow/config/context, `CLAUDE.md`, `docs/architecture.md` (1-160, 2395-2795), `docs/roadmap.md` (Grep, 1684-1691), `docs/kopruq-data-architecture.md`.
- Ajan shell çalıştırmadı; Grep sayımları araç çıktısıdır. Hiçbir dosya değiştirilmedi.
