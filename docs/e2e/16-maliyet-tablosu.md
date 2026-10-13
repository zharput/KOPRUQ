# 16 — Cost Database Excel içe aktarma sınırı

**Amaç:** Excel dosyasının yalnızca görüntülendiğini ve miktar/maliyet hesabı varmış gibi davranılmadığını kontrol etmek.

**Ön koşul:** Test amaçlı küçük bir `.xlsx` hazırlayın: ilk satır başlıklar `Kalem` ve `BirimFiyat`, ikinci satır `E2E örnek` ve `1`. Bu değer yalnızca dosya okuma testidir, gerçek fiyat değildir.

## Adımlar

1. `/project/cost-database` açın. Başlangıçta veri olmadığını söyleyen durum ve **From Excel** düğmesi görünmeli.
2. Hazırladığınız `.xlsx` dosyasını **From Excel** ile seçin. Ekranda dosya adı, `1 row(s)`, iki başlık ve tek veri satırı görünmeli.
3. Network'te bu işlem için backend'e fiyat/kost hesap isteği gitmediğini kontrol edin. Sayfayı yenileyin.
4. Yenilemeden sonra tablonun kaybolması mevcut bileşenin yerel durum sınırıdır; bunu sonuç formuna “beklenen mevcut davranış” olarak yazın. Maliyet özeti veya karbon çıktısı görünmemeli.

## Geçme ölçütü

- Dosya ilk sheet'ten okunur ve başlıklar/veri satırı aynen görüntülenir.
- Tablo görüntüsü proje maliyeti hesabı veya kalıcı fiyat veritabanı gibi sunulmaz. Yenileme sonrası kaybolma bu sürümde **bilinen sınırdır**, kalıcılık beklentisi değildir.

**Kanıt:** `.xlsx` örneği, içe aktarma ekranı, yenileme sonrası durum. **Sonuç:** `PASS / FAIL / BLOCKED` — Not:
