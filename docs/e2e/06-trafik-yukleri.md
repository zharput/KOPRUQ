 # 06 — Trafik yükleri: LM1 override ve LM2 durumu

**Amaç:** Frontend girdisinin trafik API'sine gitmesini, kaynak bilgisinin değişmesini ve LM2'nin pasif kalmasını kontrol etmek.

**Ön koşul:** Backend çalışıyor; bir test projesi açık. `1.1` burada yalnızca **sentetik arayüz test verisidir**, mühendislik onayı değildir.

## Adımlar

1. **Loads** (`/loads`) → **Traffic** → **LM1** açın. Network'te `/api/traffic-loads/lm1-defaults` ve `/api/traffic-loads/resolve` yanıtlarını kontrol edin.
2. İlk LM1 `α` alanındaki değeri ve **Preview & Validation** içindeki `Project overrides (LM1)` sayısını not edin.
3. İlk `α` alanına `1.1` yazıp **Enter** basın veya alandan çıkın. Aynı satırdaki etkin değerin ve override sayısının güncellendiğini kontrol edin; Network'te yeni `resolve` isteği görünmeli.
4. Aynı satırın **EN default** düğmesine basın. Alanın varsayılana dönmesini ve override sayısının önceki seviyeye inmesini kontrol edin.
5. **LM2** sekmesine geçin. `NOT IMPLEMENTED` bilgisinin görünmesini; hesaplama, etkinleştirme veya sahte sonuç düğmesi bulunmamasını kontrol edin.
6. İlk `α` alanına yeniden `1.1` yazın. Yeşil **Kaydedildi** bildiriminden sonra Network'te `PUT /api/projects/<id>/loads/traffic-lm1` isteğini kontrol edin; sayfayı yenileyip seçimin aynı projede korunduğunu doğrulayın.

## Geçme ölçütü

- LM1 API isteği başarıyla döner; override ve reset davranışı UI/istek/yanıtta tutarlıdır.
- LM1 proje girdisi sunucuya yazılır ve yenilemede geri gelir; `resolve` sonucu ayrı bir hesap yanıtıdır.
- LM2 görünür fakat pasiftir. Trafik yük grupları ile EN 1990 yük kombinasyonları aynı işlem gibi sunulmaz.
- Bu senaryo LM1 katsayısının mühendislik açısından doğru olduğunu kanıtlamaz.

**Kanıt:** İlgili Network istekleri, override önce/sonra görüntüsü, LM2 ekranı. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
