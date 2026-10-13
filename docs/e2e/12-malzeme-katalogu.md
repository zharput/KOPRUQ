# 12 — Malzeme kataloğu proje dosyasına giriyor mu?

**Amaç:** Malzeme sınıfı seçiminin yalnızca ekranda kalmayıp proje dosyasıyla taşındığını kontrol etmek.

**Ön koşul:** Ayrı test projesi ve kaydetme klasörü. Seçilen sınıf burada sadece veri akışı testidir, malzeme tasarım onayı değildir.

## Adımlar

1. `/materials` açın. **Concrete - by structural element** tablosundaki ilk satırın (**Drilled piles**) Concrete Class değerini not edin.
2. Bu satırda farklı bir seçenek seçin; örneğin `C35/45`. Başka bir satırın değişmediğini kontrol edin.
3. **File → Save As...** ile `e2e-material.kopruq` kaydedin. Dosyayı metin düzenleyicide açıp `families.MATERIAL` bölümünde seçimin yer aldığını kontrol edin.
4. **File → New Project**, ardından kaydettiğiniz dosyayı yeniden açın ve `/materials` ekranına dönün.
5. Aynı satırın seçimi koruduğunu; Network'te bu UI değişikliği için hayali bir backend hesap isteği oluşmadığını kontrol edin.

## Geçme ölçütü

- Yalnızca seçilen satır değişir; `.kopruq` dosyası bu veriyi taşır ve açınca geri getirir.
- Seçim kendiliğinden tasarım hesabı, malzeme yeterlilik sonucu veya backend `ProjectRepository` güncellemesi olarak sunulmaz.

**Kanıt:** Önce/sonra tablo ve dosyadaki `families.MATERIAL` alanı. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
