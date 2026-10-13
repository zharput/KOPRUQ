# Review: g5 (A-08b, `shared/project-file` bölünmesi)

**Karar: PASS.** İncelenen kapsamda eyleme dönük bulgu yok (P0–P3 yok). Bu, özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- Baseline HEAD `2d7d5838bfdc3a6ce04d0df0f62124ddcf998aaf` (güncel HEAD ile aynı; `state.json` `baseline_head` ve `approved_plan_sha256` `2e7015fc…1b6e` aynı). Review sonrası diff özeti (md5), izlenmeyen dosya özeti ve `git status` özeti değişmedi → review güncel. İlgisiz `docs/e2e/**` ve `docs/features/**` kapsam dışı tutuldu.
- Okunan: `g5.diff` (1694 satırın tamamı), `g5-status.txt`, 24 izlenmeyen dosyanın hepsi (taşınan testlerin bir kısmında yalnızca başlık ve import satırları), `useProjectModule.ts`, `layerRules.test.ts`, `preferred-span/index.ts`, `family-registry/index.ts`, `app/project-file/{projectModules, projectDataContract, projectFileService, useProjectFile, projectFileTypes}.ts`, `projectDataContract.test.ts`, `frontend/README.md`; ek grep taramaları (eski yollar, `vi.mock`, `PROJECT_MODULES`, `useProjectModule(`, `PROJECT_MODULE_CHANGED_EVENT`, `ProjectModuleValue`, `createModule`, `shared → features/app/pages`, `features → app`).
- Reviewer komut çalıştırmadı. Koordinatör doğruladı: `npm test` 87 dosya/853 test; build OK; dist CSS sha256 aynı; lint 66 uyarı (baseline 66); `projectDataEvents.ts` ve `projectFileValidation.ts` HEAD ile sha256 özdeş; `recentProjects.ts`, `projectFileFixtures.ts`, `projectModulesRoundTrip.test.ts`, `projectModules.test.ts`, `useProjectFile.test.tsx` ve (review sonrası ek doğrulama) `projectFileService.test.ts`, `projectFileRealDefaults.test.tsx`, `recentProjects.test.ts` HEAD'e göre içerik özdeş (CR yok sayılarak); `ALLOWED_VIOLATIONS = []`; backend, `package*.json`, CSS diff'i boş. R3 90 → 90 implementer ölçümüdür.
- Elle Chromium kontrolleri yapılmadı.

## Değerlendirmeler
1. **Sekiz modül baseline ile aynı (persistence uyumu):** silinen `projectModules.ts` ile yeni tanım dosyaları satır satır karşılaştırıldı (`features/loads/model/loadsProjectModules.ts:5-21`, `family-registry/model/girderLibraryProjectModule.ts:5-7`, `preferred-span/model/preferredSpanRulesProjectModule.ts:5-8`, `superstructure-families/model/crossSectionProjectModule.ts:4-7`): id'ler ve localStorage anahtarları, zod şemaları (`passthrough` ve `as unknown as z.ZodType<…>` dahil), `const number = z.number()` kısaltması, `girderLibrary` özel `write`/`reset` (`savePrecastGirderDefinition(value)` / `([])`) metin olarak aynı. `app/project-file/projectModules.ts:11-29`: anahtar sırası, `PROJECT_MODULE_IDS` (`Object.keys`) ve `PROJECT_MODULE_LABELS` aynı; kayıt defteri feature'ların export ettiği nesne örneklerini kullanıyor; `projectModuleRegistry.test.ts:30-39` `toBe` ile aynı örneği doğruluyor.
2. **`projectModuleStore.ts` baseline ile aynı:** `emit` iki olayı aynı sırada ve aynı `detail` ile yayıyor; aynı değerde `true` döner ve olay yayılmaz; storage hatası `false`; `reset` kayıt yoksa sessiz; özel `reset` `false` dönerse olay yayılmaz. `createModule` → `createProjectModule` yeniden adlandırması plan gereği.
3. **Jenerik `useProjectModule` (`:6-35`):** önbellek `module.id` ile; `subscribe` değişmedi; fonksiyonla güncelleme destekleniyor; `undefined`'da fallback; `useCallback` bağımlılıkları `[module, fallback]` (modüller dosya düzeyinde sabit); `NoInfer<NonNullable<T>>` plan §10'a uygun; string id çağrısı kalmadı.
4. **Bağımlılık yönü:** `shared/project-file` yalnızca zod, React ve kendi dosyalarını import ediyor; `src/shared` içinde `features/app/pages` hedefleyen tek import `shared/technical-drawing/DimensionGeometry.test.ts:4` (test dosyası, kural dışı, önceden vardı); `features/**` içinde `app/` veya kayıt defteri import'u yok; barrel'lar en küçük hâlinde (`family-registry/index.ts:1` yalnızca `GIRDER_LIBRARY_MODULE`; `preferred-span/index.ts:3` bir export satırı). Döngü yok: `bridge-definition`/`system-assembly` → `preferred-span` barrel → `PreferredSpanPanel` → `family-registry` barrel → `girderLibraryProjectModule` → `familyRepository` → shared events. `PreferredSpanPanel.tsx:10` dosya düzeyinde `GIRDER_LIBRARY_MODULE.key` erişimi döngüsüz ESM sırasında güvenli.
5. **`layerRules.test.ts`:** `ALLOWED_VIOLATIONS = []` (`:19`); eski parser testi (`:87-103`), R1/R2/R4 `analyze` testi (`:107-121`) ve R3 testi (`:131-135`) duruyor; gerçek ağaç testleri anlamı korunarak `diffAllowList` üzerine taşınmış (`:150-166`); yeni sentetik testler (`:122-130`, `:138-148`) listede olmayan ihlalin `unexpected`, bayat kaydın `stale` çıktığını ve `shared → app/pages` için R1 üretildiğini kanıtlıyor; eski "yalnızca `shared/project-file` → `features`" testi daha sıkı `toEqual([])` ile değiştirilmiş; zayıflatma yok.
6. **Yalnızca import satırı değişen dosyalar:** `projectDataContract.ts` (`:4`, `:8` yolları ve `:10` → `:10-11` bölünmesi dışında gövde satır satır aynı), `projectFileService.ts` (`:7` iki satıra bölünmüş, `:10-132` aynı), `useProjectFile.ts` (yalnızca `:6` ve `:9`), `projectDataContract.test.ts` (yalnızca `:3`); `projectFileTypes.ts:4,8` wind tiplerini import ediyor, re-export yok; `windTypes.ts:1-2` baseline metni aynen.
7. **Bayat referanslar:** `frontend/src` içinde eski yollara referans yok; `vi.mock` çağrılarının hiçbiri bu yolları hedeflemiyor; depo genelinde (`archive`, `docs/features`, `docs/reviews` hariç) eski yol yalnızca `docs/architecture.md:3043` ve `:3122`'de (tarihsel G3/G4 metinleri, plan gereği değiştirilmedi).
8. **Dokümanlar:** README `:21-24` ve `:39-42`, `architecture.md` G5 track ve roadmap G5 bölümü gerçek durumla tutarlı; eksik elle kontroller roadmap'te açık madde.
9. **Yasak kapsam:** mühendislik sabitleri, birimler, olay adları, localStorage/backup/IndexedDB anahtarları, `schemaVersion` ve `applicationVersion` değişmemiş; `SeismicPanel` ve `UniformTemperaturePanel` diff'lerinde yalnızca hook çağrısının argümanı değişmiş.

## Kabul kriterleri
| AC | Durum | Dayanak |
|---|---|---|
| AC1 | Karşılandı (bildirilen) | `implementation.md`: 84/830, 66 uyarı, hash |
| AC2 | Karşılandı | 4 üretim + 2 test dosyası; grep 0 (yalnızca kural dışı bir test dosyası); events/validation sha256 koordinatörce doğrulandı |
| AC3 | Karşılandı | `layerRules.test.ts:19`, `:107-148`, `:160-170` |
| AC4 | Bildirilen 90 → 90; statik analizle tutarlı (Δ = 0) | yeni cross-feature import'ların hepsi barrel üzerinden; `app` → `features` R3'e sayılmıyor |
| AC5 | Karşılandı | metin karşılaştırması ve registry testi |
| AC6 | Karşılandı | grep 0; string id çağrısı 0 |
| AC7 | Karşılandı | incelenen dosyalarda; bayt eşitlikleri koordinatör sha256'sına dayanıyor |
| AC8 | Karşılandı | grep 0 (src) |
| AC9 | Karşılandı | tanım yalnızca `windTypes.ts`'te; re-export yok |
| AC10 | Bildirilen: 87/853, build OK, 66 uyarı, CSS aynı | 9 + 5 + 5 + 4 = 23 yeni test |
| AC11 | Bildirilen yeşil | panel testlerinin değişmediği diff'te doğrulandı (yalnızca `WindLoadsPanel.test.tsx` import satırı) |
| AC12 | Karşılandı | README, architecture.md, roadmap |
| AC13 | Bildirilen boş | status listesinde backend, `package*` veya CSS yok |

## Test kanıtı ve sınırlar
- Yeni testler anlamlı: `projectModuleStore.test.ts` (olayların tam bir kez ve doğru `detail` ile yayılması; aynı değerde ve hatada sessiz kalma; reset; özel write/reset; başarısız özel write/reset), `useProjectModule.test.tsx` (fallback referansının korunması, okuma, değer ve fonksiyonla güncelleme, `storage` olayı, reset sonrası fallback), registry testi (id, anahtar, sıra, örnek kimliği, etiketler). `it.skip`/`.only`/`fails` yok; totoloji görülmedi.
- Şema metninin aynı kaldığını bir test doğrudan kontrol etmiyor; reviewer bunu elle doğruladı; taşınan round-trip ve contract testleri parse/apply davranışını dolaylı kapsıyor.
- Küçük boşluk (bulgu değil): `features → pages` için sentetik R2 testi yok (baseline'da da yoktu).
- Tarayıcıdaki gerçek yükleme sırası, `.kopruq` aç/kaydet akışı ve paneller arası kalıcılık elle denenmedi.

## Not
Chromium'da yapılacak elle kontroller (`implementation.md` "Kalan iş ve sınırlamalar"): gerçek `.kopruq` aç/kaydet; Recent listesi; Seismic/Wind/Temperature/Self-weight/LM1 panellerinin değer kaydı ve geri yüklemesi; Materials ve dirty göstergesi; barrel yükleme sırası.
