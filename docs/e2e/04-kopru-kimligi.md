# 04 — Köprü envanteri ile Graph sahipliği

**Amaç:** İki köprü arasında geçerken Graph belgelerinin birbirine karışmadığını kontrol etmek.

**Ön koşul:** Ayrı test projesi açın. Başka projedeki köprü adlarını tekrar kullanmayın.

## Adımlar

1. **Project → Bridge Information** (`/project/bridge-information`) açın. **+ Add bridge** ile `E2E-A` ve `E2E-B` satırlarını ekleyin; formun zorunlu alanlarını doldurup her satırda **Save** seçin.
2. **Graph** (`/graph`) açın. **Bridge** seçiminden `E2E-A` seçip Graph adını `A grafiği` yapın; Node Library'den bir **Number** düğümü ekleyin.
3. Bridge seçiminden `E2E-B` seçin. Bu köprüye ait boş/ayrı Graph açılmalı. Graph adını `B grafiği` yapın.
4. `E2E-A`'ya geri dönün. `A grafiği` ve eklediğiniz düğüm hâlâ orada olmalı; `B grafiği`nin içeriği A'ya taşınmış olmamalı.
5. Sayfayı yenileyip iki köprü arasında bir kez daha geçin. Network/Console hatası olup olmadığını not edin.

## Geçme ölçütü

- Köprü A ve B'nin Graph içerikleri ve adları birbirinden bağımsız kalır.
- Yenileme sonrasında seçim ve iki ayrı köprüye ait belge sahipliği kaybolmaz.
- Köprü bilgisi ekranında değişiklik yalnızca o projeye uygulanır; backend'de köprü projesi kaydı beklentisi yoktur.

**Kanıt:** A/B Graph ekran görüntüleri ve yenileme sonrası durum. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
