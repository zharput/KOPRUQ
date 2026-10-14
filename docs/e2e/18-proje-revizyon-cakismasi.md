# 18 — İki sekmede proje revizyonu çakışması

**Amaç:** Aynı projeyi iki sekmede düzenlerken eski revizyonla gelen yazmanın reddedildiğini ve kullanıcının sunucu durumunu yeniden yükleyebildiğini doğrulamak.

**Ön koşul:** Ayrı bir test projesi oluşturun. İki sekmede de aynı `?project=<id>` adresini açın; ikisinde de **Kaydedildi** görünene kadar bekleyin. Bu senaryo yalnızca test verisini değiştirir.

## Adımlar

1. Sekme A'da **Project Overview → Edit Project** ile proje adını `E2E Çakışma A` yapıp bölüm içindeki **Save** düğmesine basın. Üst çubukta **Kaydedildi** görünene kadar bekleyin; Network'te başarılı `PUT /api/projects/<id>/workspace` yanıtının `revision` değerini not edin.
2. Sekme B'yi yenilemeden aynı proje adını `E2E Çakışma B` yapıp **Save** seçin. Network'te eski `expectedRevision` ile giden `PUT /api/projects/<id>/workspace` isteğini ve HTTP 409 yanıtını kontrol edin.
3. Sekme B'deki kayıt çakışması uyarısını ve **Yeniden yükle** seçeneğini görün. Yeniden yüklemeden önce B'nin değerinin sunucuya kaydedilmiş gibi gösterilmediğini doğrulayın.
4. Sekme B'de **File → Exit** seçin. **Kaydedilmemiş değişiklikler** penceresinde **TEKRAR DENE** pasif, **İPTAL** etkin olmalı. **İPTAL** ile aynı projede kalın.
5. **Yeniden yükle** seçin. `GET /api/projects/<id>` tamamlanınca proje adı `E2E Çakışma A` olmalı; üst çubuk yeniden **Kaydedildi** göstermeli. Yeni bir otomatik birleştirme veya B değerini sessizce yazma olmamalı.

## Geçme ölçütü

- İkinci sekmenin eski revizyonlu yazması 409 ile reddedilir; sunucudaki A değeri korunur.
- Uyarı ve kaydedilmemiş değişiklik kararı kullanıcıya görünür; **Yeniden yükle** sunucu verisini getirir ve çakışma durumundan çıkar.
- İki sekme arasında otomatik birleştirme veya son yazanın sessizce kazanması yaşanmaz.

**Kanıt:** İki PUT isteğinin `expectedRevision` değerleri, 409 yanıtı, uyarı ve yeniden yükleme sonrası proje adı. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
