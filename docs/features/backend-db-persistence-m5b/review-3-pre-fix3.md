# İnceleme: backend-db-persistence-m5b (üçüncü inceleme, ikinci düzeltme turundan sonra)

**Karar: CHANGES_REQUESTED.** Bu turda yalnızca P3 bulgu var, P0–P2 yok.
- **N1 çözüldü.** Retry sürerken Cancel'a basılırsa geçiş artık devam etmiyor.
- **N2, sorulan üç yol için çözüldü.** New, Exit ve Reload artık URL'yi geri yüklüyor.
- **Aynı hata sınıfı bir yolda sürüyor (Y1, P3).** Proje listesinden yapılan Open, URL'den başlatılmış bir Open'ı süpersede ettiğinde ya da iptal ettiğinde URL düzeltilmiyor.

Uygulama henüz bağlı olmadığı için (D1) bugün kullanıcıya ulaşan bir sorun yok; Y1 bilinçli olarak M5c'ye ertelenebilir. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). Önceki incelemeler: `review-1-pre-fix.md`, `review-2-pre-fix2.md`.

## Kapsam ve sınırlar
- **Baseline:** HEAD `1b812413f5c18d64031015eb23a00de1b967d92f` (güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `e8f0f834bdb290a34905abe97f86fa2853d3a773`; rapor bayat değil.
- **Not (durum):** İkinci incelemeden sonra controller kaynakları, testler ve belgeler bu oturumun implementer raporu dışındaki bir kaynaktan diskte değiştirilmiş (`implementation.md`'de "Second review follow-up: N1 and N2 (2026-10-14)" bölümü var). Reviewer **güncel disk içeriğini** esas aldı. Koordinatör bu güncel durumda: build çıkış 0, lint çıkış 0, `npm test` 119 dosya / 1176 test (öncesi 1171); `git diff --name-only 1b81241 -- frontend/src` yalnızca `frontend/src/app/styles/App.css`; `backend/`, `package.json`, lock dosyası değişmedi.
- **Tamamını okunanlar:** `useProjectSessionController.ts` (263 satır) ve testi (551 satır, 43 test); `ProjectListDialog.tsx` + testi, `NewProjectDialog.tsx`, `SaveStatusIndicator.tsx`, `ProjectLoadScreen.tsx`; `saveStatusText.ts`, `useProjectList.ts`, `projectSections.ts`, `activeProject.ts`, `useSaveStatus.ts`, `loadsServerSections.ts`, `18-project-session.css`; `fakeProjectApi.ts`, `projectSessionTestUtils.ts`, `sessionLayerUnwired.test.ts`, `setup.ts`; M4 `writeQueue.ts`; `implementation.md` (iki takip bölümü dahil), `review-2-pre-fix2.md`, `state.json`; architecture.md ve roadmap'te M5b satırları (grep).
- **Yeniden okunmayanlar:** Önceki iki turda tam okunmuş ve bu turda değiştiği bildirilmeyen dosyalar (diğer bölüm örneği dosyaları, `projectDisplay`, öteki bileşen testleri, `fakeProjectApi.test.ts`, `serverSectionInstances.test.ts`); bunlar için önceki incelemelere ve yeşil test koşusuna dayanılıyor.
- **Çalıştırılamayanlar:** reviewer build/lint/test/git çalıştıramadı; "eski davranışta düşer" değerlendirmeleri akıl yürütmeye dayanıyor.

## Önceki bulgular → durum
| Bulgu | Durum | Kanıt |
|---|---|---|
| **N1** Retry sürerken Cancel geçişi durdurmuyordu | **Çözüldü** | `resolvePendingSwitch` `:216-220`: Cancel `requestRef` sayacını artırıyor, ardından `finish(requestRef.current)` (`busy=false`, `inFlightTarget=null`) ve `setPending(null)`. Retry başarıyla dönerse `:234` bayat isteği bırakıyor; retry hata verirse `:231` `pendingSwitch`'i yeniden set etmiyor, `:232` `finish` boş işlem. Retry'dan sonra Discard güvenli (`start` önceki isteği süpersede ediyor; `writeQueue.discard` uçuştaki girdiyi düşürülmüş işaretliyor). İki Retry üst üste gelirse ikinci `start` birinciyi süpersede ediyor. Test: `test.tsx:300-317` (`it.each` succeeds/fails); eski kodda ikisi de düşerdi (başarıda GET gider ve B açılır, hatada `pendingSwitch` geri gelir; `busy` beklentisi de düşer). |
| **N2** New/Exit/Reload URL kaynaklı Open'ı süpersede edip başarısız olunca URL dönmüyordu | **Bu üç yol için çözüldü; liste Open'ı için kısmen (Y1)** | `restoreUrlBeforeSupersedingOpen` (`:90-92`), `start`'tan önce eşzamanlı çağrılıyor: `:171`, `:182`, `:189`. URL effect'i `runOpen(A, true)` çağırıyor; A oturumla aynı olduğundan `cancelPendingOpen` çalışıyor ama `start(null)` hedefi zaten null yaptığından hiçbir şey yapmıyor: ping-pong yok, New/Exit/Reload iptal edilmiyor. Exit başarılı olursa URL önce A, sonra null (replace semantiğinde zararsız). Testler: `:455-470` (new/exit, gate hatası + Cancel), `:472-493` (Reload GET hatası); üçü de eski kodda `url === A` beklentisinde düşerdi. |
| Nit-1 `ProjectListDialog` [Kapat] busy iken etkin | **Çözülmedi** (belgelenmedi de) | `ProjectListDialog.tsx:45` düğmede `disabled={busy}` yok, Escape `:13`'te engelleniyor. |
| Nit-2 Süpersede edilmiş, asılı POST'ta `creatingRef` takılı | **Çözülmedi** | `:169-176`: `finally` POST bitene kadar beklediği için `creatingRef` true kalıyor. |
| Nit-3 `PendingSwitch` tip sapması belgelenmedi | **Çözülmedi** | `implementation.md` "Deviations" ve takip bölümlerinde yok; tip `:27-30`. |
| Nit-4 `afterEach` ile RTL `cleanup` sırası | **Çözülmedi** | `test.tsx:22` dosya düzeyinde `resetActiveProject`, `setup.ts:10` `cleanup`. |
| Nit-5 architecture.md'de "bulunamadi" | **Çözülmedi** | `docs/architecture.md:3298` hâlâ "Proje bulunamadi"; kod `:52` "bulunamadı". |
| Nit-6 Test boşlukları | **Kısmen** | Retry+Cancel: testli (`:300`). POST 404 metni: test yok (POST testleri yalnızca 500: `:75`, `:84`). URL null olup oturum açıkken uçuştaki Open'ın iptali (`:248` dalı): test yok (`:430` uçuşta Open olmadan çalışıyor). |
| F1–F7 ve ilk inceleme nitleri | **Gerileme görülmedi** | F1 `:230` (`retry`+`flush`), F2 `:132-136`, F3 `:148-150`, F4 `:249`, F5 `creatingRef` ve `:125`, F6 `:152`/`:82-88`; testler yerinde (`:81`, `:94`, `:108`, `:227`, `:250`, `:444`, `:502`, `:513`, `:526`, `:539`). |

## Yeni bulgular

### Y1 — P3 — Liste Open'ı URL kaynaklı bir Open'ı süpersede ettiğinde URL oturumla ayrışabiliyor (N2'nin kalan yolu)
- **Yer:** `frontend/src/app/project-session/useProjectSessionController.ts` — `runOpen` `:152` (`cancelPendingOpen` dalı), `:154-158` (`fromUrl=false` iken gate hatası), `openNow` `:116` (`fromUrl=false` iken GET hatası).
- **Kanıt:** `restoreUrlBeforeSupersedingOpen` yalnızca New, Reload ve Exit'te çağrılıyor. `runOpen(projectId, false)` `start(projectId)` ile URL kaynaklı Open'ı süpersede ediyor ama hiçbir hata ya da iptal yolunda URL'yi oturuma eşitlemiyor.
- **Senaryo:** Oturum A açık, URL A. Geri/ileri gezinme URL'yi B yapıyor, GET B uçuşta. Kullanıcı listeden: (a) C'yi seçiyor; gate başarısız olup Cancel seçiliyor ya da GET C 404 dönüyor → URL B, oturum A. (b) Açık olan A'yı seçiyor; `cancelPendingOpen` çalışıyor, URL B'de kalıyor. Effect bağımlılıkları değişmediği için ikinci bir düzeltme gelmiyor; sayfa yenilenince B açılıyor (F3/N2 ile aynı sınıf).
- **Etki:** URL ile oturum ayrışıyor; veri kaybı yok; uygulama bağlı olmadığı için bugün kullanıcıya ulaşmıyor.
- **Öneri:** `runOpen` içinde, `fromUrl=false` iken `start`'tan önce ve `:152`'deki `cancelPendingOpen` dalında `restoreUrlBeforeSupersedingOpen()` çağrılsın. Test: URL B uçuştayken listeden açılan C 404 dönünce `url === A`; listeden A seçilince `url === A`.

### Not (belirsiz hipotez, P3 altı)
- `resolvePendingSwitch('cancel')` (`:217-218`) sayacı her zaman artırıyor. `pendingSwitch` açıkken çalıştırılabilen tek istek Reload (`:179-185`'te `pendingRef` kontrolü yok; çakışmada `canRetry=false` iken mümkün). Cancel uçuştaki bir Reload'u sessizce düşürür: `actionError` set edilmez, oturum çakışmada kalır. Pratikte M5c'de modal açıkken göstergenin Reload düğmesine erişilip erişilemediğine bağlı; doğrulanamadı.

## Bu turdaki değişikliklerde aranıp bulunamayan hatalar
- **Takılı kalan durum:** `busy`, `load`, `pendingSwitch` ya da `actionError`'ın takılı kaldığı yol yok. Cancel `busy`'yi her durumda temizliyor; Retry başarısız olursa önce `setPending`, sonra `finish`.
- **Ping-pong ve unmount:** URL ile oturum arasında ping-pong yok (`restore` `start(null)`'dan önce ve aynı eşzamanlı akışta). Unmount ve StrictMode sayacı değişmedi.
- **Sayaç kapsamı:** Bayat istek eleme kontrolü tüm `await` noktalarında var: `:105`, `:111`, `:126`, `:132`, `:160`, `:174`, `:192`, `:234`.
- **Fake ve zamanlama:** Fake API'de `failNext`, bekletilen isteğin serbest bırakıldığı anda tüketiliyor; N1 "fails" ve Reload (`release('GET', 1)`) testleri bu sırayla tutarlı. Yeni testlerde sahte zamanlayıcı yok.

## Testlerin anlamlılığı
- `:300-317`, `:455-470`, `:472-493` eski davranışta düşer; totolojik değil.
- `:467`'deki `fake.release('GET')` sonrası beklenti tek başına ayırt edici değil (GET B eski kodda da süpersede edilmişti); asıl ayırt edici beklenti `url === A`.

## AC kapsamı
| AC | Durum | Not |
|---|---|---|
| AC1–AC7 | Karşılandı | Bu turda değişmedi |
| AC8 | Karşılandı | POST 404 metni testsiz (nit) |
| AC9 | Karşılandı | |
| AC10 | Karşılandı | Retry sürerken Cancel artık testli |
| AC11 | Karşılandı | Yalnızca çakışmada |
| AC12 | Karşılandı | |
| AC13 | Karşılandı, kenar boşluğu | Y1: liste Open'ında URL ayrışması |
| AC14–AC18 | Karşılandı | Nit-1 sürüyor |
| AC19 | Karşılandı | `App.css:21` tek `@import`; `noBrowserStorage` `ALLOWED_FILES` 17 giriş; yeni dosyalarda `WindSnapshotInputsValue`/depolama sembolü yok (grep 0); git diff/status koordinatörce doğrulandı |
| AC20 | Karşılandı | architecture.md `:3290-3301` (ikinci takip `:3300`), roadmap `:1924`; yazım hatası `:3298` |

## implementation.md ile kod arasındaki farklar
- `:22` "useProjectSessionController (23 tests)" bayat; kodda 43 test var (takip bölümündeki "focused controller suite 43" ve 1171+5=1176 ile tutarlı).
- `:59` sapma 3: bağımlılık listesi gerçekte `[cancelPendingOpen, urlProjectId, runOpen]` (`:250`).
- `PendingSwitch` discriminated union (exit'te `target` yok) sapma listesinde geçmiyor.
- İkinci takip bölümündeki iddiaların (N1, N2) hepsi kaynakta karşılığını buluyor; N2 metni yalnızca New, Exit ve Reload'u iddia ediyor, liste Open'ından söz etmiyor (yanlış iddia yok, kapsam eksik: Y1).

## Doğrulayamadıklarım
- Build/lint/test çıktıları ve 1176 sayısı (koordinatörün koşusuna dayanıyor).
- `act` ve async flush zamanlaması (ör. `:458`, `:484`'teki `waitFor` beklentileri) ve Vitest hook sırasından doğabilecek `act` uyarıları.
- Dosyaların UTF-8 ve LF biçimi.
- Y1'in ve Cancel/Reload hipotezinin pratikte ortaya çıkıp çıkmayacağı (M5c'deki router ve modal bağlaması belirleyecek).
