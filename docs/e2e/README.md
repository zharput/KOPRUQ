# KOPRUQ manuel uçtan uca test rehberi

Bu klasör, **yazılım davranışını** tarayıcıdan başlayıp gerekiyorsa API ve veritabanına kadar kontrol etmek içindir. `01`–`05` frontend ve proje dosyasını, `06`–`11` frontend → backend akışlarını, `12`–`16` diğer mevcut ekranları, `17` henüz uygulanmamış ekranların dürüst durumunu kapsar. **Her numaralı dosyada tek bir senaryo vardır.** Bunlar otomatik Playwright testleri değil, adım adım uygulanacak manuel kabul testleridir; mevcut otomatik testler Vitest/JUnit altındadır.

## Başlamadan önce

1. Test için ayrı bir tarayıcı profili veya gizli pencere ve yalnızca **yerel/test veritabanı** kullanın. Mevcut proje dosyanızın üzerine kaydetmeyin.
2. JDK 21, Maven, Node.js ve Docker Desktop hazır olsun. Kök dizinde `.env.example` dosyasını `.env` olarak kopyalayıp `DB_PASSWORD` doldurun. İlk kez çalıştırıyorsanız `frontend/` içinde `npm.cmd install` yapın.
3. Kök dizinde `start-dev.bat` çalıştırın. <http://localhost:8080/actuator/health> yanıtı `UP`, <http://localhost:5173> uygulaması açılmalı. Ayrıntılar kök [README](../../README.md#yerel-çalıştırma) dosyasında.
4. Chromium tabanlı tarayıcıda **F12 → Network** (Preserve log) ve **Console** sekmelerini açın. API çağrısının URL, HTTP durum, istek/yanıt ve `X-Correlation-ID` bilgisini buradan görebilirsiniz. Gizli anahtar veya parola ekran görüntüsüne girmesin.
5. Senaryoda “yeni proje” deniyorsa **File → New Project** kullanın. Bu işlem tarayıcıdaki mevcut proje durumunu sıfırlar; önce gereken dosyayı kaydedin. Backend PostgreSQL verisini sıfırlamaz.

## Sıra ve kapsam

| Sıra | Senaryo | Ana kontrol |
| --- | --- | --- |
| 01 | [Ortam ve gezinme](01-ortam-ve-gezinme.md) | Tarayıcı, rotalar, API sağlık durumu |
| 02 | [Proje kaydet ve yeniden aç](02-proje-dosyasi.md) | `.kopruq` round trip |
| 03 | [Hatalı proje dosyası](03-hatali-proje-dosyasi.md) | Hata ve önceki verinin korunması |
| 04 | [Köprü kimliği](04-kopru-kimligi.md) | Envanter ↔ Graph sahipliği |
| 05 | [Graph → Family](05-graph-family.md) | Aday, güncellik ve yeniden çalıştırma |
| 06 | [Trafik yükleri](06-trafik-yukleri.md) | LM1 override/provenance, LM2 pasif |
| 07 | [Rüzgâr sonucu](07-ruzgar-guncellik.md) | API sonucu ve `STALE` durumu |
| 08 | [LandXML içe aktarma](08-landxml-kalici-veri.md) | Frontend → API → PostgreSQL |
| 09 | [Yerleşim → alternatif](09-yerlesim-alternatif.md) | İki API akışı arasında seçimin aktarılması |
| 10 | [Fast Solver](10-fast-solver.md) | Analiz isteği, yanıt ve hata kontrolü |
| 11 | [API hata sözleşmesi](11-api-hata-sozlesmesi.md) | 400 yanıtı ve korelasyon kimliği |
| 12 | [Malzeme kataloğu](12-malzeme-katalogu.md) | Proje dosyasında katalog seçimi |
| 13 | [Bridge Definition](13-kopru-tanimi.md) | Seçili açıklıklardan akslar ve dosya round trip |
| 14 | [Sıcaklık](14-sicaklik-durumu.md) | Eksik/güncel API sonucu |
| 15 | [Deprem](15-deprem-durumu.md) | Spektrum girdisi ve eski sonucun saklanması |
| 16 | [Cost Database](16-maliyet-tablosu.md) | Excel görüntüleme ve bilinen sınır |
| 17 | [Desteklenmeyen özellikler](17-desteklenmeyen-ozellikler.md) | Boş alanların sahte sonuç üretmemesi |

## Sonucu nasıl kaydetmeli?

Her dosyanın sonundaki alanı `PASS`, `FAIL` veya `BLOCKED` olarak doldurun. Bir hata için **adımlar, beklenen/gerçekleşen sonuç, tarayıcı ve sürümü, commit/branch, ekran görüntüsü, Network yanıtı ve varsa correlation ID** kaydedin. 400 yanıtı beklenen bir negatif testse senaryo `PASS` olabilir; uygulama çökerse `FAIL` olur. Altyapı yoksa `BLOCKED` yazın.

Bu senaryolar bir **mühendislik onayı** vermez. Yazılımcı olarak birimlerin görünmesini, giriş/çıkış tutarlılığını, sonucun güncelliğini ve hata durumunu kontrol edebilirsiniz. Hesabın Eurocode'a uygunluğu, kesitin yeterliliği, yük katsayıları, deprem/rüzgâr kabulü ve solver doğruluğu için onaylı sayısal referans ile inşaat mühendisi gerekir. Şüpheli sayısal sonucu “PASS” diye yorumlamayın; teknik akışı ayrı, mühendislik doğrulamasını ayrı kaydedin.
