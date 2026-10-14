# İnceleme: `backend-db-persistence-m3b` (rüzgâr hesap sonucunun saklanması)

**Karar: PASS.** P0, P1 veya P2 bulgu yok. Aşağıdaki P3'ler küçük test boşlukları; isteğe bağlı iyileştirme olarak düşünülmeli, birleştirmeyi bloklamaz. Bu karar, incelenen kapsamda engelleyici sorun bulunmadığı anlamına gelir; özelliğin hatasız olduğunun garantisi değildir.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob).

## Kapsam ve sınırlar
- **Baseline:** HEAD `208dceab0a7f55cf3354e25b5ca1ea6d0440cddb` (güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `cc618ea1e10a871b57ddb5d361b46fe2625b18bd`; rapor bayat değil.
- **Okunanlar:** `review-input-full.diff` (870 satırın tamamı); dört yeni kaynak dosyanın her biri baştan sona (`WindResultStatus.java`, `WindSnapshotResult.java`, `V6__wind_snapshot_result.sql`, `V6MigrationTest.java`); bağlam için `WindSnapshotEntity`, `WindSnapshot`, `LoadInputMapper`, `SectionChecks`, `ProjectRequestReader`, `LoadInputContentStore`, V5 SQL, `loadsWire.ts`, `windTypes.ts`, `WindLoadsPanel.tsx`, `windLoadsService.ts`, `loadsServerSections.ts`, `projectDocument.ts`, contract testindeki yardımcılar (`change`, `assertRejected`, `dbState`), `JpaLoadGraphContentTest` kurulumu, `architecture.md` (3095, 3244-3277, 3306-3319), `roadmap.md:1925`.
- **Koşturulmayanlar:** Reviewer kabuk çalıştırmadı. Backend `clean package` 732 test BUILD SUCCESS, frontend build/lint çıkış 0 ve 119 dosya / 1187 test sonuçları implementer ve koordinatör (bağımsız) raporudur.
- **PostgreSQL:** Gerçek PG koşusu yapılmadı; yalnızca H2 PostgreSQL modu var.
- **Doğrulanamayanlar:** `ArchitectureTests` ve `EndpointInventoryContractTest`'in yeşil olduğu importlar okunarak yalnızca dolaylı desteklendi.

## Bulgular (önem sırasıyla)

### F1 — P3: V6 testindeki NOT NULL doğrulaması zayıf; back-fill edilen satır JPA ile okunmuyor
- **Yer:** `backend/src/test/java/com/kopruq/bridge/infra/persistence/V6MigrationTest.java:66` ve `:53-61`.
- **Kanıt (NOT NULL):** `assertThrows(Exception.class, () -> jdbc.update("insert into load_wind_snapshot (...) values (...)"))`. Herhangi bir istisna testi geçirir (SQL yazım hatası, FK hatası, başka bir NOT NULL kolonu). Bugünkü insert'te `result_present` dışındaki her NOT NULL kolon dolu ve FK satırı var, yani test şu an doğru nedenle geçiyor olmalı; ancak V7'de tabloya yeni bir zorunlu kolon eklenirse test yanlış nedenle yeşil kalır.
- **Kanıt (okuma):** AC1, "bu satır okununca snapshot `result == null` ile gelir" diyor. Test yalnızca JDBC ile kolonlara bakıyor; `WindSnapshotEntity.toDomain()` üzerinden okuma yapılmıyor. `JpaLoadGraphContentTest.windSnapshot_replaceWithAndWithoutResult` aynı DB durumunu (present=FALSE, kolonlar NULL) JPA ile okuyor (dolaylı kapsam) ama back-fill edilmiş satırın kendisi okunmuyor.
- **Öneri:** Beklenen istisnayı `DataIntegrityViolationException` olarak daraltın ya da mesajda/SQLState'te `result_present` ve 23502 kontrol edin. İsteğe bağlı: aynı veriyle JPA üzerinden bir okuma ekleyin (ayrıca Spring context gerekir).

### F2 — P3: Contract testinde iki eksik vaka: ihlallerin birlikte raporlanması ve `result`'un yanlış JSON tipi
- **Yer:** `backend/src/test/java/com/kopruq/contract/ProjectLoadGraphApiContractTest.java`, yaklaşık `:607-655` (yeni wind-snapshot testleri).
- **Kanıt:** Kodda tüm ihlaller toplanıyor (`LoadInputMapper.java:156-177` `before`-count deseni, `throwIfAny` tek noktada), ama hiçbir test birden fazla ihlali aynı anda doğrulamıyor (ör. `result.status:"OK"` + `kr:null` + `inputs.drefM` eksik → üç alan birlikte raporlanmalı). `"result":"x"`, `[]` ya da `5` için davranış test edilmiyor; koda göre bunlar `ProjectRequestReader:42-45` üzerinden `value.result` "has an invalid value" ile 400 dönmeli ama regresyon testiyle sabitlenmemiş.
- **Etki:** İleride `result` bloğunun önüne erken `throwIfAny()` eklenirse ya da reader'ın coercion ayarı değişirse testler yakalamaz.
- **Öneri:** `assertRejected(..., "value.result.status", "value.result.kr", "value.inputs.drefM")` vakası ve `change(WIND_SNAPSHOT, "/result", "\"x\"")` → `value.result` vakası ekleyin.

### F3 — P3: Bit-özdeşlik testi plandaki asıl değeri hedeflemiyor
- **Yer:** `backend/src/test/java/com/kopruq/bridge/infra/persistence/JpaLoadGraphContentTest.java:~270` (`windSnapshot_numbersAreBitIdentical`) ve `backend/src/test/java/com/kopruq/bridge/LoadGraphFixtures.java:85`.
- **Kanıt:** Fixture bileşen sırası `z0M=0.05, zminM=2.0, kr=0.30000000000000004, cr=-1.5, vmMs=0.0, turbulenceIntensity=1.0E-300, qpKNm2=Double.MAX_VALUE, ...`. Testin bit karşılaştırdığı `cr()` değeri `-1.5`; asıl duyarlı değer `0.30000000000000004` `kr` alanında. "turbulence" kontrolü beklendiği gibi `1.0E-300` üzerinde.
- **Etki:** Pratikte düşük: sondaki `assertEquals(expected, actual)` record eşitliği double'ları `Double.compare` ile karşılaştırıyor ve `kr`'yi zaten bit düzeyinde kapsıyor. Testin niyeti ile karşılaştırması uyuşmuyor.
- **Öneri:** `cr()` yerine `kr()` yazın ya da fixture'daki değerleri test adına uygun alanlara taşıyın.

## Küçük notlar (bulgu değil)
- `frontend/src/features/loads/model/loadsWire.ts:13`: `/** The wind snapshot result is stored as calculated ... */` hiçbir bildirime bağlı değil, JSDoc olarak `const text`'e yapışır. Plan dosya başı yorumuna bir satır olarak tarif etmişti; yorum l.7-11 bloğuna taşınabilir.
- `JpaLoadGraphContentTest.windSnapshot_hasTypedResultColumns` (`:~204`) `result_status`'un `VARCHAR(16)` uzunluğunu doğrulamıyor; `ddl-auto=validate` uzunluk uyuşmazlığını yakalamaz.
- `ProjectLoadGraphApiContractTest` (`:~643`): "transverse null ve missing null kabul" vakası yalnızca 200 döndüğüne bakıyor; dönen değerdeki null'ları kontrol etmiyor.
- `LoadInputMapper.java` sınıf javadoc satırı yaklaşık 135 karakter (build geçtiği için stil denetimi engeli yok).

## Belirsiz hipotezler (doğrulanamadı)
- **H1:** `result_present = TRUE` iken `result_status` kolonunda bilinmeyen bir metin (ör. 'OK') varsa Hibernate `@Enumerated(STRING)` okumada büyük olasılıkla `IllegalArgumentException` veya bir Hibernate istisnası atar; `IllegalStateException` değil. Diğer enum kolonlarıyla tutarlı. "Bozuk veri = ISE" sözleşmesi bu vakayı kapsamıyor; DB'de CHECK olmadığı (bilinçli karar) için yalnızca doğrudan SQL ile oluşabilir.
- **H2:** Gerçek PG'de `information_schema.columns` sorgusu şema filtresi içermiyor; aynı tablo adı birden fazla şemada varsa `13` beklentisi bozulur. Mevcut testler de aynı deseni kullanıyor.
- **H3:** DB'de NaN değeri (PG `'NaN'::float8`) varsa okuma model constructor'ından `IllegalArgumentException` fırlatır; ISE değil. Diğer bölümlerle tutarlı.

## İnceleme odaklarına göre doğrulananlar

**V6 SQL**
- Her ifade H2 ve PG uyumlu; her `ADD COLUMN` ayrı ifade.
- Back-fill deseni V3 ile aynı: ADD → UPDATE → SET NOT NULL. Boş tabloda UPDATE 0 satır etkiler ve SET NOT NULL sorunsuz geçer; dolu tabloda back-fill FALSE yazar.
- DEFAULT ve CHECK yok.
- 13 kolon adı entity'deki `@Column` adlarıyla birebir eşleşiyor; `result_status VARCHAR(16)` ile `@Column(length=16)` uyumlu; `boolean`→BOOLEAN ve `Double`→DOUBLE PRECISION `validate` ile uyumlu.

**Entity**
- Yazmada `r == null` iken tüm alanlar null kalıyor ve `resultPresent=false`.
- `toDomain` iki tutarsız durumda da ISE fırlatıyor; unboxing'den önce dokuz zorunlu kolon ve status kontrol ediliyor, NPE riski yok. `transverse` ve `missing` null olabilir.

**Mapper ve DTO**
- Yollar `value.result.<alan>`; `before`-count deseni doğru; ihlaller `inputs` ile birlikte toplanıyor.
- `result` yoksa ya da null ise sonuç `null`; bilinmeyen alanı strict reader reddediyor.
- Record bileşen sırası wire sırasıyla aynı; yanıtta `"result": null` her zaman yazılıyor.
- Tamsayı görünümlü sayılar (`5`) `Double`'a kabul ediliyor ve `5.0` olarak dönüyor (mevcut alanlarla aynı davranış).

**Katman kuralları:** Yeni dosyalar yalnızca `bridge.enums` ve `bridge.model` import ediyor; `com.kopruq.loads` importu yok. Controller ve endpoint eklenmedi.

**Frontend**
- Şema strict; `result` anahtarı zorunlu, değeri null olabilir; enum değerleri `VALID|INVALID`; anahtar sırası backend ile aynı.
- `toWire` `== null` ile hem null'ı hem eski (alanı olmayan) veriyi karşılıyor; `fromWire` `=== null` kullanıyor (şema anahtarı zorunlu kıldığı için yeterli).
- `projectSections.ts:71`, `loadsServerSections.ts:12` ve `fakeProjectApi.ts` jenerik ya da şekilden bağımsız, mantıksal olarak tutarlı; `WindLoadsPanel` zaten `WindCalculationSnapshot` kullanıyor. Storage sembolü eklenmedi.

**Tersine çevrilen testler meşru:** Eski üç beklenti plan kararıyla çelişiyordu ("üç anahtar ve sonuç yok", "`result` bilinmeyen alan", "kolon adında `result` geçmez"). Yeni testler eski davranışta kesin başarısız olurdu. İki corrupt-data testi, `requireColumn` olmasaydı NPE alacağı için ISE ile ayırt edici.

**Dokümanlar:** 3095 istisna cümlesi, 3244/3250/3254/3275/3277 "superseded" notları, 3306-3319 M3b bölümü ve `roadmap.md:1925` koda uyuyor. V5 yorumunun Flyway checksum nedeniyle değiştirilmediği notu ve geri alma notu doğru.

## Kabul kriterleri

| AC | Kanıt (inceleme) | Durum |
|---|---|---|
| AC1 | V6 SQL, `V6MigrationTest` (back-fill ve NOT NULL); V1-V5 git status'ta değişmemiş | Karşılanıyor. NOT NULL assert'i zayıf ve back-fill satırının JPA okuması dolaylı kapsanıyor (F1) |
| AC2 | `storesAndReturnsTheResult_inKeyOrder`, `invalidResult_roundTrips`, parametreli round-trip (yeni fixture) | Karşılanıyor |
| AC3 | `resultNullOrAbsent_isStoredAsNull` (null ve REMOVE; DB kolonları NULL) | Karşılanıyor |
| AC4 | unknown field, status absent/null/OK, 9 alan absent/null, `qpKNm2`/`cr`/`transverseKNm` için 1e999; `assertRejected` DB'yi ve dokümanı karşılaştırıyor | Karşılanıyor. Ek vakalar için F2 |
| AC5 | `noConsistencyRule`, `isStructuralOnly`; SQL'de DEFAULT/CHECK yok; import kontrolü | Karşılanıyor. Mimari ve endpoint testleri raporlanan sonuca dayanıyor |
| AC6 | Round-trip (3 snapshot), replace dizisi, bit testi, iki corrupt testi | Karşılanıyor (F3 küçük) |
| AC7 | `loadsWire.test.ts` ve `projectDocument.test.ts` yeni ve tersine çevrilmiş vakalar; tip kaldırıldı | Karşılanıyor |
| AC8 | Raporlanan build ve test sonuçları; dokümanlar güncel | Karşılanıyor (koordinatör bağımsız koştu); reviewer koşmadı |

## implementation.md ile kod arasındaki farklar
- Önemli bir fark yok. Dosya listesi, test sayı artışları (+12 backend, +2 frontend), "deviations: none" ifadesi ve AC tablosu kodla tutarlı.
- Plan §3 adım 10'daki "bit kontrolü" fikri implementasyonda var ama karşılaştırılan alan niyetle uyuşmuyor (F3); implementation.md bunu belirtmiyor.

## M5c için gizli riskler (bu feature'ın kapsamı dışında)
- **Sonlu olmayan sonuç:** `WindLoadsService`'ten sonlu olmayan bir değer gelirse (R4) PUT 400 döner. Frontend `toWire` sonluluk kontrolü yapmıyor; `Infinity`, `JSON.stringify` ile `null` olur ve backend "is required" der (yanıltıcı mesaj). M5c bağlantısında yazma kuyruğunun bu 400'ü nasıl ele alacağı düşünülmeli.
- **Eski sonuç (R2, kabul edildi):** Formül değişse bile aynı girdilerle saklanmış eski sonuç güncel görünür; `architecture.md:3095`'teki genel gerekçeyle bilinçli bir çelişki ve dokümante edilmiş.
- **İki ayrı bölüm:** Wind inputs ve snapshot ayrı PUT'larla yazılıyor; birinin yazımı başarısız olursa yeniden yüklemede STALE kuralı tutarsızlığı gizler. Kabul edilmiş durum.
- **Durum alanları:** Üst seviye `status` ile `result.status` farklı olabilir; panel yalnızca `result.status`'u kullandığı için şu an etkisi yok.
- **-0 işareti:** `-0.0` değerinin işareti frontend'de `JSON.stringify` ile kaybolur; etkisi önemsiz.
