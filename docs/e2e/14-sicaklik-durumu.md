# 14 — Sıcaklık servisinin giriş ve sonuç durumu

**Amaç:** Sıcaklık girdilerinin doğru backend isteğine gitmesini ve eksik/güncel sonuçların ayrılmasını kontrol etmek.

**Ön koşul:** Backend çalışıyor. `0`, `20`, `10 °C` sentetik test girdileridir, tasarım sıcaklığı değildir.

## Adımlar

1. `/loads` → **Temperature** açın. Alanlar boşken hesaplanmış geçerli sonuç görünmediğini kontrol edin.
2. Yalnızca **Effective Minimum Temperature** alanına `0` yazın. Network'te `/api/temperature/uniform/resolve` isteğinin yanıtını not edin; eksik alanlar için UI `INVALID` veya açık eksik parametre durumu göstermeli.
3. **Effective Maximum Temperature = 20**, **Initial Temperature = 10** girin. Güncel API yanıtını bekleyin.
4. Sonuç `VALID` ise ekrandaki contraction/expansion alanlarının o yanıtla eşleştiğini; **Details** bölümünde kullanılan girişlerin gösterildiğini kontrol edin. Sonuç `INVALID` ise gerekçeyi kaydedin; eski geçerli sonucu yeni giriş için göstermemeli.

## Geçme ölçütü

- Eksik alanlar sıfıra çevrilip geçerli hesap gibi sunulmaz.
- Her yeni girdi kümesi için görünen durum ve değerler ilgili API yanıtına aittir; gecikmiş eski yanıt yenisini ezmez.
- Katsayıların veya sıcaklık kabulünün mühendislik doğruluğu bu testte değerlendirilmez.

**Kanıt:** Eksik ve tam girdi Network yanıtları, iki UI durumu. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
