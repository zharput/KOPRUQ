# 15 — Deprem spektrumu giriş durumu

**Amaç:** Girdi eksikken veya geçersizken spektrumun geçerli sonuç gibi sunulmamasını ve güncel istekle eşleşmesini kontrol etmek.

**Ön koşul:** Backend çalışıyor. `agR = 0.2`, `γI = 1` yalnızca sentetik yazılım test girdileridir; proje deprem parametresi değildir.

## Adımlar

1. `/loads` → **Seismic** açın. `Reference PGA, agR` ve `Importance Factor, γI` boşken sonuç grafiğinde geçerli hesap eğrisi olmamalı.
2. `agR = 0.2`, `γI = 1` girin; Ground Type ve Spectrum Type varsayılanlarını koruyun. Network'te `/api/seismic/spectrum` yanıtının `status` alanını kaydedin.
3. Sonuç `VALID` ise grafik/Details görünümünün geldiğini; `INVALID` ise boş grafik ve açık uyarı gösterildiğini kontrol edin.
4. `agR` alanını silin. Önceki geçerli spektrum yeni eksik giriş için gösterilmemeli. Tekrar `0.2` girince güncel yanıt görüntülenmeli.

## Geçme ölçütü

- Eksik girişte eski eğri veya sayısal değerler geçerliymiş gibi kalmaz.
- UI durumunun API `status` değeriyle ilişkisi açıktır; eski istek gecikirse yeni girdinin sonucunu ezmez.
- Spektrum şeklinin tasarım yönetmeliğine uygunluğu bu yazılım senaryosunda onaylanmaz.

**Kanıt:** İki girdi durumu, Network yanıtı, grafik/uyarı görüntüsü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
