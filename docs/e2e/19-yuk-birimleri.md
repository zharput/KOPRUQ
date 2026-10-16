# 19 — Yük birimlerinin proje tercihine göre gösterimi

**Amaç:** Project > Units & Preferences içindeki Force, Length ve Temperature seçimlerinin Loads sekmelerinde değer ve etiketleri değiştirdiğini, ama kaydedilen (kanonik SI) değerlerin değişmediğini kontrol etmek.

**Ön koşul:** Backend çalışıyor, ayrı bir test projesi açık. Değerler sentetik test girdileridir; mühendislik kabulü değildir.

## Adımlar

1. `/loads` → **Self Weight & Permanent** açın. Varsayılan birimlerde (kN, m, °C) etiketler `kN/m`, `kN/m³`, `m`; değerler 4 ondalıkla görünür (örn. Guardrail unit load `2.0000`, satır sonucu `4.0000 kN/m`).
2. Project > Units & Preferences içinde **Force = tonf** seçin, Loads'a dönün. Guardrail unit load `0.2039`, satır sonucu `0.4079 tonf/m`, birim ağırlıklar `tonf/m³` (24 → `2.4473`, Concrete Self Weight `2.5493`) olmalı. **Mass** tercihini değiştirin: Loads değerleri değişmemeli.
3. **Length = mm** seçin. Kalınlık/genişlikler 1 ondalıkla mm (`0.10 m` → `100.0`), birim yük/ağırlık etiketleri `tonf/mm`, `tonf/mm³`; bu değerler 4 anlamlı hane gösterir (örn. `0.0004079 tonf/mm`; çok küçük olanlar bilimsel gösterimle yazılır, örn. Force=kN iken `2.400e-8`; tonf iken sayı farklıdır, biçim aynıdır). **Length = cm** seçin: uzunluklar 3 ondalık (`10.000`).
4. **Length = mm** seçin, sonra **Traffic** → Carriageway & Notional Lanes: sütun başlığı `Width (mm)`, değerler mm. **LM1**: Tandem kuvveti `tonf` (300 kN → `30.59`), UDL `tonf/m²` (Length=m iken `0.9177`), α değişmemeli. Preview & Validation uzunlukları seçili Length biriminde olmalı.
5. **Wind**: Length=mm iken **Reference Height, ze** alanına `10000` yazın, vb girip **Calculate Wind** çalıştırın. Network'te `zeM` değeri `10` olmalı. Birimi tekrar m yapın: alan (odak dışında) `10.0000` görünmeli ve sonuç **STALE** olmamalı. vb/vm için m/s sabit notu görünmeli.
6. **Temperature**: Temperature = °F seçin, Te,min alanına `-4`, Te,max `104`, T0 `50` girin. Network'te istek gövdesi `-20`, `40`, `10` (°C) olmalı; ΔT değerleri °F farkı olarak görünmeli (örn. -20 °C fark için `-36.00 °F`). K ve °C'ye geçince değerler aynen dönmeli.
7. **Seismic**: agR/ag için `g`, periyotlar için `s` birimlerinin proje biriminden bağımsız olduğunu belirten not görünmeli, değerler değişmemeli.
8. Birimleri değiştirirken Network sekmesini izleyin: birim değişikliğinin kendisi hiçbir `PUT /api/projects/<id>/loads/...` isteği göndermemeli. Birim seçimi anında uygulanır, kaydet/iptal gerekmez. Birimleri kN, m, °C'ye döndürün: tüm değerler başlangıçtakiyle aynı olmalı.

## Geçme ölçütü

- Etiketler ve değerler seçili birimlerle tutarlıdır; Length=m/cm/mm ondalık kuralı (m 4, cm 3, mm 1 ondalık, türevler mm'de 4 anlamlı hane) uygulanır.
- Saklanan değerler ve backend isteklerinde birimler her zaman kanonik SI/°C'dir.
- Birim değişikliği yük bölümlerine yazma isteği oluşturmaz ve Wind sonucunu tek başına STALE yapmaz.
- m/s, g ve s büyüklükleri proje birimlerinden etkilenmez ve bu ekranda belirtilir.
- Birimlerin mühendislik olarak doğru tercih edilmesi bu testte değerlendirilmez.

**Kanıt:** Her birim kümesi için ekran görüntüleri, Wind ve Temperature istek gövdeleri, birim değişimi sırasında PUT'un olmadığını gösteren Network kaydı. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
