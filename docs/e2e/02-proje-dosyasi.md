# 02 — Proje dosyasını kaydet ve yeniden aç

**Amaç:** Tarayıcı projesinin `.kopruq` dosyasına yazılıp aynı verilerle geri açıldığını doğrulamak.

**Ön koşul:** 01 geçti; ayrı test profili ve yazılabilir test klasörü var. Bu dosya backend `ProjectRepository` senkronizasyonunu test etmez.

## Adımlar

1. **File → New Project** ile boş test projesi açın. Project Overview'de **Edit Project** seçip **Project Name** alanına `E2E Proje 02` yazın ve sayfa içindeki **Save** ile düzenlemeyi bitirin.
2. **Project → Units & Preferences** içinde Length birimini `mm` yapın; Project Overview'e dönün. Birim seçimleri burada anında uygulanır.
3. **File → Save As...** ile `e2e-proje-02.kopruq` adlı yeni bir dosya oluşturun. Tarayıcı dosya seçici desteklemiyorsa indirilen dosyayı test klasörüne alın.
4. Dosyayı bir metin düzenleyicide okuyun: `format` değeri `KOPRUQ_PROJECT`, `schemaVersion` değeri `1`, `projectState` ve `graph` alanları bulunmalı. Dosyanın içeriğini değiştirmeyin.
5. **File → New Project**, ardından **File → Open...** ile kaydettiğiniz dosyayı açın. Project adını ve Length birimini kontrol edin; sayfayı yenileyip tekrar kontrol edin.

## Geçme ölçütü

- Kaydetme gerçekten bir `.kopruq` dosyası üretir; açma hata vermeden tamamlanır.
- Proje adı ve `mm` birimi açma ve yenileme sonrasında korunur.
- Bu işlem için `/api/project` gibi mevcut olmayan bir sunucu kaydetme isteği beklenmez; dosya tarayıcı tarafındaki proje durumunun dışa aktarımıdır.

**Kanıt:** Dosya adı, JSON üst alanları, açmadan önce/sonra ekran görüntüsü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
