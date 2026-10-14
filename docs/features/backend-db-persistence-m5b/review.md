# İnceleme: backend-db-persistence-m5b (dördüncü inceleme, Y1 ve nit düzeltmelerinden sonra)

**Karar: CHANGES_REQUESTED.** P0, P1 ve P2 bulgu yok; üç yeni P3 bulgu ve birkaç nit var.

- **Y1 kodda çözülmüş.** Listeden yapılan Open'ın `fromUrl=false` olduğu yolların hepsi URL'yi oturum id'sine geri yüklüyor. Ancak bunu mümkün kılan `restoredUrlRef` işaretini hiçbir test fiilen çalıştırmıyor (YB1).
- İşaret, oturum yokken yapılan New'da bir geçiş anı gerilemesine yol açıyor (YB2).
- Önceki incelemenin 1-6 numaralı nitlerinin çoğu çözülmüş. Cancel ile Reload hipotezi ele alınmamış ve belgelenmemiş.

Uygulama hâlâ bağlı olmadığı için (D1) bugün kullanıcıya ulaşan bir etki yok. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). Önceki incelemeler: `review-1-pre-fix.md`, `review-2-pre-fix2.md`, `review-3-pre-fix3.md`.

## Kapsam ve sınırlar
- **Baseline:** HEAD `1b812413f5c18d64031015eb23a00de1b967d92f` (güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `16f76654078bad031826dc7df96eabc8fece6903`; rapor bayat değil.
- **Not (durum):** Üçüncü incelemeden sonra controller kaynakları, testler ve belgeler bu oturumun implementer raporu dışındaki bir kaynaktan diskte değiştirilmiş (`implementation.md`'de "Third review follow-up: Y1" ve "Review nits follow-up" bölümleri var). Reviewer **güncel disk içeriğini** esas aldı. Koordinatör bu durumda: build çıkış 0, lint çıkış 0, `npm test` 119 dosya / 1184 test (öncesi 1176); `git diff --name-only 1b81241 -- frontend/src` yalnızca `frontend/src/app/styles/App.css`; `backend/`, `package.json`, lock dosyası değişmedi.
- **Tamamını okunanlar:** `useProjectSessionController.ts` (277 satır) ve testi (653 satır, 50 test); `ProjectListDialog.tsx` + testi, `NewProjectDialog.tsx`, `SaveStatusIndicator.tsx` + testi, `ProjectLoadScreen.tsx`; `useProjectList.ts` + testi, `projectSections.ts`, `projectDisplay.ts`, `saveStatusText.ts`; `activeProject.ts`, `useSaveStatus.ts` + testi; yedi bölüm örneği dosyası ve `18-project-session.css`; `fakeProjectApi.ts`, `projectSessionTestUtils.ts`, `setup.ts`, `sessionLayerUnwired.test.ts`; `noBrowserStorage.test.ts` `ALLOWED_FILES`; `implementation.md` (tamamı), `review-3-pre-fix3.md`, plan K5-K7, `architecture.md:3290-3303`, `roadmap.md:1924`.
- **Yeniden okunmayanlar:** `projectSections.test.ts`, `projectDisplay.test.ts`, `saveStatusText.test.ts`, `serverSectionInstances.test.ts`, `fakeProjectApi.test.ts`, `NewProjectDialog.test.tsx`, `ProjectLoadScreen.test.tsx`, `activeProject.test.ts` ve M4 modülleri (bu turda değişmedikleri bildirildi; önceki incelemelere ve yeşil koşuya dayanılıyor).
- **Çalıştırılamayanlar:** reviewer build/lint/test/git çalıştıramadı; "eski kodda düşer" ve `act` çıkarımları akıl yürütmeye dayanıyor.

## Önceki bulgular ve durumları
| Bulgu | Durum | Kanıt |
|---|---|---|
| **Y1** Liste Open'ı URL kaynaklı Open'ı süpersede edince URL dönmüyordu | **Kodda çözüldü; mekanizma testsiz (YB1)** | `runOpen` iki noktada `restoreUrlBeforeSupersedingOpen()` çağırıyor: açık id için `:159`, öteki durumlarda `start`'tan önce `:163`. Yeni `restoredUrlRef` işareti (`:69`, `:95`, `:256-260`), kontrolcünün kendi geri yüklemesinden sonra URL effect'inin `runOpen(A, true)` ile `cancelPendingOpen` çağırıp yeni Open'ı iptal etmesini engelliyor. Yollar: cancelPendingOpen dalı test `:504-512`; gate hatası + Cancel `:514-526`; GET 404 `:487-502`; açık id seçimi `:504`. Üç test de eski kodda düşerdi (URL B'de kalırdı). Hata yollarında tek `setUrl`; başarı yolunda iki çağrı (önce A `:96`, sonra C `:115`), replace semantiğinde zararsız. |
| Hipotez: Cancel, uçuştaki Reload'u sessizce düşürüyor | **Ele alınmadı, belgelenmedi** | `reloadProject` (`:189-195`) hâlâ `pendingRef` kontrol etmiyor; `resolvePendingSwitch('cancel')` (`:226-230`) sayacı koşulsuz artırıyor. Plan `:287` bu kontrolü yalnızca new/open/exit için istiyor (plana uygun) ama `implementation.md` hipotezden hiç söz etmiyor. |
| Nit-1 ProjectListDialog'da Kapat busy iken etkin | **Çözüldü** | `ProjectListDialog.tsx:45` `disabled={busy}`; test `ProjectListDialog.test.tsx:82-89`, eski kodda düşerdi. Yan etkisi nitlerde. |
| Nit-2 Süpersede asılı POST'ta `creatingRef` takılı | **Çözüldü** | Koruma artık isteğe bağlı: `creatingRef.current === requestRef.current` (`:178`); temizleme yalnızca kendi isteğine (`:186`, `:218`); `resume` içinde `creatingRef = request` (`:217`). Test `:131-149`: eski boolean korumada ikinci POST hiç gitmez, `waitFor(pending('POST') === 2)` zaman aşımına düşerdi. Eşzamanlı New testi `:102` hâlâ geçerli. |
| Nit-3 `PendingSwitch` tip sapması belgelenmemişti | **Çözüldü** | `implementation.md` "Deviations" 7. madde. |
| Nit-4 `afterEach` ile RTL `cleanup` sırası | **Çözüldü** | Önce `cleanup()`, sonra reset: controller testi `:22`, `ProjectListDialog.test.tsx:13`, `useProjectList.test.tsx:11`, `useSaveStatus.test.tsx:6`. |
| Nit-5 architecture.md'de "bulunamadi" | **Çözüldü** | `architecture.md:3298` artık "Proje bulunamadı". |
| Nit-6 Test boşlukları | **Çözüldü; biri zayıf** | POST 404 metni testi `:81-87`. "URL null iken bekleyen liste Open'ı" testi `:464-477`; `:263`'ü tek başına kilitlemiyor (nitler). |
| F1–F7, N1, N2 | **Sonuç durumlarında gerileme yok** | F1 `:240` (`retry`+`flush`); F2 `:138-142`; F3 `:154-156`; F4 `:264`; F5 `:131`, `:178`; F6 `:158-160`, `:84-90`; N1 `:226-230`, `:241-244`; N2 `:179`, `:192`, `:199`; ilgili testler yerinde. İstisna: New'ın geçiş anı (YB2). |

## Yeni bulgular

### YB1 — P3 — `restoredUrlRef` işaretini hiçbir test fiilen çalıştırmıyor
- **Yer:** `useProjectSessionController.ts:69`, `:95`, `:256-260`; testler `useProjectSessionController.test.tsx:487-545`.
- **Kanıt:** Y1 testlerinde liste Open'ı ve sonucu aynı `await act(async () => { … })` bloğunda gerçekleşiyor (`:492-497`, `:508`, `:520`, `:535-540`). React'in async `act`'i, kuyruğa alınan render ve effect'leri callback çözülene kadar çalıştırmıyor (React 19.2; akıl yürütmeye dayanıyor). Bu yüzden URL effect'i, Open bitip `finish` `inFlightTargetRef`'i null yaptıktan sonra çalışıyor; o noktada `cancelPendingOpen` zaten boş işlem. Sonuç: `:256-260` silinse bile 50 testin hepsi geçer. `:528` "still opens a valid list selection" testi eski kodda da geçer ve işaret yolunu çalıştırmaz.
- **Senaryo:** Gerçek tarayıcıda `setUrl(A)` ile GET C'nin dönmesi arasında React render alıyor. İşaret bir refactor'da kaybolursa effect `runOpen(A, true)` → `cancelPendingOpen()` çağırır ve liste Open'ı C sessizce iptal edilir; `busy` false olur, hata gösterilmez, C hiç açılmaz; testler yeşil kalır.
- **Etki:** Y1'in başarı yolunu koruyan tek mekanizmanın gerileme koruması yok. Uygulama bağlı olmadığı için bugün kullanıcıya ulaşmıyor.
- **Öneri:** Bir test önce `act(async () => { opening = openProject(C); await vi.waitFor(() => pending('GET') === 2) })` çalıştırsın ve act'i kapatıp effect'in çalışmasına izin versin; sonra ayrı bir `act` içinde GET C serbest bırakılsın; beklenti `projectId === C`, `url === C`. Aynı ayrıştırma "gate beklerken" için de yapılsın.

### YB2 — P3 — Proje açık değilken URL kaynaklı Open'ı süpersede eden New, POST boyunca eski id'nin "yükleniyor" ekranını gösteriyor
- **Yer:** `useProjectSessionController.ts:179` (New'daki geri yükleme), `:256-260` (işaretin effect'i atlatması), `:264` (atlanan `setLoad(idle)`), `:268` (faz türetimi).
- **Kanıt:** Oturum null, URL B, GET B uçuşta iken New çağrılıyor: (1) `restoreUrlBeforeSupersedingOpen` `restoredUrlRef = null` yapıp `setUrl(null)` çağırıyor; (2) effect işaret yüzünden erken dönüyor, `:264`'teki `setLoad(idle)` çalışmıyor; (3) `load` `{loading, B}` olarak kalıyor ve faz `loading B` oluyor, URL artık null. N2 sürümünde (işaret yokken) effect `load`'u idle yapıyordu, faz `welcome` idi. Test `:89-100` yalnızca POST bittikten sonraki durumu kontrol ediyor (`createNow` `:135`/`:140`'ta `load`'u temizlediği için geçiyor).
- **Senaryo:** URL'deki B'ye derin bağlantıyla gelinmiş, GET B yavaş, kullanıcı Yeni proje'yi tetikliyor. POST sürdüğü sürece `ProjectLoadScreen` "Proje yükleniyor…" ve B'nin kısa id'sini gösteriyor; URL ve faz tutarsız. POST asılı kalırsa ekran öyle takılı kalıyor (`http.ts` istemcisinde zaman aşımı yok); loading ekranında eylem düğmesi yok (`ProjectLoadScreen.tsx:8`).
- **Etki:** Yanıltıcı ve geçici UI durumu; veri kaybı yok.
- **Öneri:** `restoreUrlBeforeSupersedingOpen` veya `start(null)` çağıran yollarda (New, Exit, Reload) `setLoad({ kind: 'idle' })` doğrudan çağrılsın; ya da işaret yalnızca `runOpen`'dan konulsun. Test: oturum null, GET B ve POST bekletilirken act'ler ayrıştırılsın, faz `welcome` doğrulansın.

### YB3 — P3 — architecture.md üçüncü takip turunu ve nit değişikliklerini yansıtmıyor (AC20)
- **Yer:** `docs/architecture.md:3299-3300`.
- **Kanıt:** `:3300` URL geri yüklemesini yalnızca "New, Exit and conflict Reload" için anlatıyor; liste Open'ının da URL'yi geri yüklemesi (Y1) ve `restoredUrlRef` sözleşmesi belgede yok; isteğe bağlı New koruması ve busy iken devre dışı Kapat da yazılmamış. `implementation.md` belge güncellemesi iddia etmiyor (yanlış iddia yok, yalnızca belge eksik).
- **Öneri:** "M5b third review follow-up" satırı eklensin: liste Open'ı URL'yi geri yüklüyor, kontrolcü kendi URL geri yüklemesini işaretliyor, New koruması isteğe bağlı, busy iken Kapat devre dışı.

## Nitler (P3'ün altında)
1. **`:464` testi `:263`'teki `cancelPendingOpen`'ı tek başına kilitlemiyor.** `setUrl(A)`'dan sonraki effect `runOpen(A, true)` → `:160` zaten iptal ediyor; `:263`'teki çağrı silinse de test geçer. Test boşluğu yalnızca davranış düzeyinde kapanıyor.
2. **Kapat'ın devre dışı olmasının yan etkileri:** Diyalog busy iken açılırsa `autoFocus` devre dışı düğmeye odaklanamıyor, diyalogda odak olmuyor; busy bittikten sonra Escape (`onKeyDown` section üzerinde) odak içeri girene kadar çalışmıyor. İstek asılı kalırsa (zaman aşımı yok) diyalog kapatılamıyor, satırlar da devre dışı. M5c bağlamasında ebeveynin `onOpen`'dan sonra diyaloğu kapatıp kapatmadığına bakılmalı.
3. **Başarılı liste Open'ı iki kez `setUrl` çağırıyor (A, sonra C).** Replace sözleşmesinde zararsız; M5c'deki URL adaptörü push kullanırsa fazladan geçmiş girdisi oluşur (sözleşme `:16` bunu zaten yasaklıyor).
4. **Cancel ile Reload hipotezi sürüyor.** Ek olarak, gate bekleyen bir Open varken başarılı bir Reload `setPending(null)` ile o geçişi sessizce düşürüyor; bu davranış belgelenmemiş.
5. **Kuramsal, sözleşme ihlali gerektiren durum:** Host `setUrlProjectId`'yi senkron uygulamazsa `restoredUrlRef` bayat kalabilir; URL sonradan aynı id'ye döndüğünde effect yanlışlıkla atlanır. Sözleşme `:16` bunu dışlıyor ama işaretin bir tüketilme garantisi yok.

## Testlerin anlamlılığı
- **Eski kodda düşenler:** `:81`, `:131`, `:487`, `:504`, `:514` ve `ProjectListDialog :82`; totolojik değil.
- **Eski kodda da geçenler:** `:464` ve `:528` kapsama ve pozitif kontrol testi (`:528` işaret yolunu çalıştırmıyor, YB1); `:81` kapsama testi ama POST hata metni `describeLoadError`'a kayarsa düşer, anlamlı.

## AC kapsamı
| AC | Durum | Not |
|---|---|---|
| AC1–AC7 | Karşılandı | Bu turda değişmedi |
| AC8 | Karşılandı | POST 404 metni artık testli. YB2 geçici faz sorunu |
| AC9 | Karşılandı | |
| AC10 | Karşılandı | Cancel/Reload hipotezi açık |
| AC11, AC12 | Karşılandı | |
| AC13 | Karşılandı | Y1 kodda çözüldü; mekanizma testsiz (YB1) |
| AC14 | Karşılandı | Kapat busy iken devre dışı (plan `:323` ile tutarlı); odak notu yukarıda |
| AC15–AC18 | Karşılandı | Bu turda değişmedi |
| AC19 | Karşılandı | `noBrowserStorage` `ALLOWED_FILES` 17 giriş; yeni dosyalarda `WindSnapshotInputsValue`/depolama sembolü yok; `sessionLayerUnwired` 18 modül listeliyor; bölüm örneği dosyaları çalışma zamanında yalnızca `activeProject` ve kendi wire dosyasını import ediyor (`familyServerSections` ek olarak `familyRepository`'den yalnızca bir tip); git diff/status koordinatörce doğrulandı |
| AC20 | Kısmen | architecture.md üçüncü turu yansıtmıyor (YB3); roadmap `:1924` doğru |

## implementation.md ile kod arasındaki farklar
- Test sayısı tutarlı: "useProjectSessionController (50 tests)" iddiasına karşılık sayılan test sayısı da 50; Y1 için +4 (1176 → 1180), nitler için +4 (→ 1184) iddiası eklenen testlerle örtüşüyor.
- "Tests that render … save status explicitly call RTL cleanup()" iddiası `useSaveStatus.test.tsx` için doğru; `SaveStatusIndicator.test.tsx`'te açık `cleanup` yok ama bu dosya etkin projeyi sıfırlamıyor (çelişki değil).
- Third follow-up'taki "marks its own URL restoration so the URL effect does not cancel the replacement Open while its save gate is pending" kodda doğru; ancak "regression tests … verify" kısmı bu korumayı kanıtlamıyor (YB1).
- Deviation 3'teki bağımlılık listesi `[cancelPendingOpen, urlProjectId, runOpen]` koddaki `:265` ile aynı.
- Cancel/Reload hipotezinin ele alınmadığı belgede yazmıyor.

## Doğrulayamadıklarım
- Build/lint/test çıktıları; 119 dosya / 1184 test sayısı koordinatörün koşusuna dayanıyor.
- React 19 async `act` kuyruğunun callback içinde boşaltılmadığı çıkarımı: YB1 bu çıkarıma dayanıyor ve koşarak doğrulanmalı (`:256-260` geçici olarak silinip testler çalıştırılabilir).
- `act` uyarıları ve dosyaların UTF-8 ve LF biçimi.
- YB2'nin ve Cancel/Reload hipotezinin pratikte ortaya çıkıp çıkmayacağı (M5c'deki router, modal ve indicator bağlaması belirleyecek).
