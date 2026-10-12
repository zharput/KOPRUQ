/feature-plan backend-remediation architecture-planner custom subagent'ını Opus ile çağır.

Backend inceleme kaynakları:
docs/reviews/2026-10-11T19-46-40Z/report.md
docs/reviews/2026-10-11T19-46-40Z/architecture.md
docs/reviews/2026-10-11T19-46-40Z/code-quality.md

Mimari referans:
docs/architecture/backend-reference.md
Bu belge yoksa bildir; referans kurallarını tahmin etme.

Review bulgularını güncel backend kodunda doğrula. Raporun kapsamını ve
STALE/INCOMPLETE durumunu kontrol et; eksik inceleme varsa seçilen
bulgular için gerekli incelemeyi tamamla.

Doğrulanmış veri kaybı, yanlış hesaplama, API davranışı ve transaction
problemlerini etkilerine göre önceliklendir. Mimari düzenlemeleri bu
önceliklere ve değişiklik bağımlılıklarına göre sırala.

Küçük, ayrı doğrulanabilir uygulama aşamaları hazırla.
Her aşamada:
- Düzeltilecek bulgu kimlikleri ve değişecek dosyalar.
- Korunacak API sözleşmeleri, kayıtlı veri ve kullanıcı davranışları.
- Mevcut davranışı sabitlemek için gereken testler.
- Kabul kriterleri ve çalıştırılacak doğrulama komutları.
- Gerekli veri geçişleri ve geri dönüş yolu.

Önceden var olan test başarısızlıklarını kaydet; değişiklikten kaynaklanan
başarısızlıklardan ayır. Rapor önerilerini otomatik olarak doğru kabul etme.

Planı docs/features/backend-remediation/plan.md olarak kaydet.
Şimdilik kod değiştirme; implementer çalıştırma.
