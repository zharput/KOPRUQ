# 17 — Desteklenmeyen ekranların dürüst durumu

**Amaç:** Gelecek aşama ekranlarının gerçek analiz veya optimizasyon sonucu varmış gibi görünmemesini kontrol etmek.

**Ön koşul:** Uygulama açık ve bir test projesi seçili. Hesap veya mühendislik verisi girilmez; yalnızca 4. adım için gerekirse tek bir köprü kaydı eklenir (Project > Bridge Information; yalnız `No` zorunludur).

## Adımlar

1. `/optimization` açın. Çalışma alanı iskeleti/placeholder görünmeli; Pareto sonucu veya hesaplanmış optimum gibi bir çıktı olmamalı.
2. `/bim-export` açın. ALLPLAN/IFC teslim işlemi tamamlanmış gibi çalışan bir dışa aktarma veya sonuç göstermemeli.
3. `/loads` → **Traffic** → **LM2** açın. `NOT IMPLEMENTED` durumunu kontrol edin.
4. `/bridge-definition/assembly/validation` açın. Projede köprü yoksa yalnızca "Add a bridge in Project > Bridge Information…" boş durumu görünür; bu beklenen davranıştır. Köprü ekledikten sonra sayfayı tekrar açın. Envanter yapılandırması ile gerçek mühendislik doğrulamasının ayrıldığını; “Engineering validation: Not implemented” bilgisini kontrol edin.

## Geçme ölçütü

- Henüz yapılmayan P07–P09/AI/BIM yetenekleri için sahte sayı, başarı rozeti veya indirilebilir mühendislik sonucu üretilmez.
- LM2 pasif ve görünürdür; Bridge Definition validation yalnızca yapılandırma durumunu bildirir.
- Placeholder metninin görünmesi `PASS` olabilir; bu senaryo özelliklerin uygulandığını iddia etmez.

**Kanıt:** Dört ekran görüntüsü. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
