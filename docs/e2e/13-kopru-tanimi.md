# 13 — Bridge Definition açıklıkları ve aksları

**Amaç:** Köprüye girilen seçili açıklık dizisinin destek akslarına dönüşmesini ve sunucu projesinde korunmasını kontrol etmek.

**Ön koşul:** Test projesinde en az bir köprü (04'teki `E2E-A` kullanılabilir). `30, 40, 50 m` yalnızca örnek geometri verisidir.

## Adımlar

1. `/bridge-definition/span-arrangement/span-layout` açın ve doğru köprünün seçili olduğunu kontrol edin.
2. **Selected span lengths** alanına `30, 40, 50` yazın. **Selected total span length** değerini ve aks tablosunu kontrol edin.
3. **Axis Definition** bölümüne geçin. A1, P1, P2, A2 için zincirleme konumların sırasıyla `0`, `30`, `70`, `120 m` olduğunu kontrol edin. Bu, girilen sayıların basit kümülatif toplamıdır.
4. Bridge Overview'de **Plan** ve **Profile** modlarına geçin; görünüm değişmeli. Arazi yüklenmediyse **3D** modunda gerçek arazi varmış gibi sahte yüzey beklemeyin.
5. Network'te `PUT /api/projects/<id>/bridge-definitions` isteğini ve yeşil **Kaydedildi** bildirimini kontrol edin. Sayfayı yenileyin veya **File → Exit** ardından **Open...** ile aynı projeyi açın. Açıklıklar ve türetilen aks konumları korunmalı; son seçili aks ya da Plan/Profile modu sıfırlanabilir, bunlar arayüz durumudur.

## Geçme ölçütü

- Seçili açıklık dizisi, proje envanterindeki olası açıklık listesinden ayrı tutulur; dört aks doğru sırada oluşur.
- Sunucuya yazma ve yeniden açma sonrasında köprüye ait açıklık/aks verisi korunur; yalnızca görünüm/seçim değişimi için proje yazması beklenmez.
- Plan/Profile görünümü gerçek analiz veya açıklık uygunluğu onayı gibi sunulmaz.

**Kanıt:** Açıklık alanı, aks tablosu, `bridge-definitions` PUT yanıtı ve yeniden açma sonrası durum. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
