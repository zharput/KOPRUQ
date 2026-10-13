# 10 — Fast Solver çağrısı ve sonuç durumu

**Amaç:** Örnek 5 açıklıklı modelin frontend'den backend Fast Solver'a gönderilmesini ve sonuç/hata akışını kontrol etmek.

**Ön koşul:** Backend çalışıyor. Formun başlangıç değerleri depodaki örnek modeldir; gerçek köprünüzün tasarım girdisi değildir.

## Adımlar

1. `/kopruq-fast-solver` açın. Beş **Span** ve dört **P height** alanı ile birim etiketlerinin göründüğünü kontrol edin.
2. Başlangıç değerlerini değiştirmeden **RUN ANALYSIS** seçin. Network'te `POST /api/fast-solver/solve` isteğini ve yanıtını kaydedin.
3. Yanıt `COMPLETED` ise **Equilibrium check**, **Support reactions** ve **Deck displacements** tablolarının açıldığını; `NaN`, `Infinity` veya boş olmayan hata mesajı bulunmadığını kontrol edin. UI “Match” gösteriyorsa toplam yük/tepki sayıları yanıtla uyumlu olmalı.
4. İlk Span alanını silip tekrar **RUN ANALYSIS** deneyin. Form doğrulama hatası gösterilmeli; geçersiz veriyle yeni başarılı analiz sonucu oluşturulmamalı.
5. Başlangıç değerini geri koyun ve tekrar çalıştırın; hata kalkmalı.

## Geçme ölçütü

- Başarılı istek ile UI'daki durum ve tablolar birbirini tutar; başarısız durum açık hata verir.
- Geçersiz giriş sessizce sıfır/varsayılan değere çevrilmez.
- “Match” yalnızca yazılımın denge kontrolüdür; model yeterliliği veya mühendislik kabulü değildir.

**Kanıt:** İstek/yanıt, sonuç tabloları, geçersiz giriş görüntüsü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
