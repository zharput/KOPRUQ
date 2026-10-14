# Review: backend-db-persistence-m5b

**Karar: CHANGES_REQUESTED.** İki P2 ve birkaç P3 bulgu var; hepsi controller durum makinesinde ve testlerde. Oturum katmanının temeli (singleton sırası, API dolaylılığı, prepare/apply/close) doğru görünüyor. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob; kabuk çalıştırmadı).

## Kapsam ve sınırlar
- **Baseline:** HEAD `1b812413f5c18d64031015eb23a00de1b967d92f` (güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `5b986408a724f6f8ccbe45ce699678430d47903e`; rapor bayat değil. Plan sha256 `02785cc4…`.
- **Okunanlar (tamamı):** değişen tek izlenen kaynak `frontend/src/app/styles/App.css`; yeni kaynaklar `activeProject.ts`, `useSaveStatus.ts`, 7 bölüm örneği dosyası, `projectSections.ts`, `useProjectSessionController.ts`, `useProjectList.ts`, `projectDisplay.ts`, `saveStatusText.ts`, 4 bileşen, `18-project-session.css`; testler ve yardımcılar (`fakeProjectApi.ts` + testi, `projectSessionTestUtils.ts`, `sessionLayerUnwired.test.ts` ve yeni oturum testleri); M4 modülleri (`projectSession.ts`, `writeQueue.ts`, `serverSection.ts`, `projectApi.ts`, `projectDocument.ts`, `http.ts`), `bridge-definition/model/store.ts:33-66`, M4 review nitleri, architecture.md M5b bölümü ve roadmap satırı.
- **Çalıştırılmayanlar:** build, lint, test (119/1154 uygulayıcı ve koordinatör beyanı; koordinatör build/lint/test'i bağımsız koştu).

## Bulgular

### F1 — P2 — Kapıda "retry", kuyruk takılı değilse yazmaları bekletmeden proje değiştiriyor
- **Yer:** `frontend/src/app/project-session/useProjectSessionController.ts:192-200`, `frontend/src/shared/project-store/writeQueue.ts:189-190`.
- **Kanıt:** `resolvePendingSwitch('retry')` yalnızca `await activeWriteQueue.retry()` çağırıp `resume`'a geçiyor. `retry()` kuyruk takılı değilse (`if (!stalled()) return`) **flush yapmadan** dönüyor. `resume` → `openNow`/`createNow`/`exitNow` → `applyPreparedProject`/`closeActiveProject` → `begin`/`end` kuyruğu sıfırlıyor (`writeQueue.ts:101-104, 213-215`); uçuştaki yanıt yok sayılıyor, gönderilmemiş girdiler düşüyor.
- **Senaryo:** (1) Open B için kapı 500 ile durdu, `pendingSwitch` dolu. (2) Kullanıcı göstergedeki "Tekrar dene"ye basıyor (`retrySaves`; `busy` set etmiyor, düğmeler açık kalıyor); kuyruk takılı olmaktan çıkıyor, PUT 1 uçuşta, PUT 2 sırada. (3) Kullanıcı kapı modalındaki "Tekrar dene"ye basıyor: `retry()` hemen dönüyor, GET B gidiyor ve apply ediliyor. (4) PUT 2 hiç gönderilmiyor; PUT 1 başarısız olursa hata da kayboluyor. Aynı sonuç, kapı açıkken bölüm `discard`/`drop` ile takılma temizlenip yeni düzenleme yapılırsa da oluşur.
- **Etki:** Sessiz veri kaybı; "kapı = her yazma kaydedildi" sözleşmesi bozuluyor.
- **Öneri:** Retry dalında `await activeWriteQueue.retry(); await activeWriteQueue.flush()` kullanılsın ya da retry'dan sonra `passGate` yeniden çağrılsın. Test: kapı açıkken `retrySaves` uçuşta, ardından `resolvePendingSwitch('retry')` → istek sırası `PUT, PUT, GET`.

### F2 — P2 — Başarısız New, yerini aldığı Open'ın `loading` fazını takılı bırakıyor
- **Yer:** `useProjectSessionController.ts:133` (`setLoad loading`), `:117-118` (createNow hata yolu yükleme durumunu sıfırlamıyor), `:91`/`:97` (yerine başka istek geçen Open sessizce dönüyor), `:215-217` (faz türetimi).
- **Senaryo:** (1) Proje yokken Open X ya da URL'den X başlıyor; `load = loading X`, GET uçuşta. (2) Kullanıcı (M5c'de nav'dan) New yapıyor; `start` sayacı artırıyor, POST 500 ile başarısız. (3) `actionError` set ediliyor, `busy=false`; `load` `loading X` kalıyor; X'in geç gelen GET'i eski istek sayıldığı için `setLoad`'a hiç ulaşmıyor. (4) Faz `loading` ama hiçbir istek uçuşta değil. URL kaynaklı durumda `:217` (URL=X, oturum yok) de aynı sonucu veriyor. "Yükleniyor" ekranında düğme yok ve `actionError` bu ekranda gösterilmiyor; kullanıcı neden takıldığını göremiyor.
- **Öneri:** Her hata/çıkış yolunda (en azından `createNow` catch ve `finish` içinde, istek güncelse) oturum yoksa ve `load.kind === 'loading'` ise `load` temizlensin. URL kaynaklı durumda URL de temizlensin/geri yüklensin ya da başarısız New'den sonra açık `load-error` gösterilsin. Test: tutulan GET + başarısız POST → faz `welcome` ya da `load-error` olmalı, `loading` olmamalı.

### F3 — P3 — `pendingSwitch` açıkken URL değişirse yok sayılıyor ama URL geri alınmıyor
- **Yer:** `useProjectSessionController.ts:130` ve `:211`.
- **Senaryo:** Exit/New kapısı başarısız, `pendingSwitch` dolu; URL B'ye değişiyor (adres çubuğu/geri tuşu); `runOpen` sessizce dönüyor; Cancel'dan sonra oturum A açık ama URL B gösteriyor. Effect `[urlProjectId]` değişmediği için bir daha çalışmıyor; yenilemede B açılır.
- **Öneri:** `fromUrl` ile yapılan erken dönüşlerde (ve `pendingRef` doluyken `fromUrl` yolunda) `setUrlRef.current(sessionId)` çağrılsın.

### F4 — P3 — URL temizlenince `load-error` fazı kalıyor
- **Yer:** `useProjectSessionController.ts:211` ve `:215`.
- **Senaryo:** URL X → 404 → `load-error`. Kullanıcı geri tuşuyla kök URL'ye dönüyor (URL null). Effect bir şey yapmıyor; `load` `load-error` kaldığı için faz `welcome` olmuyor.
- **Öneri:** URL effect'inde `urlProjectId === null` ve oturum boşken `setLoad({kind:'idle'})`.

### F5 — P3 — New için uçuşta olma koruması yok; yerine başka istek geçen New sunucuda yetim proje bırakıyor
- **Yer:** `useProjectSessionController.ts:144-151` ve `:111`.
- **Kanıt:** Open'da `inFlightTargetRef` koruması var, New'de yok.
- **Senaryo:** Çift `newProject('X')` iki POST gönderir, iki proje oluşur, yalnızca sonuncusu açılır. New uçuştayken Open/Exit yapılırsa POST yine sunucuda proje oluşturur, sonuç yok sayılır, liste invalidate edilmez. UI tarafında koruma yalnızca `busy` prop'unun doğru bağlanmasına dayanıyor.
- **Öneri:** New uçuştayken ikinci New yok sayılsın (ör. `inFlightTargetRef = 'new:'+name` ya da bir bayrak); yerine başka istek geçen create'te de liste invalidate edilsin.

### F6 — P3 — URL açık projeye geri dönerse uçuştaki Open iptal edilmiyor
- **Yer:** `useProjectSessionController.ts:211` ve `:131`.
- **Senaryo:** (1) Oturum A açık; URL B'ye değişiyor, GET B uçuşta. (2) URL yeniden A'ya dönüyor (geri tuşu); effect "URL = oturum" görüp hiçbir şey yapmıyor. (3) B geliyor, apply ediliyor ve URL B'ye yazılıyor; kullanıcının son niyeti eziliyor. Liste üzerinden `openProject(A)` (zaten açık olan) da uçuştaki B'yi iptal etmiyor.
- **Öneri:** URL oturum id'sine döndüğünde `requestRef` artırılsın (bekleyen Open iptal) ve `busy`/`load` temizlensin.

### F7 — P3 — Test boşlukları ve hatalı başarılar
1. `resume`'un `new` ve `exit` dalları test edilmiyor (retry/discard sonrası create/exit). Uygulayıcı yalnızca `new` dalını belirtmişti; `exit` dalı da testsiz.
2. Unmount sırasında istek uçuştayken eski yanıt korumasını sınayan test yok (doc-comment bunu iddia ediyor).
3. StrictMode testi (`useProjectSessionController.test.tsx:302-311`) GET sayısını doğrulamıyor.
4. AC10 "Discard: bölüm geri alınır" testi (`:168-175`) geri almayı doğrulamıyor; yalnızca discard'dan önceki değeri kontrol ediyor. Hemen ardından B hydrate edildiği için geri alma kırılsa da test geçer.
5. `serverSectionInstances.test.ts:13` başlığı "in definition order" diyor ama id'leri `sort()` ile karşılaştırıyor; sıra doğrulanmıyor.
6. F1 ve F2 senaryoları için test yok.

## Nitler (engelleyici değil)
- `SaveStatusIndicator.tsx:15`: `key={detail}`; aynı metne sahip iki alan hatasında (ya da detay `Bölüm: …` ile çakışırsa) yinelenen key. Index ile birlikte kullanılmalı.
- `18-project-session.css:4-7,9,13`: `--spn-panel`, `--spn-border`, `--spn-muted`, `--sp-accent`, `--sp-bg` repoda tanımlı değil (yalnızca `--sp-surface-hover`, `index.css:5`); tema değişkenleri işe yaramıyor, hep fallback. `:focus-visible { outline: none }` odak göstergesini yalnızca arka plan rengine bırakıyor (a11y).
- `projectSections.ts:100-102`: Uzlaştırma `catch`'i programlama hataları dahil **her** hatayı `ProjectDataValidationError`'a çeviriyor; plan K3 adım 4 "diğer hatalar yayılır" diyordu (sapma kısmen anlatılmış). `validateGraphs` (`:79-87`) yinelenen graph id'lerini yakalamıyor; `collection.hydrate` bunları sessizce birleştirir (backend id ile anahtarladığı için düşük risk).
- `useProjectSessionController.ts:178-179`: `resume`, `target === undefined` olan bir `open`/`new` için `exitNow`'a düşüyor. Bugün ulaşılamaz ama tehlikeli bir varsayılan.
- `describeLoadError` POST hatalarında da kullanılıyor; 404'te "Proje bulunamadı" anlamsız olur.
- `reloadProject` kapıdan geçmiyor ve `pendingSwitch`'i de temizliyor (plana uygun). Conflict dışında çağrılırsa bekleyen yazmaları sessizce atar; M5c bunu yalnızca conflict'te sunmalı.
- `ProjectLoadScreen` hata görünümünde `role="alert"` yok. `NewProjectDialog`'da İptal, `busy` iken etkin kalıyor ama Escape engelleniyor; tutarsız.
- Plan 4.2'deki "AC3'teki 17 benzersiz kayıt testi yinelenen örneği yakalar" iddiası yanlış: değiştirme semantiği nedeniyle sayım 17'de kalır. Kısmi koruma `projectSections.test.ts` kapatma testinden geliyor (dışa aktarılan örneklerin boşaldığını doğruluyor).
- Kapatma bildirim sırası registry'ye eklenme (import) sırasını izliyor, apply ise tanım sırasını; sözleşmede tanımlı değil.
- Test `afterEach(resetActiveProject)` RTL cleanup'tan önce çalışırsa, mount'lu hook'a `act` dışında güncelleme gidebilir (uyarı riski; doğrulanmadı).

## Doğru bulunan noktalar (reviewer'ın kendi incelemesi)
- **`activeProject.ts` sırası:** session (:17), queue (:29), switch aboneliği (:65-73). Kuyruğun `syncEpoch` aboneliği önce eklendiği için dinleyiciden önce sıfırlanıyor. `setActiveProjectApi` closure ile her `send` anında `currentApi`'yi okuyor (uçuştaki PUT doğal olarak eski API'de kalıyor). `begin`/`end` başına tam bir bildirim; dinleyiciler kopya üzerinde ve izole.
- **Registry:** `hydrateEmpty` bölümde `hydrate(undefined)` (`toWire` yok), koleksiyonda `hydrate([])`; temizlenemeyen bölümler için de doğru. Koleksiyon `hydrate` `rejectedKeys`'i sıfırlanmış kuyrukta düşürüyor; M4 nit 1 ve 2 apply/close'da sorun yaratmıyor.
- **prepare:** Saf; `ensureBridgeDefinitions` girdiyi değiştirmiyor. Workspace önce doğrulanıyor (sapma gerekçeli, hep-ya-hiç korunuyor). **apply:** pratikte fırlatmıyor. **close:** `end` ardından `hydrateEmpty`; istek yok.
- **Eski yanıt sayacı:** Her `await` sonrası kontrol var. StrictMode'da cleanup `inFlightTargetRef`'i sıfırladığı için ikinci effect yeniden başlıyor ve tek apply oluyor. `setUrlRef` effect'i URL effect'inden önce tanımlı. `busy` için yerine başka istek geçen yollarda takılma bulunmadı (F2 `load` için).
- **Katman ve kısıtlar:** `shared` yalnızca `shared`; bölüm dosyaları yalnızca `activeProject` + kendi wire dosyası. Takma ad (alias) yok, `sessionLayerUnwired` göreli yolları kontrol etmekle yeterli; çok satırlı import, `export *` ve yorum ayıklama doğru; bayat girdi kontrolü var. CSS yalnızca `.spn-session-*`; `@import` doğru yerde. Yeni dosyalarda depolama sembolü ya da `WindSnapshotInputsValue` yok.
- **Sahte API:** 409 ve 404 kodları backend ile uyumlu; zarf alanları gerçek şema ile aynı; graph upsert ve revizyon zinciri doğru. `useProjectList` testi istemciyi `retry:true` ile kurduğu için hook'un `retry:false`'unu gerçekten kanıtlıyor.

## AC kapsamı
| AC | Durum | Not |
|---|---|---|
| AC1 | Karşılandı | Sıra, API değişimi, tek bildirim, izolasyon, değiştirme testli |
| AC2 | Karşılandı | |
| AC3 | Karşılandı (zayıf) | Sıra test edilmiyor (F7.5) |
| AC4 | Karşılandı | Göreli çözümleme yeterli; import incelemesi elle |
| AC5 | Karşılandı | Uzlaştırma hata sarmalama nit |
| AC6 | Karşılandı | |
| AC7 | Karşılandı | |
| AC8 | Karşılandı | Çift New koruması yok (F5) |
| AC9 | Karşılandı | Eski yanıt testi var |
| AC10 | Kısmen | Open dalı testli; retry sözleşmesi F1; discard geri alması doğrulanmıyor; `new`/`exit` resume testsiz |
| AC11 | Karşılandı | |
| AC12 | Karşılandı (resume-exit testsiz) | |
| AC13 | Kısmen | Dört başlangıç durumu ve StrictMode testli; URL/pending (F3), load-error (F4) ve geri dönüş (F6) boşlukları |
| AC14 | Karşılandı | |
| AC15 | Karşılandı | |
| AC16 | Karşılandı | Key nit |
| AC17 | Karşılandı | |
| AC18 | Karşılandı | |
| AC19 | Beyan + kısmi doğrulama | Status anlık görüntüsüyle tutarlı; komutları reviewer çalıştırmadı |
| AC20 | Karşılandı | architecture.md:3290, roadmap.md:1924 |

## Doğrulayamadıklarım
- build/lint/test çıktıları; testlerin eski ya da bozuk kodda gerçekten başarısız olup olmadığı.
- Vitest hook sırası (`afterEach` ile RTL cleanup) ve olası `act` uyarıları.
- React 19 StrictMode effect sırasının tam davranışı (yalnızca akıl yürütme).
- M5c'de `SaveStatusIndicator` düğmelerinin kapı modalı açıkken tıklanabilir olup olmayacağı (F1'in pratik olasılığını bu belirler).
- Gerçek backend ile uçtan uca davranış.
