# 02 — Sunucu projesini kaydet ve yeniden aç

**Amaç:** Proje bilgisi ve birim seçiminin PostgreSQL'deki aynı projeye yazılıp yeniden açıldığında geri geldiğini doğrulamak.

**Ön koşul:** 01 geçti; yerel/test veritabanı kullanılıyor. Bu senaryo yeni bir proje kaydı oluşturur.

## Adımlar

1. **File → New Project...** seçin, ad olarak `E2E Proje 02` girip **Oluştur**'a basın. Network'te `POST /api/projects` yanıtını ve URL'deki `?project=<id>` değerini not edin.
2. **Project Overview → Edit Project** ile **Project Name** değerini `E2E Proje 02 Güncel` yapın; bölüm içindeki **Save** düğmesine basın. Network'te `PUT /api/projects/<id>/workspace` isteğini görün. Bu düğme editörü bitirir; sunucu yazmasının tamamlandığını üst çubuktaki **Kaydedildi** durumuyla doğrulayın.
3. **Project → Units & Preferences** içinde **Length** birimini `mm` yapın. Birim hemen uygulanmalı; aynı proje için `workspace` yazması ve ardından **Kaydedildi** görünmeli.
4. `GET /api/projects/<id>` yanıtında `workspace` içindeki proje adı ve uzunluk birimini kontrol edin. Yanıttaki `revision`, ilk oluşturma yanıtındakinden büyük olmalı.
5. **File → Exit** ile karşılama ekranına dönün. **File → Open...** listesinden aynı projeyi seçin; proje adı ve `mm` birimini kontrol edin. Sayfayı `?project=<id>` korunarak yenileyip tekrar kontrol edin.

## Geçme ölçütü

- Oluşturma `POST`, değişiklikler `PUT`, yeniden açma `GET /api/projects/<id>` ile yapılır; proje kimliği aynı kalır.
- Proje adı ve birim, **Kaydedildi** sonrasında Exit/Open ve tam sayfa yenilemesinde korunur.
- Dosya seçici veya `.kopruq` dışa aktarımı beklenmez.

**Kanıt:** Proje ID'si, POST/PUT/GET durumları ve revizyonları, yeniden açma öncesi/sonrası ekran görüntüsü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
