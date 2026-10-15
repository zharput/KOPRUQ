# Plan: save-status-toast

## 1. Davranış ve kabul ölçütleri

Proje açıkken her sunucu bölüm yazması (`PUT /api/projects/<id>/<section>`) bittiğinde ekranın sağ üstünde, üst çubuğun hemen altında geçici bir bildirim (toast) çıkar. Yazma başarılıysa yeşil "Kaydedildi", başarısızsa kırmızı "Kaydedilemedi" yazar. Bildirim yaklaşık 1,5 sn sonra kendiliğinden kaybolur. Üst çubukta kalıcı duran "Kaydedildi" yazısı kaldırılır.

- **AC1:** Proje açıkken ve kuyrukta bekleyen yazma yokken (`status === 'idle'`) üst çubukta "Kaydedildi" yazısı ya da `role=status` öğesi görünmez.
- **AC2:** Project Overview, Edit Project, Save adımlarından sonra `workspace` PUT'u başarılı olunca yeşil "Kaydedildi" bildirimi çıkar ve 1,5 sn sonra DOM'dan kalkar.
- **AC3:** Units & Preferences ekranında Length birimi değişip yazma başarılı olunca da aynı yeşil bildirim çıkar ve kaybolur. Diğer workspace yazmaları (loads, families, bridge-definitions, graphs) aynı yoldan geçtiği için bu davranışı otomatik alır.
- **AC4:** Yazma `error`, `rejected` ya da `conflict` ile biterse kırmızı "Kaydedilemedi" bildirimi çıkar ve 1,5 sn sonra kalkar. `reportLocalRejection` ile yerel reddetme de dahildir.
- **AC5:** Proje oluşturma (POST), açma, sayfa yenileme, Yeniden yükle, Exit, kaydedilmemiş değişiklikleri atma (error -> idle) ve bekleyen yazma yokken Ctrl+S bildirim göstermez.
- **AC6:** Art arda değişikliklerde her kuyruk boşalmasında tek bir yeşil bildirim çıkar. Yeni bildirim eskisinin yerini alır ve kaybolma süresini baştan başlatır.
- **AC7 (varsayım A1):** Kalıcı hata bloğu olduğu gibi kalır: `role=alert`, "Kayıt hatası / Kayıt reddedildi / Çakışma" metinleri ve Tekrar dene, Değişiklikleri at, Yeniden yükle düğmeleri. "Kaydediliyor…" yazısı da kalır.
- **AC8:** Yeni bağımlılık eklenmez. `npm run build`, `npm run lint` ve `npm test` geçer.

## 2. İlgili dosyalar, mevcut yaklaşım ve önerilen değişiklik

**Kodda doğrulananlar:**
- `frontend/src/app/project-session/SaveStatusIndicator.tsx`: `idle` iken kalıcı `<span role="status">Kaydedildi</span>`, `saving` iken "Kaydediliyor…". Sorun durumlarında `describeSaveProblem` (`saveStatusText.ts`) ile `role=alert` bloğu ve düğmeler.
- Tek kullanan yer `frontend/src/app/layout/TopWorkspaceNav.tsx:54`. Prop'lar `App.tsx` içindeki `ProjectShell` üzerinden geliyor.
- Bütün proje yazmaları tek kuyruktan geçiyor: `activeWriteQueue` (`shared/project-store/activeProject.ts:29`). Units seçimi `ProjectWorkspace.tsx:65` -> `setProject` -> `writeProjectState` -> section -> kuyruk. `putSection`'ı çağıran başka yer yok. POST yalnızca proje oluşturmada.
- `writeQueue.ts` `publish()`: `enqueue` hemen `saving` yayınlar. Başarılı cevapta önce `session.setRevision(envelope.revision)`, sonra `publish()`; kuyruk boşsa `idle`. Hata durumunda `stall()` -> `error|rejected|conflict`. `discard()` hatadan sonra `idle`'a döndürür, revizyon değişmez. Uçuştaki istek atıldıktan sonra başarısız olursa `saving` -> `idle` olur ve revizyon yine değişmez; yalnızca "saving -> idle" kuralı sahte "Kaydedildi" üretirdi.
- `projectSession.ts`: `begin`/`end` her çağrıda `epoch` artırır, oturumu CLEAN `idle` ile yeniden başlatır. `subscribe` listener'ları her `set`'te senkron çalışır.
- Kod tabanında toast mekanizması yok; yeni bağımlılık gerekmiyor.

**Başarı/başarısızlık ayırt etme kuralı:** Karar React render'ına değil `activeProjectSession.subscribe` listener'ına bağlanır (`useSyncExternalStore` ara durumları birleştirebilir).

Saf izleyici `createSaveToastTracker()` ve `observe(snapshot): 'saved' | 'failed' | null`:
- `epoch` değişirse önceki durum ve taban revizyon sıfırlanır, `null` döner.
- `saving` dışı durumdan `saving`'e geçişte `baselineRevision = snapshot.revision`.
- Önceki `saving`, yeni `idle` ve `revision !== baselineRevision` ise `'saved'`.
- Önceki durum sorun durumu değilken yeni durum `error`, `rejected` ya da `conflict` ise `'failed'`.

**Yeni dosyalar** (`frontend/src/app/project-session/`):
- `saveToastTracker.ts`: izleyici ve `SAVE_TOAST_MS = 1500`.
- `useSaveToast.ts`: `useSaveToast(session = activeProjectSession)`; `useEffect` içinde abone olur, `{ kind, id } | null` state'i tutar, `setTimeout` ile kapatır, yeni bildirimde/unmount'ta zamanlayıcıyı temizler, `epoch` değişince kapatır.
- `SaveToast.tsx`: `className="spn-save-toast" data-kind="saved|failed" role="status" aria-live="polite"`. `role=alert` kullanılmaz (kalıcı blok zaten alert).

**Değişecek dosyalar:**
- `SaveStatusIndicator.tsx`: `idle` dalı `null` döner.
- `App.tsx` (`ProjectShell`): `useSaveToast()` çağrılır, `TopWorkspaceNav`'dan sonra `{saveStatus.projectId !== null && toast && <SaveToast … />}`.
- `styles/app/18-project-session.css`: `.spn-save-toast` kuralları. `position: fixed`, sağ üst, nav altında, `pointer-events: none`, `z-index` ~1500 (`.spn-modal-backdrop` 2000'den düşük). Renkler `data-kind` ile; kırmızı için `#d97878`.

## 3. Uygulama adımları

1. `saveToastTracker.ts` + `saveToastTracker.test.ts`: saving->idle revizyon artışıyla `saved`; revizyon değişmeden `null`; discard `null`; epoch değişimi `null`; idle/saving->sorun `failed`; error->conflict `null`; retry (error, saving, idle, revizyon artışı) `saved`.
2. `useSaveToast.ts` + `useSaveToast.test.tsx` (`createProjectSession()`, `vi.useFakeTimers()`): bildirim çıkar, 1500 ms sonra `null`; yeni bildirim zamanlayıcıyı baştan başlatır.
3. `SaveToast.tsx` ve CSS.
4. `SaveStatusIndicator.tsx` `idle` dalını kaldır; `SaveStatusIndicator.test.tsx` idle'da boş çıktı beklesin.
5. `App.tsx` bağlantısı.
6. `TopWorkspaceNav.test.tsx:31`: idle'da `queryByRole('status')` boş.
7. `AppSession.test.tsx`:
   - Satır 73 (New): nav'da status yok, `.spn-save-toast` yok.
   - Satır 183: `findByText('Kaydedildi')` toast içinde, ardından `waitFor` ile kaybolur.
   - Satır 206 (Yeniden yükle): çakışma bloğu kalkar, "Kaydedildi" bildirimi çıkmaz.
   - Satır ~222: hatada "Kaydedilemedi" bildirimi ve kalıcı "Kayıt hatası" bloğu birlikte; satır 226 Tekrar dene sonrası yeşil bildirim.
   - Satır 245: Değişiklikleri at sonrası bildirim yok, hata bloğu kalkar.
   - Yeni test: Units & Preferences'ta Length `mm` -> `workspace` PUT -> "Kaydedildi" bildirimi çıkar ve kaybolur.
8. E2E belgeleri: "üst çubukta **Kaydedildi** durumu" ifadelerini yeni davranışa göre yeniden yaz. Etkilenen: `docs/e2e/README.md:11`; `02-proje-kalici-veri.md:10,11,18` (kullanıcının "Kanıt/Sonuç" notu ve commit edilmemiş değişiklikleri korunur); `03-gecersiz-proje.md:9`; `04-kopru-kimligi.md:9,13`; `05-graph-family.md:14`; `06-trafik-yukleri.md:14`; `07-ruzgar-guncellik.md:11,15`; `12-malzeme-katalogu.md:11`; `13-kopru-tanimi.md:13`; `14-sicaklik-durumu.md:13`; `15-deprem-durumu.md:13`; `18-proje-revizyon-cakismasi.md:5,9,13` (açılışta bildirim çıkmaz, 5 ve 13 bildirim beklememeli). `docs/features/backend-db-persistence-*` ve `docs/reviews/*` değişmez.
9. `docs/architecture.md:3302` UI parçaları listesine `SaveToast` ve `useSaveToast`; `docs/roadmap.md`'ye kısa not.

## 4. Doğrulama

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `SaveStatusIndicator.test.tsx`, `TopWorkspaceNav.test.tsx` | idle'da status öğesi yok |
| AC2 | `AppSession.test.tsx` ad değiştirme + Save | toast çıkar, `waitFor` ile kalkar |
| AC3 | `AppSession.test.tsx` yeni Units testi | `PUT …/workspace`, yeşil toast |
| AC4 | `AppSession.test.tsx` 500/400 testleri + tracker testi | "Kaydedilemedi" çıkar ve kalkar, kalıcı blok yerinde |
| AC5 | AppSession New/açma/Yeniden yükle + tracker epoch/discard/revizyon testleri | toast yok |
| AC6 | `useSaveToast.test.tsx` (fake timers) | tek bildirim, süre baştan başlar |
| AC7 | mevcut SaveStatusIndicator sorun testleri + AppSession Tekrar dene/Değişiklikleri at/Yeniden yükle | değişmeden geçer |
| AC8 | aşağıdaki komutlar | hepsi başarılı |

**Komutlar** (`frontend/` içinde):
- Hedefli: `npm test -- src/app/project-session src/app/layout/TopWorkspaceNav.test.tsx src/app/AppSession.test.tsx`
- Tam: `npm test` (`vitest run`), `npm run lint` (`oxlint`), `npm run build` (`tsc -b && vite build`)
- Backend değişmediği için `mvn` gerekmiyor.
- Elle: `docs/e2e/02-proje-kalici-veri.md` senaryosu yeniden yürütülür.

**Riskler:**
- Uçuştaki yazma atıldıktan sonra başarılı olursa yeşil bildirim çıkar; sunucu gerçekten yazdığı için doğru.
- Kalıcı hata bloğu kaldırılsaydı duran kuyruk sessizce kalır, veri kaybı riski olurdu; bu yüzden blok korunur (A1).
- AppSession testlerinde gerçek zamanlayıcıyla kalkmayı beklemek testi ~1,5 sn uzatır; gerekirse kalkma kontrolü yalnızca hook testinde fake timers ile yapılır.
- `role=status` çoğalması: `AppSession.test.tsx` satır 111 `findByRole('status')` toast çıkmadan önce çalışıyor; App'i render etmeyen testler etkilenmez.

**Varsayımlar:**
- **A1:** "Kaydedilemedi" bildirimi ek bir uyarıdır; mevcut kalıcı hata/çakışma bloğu ve düğmeleri kalır (kuyruk durmuş, kurtarma yolu yalnızca orada). İstek yalnızca kalıcı "Kaydedildi" yazısının kaldırılmasını söylüyor.
- **A2:** "Kaydediliyor…" kalır.
- **A3:** Konum sağ üst, süre 1500 ms, metinler yalnızca "Kaydedildi" ve "Kaydedilemedi"; hata ayrıntısı kalıcı blokta.
- **A4:** Proje oluşturma (POST) ve açma "yazma" sayılmaz, bildirim üretmez.

**Açık soru (engelleyici değil):** Kullanıcı hatada kalıcı hata bloğunun da kaybolmasını isterse kurtarma için ayrı tasarım gerekir. Bu plan A1 varsayımıyla hazırlandı.
