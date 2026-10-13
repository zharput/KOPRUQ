# Review: g3 (A-01, A-07, C-013-01, C-013-03)

**Karar: PASS.** P0–P2 bulgu yok; üç P3 madde ve iki doğrulanmamış hipotez var. Bu, özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- Baseline HEAD `37bdf17e6a5b381a36e07f21614de3754fa8aa5a` (güncel HEAD ile aynı). Review sonrası diff özeti (md5) ve izlenmeyen dosya özeti değişmedi → review güncel.
- Okunan: 1035 satırlık diff'in tamamı (3 parça), 10 izlenmeyen dosyanın tamamı (dört şema dosyası, `projectDataContract.ts`, `projectDataEvents.ts`, `projectFileValidation.ts`, `projectFileFixtures.ts`, `projectDataContract.test.ts`, `projectFileRealDefaults.test.tsx`), ana değişen kaynakların güncel hâlleri (`projectFileService.ts`, `projectModules.ts`, `recentProjects.ts`, `App.tsx`, `MaterialsPanel.tsx`, `graphStore.ts`, `store.ts`, `projectWorkspace.ts`, `familyRepository.ts`; `useProjectFile.ts` ve `TopWorkspaceNav.tsx` diff'te tamamen görünüyor); şemaların gerçek TS tipleri ve gerçek veri üreticileriyle karşılaştırılması için tip dosyaları, `excelImport.ts`, `ProjectPanel.tsx`, `BridgeDefinitionWorkspace.tsx`, aile panelleri, `DesignSystemUi.tsx` (`EngineeringInput`), `App.css`.
- Reviewer test çalıştırmadı. `npm test` 81 dosya/713 test ve build OK koordinatör beyanıdır; lint dağılımı yalnızca implementer beyanı. IndexedDB yolu jsdom'da test edilmiyor (testler metadata fallback yolunu kullanıyor); transaction sırası yalnızca kaynak incelemesiyle doğrulandı. Gerçek eski `.kopruq` dosyaları ve gerçek `FileSystemFileHandle` davranışı test edilmedi.

## Bulgular
**P3-1: Hata formatı dokümanla kod arasında farklı.** `frontend/src/shared/project-file/projectFileValidation.ts:14` ayırıcı olarak em-dash kullanıyor (`${issue.path} — ${issue.message}`); `docs/architecture.md` G3 track "Record validation" paragrafı `Invalid project file: <path> - <message>` yazıyor. Kod plan §3.3 ile uyumlu. Öneri: dokümanı `—` olacak şekilde düzelt.

**P3-2: Gerçek varsayılan testi üç kategoriyi doğrulamıyor (AC8 boşluğu).** `projectFileRealDefaults.test.tsx:18-19` beş paneli render ediyor ama yalnızca PIER ve MATERIAL'ın dolu olduğunu kontrol ediyor; PIER_CAP, FOUNDATION ve BEARING panelleri mount'ta kayıt yazmıyor, dosyaya `[]` giriyor. Bu üç kategoride uygulamanın ürettiği kayıtlar (`blank()` + `makeId()`/`newId()`, kural nesneleri) hiçbir testte şemadan geçirilmiyor. Kaynakta üretilen şekiller şemaya uyuyor (kurallar `min/max/delta` içeriyor; `capType`/`foundationType`/`bearingType` enum içinde), yani bugün hata görülmedi; ileride şema ile panel ayrışırsa test yakalamaz. Öneri: her panelin "Add" akışıyla veya `blank()` üreticisiyle birer kayıt oluşturup `validateProjectFile` ile doğrulayan test ekle.

**P3-3: Materials ekranı açıldığında katalogdaki fazla satırlar siliniyor (önceden de vardı, artık dirty görünüyor).** `MaterialsPanel.tsx:37-45`: dosyadaki MATERIAL kataloğunda 8 varsayılan `id` dışında kayıt olabilir (doğrulama passthrough) veya satır/anahtar sırası farklı olabilir; ekran açılınca `readMaterials` yalnızca 8 `INITIAL` satırı birleştiriyor, stringify karşılaştırması farklı çıkıyor, fazla satırlar silinerek yazılıyor ve proje dirty oluyor. Regresyon değil (eski kod koşulsuz üzerine yazıyordu); K5'in "depo güncelken mount dirty yapmaz" garantisi yalnızca şekli `INITIAL` ile birebir aynı kataloglar için geçerli. Öneri: A-02 benzeri ayrı madde olarak işaretle; düzeltilecekse bilinmeyen satırlar birleştirmede korunmalı.

## Belirsiz hipotezler (doğrulanmadı)
- **Save doğrulama yapmıyor.** `buildProjectFile`/`save` çıktısı `validateProjectFile`'dan geçmiyor; şemaya uymayan eski bir localStorage durumu (ör. bugün zorunlu bir alanı eksik köprü satırı) kaydedilen dosyayı K1 gereği açılışta bütünüyle reddettirir; kullanıcı bunu yeniden açarken öğrenir. Uygulama içinde böyle veriyi bugün üreten yol bulunamadı (`excelImport` ve `ProjectPanel` tüm alanları dolduruyor; `BridgeDefinitionWorkspace` sonlu olmayan sayıları reddediyor; `EngineeringInput` `Number('')=0` üretiyor; `deserializeGraph` kullanılmıyor). Plan riski yalnızca dosya açılışı için kabul etti; kayıt anında uyarı ayrı karar olabilir.
- **Recent satırında taşma.** `App.css:3311` `.spn-recent-list button small{white-space:nowrap}` ve `grid-template-columns:1fr auto` yeni `<small className="spn-recent-project">` için de geçerli; uzun proje adları dropdown'dan taşabilir. Chromium'da elle bakılmalı.

## Sapma değerlendirmeleri
1. `projectFileValidation.ts` ayrıştırılması: uygun (döngüsel import'u önler; sözleşme aynı sınıfı yeniden dışa aktarır).
2. Fixture dosyası ve `MaterialsPanel.test` genişletilmesi: kabul edilebilir.
3. `importGraphDocuments` sığ kontrol, derin kontrol `validateGraphDocuments`'ta: doğru karar (eski davranış zaten sığdı; dosya girişinde derin şema `readProjectFile` ve `applyProjectFile` içindeki `validateProjectFile` ile çalışır; rollback'in eski veriyi reddetmesi önlenir).
4. `selectedBridgeId` isteğe bağlı: plandan gevşek ama K2a ile tutarlı (`ensureBridgeDefinitions` dolduruyor). Kabul.
5. `allowedConfigurations` `string[]`: `PierFamiliesPanel.readFamilies` eski değerleri zaten filtreliyor; daha katı enum eski dosyaları gereksiz reddederdi. Kabul.
6. Eksik modülde `reset()` doğrulaması hata fırlatıp rollback yapıyor: daha katı ama plan §3.1 "reset fırlatır" ile uyumlu. Kabul.
7. Reset sırası: eski davranışla eşdeğer; girderLibrary `savePrecastGirderDefinition([])` yolunda `project-module-changed` olayı yok ama `useProjectModule('girderLibrary')` hiçbir yerde kullanılmıyor. Kabul.
8. `save()` içinde `recentId` yalnızca `next===ref` iken: `writeProjectFile` handle varken aynı `ref` nesnesini döndürüyor (`projectFileService.ts:127`); handle'sız ref ile picker'dan yeni dosya fiilen Save As sayılır, eski kayda bağlamamak doğru. Aynı dosyanın bir kez handle'sız bir kez handle'lı açılmasında iki satır planda kabul edilmiş risk.
9. CSS'e dokunulmadı: kabul; görsel risk yukarıdaki hipotezde.

## Kabul kriterleri
| AC | Sonuç | Dayanak |
|---|---|---|
| AC1 | Raporlandı (doğrulanmadı) | `implementation.md` baseline/final tablosu |
| AC2 | Karşılandı | `projectDataContract.ts:80-84` graph + 5 aile + 8 modül = 14 anahtar; `projectFileService.ts`'te `CATEGORIES` yok; aile anahtarları yalnızca `familyRepository.ts:13-17` |
| AC3 | Karşılandı (kaynak düzeyinde) | `projectDataContract.test.ts` her entry için round-trip, olay, snapshot/restore, reset; iki farklı örnek veri |
| AC4 | Karşılandı | Dosya yerleşimi ve anahtar sırası testli, `schemaVersion: 1`, hata metinleri korunmuş; mevcut testlere yalnızca ekleme, zayıflatılan test yok |
| AC5 | Karşılandı | `MaterialsPanel.tsx:45` yalnızca fark varsa repository üzerinden yazıyor, yazma döngüsü yok, 4 test; bkz. P3-3 |
| AC6 | Karşılandı | Anahtar literal'leri yalnızca sahip modüllerde; olay literal'i yalnızca `projectDataEvents.ts`'te ve bir yorumda |
| AC7 | Karşılandı | Doğrulama `readProjectFile` içinde, snapshot/apply'dan önce; 15 durumluk tablo 14 anahtar + proje/tanım anahtarlarının baytlarını, setter çağrılarını, `ref` ve `dirty`'yi ölçüyor |
| AC8 | Büyük ölçüde | Uyumluluk testleri tam, aralık kuralı yok; gerçek varsayılan testinde boşluk (P3-2) |
| AC9 | Karşılandı | `normalizeProjectFile` → `normalizeProjectState`; App testi environment varsayılanlarını doğruluyor |
| AC10 | Karşılandı (jsdom + mock) | UUID; `isSameEntry` eşleşmesi IndexedDB transaction'ından önce (`loadRecords` → readonly tx kapanır → eşleşme → yeni readwrite tx); K3a, eski id'ler, repair/Save/Save As testli; UI'da `projectName` ve "Erişim yok"; IndexedDB/metadata anahtarları aynı; gerçek Chromium doğrulanmadı |
| AC11 | Raporlandı | Diff yalnızca `frontend/src` ve `docs`; yeni localStorage anahtarı yok |
| AC12 | Raporlandı | Test/build koordinatörce yeniden çalıştırıldı; lint implementer beyanı |
| AC13 | Karşılandı | Üç doküman güncel; bkz. P3-1 |

## Test kanıt gücü
Güçlü: ret tablosu iki katmanda koşuyor (servis ve hook); hook testi baytların aynı kaldığını, setter'ların çağrılmadığını, `ref`/`dirty`'nin değişmediğini gerçekten ölçüyor; sözleşme testleri parametrik ve iki farklı örnek veri kullanıyor; Recent testleri `isSameEntry` için doğru/yanlış/hata/eksik dallarını kapsıyor. Sınır: IndexedDB yolu ve gerçek handle davranışı test edilmedi; testleri ve lint'i reviewer çalıştırmadı.

## Not
Chromium'daki elle kontroller (`implementation.md` "Elle yapılacak kontroller" 1–5) hâlâ yapılmalı. Düzeltme istenirse `refactor-implementer` ayrı ve açık bir komutla çağrılmalıdır (otomatik düzeltme yok).
