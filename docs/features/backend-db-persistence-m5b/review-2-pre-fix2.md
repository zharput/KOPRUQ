# İnceleme: backend-db-persistence-m5b (ikinci, düzeltme sonrası)

**Karar: CHANGES_REQUESTED.** Bu turda yalnızca P3 bulgu var, P0–P2 yok. İlk incelemedeki iki P2 (F1, F2) ve F3–F6 kaynak üzerinde çözülmüş görünüyor. Kalan iki P3 controller'ın durum makinesinde: (a) Retry sürerken Cancel seçilirse geçiş yine de yapılıyor, (b) bazı süpersede yollarında URL ile oturum ayrışıyor. İkisi de uygulama henüz bağlı olmadığı için bugün kullanıcıya ulaşmıyor; bilinçli olarak M5c'ye ertelenebilir. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). İlk inceleme `review-1-pre-fix.md` olarak saklandı.

## Kapsam ve sınırlar
- **Baseline:** HEAD `1b812413f5c18d64031015eb23a00de1b967d92f` (güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `5a98b849e32db141508ee00a0acc29b385bab80c`; rapor bayat değil.
- **Not (durum):** İlk incelemeden sonra controller/oturum katmanı kaynakları, testler ve belgeler bu oturumun implementer raporu dışındaki bir kaynaktan diskte değiştirilmiş (`implementation.md`'de "Review follow-up (2026-10-14)" bölümü var). Reviewer **güncel dosya içeriğini** esas aldı. Koordinatör bu güncel durumda build (çıkış 0), lint (çıkış 0), `npm test` (119 dosya / 1171 test; öncesi 1154) koştu.
- **Koordinatörün tamamladığı doğrulamalar** (reviewer'ın yapamadığı): `git diff --name-only 1b81241 -- frontend/src` yalnızca `frontend/src/app/styles/App.css`; `git status` için `backend/`, `frontend/package.json`, `package-lock.json` boş.
- **Reviewer'ın tamamını okudukları:** `App.css` (`:21` tek `@import`); yeni kaynaklar (`activeProject.ts`, `useSaveStatus.ts`, 7 bölüm örneği dosyası, `projectSections.ts`, `useProjectSessionController.ts`, `useProjectList.ts`, `projectDisplay.ts`, `saveStatusText.ts`, 4 bileşen, `18-project-session.css`); tüm testleri, `serverSectionInstances.test.ts`, `fakeProjectApi.ts` + testi, `projectSessionTestUtils.ts`, `sessionLayerUnwired.test.ts`; M4 modülleri (`writeQueue.ts`, `projectSession.ts`, `formatApiError`); `setup.ts`, `vite.config.ts`, `noBrowserStorage.test.ts` listesi, `index.css` değişkenleri; architecture.md M5b (`:3290-3302`), roadmap `:1924`, parent plan 3.3.
- **Yapılamayanlar:** reviewer build/lint/test çalıştıramadı; "eski davranışta düşer" değerlendirmeleri akıl yürütmeye dayanıyor.

## Önceki bulgular → durum
| Bulgu | Durum | Kanıt |
|---|---|---|
| **F1 (P2)** Gate retry yazmaları beklemeden geçiş yapıyordu | **Çözüldü** | `useProjectSessionController.ts:219` artık `await retry(); await flush()`. Kuyruk takılı değilse `retry` hemen döner, `flush` uçuştaki ve sıradaki yazmaları bekler (`writeQueue.ts:163-173`). retrySaves ile gate iç içe geçse ve iki retry üst üste gelse sorun çıkmıyor (ikinci `start` birinciyi süpersede ediyor). Retry sürerken Discard güvenli. **Retry sürerken Cancel güvenli değil** (N1). |
| **F2 (P2)** Başarısız New `loading` fazını takılı bırakıyordu | **Çözüldü** | `createNow` catch'i (`:129-133`) `setLoad(idle)` ve `setUrl(sessionProjectId())`. URL kaynaklı varyantta URL null olunca effect (`:238`) `welcome`'a götürüyor. |
| **F3** pendingSwitch açıkken URL değişimi | **Çözüldü** | `runOpen:145-147` URL kaynaklı çağrıda URL'yi oturum id'sine geri yazıyor; ping-pong yok. |
| **F4** URL temizlenince `load-error` kalıyordu | **Çözüldü** | `:238` |
| **F5** New uçuşta koruması ve yetim proje | **Çözüldü** (yetim proje bilinçli kabul) | `creatingRef` (`:65`, `:165-172`, `:201-202`); liste invalidation'ı süpersede kontrolünden önce (`:122`). |
| **F6** URL ya da liste açık projeye dönünce uçuştaki Open | **Çözüldü** | `runOpen:149` ve `cancelPendingOpen` (`:82-88`) sayacı artırıp `busy` ve `load`'u temizliyor. |
| **F7.1** resume new/exit dalları testsiz | Çözüldü | `test.tsx:269-289` (`it.each` retry/discard). Eski kodda da geçerdi; kapsam testi. |
| **F7.2** unmount testi | Çözüldü | `:467-478` (eski kodda da geçer, koruma zaten vardı). |
| **F7.3** StrictMode GET sayısı | Çözüldü | `:489` `['GET']` |
| **F7.4** Discard geri alması doğrulanıyor mu | Çözüldü, anlamlı | `:215-221`: GET bekletilirken okuma kanonik `{a:'0.2',…}` değerine dönüyor; geri alma kırılırsa test düşer. |
| **F7.5** "definition order" başlığı | Çözüldü | `serverSectionInstances.test.ts:13` başlık düzeltildi; sıra `projectSections.test.ts:105-113`'te ayrıca test ediliyor. |
| **F7.6** F1 ve F2 testleri | Çözüldü, eski kodda düşer | F1: `:227-248`, `:250-267`; F2: `:81-92`; F3 `:425`, F4 `:436`, F6 `:443`/`:454`, F5 `:94` ve `:108` testleri de eski davranışta düşer. |
| Nit: SaveStatusIndicator key | Çözüldü | `SaveStatusIndicator.tsx:15` `${index}-${detail}` |
| Nit: CSS değişkenleri ve outline | Çözüldü | Kullanılan değişkenler `index.css:21`'de, `--sp-surface-hover`/`--sp-focus-ring` `:5`/`:10`'da tanımlı; `:6` görünür 2px odak çerçevesi. |
| Nit: prepare hata sarmalama ve yinelenen graph id | Çözüldü | `projectSections.ts:95-100` yalnızca `WireMappingError`'ı sarıyor; `:85` yinelenen id kontrolü, testli (`projectSections.test.ts:73`). |
| Nit: resume varsayılan dalı | Çözüldü | `PendingSwitch` discriminated union (`:27-30`); `else exitNow` yalnızca `exit` için. |
| Nit: POST hatasında describeLoadError | Çözüldü (testsiz) | `:130` `formatApiError`; POST 404 metnini doğrulayan test yok. |
| Nit: reload anlamı | Çözüldü | `:177` yalnızca conflict'te; testli (`:322`). |
| Nit: role=alert | Çözüldü | `ProjectLoadScreen.tsx:11` ve testi. |
| Nit: NewProjectDialog busy iken İptal | Çözüldü | `NewProjectDialog.tsx:26`, testi `:51`; `ProjectListDialog`'da aynı tutarsızlık sürüyor (Nit-1). |
| Nit: plandaki "17 kayıt" iddiası | Bilinçli ele alındı | implementation.md "Plan correction"; onaylı plan değiştirilmedi. |
| Nit: kapatma bildirim sırası | Bilinçli ele alınmadı | implementation.md'de "sözleşme yok" diye belgelendi. |
| Nit: afterEach ile RTL cleanup sırası | **Ele alınmadı** (belgelenmedi de) | Nit-4. |

## Yeni bulgular

### N1 — P3 — Gate retry sürerken Cancel, retry'ı durdurmuyor
- **Yer:** `frontend/src/app/project-session/useProjectSessionController.ts:210` (cancel dalı) ve `:218-225`.
- **Kanıt:** Cancel yalnızca `setPending(null)` yapıyor, `requestRef`'i artırmıyor. Retry dalı `flush` bittikten sonra `request === requestRef.current` olduğunu görüp devam ediyor.
- **Senaryo:** (1) Open B için gate başarısız; kullanıcı Retry'a basıyor, PUT uçuşta. (2) Kullanıcı Cancel'a basıyor; modal kapanıyor. (3) PUT başarılı olursa `setPending(null)` ve `resume` çalışıyor: B açılıyor (New için POST gidiyor, Exit için proje kapanıyor), yani kullanıcının iptali yok sayılıyor. (4) PUT başarısız olursa `:220` iptal edilmiş `pendingSwitch`'i yeniden set ediyor ve modal geri geliyor.
- **Etki:** Kullanıcının istemediği proje değişimi ya da kapanış. Pratikte olasılığı M5c'deki modalın Cancel düğmesini `busy` iken pasifleştirip pasifleştirmemesine bağlı.
- **Öneri:** Retry uçuştayken Cancel'da `requestRef.current += 1` ve `finish` yapılsın ya da busy iken cancel yok sayılsın. Test: bekletilen PUT → retry → cancel → release → GET yok, `pendingSwitch` null.

### N2 — P3 — New, Exit ya da Reload URL kaynaklı bir Open'ı süpersede edip başarısız olursa URL eski haline dönmüyor
- **Yer:** `useProjectSessionController.ts:169` (New gate başarısız), `:185` (Exit gate başarısız), `:178-179` (Reload, `fromUrl=false`; GET hata verirse). Aynı durumu `runOpen` `:154` ve `createNow` `:132` düzeltiyor; bu üç yol düzeltmiyor.
- **Senaryo:** Oturum A açık. URL B'ye değişiyor ve GET B uçuşta. Bu arada yapılan bir düzenleme PUT ile başarısız oluyor. Kullanıcı Exit (ya da New) yapıyor: B süpersede ediliyor, gate başarısız, ardından Cancel. Sonuç: URL B, oturum A. Effect `[urlProjectId]` değişmediği için bir daha çalışmıyor; sayfa yenilenince B açılıyor (F3 ile aynı sınıf). Reload'da da aynısı olur: conflict sırasında URL kaynaklı Open'ı süpersede eder, GET başarısız olur ve URL B kalır.
- **Öneri:** Süpersede edilen işlem bir URL Open'ı ise, gate ya da reload hata yolunda `setUrlRef.current(sessionProjectId())` çağrılsın. En basit hali: süpersede eden yollarda URL'yi oturuma eşitlemek.

## Nitler (engelleyici değil)
1. `ProjectListDialog.tsx:45`: Escape busy iken engelleniyor (`:13`) ama [Kapat] düğmesi etkin kalıyor (NewProjectDialog'da düzeltilen tutarsızlığın aynısı).
2. `useProjectSessionController.ts:165`: Süpersede edilen bir POST asılı kalırsa `creatingRef` true kalıyor ve yeni New çağrıları sessizce yok sayılıyor.
3. `useProjectSessionController.ts:27-30`: `PendingSwitch` tipi plan K5 ve parent 3.3'teki "aynen korunan" imzadan farklı (discriminated union; `exit`'te `target` yok). Daha güvenli ama implementation.md'nin sapma listesinde geçmiyor; M5c tüketicisi `.target`'a doğrudan erişemez.
4. `useProjectSessionController.test.tsx:22` (ve diğer oturum testleri): `vitest ^5` varsayılan `sequence.hooks: 'stack'` ile dosya düzeyindeki `afterEach(resetActiveProject)`, `setup.ts`'teki `cleanup()`'tan önce çalışır; bağlı hook'a `act` dışında session güncellemesi gidebilir (uyarı riski, doğrulanmadı).
5. architecture.md `:3298`: "Proje bulunamadi" yazıyor; kodda "bulunamadı".
6. Test boşlukları: retry sürerken cancel (N1); POST 404 metni; URL null olup oturum açıkken uçuştaki liste Open'ının iptali (`:237`) testsiz.

## AC kapsamı
| AC | Durum | Not |
|---|---|---|
| AC1 | Karşılandı | `activeProject.test.ts`: sıra, API değişimi, tek bildirim, izolasyon, değiştirme |
| AC2 | Karşılandı | |
| AC3 | Karşılandı | Sıra ayrı testte |
| AC4 | Karşılandı | Bölüm dosyalarında çalışma zamanı importu yalnızca `activeProject` ve kendi wire dosyası |
| AC5–AC7 | Karşılandı | Yinelenen graph testi de var |
| AC8 | Karşılandı | Çift New ve süpersede invalidation testli |
| AC9 | Karşılandı | |
| AC10 | Karşılandı | Discard'da geri alma, retry'da flush, new/exit resume testli. Retry sürerken cancel boşluğu (N1) |
| AC11 | Karşılandı | Yalnızca conflict'te çalışıyor (belgelenmiş daraltma) |
| AC12 | Karşılandı | |
| AC13 | Karşılandı | F3, F4, F6 ve StrictMode GET sayısı testli. Kenar desync N2 |
| AC14–AC17 | Karşılandı | |
| AC18 | Karşılandı | |
| AC19 | Karşılandı | `App.css` yalnızca `:21` ekli; `noBrowserStorage` `ALLOWED_FILES` 17 giriş; yeni dosyalarda `WindSnapshotInputsValue` ya da depolama sembolü yok; diff/status/`package.json` koordinatörce doğrulandı |
| AC20 | Karşılandı | architecture.md `:3290`, roadmap `:1924` |

## implementation.md ile kod arasındaki farklar
- `:22` "useProjectSessionController (23 tests)" bayat; güncel dosyada 38 test var (1154 → 1171, +17 ile tutarlı).
- `:59` sapma 3: effect bağımlılıkları artık `[cancelPendingOpen, urlProjectId, runOpen]`.
- `:69` ilk incelemeyi "`review.md`" diye anıyor; dosya adı `review-1-pre-fix.md`.
- `PendingSwitch` tip değişikliği sapma listesinde yok (Nit-3).
- Takip bölümündeki iddiaların hepsi (F1–F7, nitler) kaynakta karşılığını buluyor; yanlış iddia görülmedi.

## Doğrulayamadıklarım
- build/lint/test çıktıları (reviewer); testlerin gerçekten yeşil olması koordinatörün koşusuna dayanıyor. "Eski davranışta düşer" değerlendirmeleri akıl yürütmeye dayanıyor.
- `act`/async flush zamanlaması: ör. `test.tsx:446`'daki `pending('GET')===1` beklentisi React 19'un async `act`'inin macrotask beklemesine dayanıyor.
- Vitest hook sırası ve olası `act` uyarıları.
- Yeni dosyaların UTF-8 ve satır sonu biçimi.
- M5c'de modal ve göstergenin `busy` bağlaması; N1'in pratikte ortaya çıkıp çıkmayacağını bu belirleyecek.
