# 05 — Graph çalıştır, Family sonucunun güncelliğini izle

**Amaç:** Graph adayının Family ekranında görünmesini; giriş değişince eski sonucun `STALE` olmasını doğrulamak.

**Ön koşul:** En az bir köprüsü olan test projesi (04'ün köprüsü kullanılabilir). Graph belgesi boş olmalı; önceki denemeden kalan düğümler varsa silin.

## Önce bilinmesi gerekenler

- **Steel Girder tek başına Run edilemez.** Düğümün **Structural Steel** girişi zorunludur. Düğümde görünen `S355`, yalnızca yerel varsayılan değerdir ve **bağlantı sayılmaz**. Run başlamadan önce bağlantılar doğrulanır; bağlantı yoksa **Run sonrasında** düğüm `ERROR` olur ve Inspector'da `Input Structural Steel is not connected.` yazar. Run öncesinde `ERROR` etiketi veya bu mesaj görünmez. Bu bir uygulama hatası değil, beklenen davranıştır.
- Girder'ın geometri girişleri (Girder Height, Top Flange Width, Top Flange Thickness, Bottom Flange Width, Bottom Flange Thickness, Web Width) zorunlu değildir. Bağlantı yoksa düğümün üzerindeki yerel değerler kullanılır. Varsayılanlar: 2.5 / 0.8 / 0.04 / 0.9 / 0.05 / 0.02 m.
- Düğümdeki **“1 candidate”** yazısı Run öncesi canlı önizlemedir; başarılı bir Run sonucu değildir. Run sonucu için düğümde `ERROR` dışında bir durum (başarı) ve Graph Log'da çalışma kaydı arayın.
- Precast Girder için de aynı kural geçerlidir; orada bağlanacak düğüm **Concrete** (Concrete Material) düğümüdür.

## Adımlar

1. **Graph** (`/graph`) ekranında üstteki **Bridge** listesinden test köprüsünü seçin. Sol **Node Library**'de **STRUCTURAL / FAMILY** grubundan **Steel Girder** düğümünü tuvale sürükleyin (veya çift tıklayın). Düğümün ve sağdaki Node Inspector'ın açıldığını kontrol edin. Bu aşamada düğümde henüz `ERROR` görünmez; `ERROR` yalnızca Run sonrası çıkar. İsterseniz bağlantı kurmadan önce bir kez **Run** seçip beklenen `ERROR` ve `Input Structural Steel is not connected.` mesajını gözlemleyin.
2. **Malzeme düğümünü ekleyin:** Node Library'de **MATERIALS** grubunu açın (gerekirse **Expand all groups**) ve **Structural Steel** düğümünü tuvale ekleyin. Düğüm üzerindeki **Steel Class** listesinde `S355` seçili kalsın (varsayılan).
3. **Bağlantıyı kurun:** Structural Steel düğümünün **sağ kenarındaki çıkış noktasından** fare ile sürükleyip Steel Girder düğümünün **sol kenarındaki “Structural Steel” giriş noktasına** (satırın solundaki küçük daire) bırakın. İki düğüm arasında bir çizgi oluşmalı. Graph Log'da bağlantının oluştuğunu belirten kaydı (`Connection created: …`) kontrol edin. Önceki Run'dan kalan `ERROR` etiketi ve uyarı, graph değiştiği için güncel sayılmaz; kesin sonuç 4. adımdaki yeni Run ile görülür.
   - Çizgi oluşmuyorsa: çıkış noktasının gerçekten **Structural Steel** düğümünden, girişin ise **Structural Steel** satırından olduğunu doğrulayın (Girder Height gibi uzunluk girişlerine malzeme bağlanamaz).
4. **Run** seçin (Graph araç çubuğunun sağ üstü). Çalışma bitene kadar bekleyin. Düğüm durumunu ve alttaki **Graph Log**'u not edin. Steel Girder düğümü hatasız tamamlanmalı, **`candidates`** çıkışı görünmeli. Log'daki giriş sayısı ve süre not edilir.
   - Hâlâ `ERROR` ise: Inspector'daki mesajı ve Graph Log'u kaydedin, 3. adımdaki bağlantıyı yeniden kontrol edin; mesaj bağlantı dışında bir şeyi (ör. parametre) işaret ediyorsa senaryoyu `FAIL` yazıp log'u ekleyin.
5. **Family** (`/family-tables`) ekranına geçin; aynı köprüyü ve **Steel Girder** ailesini (sol **Family Library** → **Girder**) seçin. Kaynak (Graph), aday listesi (sağ **Candidates**), kesit önizlemesi ve durum rozetini kontrol edin. Aday sayısı ile Graph'taki sonucun tutarlı olduğunu not edin. Rozet, güncel bir sonucu gösteriyor olmalı (`STALE` olmamalı).
6. Graph'a dönün. Steel Girder düğümünün Inspector'ında **Girder Height** değerini küçük bir miktar değiştirin (ör. `2.5` → `2.6`; Enter veya alandan çıkın). **Run'a basmayın.** Family'ye dönün.
7. Önceki sonucun **`STALE`** olarak işaretlendiğini ve güncel mühendislik sonucu gibi sunulmadığını kontrol edin. Değişiklik öncesi ve sonrası rozeti ekran görüntüsüyle kaydedin. Ardından Graph'a dönüp tekrar **Run** yapın ve Family'ye dönün; rozet güncel duruma geçmeli, aday satırları yeni Girder Height değerini yansıtmalı.
8. Yeşil **Kaydedildi** bildirimi göründükten ve üst çubukta bekleyen yazma kalmadıktan sonra sayfayı yenileyin (F5). Graph'ta **Steel Girder**, **Structural Steel** düğümleri, aralarındaki **bağlantı** ve değiştirdiğiniz **Girder Height** geri gelmeli. Family'deki Run adaylarının otomatik geri gelmesini beklemeyin; hesap anlık görüntüleri bu sürümde bellektedir. Gerekirse Graph'ı yeniden çalıştırın; Family adaylarını yalnızca yeniden Run sonrası görmek beklenen davranıştır.
9. **Negatif kontrol (isteğe bağlı):** Başka bir köprüyü seçip Family ekranında Steel Girder ailesine bakın; ilk köprünün adayları orada görünmemeli.

## Geçme ölçütü

- Bağlantı kurulduktan sonraki ilk Run `ERROR` vermez ve bir aday yayımlar; aday aynı köprünün Family ekranında görünür, başka köprüde görünmez.
- Bağlantı yokken Run sonrası `ERROR` ve `Input Structural Steel is not connected.` mesajı görülmesi hata sayılmaz, beklenen doğrulamadır (1. adımdaki isteğe bağlı Run'da kayda geçirin). Bağlantı **varken** Run hata veriyorsa senaryo `FAIL` olarak kayıt altına alınır ve Graph Log eklenir.
- Parametre değişince eski sonuç `STALE` olur; yeniden Run sonrası yeni durum ve adaylar gösterilir.
- Yenileme Graph tanımını (düğümler, bağlantı, parametre) korur; Run sonucu sunucuda kalıcı bir mühendislik sonucu olarak sunulmaz.
- Kesit önizlemesinin görünmesi mühendislik yeterliliği veya solver doğrulaması anlamına gelmez; bu senaryoda yalnızca veri ve güncellik akışı geçer.

**Kanıt:** Bağlamadan yapılan Run sonrası `ERROR` ve bağlantı sonrası başarılı düğüm ekran görüntüsü, Run log'u, aday satırı, değişiklik öncesi/sonrası rozet. **Sonuç:** PASS
