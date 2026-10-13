# 07 — Rüzgâr sonucu güncelliğini kaybettiğinde saklama

**Amaç:** Backend rüzgâr yanıtının UI'da gösterilmesini; girdi değişince önceki sonucun `STALE` olmasını kontrol etmek.

**Ön koşul:** Test projesi ve çalışan backend. `27 m/s` ile `10 m` yalnızca sentetik yazılım test girdileridir; tasarım değeri değildir.

## Adımlar

1. **Loads** (`/loads`) → **Wind** açın. `Basic Wind Velocity, vb = 27`, `Terrain Category = II`, `Reference Height, ze = 10` girin.
2. **Calculate Wind** seçin. Network'te `POST /api/wind-loads/resolve` isteğini ve yanıtın `status` alanını not edin.
3. Sonuç `VALID` ise **Wind Actions** ve **Details** değerlerinin göründüğünü kontrol edin. `INVALID` ise eksik/uygunsuz girdi mesajını kaydedin; sessizce sıfır sonuç gösterilmemeli.
4. `vb` değerini `28` yapın, **Calculate Wind** basmayın. `STALE` rozetini ve önceki sayısal sonucun gizlendiğini kontrol edin.
5. **Calculate Wind** tekrar seçin. Yeni istek sonrası `STALE` kalkmalı; sonuç veya açık hata güncel girdilere ait olmalı.

## Geçme ölçütü

- UI sonucu API yanıtının durumuyla tutarlıdır; eski değerler yeni girdilerle `VALID` diye gösterilmez.
- Ağ hatası/400 olursa hata mesajı ve varsa `Ref` kimliği görünür; son başarılı sonuç yeni hesapmış gibi sunulmaz.
- Rüzgâr hesabının yönetmeliğe uygunluğu bu senaryonun kapsamı dışındadır.

**Kanıt:** İki isteğin payload/yanıtı, `STALE` ekranı. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
