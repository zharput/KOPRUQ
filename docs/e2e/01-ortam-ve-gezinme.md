# 01 — Ortam açılışı ve gezinme

**Amaç:** Frontend kabuğunun ve backend servisinin birlikte açıldığını, doğrudan URL ve tarayıcı geri/ileri davranışını kontrol etmek.

**Ön koşul:** [Başlangıç rehberindeki](README.md#başlamadan-önce) yerel kurulum tamamlandı. Bu senaryo veri dosyası gerektirmez.

## Adımlar

1. Tarayıcıda `http://localhost:8080/actuator/health` açın. JSON içindeki `status` değerini not edin.
2. `http://localhost:5173` açın. Karşılama ekranından **New Project** seçip test projesine ad verin; `POST /api/projects` tamamlanınca URL'deki `?project=<id>` değerini not edin.
3. Üst gezinmeden **Project**, **Graph**, **Family**, **Loads** arasında geçin; her ekranda başlık ve ana çalışma alanı görünsün.
4. Aynı projeyle `http://localhost:5173/graph?project=<id>` ve `http://localhost:5173/family-tables?project=<id>` URL'lerini açıp sayfayı yenileyin. Tarayıcı geri/ileri düğmelerini kullanın.
5. F12 Console ve Network'te beklenmedik çalışma zamanı hatası veya başarısız başlangıç isteği olup olmadığını kontrol edin.

## Geçme ölçütü

- Sağlık yanıtı `UP`; frontend beyaz/boş ekran vermeden açılır.
- Graph ve Family doğrudan URL/yeni yüklemede aynı projeyle doğru ekrana döner; `?project=<id>` korunur ve geri/ileri gezinme çalışır.
- Console'da bu adımlardan kaynaklanan yakalanmamış hata yoktur. Placeholder görünen bir çalışma alanı tek başına hata sayılmaz.

**Kanıt:** Sağlık yanıtı, URL'ler, Console ekran görüntüsü. **Sonuç:** PASS(herhangi hata rastlanmadı).
