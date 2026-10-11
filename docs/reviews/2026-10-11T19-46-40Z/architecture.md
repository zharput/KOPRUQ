# Mimari İnceleme — `backend` (phase=architecture)

> project-reviewer (phase=architecture) raporu; koordinatör tarafından kaydedildi.

- **Kök:** `C:\Users\cemha\repos\KOPRUQ` · **HEAD:** `bdca6d8b5704392e36621f12d4d3cdd740d381c3` · **Parmak izi:** `cee2560eea5506ddecdb7edc45ca0f65f47d8b08829efe5b4bb1182c83fb5980` (232 dosya, hepsi metin; `target/` hariç)
- **Mimari hedef:** `docs/architecture/backend-reference.md` (R1–R16 + "KOPRUQ'a uyarlama"); çakışmada CLAUDE.md geçerli.
- **Analyzer:** yok, hiçbir şey çalıştırılmadı (`analyzers/README.md`). Bulgular kaynak okumasına dayanır.
- **Bağlam:** workflow/config/project-context, `backend-reference.md`, `docs/roadmap.md` (625-694), `docs/architecture.md` (680-739 + arama), `docs/ARCHITECTURE_AMENDMENT_V2.md` (arama).

## 1. Mimari harita

### 1.1 Modüller: pom vs kaynak import'ları
Kaynak import'ları `**/src/main/**/*.java` üzerinde `^import com.kopruq.` aramasıyla (anahtar kelime araması; tam okuma değil) ve fully-qualified kullanım kontrolüyle çıkarıldı.

| Modül | Pom iç bağımlılıkları | Kaynakta kullanılan | Not |
|---|---|---|---|
| spatial-core | — | — | `Point3D`, `CoordinateSystem` |
| alignment | spatial-core | spatial-core | |
| terrain | spatial-core, jts-core 1.20.0 | spatial-core, JTS | JTS public API'ye sızmıyor |
| landxml-import | spatial-core, alignment, terrain | üçü | ACL rolü |
| traffic-loads | — | — | Rüzgâr/deprem/sıcaklık da burada (F-08) |
| constraints | — | — | `NoPierZone` |
| bridge-layout | alignment, constraints | ikisi | |
| bridge-core | — | — | |
| rules-engine | bridge-core | bridge-core | |
| generative-engine | bridge-core, rules-engine | yalnızca bridge-core | rules-engine main'de kullanılmıyor (tasarım notu) |
| analysis-api | bridge-core | **hiçbiri** | Kullanılmayan (F-12) |
| analysis-engine | analysis-api | analysis-api | |
| midas-adapter | bridge-core, analysis-api, jackson-databind | analysis-api, Jackson | bridge-core kullanılmıyor (F-12) |
| api (Spring) | 13 modülün hepsi | midas-adapter **hariç** hepsi | api→midas-adapter kullanılmıyor (F-12) |

- Döngü yok (DAG).
- `org.springframework|jakarta.|lombok` yalnızca `backend/api/**` ve `backend/pom.xml`'de → framework'süzlük (R3, CLAUDE.md) **bugün sağlanıyor**.
- `bridge-core` MIDAS/SCIA/ALLPLAN'a referans vermiyor; MIDAS kodu yalnızca `midas-adapter`'da.

### 1.2 REST uçları (`backend/api`, 12 controller, hepsi `@CrossOrigin("http://localhost:5173")`)
| Uç | Controller | Çağrı yolu |
|---|---|---|
| POST `/api/kernel-state` | `KernelStateController` | `KernelStateRequest.toBridge/toDesignSpace` → bridge-core |
| POST `/api/alternatives` | `AlternativeGenerationController` | `AlternativeGenerator` + `RuleEngine` |
| POST `/api/layout/generate` | `LayoutGenerationController` | `BridgeLayoutEngine` |
| POST `/api/alignment/sample`, GET `/api/alignment/{id}/sample` | `AlignmentController` | `Alignment.toXYZ` + `LandXmlImportRepository` |
| POST `/api/terrain/import`; GET `/{id}/mesh`, `/mesh.bin`, `/diagnostics`, `/elevation` | `TerrainController` | `TerrainImportService` / `TerrainQueryService` / `TerrainRepository` |
| POST `/api/landxml/inspect`, `/import`; GET `/{id}/profile` | `LandXmlController` | `LandXmlImportService` + 2 repository + `TerrainQueryService` |
| POST `/api/fast-solver/solve` | `FastSolverController` | `FastSolverModelBuilder` (api) → `KopruqAnalysisEngine` |
| GET `/api/materials/concrete` | `ConcreteMaterialController` | `EurocodeConcrete` (analysis-api) |
| GET `/api/traffic-loads/lm1-defaults`, `/load-groups`; POST `/resolve` | `TrafficLoadsController` | traffic-loads |
| POST `/api/seismic/spectrum` | `SeismicSpectrumController` | `SeismicSpectrumService` |
| POST `/api/wind-loads/resolve` | `WindLoadsController` | `WindLoadsService` |
| POST `/api/temperature/uniform/resolve` | `UniformTemperatureController` | `UniformTemperatureService` |

### 1.3 `api` paket yapısı (R1/R2)
Düz feature paketleri (`alignment`, `alternatives`, `config`, `fastsolver`, `kernel`, `landxml`, `layout`, `materials`, `terrain`, `trafficloads`); hiçbirinde `api/application/infra` ayrımı yok; `@Service` yok. Controller'lar domain sınıflarını `new` ile kuruyor; yalnızca iki repository `SharedRepositoriesConfig` ile bean. Request record'ları mapping yapıyor (`toBridge`, `toAlignment`), response record'ları statik `from(...)` taşıyor (R2'ye kısmen uygun).

### 1.4 Durum ve sahiplik
Paylaşılan değiştirilebilir durum: `InMemoryTerrainRepository`, `InMemoryLandXmlImportRepository` (`ConcurrentHashMap`, tahliye yok), `FastSolverController` tekil `KopruqAnalysisEngine` job map'i. Kalıcılık, transaction, revizyon kontrolü, loglama yok. `bridge-core/Project` değiştirilebilir ama api'de kullanılmıyor.

### 1.5 Hata ve doğrulama (R7/R8)
Global `@RestControllerAdvice` yok; `ControllerAdvice|ExceptionHandler|@Valid|Logger|MDC|Correlation` main kodda yok; üç hata stili (F-04).

## 2. Kritik yollar (kod fazı önceliği)
1. FastSolver: `FastSolverRequest` → `FastSolverModelBuilder.build` → `KopruqAnalysisEngine.submit` → `FrameSolver.solve` (yoğun `double[dof][dof]`) → `FastSolverController.totalAppliedLoad`.
2. Terrain/LandXML import: multipart (200MB) → `getBytes`/`getInputStream` → parser/mapper → in-memory repository; `/elevation`, `/profile` doğrusal üçgen taraması.
3. Yük servisleri: `SeismicSpectrumService`, `WindLoadsService`, `UniformTemperatureService`, `Lm1DefaultsFactory`.
4. Üretim: `AlternativeGenerator`, `BridgeLayoutEngine` (limit yok).
5. Analiz portu: `AnalysisRequest` + `MidasModelBuilder`, `RectangularSectionProperties`.

## 3. Doğrulanmış bulgular

### F-01 — Eksik primitive JSON alanları sessizce 0 olarak hesaplamaya giriyor
- **Kategori:** Doğrulama / mühendislik güvenliği (R8, R10) · **Önem:** CRITICAL · **Güven:** high (kod kesin; Jackson davranışı çalıştırılarak doğrulanmadı)
- **Kanıt:** `api/.../fastsolver/FastSolverRequest.java:19-32` tüm sayısal alanlar `double`; `KernelStateRequest.java:21-30`, `LayoutGenerationRequest.java:18-29`, `AlignmentSampleRequest.java:4-7` aynı; `FastSolverModelBuilder.java:51,58-60,123-124,130` kontrolsüz kullanıyor. Doğru örnek: `WindRequest.java:2`, `SeismicSpectrumRequest.java:1` kutulu `Double` + null kontrolü. `@Valid`/Bean Validation yok, elle kontrol yok.
- **Tetikleyici:** `sdlKnPerM`, `concreteFckMpa` veya `bearingKz` eksik `/api/fast-solver/solve` isteği.
- **Sonuç:** SDL=0 ya da fck=0'dan türetilen Ecm ile analiz `COMPLETED` dönebilir — mühendisin vermediği değerle sonuç (CLAUDE.md "never invent… no reasonable default"). Sıfır kesit/yay tekil matris → `FAILED`.
- **Kural:** `backend-reference.md` R8 uyarlaması; Bean Validation'ın çözeceği sorunu elle ve hatalı çözmek bulgudur.
- **Onarım:** Mühendislik girdisi alanlarını `Double`/`Integer`; `spring-boot-starter-validation` yalnızca `api`'ye (milestone onayıyla) + `@NotNull`/`@Positive`/`@Valid`; alternatif `FAIL_ON_NULL_FOR_PRIMITIVES` + `FAIL_ON_MISSING_CREATOR_PROPERTIES`.
- **Doğrulama:** `@WebMvcTest` ile `sdlKnPerM` eksik JSON → 400.

### F-02 — Deprem spektrumunda sessiz varsayılan tip ve kaynaksız sabitler
- **Kategori:** Mühendislik güvenliği (R10) · **Önem:** CRITICAL · **Güven:** high
- **Kanıt:** `traffic-loads/.../SeismicSpectrumService.java:1` (tüm sınıf tek satır): `r.spectrumType()!=null&&r.spectrumType().equals("Type 2") ? {Tip 2} : {Tip 1}`; S/TB/TC/TD tabloları, 2.5 plato, 0..4 s / 0.01 adım gömülü; kaynak/birim/varsayım yok. η örtük 1.
- **Tetikleyici:** `spectrumType` null, `"type 2"` ya da tanınmayan değer → Tip 1 **sessizce**, sonuç `"VALID"`.
- **Sonuç:** Mühendise yanlış spektrum "VALID" gösteriliyor. `SeismicSpectrumService` için test yok (CLAUDE.md: birim, varsayım, kaynak, doğrulama örneği, otomatik test zorunlu).
- **Onarım:** Bilinmeyen/null tip → `INVALID` + mesaj; tabloları kaynak maddeli adlandırılmış sabitlere; mühendis onayı; tablo testleri.

### F-03 — `FastSolverController` içinde sınırsız büyüyen job map
- **Kategori:** Kaynak yönetimi · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `FastSolverController.java:38` tekil controller'da `new KopruqAnalysisEngine()`; `analysis-engine/.../KopruqAnalysisEngine.java:33,38,52,55` her `submit` sonucu `jobs` map'ine, `remove` yok; aynı desen `midas-adapter/.../MidasCivilNxAnalysisEngine.java:37,52,74,77`.
- **Sonuç:** Uzun çalışan API'de heap sürekli büyür, OOM.
- **Onarım:** `getResults` sonrası silmek ya da doğrudan `solve` API'si; tahliyeli `AnalysisJobManager`.

### F-04 — Tek hata sözleşmesi yok; iç mesajlar sızıyor
- **Kategori:** Hata yönetimi (R7, R14) · **Önem:** MAJOR · **Güven:** high
- **Kanıt (üç stil):**
  1. `ResponseStatusException`: `TerrainController.java:72-74,117-119`; `LandXmlController.java:65-66` **her `RuntimeException`** (NPE dahil) → 400, `:85-86`, `:102-107`; `AlignmentController.java:61-66`; `ConcreteMaterialController.java:24-32`.
  2. Yakalanmamış → Spring 500: `AlternativeGenerationController.java:33-44` (`AlternativeGenerator.java:36-44` IAE); `LayoutGenerationController.java:26-39` (`BridgeLayoutEngine.java:117-135`, `BridgeSite.java:13-17`); `FastSolverModelBuilder.java:39-41`; `WindLoadsService.java:8` null `terrainCategory` → NPE → 500.
  3. HTTP 200 + durum string'i: `FastSolverController.java:47-49` (`FAILED` + `e.getMessage()`); `SeismicSpectrumService.java:1`, `WindLoadsService.java:6-9` (`"INVALID"`).
  - `application.properties:12` `server.error.include-message=always` iç mesajları her 500'de istemciye taşıyor.
- **Sonuç:** Aynı hata uca göre 400/500/200; NPE 400 sınıflanıyor; frontend her uç için ayrı ayrıştırma; log yok.
- **Onarım:** Framework'süz kodlu istisna; `api`'de tek `@RestControllerAdvice` + `ErrorResponse(code, message, correlationId, errors)`; genel mesaj + içeride log; `include-message=always`'i kaldırmak; `catch RuntimeException`'ı daraltmak.

### F-05 — Yapısal modelleme ve denge hesabı Spring modülünde, kural tekrarıyla
- **Kategori:** Yanlış yerde iş mantığı (R2, R5; CLAUDE.md) · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `api/.../fastsolver/FastSolverModelBuilder.java:35-145` portal çerçeve topolojisi, ankastre mesnet, bearing elastik linkleri, malzeme türetimi, yük durumu; varsayımlar javadoc'ta (`:23-33`). `FastSolverController.java:80-122` öz ağırlığı yeniden hesaplıyor (`FrameSolver.java:75-84` tekrarı); yalnızca `SolidRectangleSection` (`:111-112`), diğer kesitlerde alan sessizce 0.
- **Sonuç:** Modelleme kararları Spring'siz yeniden kullanılamıyor; yeni kesit tipinde "denge kontrolü" sessizce yanlış.
- **Onarım:** Builder ve denge kontrolünü framework'süz modüle taşımak; desteklenmeyen kesitte istisna.

### F-06 — Analiz portu çözücüye özgü kavram taşıyor; adapter'lar sözleşmeyi farklı uyguluyor
- **Kategori:** Sızan soyutlama (R6 uyarlaması) · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `analysis-api/.../AnalysisMaterial.java:3-15` `type` MIDAS sözlüğü ("CONC"), birimler "oturuma bağlı"; `LoadCase.java:3-9` MIDAS yük tipi ("D"); `SolidRectangleSection.java:3`, `ISection.java:3-8`, `SolidCircularSection.java:3` MIDAS şekil kodları; `FastSolverModelBuilder.java:54,140` `"CONC"`, `"D"`; `midas-adapter/.../MidasModelBuilder.java:40-65` `elasticLinks` ve `uniformLoads`'ı **sessizce yok sayıyor**; `analysis-engine/.../RectangularSectionProperties.java:27-39` yalnızca dikdörtgen; `analysis-api/pom.xml:15-20` "No solver-specific type may appear here".
- **Sonuç:** Aynı port isteği MIDAS'ta mesnet ve SDL olmadan çözülür ve `COMPLETED` döner; malzeme değerleri farklı fiziksel anlam taşıyabilir.
- **Onarım:** Portta KOPRUQ enum'ları (`MaterialKind`, `LoadCaseKind`), çeviri `midas-adapter`'da; port birimlerini SI sabitlemek; desteklenmeyen öğede açık hata.

### F-07 — Hesaplama limiti yok
- **Kategori:** Doğrulama / kullanılabilirlik (R10 `GenerationLimits` karşılığı yok) · **Önem:** MAJOR · **Güven:** high (mekanizma); etki ölçülmedi
- **Kanıt:** `AlignmentController.java:70-84`, `LandXmlController.java:109-121` `stepM > 0` dışında alt sınır yok (`1e-9` → 10¹² iterasyon); `BridgeLayoutEngine.java:46-48,107-115,129-134`; `AlternativeGenerator.java:56`; `FrameSolver.java:50` `new double[dofCount][dofCount]`, `spanLengthsM` sınırsız; `application.properties:7-8` 200MB multipart; `TerrainController.java:64` tüm dosyayı `byte[]` + `String`.
- **Onarım:** Framework'süz `ComputationLimits` ("mühendislik eşiği değildir"); aşımda kodlu hata.

### F-08 — Rüzgâr, deprem, sıcaklık: belgesiz uçlar, yanlış modül, eksik testler
- **Kategori:** Modül sınırı / milestone kuralı / provenans · **Önem:** MAJOR · **Güven:** high (belge yokluğu aramayla); repo dışı onay bilinmiyor
- **Kanıt:** `traffic-loads/pom.xml:15-20`, `package-info.java:1-19` kapsamı EN 1991-2 trafik; ama `SeismicSpectrumService.java:1`, `WindLoadsService.java:1-16` (`:8` arazi tablosu, `:10-13` kr, 7·Iv, 1.25, cfx=1.3), `UniformTemperatureService.java:27` (`10e-6`, `12e-6`, sabit `"VALID"`); api'de `trafficloads` paketinde `SeismicSpectrumController`, `WindLoadsController`, `UniformTemperatureController`. `docs/`'ta (reviews hariç) bu uçlar hiç geçmiyor. `SeismicSpectrumServiceTest`, `WindLoadsServiceTest` yok. Sıcaklık katsayısı `EurocodeConcrete.java:25`'te de.
- **Sonuç:** CLAUDE.md milestone ve doküman kuralları ihlal; formüller kaynaksız/testsiz; modül adı yanıltıcı.
- **Onarım:** Mühendisle provenans; belgelemek; ayrı `environmental-loads`/onaylı `loads` modülü; doğrulama örneği testleri.

### F-09 — LM1 karakteristik değerleri: kod, belge ve test çelişiyor
- **Kategori:** Mühendislik güvenliği (R10) · **Önem:** MAJOR · **Güven:** medium
- **Kanıt:** `Lm1DefaultsFactory.java:23-26,30-31` 300/200/100 kN, 9/2.5 kN/m² `CODE_DEFAULT` dolu; `traffic-loads/package-info.java:4-5` "left unconfirmed pending the engineer"; `ParameterValue.java:3-9` "null when genuinely unconfirmed"; `TrafficLoadsService.java:28-31` uyarısı değerler dolu olduğu için hiç tetiklenmiyor; `docs/roadmap.md:647-650,686` "LM1 not resolved" bekleniyor; `TrafficLoadsServiceTest.java:16-25` `unconfirmedLm1` adlı değişkenle `lm1Resolved()==true` bekliyor.
- **Onarım:** Onayı belgelemek ve package-info/uyarı/testi güncellemek; yoksa null'a geri çekmek.

### F-10 — Kural yokken her alternatif `feasible=true`
- **Kategori:** Mühendislik güvenliği / sunum · **Önem:** MAJOR · **Güven:** medium (bilinçli ve belgeli)
- **Kanıt:** `RuleEngine.java:20-22,36` boş listede `allMatch` true; `AlternativeGenerationController.java:40-42`, `AlternativeRow.java:19-24`; `AlternativeGenerationControllerTest.java:31-38` sabitliyor.
- **Onarım:** `FEASIBLE`/`REJECT`/`NOT_EVALUATED` ya da `STRUCTURAL_CHECKS_NOT_CONFIGURED` uyarısı.

### F-11 — Sınırsız in-memory repository'ler
- **Kategori:** Paylaşılan durum / kaynak · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** `SharedRepositoriesConfig.java:30-38`; `InMemoryTerrainRepository.java:9-15`, `InMemoryLandXmlImportRepository.java:9-15` silme/kapasite/proje kapsamı yok; `BentleyProductionTerrainTest.java:28` 603.004 köşe, 1.087.885 üçgen; `LandXmlController.java:89-90` iki repository'ye atomik olmayan yazma.
- **Onarım:** Kalıcılık milestone'una kadar LRU/kapasite/`DELETE`; sonra R13.

### F-12 — Kullanılmayan Maven bağımlılıkları ve belgede yanlış yön
- **Kategori:** Bağımlılık yönetimi · **Önem:** MINOR · **Güven:** high
- **Kanıt:** `midas-adapter/pom.xml:32-36` (bridge-core), `analysis-api/pom.xml:22-28` (bridge-core), `api/pom.xml:43-47` (midas-adapter) kullanılmıyor; `docs/architecture.md:729-731` MIDAS'ın REST'e bağlanmadığını söylüyor; `AnalysisEngine.java:5-7` yanlış yön; `bridge-core/package-info.java:4-7` api'yi saymıyor.
- **Onarım:** Kaldırmak, javadoc'ları düzeltmek; `dependency:analyze` (çalıştırılmadı).

### F-13 — Controller'da orkestrasyon ve hesap tekrarları
- **Kategori:** Sorumluluk / tekrar (R1/R2) · **Önem:** MAJOR · **Güven:** high
- **Kanıt:** Örnekleme döngüsü iki farklı kuralla: `AlignmentController.java:70-84` (`L/20`, `<`, son nokta her zaman) vs `LandXmlController.java:109-121` (`L/50`, `<=`, koşullu). Local-origin dönüşümü üç yerde (iddia `TerrainMeshResponse.java:13-15`; `:34-39`, `TerrainBinaryWriter.java:13-18`, `TerrainController.java:102-109`). `"OUTER"`/`"VOID"` sayımı iki DTO'da (`LandXmlImportSummaryResponse.java:31-32`, `LandXmlInspectResponse.java:20-21`). Malzeme kimliği ayrıştırması ve MPa dönüşümü controller'da (`ConcreteMaterialController.java:19-37`). Import yazımı controller'da (`LandXmlController.java:89-90`).
- **Onarım:** Feature başına `application` paketi; ortak örnekleme/dönüşümü `alignment`/`terrain`'e; sınır tipini enum.

### F-14 — Birimler port ve API sınırında açık değil (R9)
- **Önem:** MAJOR · **Güven:** medium
- **Kanıt:** `AnalysisMaterial.java:5-9` "oturuma bağlı"; `FastSolverRequest.java:31-32` `bearingKx…Krz` birimsiz (dönel rijitlik belirsizliği `docs/architecture.md:722-728`); `SeismicSpectrumRequest.java:1` `agR` g mi m/s² mi belirsiz; `WindResult`/`SeismicSpectrumResult` birimsiz. İyi örnekler: `AnalysisNode.java:3`, `UniformElementLoad.java:9-10`, `ElasticLinkElement.java:14-16`.
- **Onarım:** Birim sonekleri/javadoc; port birimlerini SI sabitlemek.

### F-15 — Bean bağlama tutarsız, `new` ile kurulan servisler (R12)
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** `TerrainController.java:48-49`, `LandXmlController.java:50-51`, `AlternativeGenerationController.java:30-31`, `LayoutGenerationController.java:24`, `FastSolverController.java:37-38`, `TrafficLoadsController.java:36-38`, `SeismicSpectrumController.java:1`, `WindLoadsController.java:5`, `UniformTemperatureController.java:16`; yalnızca repository'ler bean (`SharedRepositoriesConfig.java:19-25`).
- **Onarım:** `api/config/CoreConfiguration` `@Bean` + constructor injection.

### F-16 — Gözlemlenebilirlik yok (R14)
- **Önem:** MAJOR · **Güven:** medium
- **Kanıt:** Main'de `Logger`/correlation yok; `KopruqAnalysisEngine.java:53-56`, `MidasCivilNxAnalysisEngine.java:75-78` istisnayı yalnızca mesaja çeviriyor, stack trace kaybolur; `application.properties:3` `health,info`.
- **Onarım:** `CorrelationFilter` (MDC + `X-Correlation-ID`); adapter'larda log; actuator yalnızca `health`.

### F-17 — Mimari kurallar otomatik denetlenmiyor (R3/R4)
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** ArchUnit/enforcer/mimari test yok; F-12 sapmanın başladığını gösteriyor.
- **Onarım:** Modül başına JUnit import izin listesi testi ya da (milestone onayıyla) ArchUnit / `maven-enforcer` `bannedDependencies`.

### F-18 — CORS her controller'da sabit
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** 12 controller'da `@CrossOrigin(origins="http://localhost:5173")` (`AlignmentController.java:42` … `WindLoadsController.java:4`; `KernelStateController.java:16-19` "revisit").
- **Onarım:** Tek `WebMvcConfigurer.addCorsMappings`, origin property'den.

### F-19 — `EurocodeConcrete` analiz port modülünde
- **Önem:** MINOR · **Güven:** high
- **Kanıt:** `analysis-api/.../EurocodeConcrete.java:19-56`; tüketiciler `ConcreteMaterialController.java:3`, `FastSolverModelBuilder.java:9`; katsayı tekrarı `UniformTemperatureService.java:27`.
- **Onarım:** Framework'süz `materials` modülü (milestone onayıyla).

## 4. Hipotezler
- **H-01:** `TerrainQueryService.java:20-34` her çağrıda tüm üçgenleri doğrusal tarıyor; javadoc "binlerce üçgen" varsayıyor, üretim testi 1,09 M üçgen. `/elevation`, `/profile` gecikmesi ölçülmeli.
- **H-02:** `TerrainController.java:64` ve `LandXmlParser` 200MB'a yakın dosyalarda heap baskısı.
- **H-03:** `FastSolverController.java:60-72` reaksiyon/deplasman bulunamazsa NPE (`FrameSolver.java:106-109,160-163` sessiz `continue`).
- **H-04:** Üç ayrı köprü temsili (`bridge-core`, `bridge-layout`, `FastSolverRequest`); adımlama tekrarı `AlternativeGenerator.java:88-96` vs `BridgeLayoutEngine.java:107-115`.
- **H-05:** `BridgeSite.java:14`, `BridgeLayoutEngine.java:118-135` NaN'ı reddetmiyor; sonuç boş liste.
- **H-06:** `LandXmlParser.java:42-45` DTD/harici varlıklar kapalı görünüyor; geri kalanı incelenmedi.

## 5. INFO
- `bridge-core/Project.java:19-85` setter'lı değiştirilebilir sınıf, api'de kullanılmıyor (kalıcılıkta R5/R13).
- R11 KOPRUQ için opsiyonel; domain'de record yaygın, ihlal sayılmadı.
- `KernelStateRequest.java:37-45` eksik alanları 0 ile dolduruyor (bilinmiyor vs sıfır belirsiz).
- api testleri controller'ları `new` ile kuruyor; `@WebMvcTest`/`@SpringBootTest` yok → JSON bağlama, hata eşleme, bean bağlama test edilmiyor.

## 6. Boşluk tablosu
| Kural | Mevcut durum | Kanıt | Uyarlama |
|---|---|---|---|
| R1 feature + katman | Modüllerle çizili; `api` düz, `application/infra` yok | §1.3 | api'de feature başına `api` + `application` |
| R2 ince controller | Kısmen; FastSolver, LandXml, Alignment, Terrain, ConcreteMaterial hesap/orkestrasyon içeriyor | F-05, F-13 | Use-case servisleri, hesabı framework'süz modüle |
| R3 domain framework'süz | **Sağlanıyor**, denetlenmiyor | §1.1, F-17 | Modül başına import testi |
| R4 algoritma izin listesi | Fiilen sağlanıyor; gereksiz pom bağımlılıkları | F-12 | `bannedDependencies` / test |
| R5 kural modelde | Modelleme api'de; rules boş | F-05, F-10 | Builder'ı domain modülüne |
| R6 port/adapter | Ayrım var; port MIDAS sözlüğü taşıyor | F-06 | KOPRUQ enum'ları, SI, açık hata |
| R7 tek hata sözleşmesi | Yok; üç stil; `include-message=always` | F-04 | Kodlu istisna + `@RestControllerAdvice` |
| R8 iki katmanlı doğrulama | Bean Validation yok; primitive 0 | F-01 | Validation yalnızca api'ye (milestone) |
| R9 SI | Çoğunlukla `…M`; port/bazı alanlar belirsiz | F-14 | Sonekler, port birimi |
| R10 varsayılan yok | Deprem sessiz varsayılanı, LM1, boş kural `feasible`, limit yok | F-02, F-07, F-09, F-10 | `ComputationLimits`, `NOT_EVALUATED`, provenans |
| R11 record yalnızca DTO | Uygulanmıyor (opsiyonel) | — | Not |
| R12 `@Configuration` | Yalnızca repository bean | F-15 | `CoreConfiguration` |
| R13 revizyon / atomik | Kalıcılık yok; atomik olmayan yazma | F-11 | Kalıcılık milestone'unda |
| R14 correlation / health | Yok; `health,info`; log yok | F-16 | Filtre + MDC + log |
| R15/R16 JPA/PostgreSQL/Compose | Yok — milestone kuralı gereği **bulgu değil**; in-memory store'lar sınırsız | F-11 | Onaylı milestone'da api'ye ya da ayrı persistence modülüne |

## 7. Kapsam
232 dosya: 138 full, 1 partial (`landxml-import/.../LandXmlParser.java`, yalnızca 42-45 arama), 93 not inspected (tüm `src/main` import satırları aranmış ama dosyalar okunmamış). Excluded yok.
- **Full (138):** `backend/pom.xml` + 14 modül pom'u; api 47/47 (39 main Java, `application.properties`, 6 test); analysis-api 24/24; analysis-engine 5/13 (pom, `FrameSolver`, `KopruqAnalysisEngine`, `RectangularSectionProperties`, `package-info`); midas-adapter 9/13 (pom + 8 main); bridge-core 6/16; bridge-layout 4/11; constraints 2/3; generative-engine 2/4; rules-engine 4/8; spatial-core 3/4; alignment 2/12; terrain 7/16; landxml-import 6/29; traffic-loads 16/31.
- **Not inspected (93):** alignment 10, analysis-engine 8, bridge-core 10, bridge-layout 7, constraints 1, generative-engine 2, landxml-import 22, midas-adapter 4 (testler), rules-engine 4, spatial-core 1, terrain 9, traffic-loads 15 (dosya adları ajan raporunda; kod fazı batch'lerinde okunacak).

Ara karar: doğrulanmış bulgular var (2 CRITICAL, 12 MAJOR, 5 MINOR); kapsam eksik → şimdilik INCOMPLETE.
