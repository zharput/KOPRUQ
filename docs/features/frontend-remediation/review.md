# İnceleme: frontend-remediation

> **DURUM: STALE / INCOMPLETE (koordinatör etiketi).** İnceleme sırasında HEAD `47c09ca` → `1111125` ("feat: add seismic spectrum and uniform temperature hooks") oldu ve çalışma ağacı temiz hâle geldi: uygulama değişiklikleri incelemenin ortasında commit'lendi. Workflow gereği baseline artık güncel HEAD değil; `reviewed` işaretlenmedi. Reviewer'ın verdiği verdict `CHANGES_REQUESTED` idi. Aşağıdaki bulgular, baseline'a göre alınan anlık görüntüden (82 dosya = 58 değişen + 24 yeni; `1111125` de 82 dosya gösteriyor) üretildi. Commit içeriği anlık görüntüyle bayt düzeyinde karşılaştırılamadı (yeni dosyalar artık diff'te), bu yüzden bulguların hâlâ geçerli olduğu kod üzerinde yeniden teyit edilmeli.

## 1. Kapsam ve sınırlar
- Baseline `47c09ca1f63b5d4c27c24df3ca3f8f74c2385772`. Diff'in tamamı (5 parça) okundu: 2 doküman + 56 `frontend/src` dosyası; ayrıca 24 yeni dosya (9 kaynak, 15 test).
- Reviewer hiçbir komut çalıştıramadı. Build 0, lint 0, 26 failed / 497 passed sonuçları uygulayıcı ve koordinatör raporlarıdır; başarısız test adlarının baseline ile birebir eşleşmesi kimse tarafından doğrulanmadı (yalnızca sayı).
- Kapsam kontrolleri: diff'te `backend/`, `package.json` ve Faz 5 dosyaları (`girderCandidates.ts`, `pierSectionProperties.ts`, `shared/ui/generation.ts`) yok. Mühendislik sabitleri korunmuş (`INITIAL_SELF_WEIGHT_INPUTS`, `drefM: 3`, sismik ξ/η metinleri). `localhost:8080` ve `fetch(` yalnızca `shared/api/http.ts`'te (testler hariç).

## 2. Verdict (reviewer): CHANGES_REQUESTED
Bir P2 regresyon ve bir P2 veri bütünlüğü riski. "Hata yok" garantisi değildir.

## 3. Bulgular

### P2-1: Family parametre aralığında adet (count) parametreleri uzunluk gibi dönüştürülüyor (C-003-01 düzeltmesinden regresyon)
- **Yer:** `frontend/src/features/family-tables/model/graphFamilyPresentation.ts:107-116`, `frontend/src/features/family-tables/components/FamilyResultsViewer.tsx:29` (`parameterRangeDisplay(stats(rawKey), String(nodeParameters[`${rawKey}Unit`] ?? 'm'), units, ...)`).
- **Senaryo:** Proje uzunluk birimi `mm`/`cm`; Family görünümünde Piled Foundation. `pileCountXValue`/`pileCountYValue` için `...Unit` anahtarı yok (`nodeRegistry.ts:166` `integer: true`). Viewer `'m'` varsayar, 4 adet "4000.00 mm" gösterilir.
- **Etki:** Mühendise yanlış sayı. Eski kod "4.00" gösteriyordu (yalnız etiket yanlıştı). Varsayılan `m`'de fark görünmez.
- **Kanıt:** `formatNumber` (aynı dosya, satır 94) count anahtarlarını muaf tutuyor; yeni fonksiyonda muafiyet yok. Testler yalnızca uzunluk durumunu kapsıyor.
- **Öneri:** Birim anahtarı yoksa `'m'` varsayılmasın (`undefined` → birimsiz dal) ya da `integer`/count anahtarları dönüştürülmesin. Piled foundation + `units.length='mm'` regresyon testi.

### P2-2: Eski `.kopruq` açılınca proje dışı yerel veriler onaysız ve geri dönüşsüz siliniyor (D-1'e uygun ama veri kaybı riski)
- **Yer:** `frontend/src/shared/project-file/projectFileService.ts:60`; bildirim `frontend/src/app/App.tsx:95`.
- **Senaryo:** Kullanıcı eski sürümle çalışmış; girder kütüphanesi, Preferred Span kuralları, seismic/wind/temperature girdileri yalnızca global localStorage'da. Yükseltme sonrası kendi eski dosyasını açıyor. Bu değerler "dirty" sayılmadığından unsaved-changes modalı çıkmıyor; `applyProjectFile` eksik her modülü `reset()` ediyor (girder için `savePrecastGirderDefinition([])`). Alert gelir ama veri silinmiştir.
- **Etki:** Hiçbir dosyada kaydı olmayan kullanıcı verisi kalıcı kaybolur. Alert teknik modül kimliklerini listeler.
- **Not:** Plan D-1 gereği sapma değil; ama kullanıcıya açıkça sorulmalı.
- **Öneri:** Uygulamadan önce onay ya da yedek (`kopruq.backup.<ts>`); alternatif: ilk açılışta yerel değerleri dosyaya taşıma seçeneği; mesaj kullanıcıya dönük etiketlerle.

### P3-1: Seismic sorgu anahtarı boş girdi ile `0`'ı ayırt etmiyor (AC23 boşluğu)
- **Yer:** `frontend/src/features/loads/hooks/useSeismicSpectrum.ts:6-12`.
- **Senaryo:** "0.25" yazılırken önce "0" → `agR=0` isteği gider, cache'e girer. Alan silinince `Number('')===0`, anahtar aynı; `enabled:false` olsa da cache'teki `data` döner, boş alanda agR=0 sonucu/INVALID uyarısı görünür. `i` alanı için de geçerli.
- **Kanıt:** "girdi boşalınca temizlenir" testi doğrudan '0.2' yazıyor, '0' ara durumunu atlıyor.
- **Öneri:** Anahtar `ready ? agR : null`; ya da `ready` değilken `query.data` yok sayılsın.

### P3-2: Inspector'da kaynak birim ile gösterim birimi tutarsız
- **Yer:** `frontend/src/features/graph/ui/EngineeringNodeInspector.tsx:109-110`.
- **Senaryo:** length=`cm` ya da force=`kgf`/`tonf`: `kN/cm`, `tonf/m` `quantities.ts`'te kayıtlı değil. `toDisplayValue` kanonik `kN/m`'ye düşer, `sourceUnit` `kN/cm` kurulur, `convertQuantity` fırlatır, giriş her zaman invalid; rijitlik düzenlenemez.
- **Ek:** Aynı desen `EngineeringNodeShell.tsx:124`'te try/catch'siz (önceden de vardı, C-012-01 sınıfı).
- **Öneri:** `sourceUnit = getDisplayUnit(dimension, projectUnits).id`; Shell yoluna da uygula.

### P3-3: LM1 α reset, geçersiz taslağı temizlemiyor
- **Yer:** `frontend/src/features/loads/components/traffic/Lm1Panel.tsx:15-17`.
- **Senaryo:** Override'lı satırda alan boşaltılır, "EN default" tıklanır: taslak `''` kalır, reset değeri yazılır, girdi hâlâ boş/`aria-invalid` gösterir.
- **Öneri:** Reset ya da dış değer değişiminde `setDraft(null)`.

### P3-4: "Save & continue" modalında kullanıcı iptali hata gösteriliyor
- **Yer:** `frontend/src/app/App.tsx:79` (`saveAndContinue` `AbortError`'ı filtrelemiyor; `reportSaveError` `App.tsx:80` yalnızca nav Save/Save As'te).
- **Etki:** AC4 bu yolda karşılanmıyor (önceden de vardı).
- **Öneri:** Burada da `reportSaveError`.

## 4. Doğrulanmamış hipotezler
- **H1 Dashboard çökmesi:** `ProjectDashboardPanel.tsx:35` `display(value: string)` içinde `value.trim()`. `readProjectFile` yalnızca `units`'i birleştiriyor (`projectFileService.ts:73-75`), `validateProjectFile` `project`'in truthy olduğunu kontrol ediyor. `status`/`name`/`lastModified` olmayan eski/elle düzenlenmiş dosyada TypeError olabilir. Öneri: `display(value?: string)` ya da açılışta `INITIAL_PROJECT` ile birleştirme.
- **H2 Open sonrası "dirty":** `open` içinde `importing` koruması `finally`'de kalkıyor; `sessionId` ile remount olan panellerin efektleri ve `persistProjectState` (koşulsuz `project-data-changed`) korumadan sonra çalışabilir; Open sonrası `File *` görünebilir. New Project için `settling` var, Open için App düzeyinde test yok. Preferred Span'i görüntülemek `ensureRules` yazımıyla projeyi dirty yapabilir.
- **H3 Graph performansı:** `graphRunValidity.ts` `nodeFingerprint` her düğüm için upstream BFS + `stableStringify`; `toReactFlowNodes` her render'da tüm düğümler için çağırıyor; `read()` her çağrıda localStorage JSON'unu parse ediyor. Ölçülmedi.
- **H4 Sessiz yazım hataları:** `useProjectModule.set` (`useProjectModule.ts:31-35`) `write` başarısızlığını yutuyor; kota dolunca değer görünür şekilde geri sekiyor, mesaj yok.
- **H5 Infinity girişi:** `DecimalInput` "Infinity"/"1e999" kabul edip `onChange(Infinity)` çağırıyor; JSON'da `null`, şema reddeder, modül sessizce varsayılana döner. Uç durum.

## 5. Kabul kriterleri
| AC | Değerlendirme |
|---|---|
| AC1 | Baseline dosyaları var (içerik ayrıntılı incelenmedi). |
| AC2 | Karşılanıyor, test var. |
| AC3 | Karşılanıyor, test var. |
| AC4 | Nav Save/Save As karşılanıyor; modal yolu eksik (P3-4). |
| AC5 | Karşılanıyor; round-trip 8 modülü kapsıyor. |
| AC6 | İzolasyon karşılanıyor; D-1 veri kaybı riski (P2-2). |
| AC7 | Sekme değişimi test edildi; workspace değişimi/yenileme çıkarım, test yok. |
| AC8 | Karşılanıyor. |
| AC9 | Karşılanıyor (H1 dayanıklılık notu). |
| AC10, AC11 | Karşılanıyor; testler anlamlı. |
| AC12 | Karşılanıyor. |
| AC13 | **Kısmen**: uzunlukta doğru, count parametrelerinde regresyon (P2-1). |
| AC14 | Varsayılan birimlerle karşılanıyor; kayıtsız kombinasyonlarda eksik (P3-2). |
| AC15 | Faz 5 dosyaları diff'te yok; uygun. |
| AC16 | Kod doğru; `GraphWorkspace` bileşen testi yok. |
| AC17, AC18 | Karşılanıyor. |
| AC19 | New Project temizliği testsiz. |
| AC20 | Karşılanıyor. |
| AC21 | Layout testli; Generate aynı yol, testsiz. |
| AC22 | Karşılanıyor. |
| AC23 | Yarış çözülmüş; boş/0 anahtar çakışması (P3-1). |
| AC24, AC25 | Karşılanıyor (P3-3 UI notu). |
| AC26 | Doküman güncel; Faz 5 "doğrulanmamış". |
| AC27 | Diff düzeyinde backend/bağımlılık/mühendislik değişikliği yok; build/lint/test reviewer tarafından çalıştırılmadı. |

## 6. Test kanıtı ve sınırlar
- Yeni testlerin çoğu anlamlı (ertelenmiş fetch ile yarış testleri, rollback'te `setItem` spy'ı, deferred yanıt sırası). Başarısızlığı maskeleyen test görülmedi.
- Kapsam boşlukları: count parametresi/`mm` ile Family aralığı; Seismic '0' ara durumu; Open sonrası App düzeyinde dirty; New Project snapshot temizliği; `GraphWorkspace` dirty çıktı gizleme.
- `implementation.md` "22 izlenmeyen dosya" diyor, gerçekte 24 (belge tutarsızlığı).
- Kalan manuel doğrulamalar: tarayıcıda File System Access/IndexedDB, canlı backend ile `(Ref: …)`, oxlint dosya bazlı karşılaştırma, 26 başarısız testin adlarıyla birebir eşleşmesi.
