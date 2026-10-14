# 08 — LandXML içe aktarma ve backend kalıcılığı

**Amaç:** Dosyanın frontend'den incelenip backend'e aktarılmasını, TIN'in korunmasını ve sunucu yeniden başladığında okunmasını kontrol etmek.

**Ön koşul:** Açık test projesi ve test veritabanı; [örnek dosya](../../backend/src/test/resources/sample.landxml). Bu fixture **sentetik ve 4 nokta/2 yüzlüdür**; gerçek saha doğrulaması değildir. Koordinat sırası dosya açıklamasında `Northing Easting Elevation` olarak verilmiştir.

## Adımlar

1. `/bridge-definition/alignment/terrain-reference` açın. **Import Terrain** ile `backend/src/test/resources/sample.landxml` seçin.
2. Network'te `POST /api/landxml/inspect` yanıtını görün. **Surface = Existing Ground** seçin; önizlemede 4 nokta, 2 yüz ve metre birimini kontrol edin.
3. **Source coordinate mapping** için fixture açıklamasına göre **Coordinate 1 = Y; coordinate 2 = X** seçin. **Alignment = Main Alignment** seçin. CRS alanını gerçek harita referansı gibi tahmin ederek değiştirmeyin; fixture'ın yerel/belirsiz etiketini koruyun.
4. **Import selected TIN** seçin. `POST /api/landxml/import` yanıtındaki `terrainId` ve `id` değerlerini not edin. Özetin 4 nokta/2 üçgen ve seçilen yüzey/güzergâh bilgisini göstermesini kontrol edin. Spiral için uyarı veya `REVIEW_REQUIRED` çıkarsa bunu geçerli bir açık durum olarak kaydedin.
5. 3B önizlemenin açıldığını ve profil grafiğinin varsa göründüğünü kontrol edin. Tarayıcıda `http://localhost:8080/api/terrain/<terrainId>/mesh` adresini açıp veri geldiğini doğrulayın. Proje `workspace` yazması tamamlanınca `GET /api/projects/<id>` yanıtındaki arazi/aktarım referanslarının bu ID'leri taşıdığını kontrol edin.
6. Sadece test backend sürecini durdurup aynı veritabanına bağlı olarak yeniden başlatın. Aynı `mesh` adresini tekrar açın; `terrainId` hâlâ bulunmalı. Projeyi aynı `?project=<id>` ile yeniden yükleyince aktarım referansları da geri gelmeli.

## Geçme ölçütü

- Inspect içe aktarma yapmadan dosya içeriğini gösterir; import açık yüzey ve koordinat eşlemesi seçilince yapılır.
- Kaynak 2 `Faces` topolojisi korunur; yeniden başlatma sonrası aynı arazi ID'si okunabilir.
- Arazi verisi ve proje içindeki arazi/aktarım referansları yeniden başlatmadan sonra korunur.
- Uyarılar saklanmaz/gizlenmez. `REVIEW_REQUIRED` mühendislik onayı değildir; yazılım akışının dürüst durumudur.

**Kanıt:** Inspect/import Network yanıtları, `terrainId`, yeniden başlatma öncesi/sonrası mesh HTTP durumu. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
