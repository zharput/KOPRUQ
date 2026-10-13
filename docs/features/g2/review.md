# Review: g2 (C-006-04, C-007-04, C-010-04) — 2. tur (güncel)

**Karar: PASS.** İncelenen kapsamda düzeltilmesi gereken sorun bulunmadı. Bu, özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- Baseline HEAD `a2159018c46cfae36605f90cd6bf08813d15bef3` (güncel HEAD ile aynı). Review sonrası diff özeti (md5) ve izlenmeyen test dosyası değişmedi → review güncel.
- Okunan: 476 satırlık diff'in tamamı (`docs/features/**` hariç), izlenmeyen `EngineeringNodeInspector.test.tsx`, `EngineeringNodeInspector.tsx` güncel hâli, plan, önceki review, `frontend/` içi CSS/sınıf aramaları. Reviewer komut çalıştırmadı; `npm test` 79 dosya/584 test, build OK ve değişen dosyalarda lint uyarısı yok bilgisi koordinatör beyanıdır. Elle Chromium kontrolü yapılmadı. Wind ve Family kodu 1. turdan beri değişmedi.
- Üç takip onarımı feature planı dışında yapıldı; `implementation.md`'ye "Takip onarımları" bölümü olarak işlendi.

## 1. turdaki bulguların durumu
- **P3-1 ÇÖZÜLDÜ:** `EngineeringNodeInspector.tsx:72-75` `validationClass` (VALID→success; FAILED/INVALID/ERROR→error; diğer→`state-idle`), kullanım `:67`. `.state-idle` için `frontend/` içinde CSS kuralı yok → nötr; `[class*="state-"]` biçiminde eşleyen seçici yok. `NO VALID CANDIDATES` ve `INCOMPLETE` artık düğüm success olsa da yeşil değil. Testler `EngineeringNodeInspector.test.tsx:29-56`. `states` prop'u artık destructure edilmiyor ama `Props` tipinde kalıyor (`:15`), zararsız.
- **P3-2 ÇÖZÜLDÜ:** `summarizeValidation` saf ve export edilmiş (`graph/family/familyResults.ts:65-70`), Inspector import ediyor, tek tanım var; mantık plan §3.2/D-2 ile aynı; testler `familyResults.test.ts:60-77` önerilen tüm karışık durumları (`[VALID,INCOMPLETE,INVALID]`, `ERROR > INCOMPLETE`, `[{},VALID]`, `[VALID,PENDING]`, `[PENDING,INCOMPLETE]`, boş liste) kapsıyor.
- **P3-3 ÇÖZÜLDÜ:** `EngineeringNodeInspector.test.tsx:69-80` aynı girdiyle (`previewDesignOutput(value,'candidates',{H:[]})`) gerçek mesajı üretip uyarıyı `.spn-engineering-family` içinde arıyor ve `toBe(expected)` ile tam eşleşmeyi, tek uyarı olduğunu doğruluyor.

## Yeni bulgular
Yok. Üç onarımda regresyon görülmedi (`graphFamilyPresentation.ts` aynı kuralı kullanıyor; Inspector `validCount`/`validation` hesabı değişmedi; abutment yolu etkilenmedi).

## Belirsiz hipotezler (bulgu değil)
- Bir aday `validationStatus: ''` taşırsa `isCandidateValid` false döner, `summarizeValidation` `''` döndürür; Validation satırı boş/nötr görünür. Üreticilerin boş string ürettiği doğrulanmadı; yanlış-VALID üretmez.
- Çapraz sekmede yanlış STALE hipotezi (1. tur) aynen geçerli; muhafazakâr yönde, yanlış-VALID riski yok.

## Kabul kriterleri
AC1 yalnızca beyan. AC2-AC5 karşılandı (kod değişmedi). AC6 karşılandı (karışık durum birim testli, renk doğru). AC7 karşılandı, mesaj kaynağı ve FAMILY konumu kanıtlı. AC8 karşılandı. AC9-AC11 karşılandı (Wind diff değişmedi). AC12 diff'e göre yasaklı dosya yok; yeni localStorage anahtarı, `schemaVersion` değişikliği veya mühendislik değeri yok. AC13 koordinatör beyanı. AC14 karşılandı.

---

# Önceki tur (1. tur): CHANGES_REQUESTED
P3-1 (Validation rengi düğüm durumundan geliyordu), P3-2 (karışık önem sırası testsiz), P3-3 (önizleme istisnası testi mesaj kaynağını kanıtlamıyordu) — hepsi yukarıda çözüldü olarak işaretlendi. Ayrıntılı 1. tur metni aşağıdadır.

# Review: g2 (C-006-04, C-007-04, C-010-04)

**Karar: CHANGES_REQUESTED** (yalnızca P3 düzeyinde bulgular; P0/P1/P2 yok, yanlış-VALID riski görülmedi). Bu, özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- Baseline HEAD `a2159018c46cfae36605f90cd6bf08813d15bef3` (güncel HEAD ile aynı). Çalışma alanı review sonrası değişmedi (git status özeti aynı) → review güncel.
- Okunan: request/plan/implementation, 438 satırlık diff'in tamamı, izlenmeyen `EngineeringNodeInspector.test.tsx`, değişen kaynak dosyaların güncel hâlleri, bağlam dosyaları (`GraphWorkspace.tsx`, `graphStore.ts`, `nodeRegistry.ts` preview fonksiyonları, `App.css`).
- Reviewer komut çalıştırmadı. `npm test` 574/574 ve build OK koordinatör tarafından yeniden çalıştırıldı; lint yalnızca uygulayıcı beyanı. Elle Chromium kontrolleri yapılmadı; çapraz sekme ve Project ekranından birim değişimi senaryolarında App düzeyinde entegrasyon testi yok.
- Diff'te yasaklı dosya yok; yeni localStorage anahtarı, `schemaVersion` değişikliği veya yeni mühendislik sabiti/kuralı yok (`WIND_DREF_M = 3` zaten vardı).

## Bulgular
### P3-1: Inspector "Validation" değeri geçerli değilken yeşil renkte olabiliyor
- Konum: `frontend/src/features/graph/ui/EngineeringNodeInspector.tsx:68` (`className={`state-${errors[node.id] ? 'error' : state}`}`), `frontend/src/app/styles/App.css:1889` (`.state-success`).
- Senaryo: Precast girder (A-05) veya yerel malzemeli steel girder başarılı Run'dan geçer, düğüm `state='success'` olur; metin doğru biçimde `INCOMPLETE` yazar ama yeşil "success" rengiyle çizilir. `FAILED` (previewError) ve aday kaynaklı `INVALID` için de aynı.
- Öneri: Sınıfı `validation` değerinden türet (`VALID` → success; `FAILED`/`INVALID`/`ERROR` → error; diğerleri nötr) ve küçük bir test ekle.

### P3-2: Karışık önem sıralaması (D-2) test edilmemiş
- Konum: `EngineeringNodeInspector.tsx:73-78` (`summarizeValidation`); testler yalnızca hep-VALID (pier) ve hep-INCOMPLETE (steel girder) yollarını sınar.
- Etki: `INVALID/ERROR > INCOMPLETE > diğer` önceliği ve "VALID yalnızca hepsi geçerliyse" kuralı karışık durumda korunmuyor; öncelik bozulursa testler yeşil kalır. AC6'nın bu kısmı karışık durumda kanıtlanmamış.
- Öneri: `summarizeValidation`'ı saf yapıp export et (veya `familyResults.ts`'e taşı); birim test: `[VALID, INCOMPLETE, INVALID]`→`INVALID`; `[VALID, INCOMPLETE]`→`INCOMPLETE`; `[{}, VALID]`→`VALID`; `[VALID, 'PENDING']`→`PENDING`.

### P3-3: Önizleme istisnası testi mesajın kaynağını kanıtlamıyor
- Konum: `EngineeringNodeInspector.test.tsx:40-46`.
- Test yalnızca `getByRole('alert')` öğesinin boş olmayan metin içerdiğini kontrol ediyor; metnin yakalanan istisna mesajı olduğunu (`previewError`'un FAMILY bölümünde göründüğünü) doğrulamıyor. AC7'nin "mesaj FAMILY bölümünde görünür" kısmı zayıf kanıtlı; etki düşük.
- Öneri: Alert'i `.spn-engineering-family` içinde ara ve beklenen hata metni kalıbıyla karşılaştır.

## Belirsiz hipotezler (bulgu değil)
- Çapraz sekmede yanlış STALE (muhafazakâr yön): `graphStore.ts:73` storage olayında graph'ı JSON'dan yeniden okuyor; düğüm parametrelerinde `undefined` varsa `stableStringify` (`familyResults.ts:120`) çıktısı round-trip sonrası değişebilir, başka sekmedeki ilgisiz değişiklik Family'de yanlış STALE üretebilir. Yön güvenli (asla yanlış VALID) ve `GraphWorkspace.tsx:50` da aynı davranışta. Parametrelerde gerçekten `undefined` olup olmadığı doğrulanmadı.
- Inspector "Invalid" anlamı: `invalidCombinations` reddedilen kombinasyonları sayar, `INCOMPLETE` adayları saymaz; girder için "Count N / Valid 0 / Invalid 0" görülebilir. Önceden de böyleydi, kapsam dışı.

## Yanlış-STALE riski (FamilyResultsViewer ↔ GraphWorkspace)
Kaynak incelemesiyle eşdeğerlik doğrulandı: Run parmak izini store'daki `graph` ve App `project.units` ile üretir (`GraphWorkspace.tsx:86-95`); viewer de aynı graph store ve aynı App `project.units` değerini kullanır (`WorkspacePage.tsx:18,21`). `currentFreshness` saklanan STALE/FAILED'ı yükseltmez (`familyResults.ts:69-72`); eşleşmeyen INCOMPLETE/NO_RESULT STALE'e düşer (muhafazakâr). Aynı bridgeId'li birden fazla doküman varsa `find` ilkini seçer (değişiklikten önce de böyleydi).

## Kabul kriterleri
| AC | Değerlendirme |
|---|---|
| AC1 | Yalnızca beyan; doğrulanmadı |
| AC2 | Karşılandı (`FamilyResultsViewer.test.tsx:104-112`, kod `FamilyResultsViewer.tsx:23,26`) |
| AC3 | Parametre değişimi testli (`:113-120`); bağlantı değişimi testsiz, fingerprint bağlantıları içerdiği için kod incelemesiyle karşılanıyor |
| AC4 | Karşılandı; test parmak izini elle üretiyor, gerçek Run→Family entegrasyonu testli değil, eşdeğerlik kaynakla gösterildi |
| AC5 | Karşılandı (`familySnapshotStore.ts:23-26`, testler `:279-305`) |
| AC6 | Kod doğru; karışık durum testsiz (P3-2), renk sorunu (P3-1) |
| AC7 | Karşılandı, kanıt zayıf (P3-3); dirty graph davranışı `executionDisplay` ile korunuyor |
| AC8 | Karşılandı (`EngineeringNodeInspector.tsx:41,68`, test `:29-38`) |
| AC9 | Karşılandı (`WindLoadsPanel.tsx:27-28`, testler `:44-66`) |
| AC10 | Karşılandı (test `:52-60`, `onSnapshot` 1 kez) |
| AC11 | Korunmuş |
| AC12 | Diff'e göre karşılandı |
| AC13 | Test/build koordinatörce yeniden çalıştırıldı; lint yalnızca uygulayıcı beyanı |
| AC14 | Karşılandı |

## Not
Graph precast girder Inspector'ı artık `INCOMPLETE` / Valid 0 gösteriyor; plan §8 bunu kabul edilmiş risk olarak listeliyor, A-05 hâlâ açık. Koordinatör P3-1 ve P3-2'yi kabul edilebilir risk sayarsa PASS'e yükseltilebilir; düzeltme istenirse refactor-implementer ayrı ve açık bir komutla çağrılmalıdır (otomatik düzeltme yok).
