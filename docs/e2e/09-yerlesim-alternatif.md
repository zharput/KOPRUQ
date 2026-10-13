# 09 — Yerleşim seçimini yapısal alternatiflere aktar

**Amaç:** Layout API sonucundan seçilen köprü uzunluğu ve açıklığın alternatif üretim formuna doğru aktarılmasını kontrol etmek.

**Ön koşul:** Backend çalışıyor; bu senaryo arazi/LandXML importuna bağlı değildir. Varsayılan test formunu kullanın.

## Adımlar

1. `/layout-generator` açın. Varsayılan düz güzergâh, saha sınırları, `NoPierZone` ve açıklık aralıklarını değiştirmeden **GENERATE LAYOUTS** seçin.
2. Network'te `POST /api/layout/generate` için HTTP 200 ve aday listesi geldiğini görün. Tablodaki aday/uygun sayısını not edin.
3. Uygun (`Feasible = Yes`) bir satır seçin. Satırın **Bridge length** ve **Span length** değerlerini not edin; **USE THIS LAYOUT IN GENERATE** seçin.
4. `/bridge-alternatives` ekranındaki Bridge Length ve Span min/max alanlarının seçilen satırdan geldiğini kontrol edin. **GENERATE ALTERNATIVES** seçin.
5. Network'te sırasıyla `POST /api/kernel-state` ve `POST /api/alternatives` isteklerini inceleyin. İstek gövdesindeki uzunluk/açıklık değerleri seçilen yerleşimle eşleşmeli; sonuç tablosu açılmalı.

## Geçme ölçütü

- Seçilen layout değerleri elle yeniden yazmadan alternatif formuna taşınır ve iki backend isteğine aynı değerler gider.
- Aday tabloları boşsa açıklayıcı boş sonuç gösterilir; `Feasible = No` satırı yanlışlıkla kullanılabilir olmaz. Reddedilen satır varsa gerekçesi görünür.
- Bu akış otomatik Fast Solver veya terrain tabanlı layout hesabı yaptığı izlenimi vermez.

**Kanıt:** Seçilen satır, iki form, üç Network isteği. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
