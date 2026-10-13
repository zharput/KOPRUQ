# Implementation report: g5 (A-08b, `shared/project-file` bölünmesi)

Kaynak: feature-implementer el-teslim raporu. Koordinatör doğrulaması: `npm test` 87 dosya / 853 test geçti; `npm run build` başarılı; dist CSS sha256 baseline ile aynı (`4936a632b1ffe1bfb36cca27d4768458fc0caf85936802f5e1402bc1ff16fa2d`); `npm run lint` 66 uyarı (baseline ile aynı); `projectDataEvents.ts` ve `projectFileValidation.ts` HEAD ile sha256 özdeş; `recentProjects.ts`, `projectFileFixtures.ts`, `projectModulesRoundTrip.test.ts`, `projectModules.test.ts`, `useProjectFile.test.tsx` HEAD'e göre `app/project-file` altında içerik özdeş (CR satır sonları yok sayılarak sha256); `shared/project-file` altında yalnızca 4 üretim + 2 test dosyası kaldı; `ALLOWED_VIOLATIONS = []`; `backend`, `package*.json`, CSS diff'i boş. Review yapılmadı.

**Sonuç: implemented.** T0–T7 tamam, AC1–AC13 karşılandı. Manuel/Chromium kontrolleri yapılmadı.

## Baseline → final (`frontend/`)
| Ölçüm | Baseline | Final |
|---|---|---|
| `npm run build` | exit 0 | exit 0 |
| `npm test` | 84 dosya / 830 test | 87 dosya / 853 test (+23: store 9 + hook 5 + registry 5 + layerRules 4) |
| `npm run lint` | 66 uyarı, exit 0 | 66 uyarı, exit 0 |
| dist CSS sha256 | `4936a632…16fa2d` | aynı (`sha256sum dist/assets/*.css`) |
| R1 | 23 | 0 |
| R2 | 0 | 0 |
| R4 | 0 | 0 |
| R3 | 90 | 90 (Δ = 0); `npx vitest run src/test/architecture/layerRules.test.ts --reporter=verbose --silent=false --disableConsoleIntercept` ile `[layer rules]` satırından okundu |

## Dosyalar
**Yeni (shared):** `shared/project-file/projectModuleStore.ts` (`createProjectModule`, `ProjectModule`, `PROJECT_MODULE_CHANGED_EVENT`; `createModule` gövdesi aynen), `useProjectModule.ts` (yeniden yazıldı: `useProjectModule<T>(module, fallback: NoInfer<NonNullable<T>>)`, önbellek `module.id` ile), `projectModuleStore.test.ts` (9 test), `useProjectModule.test.tsx` (5 test).
**Yeni (feature tanımları):** `features/family-registry/model/girderLibraryProjectModule.ts` + `features/family-registry/index.ts` (yeni en küçük barrel, yalnızca `GIRDER_LIBRARY_MODULE`); `features/preferred-span/model/preferredSpanRulesProjectModule.ts` (+ `preferred-span/index.ts`'e 1 export); `features/loads/model/loadsProjectModules.ts` (5 modül, loads barrel'ına eklenmedi); `features/loads/model/windTypes.ts` (`WindResult`, `WindCalculationSnapshot` aynen); `features/superstructure-families/model/crossSectionProjectModule.ts` (barrel'a eklenmedi). id, anahtar, zod şeması, özel write/reset (`girderLibrary` → `savePrecastGirderDefinition`) ve `const number = z.number()` eski `projectModules.ts`'ten kopyalandı.
**Yeni (app):** `app/project-file/projectModules.ts` (kayıt defteri: aynı sıra, feature'lardaki aynı nesne örnekleri, `PROJECT_MODULE_IDS`/`PROJECT_MODULE_LABELS` aynen; `ProjectModuleValue` kaldırıldı; `PROJECT_MODULE_CHANGED_EVENT` yeniden export edilmiyor), `projectModuleRegistry.test.ts` (5 test: id'ler, id eşleşmesi, 8 anahtar, `toBe` ile aynı örnek, etiketler).
**Taşınan (shared/project-file → app/project-file):** bayt-özdeş: `recentProjects.ts` (CRLF korundu, Türkçe metin), `projectFileFixtures.ts`, `projectFileService.test.ts`, `projectFileRealDefaults.test.tsx`, `recentProjects.test.ts`, `useProjectFile.test.tsx`, `projectModulesRoundTrip.test.ts`, `projectModules.test.ts`; yalnızca import satırı değişen: `projectDataContract.ts` (`:10` iki satıra bölündü), `projectFileService.ts`, `useProjectFile.ts`, `projectDataContract.test.ts`; bölünen: `projectFileTypes.ts` (wind tipleri `windTypes`'a, re-export yok).
**Silinen:** `shared/project-file/` altında `projectModules.ts`, `projectFileTypes.ts`, `projectDataContract.ts`, `projectFileService.ts`, `useProjectFile.ts`, `recentProjects.ts`, `projectFileFixtures.ts` ve 7 test dosyası (silmeden önce kopyalar doğrulandı).
**Değişmeyen:** `projectDataEvents.ts` (`c79a0079…`) ve `projectFileValidation.ts` (`4e798651…`) hash'leri aynı.
**Import/çağrı güncellenen:** `PreferredSpanPanel.tsx`, `BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx` (barrel üzerinden); `SelfWeightPermanent.tsx`, `SeismicPanel.tsx`, `UniformTemperaturePanel.tsx`, `TrafficLoadsPanel.tsx`, `WindLoadsPanel.tsx`, `WindLoadsPanel.test.tsx`, `LoadsPanel.tsx`, `windLoadsService.ts`; `App.tsx`, `App.test.tsx`, `WorkspacePage.tsx`, `TopWorkspaceNav.tsx`; `test/architecture/layerRules.test.ts`. Karışık satır sonları bayt düzeyinde korundu.
**Dokümanlar:** `frontend/README.md` (istisna paragrafı kaldırıldı, `:39` güncellendi), `docs/architecture.md` (G5 track), `docs/roadmap.md` (`:1883` notu ve G5 bölümü).

## layerRules.test.ts
`ALLOWED_VIOLATIONS = []`; `Violation` tipi ve ratchet korundu; `diffAllowList` eklendi ve gerçek ağaç testleri bunu kullanıyor; yeni sentetik testler: 3 `diffAllowList` testi ve 1 `analyze` testi (`shared → app/pages` R1); eski `:166` testinin yerine `expect(ALLOWED_VIOLATIONS).toEqual([])`; ayrıştırıcı/`analyze` sentetik testleri ve R3 testi duruyor.

## Test-first kanıtı
`projectModuleStore.test.ts` ve `useProjectModule.test.tsx`: modül yokken "Failed to resolve import" ile 2 dosya fail, sonra 14/14 yeşil. `projectModuleRegistry.test.ts`: `./projectModules` çözülemedi, registry yazılınca 5/5. `layerRules.test.ts`: `ReferenceError: diffAllowList is not defined`, sonra 12/12. Saf taşımalar: baseline yeşil (84/830) → taşıma sonrası yeşil (arada `tsc -b` temiz).

## Kabul kriterleri
AC1 baseline kayıtlı. AC2 `ls src/shared/project-file` 4 üretim + 2 test dosyası; `grep -rnE "from '\.\./\.\./(features|app|pages)" src/shared` yalnızca `shared/technical-drawing/DimensionGeometry.test.ts:4` (önceden var olan test dosyası, kural dışı). AC3 layerRules 12/12, liste boş. AC4 R3 90 → 90. AC5 `projectModules.test.ts`, `projectModuleRegistry.test.ts`, `projectDataContract.test.ts` yeşil; kayıt defteri `toBe` ile feature örneklerini tutuyor. AC6 `grep` feature'larda yalnızca `TrafficPlaceholder.tsx:5` yorumu; `useProjectModule('` string id çağrısı 0. AC7 §4 (a) sha256 özdeş, (b) yalnızca import satırları farklı. AC8 bayat yol taraması 0. AC9 wind tipleri yalnızca `windTypes.ts`'te. AC10 tablo yukarıda. AC11 tüm testler yeşil, panel testleri değişmeden geçti. AC12 dokümanlar güncel. AC13 `backend`, `package*.json`, CSS diff'i boş; `docs/e2e/**` ve kök `README.md`'ye dokunulmadı.

## Sapmalar ve notlar
Plan §4'teki 3 yeni test dosyasına ek sapma yok. Dokümanlar yalnızca planın (h) bölümündeki 3 dosya. Yeni dosyalar LF; mevcut dosyalarda her satırın kendi satır sonu korundu. `frontend/vitest-errors.txt` silmesine dokunulmadı.

## Kalan iş ve sınırlamalar
Yalnızca otomatik testler çalıştırıldı. Elle (Chromium) yapılacaklar: gerçek bir `.kopruq` projesini aç/kaydet; Recent listesi; tüm yük panellerinin (Seismic, Wind, Temperature, Self-weight, LM1) değer kaydı ve geri yüklemesi; Materials ve dirty göstergesi; tarayıcıda barrel yükleme sırası. Ham localStorage okumaları (`SystemAssemblyPanel`, `PreferredSpanPanel`) planlandığı gibi kapsam dışı. Review yapılmadı.
