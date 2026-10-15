# Implementation: save-error-toast

Sonuç: IMPLEMENTED (frontend; backend ve bağımlılıklar değişmedi, commit yok). Baseline HEAD: `8d71cc6339062749799281798fe0f64b31af076b`.

## Dosyalar
- `shared/project-store/writeQueue.ts` (+ test, 4 yeni test): `onHeldWrite(listener)`; durmuş kuyrukta `enqueue` içinde `guard` ile çağrılır, `dispose`'ta temizlenir.
- `app/project-session/saveToastTracker.ts`: `SAVE_ERROR_TOAST_MS = 8000`, `isSaveProblem` export.
- `app/project-session/useSaveToast.ts` (+ test, fake timers): `useSaveToast(session, queue)` -> `{ toast, reshow, pause, resume }`; session ve `onHeldWrite` aboneliği; hata 8 sn, başarı 1,5 sn; duraklat/devam; held write veya `reshow()` id'yi korur, zamanlayıcıyı yeniler; durum sorundan çıkınca/epoch değişince kapanır; unmount testi her iki abonelik ve zamanlayıcıyı doğrular.
- `app/project-session/SaveToast.tsx` (+ yeni `SaveToast.test.tsx`): `role=status` taşıyıcı sadece başarı toast'unu tutar; hata toast'u ayrı `role="alert"` `aria-label="Kayıt bildirimi"`, `describeSaveProblem` başlığı/ayrıntıları ve düğmeler; hover/focus duraklatır.
- Silindi: `SaveStatusIndicator.tsx` ve testi. `TopWorkspaceNav.tsx` (+ test): kullanılmayan prop'lar kaldırıldı.
- `App.tsx`: toast bağlantısı; `onSaveNow` dallanması (error/rejected -> `retrySaves()`, conflict -> `reshow()`, aksi halde `flush`).
- `18-project-session.css`: `.spn-session-status*` kaldırıldı; `.spn-save-toast-failed`, `.spn-save-toast-actions` eklendi.
- `AppSession.test.tsx`: hata toast yardımcıları (`failedToast()` vb.), 8 sn yerine testte kısaltılmış zamanlayıcı; mevcut conflict/500/rejected/busy/reload testleri güncellendi; yeni: kalktıktan sonra aynı anahtarda düzenleme toast'u geri getirir ve PUT gitmez; Ctrl+S 500 sonrası yeniden dener; Ctrl+S conflict'te istek atmaz; toast kalktıktan sonra Exit kapısı modal açar.
- Docs: `docs/e2e/18-proje-revizyon-cakismasi.md`, `docs/architecture.md`, `docs/roadmap.md`.

## Kabul ölçütleri
AC1-AC8 karşılandı (uygulayıcı raporu + koordinatörün kontrolü): nav'da status/alert yok ve `SaveStatusIndicator` / `spn-session-status` kullanımı kalmadı (grep); hata toast'u başlık/ayrıntı/düğmeler; 8 sn ve duraklatma (hook testleri); held write ile yeniden gösterim ve PUT sayısı sabit; Ctrl+S dallanması; retry -> yeşil, discard/reload -> toast yok, `busy` iken düğmeler pasif, `mayLeave()` korunur; Exit/Open/New kapısı ve `beforeunload` değişmedi.

## Kontroller (frontend/)
- `npx tsc -b`: temiz.
- Hedefli test: 19 dosya, 255 test geçti (uygulayıcı).
- `npm test`: 120 dosya, 1137 test geçti (koordinatör yeniden çalıştırdı).
- `npm run lint`: hata yok, yalnızca eski uyarılar (koordinatör doğruladı).
- `npm run build`: başarılı.
- Çalıştırılmadı: backend `mvn` (değişmedi), `docs/e2e/18` iki sekmeli elle yürütme.

## Sapmalar ve kalan iş
- Hata toast'unun başlığı `describeSaveProblem`'dan gelir ("Kayıt hatası" / "Kayıt reddedildi" / "Çakışma"); "Kaydedilemedi" metni yalnızca eski başarı/hata toast'u tasarımında vardı. Bu plana uygundur.
- AppSession testleri 8 sn beklememek için `setTimeout` gecikmesini testte kısaltır; gerçek 8 sn hook testinde fake timers ile doğrulanır.
- Hata toast'u ve başarı toast'u aynı sağ üst konumda, aynı anda yalnızca biri vardır.
- Kalan: tarayıcıda konum/tıklanabilirlik/hover duraklatma kontrolü ve `docs/e2e/18` elle yürütmesi.
