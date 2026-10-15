# Plan: save-error-toast

Bu plan `docs/features/save-status-toast/plan.md` üzerine kurulur ve onun **uygulanmış** olduğunu varsayar (uygulandı; ayrıca review düzeltmeleri ve "Kaydediliyor…" kaldırma sonrası güncel kod aşağıda "Mevcut kod tabanı" bölümünde). O planın A1 varsayımı ve AC7'si bu feature ile geçersiz olur; AC4'ün "1,5 sn" süresi hata bildirimi için değişir.

**Güncelleme (2026-10-15):** Plan, save-status-toast sonrası değişen koda göre yenilendi: (1) "Kaydediliyor…" yazısı kaldırıldı, bu yüzden `SaveStatusIndicator` bu feature sonunda hiçbir durumda bir şey çizmez ve **tamamen silinir**; (2) `SaveToast` artık `{ toast: SaveToastState }` alan, her zaman DOM'da duran bir `role=status` / `aria-live=polite` taşıyıcı çizer (`.spn-save-toast-region`, top 88px); (3) CSS ve test yardımcıları buna göre güncellendi.

**Kullanıcı kararları (2026-10-15):**
- Soru 1 -> **Seçenek A:** Hata bildirimi kaybolur, kalıcı öğe yok. Kuyruk durmuş kalır; her yeni düzenlemede ve Ctrl+S'de bildirim düğmeleriyle geri gelir. Exit/Open/New kapısı ve sekme kapatma uyarısı sorulmaya devam eder.
- Soru 2 -> Hata bildirimi **8 sn** görünür, fare üstündeyken/odak içindeyken durur. Başarı bildirimi 1,5 sn kalır.

## Mevcut kod tabanı (uygulama öncesi doğrulanmalı)

- `frontend/src/app/project-session/SaveToast.tsx`: `SaveToast({ toast: SaveToastState })`; her zaman `<div className="spn-save-toast-region" role="status" aria-live="polite">` çizer, içinde `toast` varsa `<div key={toast.id} className="spn-save-toast" data-kind>`. Metinler: `Kaydedildi` / `Kaydedilemedi`.
- `App.tsx` (`ProjectShell`): `useSaveToast()` ve `{saveStatus.projectId !== null && <SaveToast toast={saveToast} />}`.
- `useSaveToast.ts`: `SaveToastState = { kind: SaveToastKind; id: number } | null`; session'a doğrudan abone olur; yeni toast zamanlayıcıyı yeniler; epoch değişimi kapatır.
- `SaveStatusIndicator.tsx`: yalnızca sorun bloğu (`role=alert`, `describeSaveProblem`, 3 düğme) çizer; idle ve saving için `null` döner. `TopWorkspaceNav.tsx:54` tek kullanıcısıdır ve `onRetry/onDiscard/onReload/busy/saveStatus` prop'larını geçirir.
- `18-project-session.css`: `.spn-save-toast-region` (fixed, top 88px, right 16px, z-index 1500, pointer-events none), `.spn-save-toast`, `[data-kind]` renkleri; `.spn-session-status` ve `[data-status=error|rejected|conflict]` kuralları sorun bloğu içindir.
- `AppSession.test.tsx` yardımcı: `saveToast = () => document.querySelector('.spn-save-toast')`.

## 1. Davranış ve kabul ölçütleri

**Kodda doğrulanan bugünkü durum (kuyruk durduğunda):**
- `writeQueue.ts` `enqueue`: `if (stalled()) { publish(); return }`. Yeni düzenlemeler bölüm anahtarına göre birleştirilir ama gönderilmez; otomatik yeniden deneme yok. Ekrandaki değerler düzenlenmiş hâlde kalır.
- Aynı anahtarda yeni düzenleme `pendingCount`'u değiştirmez; `projectSession.set` eşit snapshot'ı yayınlamaz. Bu düzenleme session üzerinden fark edilemez (bu yüzden `onHeldWrite` gerekir).
- Exit/Open/New `passGate` + `activeWriteQueue.flush()` ile durmuş kuyrukta `UnsavedChangesModal` açar (TEKRAR DENE, DEĞİŞİKLİKLERİ AT, İPTAL; çakışmada TEKRAR DENE pasif). `useBeforeUnloadWarning.ts` error/rejected/conflict'te uyarır. Bu korumalar sürer.
- Proje içi workspace linkleri yalnızca `confirmDiscardDrafts` ile korunur; kuyruk kalır, veri kaybolmaz.
- Ctrl+S (`onSaveNow`, `App.tsx`) durmuş kuyrukta `flush()` hata fırlatır ve `.catch(() => undefined)` ile yutulur; kurtarma yolu değildir.
- Tekrar dene / Değişiklikleri at / Yeniden yükle (yalnızca `conflict`) bugün yalnızca üst çubuk bloğunda.

**Ana risk:** Blok kaybolunca kuyruk durmuş kalır; sonraki düzenlemeler ekranda görünür ama gönderilmez. Çıkış ve sekme kapatma korumalı olduğu için veri hemen kaybolmaz, ama kullanıcı geç fark edebilir. Seçenek A bunu "her düzenlemede/Ctrl+S'de yeniden gösterim" ile sınırlar. Otomatik atma ve çakışmada otomatik yeniden yükleme düzenlemeleri sessizce sildiği için reddedildi.

**Kabul ölçütleri:**
- **AC1:** Üst çubukta artık hiçbir kayıt durumu öğesi yoktur: sorun durumlarında (`error|rejected|conflict`) `role=alert` blok, "Kayıt hatası / Kayıt reddedildi / Çakışma" metni ve düğmeler üst çubukta görünmez. `SaveStatusIndicator` bileşeni kaldırılır.
- **AC2:** Sorun durumuna geçişte kırmızı hata bildirimi (`role=alert`, `aria-label="Kayıt bildirimi"`) çıkar. İçerik `describeSaveProblem` başlığı ve ayrıntılarıdır (rejected için ilk 3 alan hatası, "+N hata daha", "Bölüm: …"). Düğmeler: error/rejected için **Tekrar dene** ve **Değişiklikleri at**; conflict için **Yeniden yükle**.
- **AC3:** Hata bildirimi `SAVE_ERROR_TOAST_MS = 8000` sonra kalkar. Fare üstündeyken ya da odak içindeyken kalkmaz; ayrılınca süre baştan başlar.
- **AC4:** Bildirim kalktıktan sonra kuyruk durmuşken yapılan her yeni düzenleme (aynı anahtarda olsa bile) bildirimi yeniden gösterir. Düzenleme sunucuya gönderilmez.
- **AC5:** Kuyruk durmuşken Ctrl+S: error/rejected için `retrySaves()` çağırır (PUT gider); conflict için istek atmaz ve bildirimi yeniden gösterir. Normal durumda `flush` aynen kalır.
- **AC6:** Tekrar dene başarılı olunca yeşil "Kaydedildi" bildirimi çıkar. Değişiklikleri at ve Yeniden yükle hata bildirimini kapatır, yeşil bildirim çıkmaz. Yeniden yükle `mayLeave()` korumasıyla çalışır. `pendingSwitch` açıkken (`busy`) düğmeler pasiftir.
- **AC7:** Exit/Open/New kapısı (`UnsavedChangesModal`) ve `beforeunload` uyarısı durmuş kuyrukta değişmeden çalışır, bildirim kalktıktan sonra da.
- **AC8:** Backend değişmez, yeni bağımlılık yok. `npm run build`, `npm run lint`, `npm test` geçer.

## 2. İlgili dosyalar ve değişiklik

- `frontend/src/shared/project-store/writeQueue.ts`: `onHeldWrite(listener: () => void): () => void` eklenir. Dinleyici `enqueue` içindeki `if (stalled())` dalında `guard` ile çağrılır; `reset`/`dispose` sonrası ve durmamış kuyrukta çağrılmaz. Snapshot şekli değişmez. Başlık yorumuna bir satır.
- `saveToastTracker.ts`: `'failed'` sonucu bildirimin ne tür düğme göstereceğini `describeSaveProblem(snapshot).actions` üzerinden render anında belirler (tracker'a eylem türü eklemek gerekmez). `SAVE_ERROR_TOAST_MS = 8000` eklenir.
- `useSaveToast.ts`: hem session'a hem `activeWriteQueue.onHeldWrite`'a abone olur. Durum `{ kind, id } | null` şeklini korur (mevcut sözleşme); `failed` içeriği render anında güncel snapshot'tan okunur. `reshow()` dışa açılır (Ctrl+S için); `pause()`/`resume()` eklenir; hook `{ toast, reshow, pause, resume }` döndürür (çağıran `App.tsx` güncellenir). Durum sorun dışına çıkınca (discard, epoch, retry->saving) hata bildirimi kapanır. Yeniden gösterimde id korunur, yalnızca zamanlayıcı baştan başlar (yanıp sönme yok). `failed` için süre `SAVE_ERROR_TOAST_MS`, `saved` için `SAVE_TOAST_MS`.
- `SaveToast.tsx`: `saved` için mevcut `role=status` taşıyıcı içindeki toast aynen kalır. `failed` için ayrı bir `role="alert"` `aria-label="Kayıt bildirimi"` öğesi (taşıyıcıdan bağımsız, `pointer-events: auto`) çizilir: başlık, ayrıntılar ve düğmeler. Yeni prop'lar: `snapshot`, `busy`, `onRetry`, `onDiscard`, `onReload`, `onPause`, `onResume` (`onMouseEnter`/`onFocus` -> duraklat; `onMouseLeave`/`onBlur` -> devam).
- `SaveStatusIndicator.tsx` **ve** `SaveStatusIndicator.test.tsx`: silinir (bileşen artık hiçbir durumda içerik çizmez). `describeSaveProblem`/`saveStatusText.ts` ve testi kalır.
- `TopWorkspaceNav.tsx`: `SaveStatusIndicator` import'u ve satırı, `saveStatus/busy/onRetry/onDiscard/onReload` prop'ları kaldırılır (başka amaçla kullanılan prop varsa korunur; uygulayıcı doğrular). `TopWorkspaceNav.test.tsx` buna göre güncellenir.
- `App.tsx` (`ProjectShell`): mevcut retry/discard/reload handler'ları (`retrySaves`, `discardSaves`, `reloadProject`) ve `busy` toast'a bağlanır. `onSaveNow` AC5'e göre dallanır: `error|rejected` -> `session.retrySaves()`; `conflict` -> `toast.reshow()`; aksi halde `flush`.
- `styles/app/18-project-session.css`: `.spn-save-toast[data-kind='failed']`/alert öğesi için düğme yerleşimi ve `pointer-events: auto`; artık kullanılmayan `.spn-session-status` kuralları kaldırılır (kullanım kalmadığı grep ile doğrulanır). Başlık yorumu `.spn-save-toast*` seçicilerini zaten kapsıyor.
- `saveStatusText.ts`: değişmez.

**Sıralama:** save-status-toast uygulanmış durumda; bu feature onun üzerine uygulanır. Önceki planın AC7 ve A1'i bu feature ile geçersizdir; birlikte commit edilmişse sorun yoktur. Yardımcı `start` için kaynak ağacının temiz (commit edilmiş) olmasını ister.

## 3. Uygulama adımları

1. `writeQueue.ts`: `onHeldWrite` + `writeQueue.test.ts` (durmuş kuyrukta enqueue tetikler; normal kuyrukta tetiklemez; reset ve unsubscribe sonrası tetiklemez).
2. `useSaveToast.ts` + testleri (fake timers): hata süresi, duraklatma/devam, held write ile yeniden gösterim, `reshow()`, discard ve epoch'ta kapanma, retry başarısında yeşil bildirime geçiş. Mevcut unmount testi (subscribe/unsubscribe ve `vi.getTimerCount()` kontrolü) hem held-write aboneliğini hem zamanlayıcıyı kapsayacak şekilde genişletilir.
3. `SaveToast.tsx` + CSS + `SaveToast.test.tsx`: error/rejected düğmeleri; conflict'te yalnızca Yeniden yükle; `busy` iken pasif düğmeler; rejected alan hatası listesi (silinen `SaveStatusIndicator.test.tsx`'teki sorun testleri buraya taşınır); `saved` iken `role=status` taşıyıcının her zaman DOM'da olduğu.
4. `SaveStatusIndicator.tsx` ve testini sil; `TopWorkspaceNav.tsx`/test temizlenir.
5. `App.tsx`: toast bağlantısı ve Ctrl+S dallanması.
6. `AppSession.test.tsx`: `saveToast()` yardımcısı `saved` için `.spn-save-toast`, `failed` için `getByRole('alert', { name: 'Kayıt bildirimi' })` kullanan ikinci yardımcıyla genişletilir (`actionError` bandı da `role=alert` olduğu için ada göre ayrılır). Etkilenen testler: Yeniden yükle/conflict, 500 hata + Retry, rejected + Discard, `busy` iken pasif Yeniden yükle ve "asks before 'Yeniden yükle'" testleri (satır numaraları değişmiş olabilir; uygulayıcı güncel dosyada bulur). Yeni testler: kalktıktan sonra aynı anahtarda yeni düzenleme bildirimi geri getirir ve PUT gitmez; Ctrl+S 500 sonrası yeniden dener; Ctrl+S conflict'te GET/PUT atmaz ve bildirim görünür; bildirim kalktıktan sonra Exit kapısı hâlâ modal açar. Gerçek zamanlayıcıyla 8 sn beklenmez; kalkma hook testinde fake timers ile doğrulanır.
7. `docs/e2e/18-proje-revizyon-cakismasi.md`: 3. adım (uyarı geçici bildirimdir, kalkınca yeni düzenleme veya Ctrl+S ile geri gelir); 5. adım (Yeniden yükle bildirimden seçilir; kalktıysa önce geri getirilir); geçme ölçütü güncellenir. Diğer e2e dosyalarında hata bloğu metni yok; `03-gecersiz-proje.md:11`'deki "Tekrar dene" `ProjectLoadScreen`'e ait, değişmez.
8. `docs/architecture.md` (UI parçaları: hata bildirimi `SaveToast`'ta, `onHeldWrite`, `SaveStatusIndicator` kaldırıldı) ve `docs/roadmap.md` kısa not.

## 4. Doğrulama

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `TopWorkspaceNav.test.tsx`, AppSession 500 testi | nav'da `alert`/`status` yok; `SaveStatusIndicator` dosyası yok |
| AC2 | `SaveToast.test.tsx`, AppSession 500/400/409 | doğru başlık, ayrıntılar, düğmeler |
| AC3 | `useSaveToast.test.tsx` (fake timers) | süre sonunda `null`; duraklatılmışken kalır |
| AC4 | `writeQueue.test.ts` + yeni AppSession testi | bildirim geri gelir, PUT sayısı sabit |
| AC5 | yeni AppSession Ctrl+S testleri | error'da PUT +1; conflict'te istek yok, bildirim görünür |
| AC6 | AppSession retry/discard/reload/busy testleri | retry sonrası yeşil; discard/reload sonrası bildirim yok; `busy` iken pasif |
| AC7 | "Unsaved-changes gate" testleri + unload kontrolü | değişmeden geçer |
| AC8 | komutlar | hepsi başarılı |

**Komutlar** (`frontend/` içinde):
- Hedefli: `npm test -- src/shared/project-store/writeQueue.test.ts src/app/project-session src/app/layout/TopWorkspaceNav.test.tsx src/app/AppSession.test.tsx`
- Tam: `npm test`, `npm run lint`, `npm run build`. Backend değişmediği için `mvn` gerekmez.
- Elle: `docs/e2e/18-proje-revizyon-cakismasi.md` iki sekmeyle yeniden yürütülür; toast konumu/düğmelerin tıklanabilirliği tarayıcıda görülür.

**Riskler:**
- Kullanıcı bildirimi görmeden çalışmaya devam edebilir. Her düzenlemede yeniden gösterim, çıkış kapısı ve `beforeunload` sınırlar; sürekli görünür gösterge yoktur (reddedilen Seçenek B bunu kapatırdı).
- Her tuş vuruşu bildirimi yeniden gösterir; zamanlayıcı baştan başlar ama içerik yanıp sönmez.
- Erişilebilirlik: düğmeli ve süreli bildirim için duraklatma şarttır; `role=alert` tekrarında ekran okuyucu metni yeniden okur, kabul edilebilir.
- `SaveStatusIndicator` silinince `.spn-session-status` kalıntısı kalmamalı; grep ile doğrulanır.
- Backend istek profili değişmez (otomatik yeniden deneme yok).

**Varsayımlar:**
- Hata metinleri ve `describeSaveProblem` aynı kalır, yalnızca yerleri değişir.
- Hata bildirimi `UnsavedChangesModal`'ın altında kalır (z-index 1500 < 2000).
- Proje içi workspace linkleri durmuş kuyruk için ek onay istemez (bugünkü davranış).
