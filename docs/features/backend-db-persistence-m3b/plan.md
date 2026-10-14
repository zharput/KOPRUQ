# Plan: `backend-db-persistence-m3b`: rüzgâr hesap sonucunun saklanması

Bu planın temeli, M5 planındaki taslak Bölüm B'dir (`docs/features/backend-db-persistence-m5/plan.md`, satır 616-779). Taslaktaki her iddia gerçek kodla karşılaştırıldı; bulunan yanlış ve eksikler §0'da toplandı.

Kullanıcı kararı yeniden açılmadı. Hesaplanan rüzgâr sonucu tipli ilişkisel kolonlarda saklanır; JSON blob kullanılmaz. Değerler hesaplandığı gibi yazılır. Birim yalnızca frontend alan adında yazıyorsa kolon adına girer. DTO katıdır.

**Sonuç: READY.**

---

## 0. Taslakta (Bölüm B) bulunan yanlış ve eksikler

1. **Enum hata mesajının sırası yanlış.** `SectionChecks.enumValue` (`backend/src/main/java/com/kopruq/bridge/api/SectionChecks.java:89-98`) sabitleri **tanımlandıkları sırayla** birleştirir. Enum TS ile aynı sırada tanımlanacak (`VALID, INVALID`). Bu yüzden mesaj `must be one of: VALID, INVALID` olur; taslaktaki "INVALID, VALID" yanlış.
2. **`vmMs` kolon adı.** Taslaktaki `result_vm_ms` "milisaniye" diye okunabilir. V5 kuralına göre birim parçaları ayrı yazılır: kN/m³ için `_kn_m3`, kN/m için `_kn_m`. Bu yüzden m/s için ad **`result_vm_m_s`** olur.
3. **Contract testinin fixture'ı değişmek zorunda.** `ProjectLoadGraphApiContractTest.WIND_SNAPSHOT` (l.70-72), parametreli `put_roundTripsDeepEqual_…` (l.261-288) testinde JSON derin eşitliğiyle karşılaştırılıyor. Yanıtta artık her zaman `"result"` anahtarı olacak, bu yüzden fixture'a `result` eklenmeli. Taslak bunu atlamış.
4. **Tersine çevrilecek başka testler.** `JpaLoadGraphContentTest.windSnapshot_storesNoResult` (l.197-206) "hiçbir kolon adında `result` geçmez" diye doğruluyor; bu beklenti tersine dönmeli. `loadsWire.test.ts` içindeki üç test de (l.49-55, 56-61 ve 64. satırdaki `result: null` reddi) tersine dönmeli. Taslak bunları listelememiş.
5. **Değişiklik gerekmeyen dosyalar.** `InMemoryProjectContentRepository` (l.83) ve `frontend/src/test/fakeProjectApi.ts` değeri şekle bakmadan saklıyor; değişiklik gerekmez.
6. **Satır numaraları.** STALE mantığı `WindLoadsPanel.tsx:27-28`'de, snapshot kurulumu `:21-24`'te. Contract testindeki iki test l.516-525 ve l.527-536'da (taslakta 524-534 yazıyor).

Taslağın geri kalanı doğrulandı: alanlar, null olabilirlik, `bridge` → `loads` yasağı, `replaceOne` ve `*_present` deseni.

---

## 1. Davranış ve kabul kriterleri

### Davranış
- `PUT /api/projects/{id}/loads/wind-snapshot` ve proje dokümanındaki `loads.windSnapshot` alanı `{schemaVersion, status, inputs, result}` biçimindedir.
  - `result` ya `null` ya da 12 alanlı tipli bir nesnedir.
  - Bu nesne saklanır ve olduğu gibi geri döner.
- `result` anahtarı istekte yoksa `null` sayılır. Yanıtta ve dokümanda anahtar her zaman bulunur; sonuç yoksa değeri açıkça `null`'dır.
- Yalnızca yapısal doğrulama yapılır:
  - `status` alanı `VALID|INVALID` olmalı.
  - Dokuz sayı zorunlu ve sonlu olmalı.
  - `transverseKNm` null olabilir; doluysa sonlu olmalı.
  - `missing` null olabilir.
  - Aralık ve tutarlılık kuralı yoktur. Örneğin `VALID` ile `missing` birlikte dolu olabilir; üst seviyedeki `status` ile `result.status` farklı olabilir.
- Geçerlilik (STALE) **okuma anında** belirlenir: saklı `inputs` güncel girdilerle karşılaştırılır (`WindLoadsPanel.tsx:27-28`'deki mevcut kural). Backend iki bölüm arasında tutarlılık zorlamaz.
- Frontend'deki M4 mapper'ı `result`'u taşır. Uygulama bağlanmamış kalır; UI değişmez.

### Kabul kriterleri
- **AC1:** `V6__wind_snapshot_result.sql` H2 (PostgreSQL modu) üzerinde uygulanır. V1-V5 dosyaları baytı baytına değişmez. V5 seviyesinde var olan bir `load_wind_snapshot` satırı V6'dan sonra `result_present = FALSE` olur, bütün `result_*` kolonları NULL'dır. Bu satır okununca snapshot `result == null` ile gelir. `result_present` NOT NULL'dır.
- **AC2:** `PUT …/loads/wind-snapshot` iki örnekle 200 döner ve revizyon 1 artar: (a) tam bir VALID `result`, (b) `transverseKNm: null` ve `missing` metni olan bir INVALID `result`. Yanıttaki `value` ve sonraki `GET` dokümanındaki `/loads/windSnapshot` gönderilenle derin eşittir (JsonNode eşitliği, sayılar birebir aynı). Anahtar sıraları: üst seviye `schemaVersion, status, inputs, result`; `result` içi `status, z0M, zminM, kr, cr, vmMs, turbulenceIntensity, qpKNm2, bOverD, cfx, transverseKNm, missing`.
- **AC3:** `"result": null` gönderilince ya da `result` anahtarı hiç yoksa 200 döner. Yanıtta ve dokümanda `"result": null` bulunur. DB'de `result_present = FALSE` olur ve sonuç kolonları NULL'dır.
- **AC4:** Aşağıdaki durumlar 400 `INVALID_REQUEST` döner ve DB ile doküman değişmez (revizyon dahil):
  - `result` içinde bilinmeyen alan → `value.result.<alan>` "is not a known field"
  - `result.status` yok → "is required"
  - `result.status` `"OK"` → "must be one of: VALID, INVALID"
  - dokuz sayıdan biri eksik ya da null → `value.result.<alan>` "is required"
  - dokuz sayıdan biri ya da `transverseKNm` `1e999` → `value.result.<alan>` "must be a finite number"
- **AC5:** Değer, birim ya da aralık kontrolü yoktur; `status=VALID` ile dolu `missing` kabul edilir. V6'da backfill dışında DEFAULT ve CHECK yoktur. `bridge`, `com.kopruq.loads`'ı import etmez (`ArchitectureTests` yeşil). Controller sayısı 16, endpoint sayısı 41 kalır (`EndpointInventoryContractTest` değişmeden yeşil). `backend/pom.xml` ve `frontend/package.json` değişmez.
- **AC6:** Kalıcılık katmanı:
  - Snapshot'ın sonuçlu, sonuçsuz ve INVALID hâlleri replace → reload sonrası `equals` ile aynı döner (record eşitliği double'ları `Double.compare` ile karşılaştırır).
  - Sonuçlu → sonuçsuz → sonuçlu ardışık replace çalışır.
  - `result_present = TRUE` iken zorunlu bir `result_*` kolonu NULL ise ya da `result_present = FALSE` iken bir `result_*` kolonu doluysa okuma `IllegalStateException` fırlatır (bozuk veri).
- **AC7:** Frontend `loadsWire`:
  - T→W→T, sonuç dahil derin eşittir (VALID, INVALID ve `result: null`).
  - `toWire` anahtar sırası AC2 ile aynıdır.
  - Katı şema şunları reddeder: `result` anahtarı olmayan snapshot, `result` içinde bilinmeyen anahtar, `status: 'OK'`.
  - `{…, result: null}` artık kabul edilir.
  - Kanonik doküman (sonuçlu) baytı baytına yeniden serileşir.
  - `WindSnapshotInputsValue` tipi kaldırılır.
  - Uygulama davranışı değişmez. `sessionLayerUnwired`, `noBrowserStorage` ve `sourceEncoding` testleri yeşil kalır.
- **AC8:** `mvn -f backend/pom.xml -B clean package` BUILD SUCCESS verir. `npm run build`, `npm test` ve `npm run lint` başarılı olur. `docs/architecture.md` (3095 istisnası, M3/M4 notları, yeni M3b bölümü) ve `docs/roadmap.md` güncellenir.

---

## 2. Mevcut durum (doğrulandı) ve önerilen değişiklik

### 2.1 Doğrulanan mevcut durum

**Hesaplama (`com.kopruq.loads`, değişmeyecek)**
- `loads/model/WindResult.java:2`: `record WindResult(String status, double z0M, double zminM, double kr, double cr, double vmMs, double turbulenceIntensity, double qpKNm2, double bOverD, double cfx, Double transverseKNm, String missing)`
- `loads/domain/WindLoadsService.java:21,26` INVALID durumunda sabit bir dizi döner: `0,…,0, cfx 1.3, transverse null, missing <metin>`. `:32` VALID durumunda `transverse` dolu, `missing` null döner. Yalnızca `"VALID"` ya da `"INVALID"` üretir.

**Frontend tipi:** `frontend/src/features/loads/model/windTypes.ts:1-2`: `WindResult` ve `WindCalculationSnapshot = {schemaVersion: 1; status?: string; inputs{vb,terrain,ze: string; deckWidthM, drefM: number}; result: WindResult | null}`. Java record ile alan alan aynı.

**Bridge modeli:** `bridge/model/WindSnapshot.java:3-14`: `record WindSnapshot(int schemaVersion, String status, WindSnapshotInputs inputs)`, `SCHEMA_VERSION = 1`; Javadoc "result never persisted". `WindSnapshotInputs.java:4-12`; `WindSnapshotSection.java:4`. `SectionInvariants.java` (package-private): `finite`, `finiteOrNull`, `required`.

**API:** `LoadInputDtos.java:42-47`: `WindSnapshotInputsDto(String vb, String terrain, String ze, Double deckWidthM, Double drefM)` ve `WindSnapshotDto(Integer schemaVersion, String status, WindSnapshotInputsDto inputs)`. `LoadInputMapper.java:127-155` (`toWindSnapshot`, `before`-count deseni) ve `:219-223` (`windSnapshotDto`). `SectionChecks`: `requiredFinite` (null ise "is required", sonlu değilse "must be a finite number"), `optionalFinite`, `requiredEnum`. `ProjectRequestReader.java:36-41`: `FAIL_ON_UNKNOWN_PROPERTIES` açık; iç içe yol `value.result.x`. `ProjectLoadInputController.java:74-77` mapper'ı çağırır; değişmeyecek.

**Kalıcılık:** `WindSnapshotEntity.java` satır içi kolonlar kullanıyor, `toDomain` model constructor'ı üzerinden kuruyor (invariant'lar okumada yeniden kontrol ediliyor). `LoadInputContentStore.java:105-108` → `replaceOne` (:138-145): sil, flush, ekle, flush. Corrupt-data deseni `:72-75`: `IllegalStateException`.

**Migration:** `V5__project_loads_graph.sql:84-96` `load_wind_snapshot` tablosunu tanımlıyor. `V3__project_workspace.sql:7-11` backfill deseni: `ADD COLUMN` → `UPDATE` → `ALTER COLUMN … SET NOT NULL`. `*_present BOOLEAN NOT NULL` deseni V4'te (M2) var. Enum kolonları `VARCHAR(16)` + `@Enumerated(EnumType.STRING) @Column(length = 16)` (ör. `BearingFamilyEntity.java:41-43`). Testler H2'nin PostgreSQL modunda koşar; `KOPRUQ_TEST_DB_URL` verilirse gerçek PG (`backend/src/test/resources/config/application.properties`); `ddl-auto=validate`.

**Mimari:** `ArchitectureRules.java:52-77`: `bridge` için hem `CORE_DEPS` hem `DOMAIN_DEPS` boş. `bridge.api` bile `loads.WindResult`'ı import edemez; ayrı bir `bridge.enums.WindResultStatus` zorunlu.

**Frontend M4/M5b:** `loadsWire.ts:13-14` (`WindSnapshotInputsValue = Omit<…,'result'>`), `:30-33` (strict şema, `result` yok), `:67-76` (toWire `result`'u düşürüyor; fromWire `result` vermiyor), `:87` (`WIND_SNAPSHOT_SECTION<WindSnapshotInputsValue, …>`). `projectDocument.ts:16,54` bu tipi kullanıyor. `projectDocumentFixtures.ts:125` kanonik snapshot'ı tutuyor (`status: null`, `result` yok). `projectSections.ts:71` ve `loadsServerSections.ts:12` jenerik; tip kendiliğinden yayılır, kod değişmez. `projectSections.test.ts` ve `fakeProjectApi.test.ts` kanonik fixture'ı jenerik kullanıyor; değişmeden yeşil kalmalı.

**Dokümanlar:** `docs/architecture.md`: 3095 ("**Not persisted:** computed results …"), 3244 ("the calculated wind result is never stored"), 3250 ("a `result` field is rejected as not a known field"), 3254 ("Not in M3 … the calculated results (`windLoads.result`, …)"), 3275 (D10), 3277 ("a wind snapshot has no result after reload"). `docs/roadmap.md:1914-1924` (track; M5 alt listesi).

### 2.2 Kesinleşen kararlar

| # | Karar | Gerekçe |
|---|---|---|
| K1 | Wire şekli `{schemaVersion, status, inputs, result}`; `result` iç sırası Java `WindResult` / TS `WindResult` ile aynı. | Frontend tipi zaten bu şekli taşıyor; sıra record bileşen sırasından gelir. |
| K2 | `result` yoksa yanıtta ve dokümanda açık `null` olur. İstekte anahtarın olmaması `null` sayılır. | M4 D3 kuralı ("absent optional → explicit null"). Global Jackson ayarı null'ları yazıyor; `status: null` zaten öyle dönüyor (contract testi l.544). |
| K3 | `result` içeriği katıdır: bilinmeyen alan 400 döner. | `ProjectRequestReader`, ek kod gerekmez. |
| K4 | Doğrulama yalnızca yapısaldır (bkz. §1). Üst seviye `status` serbest `String` kalır. | Kullanıcı kararı; mühendislik kuralı icat edilmez. Üst `status` M3'ten beri serbest metin. |
| K5 | `bridge.enums.WindResultStatus { VALID, INVALID }` (bu sırayla). | `bridge`, `loads`'ı import edemez. Hata mesajındaki sıra bu tanımdan gelir. |
| K6 | `schemaVersion` 1 kalır. | Frontend snapshot tipi `result`'u v1'den beri içeriyor; değişen yalnızca sunucunun neyi sakladığı. Eski istemciler `result` göndermezse `null` olur. |
| K7 | Satır içi kolonlar + `result_present` (`@Embedded` yok). | Mevcut entity satır içi. Tek entity ile `replaceOne` korunur. `*_present` deseni M2'den. Ayrı bir 1:1 tablo `replaceOne`'a ikinci repository ekler. |
| K8 | Okumada invariant'lar yeniden kontrol edilir. `present` ile kolonlar tutarsızsa `IllegalStateException` fırlar. | M3'teki LM1 corrupt-data deseni (`LoadInputContentStore:72-75`). Primitive unboxing'de NPE yerine anlamlı hata verir. |
| K9 | Replace semantiği değişmez (sil, flush, ekle, flush). Yeni bir hesap snapshot'ı tamamen değiştirir. | Mevcut kod. |
| K10 | `WindSnapshot` 4 bileşenli olur; 3 argümanlı kolaylık constructor'ı **eklenmez**. Test çağrıları `, null` ile güncellenir. | Derleyici her üretim çağrısında sonuç kararını zorlar; sonucun sessizce düşmesi önlenir. |
| K11 | Frontend `WindSnapshotInputsValue` kaldırılır; T = `WindCalculationSnapshot`. `toWire` için `result: v.result == null ? null : {12 alan açık sırayla}`. `fromWire` için `result: w.result === null ? null : {…}`. `status` için "null ise omit" kuralı korunur. | M4 D3/D4. `== null`, runtime'da `result` alanı olmayan eski `.kopruq` verisine (M5c göçü) karşı savunmadır. |
| K12 | STALE semantiği yalnızca dokümante edilir, kod değişmez. | Kural `WindLoadsPanel.tsx:27-28`'de zaten var. Backend bölümler arası tutarlılık zorlamaz. Girdi değişince snapshot temizlenmez. |

### 2.3 JSON şekilleri

PUT gövdesi (VALID). Sayılar keyfî test verisidir, mühendislik verisi değildir:
```json
{"expectedRevision":0,
 "value":{"schemaVersion":1,"status":"VALID",
  "inputs":{"vb":"27","terrain":"II","ze":"10","deckWidthM":13.8,"drefM":3.0},
  "result":{"status":"VALID","z0M":0.05,"zminM":2.0,"kr":0.19,"cr":0.30000000000000004,
            "vmMs":-1.5,"turbulenceIntensity":0.0,"qpKNm2":1.0E-300,"bOverD":4.6,"cfx":1.3,
            "transverseKNm":2.5,"missing":null}}}
```
INVALID varyantı: `"result":{"status":"INVALID",…,"transverseKNm":null,"missing":"some text"}`. Sonuçsuz varyant: `"result":null` ya da anahtar yok.

Yanıt: `{"projectId":…,"revision":1,"updatedAt":…,"value":{…aynı, "result" her zaman var…}}`.

Not: contract fixture'larında tüm double değerler ondalıklı yazılmalı (`2.0`, `5` değil). Jackson `IntNode` ile `DoubleNode`'u eşit saymaz.

### 2.4 V6 SQL (yeni dosya `backend/src/main/resources/db/migration/V6__wind_snapshot_result.sql`)

```sql
-- V6: wind snapshot result (backend-db-persistence M3b; user decision 2026-10-14: the calculated wind result is stored
-- together with the inputs it was calculated from; supersedes the "result is never stored" note of V5).
-- Values are stored exactly as calculated; units live in the column names only where the frontend field name states
-- them (_m, _m_s, _kn_m2, _kn_m); kr, cr, turbulence intensity, b/d and cfx are unitless. result_present tells
-- "no result" from a result; the result columns are nullable because a snapshot may have no result (required-ness
-- when present is checked in the application layer and re-checked on read). No DEFAULT, no CHECK. Existing rows are
-- back-filled with result_present = FALSE (they read back with "result": null).
ALTER TABLE load_wind_snapshot ADD COLUMN result_present BOOLEAN;
UPDATE load_wind_snapshot SET result_present = FALSE;
ALTER TABLE load_wind_snapshot ALTER COLUMN result_present SET NOT NULL;
ALTER TABLE load_wind_snapshot ADD COLUMN result_status VARCHAR(16);
ALTER TABLE load_wind_snapshot ADD COLUMN result_z0_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_zmin_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_kr DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_cr DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_vm_m_s DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_turbulence_intensity DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_qp_kn_m2 DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_b_over_d DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_cfx DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_transverse_kn_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_missing VARCHAR;
```
- Her `ADD COLUMN` ayrı bir ifade. Tek ALTER içinde çoklu ADD, H2 ile PG arasında sözdizimi farkı riski taşır.
- `SET NOT NULL` sözdizimi V3:10-11 ile aynı. DEFAULT de CHECK de yok.

---

## 3. Uygulama adımları (sıralı)

### Backend, main
1. **Yeni** `backend/src/main/java/com/kopruq/bridge/enums/WindResultStatus.java`: `public enum WindResultStatus { VALID, INVALID }`; Javadoc: değerler `loads` domain'inin ürettiği durum metinlerinin kopyasıdır; `bridge`, `loads`'ı import etmez.
2. **Yeni** `backend/src/main/java/com/kopruq/bridge/model/WindSnapshotResult.java`: `public record WindSnapshotResult(WindResultStatus status, double z0M, double zminM, double kr, double cr, double vmMs, double turbulenceIntensity, double qpKNm2, double bOverD, double cfx, Double transverseKNm, String missing)`. Kompakt constructor: `SectionInvariants.required("status", status)`; dokuz alan için `SectionInvariants.finite(...)`; `SectionInvariants.finiteOrNull("transverseKNm", ...)`. `missing` kontrol edilmez. Javadoc: birimler alan adında (m, m/s, kN/m², kN/m); değerler hesaplandığı gibi; aralık ya da tutarlılık kuralı yok.
3. **Değişiklik** `bridge/model/WindSnapshot.java`: dördüncü bileşen `WindSnapshotResult result` (nullable). Javadoc: "result is stored as calculated, null = no result; validity is decided at read time by comparing inputs (M3b)".
4. **Yeni** `V6__wind_snapshot_result.sql` (§2.4).
5. **Değişiklik** `bridge/infra/persistence/WindSnapshotEntity.java`:
   - Yeni alanlar: `@Column(name="result_present", nullable=false) boolean resultPresent`; `@Enumerated(EnumType.STRING) @Column(name="result_status", length=16) WindResultStatus resultStatus`; 10 adet `Double` (`result_z0_m`, `result_zmin_m`, `result_kr`, `result_cr`, `result_vm_m_s`, `result_turbulence_intensity`, `result_qp_kn_m2`, `result_b_over_d`, `result_cfx`, `result_transverse_kn_m`); `String resultMissing` (`result_missing`).
   - Constructor: `s.result() == null` ise `resultPresent=false` ve bütün sonuç alanları null; aksi hâlde birebir kopyalanır.
   - `toDomain()`: `resultPresent` true ise, NULL olan zorunlu bir kolon (`result_status` ya da dokuz sayıdan biri) `IllegalStateException("Stored wind snapshot of project <id> has result_present but <column> is null")` fırlatır; sonra `new WindSnapshotResult(...)` çağrılır (invariant'ları yeniden kontrol eder). `resultPresent` false iken herhangi bir `result_*` kolonu doluysa `IllegalStateException` fırlar. Sonuç `new WindSnapshot(schemaVersion, snapshotStatus, inputs, result)`.
   - Javadoc güncellenir.
6. **Değişiklik** `bridge/api/LoadInputDtos.java`: yeni `public record WindSnapshotResultDto(String status, Double z0M, Double zminM, Double kr, Double cr, Double vmMs, Double turbulenceIntensity, Double qpKNm2, Double bOverD, Double cfx, Double transverseKNm, String missing)`; `WindSnapshotDto(Integer schemaVersion, String status, WindSnapshotInputsDto inputs, WindSnapshotResultDto result)`; Javadoc l.45 güncellenir ("result is optional; null = no result; strict").
7. **Değişiklik** `bridge/api/LoadInputMapper.java`:
   - `toWindSnapshot` (:127-155), `inputs` bloğundan sonra: `WindSnapshotResultDto r = dto.result();` null değilse: `String rp = path + ".result"; int before = c.count();` `WindResultStatus st = c.requiredEnum(rp + ".status", r.status(), WindResultStatus.class);` dokuz alan için `double x = c.requiredFinite(rp + ".<alan>", r.<alan>())`; `Double t = c.optionalFinite(rp + ".transverseKNm", r.transverseKNm());` `if (c.count() == before) result = new WindSnapshotResult(st, …, t, r.missing());` `c.throwIfAny()` mevcut yerinde kalır; tüm ihlaller birlikte raporlanır.
   - `windSnapshotDto` (:219-223): `v.result() == null ? null : new WindSnapshotResultDto(v.result().status().name(), …)`.
   - Sınıf javadoc'u (l.32-36) güncellenir.
   - Controller, `LoadInputPutRequests` ve `LoadsDto` **değişmez** (tipler aynı adla genişliyor).

### Backend, test
8. `backend/src/test/java/com/kopruq/bridge/LoadGraphFixtures.java`: `windSnapshot()` → VALID sonuçlu (keyfî değerler: `0.30000000000000004`, negatif, `0.0`, `1.0E-300`, `Double.MAX_VALUE`; `missing` null). `windSnapshotWithoutStatus()` → `result` null kalır (çağrıya `, null` eklenir). Yeni `windSnapshotInvalidResult()`: üst `status` null, `result.status` INVALID, `transverseKNm` null, `missing` `"x ç"`.
9. `bridge/model/LoadGraphSectionsTest.java`: l.84-87'deki 4 constructor çağrısına `, null` eklenir (derleme gereği; beklenti aynı). Yeni `windSnapshotResult_isStructuralOnly`: kabul — VALID + dolu `missing`, INVALID + transverse null, negatif ve sıfır değerler, `WindSnapshot(…, null)`; ret — null status; 9 alanın her birinde NaN ya da sonsuz (parametreli ya da döngüyle); transverse NaN.
10. `bridge/infra/persistence/JpaLoadGraphContentTest.java`: `loadSections()` (l.119-122) akışına `windSnapshotInvalidResult()` eklenir. **Tersine çevrilen** l.197-206 `windSnapshot_storesNoResult` → `windSnapshot_hasTypedResultColumns`: `information_schema.columns`'tan 13 kolon ve tipleri (BOOLEAN, VARCHAR, DOUBLE PRECISION) doğrulanır; `result_present` nullable değil, diğerleri nullable. Yeni: `windSnapshot_replaceWithAndWithoutResult` (sonuçlu, sonuçsuz, sonuçlu; her adımda DB'de `result_present` ve kolonların null olduğu JDBC ile doğrulanır); `windSnapshot_numbersAreBitIdentical` (`Double.doubleToRawLongBits`); `windSnapshot_presentWithNullRequiredColumn_isCorruptData` (JDBC ile `update … set result_kr = null`, `em.clear()`; `contents.load` `IllegalStateException`); `windSnapshot_absentWithResultColumn_isCorruptData`.
11. **Yeni** `bridge/infra/persistence/V6MigrationTest.java` (`V3MigrationTest` deseni): özel H2 URL'si `jdbc:h2:mem:v6migration;MODE=PostgreSQL;…`; `flyway(target "5").migrate()`; proje insert'i (V3+ kolonlarıyla: `revision`, `updated_utc`) ve V5 şekliyle bir `load_wind_snapshot` satırı; tam migrate; doğrulanır: `result_present = false`, 12 `result_*` kolonu null; `result_present` belirtilmeyen bir insert başarısız olur (NOT NULL).
12. `contract/ProjectLoadGraphApiContractTest.java`:
    - `WIND_SNAPSHOT` (l.70-72) tam VALID `result` alır (ondalıklı sayılarla). Yeni sabitler: `WIND_SNAPSHOT_INVALID` (transverse null, missing metni). Sonuçsuz vaka `change(WIND_SNAPSHOT, "/result", null)` ve `REMOVE` ile üretilir.
    - **Tersine çevrilen** l.516-525 → `windSnapshot_storesAndReturnsTheResult_inKeyOrder`: anahtarlar `schemaVersion,status,inputs,result`; `result` anahtar sırası; GET derin eşit.
    - **Tersine çevrilen** l.527-536 → `windSnapshot_resultNullOrAbsent_isStoredAsNull` (200, `result` `isNull`, DB `result_present=false`) ve `windSnapshot_unknownFieldInResult_isRejected` (`value.result.x`, "is not a known field").
    - Yeni: `windSnapshot_invalidResult_roundTrips`, `windSnapshot_resultStatusMustBeKnown` (`"OK"` → "must be one of: VALID, INVALID"; null → "is required"), `windSnapshot_resultNumbersRequiredAndFinite` (`kr` REMOVE ve null → "is required"; `qpKNm2` `1e999` → "must be a finite number"; `transverseKNm` `1e999` → "must be a finite number"; `transverseKNm` null ve `missing` null kabul), `windSnapshot_noConsistencyRule` (VALID + `missing` dolu + üst status `"INVALID"` → 200).
    - `put_overflowingNumbers…` (l.386-396) içine bir `value.result.cr` overflow vakası eklenir (isteğe bağlı).
    - Reddedilen her vaka `assertRejected` ile DB ve dokümanın değişmediğini doğrular (`dbState`, `select *` olduğu için yeni kolonları kapsar).
13. Değişmeyen testler: `InMemoryProjectContentRepository`, `EndpointInventoryContractTest`, `ArchitectureTests`/`ArchitectureRules`, `V3MigrationTest`, `WindLoadsServiceTest`.

### Frontend (bağlanmamış M4 kodu)
14. `frontend/src/features/loads/model/loadsWire.ts`: l.13-14 `WindSnapshotInputsValue` silinir. Yeni şema: `export const windResultWireSchema = z.object({ status: z.enum(['VALID','INVALID']), z0M: number, zminM: number, kr: number, cr: number, vmMs: number, turbulenceIntensity: number, qpKNm2: number, bOverD: number, cfx: number, transverseKNm: number.nullable(), missing: text.nullable() }).strict()`. `windSnapshotWireSchema`'ya `result: windResultWireSchema.nullable()` eklenir (anahtar zorunlu, değer null olabilir). `windSnapshotToWire(v: WindCalculationSnapshot)` ve `windSnapshotFromWire(w): WindCalculationSnapshot` K11'e göre yazılır; yorumlar (l.67, l.72) güncellenir. `WIND_SNAPSHOT_SECTION = loadSection<WindCalculationSnapshot, WindSnapshotWire>(…)`. Dosya başı yorumuna bir satır: "wind snapshot result is stored as calculated (M3b)".
15. `frontend/src/app/project-session/projectDocument.ts` l.16 ve l.54: `WindSnapshotInputsValue` yerine `WindCalculationSnapshot` gelir (import `../../features/loads/model/windTypes`).
16. `frontend/src/app/project-session/projectDocumentFixtures.ts` l.125: kanonik `windSnapshot`'a `result: { status: 'VALID', z0M: …, …, transverseKNm: …, missing: null }` eklenir. Değerler keyfî ve `0.30000000000000004` içerir. Üst `status: null` bırakılır; bu, tutarlılık zorlanmadığını da gösterir. Yeni-proje dokümanı değişmez.
17. `frontend/src/features/loads/model/loadsWire.test.ts`: import l.7'den `WindSnapshotInputsValue` çıkar. **Tersine çevrilen** l.49-55 → "keeps result": anahtar sırası `['schemaVersion','status','inputs','result']`, `Object.keys(wire.result!)` 12 alan sırasıyla; `fromWire(toWire(SNAPSHOT))` `SNAPSHOT`'a eşit. l.56-61: tip `WindCalculationSnapshot` olur, `result: null` eklenir; status kuralı aynı kalır; `back.result` null. Yeni: INVALID (transverse null, missing metni) T→W→T; runtime'da `result` alanı olmayan nesne (`as unknown as WindCalculationSnapshot`) için `toWire(...).result === null`. **Tersine çevrilen** l.64: `{...snapshot, result: null}` artık kabul edilir (`not.toThrow`). Yeni retler: `result` anahtarı silinmiş → `toThrow('loads.windSnapshot.result')`; `result.x` → `toThrow('loads.windSnapshot.result')`; `result.status: 'OK'` → `toThrow('loads.windSnapshot.result.status')`.
18. `frontend/src/app/project-session/projectDocument.test.ts`: l.28 beklentisi `result` dahil nesneye güncellenir (legitimately reversed). Yeni bir test: kanonik dokümanın kopyasında `result` önce `null`, sonra INVALID varyantı yapılır; `loadProjectDocument` ve section `toWire` ile JSON baytı baytına aynı çıkar. l.46-114'teki byte-for-byte testleri yeni fixture'la otomatik kapsanır, değişmez.
19. Değişmeyen frontend dosyaları: `windTypes.ts`, `WindLoadsPanel.tsx` (+test), `loadsServerSections.ts`, `projectSections.ts` (+test), `fakeProjectApi.ts` (+test), `App.tsx`, `.kopruq` dosyaları.

### Dokümanlar
20. `docs/architecture.md`:
    - **3095**: "**Not persisted:** computed results (…)" cümlesinden sonra eklenir: "Exception (BACKEND-DB-PERSISTENCE M3b, user decision 2026-10-14): the wind calculation snapshot result is stored with the inputs it was calculated from; its validity is decided at read time by comparing the stored inputs with the current inputs (STALE hides the result), and no calculation version is stored."
    - **3244** "(the calculated wind result is never stored)" sonrasına "- superseded by M3b (V6)"; **3250** "a `result` field is rejected …" sonrasına "- superseded by M3b: `result` is accepted and stored"; **3254** `windLoads.result` maddesine "(stored since M3b)"; **3275** D10 ve **3277** "a wind snapshot has no result after reload" ifadelerine "superseded by M3b".
    - Sona yeni bölüm "## BACKEND-DB-PERSISTENCE M3b (2026-10-14)": V6 kolonları ve backfill, model/enum, wire şekli ve sırası, yapısal doğrulama, corrupt-data kontrolü, STALE semantiği, R2 kabulü, frontend M4 mapper değişikliği (bağlanmamış), 16/41 değişmedi, V5 yorumunun Flyway nedeniyle eski kaldığı.
21. `docs/roadmap.md`: M5 alt listesine, M5b'den sonra: `  - [x] M3b Wind snapshot result persisted (2026-10-14; plan docs/features/backend-db-persistence-m3b/): Flyway V6 …, WIND_SNAPSHOT DTO/mapper, frontend loadsWire result. Prerequisite of M5c (wind). Controllers 16, endpoints 41.`
22. Kontroller (§4).

---

## 4. Doğrulama

### Komutlar (keşfedildi)

Backend, Git Bash:
```bash
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
MVN=/c/Users/cemha/.m2/wrapper/dists/apache-maven-3.9.16/0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0/bin/mvn
# odaklı
$MVN -f backend/pom.xml -B clean test -Dtest=LoadGraphSectionsTest,JpaLoadGraphContentTest,V6MigrationTest,V3MigrationTest,ProjectLoadGraphApiContractTest,EndpointInventoryContractTest,ArchitectureTests
# zorunlu
$MVN -f backend/pom.xml -B clean package
```
PowerShell eşdeğeri:
```
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
& 'C:\Users\cemha\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd' -f backend/pom.xml -B clean package
```
Varsayılan `java` JDK 26'dır; `JAVA_HOME` JDK 21'i göstermeli. İsteğe bağlı PG koşusu: compose `postgres-test` profili açıkken `KOPRUQ_TEST_DB_URL=jdbc:postgresql://localhost:5433/kopruq_test` (+ `_USERNAME`/`_PASSWORD`) ile aynı `mvn`; Docker gerekir, profili başlatan tam compose komutu bu planda doğrulanmadı.

Frontend:
```bash
cd frontend && npx vitest run src/features/loads/model/loadsWire.test.ts src/app/project-session   # odaklı
cd frontend && npm run build && npm test && npm run lint                                           # zorunlu
```

### Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `V6MigrationTest`; `git diff --stat -- backend/src/main/resources/db/migration` | Backfill doğru; NOT NULL ihlali hata verir; yalnızca V6 eklenmiş |
| AC2 | Contract testleri: round-trip (VALID, INVALID), anahtar sırası, parametreli round-trip (yeni fixture) | 200, revizyon +1, JsonNode eşitliği |
| AC3 | Contract: `result: null` ve REMOVE; JDBC ile `result_present` | 200, `result` `isNull`, `false` |
| AC4 | Contract: `assertRejected` vakaları | 400, alan yolları ve mesajlar beklenen gibi; `dbState` ve doküman aynı |
| AC5 | `windSnapshot_noConsistencyRule`; V6 dosyasında `DEFAULT`/`CHECK` araması (yalnızca `UPDATE` backfill); `ArchitectureTests`; `EndpointInventoryContractTest`; `git diff -- backend/pom.xml frontend/package.json` | Yeşil; diff boş |
| AC6 | `JpaLoadGraphContentTest` (round-trip, replace dizisi, bit kontrolü, iki corrupt-data testi), `LoadGraphSectionsTest` | Yeşil |
| AC7 | `loadsWire.test.ts`, `projectDocument.test.ts`, `projectSections.test.ts`, `fakeProjectApi.test.ts`, `sessionLayerUnwired`/`noBrowserStorage`/`sourceEncoding` testleri; `WindSnapshotInputsValue` araması | Yeşil; arama 0 sonuç |
| AC8 | `mvn … clean package`; `npm run build && npm test && npm run lint`; doküman satırlarının gözle kontrolü | BUILD SUCCESS; 0 hata |

### Değişecek dosyalar

**Yeni:** `backend/src/main/java/com/kopruq/bridge/enums/WindResultStatus.java`; `backend/src/main/java/com/kopruq/bridge/model/WindSnapshotResult.java`; `backend/src/main/resources/db/migration/V6__wind_snapshot_result.sql`; `backend/src/test/java/com/kopruq/bridge/infra/persistence/V6MigrationTest.java`.
**Değişen, backend main:** `bridge/model/WindSnapshot.java`; `bridge/infra/persistence/WindSnapshotEntity.java`; `bridge/api/LoadInputDtos.java`; `bridge/api/LoadInputMapper.java`.
**Değişen, backend test:** `bridge/LoadGraphFixtures.java`; `bridge/model/LoadGraphSectionsTest.java`; `bridge/infra/persistence/JpaLoadGraphContentTest.java`; `contract/ProjectLoadGraphApiContractTest.java`.
**Değişen, frontend:** `src/features/loads/model/loadsWire.ts` ve `loadsWire.test.ts`; `src/app/project-session/projectDocument.ts`, `projectDocumentFixtures.ts`, `projectDocument.test.ts`.
**Dokümanlar:** `docs/architecture.md`, `docs/roadmap.md`.

### Beklentisi meşru biçimde tersine dönen testler
- `ProjectLoadGraphApiContractTest.windSnapshot_storesAndReturnsExactlyThreeKeys_andNoResult` (l.516-525) ve `windSnapshot_resultIsNotAKnownField` (l.527-536): artık `result` kabul ediliyor.
- `ProjectLoadGraphApiContractTest.WIND_SNAPSHOT` fixture'ı: yanıtta artık her zaman `result` anahtarı var.
- `JpaLoadGraphContentTest.windSnapshot_storesNoResult` (l.197-206): artık sonuç kolonları var.
- `loadsWire.test.ts`: l.49-55 ("drops result"), l.56-61 (kaldırılan tip), l.64 (`result: null` reddi).
- `projectDocument.test.ts:28`: kanonik fixture artık sonuç içeriyor.
- `LoadGraphSectionsTest` l.84-87: yalnızca derleme için `, null` ekleniyor, beklenti aynı.

### Baseline test sayıları
Planlayıcı komut çalıştıramaz; sayılar yeniden ölçülmedi. Son bilinen değerler: backend 720 test, 1 skip (M3 implementation.md:5; M5a ve M5b backend'e dokunmadığı için muhtemelen aynı, doğrulanmadı); frontend 119 dosya / 1184 test (koordinatörün verdiği değer). Implementer, değişiklikten önce ve sonra sayıları yeniden ölçüp raporlamalı. Beklenen artış: backend yaklaşık +10-15, frontend yaklaşık +3-5 test, yeni frontend test dosyası yok.

### Riskler
- **R1 (birlikte değişim):** Katı zod şeması, M4 mapper'ının eski hâliyle `result` anahtarlı dokümanı reddeder. Backend ve frontend aynı feature'da, birlikte değişmeli. Uygulama bağlı olmadığı için runtime etkisi yok.
- **R2 (eski sonuç):** Saklanan hesaplanmış değerin geçerliliği yalnızca girdi karşılaştırmasıyla belirlenir. `WindLoadsService` formülü değişirse, aynı girdilerle saklanmış eski sonuç güncel görünür; hesaplama sürümü saklanmıyor. Kullanıcı kararıyla kabul edildi ve dokümana açıkça yazılacak. İleride eklemek ayrı bir feature olur ve mühendis onayı gerekir.
- **R3 (H2/PG):** `ALTER … SET NOT NULL` ve `@Enumerated` + `VARCHAR(16)` validate davranışı PG'de yalnızca isteğe bağlı `postgres-test` koşusuyla doğrulanır. Sözdizimi V3 ve V4 ile aynı olduğu için risk düşük.
- **R4 (sonlu olmayan sonuç):** `WindLoadsService`, çok büyük `vb` ile teorik olarak sonsuz bir değer üretebilir. Bu durumda saklama 400 döner. Yapısal olarak doğru davranış; frontend tarafında bağlama M5c'nin işidir.
- **Geri alma:** Flyway yalnızca ileri gider. Kod geri alınırsa V6 kolonları kalır; eski entity `result_present`'i doldurmadığı için insert NOT NULL nedeniyle başarısız olur. Kod ve migration birlikte geri alınmalı; geri dönüş gerekirse V7 ile yapılmalı. V5'in SQL yorumu Flyway checksum'ı nedeniyle eski ifadeyi korur; bu durum V6 yorumunda ve architecture'da not edilir.

### Varsayımlar
- Jackson global ayarı null alanları yazar (doğrulandı: `status: null` dönüyor); `result: null` ek ayar gerektirmez.
- Jackson `1e999`'u `Double` alanında sonsuz olarak okur ve mapper bunu yakalar (doğrulandı: mevcut `deckWidthM` overflow testi l.390-391).
- Fixture sayıları keyfî test verisidir, mühendislik değeri değildir.
- Roadmap'te M3b'nin M5 alt listesine yerleştirilmesi editoryal bir tercih.

### Açık sorular
Yok. Mühendislik bilgisi gerekmiyor: alanlar, null olabilirlik, enum değerleri ve birimler hem Java record'undan hem TS tipinden belli. Yazılım kararları §2.2'de gerekçeleriyle kapatıldı.

**READY**
