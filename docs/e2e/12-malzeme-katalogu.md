# 12 — Malzeme seçimi sunucu projesine kaydediliyor mu?

**Amaç:** Malzeme sınıfı seçiminin yalnızca ekranda kalmayıp proje bölümüne yazıldığını kontrol etmek.

**Ön koşul:** Ayrı bir sunucu test projesi. Seçilen sınıf burada sadece veri akışı testidir, malzeme tasarım onayı değildir.

## Adımlar

1. `/materials` açın. **Concrete - by structural element** tablosundaki ilk satırın (**Drilled piles**) Concrete Class değerini not edin.
2. Bu satırda farklı bir seçenek seçin; örneğin `C35/45`. Başka bir satırın değişmediğini kontrol edin.
3. Network'te `PUT /api/projects/<id>/families/materials` isteğini ve yeşil **Kaydedildi** bildirimini kontrol edin. `GET /api/projects/<id>` yanıtındaki `families.materials` bölümünde seçilen satırı doğrulayın.
4. **File → Exit**, ardından **File → Open...** ile aynı projeyi açın ve `/materials` ekranına dönün. Seçim yenilemeden sonra da korunmalı.
5. Network'te bu UI değişikliği için malzeme yeterlilik hesabı isteği oluşmadığını kontrol edin; görülen proje bölümü yazması hesap sonucu değildir.

## Geçme ölçütü

- Yalnızca seçilen satır değişir; sunucudaki `families.materials` bölümü veriyi taşır ve projeyi yeniden açınca geri getirir.
- Seçim kendiliğinden tasarım hesabı veya malzeme yeterlilik sonucu olarak sunulmaz.

**Kanıt:** Önce/sonra tablo, proje PUT/GET yanıtları ve yeniden açma görüntüsü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
