# Plan: backend-modular-monolith

Planlayıcı çıktısı. Kod değiştirilmedi, komut çalıştırılmadı. Aşağıda "Doğrulandı" diye işaretlenen bilgiler depodaki dosyalar okunarak teyit edildi. "Varsayım" olarak işaretlenenler teyit edilmedi. Koordinatörün sağladığı bilgiler (HEAD `a29513d`, baseline 367/0/0/1, build ortamı) "koordinatör bilgisi" olarak geçer.

---

## 1. Amaç ve kapsam dışı

### Amaç
- `backend/` altındaki 17 Maven modülünü tek bir Maven modülünde birleştirmek: `backend/pom.xml`, packaging `jar`, Spring Boot uygulaması.
- Paket yapısı `docs/architecture/backend-reference.md` hedef ağacıyla aynı olacak:
  - `com.kopruq.<domain>/{api,application,domain,model,enums,infra}`
  - `com.kopruq.shared/{config,exception,quantity,validation}`
  - `com.kopruq.KopruqApplication`
- Mevcut her sınıf ve test bir hedef pakete eşlenecek (§3.4, §3.5). Taşımalar `git mv` ile yapılacak.
- İş kuralı taşıyan tipler `model`'e, birden çok modeli kullanan framework'süz hesaplar `domain`'e gidecek (R5). Port'lar `application`'a, port uygulamaları `infra`'ya gidecek (R6).
- `ModuleBoundaryTest`, `ModuleBoundaryRules`, `ControllerLayeringTest` ve `ApiLayeringTest` kaldırılacak. Yerlerine referanstaki `ArchitectureTests` deseninde, paket bazlı ve import izin listeli testler gelecek (R3/R4). Eski testlerin verdiği her koruma yeni testlerde bir karşılık bulacak (§3.9, tablo B).
- `CLAUDE.md` "Build & test" bölümündeki jar komutu güncellenecek. Aynı komut `README.md` ve `start-dev.bat` içinde de geçiyor; onlar da güncellenecek.

### Kapsam dışı (açıkça)
- Kalıcılık yok: JPA, PostgreSQL, Compose, H2.
- Yeni REST endpoint, yeni harici bağımlılık, yeni groupId yok.
- Bean Validation (`spring-boot-starter-validation`) eklenmeyecek.
- Mühendislik değerleri değişmeyecek: sayısal literal, formül, varsayılan.
- Frontend'e dokunulmayacak. Frontend'deki 26 eski vitest hatası kapsam dışı.
- Davranış refactor'ü yok: iş kuralını servisten modele taşımak gibi kod içeriği değişiklikleri yapılmayacak. Bu feature yalnızca yer değiştirir.
- R11 (record yalnızca DTO) uygulanmayacak.
- Java ve Spring Boot sürümleri değişmeyecek (21 / 3.5.16).
- `docs/architecture.md` içindeki tarihsel bölümler ("P01 domain model (`backend/bridge-core`)" gibi) yeniden yazılmayacak. Yalnızca güncel yapı bölümleri ve yeni track girdileri değişecek.

---

## 2. Mevcut mimari (kanıtlarla)

### Build
`backend/pom.xml`:
- `artifactId kopruq-backend`, `packaging pom`, 17 `<module>`.
- `dependencyManagement`: `spring-boot-dependencies` 3.5.16 ve `junit-bom` 5.11.3, ikisi de import scope.
- Ortak test bağımlılığı: `junit-jupiter`.
- `pluginManagement`:
  - compiler 3.16.0, `<parameters>true</parameters>`. Jackson record'ları kurucu parametre adıyla bunun sayesinde okuyor.
  - surefire 3.5.4, resources 3.4.0.

`backend/api/pom.xml`:
- 15 `com.kopruq` modül bağımlılığı.
- `spring-boot-starter-web`, `spring-boot-starter-actuator`, `spring-boot-starter-test` (test).
- `spring-boot-maven-plugin` repackage. Jar adı `api-0.1.0-SNAPSHOT.jar`.

Harici bağımlılıklar (Doğrulandı):
- `backend/terrain/pom.xml` → `org.locationtech.jts:jts-core:1.20.0`
- `backend/midas-adapter/pom.xml` → `com.fasterxml.jackson.core:jackson-databind` (BOM yönetiyor)
- Başka harici bağımlılık yok.

Modül klasörlerinde `pom.xml` ve `src/` dışında izlenen dosya yok (Doğrulandı, glob `backend/*/*`).

### Paket kökleri: her modülün kendi kökü var, kökler çakışmıyor (Doğrulandı)

| Modül | Kök |
|---|---|
| spatial-core | `spatialcore` |
| alignment | `alignment` |
| terrain | `terrain` |
| landxml-import | `landxml` |
| traffic-loads | `trafficloads` |
| environmental-loads | `environmentalloads` |
| materials | `materials` |
| constraints | `constraints` |
| bridge-layout | `bridgelayout` |
| bridge-core | `bridgecore` |
| rules-engine | `rules` |
| generative-engine | `generative` |
| analysis-api | `analysis` |
| analysis-engine | `analysisengine` |
| model-builder | `modelbuilder` |
| midas-adapter | `midas` |
| api | `api` |

Kökler `ModuleBoundaryTest.everyModule_respectsTheBoundaries` tarafından benzersiz tutuluyor. Bu yüzden ilk fazda `src/main/java/com/kopruq/<kök>` dizinlerini tek ağaca taşırken yol çakışması olmaz.

### Dosya sayıları (Doğrulandı)
- Toplam `src/main`: 220 dosya. 219 Java dosyası ve `backend/api/src/main/resources/application.properties`.
- `src/test`: 77 Java dosyası ve 2 kaynak dosyası:
  - `backend/landxml-import/src/test/resources/sample.landxml` (classpath `/sample.landxml`)
  - `backend/api/src/test/resources/landxml/sample.landxml` (classpath `/landxml/sample.landxml`)
- İki test kaynağının yolları farklı, çakışma yok.

### Spring
- Giriş sınıfı: `backend/api/src/main/java/com/kopruq/api/KopruqApiApplication.java` (`@SpringBootApplication`). Component scan tabanı `com.kopruq.api`. Depodaki tek `main` metodu bu.
- Spring stereotype'ları yalnızca `api` modülünde var:
  - 12 `@RestController`
  - `CorrelationIdFilter` (`@Component`)
  - `ApiExceptionHandler` (`@RestControllerAdvice`)
  - `CoreConfiguration`, `SharedRepositoriesConfig`, `WebCorsConfiguration` (`@Configuration`)
- Test tarafında `@RestController` olan iç sınıflar var: `CorrelationIdFilterTest.Boom`, `ApiExceptionHandlerTest.Thrower`. Bunlar yalnızca kendi `@Import`'larıyla bağlanıyor.
- Domain sınıflarında `@Component` yok. `CoreConfiguration` ve `SharedRepositoriesConfig` bunları `@Bean` olarak kuruyor (R12).
- `FastSolverService` port tipi `AnalysisEngine` alıyor (`api/fastsolver/application/FastSolverService.java:3,24`). `CoreConfiguration:77` buna `KopruqAnalysisEngine` veriyor.

### `application.properties`
- `spring.application.name=kopruq-api`, `server.port=8080`
- `management.endpoints.web.exposure.include=health,info`
- multipart 200MB, `spring.mvc.async.request-timeout=120000`
- `logging.pattern.level` (correlationId)
- `kopruq.cors.allowed-origins`

### Mimari testler (Doğrulandı)
`backend/api/src/test/java/com/kopruq/api/architecture/` altında:
- `ModuleBoundaryTest`: 11 test.
  - pom grafiğini `ALLOWED_INTERNAL_DEPENDENCIES` ile sabitliyor.
  - Spring, jakarta ve lombok yalnızca `api`'de.
  - `com.kopruq.midas` yalnızca `midas-adapter` ve `api`'de.
  - Kullanılmayan iç bağımlılık yasak.
  - Kurallar sentetik testlerle sınanıyor.
- `ModuleBoundaryRules`: saf fonksiyonlar.
- `ControllerLayeringTest`: 3 test.
  - `@CrossOrigin` yok.
  - Controller'da `new XService(` alanı yok.
  - Tam 12 controller.
- `ApiLayeringTest`: 5 test.
  - `@RestController` yalnızca `com.kopruq.api.<feature>.api`'de.
  - `application` Spring, jakarta ve `<x>.api` import etmiyor.
  - İzinli alt paketler `api`, `application`, `infra`.

Bu 19 test çıkarılınca **348 mimari dışı test** kalıyor (367 − 19). Fazlar arası temel ölçü bu sayı.

### Paket taşımayı etkileyen kısıtlar (Doğrulandı)

**Package-private kümeler:**
- `analysisengine`: `Vector3`, `UniformLoadDistribution`, `RectangularSectionProperties`, `MatrixUtils`, `FrameTransformation`, `FrameSolver`, `FrameElementStiffness`, `ElasticLinkStiffness`, `DenseLinearSolver`.
- `terrain`: `XyzTerrainParser`, `XyzParseResult`. Bunları `TerrainImportService`, `XyzTerrainParserTest` ve `TerrainDataIntegrityTest` kullanıyor.
- `midas`: `MidasVocabulary`, ayrıca `MidasCivilNxAnalysisEngine`'in package-private kurucusu.
- api tarafında package-private üyeler:
  - `KernelStateRequest.validate()`
  - `NoPierZoneRequest.collectViolations` (`LayoutGenerationRequest:56`)
  - `FastSolverModelBuilder.validate`
  - `ApiExceptionHandler.GENERIC_INTERNAL_MESSAGE`
- Başka package-private alan veya metot bulunmadı (grep ile).

**Sealed hiyerarşiler** (adsız modülde permit edilen alt tipler aynı pakette olmak zorunda):
- `HorizontalElement permits StraightElement, CurveElement`
- `AnalysisSection permits SolidRectangleSection, ISection, SolidCircularSection`
- `LandXmlGeometryElement permits LandXmlLine, LandXmlCurve`

**Wildcard import'lar:**
- `LandXmlInspectResponse.java:2` (`com.kopruq.landxml.*`)
- `LandXmlTerrainMapper.java:5` (`com.kopruq.terrain.*`)
- testlerde: `BentleyTerrainImportTest`, `TerrainBinaryWriterTest`, `BentleyProductionTerrainTest`

**Import satırı dışında kalan FQN kullanımları (kod içinde):**
- `TerrainController.java:94-95`
- `LandXmlController.java:74`
- `LandXmlImportSummaryResponse.java:16-17`
- `LayoutGenerationController.java:33`
- testler: `LandXmlImportUseCaseTest.java:66-74`, `MidasModelBuilderTest.java:83`

**Paket adına bağlı test string'leri:**
- `EndpointInventoryContractTest.java:29`: `startsWith("com.kopruq.api.")`
- `CorrelationIdFilterTest.java:98`: `"at com.kopruq.api.observability.CorrelationIdFilterTest$Boom.boom"`

**Jar yolu geçen yerler:**
- `CLAUDE.md:123`
- `README.md:70`
- `start-dev.bat:15` (`api\target\api-0.1.0-SNAPSHOT.jar`)
- `frontend/.../AlignmentOverlay.tsx:12` yorumunda da geçiyor. Frontend kapsam dışı, dokunulmayacak.

**Diğer:** CI yok (`.github` yalnızca `modernize` script'leri içeriyor). `.gitignore` `target/` satırını içeriyor.

---

## 3. Önerilen tasarım

### 3.1 Hedef ağaç
```
backend/
  pom.xml                                  tek modül, packaging jar, artifactId kopruq-backend
  src/main/resources/application.properties   (değişmez, %100 rename)
  src/main/java/com/kopruq/
    KopruqApplication.java
    shared/
      config/      CoreConfiguration, SharedRepositoriesConfig, WebCorsConfiguration, CorrelationIdFilter
      exception/   ApiExceptionHandler, ApiErrorResponse, FieldViolation, InvalidRequestException
      validation/  FieldChecks
    geometry/      model/
    alignment/     api/ application/ domain/ model/
    terrain/       api/ application/ domain/ model/ enums/ infra/
    landxml/       api/ application/ domain/ model/ enums/ infra/
    loads/         api/ application/ domain/ model/ enums/
    materials/     api/ domain/
    layout/        api/ domain/ model/ enums/
    bridge/        api/ model/ enums/
    rules/         domain/ model/
    generative/    api/ domain/ model/
    analysis/      api/ application/ domain/ model/ enums/ infra/nativeengine/ infra/midas/
  src/test/java/com/kopruq/
    architecture/  ArchitectureRules, ArchitectureTests
    contract/      7 contract test sınıfı
    <domain>/<katman>/...   her test, konusunun paketinde
  src/test/resources/sample.landxml, src/test/resources/landxml/sample.landxml
```

- `shared/quantity` açılmaz, çünkü taşınacak sınıf yok ("ihtiyaç olmayan alt paket açılmaz").
- Domain kök paketlerinde (`com.kopruq.<domain>`) yalnızca `package-info.java` bulunabilir.
- `native` Java anahtar sözcüğü olduğu için paket adı `nativeengine`.

### 3.2 Domain listesi ve gerekçesi

| Domain | Kaynak | Gerekçe |
|---|---|---|
| `geometry` | spatial-core | Referansta bir `geometry` feature'ı var (R1). `Point3D` bir quantity değil. `shared` alt paketleri CLAUDE.md'de `config/exception/quantity/validation` ile sınırlı, bu yüzden `shared.geometry` uygun değil. |
| `alignment` | alignment + api `alignment` | Mevcut sınır. |
| `terrain` | terrain + api `terrain` | Mevcut sınır. JTS yalnızca burada. |
| `landxml` | landxml-import + api `landxml` | Anti-corruption katmanı, ayrı domain olarak kalıyor. |
| `loads` | traffic-loads + environmental-loads + api `trafficloads` ve `environmentalloads` | İstekte "loads" adı geçiyor. İki tarafın birbirine bağımlılığı yok, sınıf adları çakışmıyor. |
| `materials` | materials + api `materials` | Mevcut sınır. |
| `layout` | bridge-layout + constraints + api `layout` | `constraints`'in tek tüketicisi layout. Tek record'luk bir domain açmak gereksiz. |
| `bridge` | bridge-core + api `kernel` | Kernel state endpoint'i `Bridge` ve `DesignSpace` üzerine kurulu. |
| `rules` | rules-engine | Mevcut sınır. |
| `generative` | generative-engine + api `alternatives` | Alternatif üretimi. |
| `analysis` | analysis-api + model-builder + analysis-engine + midas-adapter + api `fastsolver` | CLAUDE.md: "Analysis port … solver adapters in its `infra`". R6: port `application`'da, uygulama `infra`'da. |

`api`, `shared`, `architecture` ve `contract` adları domain olarak kullanılamaz (rezerve).

### 3.3 Katman yerleştirme kuralları
1. **`model`:** durum taşıyan record'lar, class'lar, sealed interface'ler ve invariant'ları. Kompakt kurucudaki doğrulamalar dahil (R5). Örnek: `Project`, `Alignment`, `TerrainModel`.
2. **`enums`:** domain enum'ları.
3. **`domain`:** durumsuz, framework'süz hesap, servis, üretici, eşleyici ve katalog sınıfları. Örnekler: `RuleEngine`, `BridgeLayoutEngine`, `TerrainImportService`, `EurocodeConcrete`.
   - İstisna: `XyzParseResult` bir record ama `XyzTerrainParser` ile package-private olarak bağlı. Bu yüzden `domain`'de kalır.
   - `EngineeringRule` kural SPI'ı olduğu için `RuleEngine` ile birlikte `domain`'e gider.
4. **`application`:** port ve repository arayüzleri (`TerrainRepository`, `LandXmlImportRepository`, `AnalysisEngine`), mevcut use-case servisleri ve bunların sonuç record'ları.
5. **`infra`:** port uygulamaları (`InMemoryTerrainRepository`, `InMemoryLandXmlImportRepository`) ve solver adapter'ları (`infra.nativeengine`, `infra.midas`).
6. **`api`:** controller'lar, istek/yanıt record'ları, mapper ve yazıcılar (`FastSolverModelBuilder`, `TerrainBinaryWriter`).
7. **`shared`:**
   - `config`: composition root, CORS ve gözlemlenebilirlik. `CorrelationIdFilter` buraya gelir; uyarlama tablosu R14 "shared/config" diyor.
   - `exception`: tek hata sözleşmesi (R7). `ApiExceptionHandler` referansta da `shared/exception`'da duruyor.
   - `validation`: `FieldChecks`. Referanstaki `Checks` karşılığı.

### 3.4 Main eşleme tablosu
Eski önek: `backend/<modül>/src/main/java/com/kopruq/<kök>/`. Yeni önek: `backend/src/main/java/com/kopruq/`.

| Eski | Sınıflar | Yeni |
|---|---|---|
| api (kök) | `KopruqApiApplication` | `KopruqApplication.java` (sınıf adı değişir, E6) |
| api/error | `ApiErrorResponse`, `ApiExceptionHandler`, `FieldViolation`, `InvalidRequestException` | `shared/exception/` |
| api/error | `FieldChecks` | `shared/validation/` |
| api/config | `CoreConfiguration`, `SharedRepositoriesConfig`, `WebCorsConfiguration` | `shared/config/` |
| api/observability | `CorrelationIdFilter` | `shared/config/` |
| spatialcore | `CoordinateSystem`, `Point3D` | `geometry/model/` |
| alignment | `Alignment`, `ChainagePosition`, `CurveElement`, `HorizontalElement`, `StraightElement`, `Pvi`, `VerticalProfile` | `alignment/model/` |
| alignment | `ChainageSampler` | `alignment/domain/` |
| api/alignment/api | `AlignmentController`, `AlignmentSampleRequest`, `AlignmentSamplePoint` | `alignment/api/` |
| api/alignment/application | `AlignmentSample`, `AlignmentSamplingService` | `alignment/application/` |
| terrain | `TerrainBoundary`, `TerrainBreakline`, `TerrainSource`, `TerrainTriangle`, `TerrainModel`, `TerrainImportResult` | `terrain/model/` |
| terrain | `TerrainStatus` | `terrain/enums/` |
| terrain | `TerrainImportService`, `TerrainQueryService`, `XyzTerrainParser`, `XyzParseResult`, `LocalCoordinates` | `terrain/domain/` |
| terrain | `TerrainRepository` | `terrain/application/` |
| terrain | `InMemoryTerrainRepository` | `terrain/infra/` |
| api/terrain/api | `TerrainController`, `TerrainImportResponse`, `TerrainElevationResponse`, `TerrainMeshResponse`, `TerrainBinaryWriter` | `terrain/api/` |
| api/terrain/application | `TerrainImportUseCase`, `TerrainReadService` | `terrain/application/` |
| landxml | `LandXmlDocument`, `LandXmlSurface`, `LandXmlPoint`, `LandXmlFace`, `LandXmlBoundary`, `LandXmlBreakline`, `LandXmlAlignment`, `LandXmlGeometryElement`, `LandXmlLine`, `LandXmlCurve`, `LandXmlProfile`, `LandXmlPvi`, `LandXmlUnits`, `LandXmlImportResult` | `landxml/model/` |
| landxml | `CoordinateOrder`, `CrsStatus` | `landxml/enums/` |
| landxml | `LandXmlParser`, `LandXmlParseException`, `LandXmlAlignmentMapper`, `LandXmlProfileMapper`, `LandXmlTerrainMapper`, `LandXmlImportService` | `landxml/domain/` |
| landxml | `LandXmlImportRepository` | `landxml/application/` |
| landxml | `InMemoryLandXmlImportRepository` | `landxml/infra/` |
| api/landxml/api | `LandXmlController`, `LandXmlImportSummaryResponse`, `LandXmlInspectResponse`, `LongitudinalProfilePoint` | `landxml/api/` |
| api/landxml/application | `LandXmlImportQueries`, `LandXmlImportUseCase`, `LongitudinalProfileService`, `ProfileSample` | `landxml/application/` |
| trafficloads | `Lm1Parameters`, `NotionalLane`, `NotionalLaneResult`, `ParameterValue`, `TrafficLoadGroup`, `TrafficLoadGroupComponent`, `TrafficValidationResult`, `LaneFactor`, `CarriagewayInput` | `loads/model/` |
| trafficloads | `ParameterProvenance` | `loads/enums/` |
| trafficloads | `Lm1DefaultsFactory`, `NotionalLaneGenerator`, `TrafficLoadGroupCatalog`, `TrafficLoadsService` | `loads/domain/` |
| environmentalloads | `WindRequest`, `WindResult`, `SeismicSpectrumRequest`, `SeismicSpectrumResult`, `UniformTemperatureRequest`, `UniformTemperatureResult`, `TemperatureMaterialCase` | `loads/model/` |
| environmentalloads | `WindLoadsService`, `SeismicSpectrumService`, `UniformTemperatureService` | `loads/domain/` |
| api/trafficloads/api | `TrafficLoadsController`, `TrafficResolveRequest`, `TrafficResolveResponse` | `loads/api/` |
| api/trafficloads/application | `TrafficResolution`, `TrafficResolveUseCase` | `loads/application/` |
| api/environmentalloads/api | `SeismicSpectrumController`, `UniformTemperatureController`, `WindLoadsController` | `loads/api/` |
| materials | `EurocodeConcrete`, `ConcreteStrengthClasses` | `materials/domain/` |
| api/materials/api | `ConcreteMaterialController` | `materials/api/` |
| bridgelayout | `AbutmentCandidate`, `BridgeLayoutAlternative`, `BridgeSite`, `ConstraintCheckResult`, `LayoutDesignSpace`, `PierCandidate` | `layout/model/` |
| constraints | `NoPierZone` | `layout/model/` |
| bridgelayout | `FeasibilityStatus` | `layout/enums/` |
| bridgelayout | `BridgeLayoutEngine` | `layout/domain/` |
| api/layout/api | `LayoutAlternativeRow`, `LayoutGenerationController`, `LayoutGenerationRequest`, `NoPierZoneRequest`, `PierRow` | `layout/api/` |
| bridgecore | `Bridge`, `BridgeAlternative`, `Deck`, `DesignSpace`, `Foundation`, `Girder`, `Pier`, `Project`, `Span`, `SpanLayout` | `bridge/model/` |
| bridgecore | `FoundationType` | `bridge/enums/` |
| api/kernel/api | `KernelStateController`, `KernelStateRequest`, `KernelStateResponse` | `bridge/api/` |
| rules | `RuleEngineResult`, `RuleEvaluation`, `RuleOutcome` | `rules/model/` |
| rules | `EngineeringRule`, `RuleEngine` | `rules/domain/` |
| generative | `EvaluatedAlternative` | `generative/model/` |
| generative | `AlternativeGenerator`, `EvaluatedAlternativeGenerator` | `generative/domain/` |
| api/alternatives/api | `AlternativeGenerationController`, `AlternativeRow` | `generative/api/` |
| analysis (analysis-api) | `AnalysisElement`, `AnalysisJob`, `AnalysisJobId`, `AnalysisNode`, `AnalysisResult`, `BoundaryCondition`, `DisplacementResult`, `ReactionResult`, `UniformElementLoad`, `ElasticLinkElement`, `AnalysisMaterial`, `AnalysisSection`, `SolidRectangleSection`, `ISection`, `SolidCircularSection`, `LoadCase`, `AnalysisRequest`, `SelfWeight` | `analysis/model/` |
| analysis (analysis-api) | `AnalysisStatus`, `MaterialKind`, `LoadCaseKind` | `analysis/enums/` |
| analysis (analysis-api) | `AnalysisEngine` (port) | `analysis/application/` |
| modelbuilder | `FrameBridgeInput`, `FrameBridgeModel`, `NamedNode` | `analysis/model/` |
| modelbuilder | `FrameBridgeModelBuilder`, `AppliedLoadSummary` | `analysis/domain/` |
| analysisengine | 10 sınıfın tamamı (`KopruqAnalysisEngine` ve 9 package-private sınıf) | `analysis/infra/nativeengine/` |
| midas | 8 sınıfın tamamı (`MidasApiCall`, `MidasApiClient`, `MidasApiException`, `MidasHttpClient`, `MidasResultExtractor`, `MidasCivilNxAnalysisEngine`, `MidasVocabulary`, `MidasModelBuilder`) | `analysis/infra/midas/` |
| api/fastsolver/api | `DeckDisplacementRow`, `FastSolverController`, `FastSolverModelBuilder`, `FastSolverRequest`, `FastSolverResponse`, `SupportReactionRow` | `analysis/api/` |
| api/fastsolver/application | `FastSolverOutcome`, `FastSolverService` | `analysis/application/` |

Tablo 219 Java dosyasının tamamını kapsıyor. Sayım: 162 domain modülü dosyası + 57 api dosyası. 13 `package-info.java` §3.6'da.

**Hedef paketlerde basit ad çakışması yok (Doğrulandı).** Birleşen paketler `loads.model`, `loads.domain`, `loads.api`, `layout.model` ve `analysis.model`. Bunların sınıf adları birbirinden farklı.

### 3.5 Test eşleme tablosu
Eski önek: `backend/<modül>/src/test/java/com/kopruq/<kök>/`. Yeni önek: `backend/src/test/java/com/kopruq/`. Kural: her test, konusunun paketine gider. Package-private erişen testler de böylece kendi konularının paketinde kalır.

| Test | Yeni paket |
|---|---|
| `AlignmentTest`, `CurveElementTest`, `VerticalProfileTest`, `VerticalProfileInvariantTest` | `alignment/model/` |
| `ChainageSamplerTest` | `alignment/domain/` |
| `AlignmentSamplingServiceTest` (api) | `alignment/application/` |
| `BridgeAlternativeTest`, `ProjectTest`, `SpanLayoutTest`, `BridgeInvariantTest` | `bridge/model/` |
| `KernelStateControllerTest` (api) | `bridge/api/` |
| `BridgeLayoutEngineTest`, `BridgeLayoutEngineTerminationTest` | `layout/domain/` |
| `LayoutGenerationControllerTest` (api) | `layout/api/` |
| `AlternativeGeneratorTest`, `AlternativeGeneratorTerminationTest`, `EvaluatedAlternativeGeneratorTest` | `generative/domain/` |
| `AlternativeGenerationControllerTest` (api) | `generative/api/` |
| `BentleyTerrainImportTest`, `LandXmlImportServiceTest`, `LandXmlParserTest`, `LandXmlParserRobustnessTest`, `LandXmlImportServiceGapTest`, `LandXmlProfileFailClosedTest` | `landxml/domain/` |
| `LandXmlSurfaceBoundaryCountTest` | `landxml/model/` |
| `LandXmlImportUseCaseTest`, `LandXmlImportQueriesTest`, `LongitudinalProfileServiceTest` (api) | `landxml/application/` |
| `JsonAssertHelper`, `MidasResultExtractorTest`, `MidasAdapterContractTest`, `MidasCivilNxAnalysisEngineTest`, `MidasModelBuilderTest`, `MidasVocabularyTest` | `analysis/infra/midas/` |
| `KopruqAnalysisEngineTest`, `FrameSolverValidationTest`, `FrameSolverTest` | `analysis/infra/nativeengine/` |
| `FrameBridgeInputTest` | `analysis/model/` |
| `FrameBridgeModelBuilderTest`, `AppliedLoadSummaryTest` | `analysis/domain/` |
| `FastSolverModelBuilderTest` (api) | `analysis/api/` |
| `FastSolverServiceTest` (api) | `analysis/application/` |
| `RuleEngineTest` | `rules/domain/` |
| `TerrainImportServiceTest`, `XyzTerrainParserTest`, `TerrainDataIntegrityTest`, `TerrainQueryServiceTest`, `LocalCoordinatesTest` | `terrain/domain/` |
| `TerrainModelBoundaryCountTest` | `terrain/model/` |
| `TerrainServicesTest` (api) | `terrain/application/` |
| `TerrainBinaryWriterTest`, `BentleyProductionTerrainTest` (api) | `terrain/api/` |
| `LaneFactorTest` | `loads/model/` |
| `Lm1DefaultsFactoryTest`, `NotionalLaneGeneratorTest`, `TrafficLoadsServiceTest`, `TrafficLoadsServiceValidationTest`, `WindLoadsServiceTest`, `SeismicSpectrumServiceTest`, `UniformTemperatureServiceTest` | `loads/domain/` |
| `TrafficResolveUseCaseTest` (api) | `loads/application/` |
| `EurocodeConcreteTest`, `ConcreteStrengthClassesTest` | `materials/domain/` |
| `ConcreteMaterialControllerTest` (api) | `materials/api/` |
| `ApiExceptionHandlerTest` (api) | `shared/exception/` |
| `CorrelationIdFilterTest` (api) | `shared/config/` |
| `ContractTestSupport`, `EndpointInventoryContractTest`, `FastSolverContractTest`, `LoadsContractTest`, `CurrentDefectsContractTest`, `LandXmlTerrainContractTest`, `LayoutKernelCorsContractTest` | `contract/` |
| `ModuleBoundaryTest`, `ModuleBoundaryRules`, `ControllerLayeringTest`, `ApiLayeringTest` | **silinir** (`git rm`, F1). Yerine yeni `architecture/ArchitectureRules.java` ve `architecture/ArchitectureTests.java` gelir. |

Kaynak dosyaları:
- `sample.landxml` → `backend/src/test/resources/sample.landxml`
- `landxml/sample.landxml` → `backend/src/test/resources/landxml/sample.landxml`

Classpath yolları değişmez.

### 3.6 `package-info.java` yerleşimi (E5)
| Eski | Yeni |
|---|---|
| spatialcore | `geometry/package-info.java` |
| alignment | `alignment/package-info.java` |
| terrain | `terrain/package-info.java` |
| trafficloads | `loads/package-info.java` |
| environmentalloads | Javadoc paragrafları değiştirilmeden `loads/package-info.java` sonuna eklenir; eski dosya `git rm` ile silinir |
| materials | `materials/package-info.java` |
| bridgelayout | `layout/package-info.java` |
| constraints | `layout/model/package-info.java` |
| bridgecore | `bridge/package-info.java` |
| rules | `rules/package-info.java` (`{@link com.kopruq.rules package-info}` geçerli kalır) |
| generative | `generative/package-info.java` |
| analysis | `analysis/package-info.java` |
| modelbuilder | `analysis/domain/package-info.java` |
| analysisengine | `analysis/infra/nativeengine/package-info.java` |
| midas | `analysis/infra/midas/package-info.java` |

landxml modülünde `package-info` yok.

### 3.7 Build: tek `backend/pom.xml` (F1'de yazılır)
Bu blok yükü taşıyan kısım. Değişen şeyler yalnızca `packaging`, bağımlılık listesi ve `<plugins>`. `properties`, `dependencyManagement` (sıra dahil, ilk BOM kazanır) ve `pluginManagement` aynen kalır.

```xml
<groupId>com.kopruq</groupId>
<artifactId>kopruq-backend</artifactId>
<version>0.1.0-SNAPSHOT</version>
<packaging>jar</packaging>
<!-- properties, dependencyManagement (spring-boot-dependencies, junit-bom): mevcut haliyle -->
<dependencies>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
  <dependency><groupId>org.locationtech.jts</groupId><artifactId>jts-core</artifactId><version>1.20.0</version></dependency>
  <dependency><groupId>com.fasterxml.jackson.core</groupId><artifactId>jackson-databind</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
  <dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><scope>test</scope></dependency>
</dependencies>
<build>
  <!-- pluginManagement: mevcut haliyle (compiler 3.16.0 + parameters=true, surefire 3.5.4, resources 3.4.0) -->
  <plugins>
    <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId>
      <version>${spring-boot.version}</version>
      <executions><execution><goals><goal>repackage</goal></goals></execution></executions></plugin>
  </plugins>
</build>
```

- `<modules>` olmayacak. 17 alt `pom.xml` `git rm` ile silinecek.
- Eski üst yorum ("every module except api is plain Java…") güncel yapıyı anlatan bir yorumla değişir.
- **Jar:** `backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar`.
- **Çalıştırma:** `java -jar backend/target/kopruq-backend-*.jar`. `*.jar` deseni `.jar.original` dosyasını yakalamaz.
- Harici groupId'ler tam olarak şu dördü kalır: `org.springframework.boot`, `org.locationtech.jts`, `com.fasterxml.jackson.core`, `org.junit.jupiter`.

### 3.8 Spring açılışı, component scan ve çakışmalar
- **F2:** `KopruqApiApplication` → `com.kopruq.KopruqApplication`. Scan tabanı `com.kopruq` olur.
  - Bu adım hiçbir controller `com.kopruq.api` dışına çıkmadan **önce** yapılmalı. Aksi halde taşınan controller'lar scan dışında kalır. F2'nin domain fazlarından önce gelmesinin sebebi bu.
- **Yeni bean gelmez.** `com.kopruq.api` dışında stereotype yok (Doğrulandı). Test iç sınıfları (`Boom`, `Thrower`) Spring Boot `TestTypeExcludeFilter` tarafından scan dışında tutulur; bugün de böyle. Varsayım: Spring Boot standart davranışı. Contract testleri ve `EndpointInventoryContractTest` (21 endpoint) bunu doğrular.
- **Bean adı çakışması yok.** Scan edilen sınıfların basit adları benzersiz. `@Bean` metot adları değişmiyor. Spring Boot bean overriding'e varsayılan olarak izin vermez, yani bir çakışma olsaydı context açılamaz ve testler kırmızı olurdu.
- **`@SpringBootTest` keşfi:** testler (`com.kopruq.contract`, `com.kopruq.shared.config` vb.) yukarı doğru `com.kopruq.KopruqApplication`'ı bulur.
- **Değişmeyenler:** `spring.application.name=kopruq-api`, port 8080, actuator `health,info`.
- **Log kategori adları değişir:** `KopruqAnalysisEngine` ve `MidasCivilNxAnalysisEngine` (`getName()` logger) ile `ApiExceptionHandler` logger'ı yeni FQN'leri alır. Bilinen ve kabul edilen fark. `application.properties` içinde paket bazlı log seviyesi yok.

### 3.9 Mimari testler (`com.kopruq.architecture`)
Plain JUnit, harici bağımlılık yok (ArchUnit yeni bağımlılık olurdu).
- `ArchitectureRules`: saf fonksiyonlar. Import ayrıştırma, konum sınıflandırma ve kurallar burada.
- `ArchitectureTests`: gerçek ağaçta çalışan kontroller ve sentetik testler.
- Kaynak kök: `user.dir`'den yukarı çıkarak `src/main/java/com/kopruq` içeren ve `pom.xml`'inde `<artifactId>kopruq-backend</artifactId>` geçen dizin.

**Sınıflandırma:**
- Bir import'un paketi, ilk büyük harfli segmente veya `*`'a kadar olan küçük harfli segmentlerdir. `import static` da desteklenir.
- Hedef konum: `com.kopruq.<d>.<layer>[.<sub>]`. `d ∈ DOMAINS = {geometry, alignment, terrain, landxml, loads, materials, layout, bridge, rules, generative, analysis}`, `layer ∈ {api, application, domain, model, enums, infra}`. Alt paket yalnızca `infra` altında olabilir.
- Ayrıca: `com.kopruq.shared.{config,exception,quantity,validation}`, `com.kopruq` (yalnızca `KopruqApplication.java`), `com.kopruq.<d>` (yalnızca `package-info.java`).
- "Çekirdek katman" = `model`, `domain`, `enums`.

**Geçiş tabloları** (F1'de eklenir, her domain fazında küçülür, F14'te boş olduğu doğrulanıp silinir):
- `LEGACY_ROOTS`: eski kök → (domain, katman).
  - `spatialcore`→geometry/model
  - `alignment`→alignment/model
  - `terrain`→terrain/domain
  - `landxml`→landxml/domain
  - `trafficloads`, `environmentalloads`→loads/domain
  - `materials`→materials/domain
  - `constraints`→layout/model
  - `bridgelayout`→layout/domain
  - `bridgecore`→bridge/model
  - `rules`→rules/domain
  - `generative`→generative/domain
  - `analysis`→analysis/model
  - `modelbuilder`→analysis/domain
  - `analysisengine`→analysis/infra.nativeengine
  - `midas`→analysis/infra.midas
- `LEGACY_API_FEATURES`: `com.kopruq.api.<f>.<layer>` → domain.
  - alignment→alignment, alternatives→generative, environmentalloads→loads, fastsolver→analysis, kernel→bridge, landxml→landxml, layout→layout, materials→materials, terrain→terrain, trafficloads→loads
  - Yalnızca F1'de: `config`→shared.config, `error`→shared.exception, `observability`→shared.config ve `com.kopruq.api` kökü → root.

**Gerçek ağaç testleri:**
- **T1 `everyMainPackage_isAllowed` (R1):** her main dosyası yukarıdaki konumlardan birinde. Değilse eski kökü veya feature'ı tabloda kayıtlı olmalı. Bilinmeyen domain, katman ya da alt paket ihlaldir.
- **T2 `coreLayers_doNotDependOnSpringApplicationApiOrInfra` (R3):** çekirdek katmanlar `org.springframework.`, `jakarta.` (yalnızca `jakarta.persistence.` hariç; bu ileride R15 için açık bırakılıyor), `lombok.`, `com.kopruq.*.application.`, `*.api.`, `*.infra.` ve `com.kopruq.shared.config.` import etmez.
- **T3 `coreLayers_importOnlyTheAllowList` (R4):** çekirdek katmanların import'ları yalnızca şunlar olabilir:
  - `java.`
  - kendi domain'inin `{model,domain,enums}` paketleri
  - `CORE_DEPS[d]` içindeki domainlerin `{model,domain,enums}` paketleri
  - `com.kopruq.shared.{quantity,validation,exception}`
  - domain'e özel harici paket: `terrain.domain` için `org.locationtech.jts.`, `landxml.domain` için `javax.xml.`
- **T4 `domainEdges_equalThePinnedGraph`:**
  - Her dosyanın çözülmüş domain kenarları `DOMAIN_DEPS`'in (tüm katmanlar) alt kümesi olmalı. Çekirdek katmanlarda `CORE_DEPS`'in alt kümesi olmalı.
  - Gerçekte kullanılan kenar kümesi sabitlenen haritaya **eşit** olmalı. Eski "kullanılmayan iç bağımlılık" ve "grafik sabit" kontrollerinin karşılığı.
  - Haritalar (Doğrulandı, mevcut import'lardan çıkarıldı):
    - `CORE_DEPS` = {geometry:{}, alignment:{geometry}, terrain:{geometry}, landxml:{geometry,alignment,terrain}, loads:{}, materials:{}, layout:{alignment}, bridge:{}, rules:{bridge}, generative:{bridge,rules}, analysis:{materials}}
    - `DOMAIN_DEPS` = {geometry:{}, alignment:{geometry,landxml}, terrain:{geometry}, landxml:{geometry,alignment,terrain}, loads:{}, materials:{}, layout:{alignment,geometry}, bridge:{}, rules:{bridge}, generative:{bridge,rules}, analysis:{materials}}
  - `alignment→landxml` kenarı `AlignmentController`'ın `LandXmlImportQueries` ve `LandXmlImportResult` import'undan geliyor ve yalnızca api/application katmanında. Bilinçli olarak sabitlendi.
  - `shared.exception→{landxml}` sabit: `ApiExceptionHandler` → `LandXmlParseException`.
  - `shared.config` composition root olduğu için muaf. `shared.*` → `shared.*` serbest.
- **T5 `externalImports_onlyWhereAllowed`:** `java.` ve `com.kopruq.` dışındaki her import konumun izin listesinde olmalı.
  - `org.springframework.`, `jakarta.`, `org.slf4j.` ve `com.fasterxml.jackson.` yalnızca `api`, `application`, `infra` (aşağıdaki iki istisna hariç), `shared.config`, `shared.exception` ve kökte serbest.
  - `infra.nativeengine` yalnızca `java.` ile `com.kopruq.analysis.{model,enums,application}` import edebilir.
  - `infra.midas` yalnızca `java.`, `com.fasterxml.jackson.` ve `com.kopruq.analysis.{model,enums,application}` import edebilir.
  - Bu kurallar eski "analysis-engine ve midas-adapter yalnızca analysis-api'ye bağlı" korumasını sürdürür.
  - Tanınmayan bir harici önek (ör. `org.apache.`) her yerde ihlaldir.
- **T6 `solverSpecificCode_onlyInAnalysisInfra`:**
  - `com.kopruq.analysis.infra.midas` import'u yalnızca `analysis.infra.midas` ve `shared.config` içinden yapılabilir.
  - İçinde `midas`, `scia` veya `allplan` geçen (büyük/küçük harf duyarsız) import'lar yalnızca `analysis.infra.*` ve `shared.config` içinde olabilir. Bu, `bridge`, `rules` ve `generative` için solver tipi yasağını (CLAUDE.md) da açıkça kapsar.
- **T7 `restControllers_onlyInDomainApi_andExactlyTwelve`:** `@RestController` (Advice hariç) yalnızca `com.kopruq.<d>.api` içinde olabilir; F1'de legacy `com.kopruq.api.<f>.api` da kabul edilir. Sayı tam 12.
- **T8 `noCrossOrigin_andNoControllerBuildsCollaboratorsWithNew`:** `ControllerLayeringTest`'teki iki regex aynen taşınır.
- **T9 `applicationDoesNotImportApi`:** `..application..` paketleri `com.kopruq.<x>.api.` import etmez. Eski `ApiLayeringTest` rule 2'nin karşılığı; Spring yasağı CLAUDE.md gereği kaldırıldı.
- **T10 `pom_isOneModuleWithExactlyTheApprovedDependencies`:** `backend/pom.xml` içinde `<modules>` yok, `packaging` = `jar` ve `<project><dependencies>` kümesi §3.7'deki altı girdiye (groupId:artifactId:scope) **eşit**.

**Sentetik testler:** T1–T10'un her kuralı için en az bir ihlal girdisi (ihlali yakalamalı) ve bir temiz girdi (geçmeli) bulunur. "Başarısız olamayan kural bir şey kanıtlamaz" ilkesi.
- Eski sentetik assert'lerin anlamı korunur: Spring import'u yakalanır; jakarta/lombok yakalanır; MIDAS izinsiz yerde yakalanır, izinli yerde serbesttir; bildirilmemiş kenar yakalanır; kullanılmayan kenar yakalanır; `@CrossOrigin` ve `new …Service(` desen testleri.
- Geçiş sınıflandırmasını sınayan sentetik testler (ör. `com.kopruq.bridgecore.Bridge` → bridge/model) F14'te silinir.
- Sentetik girdiler, final grep'lere takılmamak için F14'ten sonra yalnızca hedef paket adlarını kullanır.

**Tablo B: eski korumaların karşılığı**

| Eski test | Yeni karşılık |
|---|---|
| `onlyApiDependsOnSpring`, `pomViolations` | T5 + T10 |
| `everyModule_respectsTheBoundaries` (framework, MIDAS, izinli kökler) | T2, T3, T4, T5, T6 |
| `everyModule_declaresExactlyItsAllowedInternalDependencies` | T4 (kenar eşitliği) + T1 (bilinmeyen domain) |
| `noModuleDeclaresAnInternalDependencyItDoesNotUse` | T4 (kullanılmayan kenar ihlaldir) |
| `ApiLayeringTest` rule1, rule3 | T7, T1 |
| `ApiLayeringTest` rule2 | T9 (Spring artık serbest) |
| `ControllerLayeringTest` (3 test) | T7, T8 |

### 3.10 İzin verilen düzenlemeler
Taşınan dosyalarda yalnızca `package` ve `import` satırları değişir. Gerekirse import eklenir, kaldırılır veya wildcard bölünür. Bunların dışında yalnızca şunlar yapılabilir:
- **E1:** `EndpointInventoryContractTest.java:29`'da `"com.kopruq.api."` → `"com.kopruq."` (F2). Anlam aynı kalır, çünkü uygulama controller'larının tümü `com.kopruq.*` altında. Beklenen 21'lik endpoint kümesi değişmez.
- **E2:** `CorrelationIdFilterTest.java:98` string'i → `"at com.kopruq.shared.config.CorrelationIdFilterTest$Boom.boom"` (F2).
- **E3:** Kod içindeki FQN'lerde yalnızca paket metni değişir. Liste §2'de. İlgili domain fazında yapılır.
- **E4:** Yorum ve javadoc içindeki `{@link|@code com.kopruq.…}` FQN'lerinde yalnızca paket metni değişir.
  - Yalnızca javadoc için **import eklenmez**. Aksi halde `analysis.model` içinden `analysis.application.AnalysisEngine` import'u T2'yi ihlal eder.
  - Basit adlı ve artık çözülmeyen `{@link X}` referansları olduğu gibi bırakılır. Javadoc build'in parçası değil.
- **E5:** §3.6'daki package-info yerleşimi ve iki birleştirme.
- **E6:** `KopruqApiApplication` → `KopruqApplication`: sınıf adı ve `SpringApplication.run(...)` satırı.
- **E7:** `ArchitectureRules` ve `ArchitectureTests` geçiş tablosu güncellemeleri.
- **E8:** Pom, `CLAUDE.md`, `README.md`, `start-dev.bat`, `docs/architecture.md`, `docs/roadmap.md`.
- **Görünürlük genişletme (package-private → public) yasaktır.** Öngörülmemiş bir package-private erişim derlemeyi kırarsa sınıf, bağımlı olduğu sınıfla aynı alt pakete konur ve sapma raporlanır.

---

## 4. Alternatifler ve seçim

1. **Büyük patlama (tek commit):** reddedildi. Hata ayıklaması zor; her faz sınırında yeşil build isteği karşılanmaz.
2. **Önce modüller içinde paket adlarını değiştirip sonra birleştirmek:** reddedildi.
   - `analysis`, `layout` ve `loads` kökleri birden çok modüle yayılacağı için `ModuleBoundaryTest`'in "bir kök bir modül" kuralı kırılır.
   - api'nin `com.kopruq.<d>.api` paketleri domain modüllerinin kökleriyle çakışır.
   - Bu yolda eski testleri yine yeniden yazmak gerekir.
3. **Önce birleştir (paketler sabit), sonra domain domain yeniden adlandır: SEÇİLDİ.**
   - F1 yalnızca dosya yolu ve pom değiştirir. Derleyici eski paketlerle çalışır, risk build yapısıyla sınırlı kalır.
   - Sonraki fazlar derleyici güdümlü import düzeltmeleridir.
4. **Domain başına tek düz paket (katman alt paketi yok):** isteğe ve referansa (R1) aykırı.
5. **ArchUnit:** yeni harici bağımlılık olduğu için yasak.
6. **Native solver'ı `analysis/domain`'e, portu da `domain`'e koymak:** R6 ("port application'da") ve CLAUDE.md ("solver adapters in its `infra`") ile çelişir. `KopruqAnalysisEngine`, MIDAS ile aynı portu uygulayan bir adapter.
7. **`spatial-core` → `shared`:** CLAUDE.md `shared` alt paketlerini sınırlıyor. `geometry` domain'i referansla uyumlu.
8. **`traffic` ve `environment` ayrı domain'ler:** isteğin "loads" önerisine göre birleştirildi. Kayıp: ikisi arasındaki modül sınırı. İkisi birbirini import etmiyor; gerekirse T4'e alt kural eklenebilir. Açık soru Q2.
9. **Eski test korunup son fazda değiştirilsin:** reddedildi. Taşınan domain'lerin api katmanı Spring kullanacağı için eski "Spring yalnızca api kökünde" kuralı ara fazlarda kırılır. Geçiş tablolu tek test her fazda tam korumayı sürdürüyor.

---

## 5. Sıralı uygulama görevleri (fazlar)

### Her fazda ortak adımlar
1. `git mv` ile taşı. Gerekirse önce `mkdir -p`.
2. Package satırlarını düzelt.
3. Derleyici güdümlü import düzeltmeleri yap. Taşınan tipleri import eden tüm dosyalar dahil.
4. E3/E4 düzeltmeleri.
5. Geçiş tablosunu güncelle.
6. Tam build.

Komutlar (Git Bash):
```bash
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
MVN=/c/Users/cemha/.m2/wrapper/dists/apache-maven-3.9.16/0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0/bin/mvn
"$MVN" -B -f backend/pom.xml clean package
# mimari dışı test sayısı = (Results 'Tests run') - (ArchitectureTests testleri):
grep -o 'tests="[0-9]*"' backend/target/surefire-reports/TEST-com.kopruq.architecture.ArchitectureTests.xml
```

**Faz kapanış kriteri:** BUILD SUCCESS; Failures 0, Errors 0, Skipped 1; mimari dışı test sayısı 348.

**Geri alma (her faz):** kullanıcı yerel checkpoint commit'ine izin verirse (Q1) `git revert --no-edit <faz-commit>`. İzin vermezse uygulayıcı hata halinde durur ve `blocked` raporlar. Yıkıcı git komutu kullanılmaz (`reset`, `checkout`, `clean`).

### F0: Baseline (değişiklik yok)
- Tam build: 367/0/0/1 beklenir.
- HEAD `a29513d` kaydedilir (state baseline).

### F1: Tek Maven modülü, paketler aynı
- Modül ağaçları taşınır, 17 çift:
  ```
  git mv backend/<modül>/src/main/java/com/kopruq/<kök> backend/src/main/java/com/kopruq/<kök>
  git mv backend/<modül>/src/test/java/com/kopruq/<kök> backend/src/test/java/com/kopruq/<kök>
  ```
  `spatial-core`, `constraints` ve `analysis-api`'de test dizini yok.
- 3 kaynak dosyası `git mv` ile §3.5'teki yerlerine taşınır. `application.properties` → `backend/src/main/resources/`.
- `git rm backend/*/pom.xml` (17 dosya). `backend/pom.xml` §3.7'deki gibi yazılır.
- `git rm` ile 4 eski mimari test silinir. Yeni `backend/src/test/java/com/kopruq/architecture/ArchitectureRules.java` ve `ArchitectureTests.java` (§3.9) eklenir, tüm geçiş tablosu girdileriyle.
- Jar yolu bu fazda değiştiği için şu satırlar güncellenir (E8):
  - `CLAUDE.md:123` → `java -jar backend/target/kopruq-backend-*.jar   # then curl http://localhost:8080/actuator/health`
  - `README.md:70`: aynı satır.
  - `start-dev.bat:15` → `java -jar target\kopruq-backend-0.1.0-SNAPSHOT.jar`
- **Smoke testi** (F1 ve F15'te zorunlu):
  ```bash
  "$JAVA_HOME/bin/java" -jar backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar > "<scratchpad>/app.log" 2>&1 & APP=$!
  for i in $(seq 1 90); do curl -sf http://localhost:8080/actuator/health && break; sleep 1; done
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/traffic-loads/load-groups
  kill $APP
  ```
  Beklenen: `{"status":"UP"}` ve `200`.
- AC: AC1, AC2, AC8, AC10, AC11.

### F2: `shared`, giriş sınıfı ve test paketleri
- `api/error/*` ve `api/config/*` main dosyaları ile `api/observability/CorrelationIdFilter` §3.4'teki yerlerine taşınır. `KopruqApiApplication` → `com.kopruq.KopruqApplication` (E6).
- Testler taşınır:
  - `ApiExceptionHandlerTest` → `shared/exception/`
  - `CorrelationIdFilterTest` → `shared/config/` (E2)
  - 7 contract testi → `contract/` (E1)
- Geçiş tablosundan `config`, `error`, `observability` ve api kökü girdileri çıkar.
- Doğrulama: `grep -rn "package com.kopruq.api;" backend/src` boş.

### F3–F13: Domain fazları
Her faz yalnızca §3.4 ve §3.5'teki ilgili satırları taşır. Faz sonunda:
- ilgili eski kök `LEGACY_ROOTS`'tan çıkar,
- api feature'ı `LEGACY_API_FEATURES`'tan çıkar,
- faz grep'i boş döner.

| Faz | Domain | Taşınan kaynaklar | Özel notlar | Faz grep'i (boş olmalı, `backend/src`) |
|---|---|---|---|---|
| F3 | geometry | spatialcore | E3: `TerrainController:94`, `LandXmlImportSummaryResponse:17` | `com\.kopruq\.spatialcore\b` |
| F4 | alignment | alignment, api/alignment | sealed üçlü `model`'de birlikte | `com\.kopruq\.alignment\.([A-Z]\|\*)`, `com\.kopruq\.api\.alignment\b` |
| F5 | terrain | terrain, api/terrain | `XyzTerrainParser` ve `XyzParseResult` `domain`'de. Wildcard'lar bölünür. E3: `TerrainController:95`, `LandXmlImportSummaryResponse:16`, `LandXmlImportUseCaseTest:66-74` | `com\.kopruq\.terrain\.([A-Z]\|\*)`, `com\.kopruq\.api\.terrain\b` |
| F6 | landxml | landxml, api/landxml | `LandXmlInspectResponse` wildcard'ı bölünür. E3: `LandXmlController:74` | `com\.kopruq\.landxml\.([A-Z]\|\*)`, `com\.kopruq\.api\.landxml\b` |
| F7 | loads | trafficloads, environmentalloads, api/trafficloads, api/environmentalloads | package-info birleştirmesi (E5) | `com\.kopruq\.(trafficloads\|environmentalloads)\b`, `com\.kopruq\.api\.(trafficloads\|environmentalloads)\b` |
| F8 | materials | materials, api/materials | | `com\.kopruq\.materials\.([A-Z]\|\*)`, `com\.kopruq\.api\.materials\b` |
| F9 | layout | bridgelayout, constraints, api/layout | E3: `LayoutGenerationController:33` | `com\.kopruq\.(bridgelayout\|constraints)\b`, `com\.kopruq\.api\.layout\b` |
| F10 | bridge | bridgecore, api/kernel | | `com\.kopruq\.bridgecore\b`, `com\.kopruq\.api\.kernel\b` |
| F11 | rules | rules | | `com\.kopruq\.rules\.([A-Z]\|\*)` |
| F12 | generative | generative, api/alternatives | `generative.api` → `bridge.api.KernelStateRequest` kenarı | `com\.kopruq\.generative\.([A-Z]\|\*)`, `com\.kopruq\.api\.alternatives\b` |
| F13 | analysis | analysis, modelbuilder, analysisengine, midas, api/fastsolver | `analysisengine` ve `midas` alt paketlerine bütün olarak taşınır. E3: `MidasModelBuilderTest:83` | `com\.kopruq\.(analysisengine\|modelbuilder\|midas)\b`, `com\.kopruq\.analysis\.([A-Z]\|\*)`, `com\.kopruq\.api\.fastsolver\b` |

Her domain fazının kapanışı: tam build yeşil, 348 mimari dışı test, Skipped 1. AC: AC3, AC4, AC5, AC6, AC12.

### F14: Mimari testlerin son hali
- `LEGACY_ROOTS`, `LEGACY_API_FEATURES`, legacy sınıflandırma kodu ve geçiş sentetik testleri silinir.
- T1 artık yalnızca hedef konumları kabul eder.
- Final grep'leri boş döner (AC7). `backend/src/test/java/com/kopruq/architecture` hariç tutulur:
  ```
  com\.kopruq\.(api|bridgecore|bridgelayout|spatialcore|constraints|trafficloads|environmentalloads|analysisengine|modelbuilder|midas)\b
  com\.kopruq\.(alignment|terrain|landxml|materials|rules|generative|analysis)\.([A-Z]|\*)
  ```

### F15: Dokümanlar ve temizlik
- **`docs/architecture.md`:**
  - "Repository / module structure" ağacı → §3.1.
  - "Dependency graph (Maven)" → "Domain dependency graph (packages)", içinde `CORE_DEPS` / `DOMAIN_DEPS` ve `ArchitectureTests`'e referans.
  - "`api` package layout" → hedef paket düzeni.
  - Yeni `## BACKEND-MODULAR-MONOLITH track` bölümü, F0–F15 girdileriyle.
- **`docs/roadmap.md`:** aynı track girdileri.
- **`CLAUDE.md`:** satır 52-53'teki "until it is implemented the old layout still exists" cümlesi uygulandığını söyleyecek şekilde güncellenir. Build & test F1'de zaten güncellendi.
- **`README.md`:** satır ~25-40'taki modül ağacı.
- **Temizlik:** yalnızca `git ls-files backend/<modül>` boşsa ve `git status --porcelain --ignored backend/<modül>` yalnızca `target/` gösteriyorsa `backend/<modül>` dizini silinir (izlenmeyen build çıktısı). Aksi halde durulur ve raporlanır.
- Smoke testi tekrarlanır. AC: AC9, AC13, AC14.

**Bağımlılıklar:**
- F1 ve F2 sırası zorunlu (F2 scan tabanı için).
- F3–F13 F2'den sonra gelir. Kendi aralarında sıra derleme açısından serbest ama öneri yukarıdaki sıra.
- F14 F13'ten, F15 F14'ten sonra.

---

## 6. Kabul kriterleri

- **AC1:** Her faz sonunda `"$MVN" -B -f backend/pom.xml clean package` BUILD SUCCESS verir: Failures 0, Errors 0, Skipped 1 (`BentleyProductionTerrainTest`). Toplam test eksi `ArchitectureTests` test sayısı = 348.
- **AC2:**
  - Final durumda `backend/pom.xml` `packaging jar`, `artifactId kopruq-backend` ve `<modules>` içermez.
  - `git ls-files 'backend/*/pom.xml'` boş.
  - `<project><dependencies>` tam olarak §3.7'deki altı girdi; harici groupId'ler yalnızca o dördü.
  - Build `backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar` üretir.
- **AC3:**
  - Her main sınıfı §3.4'teki hedef pakette.
  - Her test §3.5'teki pakette.
  - Domain köklerinde yalnızca `package-info.java` var.
  - `com.kopruq` kökünde yalnızca `KopruqApplication.java` var.
  - `shared` altında yalnızca `config`, `exception`, `validation` var.
- **AC4:**
  - `EndpointInventoryContractTest` geçer: 21 endpoint, beklenen küme literal'i değişmedi.
  - Tüm contract testleri geçer.
  - `git diff -M a29513d -- backend/api/src/test/java/com/kopruq/api/contract backend/src/test/java/com/kopruq/contract` yalnızca 7 rename gösterir. Değişen satırlar: package satırları, (gerekirse) import satırları ve E1.
- **AC5:** Rename olarak algılanan dosyalarda package, import ve boş satır dışındaki tüm değişen satırlar E1–E6 listesindedir. E3/E4 satırlarında `-` ile `+` arasındaki tek fark paket metni. Kontrol komutu:
  ```
  git diff -M --diff-filter=R a29513d -- backend | grep -E '^[-+]' | grep -vE '^(\+\+\+|---) ' | grep -vE '^[-+](package|import) ' | grep -vE '^[-+]\s*$'
  ```
- **AC6 (mühendislik değeri):** AC5 çıktısında sayısal literal içeren her satır yalnızca E4 kapsamında paket metni değişmiş bir yorum satırıdır. Taşınan dosyalarda sayısal literal eklenmez, silinmez, değiştirilmez.
- **AC7:** F14 sonunda §5 F14'teki iki final grep'i `backend/src` içinde (architecture dizini hariç) eşleşme döndürmez.
- **AC8:** `ArchitectureTests` T1–T10'u ve her kural için en az bir ihlal yakalayan, bir de temiz geçen sentetik testi içerir. Dört eski mimari test dosyası depoda yok. Tablo B'deki her eski koruma bir yeni teste eşlenmiştir.
- **AC9:** `CLAUDE.md`, `README.md` ve `start-dev.bat` içinde `backend/api/target` veya `api-*.jar` / `api-0.1.0-SNAPSHOT.jar` geçmez. `CLAUDE.md` Build & test bölümünde `java -jar backend/target/kopruq-backend-*.jar` satırı var.
- **AC10:** Jar ile yapılan smoke testinde `GET http://localhost:8080/actuator/health` `{"status":"UP"}`, `GET /api/traffic-loads/load-groups` 200 döner (F1 ve F15).
- **AC11:** `backend/src/main/resources/application.properties` baseline ile birebir aynı (%100 rename). İki `sample.landxml` %100 rename.
- **AC12:**
  - `ArchitectureTests` T2 ve T3 geçer: `model`, `domain` ve `enums` paketlerinde Spring, application, api ve infra import'u yok.
  - T6 geçer: MIDAS tipleri yalnızca `com.kopruq.analysis.infra.midas` içinde; `bridge`, `rules` ve `generative` solver tipine bağımlı değil.
- **AC13:** `git diff --stat a29513d -- frontend` boş.
- **AC14:** `docs/architecture.md` ve `docs/roadmap.md` içinde `BACKEND-MODULAR-MONOLITH` track'i F0–F15 girdileriyle var. Modül ağacı ve bağımlılık bölümleri tek modül yapısını gösteriyor.

---

## 7. Doğrulama matrisi

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Her fazda tam build + surefire rapor sayımı (§5 komutları) | BUILD SUCCESS, 0/0/1, mimari dışı 348 |
| AC2 | `grep -c "<module>" backend/pom.xml`; `git ls-files 'backend/*/pom.xml'`; T10; `ls backend/target/*.jar` | 0; boş; geçer; `kopruq-backend-0.1.0-SNAPSHOT.jar` |
| AC3 | T1 (gerçek ağaç); §3.4/§3.5'e karşı `git diff -M --name-status a29513d -- backend` | geçer; her satır tablodaki hedefe gidiyor |
| AC4 | Build içindeki contract testleri; `git diff -M a29513d -- <iki contract yolu>` | geçer; yalnızca package satırı + E1 |
| AC5 | §6 AC5'teki komut | çıktı yalnızca E1–E6 satırları |
| AC6 | AC5 çıktısında `grep -E '[0-9]'` ve elle eşleştirme | yalnızca E4 yorum satırları, literal farkı yok |
| AC7 | §5 F14'teki iki grep (`grep -rnE … backend/src --exclude-dir=architecture`) | eşleşme yok |
| AC8 | `ArchitectureTests` surefire raporu; `git ls-files` ile eski 4 dosya | tüm testler geçer; dosyalar yok |
| AC9 | `grep -nE 'backend/api/target\|api-\*\.jar\|api-0\.1\.0' CLAUDE.md README.md start-dev.bat` | eşleşme yok |
| AC10 | §5 F1'deki smoke betiği | `{"status":"UP"}`, `200` |
| AC11 | `git diff -M --summary a29513d -- backend` | `rename … (100%)` üç kaynak dosyası için |
| AC12 | T2, T3, T6 | geçer |
| AC13 | `git diff --stat a29513d -- frontend` | boş |
| AC14 | `grep -c "BACKEND-MODULAR-MONOLITH Faz" docs/roadmap.md docs/architecture.md` | her biri ≥ 16 |

**Bilinmeyenler:**
- Frontend `npm run build` çalıştırılması gerekmiyor, çünkü frontend değişmiyor. Durumu bilinmiyor (26 vitest hatası önceden var).
- Smoke testi için 8080 portunun boş olması gerekiyor.
- Ağ erişimi gerekmez. Bağımlılıklar yerel `.m2`'de zaten var (koordinatör bilgisi: `-o` kullanılmıyor, build önceden yeşil).

---

## 8. Riskler

- **Çok büyük yeniden adlandırma** (~220 main ve 79 test dosyası):
  - 16 faz, derleyici güdümlü düzeltme ve her fazda tam build ile azaltılıyor.
  - Package-private kümeler ve sealed hiyerarşiler önceden birlikte yerleştirildi (§2). Görünürlük genişletme yasak.
- **Rename algılama ve blame:**
  - Kısa dosyalarda (ör. 2 import'lu küçük record'lar) değişen satır oranı yüksek olduğu için benzerlik %50'nin altına düşüp silme+ekleme görünebilir. Geçmiş için `git log --follow -M30% -- <yol>` ve `git blame -M -C` önerilir.
  - Faz başına commit (Q1) rename eşleşmesini iyileştirir.
- **Diğer dallarla birleştirme çatışması:**
  - Backend'e dokunan her paralel dal neredeyse kesin çatışır.
  - Öneriler: backend'i dondurmak, işi ayrı bir dalda yapmak (Q3), başlamadan önce `main`'i birleştirmek, hızlı sonuçlandırmak. Git rename algılaması paralel içerik değişikliklerini kısmen taşır.
- **Frontend sözleşmesi:**
  - REST path, method, durum kodu ve JSON alanları değişmiyor. Record bileşen adları ve enum adları aynı; `-parameters` derleyici ayarı korunuyor.
  - Contract testleri ve `EndpointInventoryContractTest` bunu güvence altına alıyor.
  - Hata gövdesinde sınıf adı yok. `ApiExceptionHandler` iç detayı sızdırmıyor; `CurrentDefectsContractTest` ve `ApiExceptionHandlerTest` bunu sınıyor.
- **Spring scan çakışması:** F2'den sonra scan tabanı `com.kopruq`. Bugün `com.kopruq.api` dışında stereotype yok. İleride bir domain sınıfına `@Component` eklenirse bean olur; R12 gereği bu `@Configuration` ile yapılmalı (mimari test zorlamıyor, kapsam dışı).
- **Tek surefire JVM'i:** domain testleri artık Spring context'leriyle aynı JVM'de çalışıyor (varsayılan `forkCount=1`). Bellek veya süre artışı olabilir. Doğrulanmadı, ilk F1 build'inde gözlenir.
- **Log kategorisi değişikliği** (§3.8): dış log filtreleri varsa etkilenir. Depoda yok.
- **Satır sonları:** önceki feature'da `autocrlf` LF→CRLF uyarıları görüldü. İçerik farkı oluşturmamalı. AC5 diff'inde yalnızca boşluk farkı çıkarsa `--ignore-cr-at-eol` ile tekrar kontrol edilir.
- **Eski `target/` dizinleri:** `backend/api/target/api-*.jar` gibi bayat jar'lar yanıltabilir. F15'te güvenli koşullarla temizlenir.
- **Kimlik doğrulama ve veri:** kalıcılık ve yetkilendirme yok. In-memory repository davranışı değişmiyor; `SharedRepositoriesConfig` tek bean semantiği korunuyor.
- **Geri alma:** commit izni yoksa yarım kalan bir faz elle ters `git mv` gerektirir. Uygulayıcı yıkıcı komut kullanmaz, `blocked` durumda bırakır.

---

## 9. Varsayımlar ve açık sorular

### Varsayımlar
- **A1:** Spring Boot 3.5.x `TestTypeExcludeFilter`, test sınıflarının iç sınıflarını scan dışında tutar (standart davranış, depoda doğrulanmadı). Contract testleri doğrular.
- **A2:** `junit-bom` ve `spring-boot-dependencies` import sırası korunduğu sürece JUnit sürümü bugünküyle aynı kalır.
- **A3:** Domain ve katman yerleşim kararları (§3.2–3.3) yazılım kararıdır ve mühendislik bilgisi gerektirmez. Mühendislik değeri, formül veya varsayılan değişmiyor.
- **A4:** Paketler ve sınıflar dışında hiçbir şey adlandırılmaz. `spring.application.name=kopruq-api` ve `artifactId kopruq-backend` aynı kalır.
- **A5:** `docs/architecture/backend-reference.md` ve `docs/ARCHITECTURE_AMENDMENT_V2.md` değişmez. İçerdikleri tarihli tespitler tarihsel kayıt olarak kalır.

### Açık sorular (hiçbiri planı bloklamıyor; varsayılan karar yazılı)
- **Q1:** Faz başına yerel checkpoint commit'ine izin var mı? Commit geri almayı (`git revert`) ve rename takibini kolaylaştırır. Varsayılan: commit yok; hata halinde uygulayıcı durur ve `blocked` raporlar.
- **Q2:** Domain adları ve birleştirmeler kabul mü?
  - `geometry` (spatial-core)
  - `loads` (traffic + environmental tek domain)
  - `layout` (bridge-layout + constraints)
  - model-builder'ın `analysis/domain`'e gitmesi
  - Varsayılan: §3.2'deki gibi.
- **Q3:** İş mevcut `codex/landxml-terrain-import` dalında mı yapılsın, ayrı bir dalda mı? Workflow ayrı dal öneriyor; dal değiştirmek için kullanıcı talebi gerekir. Varsayılan: mevcut dal, dal değiştirilmez.

Bütün fazlar (F0–F15) tam olarak tanımlandı. Açık sorular varsayılanlarıyla uygulanabilir.

**READY**
