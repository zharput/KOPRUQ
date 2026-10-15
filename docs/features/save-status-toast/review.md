# İnceleme: save-status-toast

Başlangıç HEAD ve şimdiki HEAD: `afa2fd01c58284f23e13833cc356815ad4f5dad5`. İnceleme sonrası çalışma ağacı anlık görüntüsü değişmedi (stale değil).

**Karar: CHANGES_REQUESTED** (yalnızca P3 bulgular; P0-P2 yok, davranış veya veri bütünlüğü açısından engelleyici bulgu yok.)

## Bulgular

- **P3-1:** Toast `top: 64px` ile konumlanıyor, `.spn-workspace-nav` yüksekliği 80px (`02-workspace-shell.css:4`). Dar pencerede toast çubuğun alt 16px'ini 1,5 sn örtebilir (yalnızca görsel; `pointer-events: none`). Yer: `frontend/src/app/styles/app/18-project-session.css:16`. Öneri: `top: 88px` veya paylaşılan nav yüksekliği değişkeni; tarayıcıda kontrol.
- **P3-2:** Tanımsız `var(--text)` (`18-project-session.css:16`). Etkisi yok (`data-kind` rengi eziyor). Öneri: `var(--text-primary)`.
- **P3-3:** Live region her bildirimde içeriğiyle birlikte yeniden DOM'a ekleniyor (`SaveToast.tsx:7`, `App.tsx:146` `key={saveToast.id}`); bazı ekran okuyucu/tarayıcı ikilileri başarı duyurusunu okumayabilir (doğrulanmadı). Hata durumunda kalıcı `role=alert` bloğu okunur. Öneri: kalıcı boş `aria-live="polite"` taşıyıcı, yalnızca metin değişsin.
- **P3-4:** `18-project-session.css:1` yorumu ve `docs/architecture.md` (~3302) "only `.spn-session-*` selectors" diyor; yeni `.spn-save-toast` buna uymuyor. Öneri: yorum/belge güncellensin veya seçici yeniden adlandırılsın.
- **P3-5:** `docs/e2e/07-ruzgar-guncellik.md:11` dil hatası: "çıktığını de" -> "çıktığını da".
- **P3-6:** Test boşlukları: `useSaveToast.test.tsx:66-70` unmount testi aboneliğin bırakıldığını doğrulamıyor; `reportLocalRejection`, Open/Exit/bekleyen yazmasız Ctrl+S ve `projectId !== null` koşulu doğrudan test edilmiyor; `AppSession.test.tsx:213,256` anlık tek `queryByText`.

## Mantık doğrulaması (kaynak okunarak)
Başarılı yazma sırası (`setRevision` -> `publish` idle) izleyici kuralıyla uyumlu; art arda yazmalarda tek "Kaydedildi"; uçuştaki istek atılması, gate discard ve hata sonrası discard sahte bildirim üretmiyor; `begin/end` epoch'u artırdığı için Reload/Open/New/Exit toast göstermiyor; validation/revision hatalarında "Kaydedilemedi"; Tekrar dene başarısında "Kaydedildi". Hook zamanlayıcıyı yeni bildirimde ve unmount'ta temizliyor; StrictMode çift toast riski görülmedi. Z-index 1500 modal (2000) altında. Kalıcı blok ve "Kaydediliyor…" değişmedi. Yeni bağımlılık/endpoint/mühendislik kuralı yok.

## AC kapsamı
AC1, AC3, AC6, AC7: karşılanıyor. AC2: "Add bridge" akışıyla test ediliyor (Edit Project -> Save UI akışı doğrudan değil, aynı `workspace` yolu). AC4: karşılanıyor, `reportLocalRejection` testi yok. AC5: mantıkla karşılanıyor, Open/Exit/Ctrl+S doğrudan test edilmiyor. AC8: kaynakta yeni bağımlılık yok; test/lint/build sonuçları implementer raporu + koordinatör yeniden çalıştırması.

## Sınırlar
Reviewer test/lint/build ve git çalıştıramadı; yalnızca kaynak incelemesi yaptı. Görsel (P3-1) ve ekran okuyucu (P3-3) elle kontrol gerektirir. `docs/e2e/02` elle yürütülmedi.
