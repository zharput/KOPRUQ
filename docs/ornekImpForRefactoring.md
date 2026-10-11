/feature-plan architecture-remediation Bu görev için architecture-planner adlı custom subagent'ı açıkça çağır. Planlamayı ona yaptır; başka bir agent ile değiştirme. Agent bulunamazsa dur ve bildir.

docs/reviews/2026-10-11T14-19-35Z/architecture.md dosyasını ve varsa aynı incelemenin diğer raporlarını okusun. Rapor INCOMPLETE olduğu için seçilen bulguları güncel kaynak kodda yeniden doğrulasın ve eksik bağlamı incelesin.

Katman bağımlılıkları, App.tsx durum sahipliği, localStorage erişimi ve feature'lar arası olay iletişimini değerlendirsin.

Hedef modül sınırlarını ve izin verilen bağımlılık yönlerini belirlesin. Gereksiz soyutlama eklemesin. Mevcut kullanıcı akışları, hesaplama sonuçları ve kayıtlı veriler korunsun.

Küçük ve sıralı refactor aşamaları hazırlasın. Her aşamada seçilen bulgular, etkilenen dosyalar, önkoşullar, korunacak davranışlar, kabul kriterleri, regresyon testleri ve geri dönüş yolu bulunsun.

Planı daha sonra refactor-implementer uygulayacak; ona açık bir uygulama devri hazırlasın.

Şimdilik yalnızca plan oluştur ve kaydet. Kod değiştirme, implementer veya reviewer çalıştırma.