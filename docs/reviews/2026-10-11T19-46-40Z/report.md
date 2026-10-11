# Project review — 2026-10-11T19:46:40Z (UTC)

## Result
- **Verdict: ACTION_REQUIRED**
- **Scope and working-tree HEAD:** `backend` · `bdca6d8b5704392e36621f12d4d3cdd740d381c3`
- **Before/after fingerprints:** `cee2560eea5506ddecdb7edc45ca0f65f47d8b08829efe5b4bb1182c83fb5980` / `cee2560eea5506ddecdb7edc45ca0f65f47d8b08829efe5b4bb1182c83fb5980` — **unchanged** (HEAD ve config hash'i aynı, dosya hash farkı yok)
- **Architectural target:** `docs/architecture/backend-reference.md` (referans: https://github.com/CemHarput/spanova-backend @ `6beb984daa9eb2001199e198613cd5fbccd5a35c`), KOPRUQ'a uyarlanmış R1–R16. Çakışmalarda CLAUDE.md esas alındı.
- **Architecture summary:** Maven çok modüllü (14 modül), Java 21, Spring Boot 3.5.16. Bağımlılık grafiği döngüsüz; Spring yalnızca `api`'de, MIDAS kodu yalnızca `midas-adapter`'da (R3 bugün sağlanıyor, ama otomatik denetlenmiyor). `api` 12 controller'lı düz feature paketlerinden oluşuyor; application/infra katmanı, `@Service`, global hata işleyici, Bean Validation, log/correlation yok. Domain modelleri (record'lar) değişmez taşımıyor; doğrulama controller ve servislere dağılmış. Kalıcılık yok; iki sınırsız in-memory repository ve sınırsız job map var. Analiz portu MIDAS sözlüğünü taşıyor. Ayrıntı `architecture.md`.
- **Full text inspection:** 232/232 seçili metin dosyası (kod fazında tümü full).
- **Partial / not inspected / excluded / binary / oversized / deleted / symlink:** 0 / 0 / 0 / 0 / 0 / 0 / 0. `target/` ve Git'in yok saydığı dosyalar envanterde yok.
- **Analyzer state:** Hiçbiri çalıştırılmadı — pom'larda Checkstyle/SpotBugs/PMD/JaCoCo/ArchUnit/enforcer yok, CI yok, `mvn` bu shell'in PATH'inde yok ve build/test çalıştırma politika dışı (`analyzers/README.md`). Bulgular yalnızca kaynak okumasına dayanır; çalışma zamanı davranışları kodla izlendi, çalıştırılmadı.

## Confirmed findings
Bulgu sayısı (ID adedi, ölçüm değil): **2 CRITICAL, 42 MAJOR, 38 MINOR**; ayrıca INFO notları. BLOCKER yok. Tam kanıt, tetikleyici, kuralın gerekçesi ve doğrulama adımı `architecture.md` / `batches/NNN.md`'dedir; kök neden gruplaması `code-quality.md`'de.

| ID | Severity | Category | Confidence | Location | Impact | Smallest useful repair |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | CRITICAL | Doğrulama / mühendislik güvenliği | high | `api/.../FastSolverRequest.java:19-32`; `KernelStateRequest.java:21-30`; `FastSolverModelBuilder.java:51,58-60` | Eksik alan 0 olarak analize giriyor, `COMPLETED` | Kutulu tipler + `@Valid`/Bean Validation (yalnızca api, milestone onayıyla) ya da `FAIL_ON_NULL_FOR_PRIMITIVES` |
| F-02 | CRITICAL | Mühendislik güvenliği | high | `traffic-loads/.../SeismicSpectrumService.java:1` | Null/tanınmayan tip → Tip 1 sessizce "VALID" | Bilinmeyen tipte `INVALID`; kaynaklı sabitler; testler |
| F-03 | MAJOR | Kaynak | high | `FastSolverController.java:38`; `KopruqAnalysisEngine.java:33-55`; `MidasCivilNxAnalysisEngine.java:37-77` | Job map sınırsız büyüyor | Sonuçtan sonra silmek / tahliye |
| F-04 | MAJOR | Hata sözleşmesi | high | `LandXmlController.java:65-66,85`; `TerrainController.java:72-74`; `FastSolverController.java:47-49`; `application.properties:12` | Aynı hata 400/500/200; iç mesaj sızıyor | Kodlu istisna + tek `@RestControllerAdvice`; `include-message` kaldır |
| F-05 | MAJOR | Yanlış yerde iş mantığı | high | `api/.../FastSolverModelBuilder.java:35-145`; `FastSolverController.java:80-122` | Modelleme Spring'e bağlı; denge kontrolü çözücüden farklı | Framework'süz modüle taşı |
| F-06 | MAJOR | Sızan soyutlama | high | `analysis-api/.../AnalysisMaterial.java:3-15`; `LoadCase.java:3-9`; `MidasModelBuilder.java:40-65` | MIDAS'ta mesnet/SDL olmadan `COMPLETED` | KOPRUQ enum'ları, SI birimleri, desteklenmeyende hata |
| F-07 | MAJOR | Hesaplama limiti | high | `AlignmentController.java:70-84`; `LandXmlController.java:109-121`; `FrameSolver.java:50`; `application.properties:7-8` | Tek istek CPU/belleği tüketebilir | `ComputationLimits` |
| F-08 | MAJOR | Modül / milestone / provenans | high | `traffic-loads/.../WindLoadsService.java`, `UniformTemperatureService.java`, `SeismicSpectrumService.java` | Belgesiz uçlar, kaynaksız ve testsiz formüller | Provenans, belge, ayrı modül, testler |
| F-09 | MAJOR | Mühendislik güvenliği | medium | `Lm1DefaultsFactory.java:23-31`; `package-info.java:4-5`; `TrafficLoadsServiceTest.java:16-25` | Onaysız değerler "resolved" | Onayı belgele ya da null'a çek |
| F-10 | MAJOR | Mühendislik güvenliği | medium | `RuleEngine.java:20-36`; `RuleEvaluation.java:4` | Kuralsız `feasible=true` | `PASS/FAIL/NOT_EVALUATED` |
| F-11 | MAJOR | Paylaşılan durum | high | `InMemoryTerrainRepository.java:9-15`; `InMemoryLandXmlImportRepository.java:9-15` | Import'lar süreç ömrü boyunca bellekte | Kapasite/LRU/`DELETE` |
| F-12 | MINOR | Bağımlılık | high | `midas-adapter/pom.xml:32-36`; `analysis-api/pom.xml:22-28`; `api/pom.xml:43-47` | Kullanılmayan bağımlılıklar | Kaldır |
| F-13 | MAJOR | Sorumluluk / tekrar | high | `AlignmentController.java:70-84` vs `LandXmlController.java:109-121`; `TerrainMeshResponse.java:34-39` | Aynı kavram uca göre farklı sonuç | `application` paketi; ortak mantığı modüle |
| F-14 | MAJOR | Birimler | medium | `AnalysisMaterial.java:5-9`; `FastSolverRequest.java:31-32`; `SeismicSpectrumRequest.java:1` | Birimler farklı yorumlanabilir | Birim sonekleri, SI port |
| F-15 | MINOR | Bağlama | high | 9 controller'da `new` | Durumlu nesneler gizli, test edilemiyor | `CoreConfiguration` |
| F-16 | MAJOR | Gözlemlenebilirlik | medium | main'de Logger yok; `KopruqAnalysisEngine.java:53-56` | Hatalar teşhis edilemiyor | Correlation filtresi + log |
| F-17 | MINOR | Mimari koruma | high | mimari test/enforcer yok | Sapma fark edilmiyor | Modül başına import testi / enforcer |
| F-18 | MINOR | Yapılandırma | high | 12 controller `@CrossOrigin` | Tekrar | `WebMvcConfigurer` |
| F-19 | MINOR | Yanlış yerde domain | high | `analysis-api/.../EurocodeConcrete.java:19-56` | Malzeme bilgisi port'a bağlı | `materials` modülü (milestone) |
| C-001-01 | MAJOR | Doğrulama | high | `Alignment.java:47-59,201-208`; `LandXmlParser.java:315-317,341-343` | Yer tutucu elemanlar NaN/orijin koordinat | Kurucu değişmezleri; parser'da ret |
| C-001-02 | MINOR | Sayısal | high | `Alignment.java:94-116` | NaN sessizce yayılıyor | `isFinite` |
| C-001-03 | MAJOR | Referans sözleşmesi | medium-high | `Alignment.java:53`; `LandXmlController.java:125-127` | `staStart≠0`'da tasarım kotu kayık | `startStationM` |
| C-001-04 | MAJOR | Mühendislik varsayımı | high | `LandXmlParser.java:372-379`; `VerticalProfile.java:30-48` | Parabolik kurb kırık hesaplanıyor | `ParaCurve`; karar mühendise |
| C-001-05 | MAJOR | Doğrulama | medium | `VerticalProfile.java:23-70` | Aralık dışında uydurulmuş kot | Değişmezler; ekstrapolasyon yerine hata |
| C-001-06 | MINOR | Doküman | high | `alignment/package-info.java:7-11` | Bayat javadoc | Güncelle |
| C-001-07 | MINOR | Test | high | alignment testleri | Sınır durumları testsiz | Regresyon testleri |
| C-002-01 | MAJOR | Sayısal | medium | `DenseLinearSolver.java:19-29`; `KopruqAnalysisEngine.java:41-52` | Mekanizma "başarılı" görünebilir | Göreli eşik, `isFinite` |
| C-002-02 | MAJOR | Doğrulama | high | `SolidRectangleSection.java:4`; `ElasticLinkElement.java:18-21`; `FrameSolver.java:86-109` | Geçersiz girdi `COMPLETED` | Record değişmezleri, referans bütünlüğü |
| C-002-03 | MAJOR | Port sözleşmesi | high | `FrameSolver.java:75-93`; `AnalysisResult.java:13-17` | Yük durumları sessizce toplanır | Durum başına sonuç / çoklu durumda hata |
| C-002-04 | MAJOR | Mühendislik güvenliği | high | `EurocodeConcrete.java:36-50` | fck=0 makul Ecm | Aralık kontrolü (mühendis teyidi) |
| C-002-05 | MAJOR | Test / provenans | high | `FrameElementStiffness.java:9-11` | Atıf yapılan testler yok | Rijitlik testleri |
| C-002-06 | MINOR | Doküman | high | `BoundaryCondition.java:4-7`; `package-info.java:2` | Yanıltıcı javadoc | Güncelle |
| C-002-07 | MINOR | Provenans | medium | `EurocodeConcrete.java:30` | g kaynaksız | Kaynak yaz |
| C-003-01 | MAJOR | Test | high | `FastSolverModelBuilder.java:80-131`; `FastSolverController.java:81-122` | Uçtan uca yol testsiz | Builder/denge/FAILED testleri |
| C-003-02 | MINOR | Doğrulama | high | `FrameSolver.java:30-44` | Yinelenen kimlik anlamsız hata | Açık IAE |
| C-003-03 | MINOR | Sayısal | medium | `FrameTransformation.java:29-33` | Eksen 90° dönebilir | Açı toleransı / beta |
| C-004-01 | MAJOR | Doğrulama / güvenlik | high | `TerrainController.java:56-71`; `XyzTerrainParser.java:29-49` | Bozuk arazi gerçek veri gibi | Birim parametresi, BOM, `isFinite`, uyarı |
| C-004-02 | MINOR | Test | high | `TerrainBinaryWriterTest.java:10-22` | Hassasiyet iddiası kanıtsız | Kesirli ofset testi |
| C-004-03 | MINOR | Test | high | LandXml/Terrain controller'ları | Multipart/hata yolları testsiz | MockMvc testleri |
| C-004-04 | MINOR | Provenans | high | `DesignSpace.java:25-26`; `KernelStateRequest.java:45` | Belge/kod çelişkisi | Javadoc + limit grubu |
| C-005-01 | MAJOR | Domain modeli (R5) | high | `Bridge.java:8`; `Deck.java:4` | Geçersiz köprü 200 | Kurucu değişmezleri |
| C-005-02 | MAJOR | Kaynak | high | `AlternativeGenerator.java:75-79` | Bitmeyen döngü, thread tükenmesi | `long` + limit |
| C-005-03 | MAJOR | Mühendislik güvenliği | high | `TrafficLoadsService.java:28-45`; `TrafficLoadsController.java:41-55` | Eksik LM1 "resolved"; istemci provenansı | `laneCount` ve satır doğrulaması |
| C-005-04 | MINOR | Kullanılmayan kod | medium | `TerrainController.java:79-82` | Büyük JSON, kopya yol | Kaldır/belgele |
| C-005-05 | MINOR | Test | high | `ConcreteMaterialControllerTest.java:19-22` | Tautolojik test | Referans değerler |
| C-006-01 | MAJOR | Kaynak / doğruluk | high | `BridgeLayoutEngine.java:46-48,109-111`; `AlternativeGenerator.java:90-92` | Sonsuz döngü/OOM | İndeks tabanlı adım, `isFinite`, limit |
| C-006-02 | MAJOR | Doğrulama | high | `BridgeSite.java:14`; `NoPierZone.java:20`; `BridgeLayoutEngine.java:118-134` | NaN "düzen yok"/yasak bölge devre dışı | Compact constructor kontrolleri |
| C-006-03 | MINOR | Kapsülleme | high | `bridge-core/.../Project.java:22-84` | Yetim seçim | `List.copyOf`, `select`, `Clock` |
| C-006-04 | MINOR | Test | high | `BridgeAlternativeTest.java:14-28`; `BridgeLayoutEngineTest.java:38,94` | Riskler testsiz | Sınır testleri |
| C-007-01 | MINOR | Mühendislik güvenliği | high | `AlternativeGenerator.java:58`; `Girder.java:8` | `spacingM=0` uydurma değer | `OptionalDouble`/null |
| C-007-02 | MAJOR | Referans sözleşmesi | medium-high | `LandXmlParser.java:105,141-146`; `LandXmlImportService.java:40-53` | Yanlış CRS güvenilir görünüyor | Ayrı durumlar, karşılaştırma, saklama |
| C-007-03 | MINOR | Sözleşme | high | `generative/package-info.java:2-5`; `BridgeAlternative.java:39` | Deterministik değil | Deterministik kimlik |
| C-007-04 | MINOR | Bağlaşım | high | `CoordinateOrder.java:7`; `LandXmlParser.java:245-251` | Sezgiye aykırı swap | `first/second` |
| C-007-05 | MINOR | Test | high | `AlternativeGeneratorTest.java:35-101` | Sınırlar testsiz | Parametrik testler |
| C-008-01 | MAJOR | Doğruluk | high | `LandXmlParser.java:272-296` | Çoklu profil birleşiyor | Profil başına sonuç |
| C-008-02 | MAJOR | Doğruluk | medium | `LandXmlParser.java:372-378` | Eğri PVI kayboluyor | Eğri metnini PVI oku |
| C-008-03 | MAJOR | Doğrulama | high | `LandXmlParser.java:346-376` | NaN geometri, 500 | `parseFiniteNumber` |
| C-008-04 | MAJOR | Bellek | medium | `LandXmlParser.java:12-16,83-84,166-185` | Tüm yüzeyler bellekte | Sayan inspect modu |
| C-008-05 | MAJOR | Veri doğruluğu | medium | `LandXmlParser.java:184-223` | Gizli alanda kot | `i` özniteliği, boş sınır uyarısı |
| C-008-06 | MINOR | Sunum | high | `LandXmlTerrainMapper.java:68`; `LandXmlParser.java:112-114,241` | Yanıltıcı durum/mesaj | Ayrı tanı listesi |
| C-008-07 | MINOR | Test | high | `LandXmlParserTest.java:22-100` | XXE/bozuk girdi testsiz | Negatif testler |
| C-009-01 | MAJOR | Birim / doğruluk | high | `MidasResultExtractor.java:50-79` | Oturum birimi farklıysa 10³ sapma | Birim/HEAD doğrulaması |
| C-009-02 | MAJOR | Eşzamanlılık | high | `MidasCivilNxAnalysisEngine.java:37,50-78` | Karışık model çözülür | Kilit/tek executor |
| C-009-03 | MINOR | Hata yönetimi | high | `MidasApiClient.java:35,48,57-59` | Uzun analiz yanlış mesajla FAILED | Çağrı başına zaman aşımı |
| C-009-04 | MINOR | Bilgi sızıntısı | high | `MidasApiClient.java:32-34,66-67,90` | Ham gövde mesajda | Kısaltma, `requireNonNull` |
| C-009-05 | MINOR | İzlenebilirlik | high | `RuleEvaluation.java:10-12`; `RuleEngine.java:29-36` | Gerekçesiz ret, 500 | Kodlu sonuç |
| C-009-06 | MINOR | Build | high/medium | `backend/pom.xml:45-91` | Plugin sürümü sabit değil | Sürüm sabitle |
| C-009-07 | MINOR | Test | high | midas-adapter testleri | İstemci/birim testsiz | Testler |
| C-010-01 | MAJOR | Veri doğruluğu | high | `TerrainImportService.java:26-44` | Çelişen kotlar sessizce eleniyor | `TerrainSource` + uyarı |
| C-010-02 | MINOR | Sözleşme | high/medium | `TerrainImportService.java:84-90`; `TerrainStatus.java:3-8` | Üçgensiz model IMPORTED | Ret/`REVIEW_REQUIRED` |
| C-010-03 | MINOR | Doğrulama | high | `TerrainQueryService.java:42-48` | NaN kot döner | `isFinite` |
| C-010-04 | MINOR | Test | high | `TerrainImportServiceTest.java:17-36` | "Planar" testi düzlemsel değil | Gerçek fixture |
| C-011-01 | MAJOR | Mühendislik güvenliği | high | `SeismicSpectrumService.java:1` (`indexOf`) | Boş zemin sınıfı → A "VALID" | `GroundType` enum |
| C-011-02 | MAJOR | Doğrulama | high | `TrafficLoadsService.java:32`; `NotionalLaneGenerator.java:30`; `CarriagewayInput.java:14-38` | Dar yol uyarısız; OOM | Girdi kontrolleri, uyarı, limit |
| C-011-03 | MINOR | Ölü kod | high | `TemperatureMaterialCase.java:4-11` | Bağlanmamış model | Kaldır/bağla |
| C-011-04 | MINOR | Provenans | medium | `ParameterValue.java:10` | Kaynak/birim izlenemiyor | `sourceRef`, `unit` |
| C-011-05 | MINOR | Test | high | `Lm1DefaultsFactoryTest.java:6,34,43-46` | Değerlerin yarısı testsiz | Tablo testleri |
| C-012-01 | MAJOR | Doğrulama | high | `WindLoadsService.java:6-14`; `UniformTemperatureService.java:12-24` | Anlamsız girdi "VALID" | `isFinite`, `>0` |
| C-012-02 | MAJOR | Provenans | medium | `WindLoadsService.java:11-14`; `WindResult.java:2-3` | Örtük varsayımlar; INVALID'de 0/1.3 | Adlandırılmış sabitler, null, mühendis teyidi |
| C-012-03 | MAJOR | Provenans | high | `UniformTemperatureService.java:25-27` | α "proje girdisi/VALID" görünüyor | Tek kaynak, doğru provenans |
| C-012-04 | MINOR | Hata sözleşmesi | high | `UniformTemperatureService.java:13-24` | Hata/uyarı karışık | `errors`/`warnings` |
| C-012-05 | MINOR | Test | high | `UniformTemperatureServiceTest.java:9-20`; `LaneFactorTest.java:28-36` | Tautoloji, eksik assert | Testler |

## Architecture map
`architecture.md` §1: modül/pom/import tablosu (döngüsüz DAG, 3 kullanılmayan bağımlılık), 12 REST ucu ve çağrı yolları, `api` paket yapısı (düz feature, application/infra yok), paylaşılan durum (in-memory repository'ler, job map), hata/doğrulama akışı. §6 referans kuralı → mevcut durum boşluk tablosu.

## Code quality
`code-quality.md`: 7 kök neden grubu — girdi doğrulama/değişmezler, mühendislik güvenliği/provenans, analiz portu/adapter, kaynak/limitler, katmanlama/sorumluluk, hata/gözlemlenebilirlik, test/mimari koruma — ve referans uyum özeti.

## Hypotheses and optional improvements
Onaylanmış bulgu sayılmaz:
- **Doğrulanıp bulguya dönüşenler:** H-02 → C-008-04; H-05 → C-006-02; H-001-03 → C-008-03; H-002-02 → C-009 ek kanıt (C-002-03 kökü); H-005-03 → C-007-03. **Çürütülenler:** H-03 (mevcut yolda; gizli bağımlılık), H-06 (XXE kod düzeyinde kapalı, regresyon testi yok). **Mekanizması doğrulanıp ölçülmeyen:** H-01 (doğrusal üçgen taraması, 1,09 M üçgen).
- **Açık:** H-04 (üç köprü temsili, ürün kararı); H-001-01/C-003-03 (eleman yönelimi/beta); H-002-01, H-002-03, H-002-04; H-004-01…03; H-005-01, H-006-03, H-011-01, H-012-01 (Jackson `"NaN"` zorlaması — tek bir `@WebMvcTest` ile doğrulanmalı); H-006-01, H-006-02 (köprü sahaya göre yerleşim — mühendis sorusu); H-007-01, H-007-02; H-008-01; H-009-01…04; H-010-01, H-010-02; H-011-02; H-012-02…04.
- **Opsiyonel:** R11 (record yalnızca DTO) KOPRUQ için opsiyonel — ihlal sayılmadı.

## Analyzer evidence
| Command/tool | Version | Scope | Exit code | Output | Interpretation and limits |
| --- | --- | --- | --- | --- | --- |
| Checkstyle/SpotBugs/PMD | — | — | unavailable | — | Yapılandırılmamış; indirme politika dışı |
| `mvn -B test`/`package` | — | — | skipped | — | `mvn` PATH'te yok; build adımı politika dışı |
| Mimari testler | — | — | unavailable | — | Yok (F-17) |
| SonarQube | — | — | unavailable | — | Sunucu/rapor yok |

Ayrıntı: `analyzers/README.md`. Hiçbir test sonucu "geçti" olarak raporlanmadı.

## Coverage
| File | Full / partial / not inspected / excluded | Reason and batch |
| --- | --- | --- |
| 232 metin dosyası (`list-001.txt` … `list-012.txt`) | full | Batch 001–012 kapsam tabloları |
| `target/`, Git ignored | excluded | Envanterde yok |

## Repair priorities
Küçük, sıralı adımlar. Mühendislik değerlerine dokunan her değişiklik önce mühendis onayı ister; hiçbir formül, sınır veya varsayılan uydurulmamalı. Yeni bağımlılıklar (Validation, JPA, PostgreSQL, enforcer) yalnızca onaylı milestone ile.
1. **Sessiz yanlış mühendislik sonuçlarını durdur:** F-01 (eksik alan → 400), F-02 + C-011-01 (bilinmeyen spektrum tipi/zemin sınıfı → INVALID), C-012-01 (NaN/negatif → INVALID), C-002-04 (fck aralığı), C-005-03/C-011-02 (LM1/şerit doğrulaması). Her biri için `@WebMvcTest`/birim testi.
2. **Hizmet dışı bırakma risklerini kapat:** C-005-02, C-006-01 (sonsuz döngüler), F-07 `ComputationLimits` ("mühendislik eşiği değildir" notuyla), F-03/F-11 (sınırsız bellek).
3. **Tek hata sözleşmesi ve gözlemlenebilirlik (R7/R14):** kodlu istisna, `@RestControllerAdvice`, `include-message=always` kaldırılması, correlation filtresi + log (F-04, F-16).
4. **Domain değişmezlerini modele taşı (R5):** C-005-01, C-006-02, C-001-01/05, C-002-02, C-008-03, `Point3D` sonluluk fabrikası.
5. **Çözücü/port sözleşmesi:** C-002-01, C-002-03, F-06, C-009-01/02; desteklenmeyen öğede açık hata.
6. **LandXML/arazi doğruluğu:** C-001-03, C-001-04, C-008-01/02/05, C-007-02, C-004-01, C-010-01 (CRS ve kurb kararları mühendisle).
7. **Katmanlama (R1/R2/R12):** F-05 (builder'ı framework'süz modüle), F-13 (`application` paketleri), F-15 (`CoreConfiguration`), F-18 (CORS), F-12 (kullanılmayan bağımlılıklar).
8. **`NOT_EVALUATED` durumu:** F-10 / C-009-05 (`RuleEvaluation` seviyesinde).
9. **Testler ve mimari koruma:** C-003-01, C-002-05 ve batch test bulguları; F-17 modül başına import izin listesi testi (`backend-reference.md` R3/R4 deseni).
10. **Provenans/dokümantasyon:** F-08, F-09, C-012-02/03, C-011-04, bayat javadoc'lar; roadmap/architecture kayıtları.

## Limits and next steps
- AI destekli kaynak incelemesi; analyzer, derleme veya test çalıştırılmadı. Kalite skoru, borç süresi veya kalite kapısı üretilmedi.
- Jackson'ın NaN/eksik alan davranışı ve performans etkileri (H-01, H-02, H-004-01) çalıştırılarak doğrulanmalı.
- Frontend kapsam dışıydı; frontend–backend sözleşme hipotezleri (H-007-01, H-012-04) frontend review'ı (`docs/reviews/2026-10-11T14-19-35Z/`) ile birlikte değerlendirilmeli.
- Mühendis kararı gerekenler: deprem/rüzgâr/sıcaklık/LM1 provenansı ve onayı, kurb tipleri, CRS politikası, yinelenen arazi noktası politikası, köprünün sahaya göre yerleşim kuralı (H-006-01/02), hesaplama limitlerinin değerleri.
- Düzeltmeler yalnızca ayrı ve açık bir kullanıcı isteğiyle uygulanır.
