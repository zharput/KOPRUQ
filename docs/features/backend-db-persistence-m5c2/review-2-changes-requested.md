# İnceleme (2. tur): `backend-db-persistence-m5c2` (M5c geçişi)

**Karar: CHANGES_REQUESTED.** Önceki P2-1, P3-4, P3-5 ve P3-6 kapanmış. Ancak P3-1 için yapılan "Pier başlangıç taslağı" düzeltmesi, kullanıcı kararı D14/Q2'den sapıyor ve bu sapma için kayıtlı bir karar yok; yeni P2 (P2-A). İki yeni P3 daha var. "Hatasız" denemez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). İlk tur raporu `review-1-changes-requested.md` olarak saklandı (P2-1, P3-1..P3-6, H1–H3).

## Kapsam ve sınırlar
- Baseline HEAD `d221191b6e9f3d24a6b185be0f2456c477fc3ddb` = güncel HEAD. Kaynak anlık görüntüsü (docs/features/** hariç) inceleme öncesi ve sonrası aynı: `9099ed93dd1af55f7a6df7589ee748d1207f30b4`; durum listesi (102 satır) aynı. Rapor bayat değil.
- Okunanlar: 5193 satırlık diff'in tamamı (silinen `app/project-file/*` gövdeleri yalnızca silme olarak tarandı), 10 untracked dosyanın tamamı, ayrıca `serverSection.ts`, `familyWire.ts`, `PreferredSpanPanel.tsx`, `useProjectModule.ts`, `projectModuleStore.ts`, `MaterialsPanel.tsx`, `GirderLibraryPanel.tsx`, `PierFamiliesPanel.tsx`, `pier-families/model/service.ts`, `sourceEncoding.test.ts`, `.editorconfig`, üst plan D14/Q2 (`backend-db-persistence-m5/plan.md:226-228, :609`).
- Reviewer'ın koşamadıkları: build, `npm test` (117 dosya / 1088 test), lint, `tsc -b`, `mvn package`, `layerRules`, `sourceEncoding`. Takip turlarındaki sayılar implementer raporuna dayanıyor; koordinatörün bağımsız yeniden koşusu yalnızca ilk teslim için yapıldı. Bu rapor için güncel tam kontrol koordinatör tarafından yeniden koşulmadı.
- Gerçek tarayıcı/backend ile elle kontrol yapılmadı. Grep: yeni `.only/.skip/.todo` yok; production'da `caches`, `document.cookie`, `navigator.storage` yok; durum listesinde `backend/**` ve `package.json` yok.

## Önceki bulguların durumu
| Bulgu | Durum | Not |
|---|---|---|
| P2-1 Materials/Girder bölüme reaktif değil | **Kapandı** | `MaterialsPanel.tsx:45-46` `useFamilyCatalog('MATERIAL', …)`, `GirderLibraryPanel.tsx:64-67` `useProjectModuleValue(GIRDER_LIBRARY_MODULE)` ile türetiyor; D9 mount yazması yalnızca mount'ta (`[]`), bildirime tepki yazması yok. Regresyon testleri eski yerel `useState` koduyla başarısız olurdu |
| P3-1 RECT-M yalnızca Pier panelinde | Tutarsızlık giderildi, **yeni P2-A'ya dönüştü** | Aşağıda |
| P3-2 Ctrl+N tarayıcı | **Açık** | `TopWorkspaceNav.tsx` değişmedi; elle kontrol |
| P3-3 Kilitli karar varken Ctrl+O/N | **Açık** | `App.tsx:133` koşulsuz açıyor |
| P3-4 Test kanıtı | **Kapandı** | `useUrlProjectId.test.tsx`, Preferred span tam 1 PUT / 4 varyant, 16 bölüm + graph yeniden açılış eşitliği, fake API ifadesi düzeltildi |
| P3-5 Ratchet | **Kapandı** | Yeni semboller + pozitif/look-alike testler. `\bcaches\b` ileride yanlış pozitif verebilir (bulgu değil) |
| P3-6 implementation.md sayı | **Kapandı (rapor)**; aynı hata `architecture.md`'de (P3-C) | |
| H1, H3 | Açık (hipotez) | Değişmedi |
| H2 | Açık (hipotez) | İlişkili doğrulanmış kusur için P3-B |

## Yeni bulgular

### P2-A — Pier başlangıç taslağı D14/Q2 kullanıcı kararını değiştiriyor; taslak düzenlemeleri kaydedilmiyor ve uyarısız kaybolabiliyor
- **Yer:** `frontend/src/features/pier-families/components/PierFamiliesPanel.tsx:14-15, 22-25` (taslak yerel `useState`; `isDraft` iken `update` yalnızca `setDraft`), `:37` ("Henüz projeye kaydedilmedi… sayfadan ayrılırsanız taslak değişiklikleri kaybolur"), `:43` (`Add Pier` `status !== 'VALID'` iken pasif), `docs/architecture.md:3327`.
- **Senaryo:** Yeni projede RECT-M düzenlenir, aile henüz VALID değildir (örn. yükseklik aralığı eksik); kullanıcı başka alana geçer ya da sekmeyi kapatır → düzenlemeler kaybolur. Bekleyen yazma olmadığı için `useBeforeUnloadWarning` uyarmaz, gösterge "Kaydedildi" kalır. Eksik (INCOMPLETE/INVALID) ilk aile hiç kaydedilemez, oysa ikinci ve sonraki aileler eksik haliyle de kaydediliyor (`setFamilies` doğrudan yazıyor).
- **Etki:** Üst plan D14 (`:226-228`, Q2 `:609`) "kullanıcı düzenleyene kadar yazılmaz" diyor, yani düzenleme yazılmalı. Yeni davranışta yalnızca doğrulama kapısından geçen "Add Pier" yazıyor. Ürün/davranış değişikliği: yeni kayıt kapısı, yeni Türkçe metinler, kaydedilen ailenin id'si artık `RECT-M` değil `PIER-<zaman>`. implementation.md'de buna dair kullanıcı kararı kaydı ve "Deviations" girdisi yok. Plan AC9'un metni ("RECT-M görünür, bölüm undefined, 0 PUT") karşılanıyor ama D14'ün ikinci yarısı karşılanmıyor.
- **Kanıt:** `update` dalı `if (isDraft) setDraft(...)`; `PierFamiliesPanel.test.tsx` "keeps edits to the starter draft local until a valid family is added" bu davranışı sabitliyor. Önceki M5c kodu taslak düzenlemesini `useFamilyCatalog` setter'ı ile yazıyordu.
- **Bozulmayanlar:** Yeni mühendislik kuralı uydurulmamış (kapı mevcut `statusOfPierFamily`, `service.ts:21-29`); kayıtlı Pier kataloglarının id'leri ve legacy `pierType` (`H_TYPE`) gösterimi bozulmuyor.
- **Öneri:** Kullanıcıya açıkça sorulup kararı kayda geçirilsin: (a) D14'e uyum: taslağın ilk düzenlemesinde `[draft+patch]` bölüme yazılsın (`RECT-M` id'si korunabilir), mount'ta 0 PUT korunur; (b) taslak davranışı kabul edilirse karar implementation.md'ye ve plan sapmalarına yazılsın, kaydedilmemiş taslak için en azından gezinme/`beforeunload` uyarısı düşünülsün.

### P3-B — Preferred span: ilk ziyaret yazması atıldıktan (Discard) sonra panel düzenlemeleri kaybediyor
- **Yer:** `frontend/src/features/preferred-span/components/PreferredSpanPanel.tsx:55` (`visibleRules` = `ensureRules(rules…)` yalnızca görüntü), `:58-60` (`ensureRules` yazması yalnızca `[type, variants]` değişince), `:68-70` (`updateRule` = `previous.map(...)`); `useProjectModule.ts:18` (`previous` = `read() ?? NO_RULES`).
- **Senaryo:** Panel ilk ziyarette 4 kuralı yazar (D9), PUT 500 alır → kullanıcı "Değişiklikleri at" seçer → bölüm `undefined`'a döner, panel hâlâ dört satırı gösterir ama effect yeniden çalışmaz → kullanıcı Min Span'ı değiştirir → `updateRule` boş `NO_RULES` üzerinde `map` yapar ve `[]` yazar (gereksiz `PUT preferred-span-rules []`), düzenleme ekranda kaybolur; panel remount edilene kadar düzenlenemez.
- **Etki:** Kullanıcı düzenlemesi sessizce kayboluyor; kalıcı veri bozulması yok (remount D9 ile düzeltir). Discard M5c ile geldiği için M5c'de ortaya çıkıyor; P2-1 ile aynı sınıf, bu panelde ele alınmamış.
- **Öneri:** `updateRule` görünen kurallardan (`ensureRules(previous, variants, type)`) türetsin, ya da `ensureRules` effect'i `rules` `undefined`'a döndüğünde de çalışsın. Discard sonrası düzenlemeyi sınayan test eklensin.

### P3-C — `architecture.md` silinen test sayısını yanlış veriyor
- **Yer:** `docs/architecture.md:3334` ("`sessionLayerUnwired.test.ts` and the nine `app/project-file` tests were deleted"). Durum listesinde `app/project-file` altında 8 test dosyası var (toplam 9 dosya, sekizi bu dizinde). **Öneri:** "eight".

## Belirsiz hipotezler / gözlemler (bulgu değil)
- H1 (`navigate()` ile uçuştaki Open iptali), H3 (`graphStore.addNode` commit başarısızken id döndürüyor): açık hipotez.
- Satır sonları: `GirderLibraryPanel.test.tsx` ve `useUrlProjectId.test.tsx` LF; diğer dokunulan dosyalar CRLF. `.editorconfig`'de `end_of_line` kuralı yok, `sourceEncoding` testi satır sonuna bakmıyor; somut etkisi yok ama implementation.md'deki "All touched files re-normalised to CRLF" ifadesi bu iki dosya için geçerli değil.
- `MaterialsPanel.tsx:47` açıklaması ("so the project becomes dirty") eski kavramı kullanıyor; kozmetik.

## Kısa teyit
`useSyncExternalStore` kararlılığı (`useFamilyCatalog` kategori başına önbellekli fallback; `useProjectModuleValue` doğrudan `module.read`; bridge-definition/graph memo'ları değişmedi), `onProjectSwitch` dinleyicileri, `setBridges` sırası, D6 katmanı, rüzgâr `requireFinite`, Reload koruması, `ProjectListDialog` odak çözümü hâlâ geçerli. Katman kuralı ihlali yok; mühendislik değeri/birim/varsayılan değişmedi.

## Kabul kriterleri
| AC | Durum | Not |
|---|---|---|
| AC1–AC3, AC5, AC7, AC8, AC10–AC13, AC15, AC17 | Karşılanıyor | |
| AC4 | Karşılanıyor | 16 bölüm + graph yeniden açılış eşitliği tam |
| AC6 | Büyük ölçüde | Materials/Girder Discard düzeldi; Preferred span kenar durumu (P3-B) |
| AC9 | Metin olarak karşılanıyor, karar sapması var | D14 "düzenlenince yaz" kısmı ihlal (P2-A) |
| AC14 | Karşılanıyor | Adaptör birim testi eklendi |
| AC16 | Kısmen | Gerçek tarayıcıda Ctrl+N riski (P3-2) |
| AC18 | Rapor | Reviewer koşmadı; takip turu sayıları implementer raporundan |
| AC19 | Karşılanıyor | Küçük sayı hatası (P3-C) |

## implementation.md ile kod arasındaki farklar
1. P3-1 takibi kullanıcı kararı olmadan D14'ü değiştiriyor; "Deviations from the plan" listesinde yok (P2-A).
2. "Files > New" listesi `GirderLibraryPanel.test.tsx` ve `useUrlProjectId.test.tsx` dosyalarını içermiyor.
3. "All touched files re-normalised to CRLF" iki yeni test dosyası için doğru değil.
4. P2-1 ve P3-4/5/6 anlatımları kodla uyumlu.

## Elle kontrol ve riskler
- Gerçek backend ile uçtan uca kontrol (plan 6.2 / üst plan 7.2); rüzgâr adımında `PUT loads/wind-snapshot` gövdesinde `result` görülmeli.
- Gerçek tarayıcıda Ctrl+N/O/S ve `beforeunload`; Pier taslağı düzenlenip sayfadan çıkıldığında uyarı yok (P2-A).
- Kilitli karar varken Ctrl+O/N (P3-3).
- Bölümler arası atomiklik yok (kabul edildi); büyük graph sürükleme maliyeti ölçülmedi; aktif graph id yeniden açılışta korunmuyor.
- Backend'in sonlu olmayan rüzgâr değerini nasıl işlediği doğrulanmadı (yerel ret kapsıyor).
