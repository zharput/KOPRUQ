# 13 — Bridge Definition açıklıkları ve aksları

**Amaç:** Köprüye girilen seçili açıklık dizisinin destek akslarına dönüşmesini ve proje dosyasında korunmasını kontrol etmek.

**Ön koşul:** Test projesinde en az bir köprü (04'teki `E2E-A` kullanılabilir). `30, 40, 50 m` yalnızca örnek geometri verisidir.

## Adımlar

1. `/bridge-definition/span-arrangement/span-layout` açın ve doğru köprünün seçili olduğunu kontrol edin.
2. **Selected span lengths** alanına `30, 40, 50` yazın. **Selected total span length** değerini ve aks tablosunu kontrol edin.
3. **Axis Definition** bölümüne geçin. A1, P1, P2, A2 için zincirleme konumların sırasıyla `0`, `30`, `70`, `120 m` olduğunu kontrol edin. Bu, girilen sayıların basit kümülatif toplamıdır.
4. Bridge Overview'de **Plan** ve **Profile** modlarına geçin; görünüm değişmeli. Arazi yüklenmediyse **3D** modunda gerçek arazi varmış gibi sahte yüzey beklemeyin.
5. **File → Save As...** ile test `.kopruq` dosyası kaydedin, **New Project** yapın, dosyayı yeniden açın. Açıklıklar ve akslar korunmalı.

## Geçme ölçütü

- Seçili açıklık dizisi, proje envanterindeki olası açıklık listesinden ayrı tutulur; dört aks doğru sırada oluşur.
- Dosya round trip sonrasında köprüye ait açıklık/aks verisi korunur.
- Plan/Profile görünümü gerçek analiz veya açıklık uygunluğu onayı gibi sunulmaz.

**Kanıt:** Açıklık alanı, aks tablosu, yeniden açma sonrası durum. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
