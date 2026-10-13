# Plan: g4 (G4 grubu: açık kalan frontend mimari bulguları; A-04, A-08, A-11, A-12, A-13, A-14, A-15, A-16; A-03/A-05/A-06/A-10 açık mühendislik maddeleri)

Durum: READY. Kullanıcı tüm yazılım sorularında önerilen seçenekleri seçti; kararlar §9'da K1–K9. Mühendislik maddeleri E1–E4 planlanmadı, dokümanda açık madde olarak kalır.

Kaynak: `docs/reviews/2026-10-11T14-19-35Z/architecture.md:89-166`, `report.md:21-34,204-220`. Önceki işler: `docs/features/{frontend-remediation,frontend-data-integrity,g2,g3}/{plan,implementation}.md`, `docs/architecture.md:2444-2493,3120-3144`, `AGENTS.md:678-683,814-822,1272-1278`. Yollar aksi belirtilmedikçe `frontend/src/` altında. Satır numaraları planlama anındaki koda aittir (HEAD `a1e1684`).

## 1. Amaç ve kapsam dışı
**Amaç:** Açık kalan mekanik ve mimari bulguları kapatmak. Davranış ya değişmez ya da yalnızca K5'te onaylanan hata düzeltmeleri kadar değişir.
- **A-04:** Graph önizlemesi ile Run aynı hesap çekirdeğini kullanır; önizleme destekleyen tip listesi registry metadata'sından türetilir.
- **A-08:** Katman kuralı bir test ile zorlanır; `WorkspaceLayout` ve `generateValues` taşınır; `shared/project-file` ihlalleri izin listesinde kalır (ratchet).
- **A-11:** README, `index.css` yorumu, `docs/architecture.md`, `docs/roadmap.md` güncellenir.
- **A-12:** strict bayrakları ölçülür ve eşik kuralıyla kademeli açılır.
- **A-13:** 5 ölü öğe, dosya başına kanıt alındıktan sonra silinir.
- **A-14:** CSS ölçülür, sonra bayt ve hash özdeş mekanik bölme (C1) yapılır.
- **A-15:** Mojibake UTF-8'e düzeltilir; `.editorconfig` ve gerileme testi eklenir.
- **A-16:** Ignore kaydı eklenir, AGENTS.md düzeltilir.

**Kesin kapsam dışı:** Backend, REST, yeni npm bağımlılığı, `package.json`, `package-lock.json`; localStorage anahtarı, `.kopruq` yerleşimi, `schemaVersion`; mühendislik sabiti/birim/eşik/formül değişikliği; A-02 (`no` → `id`); A-03, A-05, A-06, A-10 kod değişikliği (E1–E4); `!important` azaltma ve CSS'i feature'lara dağıtma; `shared/project-file` bölme (ayrı feature, önerilen ad g5); barrel kuralı R3'ün zorlanması (yalnızca sayılır); `nodeRegistry.ts`'nin `definitions/*` dosyalarına bölünmesi; diğer elle tutulan görsel listeler (`graph/ui/EngineeringNodeShell.tsx`, `graph/domain/nodeVisualThemes.ts`, logo eşlemesi, `FamilyResultsViewer.tsx`, `graph/ui/NodeLibrary.tsx` önek filtresi); `app/router.tsx` legacy dalları, `App.tsx:50` `summary` state'i, `WorkspacePage.tsx:16` `void setCrossSectionValues`; g3'te işaretlenen ham okumalar (`docs/architecture.md:3144`); git işlemleri (commit, `git rm`).

## 2. Bulguların güncel durumu
| ID | Durum | Kanıt ve kök neden |
|---|---|---|
| A-01 | DÜZELTİLMİŞ (g3) | `shared/project-file/projectDataContract.ts:80-84` `PROJECT_DATA_ENTRIES`; `projectModules.ts:75-84`. `windLoads` yalnızca React state'inde (`App.tsx:70`); g3'te işaretli, g4 dışı. |
| A-07 | Yazma yolları DÜZELTİLMİŞ | `materials/components/MaterialsPanel.tsx:45` `saveFamilyRecords`. Ham okumalar g4 dışı. |
| A-09 | DÜZELTİLMİŞ | `fetch(` ve `localhost:8080` yalnızca `shared/api/http.ts:8-9,58` ve testinde (Grep). |
| A-03 | GÜNCEL, mühendislik (E1) | Lx/Ly yuvarlaması iki yerde farklı: `foundation-families/model/service.ts:12,48` `toFixed(10)`, `graph/domain/foundationCandidates.ts:49-50` `toPrecision(12)`. B/D etiketleri ters: `graph/registry/nodeRegistry.ts:42-45` "Longitudinal Length (B)", `pier-families/model/service.ts:40-43` "B = Transverse". `shared/ui/generation.ts:4,7` 0,01'e yuvarlıyor. |
| A-04 | GÜNCEL | Ayrıntı tablonun altında. |
| A-05 | GÜNCEL, kısmen hafifletilmiş (E2) | `nodeRegistry.ts:73` `tf/bf/w`, `graph/domain/girderCandidates.ts:11` `Btf/Bbf/tw` bekliyor. Adaylar `INCOMPLETE` (`:28`; frontend-data-integrity ve g2). |
| A-06 | GÜNCEL, mühendislik (E3) | Kaynaksız değerler: `graph/domain/abutmentCandidates.ts:38,64-66`; `nodeRegistry.ts:94,221`; `loads/components/wind/WindLoadsPanel.tsx:14+` `WIND_DREF_M`; `loads/components/seismic/SeismicPanel.tsx:8-9`. |
| A-08 | GÜNCEL | shared → features: `shared/project-file/{projectFileService,projectDataContract,projectModules,projectFileTypes,useProjectFile,projectFileFixtures}.ts`. features → shared/project-file: 15 import (klasörü topluca `app/`'e taşımak ters ihlal üretir). features → app: `graph/ui/GraphWorkspace.tsx:4`, `family-tables/components/FamilyTablesWorkspace.tsx:11`. model → shared/ui: `pier-families/model/service.ts:1`, `pier-families/model/types.ts:1`, `bearing-families/model/service.ts:1`, `girder-library/model/variants.ts:1` (yeniden export kaynağı `shared/ui/ParamSweepCard.tsx:21-22`). |
| A-10 | GÜNCEL, mühendislik (E4) | `girder-library/model/variants.ts:6,10-19,25`: cm birimi ve `PG-H160` kimlik biçimi. |
| A-11 | KISMEN | `frontend/README.md:13-30,70-72`: ThemeToggle, Sidebar/TopBar, `pages/home`, "3 real backend calls". `index.css:106-107` yorumu var olmayan `ThemeToggle.tsx`'e işaret ediyor. Abutment, Span Arrangement ve Assembly düğümleri (`nodeRegistry.ts:29-39,79-97,222-247`) dokümanda yok. `docs/roadmap.md:1377` içinde U+FFFD var. |
| A-12 | GÜNCEL | `tsconfig.app.json` ve `tsconfig.node.json` `strict` içermiyor; `include: ["src"]` olduğu için testler de tip kontrolüne giriyor. |
| A-13 | GÜNCEL | §3.4 |
| A-14 | GÜNCEL | `app/styles/App.css`: 596 `!important`, 122 üst düzey yorum veya `@media`; kaskad sıraya bağlı (`:114`, `:3318` "must remain last"). |
| A-15 | KISMEN | Kalan bozuk karakterler: `app/workspaces/WorkspacePage.tsx:24,27`; `bridge-definition/components/BridgeDefinitionWorkspace.tsx:123,131,141,160,164,165,210,211,220,221`; `foundation-families/components/FoundationFamiliesPanel.tsx:80`; `family-tables/components/PrecastGirderFamilyPreview.tsx:27`; `MaterialsPanel.tsx:12` (yorum); `graph/ui/EngineeringNodeShell.tsx:86,155` (çift kodlama); `system-assembly/components/SystemAssemblyPanel.tsx:67`. Bilerek bırakılanlar: `project/model/projectWorkspace.ts:35-41` ve `projectWorkspace.test.ts:8-9` (eski birim etiketlerini tanıyan göç eşleştiricileri; değişirse kalıcılık uyumluluğu bozulur, AGENTS.md:1274). |
| A-16 | GÜNCEL | `frontend/vitest-errors.txt` git'te izleniyor ve ignore edilmiyor. `AGENTS.md:816` onu tanı artefaktı olarak anıyor; frontend-remediation `plan.md:88` eski ve güvenilmez olduğunu kaydediyor. |

**A-04 ayrıntı** (kod okumasına dayanıyor, T3 doğrulayacak):
- Abutment önizlemesi: `nodeRegistry.ts:342-343` var olmayan alanları okuyor (`Front_fh`, `Foun_fh`, `seiUValue`, `seiUUnit`) → `localLength(NaN, 'undefined')`; `getUnit` `undefined` döndürüyor (`graph/domain/quantities.ts:15`) ve `TypeError` oluşuyor. `graph/adapters/reactFlowAdapter.ts:56` yakalıyor, `:115` Run'dan önce `executionState: 'error'` gösteriyor. Bağlı geometri girişleri yok sayılıyor; executor (`:96`) doğru kullanıyor.
- Girder önizlemesi: `:324-325` span değerlerini birim dönüşümü olmadan ve kendi varsayılanlarıyla alıyor; executor `canonicalGirderLength` kullanıyor (`:76`).
- Superstructure önizlemesi: `:331` boş girder listesinde `[]` döndüren koruma.
- Malzeme: önizleme çözmüyor (`:292,302,311,323`); executor `services.resolveConcreteMaterial` kullanıyor (`:116,134,157`) — bilinçli fark, korunur.
- Elle tutulan liste: `reactFlowAdapter.ts:48`.

Araç zinciri: `build` = `tsc -b && vite build`, `test` = `vitest run`, `lint` = `oxlint` (`package.json:8-11`); CI yok; g3 sonunda 81 dosya / 713 test yeşil (geçerli olan T0 çıktısı).

## 3. Tasarım

### 3.1 A-04: tek hesap çekirdeği (K5)
- `NodeDefinition`'a isteğe bağlı, senkron `preview?: (ctx: { node: KopruqNode; inputs: Record<string, GraphValue> }) => Record<string, GraphValue>` eklenir.
- Malzeme kullanan düğümler (pier, cap, foundation): executor gövdesi `compute(node, inputs, material)` olarak ayrılır; executor malzemeyi `await` ile çözüp `compute` çağırır; `preview` bugünkü çözülmemiş malzemeyle (`{properties:{}}`) aynı `compute`'u çağırır (D3).
- Senkron düğümler (girder, abutment, span arrangement, bearing, superstructure, `input.range`, math): `preview` executor ile aynı fonksiyonu çağırır.
- Superstructure boş girder durumu: executor boş girder listesinde `[]` dışında bir sonuç veriyorsa `:331` koruması yalnızca `preview` içinde, belgelenmiş ön koşul olarak kalır.
- `previewDesignOutput`: imza değişmez; gövde `getNodeDefinition(node.type)?.preview?.({node, inputs})[portId]`; tanımsız port `undefined`.
- Değişmeyenler: `previewPierCapStatistics`, `previewFoundationStatistics`, `previewBearingStatistics`.
- `reactFlowAdapter.ts:48`: literal tip listesi yerine `!getNodeDefinition(node.type)?.preview`; bir test preview tanımlı tip kümesini bugünkü listeyle birebir sabitler; `structural.assembly` bu kümede yok.
- Korunanlar: executor çıktıları golden ile bayt-özdeş; Node SUCCESS/DIRTY, `graph/engine/graphEngine.ts:94`, fingerprint, `graphRunValidity`, parametre şemaları, varsayılanlar değişmez.
- Onaylı değişiklikler: D1 girder önizlemesinde span değerleri ve eksik parametre semantiği executor ile aynı olur; D2 abutment önizlemesi doğru alanları ve bağlı girişleri kullanır, Run öncesi hata durumu kalkar. D4: dosya bölme ertelendi.

### 3.2 A-08: zorlanan katman kuralı (K3, K4)
Yeni test `test/architecture/layerRules.test.ts`:
- Kaynak `import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })` ile okunur; `import … from`, `export … from`, `import('…')` belirteçleri ayrıştırılır; göreli yol çözülür ve dosya `app | pages | features/<x> | shared | test` katmanına atanır; yalnızca üretim dosyaları denetlenir (`*.test.*` ve `test/**` muaf).
- Kurallar: **R1** `shared/**` → `app/`, `pages/`, `features/` import etmez; **R2** `features/**` → `app/`, `pages/` import etmez; **R4** `features/*/model/**` ve `features/graph/domain/**` → `shared/ui/**` import etmez; **R3** (feature'lar arası barrel atlama) zorlanmaz, yalnızca sayılır ve raporlanır.
- İzin listesi testte açık `{from, to}` dizisi; listede olmayan ihlal testi kırar, bayat kayıt da kırar. İçerik yalnızca `shared/project-file/*` → `features/*` kenarları (g5'e kadar); T0 başka R4 ihlali bulursa implementer bunları listeye ekler ve raporlar.
- Taşımalar: `app/layout/WorkspaceLayout.tsx` → `shared/ui/WorkspaceLayout.tsx` (yalnızca react ve lucide import ediyor; `WorkspacePage.tsx:11` ve `GraphWorkspace.tsx:4` güncellenir). `shared/ui/generation.ts` → `shared/lib/parameterSweep.ts` (içerik aynen); `shared/ui/DesignSystemUi.tsx:2` ve `ParamSweepCard.tsx:3,21-22` yeni yerden import eder, UI tüketicileri için yeniden export korunur; dört model dosyası `shared/lib/parameterSweep` kullanır; yuvarlama semantiği değişmez.

### 3.3 A-15: kodlama (K9)
- Bozuk dizi cp1252 → UTF-8 tersine çözülür: `â€”`→`—`, `â€“`→`–`, `Â·`→`·`, `â€¦`→`…`, `Ä±`→`ı`; çift kodlama iki kez çözülür (`Ã¢â‚¬Â¦`→`…`). Kayıplı `EngineeringNodeShell.tsx:86` `'Ã¢â‚¬â€'` → `'—'`.
- `projectWorkspace.ts` ve testindeki eşleştiricilere dokunulmaz.
- Kök `.editorconfig`: `root = true`; `[*]` için `charset = utf-8`.
- Yeni test `test/architecture/sourceEncoding.test.ts`: aynı glob ile `Â`, `â€`, `Ã¢`, `Ä±` arar; izin listesi yalnızca `features/project/model/projectWorkspace.ts` ve testi.
- `docs/roadmap.md:1377` U+FFFD yerine komşu başlıklarla tutarlı ` - `.

### 3.4 A-13: kanıtlı silme (K2)
Planlama anındaki Grep'e göre kendi tanımları dışında statik import, `import()` veya test referansı olmayan öğeler:
- `features/family-tables/components/FamilyTablesWorkspace.tsx` (silinince R2 ihlallerinden biri kalkar)
- `pages/home/HomePanel.tsx` (silinince `pages/` boşalır)
- `app/layout/Sidebar.tsx`
- `app/layout/TopBar.tsx`
- `features/layout-design-space/` (`index.ts`, `components/LayoutDesignSpacePanel.tsx`; barrel yalnızca `sections.ts:24-25` yorumunda geçiyor)

Silmeden önce her dosya için ad ve yol `src/`, `index.html`, `vite.config.ts`, testler ve `AGENTS.md` içinde Grep'lenir, sonuç raporlanır; referans çıkan dosya silinmez. Kalanlar: `router.tsx` dalları (sondaki `/` ile yazılan yollar `App.tsx:161`'deki tam eşleşmeyi atlar ve bu dallara ulaşır), `summary`, `void setCrossSectionValues`, `BigMenuPanel`, `PlaceholderPanel`, `navigation/sections.ts`.

### 3.5 A-12: ölçüm ve eşik kuralı (K6)
- Ölçüm: her bayrak için `npx tsc -p tsconfig.app.json --noEmit --<flag>` (ve `tsconfig.node.json`); hata ve dosya sayısı kaydedilir. Sıra: `alwaysStrict`, `noImplicitThis`, `strictBindCallApply`, `strictFunctionTypes`, `useUnknownInCatchVariables`, `noImplicitAny`, `strictNullChecks`, `strictPropertyInitialization` (sonuncusu `strictNullChecks` ile birlikte).
- Karar kuralı: 0 hata → aç; 1–25 hata ve en fazla 10 dosya → tip düzeyinde, runtime'ı koruyan düzeltmelerle (anotasyon, mevcut varsayımı yansıtan daraltma, davranışı koruyan `as`/`!`) aç; aksi halde açma, sayıları raporla, NEEDS_PLAN işaretle ve sıradaki bayrağa geç.
- Yasaklar: yeni sayısal varsayılan (`?? 0` gibi), yeni fallback, değişen hata mesajı. Ek durma: `graph/domain/*` veya `*/model/service.ts` içinde tip dışı değişiklik gerekiyorsa bayrak açılmaz.
- Tüm bayraklar açılırsa yerlerine `"strict": true`; `tsconfig.node.json` 0 hata verirse doğrudan `strict: true`.

### 3.6 A-14: ölçüm ve C1 (K7)
- Ölçüm: bayt/satır, `!important` sayısı, yorum başlıkları ve `@media` sayısı, önek bazında kural sayısı (`.spn-`, `.family-`, `.graph`/`react-flow`, `.kopruq-node`, diğer), build sonrası `dist/assets/*.css` sha256.
- C1: bölme noktaları yalnızca parantez derinliği 0 olan ve üst düzey yorum başlığından hemen önceki yerler; sonuç 10–25 bitişik parça `app/styles/app/NN-<alan>.css`; `App.css` yalnızca aynı sıradaki `@import './app/NN-….css';` satırlarını içerir; kural metni değişmez.
- Doğrulama: parçaların birleşimi orijinalle bayt-özdeş (scratch'te karşılaştırılır); C1'den hemen önce ve sonra alınan dist CSS sha256 aynı; `!important` sayısı 596 kalır.
- Durma: fark çıkarsa C1 geri alınır (`App.css` birleştirilmiş içerikle geri yazılır) ve NEEDS_PLAN raporlanır.

### 3.7 A-16 ve A-11 (K8)
- A-16: `frontend/.gitignore`'a `vitest-errors*.txt`; dosya içeriğine dokunulmaz; `AGENTS.md:816` "stale local diagnostic artifact; not a baseline; run a fresh `npm test`"; `git rm --cached frontend/vitest-errors.txt` kullanıcıya bırakılır.
- A-11: README'den ölü iddialar (ThemeToggle, Sidebar/TopBar, `pages/home`) kaldırılır; HTTP katmanı (`shared/api/http.ts`, `VITE_API_BASE`), katman kuralı ve arch testi anlatılır; `index.css:106-107` yorumu düzeltilir; `docs/architecture.md` ve `docs/roadmap.md`'ye "G4 track" (bulgu durum tablosu, K1–K9, E1–E4 açık maddeler, g5 notu); Abutment, Span Arrangement ve Assembly düğümleri yalnızca kodun yaptığı şekliyle ve "engineer approval not documented (H-01)" notuyla belgelenir; `AGENTS.md:678-683`'teki bayat "working tree changes" notu raporlanır, değiştirilmez.

## 4. Alternatifler
- Önizlemeyi executor'ın kendisiyle çalıştırmak: executor async ve backend çağırıyor, önizleme render içinde senkron olmalı → ortak senkron `compute`.
- Yalnızca alan adlarını yamalamak: iki ayrı kod yolu kalır → reddedildi.
- oxlint `no-restricted-imports`: göreli desen/override desteği doğrulanamadı, uyarılar exit 0 verir → Vitest testi.
- `project-file`'ı tümüyle `app/`'e taşımak: features → app ihlali doğurur → bölme g5'e bırakıldı.
- Tek seferde `strict: true`: hata sayısı bilinmiyor → kademeli açma.
- CSS'i hemen feature'lara dağıtmak: kaskad sıraya bağlı, görsel sözleşmeler var → bayt-özdeş C1.

## 5. Sıralı görevler
Komutlar `frontend/` içinde (PowerShell'de `npm.cmd`/`npx.cmd`). Davranış değiştiren görevlerde test önce yazılır ve kırmızı çıktısı kaydedilir. `node_modules` yoksa iş durur. Implementer git işlemi yapmaz.

| Milestone | Görevler | Bağımlılık |
|---|---|---|
| M0 | T0 | — |
| M1 (hijyen) | T1, T2 | M0 |
| M2 (A-04) | T3, T4 | M0 |
| M3 (A-13 + A-08) | T5, T6 | M0, M2 |
| M4 (A-12) | T7 | M3; kendi durma kuralıyla atlanabilir |
| M5 (A-14) | T8 | M0; kendi durma kuralıyla atlanabilir |
| Kapanış | T9 | hepsi |

Sıra: M0 → M1 → M2 → M3 → M4 → M5 → T9.

- **T0 Baseline ve ölçüm (kod yok):** build/test/lint exit kodları, sayılar, başarısız test adları, dosya bazında oxlint uyarıları; A-12 bayrak tablosu (§3.5); A-14 ölçümleri ve hash'leri (§3.6); katman ihlal envanteri (R1, R2, R4 kenarları, R3 sayısı); A-13 Grep kanıt tablosu; mojibake listesi.
- **T1 A-16 + A-15 (bağ: T0):** `frontend/.gitignore`, `AGENTS.md:816`, kök `.editorconfig`, §2'deki 9 kaynak dosya, `docs/roadmap.md:1377`. Yeni `test/architecture/sourceEncoding.test.ts` önce kırmızı görülür. Bileşen testleri yeşil kalır (özellikle `graph/ui/EngineeringNodeShell.test.tsx:152` `'2000.00…5000.00 kN/m'`).
- **T2 A-11 ön hazırlık (bağ: T0):** `index.css:106-107` yorumu.
- **T3 A-04 karakterizasyon (bağ: T0, kod değişikliği yok):** Yeni `graph/registry/previewExecutorParity.test.ts`. Matris: tipler (5 pier, 2 cap, 2 foundation, bearing, 2 girder, superstructure, span arrangement, abutment, `input.range`, 4 math) × birim `m` ve `mm` × giriş durumları ((a) varsayılan parametre ve `inputs: {}`; (b) bağlı giriş fixture'ı: girder/superstructure/bearing için gerçek executor çıktısı zincirlenir, geometri portları `length[]` listeleriyle beslenir). Golden: services'siz `await definition.executor({node, inputs})` çıktıları. Parite: bugünkü beklenen farklar `it.fails` ile işaretlenir (girder `mm` span'leri, abutment, varsa superstructure boş girder). Adapter: abutment düğümünün Run öncesi `'error'` durumu kaydedilir.
- **T4 A-04 birleştirme (bağ: T3):** `nodeRegistry.ts` (§3.1), `reactFlowAdapter.ts:48`. Golden çıktılar aynı kalır; parite testleri yeşile döner; tip kümesi testi yazılır; mevcut testler yeşil (`nodeRegistry.test.ts`, `reactFlowAdapter.test.ts`, `EngineeringNodeInspector.test.tsx`, `NodeInspector.test.tsx`, `abutmentCandidates.test.ts`, `EngineeringNodeShell.test.tsx`); abutment adapter testi yeni sözleşmeye geçer (upstream yokken `[]`, durum `idle`, hata yok).
- **T5 A-13 (bağ: T0):** §3.4; önce dosya başına Grep kanıtı, sonra silme, sonra build ve test.
- **T6 A-08 (bağ: T5):** taşımalar `shared/ui/WorkspaceLayout.tsx` ve `shared/lib/parameterSweep.ts` (importlarla); yeni `test/architecture/layerRules.test.ts` önce kırmızı görülür (R2 `GraphWorkspace` ve R4 ihlalleri); `shared/ui/ParamSweepCard.test.ts` yeşil kalır.
- **T7 A-12 (bağ: T6):** `tsconfig.app.json`, `tsconfig.node.json`; ölçüm T6'dan sonra yeniden alınır ve §3.5 kuralı uygulanır.
- **T8 A-14 C1 (bağ: T0):** §3.6; hash karşılaştırması C1'den hemen önce yapılan build'e göre.
- **T9 Kapanış (bağ: hepsi):** README, `docs/architecture.md`, `docs/roadmap.md` (§3.7); final build/test/lint, baseline/final tablosu; kullanıcıya bırakılan adım `git rm --cached`.

## 6. Kabul kriterleri
- **AC1** T0 çıktıları kayıtlı: exit kodları, sayılar, başarısız adlar, dosya bazında lint, bayrak tablosu, CSS istatistik ve hash'leri, katman envanteri (R3 sayısı dahil), A-13 kanıtı.
- **AC2** Mojibake Grep'i yalnızca `projectWorkspace.ts:35-41` ve testini bulur; `sourceEncoding.test.ts` yeşil, yeni bozuk dizi eklenince kırmızı; UI'da `—`, `·`, `…`, `–` görünür, `EngineeringNodeShell.tsx:86` `'—'` gösterir; `.editorconfig` `charset = utf-8` içerir; `roadmap.md`'de U+FFFD yok.
- **AC3** `frontend/.gitignore` `vitest-errors*.txt` içerir; `vitest-errors.txt` içeriği değişmemiş; `AGENTS.md:816` güncel; rapor `git rm --cached` adımını kullanıcıya bırakır.
- **AC4** T3 matrisinin tamamında executor golden çıktıları refactor öncesi ve sonrası aynı.
- **AC5** services'siz her hücrede `previewDesignOutput(node, port, inputs)` executor `[port]` ile deep-equal; tek istisna belgelenmiş superstructure ön koşulu.
- **AC6** `mm` projede steel ve precast önizleme adaylarının `preferredSpan` ve `applicableSpanRange` değerleri executor ile aynı (steel varsayılanı: 60 ve {30, 90} m).
- **AC7** Abutment önizlemesi `TypeError` üretmez; upstream yokken `[]` döner ve Run öncesi durum `idle`; bağlı fixture'da sonuç executor ile aynı.
- **AC8** `reactFlowAdapter.ts`'te preview tip literal listesi yok; preview tanımlı tip kümesi önceki listeyle aynı; önizlemede malzeme çözülmüyor (D3).
- **AC9** A-13 kanıt tablosu raporda; 5 öğe yok; build ve test yeşil; router dalları, `summary` ve `void setCrossSectionValues` duruyor.
- **AC10** `layerRules.test.ts` R1, R2, R4'ü zorlar; izin listesi yalnızca `shared/project-file/*` → `features/*` kenarlarını (ve raporlanan T0 R4 istisnalarını) içerir; yeni ihlal veya bayat kayıt testi kırar; R3 yalnızca sayılır; `GraphWorkspace.tsx` `shared/ui/WorkspaceLayout`'u kullanır; model dosyaları `shared/ui` import etmez; `generateValues` çıktısı değişmez.
- **AC11** Her strict bayrağı için iki sonuçtan biri: açıldı (build yeşil, düzeltmeler tip düzeyinde ve listelenmiş) ya da açılmadı (sayılarla NEEDS_PLAN); kural her bayrakta uygulanmış.
- **AC12** A-14: C1 yapıldı (`App.css` yalnızca sıralı `@import`; birleşim bayt-özdeş; dist CSS sha256 aynı; `!important` 596) ya da geri alındı ve gerekçesi kayıtlı.
- **AC13** Dokümanlar güncel: README'de ölü iddia yok, `index.css` yorumu düzgün, G4 track, K1–K9, E1–E4 açık maddeleri, H-01 notu ve g5 notu mevcut.
- **AC14** `git diff --stat` yalnızca `frontend/src`, `frontend/.gitignore`, `frontend/README.md`, `frontend/tsconfig*.json`, `docs/`, `.editorconfig`, `AGENTS.md`; `package*.json` ve `backend/` boş; domain dosyalarının sayısal sabitleri ve `nodeRegistry.ts` varsayılanları değişmemiş.
- **AC15** Final build ve lint exit 0, değişen dosyalarda yeni oxlint uyarısı yok; `npm test` başarısız kümesi T0 kümesinin alt kümesi, yeni testler yeşil.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | T0 komutları; `npx tsc -p tsconfig.app.json --noEmit --<flag>` | rapor tabloları |
| AC2 | `npm test -- src/test/architecture/sourceEncoding.test.ts`; Grep `Â\|â€\|Ã¢\|Ä±` | yeşil; yalnızca izinli dosyalar |
| AC3 | dosya incelemesi; koordinatör `git status` | ignore satırı var; dosya diff'i yok |
| AC4–AC7 | `npm test -- src/features/graph/registry src/features/graph/adapters src/features/graph/ui src/features/graph/domain` | yeşil |
| AC8 | `reactFlowAdapter.ts`'te `startsWith('substructure.` Grep'i; tip kümesi testi | literal yok; yeşil |
| AC9 | rapordaki Grep tablosu; `npm run build`; `npm test` | referans yok; yeşil |
| AC10 | `npm test -- src/test/architecture/layerRules.test.ts src/shared/ui` | yeşil |
| AC11 | `npm run build` + tsconfig diff | exit 0 |
| AC12 | scratch'te birleşim karşılaştırması; önce/sonra `Get-FileHash dist/assets/*.css`; Grep `!important` | eşit; 596 |
| AC13 | doküman diff incelemesi | güncel |
| AC14 | koordinatör `git diff --stat` ve dosya diff'leri | kapsam içinde |
| AC15 | `npm run build`; `npm test`; `npm run lint` | 0 / alt küme / 0 |

Bilinmeyenler: `import.meta.glob` `?raw` eager okumanın vitest/jsdom'da çalıştığı varsayılıyor (çalışmazsa implementer durur ve raporlar; global Node tipi eklemez); strict hata sayıları ve CSS istatistikleri T0'a kadar bilinmiyor. Elle kontrol (Chromium): abutment düğümü Run öncesi kırmızı değil; `mm` projede girder Inspector span değerleri doğru; C1 sonrası Family, Graph ve Project ekranları görsel olarak aynı; `—` ve `·` doğru görünüyor.

## 8. Riskler
- **Korunan sözleşmeler (AGENTS.md:1274):** executor değişmez (AC4); görünür değişiklikler yalnızca onaylı D1 ve D2. Abutment önizlemesi artık kaynaksız A-06 eşiklerini Run'dan önce gösterir; kural yeni değil, Run zaten uyguluyor.
- **Katman testi kırılganlığı:** çok satırlı importlar için fixture kapsamı gerekir; izin listesi büyümemeli.
- **Taşımalar:** yalnızca yol değişir; g3 sözleşme dosyalarına dokunulmaz; yeniden exportlar korunur.
- **Strict düzeltmeleri:** davranışa sızma riski; §3.5 yasakları ve durma koşulu sınırlar.
- **CSS:** `@import` inlining veya minify farkı çıkabilir; hash karşılaştırması yakalar, geri alma tanımlı; "must remain last" kuralları sıra korunarak korunur.
- **Silme:** dosyalar git geçmişinde kalır; geri almak için geri yüklenir.
- **A-16:** `.gitignore` izlenen bir dosyayı etkilemez; untrack kullanıcı adımı.
- **Veri ve güvenlik:** kalıcı veri, anahtar ve dosya biçimi değişmez; kimlik verisi yok; her milestone kendi dosya kümesiyle geri alınabilir.

## 9. Varsayımlar, kararlar ve açık mühendislik maddeleri
**Varsayımlar (doğrulanmadı):** abutment önizlemesi bugün fırlatıyor (T3 doğrular); superstructure executor'ının boş girder davranışı; `import.meta.glob` `?raw` desteği; T0 testleri yeşil (g3 sonu 713/713).

**Kullanıcı kararları (bağlayıcı):**
- **K1:** g4 = M0–M5 + T9; M4 ve M5 kendi durma kurallarıyla atlanabilir.
- **K2:** §3.4'teki 5 öğe dosya başına Grep kanıtıyla silinir; router dalları, `summary` ve `void setCrossSectionValues` kalır.
- **K3:** arch testi eklenir; `WorkspaceLayout` ve `generateValues` taşınır; `project-file` ihlalleri izin listesinde kalır, bölme ayrı feature (g5).
- **K4:** R3 barrel zorlanmaz, yalnızca sayılır.
- **K5:** D1 evet, D2 evet; D3 önizleme malzeme çözmez (bilinçli fark korunur); D4 dosya bölme ertelendi.
- **K6:** bayrak başına 0 hata → aç; 1–25 hata ve en fazla 10 dosya → tip düzeyinde düzelt ve aç; aksi halde atla (NEEDS_PLAN).
- **K7:** yalnızca bayt ve hash özdeş C1; `!important`'a dokunulmaz.
- **K8:** `vitest-errors*.txt` → `frontend/.gitignore`; `AGENTS.md:816` güncellenir; `git rm --cached` kullanıcıda.
- **K9:** kayıplı mojibake → `'—'`.

**Açık mühendislik maddeleri (planlanmadı; T9'da dokümana yazılır):**
- **E1 (A-03):** (a) Pier B/D yönü: `nodeRegistry.ts:42-45` ile `pier-families/model/service.ts:40-43` ters; öneri AGENTS.md:1238 ve `docs/architecture.md:2708` ("B transverse") esas alınır. (b) Lx/Ly yuvarlaması: `toFixed(10)` mu `toPrecision(12)` mi? (c) Taramadaki 0,01 yuvarlama (H-03).
- **E2 (A-05):** Precast geometride geçerli anahtar adları `tf/bf/w` mi `Btf/Bbf/tw` mi; eşleme nerede yapılmalı (C-005-01 Wy formülü onayıyla birlikte).
- **E3 (A-06):** Kaynak, madde ve doğrulama örneği gereken değerler: seismic blok eşikleri 0,20 m ve 0,30 m; `seiU` 0,03 m; abutment varsayılanları `[1,1,1,3,5,1,2,18]` m; steel E = 210000 MPa, ν = 0,3, ρ = 7,85 t/m³, γ = 76,98 kN/m³; `WIND_DREF_M = 3`; ξ = %5, η = 1,00; `abutmentCandidates.ts:64` `Math.min(x, x)` (amaçlanan iki taraf neydi?).
- **E4 (A-10):** Girder library metre olarak mı saklanmalı (göç gerekir)? `PG-H160` kimlik biçimi korunacak mı?

READY
