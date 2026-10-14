# Review: backend-db-persistence-m5a

**Karar: PASS.** İncelenen kapsamda bloklayıcı ya da P2 düzeyinde bulgu yok. İki P3 bulgu yalnızca test gücüyle ilgili. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob; build, test ve lint koşturmadı).

## Kapsam ve sınırlar
- **Baseline:** HEAD `f34792e795ea28ee6b345c12aa86a491ac657adc` (güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `9188354f32a472c5fe298421adda36f8e8259c2e`; rapor bayat değil.
- **İncelenenler:** `docs/features/backend-db-persistence-m5a/review-input-full.diff` (997 satırın tamamı); altı yeni dosyanın tamamı (`projectWorkspaceModel.ts`, `loadsInputs.ts`, `projectStoreTestUtils.ts`, `noBrowserStorage.test.ts`, `PierFamiliesPanel.test.tsx`, `SystemAssemblyPanel.test.tsx`); bağlam dosyaları (`familyRepository.ts`, `useFamilyCatalog.ts`, `projectModuleStore.ts`, `preferredSpanRulesProjectModule.ts`, `registry.ts`, `store.ts`, `PreferredSpanPanel.tsx`, `SystemAssemblyPanel.tsx`, `layerRules.test.ts`); `docs/architecture.md` M5a bölümü, `docs/roadmap.md:1922-1923`, üst plan §1 ve §5.
- **Çalıştırılmayanlar:** build, test, lint. "105 dosya / 1070 test, build/lint çıkış 0" implementer'ın ve koordinatörün (bağımsız) sonucu; reviewer doğrulaması değil.
- **Bayt düzeyi:** Mojibake dizgeleri bayt bayt karşılaştırılamadı; diff'teki eski metin yeni dosyayla görsel olarak birebir aynı, `Â` içeren satır sayısı 7 (yorum + 6 koşul) ve eski satırlarla örtüşüyor, `projectWorkspace.ts`'te `Â` kalmadı.

## Bulgular

### F1 — P3 — `readProjectUnits` testi sonucu ayırt etmiyor
- **Yer:** `frontend/src/features/project/model/projectWorkspace.test.ts:20-24`
- **Kanıt:** Seed `{ moment: 'kN·m' }`, beklenen `toMatchObject({ moment: 'kNm' })`; ama `INITIAL_PROJECT.units.moment` zaten `'kNm'`.
- **Senaryo:** `readProjectUnits()` depoyu hiç okumasa ve her zaman `INITIAL_PROJECT.units` dönse test yine geçer. Yardımcıdaki literal `workspace` anahtarı production anahtarından saparsa da bu test kırılmaz (aynı dosyadaki eski `:15-17` testi `length: 'mm'` sayesinde sapmayı yakalıyor).
- **Etki:** AC6'nın "normalize edilmiş birimleri döner" maddesi gerçekten kanıtlanmıyor; M5c'de `readProjectUnits` sahip store'a geçerken gerileme fark edilmeyebilir.
- **Öneri:** Seed'e varsayılandan farklı değerler ekleyin, ör. `{ moment: 'MN·m', length: 'mm' }`, ve `toMatchObject({ moment: 'MNm', length: 'mm' })` bekleyin.

### F2 — P3 — Pier legacy testi yalnızca depoyu kontrol ediyor
- **Yer:** `frontend/src/features/pier-families/components/PierFamiliesPanel.test.tsx:19-23`
- **Kanıt:** Test yalnızca depodaki `pierType: 'H_TYPE'` değerini doğruluyor. Eski `readFamilies` normalizasyonu hiçbir zaman depoya yazmıyordu; bu yüzden test hem baseline'da hem de "okurken bellekte normalize et" varyantında geçer. Panelin saklı kaydı gösterdiği (tablodaki `<td>{item.pierType}</td>` → `H_TYPE`) doğrulanmıyor.
- **Etki:** AC3'ün "okurken normalize edilmiyor" yarısı yalnızca kalıcılık açısından korunuyor, ekranda gösterim açısından korunmuyor.
- **Öneri:** Render'dan sonra `await screen.findByText('H_TYPE')` (ya da `LEGACY-1` satırında `H_TYPE`) assertion'ı ekleyin.

### Nit'ler (aksiyon gerekmez)
- **N1 — barrel atlanıyor:** `PreferredSpanPanel.tsx:2`, `family-registry` barrel'ı yerine `../../family-registry/model/familyRepository`'yi import ediyor (enforce edilmeyen R3 sayacını +1 artırır). Plan öngörmüş; aynı desen `BridgeDefinitionWorkspace` ve `SystemAssemblyPanel`'de var.
- **N2 — gereksiz parantez:** Bazı seed çağrılarında fazladan parantez, ör. `seedProjectData('bridgeDefinitions', ({…}))` (`App.test.tsx`, `registry.test.ts`, `store.test.ts`, `PreferredSpanPanel.test.tsx`). Kozmetik.
- **N3 — yorum eşleme kısıtı:** Ratchet'teki `stripComments`, `layerRules` ile aynı kısıtı taşıyor: bir dizge içindeki `/*` ya da ` //` metin yutabilir ve listede olmayan bir dosyada yanlış negatif verebilir. Planın risk bölümünde belgelenmiş.
- **N4 — senkron iddiası kısmen doğru:** `projectStoreTestUtils.ts:16`'daki yorum, workspace anahtarının senkronunu `projectWorkspace.test.ts`'in tuttuğunu söylüyor; bu yalnızca `:15-17` testi için doğru (bkz. F1).

## Davranış eşdeğerliği (reviewer'ın kendi incelemesi)
- **registry MATERIAL:** Eşdeğer. Eski `readArray` anahtar yok/dizi değil/bozuk JSON/`localStorage` yok → `[]` ve nesne olmayan satırları eliyordu; yeni `getFamilyRecords('MATERIAL')` aynı durumlarda `() => []` fallback'ine düşüyor, aynı `filter` korunmuş. Yeni test filtre kaldırılırsa `val(null, …)` TypeError'ı ile kırılır.
- **`getFamilyReferences`:** Eşdeğer. Sıra aynı; JSON `null` için `null === undefined` false olduğundan bugünkü gibi `stored.definitions` TypeError'ı atıyor (K3 ile birebir); `5`/`{}` → `[]`; legacy `keyBy` yokken `bridgeNo = bridgeId` (`registry.ts:51` değişmedi), yeni test bunu ayırt edici biçimde sabitliyor.
- **PierFamiliesPanel `PIER_FALLBACK`:** Planlayıcının iddiası doğru. `getFamilyRecords` (`familyRepository.ts:40-47`) fallback'i yalnızca `localStorage` yok, anahtar yok, değer dizi değil ya da JSON bozuk durumlarında çağırıyor (`getItem` atarsa da catch üzerinden). Eski `readFamilies` bu durumların hepsinde `INITIAL` döndürüyordu; `H_TYPE`/`WALL` → `H_SECTION` normalizasyonu ve `allowedConfigurations` filtresi yalnızca dizi durumunda çalışırdı, bu durumda fallback hiç çağrılmıyor, yani kod ölüydü. Fallback `emit` (`useFamilyCatalog.ts:20`) ve `subscribe` (`:27`) içinde de kullanılıyor, sonuç aynı; okurken yazma (`:15`, `:29`) değişmedi; eski ve yeni fallback modül düzeyinde, aynı `INITIAL` referansı, kimlik kararlılığı korunuyor.
- **PreferredSpanPanel boyutları:** Eşdeğer (`null`, `[]`, bozuk JSON, `localStorage` yok; falsy-ama-nullish-olmayan değerlerde de aynı). `'storage'` effect'i aynen duruyor. `GIRDER_LIBRARY_MODULE.key === PRECAST_GIRDER_STORAGE_KEY` doğrulandı (`girderLibraryProjectModule.ts:7`).
- **Tercih edilen açıklık kuralları:** Tek fark kabul edilen K3 farkı (zod ile doğrulanan sahip okuması). Yok/dizi değil/erişim hatası durumlarında sonuç `[]`, eskisiyle aynı; şema `passthrough` olduğundan geçerli veride fazladan alanlar korunuyor. Event listesi (`BridgeDefinitionWorkspace.tsx:69`) ve dinleyiciler (`SystemAssemblyPanel.tsx:41-43`) değişmedi.
- **`graphStore` birimleri:** `readProjectUnits` eski ifadeyle birebir aynı.
- **projectWorkspace ayrımı:** 9 eski export'un hepsi re-export ediliyor (tipler `export type {…}`, değerler `export {…}`; `verbatimModuleSyntax` uyumlu); `STORAGE_KEY`, `readProjectState`, `persistProjectState` aynen kaldı; `newBridgeId` private; tüm tüketiciler geçerli isimleri import ediyor; `projectWorkspaceWire` artık `./projectWorkspaceModel`'den import ediyor.
- **`loadsInputs`:** 4 şema eskileriyle karakter karakter aynı; tipler eşdeğer (eski `NonNullable<ReturnType<typeof X_MODULE.read>>` zaten `z.infer<S>`'ye çözülüyordu); `loadsWire` artık `loadsProjectModules`'i import etmiyor; `trafficLm1Schema` yerinde kaldı.

## Test göçü (reviewer'ın kendi incelemesi)
- Tüm taşınan `expect`'lerde matcher ve beklenen değer aynı. Veri yokken TypeError atma davranışı korunmuş (`JSON.parse(x ?? '{}').bridges[0]` ile `!.bridges[0]` aynı TypeError; `?? '{}'`/`?? '[]'` varsayılanları `?? {}`/`?? []` olarak korunmuş).
- `App.test` `beforeEach` aynı 7 anahtarı sıfırlıyor; diğer dosyalarda `clear()` → `resetProjectData()` (argümansız = `clear`), `removeItem` → anahtarlı reset.
- `PreferredSpanPanel` testinde `new Event('storage')` dispatch'i iki yerde korunmuş. Silinen assertion yok.
- Yardımcı (`projectStoreTestUtils.ts`): anahtarlar export'lu production sabitlerinden (workspace hariç, o literal); yokken `null`; event göndermiyor; `graphStore` import sırasında depoyu okumuyor (lazy `documents`).
- Grep: 13 dosyada `localStorage|StorageEvent` = 0; `App.test.tsx`'te kalanlar yalnızca 309, 314, 327, 371, 415-416 ve 430-431. satırlarda (Recent / New-Project rollback testleri).

## Ratchet (`noBrowserStorage.test.ts`)
- Regex'ler üst plan §1 sembol listesiyle örtüşüyor; `'storage'` literal'i üç tırnak stilini ve dizi literal'ini yakalıyor; `familyStorageKey`, `'kopruq.storage'`, `localStorageKey` yakalanmıyor; production filtresi `layerRules` ile eşdeğer (`/src/test/` dahil); global olmayan regex'ler kullanıldığından `lastIndex` sorunu yok.
- **`ALLOWED_FILES` gerçek grep ile:** sembol eşleşen production dosyaları App.tsx, projectDataContract, projectFileService, recentProjects, store.ts, useFamilyCatalog, familyRepository, graphRunValidity, graphStore, graphViewPreferences, projectWorkspace, legacyStorageMigration, projectModuleStore, useProjectModule; bunlara `'storage'` literal'i ile üç bileşen eklenerek toplam **17**, birebir. `projectModules.ts:7` yalnızca yorumda (yorum çıkarılınca düşer). Eksik ya da fazla girdi yok.
- Bayatlık iki yönde de test ediliyor; `STORAGE_LISTENER_ONLY_FILES` için kural kümesinin tam olarak `['storage' literal]` olması isteniyor; liste sıralı ve tekrarsız olarak kontrol ediliyor.

## Katman kuralları ve kapsam dışı değişiklikler
- Yeni R1/R2 ihlali yok (`src/test/**` muaf). Yeni `readStoredBridgeDefinitions` zaten listedeki `store.ts` içinde. `backend/` ve `package.json` değişikliği yok.

## AC kapsamı
| AC | Durum | Kanıt |
|---|---|---|
| AC1 | Karşılandı | `registry.ts`/`PierFamiliesPanel.tsx`'te sembol yok; `graphStore.ts:100` `readProjectUnits()`; üç bileşende yalnızca literal; sentetik testler var. Yeşil olması: rapor. |
| AC2 | Karşılandı | Import'lar ve re-export'lar doğrulandı; `tsc` temizliği: rapor. |
| AC3 | Karşılandı (test zayıf, F2) | (a) RECT-M ve okurken yazma; (b) depo `H_TYPE` kalıyor. |
| AC4 | Karşılandı (K2 ertelemesi bilinçli) | `getPrecastGirderDefinition` kullanılıyor; `'storage'` effect'i ve testi değişmedi. |
| AC5 | Karşılandı | Grep sayıları ve K1 eşdeğerliği yukarıda. |
| AC6 | Kısmen güçlü (F1) | MATERIAL, bozuk JSON / boş depo, legacy `keyBy` ve `readStoredBridgeDefinitions` testleri ayırt edici; `readProjectUnits` normalizasyon testi zayıf; SystemAssembly testi ayırt edici. |
| AC7 | Raporlandı | build/test/lint çıkış 0: rapor (reviewer çalıştırmadı; koordinatör bağımsız koştu). |
| AC8 | Karşılandı | `architecture.md:3279-3288` ve `roadmap.md:1923` koddaki durumla uyumlu. |

## M5b/M5c için gizli riskler
- **Workspace anahtarı literal:** Yardımcıdaki `'kopruq.project-workspace.v1'` production'dan kopya; sapmayı yalnızca `projectWorkspace.test.ts:15-17` yakalıyor (F1).
- **Okurken yazma assertion'ı:** `PierFamiliesPanel.test` (a) bugünkü okurken yazma davranışını sabitliyor; M5c'de bilinçli olarak değişmesi gerekecek (dosyada belgelenmiş).
- **Test sırası bağımlılığı:** `useFamilyCatalog` modül önbelleği nedeniyle Pier testi sıraya bağlı; dosya bazlı izolasyon varsayımı doğrulanmadı.
- **Ortak referans:** `readProjectUnits()` boş depoda paylaşılan `INITIAL_PROJECT.units` referansını dönüyor (eskiden de böyleydi); bu nesneyi değiştiren bir tüketici eklenirse risk oluşur.

## Doğrulayamadıklarım
- Testlerin, build'in ve lint'in gerçekten yeşil olduğu; 1070 test sayısı (reviewer çalıştırmadı).
- Mojibake dizgelerinin bayt düzeyinde aynı olduğu.
- `SystemAssemblyPanel.test`'teki `.spn-svg-girder` seçicisinin ve `PierFamiliesPanel` (b) testinin gerçek render davranışı.
- Vitest'in dosya başına izolasyon varsayımı.
