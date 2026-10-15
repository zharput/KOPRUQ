# İnceleme: save-error-toast

**Durum: STALE / INCOMPLETE.** İnceleme sırasında çalışma ağacı değişti: `docs/e2e/02-proje-kalici-veri.md` incelemeden sonra değiştirilmiş görünüyor (kullanıcının "Kanıt/Sonuç" notu silinmiş, yalnızca "PASS" kalmış). Değişiklik ürün koduna dokunmuyor, ancak workflow gereği anlık görüntü eşleşmediği için rapor stale sayıldı ve `reviewed` çalıştırılmadı. İstenirse yeniden incelenebilir.

Reviewer kararı (kendi anlık görüntüsü için): **CHANGES_REQUESTED**. Başlangıç ve şimdiki HEAD: `8d71cc6339062749799281798fe0f64b31af076b`. Reviewer test/lint/build ve git çalıştıramadı; yalnızca kaynak okudu.

## Bulgular

- **P2-1:** Kapı modalı (`UnsavedChangesModal`) açıkken Ctrl+S kayıt yeniden denemesi başlatıyor. Yer: `frontend/src/app/App.tsx:120-124` (`saveNow` içindeki `retrySaves` dalı `sessionBusy`/`pendingSwitch`'e bakmıyor); `useProjectSessionController.ts:211-213` `retrySaves` bekleyen karara bakmıyor (`reloadProject` ve `exitProject` `pendingRef` ile korunuyor). Senaryo: kayıt 500 -> File > Exit, modal açılır -> Ctrl+S, PUT gider -> kullanıcı DEĞİŞİKLİKLERİ AT seçer -> sunucu PUT'u commit etmiş olabilir; kullanıcı "at" demesine rağmen değişiklik yazılır. Plan AC6 "busy iken düğmeler pasif" der; Ctrl+S aynı eylemin ikinci giriş noktasıdır. Öneri: `saveNow` retry dalında `sessionBusy`/`pendingSwitch !== null` iken atla; controller `retrySaves`'e `if (pendingRef.current !== null) return` ekle; "modal açıkken Ctrl+S PUT göndermez" testi ekle.
- **P3-1:** Duraklatma tek boolean: fare ve odak birlikteyken `resume` koşulsuz zamanlayıcıyı başlatıyor (`useSaveToast.ts` `pause`/`resume`, `SaveToast.tsx` olay bağlantıları). Senaryo: "Yeniden yükle"ye tıklanır (odak butonda), fare çıkınca toast odak içindeyken 8 sn sonra kapanır; odak `body`'ye düşer. AC3'teki "odak içindeyken kalkmaz" ihlal edilir. Takılı kalma (stuck pause) bulunmadı. Öneri: `hovered` ve `focusWithin` ayrı bayraklar, `onBlur`'da `relatedTarget` kontrolü, kapanışta odak yönetimi, karma senaryo testi.
- **P3-2:** Toast gizliyken yeni yerel ret (`reportLocalRejection`) bildirimi geri getirmiyor: `onHeldWrite` yalnızca `enqueue` dalında tetikleniyor (`writeQueue.ts:187/192`); `serverSection.ts:90,178` `enqueue` çağırmadan `reportLocalRejection` yapıyor. Öneri: durmuş kuyrukta `reportLocalRejection`'da da held-write dinleyicilerini çağır, test et.
- **P3-3:** `docs/e2e/18-proje-revizyon-cakismasi.md` 3. adımda anlamı ters çeviren hata: "fare üstündeyken ya da odaktayken **kalmaz**" olmalı "**kalkmaz**".

## Belirsiz hipotezler (doğrulanmadı)
- `onHeldWrite` dinleyicisi `enqueue` içinde senkron `setToast` çağırıyor; bir modül yazması render sırasında yapılırsa React uyarısı olabilir.
- Durmuş kuyrukta her tuş vuruşu 420px'e kadar `pointer-events:auto` toast'u sağ üstte yeniden gösteriyor; o bölgedeki bir alanı örtebilir (tarayıcıda kontrol edilmedi).
- Discard sonrası geç gelen 409 gibi error/rejected -> conflict geçişi toast gizliyken olursa bildirim geri gelmiyor (nadir).

## AC kapsamı
AC1, AC2, AC6 (Ctrl+S istisnası hariç), AC7: karşılanıyor. AC3: kısmen (P3-1). AC4: enqueue yolu karşılanıyor, yerel ret yolu değil (P3-2). AC5: error ve conflict dalları test edilmiş, rejected dalı test edilmemiş, busy açığı var (P2-1). AC8: kaynakta yeni bağımlılık/endpoint yok; komut sonuçları implementer raporu + koordinatör yeniden çalıştırması.

## Test notları
`shortenErrorToast` (`setTimeout` 8000 -> 50 ms spy) `vi.restoreAllMocks()` ile geri alınıyor ama 8000 ms kullanan başka zamanlayıcıyı da kısaltabilir (kırılgan, kabul edilebilir). Eksik testler: modal/busy açıkken Ctrl+S, rejected'da Ctrl+S, fare+odak karışık duraklatma, yerel retin toast'u geri getirmesi. `implementation.md` iddiaları kaynakla uyumlu; Ctrl+S'nin busy korumasını atladığı raporda yok.

## Sınırlar
Görsel/tarayıcı kontrolü ve `docs/e2e/18` elle yürütmesi yapılmadı. Stale: inceleme sonrası `docs/e2e/02-proje-kalici-veri.md` değişti.
