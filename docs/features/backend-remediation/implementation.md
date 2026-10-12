# backend-remediation: uygulama raporu (Faz 0a-10)

## Sonuç: COMPLETE (incelenmemiş, yalnızca uygulayıcı kanıtı)
Onaylı kapsam Faz 0a, 0b, 1, 2, 3, 4, 5, 6, 7a, 7b, 7c, 8, 9, 10 tamamlandı. B1-B4, Faz 11, U6 ve U8'e dokunulmadı. Final `clean package`: BUILD SUCCESS, 326 test, 0 failure, 0 error, 1 skipped (`BentleyProductionTerrainTest`). Baseline 123/0/0/1 idi. Frontend dosyası değişmedi; `cd frontend && npm run build` exit 0.

Başlangıçta ve teslimde `python3 .claude/scripts/feature_state.py check 'backend-remediation'` exit 0 verdi. plan/request/state dosyalarına dokunulmadı. Commit, push, branch değişikliği yapılmadı.

## Komutlar ve sonuçlar
Ortam: JDK 21.0.11 Eclipse Adoptium, Maven 3.9.16, `-o` kullanılmadı.
- Her faz sonunda: `"$MVN" -B -f backend/pom.xml package`, hepsi exit 0.
- Final: `"$MVN" -B -f backend/pom.xml clean package`, exit 0, 326/0/0/1. Log'da "Ignoring incompatible plugin version" sayısı 0.
- Odaklı koşular: `-pl <modül> -am test [-Dtest=...]`.
- Mutasyon kontrolü: `synchronized` geçici kaldırıldı, eşzamanlılık testi kırıldı (maxInFlight 6), geri konuldu.
- `cd frontend && npm run build`: exit 0 (yalnızca chunk-size uyarısı).
- Çalıştırılmayan: frontend vitest (kapsam dışı, önceden var olan 26 hata), `BentleyProductionTerrainTest` (isteğe bağlı, skip).

## Faz kaydı (toplam test = önceki + eklenen; skipped hep 1)
| Faz | Toplam | Not |
|---|---|---|
| Baseline | 123 | |
| 0a | 123 | Pom sabitleme. |
| 0b | 155 (+32) | Contract testleri. |
| 1 | 168 | traffic-loads 18→32; api −1 (5 `current_*` çıktı, 4 düzeltilmiş davranış testi girdi). |
| 2 | 185 | `ApiExceptionHandlerTest` 17. |
| 3 | 194 | `CorrelationIdFilterTest` 6, `KopruqAnalysisEngineTest` 2, Midas log testi 1. |
| 4 | 208 | |
| 5 | 221 | |
| 6 | 242 | |
| 7a | 256 | |
| 7b | 274 | |
| 7c | 287 | |
| 8 | 303 | |
| 9 | 312 | |
| 10 | 326 | |

Hata sınıflaması (plan §6):
- **Ortam (1 kez):** Faz 0a'da compiler 3.16.0'a geçince ilk `package`, terrain testCompile'da "bad class file / NoSuchFile" ile düştü (eski `target/` ile artımlı derleme). Aynı komutun yeniden çalıştırılması geçti.
- **Kasıtlı:** her fazda yalnızca aşağıdaki "kasıtlı değişen testler" listesindekiler düştü.
- **Değişiklikten kaynaklanan kalıcı hata:** yok. Faz 8'de Midas engine fixture'ı HEAD yüzünden düştü ve fixture güncellenerek giderildi (aşağıda).

Kasıtlı değişen / kaldırılan testler (isim isim):
- Faz 1: `current_seismicNullSpectrumType_isValid`, `current_seismicMultiCharGroundType_isValid`, `current_windNullCategory_throwsNpe`, `current_windNaNString_isAcceptedAndPropagates`, `current_temperatureNaNString_isValid`. Yerlerine `LoadsContractTest` içinde INVALID doğrulayan testler girdi.
- Faz 2: `current_landxmlImportMalformed_isUnhandledException` yerine `ApiExceptionHandlerTest` içinde 400 INVALID_LANDXML.
- Faz 4: `current_fastSolverMissingSdl_completesSilently` yerine `FastSolverContractTest` içinde 400 + errors[].
- Faz 6: `current_kernelStateMissingFields_becomesZeros` yerine 400 + alan listesi.
- Faz 10: `corsPreflight_fromViteOrigin_isAccepted_otherOriginRejected` içinde `Access-Control-Allow-Methods` beklentisi "POST" → "GET,POST,HEAD". Merkezi politika yapılandırılan metodları listeliyor, eskisi yalnızca istenen metodu yankılıyordu.
- Faz 6 (yalnızca kurulum): DTO'lar boxed olunca `KernelStateControllerTest`, `AlternativeGenerationControllerTest`, `LayoutGenerationControllerTest` içinde int literaller double yapıldı (`210`→`210.0`). Assert'ler değişmedi.
- Faz 10 (yalnızca kurulum): `AlternativeGenerationControllerTest` ve `LayoutGenerationControllerTest` constructor satırları. Assert'ler değişmedi.
- Faz 8 (yalnızca fixture): `MidasCivilNxAnalysisEngineTest` içindeki el yapımı canned yanıtlara canlı MIDAS yanıtındaki `HEAD` eklendi (`MidasResultExtractorTest` fixture'ı zaten içeriyordu). Çünkü extractor artık HEAD'i doğruluyor. Assert'ler değişmedi.

## Değişen dosyalar (amaç)
Pom (yeni bağımlılık yok):
- `backend/pom.xml`: pluginManagement'ta compiler 3.16.0, surefire 3.5.4, resources 3.4.0.
- `backend/analysis-api/pom.xml`: `bridge-core` kaldırıldı.
- `backend/midas-adapter/pom.xml`: `bridge-core` kaldırıldı.
- `backend/api/pom.xml`: `midas-adapter` kaldırıldı.

traffic-loads:
- `SeismicSpectrumService`: aynı tablolar, okunur hâle getirildi, fail-closed.
- `WindLoadsService`, `UniformTemperatureService`, `TrafficLoadsService`, `LaneFactor`, `CarriagewayInput`.

api:
- `config/`: `CoreConfiguration` (yeni), `WebCorsConfiguration` (yeni).
- `error/`: `ApiExceptionHandler`, `ApiErrorResponse`, `FieldViolation`, `InvalidRequestException`, `FieldChecks` (hepsi yeni).
- `observability/CorrelationIdFilter` (yeni).
- `landxml/application/LandXmlImportUseCase` (yeni), `alignment/application/ChainageSampler` (yeni).
- 12 controller (constructor injection, `@CrossOrigin` kaldırıldı).
- `FastSolverRequest`, `FastSolverModelBuilder` (`validate`), `KernelStateRequest`, `LayoutGenerationRequest`, `NoPierZoneRequest`, `AlignmentSampleRequest` (boxed + doğrulama).
- `TerrainImportResponse` (+`status`, `warnings`).
- `application.properties`: `server.error.include-message` silindi, `logging.pattern.level` ve `kopruq.cors.allowed-origins` eklendi. Actuator satırı aynı.

Domain modülleri:
- `analysis-api`: `EurocodeConcrete`, `SolidRectangleSection`, `ElasticLinkElement`, `AnalysisEngine` (javadoc).
- `analysis-engine`: `FrameSolver` (`validate`), `KopruqAnalysisEngine` (log, sonlu sonuç kontrolü, tek seferlik `getResults`).
- `midas-adapter`: `MidasCivilNxAnalysisEngine` (`synchronized submit`, log, tek seferlik `getResults`), `MidasModelBuilder`, `MidasResultExtractor` (HEAD doğrulaması).
- `bridge-core`: `Bridge`, `DesignSpace`.
- `generative-engine`: `AlternativeGenerator`.
- `bridge-layout`: `BridgeLayoutEngine`, `BridgeSite`, `LayoutDesignSpace`.
- `constraints`: `NoPierZone`.
- `alignment`: `VerticalProfile` (sıra/sonluluk değişmezi + `covers`).
- `landxml-import`: `LandXmlParser`, `LandXmlAlignment` (+`skipped`, `staStart`), `LandXmlProfile` (+`unsupportedReasons`), `LandXmlImportService`.
- `terrain`: `XyzTerrainParser`, `TerrainImportService`, `TerrainQueryService`, `TerrainRepository` + `InMemoryTerrainRepository` (`deleteById`), `XyzParseResult` (yeni), `TerrainImportResult` (yeni).

Dokümanlar: `docs/architecture.md`, `docs/roadmap.md` ("BACKEND-REMEDIATION" izi, her faz için girdi, Faz 9'da bağımlılık grafiği yeniden yazıldı, roadmap'e P07 notu).

Yeni test dosyaları (untracked):
- api: `contract/` (`ContractTestSupport`, `EndpointInventoryContractTest`, `LoadsContractTest`, `FastSolverContractTest`, `LandXmlTerrainContractTest`, `LayoutKernelCorsContractTest`, `CurrentDefectsContractTest`); `error/ApiExceptionHandlerTest`; `observability/CorrelationIdFilterTest`; `fastsolver/FastSolverModelBuilderTest`; `architecture/` (`ModuleBoundaryRules`, `ModuleBoundaryTest`, `ControllerLayeringTest`); `landxml/application/LandXmlImportUseCaseTest`; `alignment/application/ChainageSamplerTest`; fixture `src/test/resources/landxml/sample.landxml`.
- Diğer modüller:
  - `traffic-loads`: `SeismicSpectrumServiceTest`, `WindLoadsServiceTest`, `TrafficLoadsServiceValidationTest`.
  - `analysis-engine`: `KopruqAnalysisEngineTest`, `FrameSolverValidationTest`.
  - `midas-adapter`: `MidasAdapterContractTest`.
  - `generative-engine`: `AlternativeGeneratorTerminationTest`.
  - `bridge-layout`: `BridgeLayoutEngineTerminationTest`.
  - `bridge-core`: `BridgeInvariantTest`.
  - `landxml-import`: `LandXmlParserRobustnessTest`, `LandXmlImportServiceGapTest`, `LandXmlProfileFailClosedTest`.
  - `alignment`: `VerticalProfileInvariantTest`.
  - `terrain`: `TerrainDataIntegrityTest`.

Eklenen testlerin dışında mevcut test dosyası ek içerik aldı: `UniformTemperatureServiceTest`, `EurocodeConcreteTest`, `MidasCivilNxAnalysisEngineTest` (log testi + HEAD fixture).

## Kabul kriterleri
| AC | Kanıt | Durum |
|---|---|---|
| AC1 | Pom'da compiler 3.16.0 ve surefire 3.5.4 (resources 3.4.0, baseline log'dan). Final `clean package` BUILD SUCCESS, 0 F/E, 1 skip, "Ignoring incompatible" sayısı 0. | Met |
| AC2 | `EndpointInventoryContractTest` 21 uç; mutlu yol snapshot'ları (fast-solver 1e-9, deprem, rüzgâr, sıcaklık, LM1, LandXML, terrain, alignment, layout, kernel, CORS); `CurrentDefectsContractTest`. | Met |
| AC3 | `SeismicSpectrumServiceTest` (10 geçerli kombinasyon tablo snapshot'ı + INVALID durumları), `LoadsContractTest`. | Met |
| AC4 | `WindLoadsServiceTest`, `LoadsContractTest.wind_invalidInputs_are200Invalid` (null kategori NPE→200 INVALID; `ze<0`, `deckWidth≤0`, "NaN"). | Met |
| AC5 | `UniformTemperatureServiceTest`, `LoadsContractTest.temperature_nonFiniteInput_...`. | Met |
| AC6 | `ApiExceptionHandlerTest`: tüm 4xx/5xx gövdeleri 8 anahtarı taşıyor; IAE ve `ResponseStatusException` mesajları aynen; 5xx genel mesaj; `include-message` silindi; actuator değişmedi (`actuatorHealth_isUnchanged`). | Met |
| AC7 | Bozuk LandXML `/inspect` ve `/import` 400 INVALID_LANDXML; alternatives/layout/fast-solver IAE 400; `unexpectedException_...` 500 genel mesaj. | Met |
| AC8 | `CorrelationIdFilterTest`: üretilen/yankılanan/değiştirilen id, hata gövdesi = header, 5xx log'unda stack trace + `[id]`; motor FAILED log testleri (Kopruq + Midas). | Met |
| AC9 | `FastSolverModelBuilderTest`, `FastSolverContractTest`: eksik/null/NaN/≤0 → 400 + `errors[].field`; negatif sdl serbest; örnek 200 COMPLETED. | Met |
| AC10 | `EurocodeConcreteTest` (fck ≤0/NaN/±∞ IAE, aralık sınırı yok); `/api/materials/concrete` snapshot ve `ConcreteMaterialControllerTest` değişmedi. | Met |
| AC11 | `KopruqAnalysisEngineTest.nonFiniteSolution_isFailed_notCompleted`. | Met |
| AC12 | `TrafficLoadsServiceValidationTest`, `LoadsContractTest`; mevcut 4 `TrafficLoadsServiceTest` değişmedi. | Met |
| AC13 | `AlternativeGeneratorTerminationTest`, `BridgeLayoutEngineTerminationTest` (`assertTimeoutPreemptively`); mevcut generator (6) ve layout (7) testleri aynen geçiyor. | Met |
| AC14 | `BridgeInvariantTest`, `AlternativeGeneratorTerminationTest.nonFinite...`, `BridgeLayoutEngineTerminationTest.nonFiniteRecords...`; REST üzerinden 400. | Met |
| AC15 | `LayoutKernelCorsContractTest` (kernel, alternatives, layout, alignment-sample eksik alan → 400 + alan listesi). | Met |
| AC16 | `LandXmlParserRobustnessTest`, `LandXmlImportServiceGapTest`, contract testleri; fixture sonuçları aynı. | Met |
| AC17 | `LandXmlProfileFailClosedTest`, `VerticalProfileInvariantTest`, contract: çoklu profil, desteklenmeyen kurb, `staStart≠0`, PVI sırası → `hasProfile=false` + kodlu uyarı; PVI dışında `designElevationM = null`; fixture profil değerleri aynı. | Met |
| AC18 | `TerrainDataIntegrityTest` + contract: BOM'lu ilk satır içe aktarılıyor; NaN/∞ satır atlanıp sayılıyor; çelişen z, <3 nokta, 0 üçgen, >3 sütun → REVIEW_REQUIRED; yanıta `status`/`warnings` eklendi; `/elevation?x=NaN` → null. | Met |
| AC19 | `FrameSolverValidationTest`, `MidasAdapterContractTest`: bilinmeyen mesnet, yinelenen id, çok/bilinmeyen yük durumu FAILED; `getResults` sonrası iki motorun job map'i boş; Midas link/yayılı yük ve HEAD uyuşmazlığı FAILED; eşzamanlı submit sıraya giriyor; FastSolver mutlu yolu aynı. | Met |
| AC20 | `ModuleBoundaryTest` geçiyor ve sentetik ihlalle başarısız olduğu testlerle gösterildi (framework/jakarta/lombok importu, MIDAS importu, bildirilmemiş modül, kullanılmayan bağımlılık, pom'da Spring). Üç kenar pom'lardan çıktı. Gerçek ağaçta kural, öncesinde bu üç kenarı yakaladı. `docs/architecture.md` grafiği yeniden yazıldı, roadmap'e P07 notu eklendi. | Met |
| AC21 | api main'de `@CrossOrigin` annotation'ı ve `new <Service>` alanı yok (`ControllerLayeringTest` + grep). 5173 origin'i preflight ve simple request kabul ediyor; başka origin ve metod 403. `LandXmlImportUseCaseTest` ikinci yazım hatasında terrain'in silindiğini gösteriyor. `ChainageSamplerTest` eski döngülerin kopyalarıyla birebir (bit-identical) örnekleme çıktısını doğruluyor. | Met |
| AC22 | Her fazda architecture.md ve roadmap.md girdisi var. Pom diff'inde yeni bağımlılık yok, yalnızca 3 plugin sürümü ve 3 kaldırma. Endpoint envanteri testi değişmeden geçiyor. B1-B4 ve Faz 11 dosyalarına dokunulmadı. | Met |

## Sapmalar, sınırlamalar, dikkat çekilecekler
1. **Ek kullanılmayan bağımlılık:** `generative-engine → rules-engine` de hiçbir import taşımıyor ama planın onayladığı üç kaldırma arasında değil. Kaldırılmadı; `ModuleBoundaryTest.KNOWN_UNUSED_EDGES` içinde açıklamalı allow-list'e alındı. Mühendis/koordinatör karar versin: üretici kural motorunu kendisi mi çağıracak (P04), yoksa kenar mı silinecek?
2. **Plan dışı kural:** "Kullanılmayan iç bağımlılık" kuralı (ve `ControllerLayeringTest`) plana göre eklenen ek korumalardır; yeni bağımlılık gerektirmez.
3. **Plugin sabitleme:** Plan gereği compiler 3.16.0 pinlendi (baseline goal satırları 3.15.0 çalıştırmıştı, `Selected plugin ... 3.16.0` satırı 42'den). Resources 3.4.0 baseline'dan. jar 3.5.0, clean 3.2.0 ve install baseline `test` komutunda görünmediği için sabitlenmedi (tahmin edilmedi).
4. **Mesaj metni:** Rüzgârda null alan/kapsam dışı girdi için `WindResult.missing` metni genişletildi ("... required, finite and positive (ze not negative)"). Frontend bu metni kullanmıyor (grep). Kategori hatası metni ("invalid terrain category") aynı.
5. **Midas HEAD:** HEAD yoksa da reddediliyor (fail-closed). Bu yüzden el yapımı engine fixture'ına canlı HEAD eklendi. Birim doğrulaması hâlâ yok (plan gereği ertelendi).
6. **`getResults` tek seferlik:** Port semantiği değişti, javadoc'ta belirtildi. Tek tüketici `FastSolverController`, bir kez çağırıyor.
7. **Kayıt şekilleri:** `LandXmlAlignment` (`skipped`, `staStart`) ve `LandXmlProfile` (`unsupportedReasons`) yeni bileşenler aldı; eski kurucu imzaları korunup mevcut testler değişmedi.
8. **CircCurve:** İçinde alt eleman olan `<CircCurve>` `getElementText` nedeniyle parse hatası (400) verir. Beklenen LandXML biçimi metin içeriğidir; alt eleman durumu ele alınmadı.
9. **FrameSolver:** `uniformLoads` içinde bilinmeyen eleman id'si hâlâ sessizce yok sayılıyor (plan kapsamı dışı).
10. **Satır sonları:** `docs/*.md` CRLF olarak korundu. Git `autocrlf` uyarıları normal.
11. **Uygulanmayanlar:** B1-B4, Faz 11, U6 (actuator), U8 (örnekleme birleştirme). Mühendislik değerleri hiçbir yerde seçilmedi/değiştirilmedi. Kalan iş yok (bloklu paketler hariç).
12. **Geri alma:** commit yapılmadı. Faz bazlı geri alma, yukarıdaki dosya listesi ve architecture/roadmap girdileri üzerinden elle yapılır; commit önerisi: her faz ayrı commit.

Çıktı yolları: tüm değişiklikler `C:\Users\cemha\repos\KOPRUQ\backend\...` ve `C:\Users\cemha\repos\KOPRUQ\docs\architecture.md`, `...\docs\roadmap.md` altında. `implementation.md` yazılmadı (koordinatörün işi).

---

## Koordinatör doğrulaması (2026-10-12)

Bu bölüm koordinatörün bağımsız kontrolleridir; bir kod incelemesi (review) değildir.

- `python3 .claude/scripts/feature_state.py check 'backend-remediation'` → exit 0 (onaylı plan hash'i `30e5fc73…a513` eşleşiyor).
- `"$MVN" -B -f backend/pom.xml clean package` (JDK 21.0.11, Maven 3.9.16) → exit 0, BUILD SUCCESS, **326 test, 0 failure, 0 error, 1 skipped** (`BentleyProductionTerrainTest`). "Ignoring incompatible plugin version" uyarısı: 0. Baseline 123/0/0/1 idi; değişiklikten kaynaklanan başarısızlık yok.
- Pom diff: yalnızca `maven-compiler-plugin` 3.16.0, `maven-surefire-plugin` 3.5.4, `maven-resources-plugin` 3.4.0 sabitlemesi ve üç bağımlılık kaldırması (`analysis-api→bridge-core`, `midas-adapter→bridge-core`, `api→midas-adapter`). Yeni bağımlılık yok.
- `grep "@CrossOrigin" backend/api/src/main` → yalnızca `WebCorsConfiguration.java:10` javadoc'unda metin olarak geçiyor; annotation kalmadı.
- `api` dışındaki modüllerin `src/main` dosyalarında `org.springframework`/`jakarta.` yok.
- `git status frontend` → değişiklik yok.
- Mühendislik değerleri: `SeismicSpectrumService`, `WindLoadsService`, `UniformTemperatureService`, `Lm1DefaultsFactory` dosyalarındaki sayısal literal kümeleri HEAD (`e3a2693`) ile birebir aynı.
- Değişen dosyalar: 64 izlenen dosya (+1468/−277) ve yeni untracked dosyalar (api `config/`, `error/`, `observability/`, `alignment/application/`, `landxml/application/`; terrain `TerrainImportResult`, `XyzParseResult`; yeni test sınıfları). Commit yapılmadı.
- Frontend `npm run build`'in exit 0 olduğu uygulayıcı tarafından raporlandı; koordinatör tekrar çalıştırmadı (frontend dosyası değişmedi).

Kullanıcı kararı bekleyen açık nokta: `generative-engine → rules-engine` kullanılmayan bağımlılığı `ModuleBoundaryTest.KNOWN_UNUSED_EDGES` allow-list'inde (sapma 1).
