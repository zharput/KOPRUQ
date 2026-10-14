# 04 — Köprü envanteri ile Graph sahipliği

**Amaç:** İki köprü arasında geçerken Graph belgelerinin birbirine karışmadığını kontrol etmek.

**Ön koşul:** Ayrı test projesi açın. 02'deki proje de kullanılabilir.

## Adımlar

1. **Project → Bridge Information** (`/project/bridge-information?project=<id>`) açın. **+ Add bridge** ile `E2E-A` ve `E2E-B` satırlarını ekleyin; formun zorunlu alanlarını doldurup her satırda **Save** seçin. Network'te aynı projeye ait `workspace` ve `bridge-definitions` yazmalarını, ardından **Kaydedildi** durumunu kontrol edin.
2. **Graph** (`/graph`) açın. **Bridge** seçiminden `E2E-A` seçip Graph adını `A grafiği` yapın; Node Library'den bir **Number** düğümü ekleyin.
3. Bridge seçiminden `E2E-B` seçin. Bu köprüye ait boş/ayrı Graph açılmalı. Graph adını `B grafiği` yapın.
4. `E2E-A`'ya geri dönün. `A grafiği` ve eklediğiniz düğüm hâlâ orada olmalı; `B grafiği`nin içeriği A'ya taşınmış olmamalı.
5. Üst çubukta **Kaydedildi** göründükten sonra sayfayı yenileyip iki köprü arasında bir kez daha geçin. Graph belgelerinin geri geldiğini, Network'te `GET /api/projects/<id>` çağrısını ve Console hatası olup olmadığını not edin. Yenileme sonrası hangi köprünün seçili açıldığına dair beklenti kurmayın; seçim arayüz durumudur.

## Geçme ölçütü

- Köprü A ve B'nin Graph içerikleri ve adları birbirinden bağımsız kalır.
- Yenileme sonrasında iki ayrı köprüye ait Graph belgeleri kaybolmaz; `PUT /api/projects/<id>/graphs/<graphId>` yazmaları ilgili proje altında kalır.
- Köprü bilgisi ve Graph değişiklikleri yalnızca seçili sunucu projesine uygulanır.

**Kanıt:** A/B Graph ekran görüntüleri ve yenileme sonrası durum. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
