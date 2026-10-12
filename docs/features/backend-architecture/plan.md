# Plan: backend-architecture

Feature slug: `backend-architecture` · Kök: `C:\Users\cemha\repos\KOPRUQ` · Baseline HEAD: `1646245` · Mimari hedef: `docs/architecture/backend-reference.md` (R1–R16 ve "KOPRUQ'a uyarlama"). Çatışma olduğunda CLAUDE.md geçerlidir.

---

## 1. Amaç ve açık kapsam dışı

### Amaç
Backend'in modül ve paket düzeni, referanstaki R1–R6 ve R12 ilkelerine göre yeniden yapılandırılacak. Hiçbir davranış değişmeyecek.
- **R1/R2:** `backend/api` içinde her feature `api` (controller, DTO, mapper) ve `application` (use-case, plain Java) alt paketlerine ayrılır. Controller'larda yalnızca istek-yanıt dönüşümü ve HTTP eşlemesi kalır.
- **R5 / F-05:** `FastSolverModelBuilder` topolojisi ve denge hesabı yeni framework'süz `model-builder` modülüne taşınır.
- **F-13:** Tekrar eden yardımcılar sahibi olan modüllere taşınır: örnekleme `alignment` modülüne; local-origin dönüşümü ve sınır sayımı `terrain`/`landxml-import` modüllerine. İki örnekleme kuralı ayrı kalır (U8).
- **F-08 / F-19:** Yeni `materials` (`EurocodeConcrete` ve beton sınıfı kataloğu) ve `environmental-loads` (rüzgâr, deprem, sıcaklık) modülleri açılır.
- **F-06 / F-14:** Analiz portundaki MIDAS sözlüğü KOPRUQ enum'larına çevrilir, birimler açık hale gelir. MIDAS kodları yalnızca `midas-adapter`'da kalır.
- **Kural motoru kararı:** Kural değerlendirmesi `generative-engine` içindeki bir domain servisine taşınır. `generative-engine -> rules-engine` kenarı böylece kullanılır ve `KNOWN_UNUSED_EDGES` istisnası boşalır.
- **R3/R4:** `ModuleBoundaryTest` hedef modül grafiğini birebir sabitler. MIDAS yasağı genişletilir. Yeni `ApiLayeringTest`, `api` içindeki katman kurallarını denetler.

### Kapsam dışı
- Kalıcılık (JPA, PostgreSQL, Compose; R13, R15, R16). Yeni REST endpoint. Bean Validation dahil yeni harici bağımlılık. Frontend değişikliği.
- Mühendislik değerleri: hiçbir sayısal literal, tablo, katsayı veya formül değişmez. F-02, F-09 ve E1–E11 provenansı (B3) kapsam dışı.
- B1 `ComputationLimits`, B2 repository kapasitesi, B4 `NOT_EVALUATED`. U6 (actuator) ve U8 (örnekleme kurallarını birleştirme).
- H-04 (üç köprü temsili, `AlternativeGenerator` ile `BridgeLayoutEngine` adımlama tekrarı) birleştirilmez.
- MIDAS'ı REST'e bağlamak (P07) ve canlı MIDAS çağrısı eklemek.
- R11 (record yalnızca DTO) opsiyonel, uygulanmaz.

---

## 2. Mevcut mimari (doğrulanmış, kaynak yolu ve sembollerle)

### 2.1 Modüller ve pom bağımlılıkları
Kanıt: `backend/pom.xml:22-37` ve modül pom'ları.

| Modül | İç bağımlılıklar | Not |
|---|---|---|
| spatial-core | — | |
| alignment | spatial-core | |
| terrain | spatial-core, jts-core | |
| landxml-import | spatial-core, alignment, terrain | |
| traffic-loads | — | Rüzgâr, deprem ve sıcaklık da burada (F-08): `WindLoadsService`, `SeismicSpectrumService`, `UniformTemperatureService` ve 7 record. `package-info.java:1-19` kapsamı EN 1991-2 olarak tanımlıyor. |
| constraints | — | |
| bridge-layout | alignment, constraints | |
| bridge-core | — | |
| rules-engine | bridge-core | |
| generative-engine | bridge-core, rules-engine | rules-engine main'de **kullanılmıyor**. `ModuleBoundaryTest.KNOWN_UNUSED_EDGES` içinde istisna olarak duruyor (`ModuleBoundaryTest.java:41`). |
| analysis-api | — | `EurocodeConcrete` burada (F-19) |
| analysis-engine | analysis-api | |
| midas-adapter | analysis-api, jackson-databind | |
| api | midas-adapter dışındaki 12 modül + Spring | `api/pom.xml:22-99` |

### 2.2 `api` paketleri (düz)
- **Feature paketleri:** `alignment`, `alternatives`, `fastsolver`, `kernel`, `landxml`, `layout`, `materials`, `terrain`, `trafficloads`.
- **Ortak paketler:** `config`, `error`, `observability`.
- **Mevcut `application` paketleri:** yalnızca `landxml/application/LandXmlImportUseCase` ve `alignment/application/ChainageSampler`.
- **Bean kurulumu:** `config/CoreConfiguration.java` (R12) ve `config/SharedRepositoriesConfig.java`.

### 2.3 Controller'larda kalan iş mantığı (R2/R5 boşlukları)
- **`fastsolver/FastSolverController.java`**
  - `:54-92`: sonuç eşleme ve eksik reaksiyon/deplasman durumunda `FAILED`.
  - `:100-141`: `totalAppliedLoad` denge hesabı. Yalnızca `SolidRectangleSection` destekleniyor, diğer kesitlerde alan sessizce 0 (`:130-131`).
- **`fastsolver/FastSolverModelBuilder.java:39-145`**: portal çerçeve topolojisi `api` içinde. Ayrıca `"CONC"` (`:54`) ve `"D"` (`:140`) burada kullanılıyor. `:153-204` istek doğrulaması `InvalidRequestException`/`FieldViolation` (api tipleri) ile yapılıyor.
- **`alternatives/AlternativeGenerationController.java:41-46`**: `RuleEngine.evaluate` controller'da çağrılıyor.
- **`landxml/LandXmlController.java:103-126`**: profil örnekleme, terrain sorgusu ve tasarım kotu hesabı.
- **`alignment/AlignmentController.java:61-79`**: repository okuma ve örnekleme.
- **`terrain/TerrainController.java`**:
  - `:71-72`: import ve save.
  - `:99-106`: local-origin dönüşümü. Aynı dönüşüm `TerrainMeshResponse.java:33-39` ve `TerrainBinaryWriter.java:17` içinde de var.
- **`materials/ConcreteMaterialController.java:17-29`**: desteklenen sınıf kümesi ve `fck` ayrıştırması controller'da.
- **`trafficloads/TrafficLoadsController.java:55-63`**: null kontrolü ve iki domain çağrısının orkestrasyonu.
- **`"OUTER"`/`"VOID"` sayımı iki yerde:** `landxml/LandXmlInspectResponse.java:20-21` (`LandXmlSurface` üzerinde) ve `landxml/LandXmlImportSummaryResponse.java:31-32` (`TerrainModel` üzerinde).

### 2.4 Analiz portunda MIDAS sözlüğü (F-06 / F-14)
- `analysis-api/.../AnalysisMaterial.java:3-24`: `String type` MIDAS sözlüğü kullanıyor ("CONC"…). Birimler "solver session"a bağlı.
- `LoadCase.java:3-10`: `String type` MIDAS kodu ("D").
- `SolidRectangleSection.java:3`, `ISection.java:3-8`, `SolidCircularSection.java:3`, `AnalysisRequest.java:7-9`: javadoc'lar MIDAS şekil kodlarına ve MIDAS'a referans veriyor.
- **Tüketiciler:**
  - `midas-adapter/.../MidasModelBuilder.java:81-107`: `TYPE` alanına `type()` doğrudan yazılıyor. Şekil kodları (`:126-132`) zaten adapter'da.
  - `analysis-engine/.../FrameSolver.java:70,73,81`: `elasticModulus()`, `poissonRatio()`, `weightDensity()`.
  - Testler: `"CONC"`/`"D"`/`"W"` literal'leri altı test dosyasında (bkz. §5 test envanteri).

### 2.5 Mimari testler
- `api/src/test/.../architecture/ModuleBoundaryTest.java`:
  - pom ve import tutarlılığı;
  - paket kökü tekliği (`:60-67`, yeni modüllerin ayrı `com.kopruq.<kök>` paketi kullanmasını zorunlu kılar);
  - kullanılmayan kenar kontrolü;
  - yalnızca `api`'nin Spring'e bağımlı olması.
- `ModuleBoundaryRules.java:25`: `MIDAS_FREE_MODULES` yalnızca 3 modülü kapsıyor.
- `ControllerLayeringTest.java:81`: tam olarak 12 controller bekliyor.
- Contract testleri `api/src/test/java/com/kopruq/api/contract/` altında. `EndpointInventoryContractTest` 21 endpoint'i sabitliyor ve bean tipini `com.kopruq.api.` önekiyle filtreliyor; alt paket taşıması bunu etkilemez.

### 2.6 Doğrulanmış diğer gerçekler
- `KopruqAnalysisEngine implements AnalysisEngine` (`KopruqAnalysisEngine.java:31`).
- `ControllerLayeringTest` desenleri yalnızca `@RestController` sınıflarına uygulanıyor.
- `KernelStateResponse` domain record'larını (`Bridge`, `DesignSpace`) doğrudan serileştiriyor. Bu record'lar değiştirilmeyecek.

---

## 3. Önerilen tasarım

### 3.1 Hedef modül grafiği (ModuleBoundaryTest bunu birebir sabitler)

| Modül | İzinli iç bağımlılıklar | Paket kökü |
|---|---|---|
| spatial-core | — | `spatialcore` |
| alignment | spatial-core | `alignment` (+ `ChainageSampler`) |
| terrain | spatial-core | `terrain` (+ `LocalCoordinates`) |
| landxml-import | spatial-core, alignment, terrain | `landxml` |
| traffic-loads | — | `trafficloads` (yalnızca EN 1991-2) |
| **environmental-loads (yeni)** | — | `environmentalloads` |
| **materials (yeni)** | — | `materials` |
| constraints | — | `constraints` |
| bridge-layout | alignment, constraints | `bridgelayout` |
| bridge-core | — | `bridgecore` |
| rules-engine | bridge-core | `rules` |
| generative-engine | bridge-core, rules-engine (artık kullanılıyor) | `generative` |
| analysis-api | — | `analysis` (yalnızca port, MIDAS sözlüğü yok) |
| analysis-engine | analysis-api | `analysisengine` |
| **model-builder (yeni)** | analysis-api, materials | `modelbuilder` |
| midas-adapter | analysis-api (+ jackson) | `midas` |
| api | midas-adapter hariç tümü (+ Spring) | `api` |

Yeni modüllerin gerekçeleri:
- **`materials`:** Malzeme bağıntıları (EN 1992-1-1 Table 3.1) bir analiz portunun parçası değildir (F-19). Tüketicileri `api` ve `model-builder`.
- **`environmental-loads`:** `traffic-loads` package-info'su kapsamı EN 1991-2 ile sınırlıyor. Rüzgâr (EN 1991-1-4), sıcaklık (EN 1991-1-5) ve deprem spektrumu orada yanlış yerde (F-08). Üç küçük servis tek modülde toplanır.
- **`model-builder`:** Köprü girdisinden çözücüden bağımsız `AnalysisRequest` üretimi (P06/P07 "canonical model") ne port (`analysis-api`), ne çözücü (`analysis-engine`), ne de köprü domain'i (`bridge-core`). İleride MIDAS yolu da aynı builder'ı kullanabilir.

### 3.2 `api` paket düzeni
```
com.kopruq.api
  KopruqApiApplication
  config/          (CoreConfiguration, SharedRepositoriesConfig, WebCorsConfiguration)  - yerinde kalır
  error/           (ApiExceptionHandler, ApiErrorResponse, FieldViolation, FieldChecks, InvalidRequestException) - yerinde
  observability/   (CorrelationIdFilter) - yerinde
  <feature>/api/          controller + request/response record + mapper
  <feature>/application/  use-case servisleri (plain Java, @Service yok, CoreConfiguration'da @Bean)
  <feature>/infra/        yalnızca bir port uygulaması gerektiğinde açılır; bu planda açılmaz
```
- **Feature'lar:** `alignment`, `alternatives`, `environmentalloads` (wind/seismic/temperature controller'ları `trafficloads`'tan buraya gelir), `fastsolver`, `kernel`, `landxml`, `layout`, `materials`, `terrain`, `trafficloads`.
- `config/error/observability` paketleri `shared/` altına taşınmaz. Zaten ortak paketler; taşımak yalnızca test paketlerinde gereksiz değişiklik yaratır.
- `infra` açılmaz. In-memory repository'ler framework'süz ve kendi modüllerinde duruyor. Kalıcılık geldiğinde JPA adapter'ları `<feature>/infra` altına gider.
- **Katman kuralları (yeni `ApiLayeringTest`):**
  1. `@RestController` yalnızca `com.kopruq.api.<feature>.api` paketlerinde bulunur.
  2. `..application..` sınıfları `org.springframework.`, `jakarta.` ve `com.kopruq.api.<x>.api.` import edemez. `com.kopruq.api.error.` serbesttir.
  3. Feature düzeyinde yalnızca `api`, `application` ve `infra` alt paketleri olabilir. `com.kopruq.api.<feature>` doğrudan sınıf içeremez (`config`, `error`, `observability` hariç).

### 3.3 Veri akışı ve arayüzler (önemli olanlar)

**Fast Solver (F-05)**
```
FastSolverController (fastsolver/api)
  -> FastSolverModelBuilder.build(FastSolverRequest)  [fastsolver/api: istek doğrulaması (mevcut validate, aynen) + FrameBridgeInput eşlemesi]
       -> com.kopruq.modelbuilder.FrameBridgeModelBuilder.build(FrameBridgeInput) : FrameBridgeModel
  -> FastSolverService.solve(FrameBridgeModel) : FastSolverOutcome   [fastsolver/application; AnalysisEngine portu]
       -> AnalysisEngine.submit/getResults (bean: KopruqAnalysisEngine)
       -> com.kopruq.modelbuilder.AppliedLoadSummary.totalAppliedLoadKn(AnalysisRequest)
  -> FastSolverResponse eşlemesi (controller'da)
```
- **`FrameBridgeInput`** (record, `model-builder`): değerler `double`/`List<Double>`.
  - Compact constructor'da mevcut api kontrollerinin domain karşılıkları var: sonlu, pozitif boyutlar, `pierHeightsM.size()==spanLengthsM.size()-1`, sonlu SDL ve rijitlikler.
  - Hata durumunda `IllegalArgumentException`. Api doğrulaması önce çalıştığı için REST yolundan tetiklenmez.
- **`FrameBridgeModelBuilder.build`:** gövde mevcut `build` gövdesinin aynısıdır; malzeme adı `"C" + (int) (double) fck` korunur.
- **`AppliedLoadSummary`:** gövde `FastSolverController.totalAppliedLoad`'ın aynısıdır, aritmetik sırası değişmez. Tek fark: öz ağırlık varken dikdörtgen dışı bir kesit gelirse `IllegalArgumentException` atılır (sessiz 0 yerine). Builder yalnızca dikdörtgen kesit ürettiği için REST'ten erişilemez. Bkz. A3.
- **`FastSolverService(AnalysisEngine)`:** `CoreConfiguration` içinde `KopruqAnalysisEngine` açıkça verilerek kurulur.
- **`FastSolverOutcome`** (application record) alanları:
  - `status`, `errorMessage`;
  - `List<SupportReaction(NamedNode node, ReactionResult reaction)>`, `List<DeckDisplacement(NamedNode node, DisplacementResult displacement)>`;
  - `totalAppliedLoadKn`, `totalReactionKn`.
  - Durum metinleri, hata mesajları, 0 değerleri ve `fz` toplama sırası (`DoubleStream.sum`, destek sırasında) aynen korunur.

**Alternatifler (kural motoru kararı, R5)**
```
AlternativeGenerationController -> generative.EvaluatedAlternativeGenerator.generate(Bridge, DesignSpace)
     -> AlternativeGenerator.generate (değişmez) + RuleEngine.evaluate (her alternatif, aynı sıra)
     : List<EvaluatedAlternative(BridgeAlternative alternative, RuleEngineResult ruleResult)> ; feasible() = ruleResult.feasible()
```
- `AlternativeGenerator` değişmez; generative-engine testleri dokunulmadan kalır.
- `AlternativeRow.from(alternative, feasible)` imzası korunur.

**Örnekleme ve profil (F-13, U8 korunur)**
- `com.kopruq.alignment.ChainageSampler`: `forOverlay` ve `forProfile` gövdeleri aynen kalır.
- `api/alignment/application/AlignmentSamplingService(ChainageSampler)`: `List<AlignmentSample(chainageM, xM, yM)> sample(Alignment, stepM)`.
- `api/landxml/application/LandXmlImportQueries(LandXmlImportRepository)`: `Optional<LandXmlImportResult> findById(id)`. Hem alignment hem landxml controller'ı kullanır.
- `api/landxml/application/LongitudinalProfileService(TerrainQueryService, ChainageSampler)`: `List<ProfileSample(chainageM, Double groundElevationM, Double designElevationM)> profile(LandXmlImportResult, stepM)`. Hesap `LandXmlController.profilePointAt`'in aynısıdır.
- 404'ler (`"No LandXML import with id "+id`, `"Import "+id+" has no alignment"`) controller'da aynı `ResponseStatusException` ile kalır (HTTP eşlemesi).

**Terrain**
- `api/terrain/application/TerrainImportUseCase(TerrainImportService, TerrainRepository)`: `importXyzWithDiagnostics` + `save`, sıra aynı.
- `api/terrain/application/TerrainReadService(TerrainRepository, TerrainQueryService)`: `Optional<TerrainModel> findById`, `Optional<Double> elevationAt(TerrainModel, x, y)`.
- `com.kopruq.terrain.LocalCoordinates.relativePositions(List<Point3D>, Point3D origin) : double[]`: `TerrainMeshResponse.from` ve diagnostics bunu kullanır. `TerrainBinaryWriter` akış halinde `float` yazdığı için inline kalır; bu javadoc'ta belirtilir.
- Sınır sayımı:
  - `TerrainModel.countBoundaries(String type)` ve `LandXmlSurface.countBoundaries(String type)` (`long`).
  - Parametreli metot oldukları için Jackson getter'ı sayılmazlar.
  - Sınır tipi enum'a çevrilmez; diagnostics JSON'u `type` string'i taşıyor.

**Malzeme**
- `com.kopruq.materials.EurocodeConcrete`: taşıma, gövde aynı.
- `com.kopruq.materials.ConcreteStrengthClasses`: statik, controller'daki 14 kimlik birebir taşınır. `OptionalInt characteristicStrengthMpa(String materialId)` mevcut `contains` + `substring(1, indexOf('/'))` + `NumberFormatException` mantığını aynen uygular.
- Controller boş sonuçta aynı `ResponseStatusException(NOT_FOUND, "Unknown concrete material ID: " + id)` hatasını atar.
- Controller'ın no-arg kurucusu korunur (`ConcreteMaterialControllerTest` için).

**Trafik**
- `api/trafficloads/application/TrafficResolveUseCase(TrafficLoadsService)`: `TrafficResolution(lanes, lm1, validation) resolve(CarriagewayInput, Lm1Parameters)`.
- `IllegalArgumentException("carriageway is required")` aynen korunur.

**Analiz portu (F-06 / F-14)**
- `analysis-api` yeni enum'lar: `MaterialKind { CONCRETE }`, `LoadCaseKind { DEAD, WIND }`. Yalnızca bugün main ve test kodunda kullanılan değerler eklenir.
- `AnalysisMaterial(int id, MaterialKind kind, String name, double elasticModulusKnPerM2, double poissonRatio, double thermalCoefficientPerC, double weightDensityKnPerM3, double massDensityTonnesPerM3)`.
- `LoadCase(String name, LoadCaseKind kind)`.
- `package-info` port birim sistemini sabitler: m, kN, kN/m², kN/m³, t/m³, rad, 1/°C, kN/m, kN·m/rad. Kesit javadoc'larından MIDAS şekil kodları çıkarılır.
- `midas-adapter` yeni `MidasVocabulary`:
  - `CONCRETE -> "CONC"`, `DEAD -> "D"` (MIDAS-P01'de doğrulanmış; `MidasModelBuilderTest` beklenen JSON'u değişmez).
  - `WIND -> UnsupportedOperationException("not verified against MIDAS")`. Canlı doğrulama P07'ye kalır.
- MIDAS oturum birimini set eden bir çağrı (`/db/unit` benzeri) eklenmez. Canlı doğrulama gerektirir; adapter javadoc'u portun kN/m birimini oturumun da kullanması gerektiğini açıkça yazar.

### 3.4 Uyumluluk
- REST yolları, metotlar, durum kodları, JSON alan adları ve sırası değişmez. Jackson record bileşen adlarına bakar; paket adı JSON'u etkilemez.
- `KernelStateResponse` (`Bridge`/`DesignSpace`), `Lm1Parameters`, `WindResult` vb. JSON şekilleri aynı kalır. Taşınan record'larda bileşen değişikliği yapılmaz.
- Contract test dosyaları hiç değişmez.
- Hiçbir modül Spring almaz. Yeni harici bağımlılık yoktur; pom'lara yalnızca `com.kopruq` iç modülleri eklenir.

---

## 4. Alternatifler ve seçim gerekçesi

| Konu | Reddedilen | Neden |
|---|---|---|
| Kural değerlendirmesi | (B) api `alternatives/application` servisi + pom kenarını silmek | Referans kanıtı R12 `new AlternativeGenerator(new SpanLayoutGenerator(), new RuleEngine(), …)`: kural motoru domain üreticisinin parçası (R5). Kenar zaten var ve R4'e uygun. B de controller testinde aynı ölçüde kablolama değişikliği gerektirir. Bugün sıfır kural olduğundan iki seçenekte de davranış farkı yok. Mühendislik kararı değil. |
| Kural değerlendirmesi | (C) Kenarı silip controller'ı olduğu gibi bırakmak | R2 ihlali sürer. |
| Kural değerlendirmesi | `AlternativeGenerator`'a `RuleEngine` enjekte etmek | 8 generative-engine test çağrısını (`new AlternativeGenerator()`) değiştirirdi. Ayrı `EvaluatedAlternativeGenerator` bu testleri değiştirmez. |
| Builder yeri | `analysis-engine` | Modellemeyi yerel çözücüye bağlar; MIDAS yolu kullanamaz. |
| Builder yeri | `bridge-core` | `bridge-core -> analysis-api` bağlılığı doğurur; bridge domain'i analiz modelinden ayrı kalmalı. |
| Builder yeri | `analysis-api` | Portu davranışla kirletir (F-19 ile aynı sorun). |
| Denge hesabı | `FrameSolver` öz ağırlık kodunu yeniden kullanmak | Kontrolün bağımsızlığı (javadoc "independent equilibrium check") kaybolur. |
| Yük modülü | Tek `loads` modülünde birleştirmek | `traffic-loads` kapsamı belgeli (EN 1991-2), gereksiz taşıma olur. |
| Yük modülü | Rüzgâr, deprem ve sıcaklık için üç ayrı modül | Her biri 2–4 sınıf; gereksiz ek yük. |
| `materials` | `bridge-core` içine koymak | `model-builder -> bridge-core` gereksiz bağlılığı. |
| `shared` / `Length` değer nesnesi | Şimdi eklemek | R9'da "tutulabilir" deniyor, zorunlu değil. Çok sayıda imzayı değiştirir. Kapsam modül/paket düzeni. |
| Ortak `api` paketleri | `shared/{config,error,observability}` altına taşımak | Ek değer yok, test churn'ü var. |
| Mimari test aracı | ArchUnit / `maven-enforcer` | Yeni bağımlılık. Mevcut plain JUnit tarayıcısı genişletilir. |
| Port enum'ları | Tüm MIDAS tipleri (STEEL, SRC, L …) | Kullanılmayan değer eklemek erken kapsam. Yalnızca kullanılanlar eklenir. |
| Örnekleme | İki kuralı birleştirmek | U8 cevapsız; iki kural korunur. |

---

## 5. Sıralı uygulama görevleri (fazlar)

**Ortak kurallar (her faz için):**
- Dosya taşımaları `git mv` ile yapılır. Taşınan dosyalarda yalnızca package/import satırları ve fazda açıkça listelenen değişiklikler yapılır; bu, rename tespitini ve blame'i korur.
- Her faz `docs/architecture.md` ve `docs/roadmap.md` içine "BACKEND-ARCHITECTURE Faz N" girdisi ekler. Roadmap'te `## BACKEND-ARCHITECTURE track` başlığı Faz 0'da açılır.
- Her faz tam build ile kapanır:
  ```
  export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
  MVN=/c/Users/cemha/.m2/wrapper/dists/apache-maven-3.9.16/0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0/bin/mvn
  "$MVN" -B -f backend/pom.xml clean package
  ```
- Odaklı testler `-pl <modül> -am test` ile çalıştırılır. `-Dtest=...` kullanılırsa `-Dsurefire.failIfNoSpecifiedTests=false` eklenir. `-o` kullanılmaz.
- **Geri alma:** Faz ayrı commit'lendiyse `git revert <faz-commit>`. Commit yoksa, fazın dosya listesi tersine uygulanır: `git mv` geri alınır, yeni modül dizini silinir, pom satırları geri alınır. Yıkıcı git komutu kullanılmaz.

### Faz 0 — Mimari korumanın sıkılaştırılması (üretim kodu değişmez)
- **`ModuleBoundaryTest.java`:**
  - Yeni `ALLOWED_INTERNAL_DEPENDENCIES` (modül → izinli iç bağımlılık kümesi) eklenir; başlangıçta bugünkü grafiği (§2.1) yansıtır.
  - Yeni test `everyModule_declaresExactlyItsAllowedInternalDependencies`: pom'daki iç bağımlılıklar kümeye **eşit** olmalı ve reaktördeki her modül haritada bulunmalı.
  - Yeni sentetik test: haritada olmayan modül veya fazla kenar hata verir.
- **`ModuleBoundaryRules.java`:**
  - `MIDAS_FREE_MODULES` sabit kümesi, "`midas-adapter` ve `api` dışındaki her modül" kuralına çevrilir (`isMidasFree(String module)`).
  - Mevcut sentetik test `scanner_flagsMidasInTheMidasFreeModules_only` aynen geçer; `analysis-api` için yeni sentetik assert eklenir.
- **AC:** AC1, AC7 (mevcut grafikle).

### Faz 1 — `api` paket düzeni: saf taşıma (R1)
- **Taşınacak main dosyaları:**
  - `alignment/{AlignmentController, AlignmentSampleRequest, AlignmentSamplePoint}` → `alignment/api/`
  - `alternatives/{AlternativeGenerationController, AlternativeRow}` → `alternatives/api/`
  - `fastsolver/*` (8 dosya) → `fastsolver/api/`
  - `kernel/{KernelStateController, KernelStateRequest, KernelStateResponse}` → `kernel/api/`
  - `landxml/{LandXmlController, LandXmlInspectResponse, LandXmlImportSummaryResponse, LongitudinalProfilePoint}` → `landxml/api/`
  - `layout/*` (6 dosya) → `layout/api/`
  - `materials/ConcreteMaterialController` → `materials/api/`
  - `terrain/*` (5 dosya) → `terrain/api/`
  - `trafficloads/{TrafficLoadsController, TrafficResolveRequest, TrafficResolveResponse}` → `trafficloads/api/`
  - `trafficloads/{WindLoadsController, SeismicSpectrumController, UniformTemperatureController}` → `environmentalloads/api/`
- **Test taşımaları** (yalnızca package satırı ve dizin):
  - `alternatives/AlternativeGenerationControllerTest` → `alternatives/api/`; ayrıca `KernelStateRequest` import'u güncellenir.
  - `kernel/KernelStateControllerTest` → `kernel/api/`
  - `layout/LayoutGenerationControllerTest` → `layout/api/`
  - `materials/ConcreteMaterialControllerTest` → `materials/api/`
  - `terrain/{TerrainBinaryWriterTest, BentleyProductionTerrainTest}` → `terrain/api/`
  - `fastsolver/FastSolverModelBuilderTest` → `fastsolver/api/`
- `CoreConfiguration` import'ları güncellenir. `{@link}` javadoc metinleri düzeltilir.
- **Yeni:** `api/src/test/.../architecture/ApiLayeringTest.java` (§3.2 kuralları 1–3) ve sentetik testleri.
- **AC:** AC1–AC4, AC16.

### Faz 2 — Framework'süz yardımcıların sahibi olan modüllere taşınması (F-13, R5)
- `git mv` `api/.../alignment/application/ChainageSampler.java` → `backend/alignment/src/main/java/com/kopruq/alignment/ChainageSampler.java`. Gövde aynı kalır.
- `ChainageSamplerTest` → `backend/alignment/src/test/java/com/kopruq/alignment/` (package satırı değişir).
- **Yeni:**
  - `backend/terrain/.../LocalCoordinates.java` ve `LocalCoordinatesTest`;
  - `TerrainModel.countBoundaries(String)`, `LandXmlSurface.countBoundaries(String)` ve her biri için birim testi.
- `TerrainMeshResponse`, `TerrainController.diagnostics`, `LandXmlInspectResponse`, `LandXmlImportSummaryResponse` bu yardımcıları kullanır. `TerrainBinaryWriter` inline kalır ve javadoc notu eklenir.
- `CoreConfiguration`, `AlignmentController` ve `LandXmlController` import'ları güncellenir.
- **Pom değişmez** (alignment ve terrain'in yeni bağımlılığı yok).
- **AC:** AC1, AC5 (kısmi), AC14, AC16.

### Faz 3 — `api` application servisleri; controller'lar yalnızca eşleme (R2)
- **Yeni sınıflar:**
  - `alignment/application/AlignmentSamplingService` + `AlignmentSample`
  - `landxml/application/LandXmlImportQueries`, `LongitudinalProfileService` + `ProfileSample`
  - `terrain/application/TerrainImportUseCase`, `TerrainReadService`
  - `trafficloads/application/TrafficResolveUseCase` + `TrafficResolution`
- **İstek eşlemesi:** düz alignment kurulumu `AlignmentSampleRequest.toAlignment()` içine taşınır (`KernelStateRequest` deseni).
- Controller'lar yeni servisleri kullanır. `CoreConfiguration`'a `@Bean`'ler eklenir.
- **Yeni testler** (plain JUnit, api): her servis için. `LongitudinalProfileService` için mevcut `LandXmlTerrainContractTest` beklentileri dışında, kotların `ChainageSampler.forProfile` çıktısıyla bire bir eşleştiği karakterizasyon testi eklenir.
- **AC:** AC1, AC2, AC4, AC5.

### Faz 4 — `materials` modülü (F-19)
- **Yeni:** `backend/materials/pom.xml` (parent, `artifactId=materials`, bağımlılık yok) ve `package-info.java`.
- `git mv` `analysis-api/.../EurocodeConcrete.java` → `materials/.../com/kopruq/materials/EurocodeConcrete.java`; `EurocodeConcreteTest` de aynı şekilde.
- **Yeni:** `ConcreteStrengthClasses` + `ConcreteStrengthClassesTest` (14 kimlik, bilinmeyen kimlik, ayrıştırma).
- `backend/pom.xml` modül listesine `materials` eklenir; `api/pom.xml`'e `materials` bağımlılığı eklenir.
- `ConcreteMaterialController` ve `FastSolverModelBuilder` (hâlâ api'de) import'ları; `FastSolverRequest` javadoc linki güncellenir.
- `ModuleBoundaryTest` haritası: `materials: {}`, `api: +materials`.
- **Test değişikliği:** `ConcreteMaterialControllerTest` import'u (`com.kopruq.analysis.EurocodeConcrete` → `com.kopruq.materials.EurocodeConcrete`).
- **AC:** AC1, AC6, AC12.

### Faz 5 — `environmental-loads` modülü (F-08)
- **Yeni:** `backend/environmental-loads/pom.xml` (bağımlılık yok) ve `package-info.java`. Kapsam metni: rüzgâr, deprem spektrumu ve sıcaklık; provenans açık (B3); Spring yok.
- `git mv` 10 main dosya `traffic-loads` → `environmental-loads/.../com/kopruq/environmentalloads/`:
  - `WindLoadsService`, `WindRequest`, `WindResult`
  - `SeismicSpectrumService`, `SeismicSpectrumRequest`, `SeismicSpectrumResult`
  - `UniformTemperatureService`, `UniformTemperatureRequest`, `UniformTemperatureResult`
  - `TemperatureMaterialCase`
- 3 test aynı şekilde taşınır: `WindLoadsServiceTest`, `SeismicSpectrumServiceTest`, `UniformTemperatureServiceTest`.
- İki tek satırlık record dosyası (`SeismicSpectrumRequest`, `SeismicSpectrumResult`) içerik olarak aynen taşınır; yalnızca package değişir.
- Pom: `backend/pom.xml` modül listesi ve `api/pom.xml` bağımlılığı. `CoreConfiguration` ve 3 controller import'ları güncellenir.
- `ModuleBoundaryTest` haritası güncellenir.
- **AC:** AC1, AC6, AC13.

### Faz 6 — Kural değerlendirmesinin `generative-engine`'e taşınması
- **Yeni:** `generative/EvaluatedAlternative.java`, `generative/EvaluatedAlternativeGenerator.java` ve `EvaluatedAlternativeGeneratorTest`:
  - boş `RuleEngine` ile sonuç sayısı ve sırası `generate` ile aynı, hepsi feasible;
  - satır içi yazılmış, başarısız dönen bir test `EngineeringRule` ile ilgili alternatif `feasible=false`.
- `CoreConfiguration` bean'i; `AlternativeGenerationController(EvaluatedAlternativeGenerator)`.
- **`ModuleBoundaryTest`:** `KNOWN_UNUSED_EDGES = Set.of()`. Mekanizma ve yorum, gelecekteki kullanım için korunur.
- **Test değişikliği:** `AlternativeGenerationControllerTest` iki kurucu satırı `new AlternativeGenerationController(new EvaluatedAlternativeGenerator(new AlternativeGenerator(), new RuleEngine()))` olur ve import eklenir. Assert'ler aynen kalır.
- **AC:** AC1, AC8.

### Faz 7 — Analiz portu sözlüğü ve birimleri (F-06 / F-14)
- **analysis-api:**
  - yeni `MaterialKind`, `LoadCaseKind`;
  - `AnalysisMaterial` ve `LoadCase` imzaları §3.3'teki gibi;
  - `AnalysisSection`, `SolidRectangleSection`, `ISection`, `SolidCircularSection`, `AnalysisRequest`, `SelfWeight`, `AnalysisEngine` ve `package-info` javadoc'larından MIDAS sözlüğü çıkarılır, birim sistemi eklenir. `AnalysisEngine:5-7` yön hatası (F-12 notu) da düzeltilir.
- **midas-adapter:**
  - yeni `MidasVocabulary` + `MidasVocabularyTest`;
  - `MidasModelBuilder` `MidasVocabulary` ve yeni erişimcileri kullanır;
  - `MidasModelBuilder` javadoc'una MIDAS şekil kodu ve "oturum kN/m olmalı" notu eklenir.
- **analysis-engine:** `FrameSolver` erişimci adları güncellenir.
- **api:** `FastSolverModelBuilder` → `MaterialKind.CONCRETE`, `LoadCaseKind.DEAD`; `FastSolverController` → `weightDensityKnPerM3()`.
- **Test değişiklikleri** (yalnızca kurucu argümanı ve import; beklenen JSON ve sayılar aynı kalır):
  - `analysis-engine`: `KopruqAnalysisEngineTest` (`:37,40,58`), `FrameSolverValidationTest` (`:32,45,94,141`), `FrameSolverTest` (`:49,52,77,80,115,118`).
  - `midas-adapter`: `MidasModelBuilderTest` (`:32,37`), `MidasCivilNxAnalysisEngineTest` (`:39,44`), `MidasAdapterContractTest` (`:40,43`).
  - Dönüşümler: `"CONC"→MaterialKind.CONCRETE`, `"D"→LoadCaseKind.DEAD`, `"W"→LoadCaseKind.WIND`.
- **Pom değişmez.**
- **AC:** AC1, AC10, AC11, AC19.

### Faz 8 — `model-builder` modülü ve FastSolver application servisi (F-05)
- **Yeni modül:** `backend/model-builder/pom.xml` (analysis-api, materials) ve `package-info.java`. Yazılı modelleme basitleştirmeleri `FastSolverModelBuilder` javadoc'undan aynen taşınır.
- **Taşıma/yeni dosyalar** (`com.kopruq.modelbuilder`):
  - `git mv` `api/.../fastsolver/api/NamedNode.java` → `NamedNode.java`
  - `git mv` `api/.../fastsolver/api/FastSolverModel.java` → `FrameBridgeModel.java` (tip adı değişir)
  - yeni `FrameBridgeInput.java`, `FrameBridgeModelBuilder.java`, `AppliedLoadSummary.java`
- **api:**
  - `fastsolver/api/FastSolverModelBuilder` doğrulama, eşleme ve delegasyona indirgenir. `validate` gövdesi, alan adları ve mesajlar aynı kalır. No-arg kurucu korunur; domain builder'ı alan olarak tutar.
  - Yeni `fastsolver/application/{FastSolverService, FastSolverOutcome}`.
  - `FastSolverController` yalnızca eşleme yapar.
  - `CoreConfiguration` içinde `fastSolverService(KopruqAnalysisEngine)`.
- **Pom:** `backend/pom.xml` modül listesi, `api/pom.xml` bağımlılığı. Harita: `model-builder: {analysis-api, materials}`, `api: +model-builder`.
- **Yeni testler:**
  - `FrameBridgeModelBuilderTest`: 5 açıklıklı topoloji; tek açıklık; `"C30"` adı; SDL `-10.0`.
  - `FrameBridgeInputTest`: invariant'lar.
  - `AppliedLoadSummaryTest`: 5 açıklıklı örnek için `96025.0` (göreli 1e-9; mevcut contract snapshot'ından alınır, yeni mühendislik değeri değildir) ve dikdörtgen dışı kesitte istisna.
  - `FastSolverServiceTest` (api, sahte `AnalysisEngine`): eksik reaksiyonda `FAILED` + `"The solver returned no reaction for support C1"`; COMPLETED dışı durum ve mesajın aynen geçmesi; toplamların contract değerleriyle eşleşmesi.
- **Test değişikliği:** `FastSolverModelBuilderTest`: import'lar (`com.kopruq.modelbuilder.FrameBridgeModel`, `NamedNode`) ve `:59` satırında `FastSolverModel` → `FrameBridgeModel` tip adı. Assert'ler aynı.
- **AC:** AC1, AC2, AC5, AC6, AC9.

### Faz 9 — Kapanış
- `docs/architecture.md`: modül grafiği tablosu, `api` paket düzeni, kural motoru kararı, port birim sistemi ve P07 MIDAS notları (WIND eşlemesi, oturum birimi).
- `docs/roadmap.md`: track özeti.
- Eskimiş yorumlar düzeltilir: `SharedRepositoriesConfig` javadoc'undaki `new X()` metni, `api/pom.xml` yorumu.
- Tam build ve §7'deki grep/diff kontrolleri.
- **AC:** AC15–AC21.

**Faz bağımlılıkları:** 0 → 1 → 2 → 3. 4, 5 ve 6 için Faz 1 yeterli. 7 için Faz 4 önerilir. 8 için 4 ve 7 gerekir. 9 en sondadır. Uygulama sırası 0–9 ardışık olmalıdır.

---

## 6. Kabul kriterleri

- **AC1.** Her fazın sonunda `"$MVN" -B -f backend/pom.xml clean package` → BUILD SUCCESS, 0 failure, 0 error, skipped=1 (`BentleyProductionTerrainTest`). Toplam test sayısı ≥ 326 ve bir önceki fazdan küçük değil.
- **AC2.** `backend/api/src/test/java/com/kopruq/api/contract/` altındaki dosyalar `1646245`'e göre byte düzeyinde değişmemiş ve tümü geçiyor. Buna `EndpointInventoryContractTest` (21 endpoint) ve `FastSolverContractTest` snapshot'ı (göreli 1e-9) dahil.
- **AC3.** `ControllerLayeringTest` değişmeden geçiyor (12 controller, `@CrossOrigin` yok, `new` ile kurulan collaborator yok).
- **AC4.** `ApiLayeringTest` geçiyor:
  - tüm `@RestController`'lar `com.kopruq.api.<feature>.api` içinde;
  - `application` paketlerinde Spring, jakarta veya `.api.` katmanı import'u yok;
  - düz feature paketinde main sınıf yok.
- **AC5.** Controller'larda domain hesabı veya orkestrasyon döngüsü kalmamış:
  - `FastSolverController`'da `AnalysisNode`/`AnalysisMaterial` haritası ve `Math.sqrt` yok;
  - `AlignmentController` ve `LandXmlController`'da `chainageSampler.` ve `toXYZ` döngüsü yok;
  - `TerrainController`'da `repository.save` ve konum döngüsü yok;
  - `ConcreteMaterialController`'da kimlik kümesi ve `substring` yok;
  - `TrafficLoadsController.resolve` tek use-case çağrısı.
- **AC6.** `materials`, `environmental-loads` ve `model-builder` modülleri reaktörde. Her birinin kendi `src/test` birim testleri var ve Spring bağımlılığı yok (`onlyApiDependsOnSpring` geçiyor). Paket kökleri `materials`, `environmentalloads`, `modelbuilder`.
- **AC7.** Tüm pom iç bağımlılıkları §3.1 tablosuna eşit. `ModuleBoundaryTest.ALLOWED_INTERNAL_DEPENDENCIES` bunu birebir sabitliyor. MIDAS import yasağı `midas-adapter` ve `api` dışındaki tüm modüllere uygulanıyor.
- **AC8.** `KNOWN_UNUSED_EDGES` boş. `generative-engine` main kodu `com.kopruq.rules` import ediyor. `/api/alternatives` yanıtı aynı: contract testleri ve `AlternativeGenerationControllerTest` assert'leri değişmeden geçiyor.
- **AC9.** Portal çerçeve topolojisi ve denge hesabı yalnızca `model-builder` içinde. `backend/api` main kodunda `new AnalysisNode(` ve `new AnalysisElement(` geçmiyor.
- **AC10.** `analysis-api` main kodunda `"CONC"`, `"D"` veya MIDAS şekil kodu (`"SB"`, `"H"`, `"SR"`) string'i yok. `AnalysisMaterial.kind` tipi `MaterialKind`, `LoadCase.kind` tipi `LoadCaseKind`. `"CONC"` ve `"D"` literal'leri main kodda yalnızca `midas-adapter`'da. `MidasModelBuilderTest`'in beklenen JSON metinleri değişmemiş ve geçiyor.
- **AC11.** `AnalysisMaterial` bileşenleri birim soneki taşıyor. `analysis-api` `package-info` birim sistemini açıkça yazıyor. Port javadoc'larında "solver session" birim ifadesi kalmamış.
- **AC12.** `EurocodeConcrete` yalnızca `com.kopruq.materials` içinde. `/api/materials/concrete` yanıtı ve 404 davranışı aynı (`ConcreteMaterialControllerTest` assert'leri değişmeden geçiyor).
- **AC13.** Rüzgâr, deprem ve sıcaklık sınıfları yalnızca `environmental-loads` içinde. `traffic-loads` main kodunda `Wind`, `Seismic` veya `Temperature` adlı sınıf yok. `LoadsContractTest` değişmeden geçiyor.
- **AC14.** İki örnekleme kuralı korunuyor: `ChainageSamplerTest` alignment modülünde, yalnızca package satırı değişmiş halde geçiyor.
- **AC15.** Hiçbir mühendislik literal'i değişmemiş. Taşınan dosyalarda `git diff -M 1646245` yalnızca package/import satırlarını ve faz listesinde adı geçen değişiklikleri gösteriyor. `WindLoadsService`, `SeismicSpectrumService`, `UniformTemperatureService` ve `EurocodeConcrete` gövdeleri aynı.
- **AC16.** Test değişiklikleri yalnızca §5'te listelenenler. Mevcut assert'lerin hiçbiri silinmemiş veya değiştirilmemiş. Mimari testlerdeki eklemeler (Faz 0, 1, 6) dışında mevcut test mantığı aynı.
- **AC17.** `git diff --stat 1646245 -- frontend` boş.
- **AC18.** Pom diff'inde yalnızca `com.kopruq` iç modül bağımlılıkları ve `<module>` satırları var; yeni harici `groupId` yok.
- **AC19.** MIDAS'a giden JSON değişmemiş. `MidasVocabularyTest` ile doğrulanıyor: `CONCRETE→"CONC"`, `DEAD→"D"`, `WIND→UnsupportedOperationException`.
- **AC20.** `docs/architecture.md` ve `docs/roadmap.md` her faz için "BACKEND-ARCHITECTURE Faz N" girdisi içeriyor. Modül grafiği tablosu güncel.
- **AC21.** Yeni REST endpoint ve kalıcılık bağımlılığı yok (AC2 envanteri ve AC18).

---

## 7. Doğrulama matrisi

Bash ortamı §5'teki gibidir. `$B=1646245`.

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | `"$MVN" -B -f backend/pom.xml clean package` (her faz) | BUILD SUCCESS; surefire özeti 0 F / 0 E / 1 skipped; toplam ≥ önceki |
| AC2 | `git diff --stat $B -- backend/api/src/test/java/com/kopruq/api/contract` ve `"$MVN" -B -f backend/pom.xml -pl api -am test -Dtest='*ContractTest' -Dsurefire.failIfNoSpecifiedTests=false` | diff boş; testler yeşil |
| AC3, AC4, AC7, AC8 | `-pl api -am test -Dtest='ModuleBoundaryTest,ControllerLayeringTest,ApiLayeringTest' -Dsurefire.failIfNoSpecifiedTests=false` | Yeşil; sentetik testler kuralların yakaladığını gösteriyor |
| AC5, AC9 | Grep: `backend/api/src/main` içinde `new AnalysisNode\(`, `Math.sqrt`, `chainageSampler\.`, `repository.save`, `SUPPORTED_MATERIAL_IDS` | Eşleşme yok (`landxml/application/LandXmlImportUseCase` içindeki save'ler hariç) |
| AC6 | `-pl materials,environmental-loads,model-builder -am test` ve `onlyApiDependsOnSpring` | Yeşil |
| AC10 | Grep `"CONC"\|"D"\|"SB"\|"SR"` → `backend/*/src/main`; ayrıca `-pl midas-adapter -am test` | Main'de yalnızca `midas-adapter` eşleşiyor; JSON testleri yeşil |
| AC11 | `analysis-api` main'de `session` grep'i; `AnalysisMaterial.java` okunur | Eşleşme yok; sonekler mevcut |
| AC12, AC13 | `-pl api -am test -Dtest='ConcreteMaterialControllerTest,LoadsContractTest'`; `traffic-loads` main'de `Wind\|Seismic\|Temperature` dosya adı glob'u | Yeşil; dosya yok |
| AC14 | `-pl alignment -am test -Dtest=ChainageSamplerTest` | Yeşil |
| AC15 | `git diff -M --stat $B -- backend` (rename satırları) ve taşınan dosya başına `git diff -M $B -- <yol>` | Rename'ler tespit ediliyor; diff yalnızca package/import (veya listelenen) satırlarda |
| AC16 | `git diff -M $B -- 'backend/**/src/test/**'` | Yalnızca §5'teki dosyalar; assert satırı silinmemiş |
| AC17 | `git diff --stat $B -- frontend` | Boş |
| AC18, AC21 | `git diff $B -- 'backend/**/pom.xml'` | Yalnızca `com.kopruq` bağımlılıkları ve `<module>` satırları |
| AC19 | `-pl midas-adapter -am test -Dtest='MidasVocabularyTest,MidasModelBuilderTest'` | Yeşil |
| AC20 | `docs/architecture.md` ve `docs/roadmap.md` içinde `BACKEND-ARCHITECTURE` grep'i | Her faz için bir girdi |

**Bilinmeyenler:**
- Fazlara göre kesin test sayıları önceden bilinmiyor; her fazda raporlanacak.
- Canlı MIDAS doğrulaması bu planda gerekmiyor, çünkü gönderilen JSON değişmiyor.
- Frontend'in 26 vitest hatası mevcut ve kapsam dışı; frontend build'i bu feature için çalıştırılmayacak, çünkü frontend dokunulmuyor.

---

## 8. Riskler

- **Büyük taşıma ve blame/history:** Yaklaşık 50 dosya taşınıyor. `git mv` kullanılır ve taşıma ile düzenleme aynı fazda minimal tutulur. `NamedNode` gibi çok küçük dosyalarda package değişikliği benzerliği %50 altına düşürebilir; bu durumda `git log --follow -M30%` kullanılır. Bu durum raporlanır.
- **Merge çakışması:** Mevcut dal `codex/landxml-terrain-import`, ve `api/landxml` ile `terrain` paketleri bu planın taşıdığı yerler. Workflow gereği ayrı bir dal veya worktree önerilir. Paralel çalışan dallarda yol değişikliği çakışma yaratır. Faz 1 mümkün olduğunca erken ve tek seferde birleştirilmelidir.
- **Spring bean çözümü:** `FastSolverService` `AnalysisEngine` arayüzünü alır, ancak bean `CoreConfiguration` içinde `KopruqAnalysisEngine` ile açıkça kurulur. P07'de ikinci bir `AnalysisEngine` bean'i eklenince belirsizlik oluşmaz. Component scan `com.kopruq.api` altını taradığı için taşınan controller'lar bulunur; EndpointInventory ile doğrulanır.
- **JSON sözleşmesi:** Taşınan record'larda bileşen değişmez. Domain record'lara eklenen `countBoundaries(String)` parametreli olduğu için Jackson tarafından serileştirilmez. `TerrainModel` ve `LandXmlSurface` doğrudan serileştirilmiyor (doğrulandı). Contract testleri koruyucu ağdır.
- **Kayan nokta özdeşliği:** Denge toplamı, `fz` toplamı ve local-origin çıkarmaları işlem sırası değiştirilmeden taşınır. `FastSolverContractTest` (1e-9) ve `ChainageSamplerTest` (bit düzeyinde) korur.
- **Davranış farkları (bilinçli ve REST'ten erişilemez):**
  - `AppliedLoadSummary` dikdörtgen dışı kesitte istisna atar (önceden sessiz 0).
  - `MidasVocabulary` WIND için istisna atar (önceden `"W"` aynen geçiyordu); MIDAS yolu REST'e bağlı değil.
  - `FrameBridgeInput` invariant'ları api doğrulamasından sonra çalışır.
  - Bu üçü veto edilebilir (A3, A4).
- **Port API kırılması:** `AnalysisMaterial` ve `LoadCase` imzaları değişir. Tek tüketiciler repo içindeki `analysis-engine`, `midas-adapter` ve `api`; harici tüketici yok.
- **Mühendislik güvenliği:** Hiçbir literal taşıma dışında değişmez. Yeni enum değerleri yalnızca var olan kullanımları adlandırır. Birim sistemi zaten belgelenmiş olanı yazar: `EurocodeConcrete` "SI (m, kN)", `ElasticLinkElement` ve `docs/architecture.md:730-735` kN·m/rad.
- **Auth/veri:** Kimlik doğrulama yok, kalıcı veri yok. In-memory repository paylaşımı (`SharedRepositoriesConfig`) aynı bean'lerle korunur.
- **Geri alma:** Fazlar arası build yeşil kalır. Bir faz başarısızsa yalnızca o faz geri alınır. Faz 7 çok modüllü olduğu için tek commit halinde geri alınmalıdır.

---

## 9. Varsayımlar ve açık sorular

### Doğrulanmış gerçekler ile varsayımlar arasındaki ayrım
§2'deki tüm yol ve satır numaraları dosyalar okunarak doğrulandı. Komut çalıştırılmadı. Baseline test sayısı (326, 1 skipped) koordinatörün bildirdiği değerdir.

### Varsayımlar (veto edilebilir; itiraz yoksa plan bunlarla uygulanır)
- **A1. Kural motoru kararı:** Değerlendirme `generative-engine` içindeki `EvaluatedAlternativeGenerator`'da yapılır (referans R5/R12). Sıfır kural olduğu için davranış değişmez ve bu bir mühendislik kararı değildir. Alternatif B (api application servisi + kenarı silmek) §4'te belgelendi.
- **A2. Test değişikliklerinin "mekanik" sayılması:** Paket/import dışındaki tek test değişiklikleri:
  - Faz 6: `AlternativeGenerationControllerTest` kurucu kablolaması;
  - Faz 7: altı testte `"CONC"`/`"D"`/`"W"` → enum argümanı;
  - Faz 8: `FastSolverModelBuilderTest:59` satırında `FastSolverModel` → `FrameBridgeModel` tip adı.
  - Assert değişmez. İstenirse Faz 8'deki tip adı değişikliğinden kaçınmak için domain tipi `FastSolverModel` adıyla taşınabilir.
- **A3.** `AppliedLoadSummary` desteklenmeyen kesitte istisna atar (F-05 onarım önerisi). REST'ten erişilemez.
- **A4.** `LoadCaseKind.WIND` için MIDAS eşlemesi doğrulanana kadar `midas-adapter` istisna atar. MIDAS oturum birimi çağrısı eklenmez; P07'de canlı doğrulama ile ele alınır.
- **A5.** Plan onayı (`/feature-implement backend-architecture`), CLAUDE.md'nin milestone onayı ve yeni üç modülün onayı yerine geçer (kullanıcı kararı).
- **A6.** Commit politikası: workflow otomatik commit'i yasaklıyor. Faz bazlı geri alma için kullanıcının her fazdan sonra commit'e izin vermesi önerilir. İzin verilmezse geri alma, faz dosya listesinin tersine uygulanmasıyla yapılır.
- **A7.** Feature, ayrı bir dalda veya worktree'de çalıştırılmalıdır (mevcut dal `codex/landxml-terrain-import`). Koordinatör, kullanıcıya dal değişikliği isteyip istemediğini sormalıdır; dal değişikliği ancak açık istekle yapılır.

### Açık sorular
Engelleyici soru yok. A1–A7 varsayılan olarak uygulanır. Davranış kararı gerektiren hiçbir mühendislik konusu bu planda açılmadı. B1–B4, U6, U8 ve E1–E11 kapsam dışında ve dokunulmuyor.

**READY**
