# 04 — Köprü envanteri ile Graph sahipliği

**Amaç:** İki köprü arasında geçerken Graph belgelerinin birbirine karışmadığını kontrol etmek.

**Ön koşul:** Ayrı test projesi açın. 02'deki proje de kullanılabilir.

## Köprü formuna girilecek test verileri

**+ Add bridge** formunu iki kez açıp her seferinde şu alanları doldurun:

| Alan | İlk köprü | İkinci köprü |
| --- | --- | --- |
| No | `E2E-A` | `E2E-B` |
| KM | `0+000.000` | `0+200.000` |
| Crossing Type | `Test Crossing A` | `Test Crossing B` |
| Estimated Length (m) | `120` | `80` |
| Road Width (m) | `10` | `10` |
| Terrain | `Not imported` | `Not imported` |
| Status | `Draft` | `Draft` |

Bu değerler yalnızca iki kaydı ve Graph sahipliğini ayırt etmek için kullanılan
test verileridir; mühendislik tasarım girdisi veya onaylı geometri değildir.
Formda **Save** düğmesini etkinleştirmek için yalnızca **No** alanı zorunludur.

## Adımlar

1. **Project → Bridge Information** (`/project/bridge-information?project=<id>`) açın. **+ Add bridge** ile yukarıdaki tabloya göre `E2E-A` ve `E2E-B` satırlarını ekleyin; her satırda **Save** seçin. Network'te aynı projeye ait `workspace` ve `bridge-definitions` yazmalarını, ardından sağ üstteki yeşil **Kaydedildi** bildirimini kontrol edin.
2. **Graph** (`/graph`) açın. **Bridge** seçiminden `E2E-A` seçip Graph adını `A grafiği` yapın; Node Library'den bir **Number** düğümü ekleyin.
3. Bridge seçiminden `E2E-B` seçin. Bu köprüye ait boş/ayrı Graph açılmalı. Graph adını `B grafiği` yapın.
4. `E2E-A`'ya geri dönün. `A grafiği` ve eklediğiniz düğüm hâlâ orada olmalı; `B grafiği`nin içeriği A'ya taşınmış olmamalı.
5. Yeşil **Kaydedildi** bildirimi göründükten sonra sayfayı yenileyip iki köprü arasında bir kez daha geçin. Graph belgelerinin geri geldiğini, Network'te `GET /api/projects/<id>` çağrısını ve Console hatası olup olmadığını not edin. Yenileme sonrası hangi köprünün seçili açıldığına dair beklenti kurmayın; seçim arayüz durumudur.

## Geçme ölçütü

- Köprü A ve B'nin Graph içerikleri ve adları birbirinden bağımsız kalır.
- Yenileme sonrasında iki ayrı köprüye ait Graph belgeleri kaybolmaz; `PUT /api/projects/<id>/graphs/<graphId>` yazmaları ilgili proje altında kalır.
- Köprü bilgisi ve Graph değişiklikleri yalnızca seçili sunucu projesine uygulanır.

**Kanıt:** A/B Graph ekran görüntüleri ve yenileme sonrası durum. **Sonuç:** PASS
