# 11 — API hatası ve correlation ID

**Amaç:** Backend'in beklenen 400 hata sözleşmesini ve tarayıcıdan izlenebilirlik kimliğini kontrol etmek.

**Ön koşul:** Frontend ve backend çalışıyor. `http://localhost:5173` sayfasında F12 → Console açın. Bu adım yalnızca test API'sine geçersiz veri yollar; kalıcı mühendislik verisi yazmaz.

## Adımlar

1. Console'a aşağıdaki kodu yapıştırıp çalıştırın:

   ```js
   fetch('http://localhost:8080/api/alternatives', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: '{bozuk-json'
   }).then(async response => ({
     status: response.status,
     correlationHeader: response.headers.get('X-Correlation-ID'),
     body: await response.json()
   })).then(console.log)
   ```

2. Dönen HTTP durumunu, `body.code`, `body.message`, `body.path`, `body.correlationId` ve `correlationHeader` alanlarını kaydedin.
3. Network panelinde aynı isteği bulun. Backend logunda correlation ID ile arama yapılabiliyorsa karşılığını doğrulayın.
4. `/layout-generator` formunda **Min span** değerini **Max span** değerinden büyük yapın ve gönderin. Alan hatası görünmeli; form düzeyinde yakalanan hata için başarılı layout sonucu gösterilmemeli.

## Geçme ölçütü

- Bozuk JSON isteği HTTP 400 ve `MALFORMED_REQUEST_BODY` kodu döner; yanıt JSON'dur.
- `X-Correlation-ID` boş değildir; gövdedeki correlation ID ile eşleşir. Sunucu iç istisna metni istemciye sızmaz.
- Form hatası kullanıcıya alan düzeyinde görünür. Bu senaryoda 400 yanıtı **beklenen** davranıştır.

**Kanıt:** Console/Network yanıtı ve correlation ID, form hatası. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
