# 05 — Graph çalıştır, Family sonucunun güncelliğini izle

**Amaç:** Graph adayının Family ekranında görünmesini; giriş değişince eski sonucun `STALE` olmasını doğrulamak.

**Ön koşul:** En az bir köprüsü olan test projesi. Yeni Graph belgesiyle başlayın; 04'ün köprüsü kullanılabilir.

## Adımlar

1. **Graph** (`/graph`) ekranında test köprüsünü seçin. Node Library'den **Steel Girder** düğümünü ekleyin. Düğümün ve Inspector'ın açıldığını kontrol edin.
2. **Run** seçin. Çalışma bitene kadar bekleyin; düğüm durumunu ve Graph Log'u not edin. Bu düğüm için `candidates` çıktısı veya açıklayıcı hata görünmeli.
3. **Family** (`/family-tables`) ekranında aynı köprüyü ve **Steel Girder** ailesini seçin. Kaynak, aday listesi, kesit önizlemesi ve durum rozetini kontrol edin.
4. Graph'a dönüp aynı düğümde örneğin **Girder Height** değerini küçük bir miktar değiştirin; **Run** basmadan Family'ye dönün.
5. Önceki sonucun `STALE` olarak işaretlendiğini, güncel mühendislik sonucu gibi sunulmadığını kontrol edin. Graph'ta tekrar **Run** yapıp Family'ye dönün.

## Geçme ölçütü

- İlk Run bir aday yayımlıyorsa aday aynı köprünün Family ekranında görünür; başka köprüde görünmez. Run hata verirse bu senaryo `FAIL` olarak kayıt altına alınır ve Graph Log eklenir.
- Parametre değişince eski sonuç `STALE` olur; yeniden Run sonrası yeni durum ve adaylar gösterilir.
- Kesit önizlemesinin görünmesi mühendislik yeterliliği veya solver doğrulaması anlamına gelmez; bu senaryoda yalnızca veri ve güncellik akışı geçer.

**Kanıt:** Run log'u, aday satırı, değişiklik öncesi/sonrası rozet. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
