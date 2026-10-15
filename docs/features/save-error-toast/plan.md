# Plan: save-error-toast

Bu plan `docs/features/save-status-toast/plan.md` üzerine kurulur ve onun **önce uygulanmış** olduğunu varsayar (`saveToastTracker.ts`, `useSaveToast.ts`, `SaveToast.tsx`, `SaveStatusIndicator` idle iken `null`). O planın A1 varsayımı ve AC7'si bu feature ile geçersiz olur; AC4'ün "1,5 sn" süresi hata bildirimi için değişir.

**Kullanıcı kararları (2026-10-15):**
- Soru 1 -> **Seçenek A:** Hata bildirimi kaybolur, kalıcı öğe yok. Kuyruk durmuş kalır; her yeni düzenlemede ve Ctrl+S'de bildirim düğmeleriyle geri gelir. Exit/Open/New kapısı ve sekme kapatma uyarısı sorulmaya devam eder.
- Soru 2 -> Hata bildirimi **8 sn** görünür, fare üstündeyken/odak içindeyken durur. Başarı bildirimi 1,5 sn kalır.

## 1. Davranış ve kabul ölçütleri

**Kodda doğrulanan bugünkü durum (kuyruk durduğunda):**
- `writeQueue.ts` `enqueue`: `if (stalled()) { publish(); return }`. Yeni düzenlemeler bölüm anahtarına göre birleştirilir ama gönderilmez; otomatik yeniden deneme yok. Ekrandaki değerler düzenlenmiş hâlde kalır.
- Aynı anahtarda yeni düzenleme `pendingCount`'u değiştirmez; `projectSession.set` eşit snapshot'ı yayınlamaz. Bu düzenleme session üzerinden fark edilemez (bu yüzden `onHeldWrite` gerekir).
- Exit/Open/New `passGate` + `activeWriteQueue.flush()` ile durmuş kuyrukta `UnsavedChangesModal` açar (TEKRAR DENE, DEĞİŞİKLİKLERİ AT, İPTAL; çakışmada TEKRAR DENE pasif). `useBeforeUnloadWarning.ts` error/rejected/conflict'te uyarır. Bu korumalar sürer.
- Proje içi workspace linkleri yalnızca `confirmDiscardDrafts` ile korunur; kuyruk kalır, veri kaybolmaz.
- Ctrl+S (`onSaveNow`, `App.tsx:140`) durmuş kuyrukta `flush()` hata fırlatır ve `.catch(() => undefined)` ile yutulur; kurtarma yolu değildir.
- Tekrar dene / Değişiklikleri at / Yeniden yükle (yalnızca `conflict`) bugün yalnızca üst çubuk bloğunda.

**Ana risk:** Blok kaybolunca kuyruk durmuş kalır; sonraki düzenlemeler ekranda görünür ama gönderilmez. Çıkış ve sekme kapatma korumalı olduğu için veri hemen kaybolmaz, ama kullanıcı geç fark edebilir. Seçenek A bunu "her düzenlemede/Ctrl+S'de yeniden gösterim" ile sınırlar. Otomatik atma ve çakışmada otomatik yeniden yükleme düzenlemeleri sessizce sildiği için reddedildi.

**Kabul ölçütleri:**
- **AC1:** Kuyruk `error|rejected|conflict` iken üst çubukta `role=alert` blok, "Kayıt hatası / Kayıt reddedildi / Çakışma" metni ve düğmeler yoktur. `SaveStatusIndicator` yalnızca `saving` iken "Kaydediliyor…" gösterir.
- **AC2:** Sorun durumuna geçişte kırmızı hata bildirimi (`role=alert`, `aria-label="Kayıt bildirimi"`) çıkar. İçerik `describeSaveProblem` başlığı ve ayrıntılarıdır (rejected için ilk 3 alan hatası, "+N hata daha", "Bölüm: …"). Düğmeler: error/rejected için **Tekrar dene** ve **Değişiklikleri at**; conflict için **Yeniden yükle**.
- **AC3:** Hata bildirimi `SAVE_ERROR_TOAST_MS = 8000` sonra kalkar. Fare üstündeyken ya da odak içindeyken kalkmaz; ayrılınca süre baştan başlar.
- **AC4:** Bildirim kalktıktan sonra kuyruk durmuşken yapılan her yeni düzenleme (aynı anahtarda olsa bile) bildirimi yeniden gösterir. Düzenleme sunucuya gönderilmez.
- **AC5:** Kuyruk durmuşken Ctrl+S: error/rejected için `retrySaves()` çağırır (PUT gider); conflict için istek atmaz ve bildirimi yeniden gösterir. Normal durumda `flush` aynen kalır.
- **AC6:** Tekrar dene başarılı olunca yeşil "Kaydedildi" bildirimi çıkar. Değişiklikleri at ve Yeniden yükle hata bildirimini kapatır, yeşil bildirim çıkmaz. Yeniden yükle `mayLeave()` korumasıyla çalışır. `pendingSwitch` açıkken (`busy`) düğmeler pasiftir.
- **AC7:** Exit/Open/New kapısı (`UnsavedChangesModal`) ve `beforeunload` uyarısı durmuş kuyrukta değişmeden çalışır, bildirim kalktıktan sonra da.
- **AC8:** Backend değişmez, yeni bağımlılık yok. `npm run build`, `npm run lint`, `npm test` geçer.

## 2. İlgili dosyalar ve değişiklik

- `frontend/src/shared/project-store/writeQueue.ts`: `onHeldWrite(listener: () => void): () => void` eklenir. Dinleyici `enqueue` içindeki `if (stalled())` dalında `guard` ile çağrılır; `reset`/`dispose` sonrası ve durmamış kuyrukta çağrılmaz. Snapshot şekli değişmez. Başlık yorumuna bir satır.
- `saveToastTracker.ts` (önceki feature): `'failed'` sonucuna `describeSaveProblem(...).actions` türetilir. `SAVE_ERROR_TOAST_MS = 8000` eklenir.
- `useSaveToast.ts`: hem session'a hem `activeWriteQueue.onHeldWrite`'a abone olur. Durum `{ kind: 'saved' } | { kind: 'failed' } | null`; `failed` içeriği render anında güncel snapshot'tan okunur. `reshow()` dışa açılır (Ctrl+S için); `pause()`/`resume()` eklenir. Durum sorun dışına çıkınca (discard, epoch, retry->saving) hata bildirimi kapanır. Yeniden gösterimde id korunur, yalnızca zamanlayıcı baştan başlar (yanıp sönme yok).
- `SaveToast.tsx`: `failed` iken `role="alert"`, `aria-label="Kayıt bildirimi"`, düğmeler; `saved` iken `role="status"`. Prop'lar `busy`, `onRetry`, `onDiscard`, `onReload`; `onMouseEnter`/`onFocus` ile duraklatma.
- `SaveStatusIndicator.tsx`: sorun dalı kaldırılır; yalnızca `saving`. `onRetry/onDiscard/onReload` prop'ları çıkar.
- `TopWorkspaceNav.tsx`: aynı üç prop kaldırılır.
- `App.tsx` (`ProjectShell`): mevcut handler'lar (satır ~141) toast'a taşınır. `onSaveNow` AC5'e göre dallanır: `error|rejected` -> `session.retrySaves()`; `conflict` -> `toast.reshow()`; aksi halde `flush`.
- `styles/app/18-project-session.css`: `.spn-save-toast[data-kind='failed']` için `pointer-events: auto` ve düğme yerleşimi; kullanılmayan `.spn-session-status` sorun renk kuralı kaldırılır.
- `saveStatusText.ts`: değişmez.

**Sıralama:** save-status-toast önce uygulanmalı. Bu feature aynı dosyaları ikinci kez değiştirir (`SaveToast.tsx`, `useSaveToast.ts`, `saveToastTracker.ts`, `SaveStatusIndicator.tsx`, `App.tsx`, `TopWorkspaceNav.tsx`, `AppSession.test.tsx`, aynı e2e satırları). Önceki planın 7. adımındaki AppSession düzenlemeleri (satır 206, 222, 226, 245) burada yeniden yazılır. Birlikte uygulanırsa önceki planın AC7 ve A1'i silinmelidir.

## 3. Uygulama adımları

1. `writeQueue.ts`: `onHeldWrite` + `writeQueue.test.ts` (durmuş kuyrukta enqueue tetikler; normal kuyrukta tetiklemez; reset ve unsubscribe sonrası tetiklemez).
2. `saveToastTracker.ts`/`useSaveToast.ts` + testleri (fake timers): hata süresi, duraklatma/devam, held write ile yeniden gösterim, `reshow()`, discard ve epoch'ta kapanma, retry başarısında yeşil bildirime geçiş.
3. `SaveToast.tsx` + CSS + `SaveToast.test.tsx`: error/rejected düğmeleri; conflict'te yalnızca Yeniden yükle; `busy` iken pasif düğmeler; rejected alan hatası listesi (`SaveStatusIndicator.test.tsx`'teki sorun testleri buraya taşınır).
4. `SaveStatusIndicator.tsx`/test: sorun durumları boş çıktı verir.
5. `TopWorkspaceNav.tsx`/test: prop'lar temizlenir.
6. `App.tsx`: toast bağlantısı ve Ctrl+S dallanması.
7. `AppSession.test.tsx`: `topNav()` yerine `getByRole('alert', { name: 'Kayıt bildirimi' })` kullanan `saveToast()` yardımcısı (`actionError` bandı da `role=alert` olduğu için ada göre ayrılır). Etkilenen testler: 188–209, 211–229, 231–246, 316–334 (Yeniden yükle `busy` iken pasif), 488–499. Yeni testler: kalktıktan sonra aynı anahtarda yeni düzenleme bildirimi geri getirir ve PUT gitmez; Ctrl+S 500 sonrası yeniden dener; Ctrl+S conflict'te GET/PUT atmaz; bildirim kalktıktan sonra Exit kapısı hâlâ modal açar.
8. `docs/e2e/18-proje-revizyon-cakismasi.md`: 3. adım (uyarı geçici bildirimdir, kalkınca yeni düzenleme veya Ctrl+S ile geri gelir); 5. adım (Yeniden yükle bildirimden seçilir; kalktıysa önce geri getirilir); geçme ölçütü güncellenir. Diğer e2e dosyalarında hata bloğu metni yok; `03-gecersiz-proje.md:11`'deki "Tekrar dene" `ProjectLoadScreen`'e ait, değişmez.
9. `docs/architecture.md:3302` (hata bildirimi `SaveToast`'ta, `onHeldWrite`) ve `docs/roadmap.md` kısa not.

## 4. Doğrulama

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `SaveStatusIndicator.test.tsx`, AppSession 500 testi | nav'da `alert` yok |
| AC2 | `SaveToast.test.tsx`, AppSession 500/400/409 | doğru başlık, ayrıntılar, düğmeler |
| AC3 | `useSaveToast.test.tsx` (fake timers) | süre sonunda `null`; duraklatılmışken kalır |
| AC4 | `writeQueue.test.ts` + yeni AppSession testi | bildirim geri gelir, PUT sayısı sabit |
| AC5 | yeni AppSession Ctrl+S testleri | error'da PUT +1; conflict'te istek yok, bildirim görünür |
| AC6 | AppSession 188/211/231/316/488 testleri | retry sonrası yeşil; discard/reload sonrası bildirim yok; `busy` iken pasif |
| AC7 | "Unsaved-changes gate" testleri + 211'deki unload kontrolü | değişmeden geçer |
| AC8 | komutlar | hepsi başarılı |

**Komutlar** (`frontend/` içinde):
- Hedefli: `npm test -- src/shared/project-store/writeQueue.test.ts src/app/project-session src/app/layout/TopWorkspaceNav.test.tsx src/app/AppSession.test.tsx`
- Tam: `npm test`, `npm run lint`, `npm run build`. Backend değişmediği için `mvn` gerekmez.
- Elle: `docs/e2e/18-proje-revizyon-cakismasi.md` iki sekmeyle yeniden yürütülür.

**Riskler:**
- Kullanıcı bildirimi görmeden çalışmaya devam edebilir. Her düzenlemede yeniden gösterim, çıkış kapısı ve `beforeunload` sınırlar; sürekli görünür gösterge yoktur (reddedilen Seçenek B bunu kapatırdı).
- Her tuş vuruşu bildirimi yeniden gösterir; zamanlayıcı baştan başlar ama içerik yanıp sönmez.
- Erişilebilirlik: düğmeli ve süreli bildirim için duraklatma şarttır; `role=alert` tekrarında ekran okuyucu metni yeniden okur, kabul edilebilir.
- AppSession testleri gerçek zamanlayıcıyla 8 sn beklememeli; kalkma yalnızca hook testinde fake timers ile doğrulanır.
- Backend istek profili değişmez (otomatik yeniden deneme yok).

**Varsayımlar:**
- Hata metinleri ve `describeSaveProblem` aynı kalır, yalnızca yerleri değişir.
- Hata bildirimi `UnsavedChangesModal`'ın altında kalır (z-index 1500 < 2000).
- Proje içi workspace linkleri durmuş kuyruk için ek onay istemez (bugünkü davranış).
