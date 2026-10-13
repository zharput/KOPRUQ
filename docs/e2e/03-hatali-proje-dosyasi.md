# 03 — Hatalı proje dosyası açıldığında mevcut veriyi koru

**Amaç:** Geçersiz `.kopruq` dosyasının reddedilmesini ve açık projenin bozulmamasını kontrol etmek.

**Ön koşul:** Test profili kullanın; önce geçerli projeyi farklı isimle yedekleyin. 02'deki dosya kullanılabilir.

## Adımlar

1. Geçerli `e2e-proje-02.kopruq` dosyasını açın ve Project Name değerini not edin.
2. Test klasöründe `bozuk-e2e.kopruq` adlı yeni bir metin dosyası oluşturup içine yalnızca `{}` yazın.
3. **File → Open...** ile `bozuk-e2e.kopruq` dosyasını seçin. Kaydedilmemiş değişiklik sorusu çıkarsa önce **Cancel** ile projenin korunduğunu gözleyin, sonra aynı açmayı tekrar deneyip **Don't Save** seçin.
4. Hata mesajını kaydedin. Project Overview'e dönüp önceki Project Name değerini ve mevcut köprü listesini kontrol edin.
5. **File → Save** kullanırsanız hedef dosyanın `bozuk-e2e.kopruq` olmadığından emin olun; uygulama bozuk dosyayı sessizce geçerli proje olarak benimsememelidir.

## Geçme ölçütü

- Geçersiz dosya için anlaşılır hata görünür; uygulama çökmez.
- Önceki proje verisi kaybolmaz veya bozuk dosya verileriyle karışmaz.
- Bozuk dosya sessizce üzerine yazılmaz. Kaydedilmemiş değişiklik kararı, seçilen **Cancel/Don't Save** yoluna uygun davranır.

**Kanıt:** Hata ekranı, önceki/sonraki proje adı, bozuk dosyanın değişmediği kontrolü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
