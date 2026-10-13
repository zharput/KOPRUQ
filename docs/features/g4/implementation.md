# Implementation report: g4 (A-04, A-08, A-11, A-12, A-13, A-14, A-15, A-16)

Kaynak: feature-implementer el-teslim raporu. Koordinatör doğrulaması: `npm test` 84 dosya / 810 test geçti; `npm run build` başarılı; dist CSS sha256 baseline ile aynı (`4936a632b1ffe1bfb36cca27d4768458fc0caf85936802f5e1402bc1ff16fa2d`); `tsconfig.app.json`'da `"strict": true`; `npm run lint` 66 uyarı (rapordaki final ile aynı); `git status` yalnızca AC14 yollarında; `backend`, `frontend/package*.json`, `frontend/src/features/graph/domain` diff'i boş. Review yapılmadı.

**Sonuç: implemented.** T0–T9 tamam, AC1–AC15 karşılandı; M4 ve M5 durma koşulu tetiklenmeden tamamlandı; NEEDS_PLAN çıkan madde yok. A-03/A-05/A-06/A-10 (E1–E4) kodda değişmedi.

## T0 baseline → final (`frontend/`)
| | Baseline | Final |
|---|---|---|
| build | exit 0 | exit 0 |
| test | 81 dosya / 713 test | 84 dosya / 810 test, hepsi geçti |
| lint | exit 0, 81 uyarı | exit 0, 66 uyarı (yalnızca silinen `FamilyTablesWorkspace`'in 15 uyarısı kalktı) |
| dist CSS sha256 | `4936a632…16fa2d` | aynı |
| `tsc -b` | – | exit 0 |

Baseline ölçümleri:
- **Strict bayrakları:** `alwaysStrict`, `noImplicitThis`, `strictBindCallApply`, `strictFunctionTypes`, `useUnknownInCatchVariables`, `noImplicitAny`, `strictNullChecks`, `strictPropertyInitialization` ve `--strict` için hepsi 0 hata. Neden: TypeScript 6.0.3 `strict` varsayılanını true yapıyor; `--strict false` ile 11 hata çıkıyor, yani bayraklar fiilen zaten açıktı. Ölçümün çalıştığı `--noUncheckedIndexedAccess` (693 hata) ile doğrulandı.
- **CSS (App.css):** 325160 bayt, 4207 satır (CRLF), `!important` içeren 596 satır, 75 üst düzey yorum + 47 `@media`; dosya sha256 `8f5f9107…c53349`.
- **Katman envanteri:** R1 = 23 benzersiz kenar (hepsi `shared/project-file/*` → `features/*`); R2 = 2 (`FamilyTablesWorkspace` ve `GraphWorkspace` → `app/layout/WorkspaceLayout`); R4 = 5 (plandaki 4 + `family-registry/model/familySchemas.ts` → `shared/ui/generation`, taşımayla kalktı); R3 = 103 → 90.
- **A-13 Grep:** beş öğede statik import, `import()` veya test referansı yok (yalnızca yorum satırları ve kendi dosyaları).

## Yeni / silinen / değişen
**Yeni:** `.editorconfig`; `frontend/src/test/architecture/sourceEncoding.test.ts`, `layerRules.test.ts`; `features/graph/registry/previewExecutorParity.test.ts` (20 tip × {m, mm} × {default, connected}); `shared/lib/parameterSweep.ts` (eski `shared/ui/generation.ts` aynen); `shared/ui/WorkspaceLayout.tsx` (eski `app/layout/WorkspaceLayout.tsx` aynen); `app/styles/app/01…17-*.css` (App.css'in bayt-özdeş 17 dilimi).
**Silinen:** `features/family-tables/components/FamilyTablesWorkspace.tsx`; `pages/home/HomePanel.tsx` (`pages/` boşaldı); `app/layout/Sidebar.tsx`; `app/layout/TopBar.tsx`; `features/layout-design-space/` (index.ts + LayoutDesignSpacePanel.tsx); taşıma kaynakları `shared/ui/generation.ts` ve `app/layout/WorkspaceLayout.tsx`.
**Değişen:** `AGENTS.md:816`; `docs/architecture.md` (G4 track); `docs/roadmap.md` (U+FFFD → `-`, G4 bölümü); `frontend/.gitignore` (`vitest-errors*.txt`); `frontend/README.md`; `tsconfig.app.json` ve `tsconfig.node.json` (`"strict": true`); `src/index.css` yorumu; `App.css` (yalnızca başlık yorumu + 17 `@import`); `graph/registry/nodeRegistry.ts`, `graph/adapters/reactFlowAdapter.ts`; mojibake düzeltmeleri (`WorkspacePage`, `BridgeDefinitionWorkspace`, `PrecastGirderFamilyPreview`, `FoundationFamiliesPanel`, `EngineeringNodeShell`, `MaterialsPanel`, `SystemAssemblyPanel`); import yolu güncellemeleri (`bearing-families/model/service.ts`, `girder-library/model/variants.ts`, `pier-families/model/{service,types}.ts`, `family-registry/model/familySchemas.ts`, `shared/ui/{DesignSystemUi,ParamSweepCard}.tsx`, `graph/ui/GraphWorkspace.tsx`).

## Test-first kanıtı
- **sourceEncoding:** önce 12 bozuk diziyle (7 dosya) kırmızı, düzeltmeden sonra 4/4 yeşil.
- **A-04:** parite matrisi refactor'dan önce yazıldı; 10 hücre ve 1 adapter testi kırmızıydı (precast girder 4 hücre: aday `id`'de anahtar sırası farkı; steel girder `mm` 2 hücre: span 90000 yerine 90; abutment 4 hücre: `TypeError ... toCanonical`; adapter: abutment Run öncesi `'error'`). `it.fails` ile işaretlendi, refactor sonrası hepsi yeşile döndü ve işaretler kaldırıldı. "Abutment önizlemesi bugün fırlatıyor" varsayımı doğrulandı.
- **layerRules:** taşımalar kodda test yazılmadan önce yapıldı; R2/R4 kırmızısı testle değil T0 envanter betiğiyle gösterildi. Testin izin listesini boşaltan geçici probe'unda test kırıldı (23 R1 ihlali), probe silindi.

## Kabul kriterleri
AC1 baseline kayıtlı. AC2 mojibake yalnızca `projectWorkspace.ts` ve testinde; `sourceEncoding.test.ts` yeşil; `EngineeringNodeShell.tsx:86` `'—'`; `.editorconfig` utf-8; `roadmap.md`'de U+FFFD yok. AC3 ignore satırı var, `vitest-errors.txt` içeriği değişmedi, `AGENTS.md:816` güncel. AC4 executor golden hash'leri 80 hücrede (20 tip × 2 birim × 2 durum) refactor öncesiyle birebir. AC5 80 hücrede preview = executor (deep-equal; math default hücrelerinde ikisi de aynı hatayı fırlatıyor). AC6 `mm` projede steel `preferredSpan` 60, `applicableSpanRange` {30, 90}. AC7 abutment önizlemesi `TypeError` üretmiyor; upstream yokken `[]`, durum `idle`. AC8 `reactFlowAdapter.ts:48` literal liste yerine `!definition?.preview`; preview'lu tip kümesi eski 20'li listeyle birebir, `structural.assembly` yok; önizleme malzeme çözmüyor (D3). AC9 beş öğe yok; router dalları, `summary`, `void setCrossSectionValues` duruyor. AC10 `layerRules.test.ts` R1/R2/R4'ü zorluyor, izin listesi yalnızca 23 `shared/project-file/*` → `features/*` kenarı; R3 yalnızca sayılıyor. AC11 tüm bayraklar 0 hata, `"strict": true` eklendi, kaynakta düzeltme gerekmedi. AC12 C1: `App.css` başlık yorumu + 17 sıralı `@import`; birleşim bayt-özdeş; dist CSS sha256 aynı; `!important` satırı 596. AC13 README/index.css/docs güncel; G4 track, K1–K9, E1–E4, H-01 ve g5 notu mevcut. AC14 kapsam içinde (koordinatör doğruladı). AC15 build/lint exit 0, yeni uyarı yok, başarısız küme boş.

## Sapmalar ve notlar
- **D1 genişlemesi (davranış):** precast girder önizleme aday `id`'sinde anahtar sırası farkı vardı (`…-0.100000-0.280000-…` vs `…-0.280000-0.100000-…`); önizleme artık Run ile aynı `id`'yi üretiyor. Executor çıktısı değişmedi (golden). Planda ayrıca sayılmamıştı.
- **SystemAssemblyPanel:63-67:** çoklu kodlanmış kayıplı dizi, K9 mantığıyla `'—'` yapıldı; planda yalnızca `EngineeringNodeShell:86` için karar vardı → onay önerilir.
- `reactFlowAdapter.ts:89-95` civarındaki `startsWith('substructure.…')` çağrıları tip listesi değil, tip başına preview seçimi; plan yalnızca `:48`'i hedefliyordu, dokunulmadı. Kaba `startsWith('substructure.` taraması hâlâ eşleşir.
- Parite matrisinde golden hash'ler satır içi tabloda (cyrb53); Node tipi eklenmedi. R3 sayısı testte yalnızca değişkende hesaplanıyor, çıktıya yazılmıyor (90 değeri bu rapordan okunur).
- Dokunulmayan açık maddeler: A-03 (E1), A-05 (E2), A-06 (E3), A-10 (E4); `AGENTS.md:678-683` bayat notu değiştirilmedi.
- `roadmap.md` ve bazı `.tsx` dosyalarında `git diff` "LF will be replaced by CRLF" uyarısı veriyor; orijinal karışık satır sonları korundu.

## Kullanıcıya kalan adımlar
- `git rm --cached frontend/vitest-errors.txt` (ignore satırı ekli, dosya hâlâ izleniyor).
- Yeni dosyaların izlenmeye eklenmesi (commit kullanıcıda): `.editorconfig`, `frontend/src/test/architecture/`, `frontend/src/features/graph/registry/previewExecutorParity.test.ts`, `frontend/src/shared/lib/parameterSweep.ts`, `frontend/src/shared/ui/WorkspaceLayout.tsx`, `frontend/src/app/styles/app/`.
- Chromium kontrolleri: abutment düğümü Run öncesi kırmızı değil; `mm` projede girder Inspector span değerleri doğru; CSS bölünmesinden sonra Family, Graph ve Project ekranları görsel olarak aynı; `—`, `·`, `…` doğru görünüyor.

## Takip onarımları (review P3-1..P3-6, plan dışı, kullanıcı isteğiyle; koordinatör doğrulamasıyla)
`review.md` 1. tur CHANGES_REQUESTED bulgularını kullanıcı açık isteğiyle `refactor-implementer` kapattı (feature planı/state'i dışında):
- **P3-1:** Superstructure önizlemesine eski koruma geri kondu (`nodeRegistry.ts`: `superstructureDefinition.preview` — girder çözümlenemiyorsa `{candidates: []}`, aksi halde executor). Executor değişmedi (golden aynı). Parite kuralının belgelenmiş tek istisnası; 4 yeni test.
- **P3-2:** pier/cap/foundation malzeme çözücü yolu için stub servislerle 15 yeni test (üretim kodu değişmedi; davranış farkı bulunmadı).
- **P3-3:** `vitest-errors.txt` index'ten çıkarılmış (staged silme, dosya diskte); kullanıcı yapmış görünüyor; `docs/architecture.md` A-16 ve `docs/roadmap.md` cümleleri düzeltildi. Bu raporun "Kullanıcıya kalan adımlar" bölümündeki `git rm --cached` adımı tamamlanmış sayılır.
- **P3-4:** silinen Sidebar/TopBar/HomePanel/LayoutDesignSpacePanel dosyalarına atıf yapan 9 bayat yorum düzeltildi (yalnızca yorumlar).
- **P3-5:** `frontend/README.md` TanStack Query listesi grep kanıtıyla tamamlandı; kapsam iddiası daraltıldı.
- **P3-6:** `sourceEncoding.test.ts` izin listesi artık her dosyada işaretçinin hâlâ bulunduğunu da doğruluyor (`findStaleAllowEntries` + sentetik fixture).
Sonuç (koordinatör yeniden çalıştırdı): `npm test` 84 dosya / 830 test geçti, `npm run build` başarılı, dist CSS sha256 baseline ile aynı, lint 66 uyarı (baseline ile aynı).
