# KOPRUQ manuel uçtan uca test rehberi

Bu klasör, **yazılım davranışını** tarayıcıdan başlayıp gerekiyorsa API ve veritabanına kadar kontrol etmek içindir. `01`–`05` proje oturumu ve Graph/Family akışını, `06`–`11` frontend → backend işlemlerini, `12`–`16` diğer ekranları, `17` desteklenmeyen özellikleri, `18` eşzamanlı kayıt çakışmasını, `19` yük birimi gösterimini kapsar. **Her numaralı dosyada tek bir senaryo vardır.** Her senaryonun belgesi adım adım uygulanabilen manuel kabul testidir; ayrıca her senaryonun `frontend/e2e/NN-<ad>.spec.ts` adlı Playwright karşılığı vardır ([Otomatik çalıştırma (Playwright)](#otomatik-çalıştırma-playwright)). Otomatik spec belgenin bütün adımlarının yerini tutmaz: otomatikleştirilmeyen adımlar aynı bölümdeki eşleme tablosunda ve spec dosyasının başlık yorumunda yazılıdır. Birim testleri Vitest/JUnit altındadır.

## Başlamadan önce

1. Yalnızca **yerel/test veritabanı** kullanın ve senaryolar için ayrı bir test projesi oluşturun. **New Project** sunucuda kalıcı bir kayıt açar; mevcut projeyi test için düzenlemeyin.
2. JDK 21, Maven, Node.js ve Docker Desktop hazır olsun. Kök dizinde `.env.example` dosyasını `.env` olarak kopyalayıp `DB_PASSWORD` doldurun. İlk kez çalıştırıyorsanız `frontend/` içinde `npm.cmd install` yapın.
3. Kök dizinde `start-dev.bat` çalıştırın. <http://localhost:8080/actuator/health> yanıtı `UP`, <http://localhost:5173> uygulaması açılmalı. Ayrıntılar kök [README](../../README.md#yerel-çalıştırma) dosyasında.
4. Chromium tabanlı tarayıcıda **F12 → Network** (Preserve log) ve **Console** sekmelerini açın. API çağrısının URL, HTTP durum, istek/yanıt ve `X-Correlation-ID` bilgisini buradan görebilirsiniz. Gizli anahtar veya parola ekran görüntüsüne girmesin.
5. Senaryoda “yeni proje” deniyorsa **File → New Project...** ile ad verip **Oluştur** seçin. Oluşan `?project=<id>` adresini not edin. Kalıcı proje girdileri ilgili sunucu bölümüne otomatik yazılır; her yazma bitince sağ üstte kısa süre (yaklaşık 1,5 sn) yeşil **Kaydedildi** bildirimi çıkar; kalıcı bir durum yazısı yoktur. Yazma başarısız olursa kırmızı **Kaydedilemedi** bildirimi çıkar ve üst çubuktaki hata bloğu kalır. Proje oluşturma ve açma bildirim göstermez. **File → Open...** ve **Recent Projects** sunucudaki projeleri açar; **Exit** yalnızca oturumu kapatır. `.kopruq` dosyasını açma/kaydetme bu sürümde yoktur.

## Sıra ve kapsam

| Sıra | Senaryo | Ana kontrol |
| --- | --- | --- |
| 01 | [Ortam ve gezinme](01-ortam-ve-gezinme.md) | Tarayıcı, rotalar, API sağlık durumu |
| 02 | [Sunucu projesini kaydet ve yeniden aç](02-proje-kalici-veri.md) | `POST`/`PUT`/`GET /api/projects`, yeniden açma |
| 03 | [Bulunmayan proje kimliği](03-gecersiz-proje.md) | 404, hata ekranı ve geçerli projeye dönüş |
| 04 | [Köprü kimliği](04-kopru-kimligi.md) | Envanter ↔ Graph sahipliği |
| 05 | [Graph → Family](05-graph-family.md) | Aday, güncellik ve yeniden çalıştırma |
| 06 | [Trafik yükleri](06-trafik-yukleri.md) | LM1 override/provenance, LM2 pasif |
| 07 | [Rüzgâr sonucu](07-ruzgar-guncellik.md) | API sonucu ve `STALE` durumu |
| 08 | [LandXML içe aktarma](08-landxml-kalici-veri.md) | Frontend → API → PostgreSQL |
| 09 | [Yerleşim → alternatif](09-yerlesim-alternatif.md) | İki API akışı arasında seçimin aktarılması |
| 10 | [Fast Solver](10-fast-solver.md) | Analiz isteği, yanıt ve hata kontrolü |
| 11 | [API hata sözleşmesi](11-api-hata-sozlesmesi.md) | 400 yanıtı ve korelasyon kimliği |
| 12 | [Malzeme kataloğu](12-malzeme-katalogu.md) | Sunucu bölümü ve yeniden açma |
| 13 | [Bridge Definition](13-kopru-tanimi.md) | Seçili açıklık/aks verisinin sunucuda korunması |
| 14 | [Sıcaklık](14-sicaklik-durumu.md) | Eksik/güncel API sonucu |
| 15 | [Deprem](15-deprem-durumu.md) | Spektrum girdisi ve eski sonucun saklanması |
| 16 | [Cost Database](16-maliyet-tablosu.md) | Excel görüntüleme ve bilinen sınır |
| 17 | [Desteklenmeyen özellikler](17-desteklenmeyen-ozellikler.md) | Boş alanların sahte sonuç üretmemesi |
| 18 | [Eşzamanlı düzenleme çakışması](18-proje-revizyon-cakismasi.md) | 409, uyarı ve sunucudan yeniden yükleme |
| 19 | [Yük birimleri](19-yuk-birimleri.md) | Force/Length/Temperature tercihinin Loads ekranlarında görünümü |

## Sonucu nasıl kaydetmeli?

Her dosyanın sonundaki alanı `PASS`, `FAIL` veya `BLOCKED` olarak doldurun. Bir hata için **adımlar, beklenen/gerçekleşen sonuç, tarayıcı ve sürümü, commit/branch, ekran görüntüsü, Network yanıtı ve varsa correlation ID** kaydedin. 400 yanıtı beklenen bir negatif testse senaryo `PASS` olabilir; uygulama çökerse `FAIL` olur. Altyapı yoksa `BLOCKED` yazın.

Bu senaryolar bir **mühendislik onayı** vermez. Yazılımcı olarak birimlerin görünmesini, giriş/çıkış tutarlılığını, sonucun güncelliğini ve hata durumunu kontrol edebilirsiniz. Hesabın Eurocode'a uygunluğu, kesitin yeterliliği, yük katsayıları, deprem/rüzgâr kabulü ve solver doğruluğu için onaylı sayısal referans ile inşaat mühendisi gerekir. Şüpheli sayısal sonucu “PASS” diye yorumlamayın; teknik akışı ayrı, mühendislik doğrulamasını ayrı kaydedin.

## Otomatik çalıştırma (Playwright)

`frontend/e2e/` altında her senaryo için bir Playwright spec'i vardır (`NN-<ad>.spec.ts`, yalnız Chromium). Spec'ler gerçek backend'e ve PostgreSQL'e karşı çalışır; yazılım davranışını kontrol eder, **mühendislik doğrulaması yapmaz** (belgedeki ilke aynen geçerlidir). Assert edilen sayı ve metinler ya bu belgelerde yazılı değerlerdir (`frontend/e2e/support/scenarioData.ts`, her sabit kaynak belge ve adımıyla işaretli) ya da aynı testte yakalanan API yanıtından türetilir; backend'in hesapladığı sayılar sabit yazılmaz.

**Ön koşullar**

1. [Başlamadan önce](#başlamadan-önce) adımları: `.env`, Docker Desktop, `frontend/` içinde `npm.cmd install`.
2. Backend ve PostgreSQL ayakta olmalıdır (`start-dev.bat` veya kök README "Ayrı süreçler"). Testler **kalıcı kayıtlar** oluşturur: her çalıştırma `E2E-NN-<yyyyMMdd-HHmmss>-<4 hex>` adlı projeler bırakır ve projeleri silen bir API yoktur. Yalnızca yerel/test veritabanı kullanın; önerilen: Compose `postgres-test` profili (port 5433).
3. Bir kerelik tarayıcı kurulumu: `npm.cmd run test:e2e:install` (yalnız Chromium indirir).

**Komutlar** (`frontend/` içinde, PowerShell'de `npm.cmd`)

| Komut | Ne yapar |
| --- | --- |
| `npm.cmd run test:e2e` | 19 spec'in tamamı (tek worker, sırayla) |
| `npm.cmd run test:e2e -- e2e/05-graph-family.spec.ts` | Tek senaryo |
| `npm.cmd run test:e2e -- --repeat-each=2 e2e/18-proje-revizyon-cakismasi.spec.ts` | Kararlılık denemesi (05 ve 18 için önerilir) |
| `npx playwright test --list` | Spec'leri backend olmadan listeler |
| `npm.cmd run test:e2e:headed` / `test:e2e:ui` | Tarayıcıyı gösteren / Playwright UI modu |
| `npm.cmd run test:e2e:report` | Son HTML raporu (`playwright-report/`) |

Vite dev sunucusu 5173'te çalışıyorsa yeniden kullanılır, çalışmıyorsa Playwright `--strictPort` ile başlatır. Backend sağlık adresi (`http://localhost:8080/actuator/health`) `UP` değilse hiçbir test çalışmadan Türkçe bir hata ile durulur. Ortam değişkenleri: `E2E_BASE_URL` (varsayılan `http://localhost:5173`; CORS yalnız bu kaynağa izin verdiği için değiştirmeyin), `E2E_API_BASE` (varsayılan `http://localhost:8080`; çalışan bir Vite örneği yeniden kullanılıyorsa onun `VITE_API_BASE` değerini değiştirmez). Hata durumunda `test-results/` (ekran görüntüsü, video, trace) ve `playwright-report/` oluşur; ikisi de git'e girmez.

**Kurallar.** Her spec kendi projesini arayüzden oluşturur ve başka spec'e ya da sıraya bağlı değildir. Yazmalar `PUT /api/projects/<id>/...` yanıtı ve gövdesiyle beklenir (yeşil "Kaydedildi" bildirimi 1,5 sn yaşadığı için yalnız ek kanıttır); spec'lerde sabit bekleme yoktur. Her spec sonunda yakalanmamış `pageerror`, izin verilmemiş `console.error`, izin verilmemiş 4xx/5xx API yanıtı ve beklenmeyen dialog olmadığını denetler. Beklenen hata yanıtları yalnız ilgili testte gerekçeyle izinlidir (03: bulunmayan proje 404, 07: simüle edilen 400, 11: bozuk JSON 400, 18: revizyon çakışması 409) ve test raporunda not olarak görünür.

### Senaryo → spec → manuel kalan adımlar

| Senaryo | Spec | Otomatik doğrulanan | Manuel kalan / ikame |
| --- | --- | --- | --- |
| 01 | `01-ortam-ve-gezinme.spec.ts` | Sağlık `UP`, proje oluşturma, dört çalışma alanı, doğrudan URL ve yenileme, geri/ileri | F12 ekran görüntüsü yerine Console/Network denetimi otomatik |
| 02 | `02-proje-kalici-veri.spec.ts` | POST/PUT/GET, revizyon, ad ve `mm`, Exit/Open, yenileme, Kaydedildi bildirimi | `E2E Proje 02 Güncel` adı çalıştırma kimliğiyle benzersizleştirilir; ekran görüntüsü rapora eklenir |
| 03 | `03-gecersiz-proje.spec.ts` | 404 ve `PROJECT_NOT_FOUND`, hata ekranı, Tekrar dene, Proje listesi ile dönüş | Console'da `crypto.randomUUID()` yerine Node UUID'si |
| 04 | `04-kopru-kimligi.spec.ts` | İki köprü, A/B graph ayrımı, yenileme sonrası `graphs` | Ekran görüntüleri rapor eki. Yeni projede köprüye bağlı olmayan varsayılan "Untitled Graph" da kaydedilir; spec köprüye bağlı graph'ları sayar |
| 05 | `05-graph-family.spec.ts` | Bağlantı, Run, Family VALID/STALE, yenileme | **Adım 9 (başka köprüde negatif kontrol) manuel.** Belge "Run öncesi ERROR" der; uygulamada ERROR ve eksik bağlantı mesajı yalnız Run sonrası çıkar, spec bağlamadan bir Run yaparak bunu doğrular |
| 06 | `06-trafik-yukleri.spec.ts` | lm1-defaults/resolve, α=1.1 override, EN default, LM2, PUT, yenileme | Backend varsayılanları sabit yazılmaz |
| 07 | `07-ruzgar-guncellik.spec.ts` | Calculate, snapshot PUT, STALE, yenileme, `page.route` ile 400 hata yolu | Gerçek ağ kesintisi manuel. 200 dönen INVALID sonuç da snapshot olarak yazılır; "başarısız hesap yazılmaz" ölçütü istek hatası için doğrulanır |
| 08 | `08-landxml-kalici-veri.spec.ts` | inspect, import, özet, önizleme canvas'ı, mesh GET, proje referansları, yenileme | **Adım 6 (backend'i durdurup yeniden başlatma) manuel.** İkame: yenileme ve yeni istek bağlamıyla mesh GET; yeniden başlatmayı kanıtlamaz. 3B görüntü doğruluğu manuel |
| 09 | `09-yerlesim-alternatif.spec.ts` | Layout 200, uygun satır, USE THIS LAYOUT, kernel-state ve alternatives gövdeleri | Uygun aday çıkmazsa spec başarısız olur (atlamaz). Yönlendirme `?project` parametresini geçici düşürür, oturum geri yazar |
| 10 | `10-fast-solver.spec.ts` | Alanlar, RUN, tablolar, toplamlar, boş girişte alan hatası ve yeni istek yok | Alan hatası metni assert edilmez (yalnız varlığı) |
| 11 | `11-api-hata-sozlesmesi.spec.ts` | Bozuk JSON 400, `code`, `message`, `path`, correlation ID, layout form hatası | **Adım 3 (backend logunda correlation ID araması) manuel.** Form adımı "Span length (m)" aralığıyla belgelendi (belge düzeltildi). Bozuk JSON yanıtında `violations` boş dizi değil, hiç yoktur |
| 12 | `12-malzeme-katalogu.spec.ts` | Drilled piles → C35/45, PUT, GET, Exit/Open, hesap isteği yok | — |
| 13 | `13-kopru-tanimi.spec.ts` | `30, 40, 50`, aks tablosu, Plan/Profile/3D, PUT, yenileme, Exit/Open | Seçili aks ve görünüm modu yenileme sonrası beklenmez (arayüz durumu) |
| 14 | `14-sicaklik-durumu.spec.ts` | Boş, eksik giriş INVALID, tam giriş, Details, PUT, yenileme | "Gecikmiş eski yanıt" ayrıca simüle edilmez |
| 15 | `15-deprem-durumu.spec.ts` | Boş, 0.2/1, eğri ve Details, silme, tekrar girme, PUT, yenileme | Belge γI için "boş" der; arayüzde varsayılan `1`'dir |
| 16 | `16-maliyet-tablosu.spec.ts` | Boş durum, `.xlsx` içe aktarma, backend isteği yok, yenileme sonrası kaybolma | `.xlsx` bellekte üretilir; "maliyet özeti/karbon yok" yalnız metin düzeyinde (zayıf kontrol) |
| 17 | `17-desteklenmeyen-ozellikler.spec.ts` | `/optimization`, `/bim-export`, LM2, Validation | Validation tablosu köprü gerektirdiği için spec (ve düzeltilen belge) önce köprüsüz boş durumu, sonra köprü ekleyerek tabloyu kontrol eder |
| 18 | `18-proje-revizyon-cakismasi.spec.ts` | A 200, B 409, bildirim, Ctrl+S, Exit kapısı, Yeniden yükle | "Fare üstündeyken bildirim kalkmaz" yalnız dolaylı doğrulanır |
| 19 | `19-yuk-birimleri.spec.ts` | Self Weight, tonf, mm/cm, Traffic, LM1, Wind `ze`, Temperature °F/K/°C, Seismic notu, `loads` PUT yok | Belgenin 3. ve 4. adımları birim sırası bakımından tutarsızdır; spec birimleri açıkça seçer. `0.004000 kN/mm` ve `2.400e-8` kN+mm içindir; tonf+mm'de `0.0004079 tonf/mm` ve biçim kuralı doğrulanır |

Belgelerdeki bu tutarsızlıklar spec'lerde kodun gerçek davranışına göre yorumlanmıştır; belge metinlerinin düzeltilmesi ayrı bir iştir.
