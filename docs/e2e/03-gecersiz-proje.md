# 03 — Bulunmayan proje kimliğiyle açma hatası

**Amaç:** Sunucuda bulunmayan bir proje kimliğiyle açma girişiminin açık bir hata göstermesini ve kayıtlı projeye dönüşü kontrol etmek.

**Ön koşul:** 02'de oluşturulan projenin ID'sini not edin. Tarayıcı Console'unda `crypto.randomUUID()` çalıştırarak bu test için yeni, sözdizimi geçerli bir ID üretin; hiçbir projeye atamayın.

## Adımlar

1. 02'deki projenin üst çubukta bekleyen yazma ya da hata bloğu bulunmadığını (kalıcı bir durum yazısı yoktur) doğrulayın ve proje adını not edin.
2. Aynı sekmede `http://localhost:5173/project?project=<bulunmayan-uuid>` adresine gidin. Network'te `GET /api/projects/<bulunmayan-uuid>` yanıtını kaydedin.
3. **Proje açılamadı** ekranında hata metnini, **Tekrar dene**, **Proje listesi** ve **Yeni proje** seçeneklerini kontrol edin. **Tekrar dene** aynı bulunmayan proje için başarılı açılış gibi davranmamalı.
4. **Proje listesi** ile 02'deki projeyi açın. Önceki adı ve `mm` birimini doğrulayın; URL'de yeniden doğru `?project=<id>` görünmeli.

## Geçme ölçütü

- Bulunmayan kayıt için `GET` HTTP 404 döner; uygulama boş/sahte proje açmaz veya çökmez.
- Hata ekranından kayıtlı proje tekrar açılır ve daha önce kaydedilen değerleri taşır.
- Bu senaryo bozuk `.kopruq` dosyasını test etmez; dosya içe aktarma bu sürümde yoktur.

**Kanıt:** 404 yanıtı, hata ekranı, yeniden açılan proje ID'si ve değerleri. **Sonuç:** PASS
