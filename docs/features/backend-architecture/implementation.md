# backend-architecture: uygulama raporu

**Sonuç: COMPLETE.** Faz 0–9 sırayla uygulandı. Son tam build yeşil, 367 test, 0 failure, 0 error, 1 skipped (BentleyProductionTerrainTest). İnceleme yapılmadı; durumu koordinatör belirler.

- Dal değiştirilmedi (`codex/landxml-terrain-import`). Commit, push, reset, stash yok.
- `plan.md`, `request.md`, `state.json` değişmedi.
- `feature_state.py check 'backend-architecture'` başta ve sonda exit 0 verdi (`approval_matches: true`, status `in_progress`).
- Taşımalar `git mv` ile yapıldı (stage'li rename). Rename sayımı için bir kez `git add -N backend` çalıştırdım; yeni dosyalar intent-to-add durumunda. Başka index işlemi yok.

## Komutlar ve faz bazlı sonuçlar
Her faz sonunda çalıştırılan komut (exit 0):
```
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
MVN=/c/Users/cemha/.m2/wrapper/dists/apache-maven-3.9.16/0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0/bin/mvn
"$MVN" -B -f backend/pom.xml clean package
```
`-o` kullanılmadı, install/deploy yok. Ayrı odaklı `-pl ... -am test` koşusu yapmadım; her faz tam `clean package` ile doğrulandı.

| Faz | Toplam test | Fail/Err | Skipped | Eklenen testler |
|---|---|---|---|---|
| Baseline | 326 | 0 | 1 | |
| 0 | 328 | 0 | 1 | `everyModule_declaresExactlyItsAllowedInternalDependencies`, `scanner_flagsAnUnknownModuleAnExtraEdgeAndAMissingEdge` |
| 1 | 333 | 0 | 1 | `ApiLayeringTest` (5 test) |
| 2 | 337 | 0 | 1 | `LocalCoordinatesTest` (2), `TerrainModelBoundaryCountTest`, `LandXmlSurfaceBoundaryCountTest` |
| 3 | 346 | 0 | 1 | `AlignmentSamplingServiceTest` (2), `LandXmlImportQueriesTest`, `LongitudinalProfileServiceTest` (2), `TerrainServicesTest` (2), `TrafficResolveUseCaseTest` (2) |
| 4 | 348 | 0 | 1 | `ConcreteStrengthClassesTest` (2) |
| 5 | 348 | 0 | 1 | yok (3 test taşındı) |
| 6 | 350 | 0 | 1 | `EvaluatedAlternativeGeneratorTest` (2) |
| 7 | 353 | 0 | 1 | `MidasVocabularyTest` (3) |
| 8 | 367 | 0 | 1 | `FrameBridgeModelBuilderTest` (3), `FrameBridgeInputTest` (4), `AppliedLoadSummaryTest` (2), `FastSolverServiceTest` (5) |
| 9 | 367 | 0 | 1 | |

**Hata sınıflaması:** Tek geçici hata Faz 6'da kendi yazdığım `EvaluatedAlternativeGeneratorTest` içinde çıktı (change-induced, test yazım hatası). Alternatif id'leri her çalıştırmada rastgele UUID olduğu için record eşitliği tutmuyordu. Karşılaştırmayı `spanLayout()` ve `girder()` üzerinden yaptım; aynı faz içinde düzeldi. Ortam kaynaklı veya kasıtlı başka hata olmadı.

## Dosya değişiklikleri (özet)
- **Faz 1:** 44 dosya `<feature>/api/` altına taşındı (şablon: `backend/api/src/main/java/com/kopruq/api/<feature>/api/`), yalnızca package/import satırları değişti. Rüzgâr, deprem ve sıcaklık controller'ları `environmentalloads/api/` altına gitti. Yeni: `ApiLayeringTest`.
- **Faz 2:**
  - `ChainageSampler` ve `ChainageSamplerTest` → `backend/alignment/.../com/kopruq/alignment/`.
  - Yeni `backend/terrain/.../LocalCoordinates.java`.
  - `TerrainModel.countBoundaries(String)` ve `LandXmlSurface.countBoundaries(String)` eklendi.
  - `TerrainMeshResponse`, `TerrainController` ve iki landxml response kullanıma geçti.
  - `TerrainBinaryWriter`'a javadoc notu eklendi; hesap inline kaldı.
- **Faz 3:** Yeni application sınıfları (`api/.../<feature>/application/`):
  - `AlignmentSamplingService`, `AlignmentSample`
  - `LandXmlImportQueries`, `LongitudinalProfileService`, `ProfileSample`
  - `TerrainImportUseCase`, `TerrainReadService`
  - `TrafficResolveUseCase`, `TrafficResolution`
  - Ayrıca `AlignmentSampleRequest.toAlignment()`, dört controller'ın yalnızca eşleme yapacak şekilde sadeleşmesi ve `CoreConfiguration` bean'leri.
- **Faz 4:** Yeni `backend/materials` (pom, package-info, `ConcreteStrengthClasses`). `EurocodeConcrete` ve testi `analysis-api`'den taşındı. `ConcreteMaterialController` güncellendi.
- **Faz 5:** Yeni `backend/environmental-loads` (pom, package-info). `traffic-loads`'tan 10 main ve 3 test dosyası taşındı.
- **Faz 6:** Yeni `generative/EvaluatedAlternative`, `EvaluatedAlternativeGenerator`. `AlternativeGenerationController` ve `CoreConfiguration` güncellendi. `KNOWN_UNUSED_EDGES` boşaltıldı.
- **Faz 7:**
  - `analysis-api`'ye `MaterialKind`, `LoadCaseKind` eklendi.
  - `AnalysisMaterial` ve `LoadCase` imzaları, section/request/engine javadoc'ları ve `package-info` (birim sistemi) güncellendi.
  - Yeni `midas-adapter/.../MidasVocabulary.java`; `MidasModelBuilder`, `FrameSolver`, `FastSolverModelBuilder` ve `FastSolverController` yeni isimlere geçti.
- **Faz 8:**
  - Yeni `backend/model-builder` (pom, package-info, `FrameBridgeInput`, `FrameBridgeModelBuilder`, `AppliedLoadSummary`).
  - `NamedNode` ve `FastSolverModel` (→ `FrameBridgeModel`) `git mv` ile taşındı.
  - Yeni `api/.../fastsolver/application/FastSolverService` ve `FastSolverOutcome`.
  - `FastSolverModelBuilder` ve `FastSolverController` sadeleşti.
- **Faz 9:** `docs/architecture.md` (modül ağacı, bağımlılık grafiği, api paket düzeni, kural motoru kararı, port birimleri, P07 notları) ve `docs/roadmap.md` güncellendi. `SharedRepositoriesConfig` javadoc'u ve `api/pom.xml` yorumu düzeltildi.
- **Faz 0–9 dokümanları:** her faz için `docs/architecture.md` ve `docs/roadmap.md` içine "BACKEND-ARCHITECTURE Faz N" girdisi eklendi; `## BACKEND-ARCHITECTURE track` başlıkları Faz 0'da açıldı.
- **Pom değişiklikleri:**
  - `backend/pom.xml`: `<module>` satırları `materials`, `environmental-loads`, `model-builder`.
  - `backend/api/pom.xml`: com.kopruq bağımlılıkları `materials`, `environmental-loads`, `model-builder` ve bir yorum metni.
  - Yeni pom'lar: `materials`, `environmental-loads`, `model-builder`; ikisinin hiçbir bağımlılığı yok, `model-builder` yalnızca `analysis-api` ve `materials`'a bağlı.
  - Harici groupId eklenmedi.
- **Test değişiklikleri (yalnızca plan §5 / A2 listesi):**
  - Taşınanlarda package/import satırı.
  - `AlternativeGenerationControllerTest`: kurucu satırları.
  - `ConcreteMaterialControllerTest`: import.
  - `FastSolverModelBuilderTest`: import ve `FastSolverModel` → `FrameBridgeModel` tip adı.
  - 6 test dosyasında `"CONC"/"D"/"W"` → enum argümanı: `KopruqAnalysisEngineTest`, `FrameSolverValidationTest`, `FrameSolverTest`, `MidasModelBuilderTest`, `MidasCivilNxAnalysisEngineTest`, `MidasAdapterContractTest`.
  - `ModuleBoundaryTest` ve `ModuleBoundaryRules`: Faz 0/4/5/6/8 eklemeleri.

## Kabul kriterleri
| AC | Kanıt | Durum |
|---|---|---|
| AC1 | Her faz sonunda `clean package` BUILD SUCCESS, 0 F/0 E, skipped=1; toplam 326 → 328 → 333 → 337 → 346 → 348 → 348 → 350 → 353 → 367 → 367 (hiç düşmedi). | Karşılandı |
| AC2 | `git diff --stat 1646245 -- backend/api/src/test/java/com/kopruq/api/contract` boş; `git status` orada değişiklik göstermiyor. `FastSolverContractTest` (1e-9) ve `EndpointInventoryContractTest` tam build içinde geçti. Ayrı `-Dtest='*ContractTest'` koşusu yapmadım. | Karşılandı |
| AC3 | `ControllerLayeringTest` dosyası değişmedi, tam build'de geçti (12 controller). | Karşılandı |
| AC4 | `ApiLayeringTest` geçiyor, sentetik testleri (rule1–3, temiz kaynak) var. | Karşılandı |
| AC5 | Grep `new AnalysisNode\(\|new AnalysisElement\(\|Math\.sqrt\|chainageSampler\.\|repository\.save\|SUPPORTED_MATERIAL_IDS\|toXYZ\|substring` → `backend/api/src/main`: controller'larda eşleşme yok. Kalan eşleşmeler yeni `application` servislerinde (`AlignmentSamplingService`, `LongitudinalProfileService`, `TerrainImportUseCase`) ve `AlignmentController` javadoc'unda `toXYZ`. Planın kast ettiği yer controller'lar. `TrafficLoadsController.resolve` tek use-case çağrısı. | Karşılandı |
| AC6 | 3 modül reaktörde, her birinin kendi testi var, Spring yok (`onlyApiDependsOnSpring` geçti). Paket kökleri `materials`, `environmentalloads`, `modelbuilder`. | Karşılandı |
| AC7 | `ALLOWED_INTERNAL_DEPENDENCIES` pom'lara eşit (test geçiyor); `isMidasFree` = `midas-adapter` ve `api` dışındaki tüm modüller; `analysis-api` için yeni sentetik assert var. | Karşılandı |
| AC8 | `KNOWN_UNUSED_EDGES = Set.of()`; `generative-engine` main kodu `com.kopruq.rules` import ediyor (`grep 'com.kopruq.rules' backend/generative-engine/src/main` 2 satır). `AlternativeGenerationControllerTest` assert'leri aynı. | Karşılandı |
| AC9 | `grep 'new AnalysisNode\(\|new AnalysisElement\(' backend/api/src/main` eşleşmesiz. Topoloji ve denge hesabı `model-builder`'da. | Karşılandı |
| AC10 | Grep `"CONC"\|"D"\|"SB"\|"SR"\|"H"` → `backend/*/src/main` (midas-adapter hariç): kod literal'i yok. Tek eşleşme `analysis-engine/.../RectangularSectionProperties.java:15` javadoc'unda "SB" geçmesi (yorum). `MidasModelBuilderTest` beklenen JSON'u değişmedi ve geçti. | Karşılandı (javadoc notu aşağıda) |
| AC11 | `AnalysisMaterial` bileşenleri `...KnPerM2/PerC/KnPerM3/TonnesPerM3` ekli; `package-info` birim sistemini yazıyor. `grep -i session backend/analysis-api/src/main` yalnızca package-info'daki "a solver adapter must make its session use it" cümlesini buluyor (eski "solver session" birim ifadesi değil). | Karşılandı |
| AC12 | `EurocodeConcrete` yalnızca `com.kopruq.materials`'da; `ConcreteMaterialControllerTest` assert'leri aynı, geçti. | Karşılandı |
| AC13 | `ls backend/traffic-loads/.../trafficloads \| grep -iE 'wind\|seismic\|temperature'` boş. `LoadsContractTest` değişmedi, geçti. | Karşılandı |
| AC14 | `ChainageSamplerTest` alignment modülünde, yalnızca package satırı değişti (rename %99). | Karşılandı |
| AC15 | `git diff -M --summary 1646245 -- backend`: 58 rename. Taşınan servis dosyaları %97–98 benzer (yalnızca package satırı). `FastSolverModelBuilder.java` `git mv` ile `fastsolver/api/`'ya taşındı, ama git son durumda onu `FrameBridgeModelBuilder`'a (%53) eşleştirdi. Hiçbir mühendislik sayısal literal'i değişmedi. | Karşılandı |
| AC16 | `git diff -M 1646245 -- 'backend/*/src/test/**'`: silinen `assert` satırı yok. Silinen diğer satırlar yalnızca plan listesindekiler: CONC/D/W → enum, kurucu kablolaması, `KNOWN_UNUSED_EDGES`, `MIDAS_FREE_MODULES`, `FastSolverModel` tip adı. | Karşılandı |
| AC17 | `git diff --stat 1646245 -- frontend` boş. | Karşılandı |
| AC18 | Pom diff'i yalnızca `<module>` satırları (`backend/pom.xml`), üç com.kopruq bağımlılığı (`api/pom.xml`) ve bir yorum metni; yeni pom'larda yalnızca com.kopruq bağımlılıkları. Harici groupId yok. | Karşılandı |
| AC19 | `MidasVocabularyTest`: CONCRETE→"CONC", DEAD→"D", WIND→`UnsupportedOperationException`; `MidasModelBuilderTest` JSON'u aynı ve geçiyor. | Karşılandı |
| AC20 | `grep -o 'BACKEND-ARCHITECTURE Faz [0-9]' docs/roadmap.md` her fazı (0–9) birer kez buluyor; `docs/architecture.md` içinde de 0–9 girdisi var, modül grafiği tablosu güncel. | Karşılandı |
| AC21 | Yeni REST endpoint yok (`EndpointInventoryContractTest` 21 endpoint, değişmedi), JPA/DB bağımlılığı yok. | Karşılandı |

## Sapmalar ve sınırlamalar
- **AC10 javadoc notu:** `RectangularSectionProperties.java:15` yorumundaki "SB" `analysis-engine` main'inde duruyor. Plan `analysis-engine` javadoc'larını kapsamıyordu, dokunmadım.
- **Port javadoc'larında MIDAS adı:** `analysis-api` içinde `AnalysisElement`, `AnalysisResult`, `AnalysisStatus` ve diğerlerinde "MIDAS-P01 scope" ve `docs/midas-integration-analysis.md` referansları duruyor. Bunlar milestone adı ve doküman referansı; plan yalnızca kod/şekil kodlarını ve "solver session" birim ifadesini hedefliyordu.
- **Rename eşleşmesi:** Bu nedenle git, `FastSolverModelBuilder.java` için `fastsolver/api/` taşımasını son durumda `FrameBridgeModelBuilder`'a eşleştiriyor (risk §8 öngörmüştü; `--follow -M30%` kullanılabilir).
- **A3 (bilinçli davranış farkı):** `AppliedLoadSummary` self-weight varken dikdörtgen olmayan kesitte `IllegalArgumentException` atar (eskiden sessiz 0). REST'ten erişilemez; `FastSolverContractTest` 1e-9 ile aynı kaldı.
- **A4:** `LoadCaseKind.WIND` MIDAS eşlemesi doğrulanana kadar istisna atıyor; oturum birimi çağrısı eklenmedi. Birimin kN ve m olması gerektiği `MidasModelBuilder` javadoc'unda ve `docs/architecture.md` P07 notunda yazılı.
- **A1 ve A2** plandaki gibi uygulandı. A5–A7 için ek işlem gerekmedi.
- **Çalıştırılmayan kontroller:** Frontend build ve vitest (frontend'e dokunulmadı), ayrı `-Dtest='*ContractTest'` ve `-pl` odaklı koşular. Faz kapanışları tam build ile yapıldı.
- **Satır sonu notu:** Git `autocrlf` uyarıları (LF→CRLF) alıyorum; bazı Java dosyaları çalışma ağacında LF. İçerik farkı oluşturmuyor.
- **Kalan iş:** Yok. Canlı MIDAS doğrulaması (WIND kodu, oturum birimi) P07'ye ait.

## Önemli yollar
- Mimari testler: `C:\Users\cemha\repos\KOPRUQ\backend\api\src\test\java\com\kopruq\api\architecture\` (`ApiLayeringTest`, `ModuleBoundaryTest`, `ModuleBoundaryRules`)
- Yeni modüller: `C:\Users\cemha\repos\KOPRUQ\backend\materials`, `...\backend\environmental-loads`, `...\backend\model-builder`
- Dokümanlar: `C:\Users\cemha\repos\KOPRUQ\docs\architecture.md`, `C:\Users\cemha\repos\KOPRUQ\docs\roadmap.md`

---

## Koordinatör doğrulaması (2026-10-12)

Bu bölüm koordinatörün bağımsız kontrolleridir; kod incelemesi (review) değildir.

- `python3 .claude/scripts/feature_state.py check 'backend-architecture'` → exit 0 (onaylı plan hash'i `9bab46ec…3365`). Dal: `codex/landxml-terrain-import` (değişmedi).
- `"$MVN" -B -f backend/pom.xml clean package` (JDK 21.0.11, Maven 3.9.16) → exit 0, BUILD SUCCESS, **367 test, 0 failure, 0 error, 1 skipped** (`BentleyProductionTerrainTest`). Baseline 326/0/0/1; değişiklikten kaynaklanan başarısızlık yok.
- AC2: `git diff --stat 1646245 -- backend/api/src/test/java/com/kopruq/api/contract` boş; `git status` orada değişiklik göstermiyor.
- AC17: `git diff --stat 1646245 -- frontend` ve `git status frontend` boş.
- AC18: pom diff'lerinde com.kopruq dışında eklenen `<groupId>` yok; yeni `materials`, `environmental-loads`, `model-builder` pom'ları yalnızca `com.kopruq` içeriyor.
- AC15 / mühendislik değerleri: `WindLoadsService`, `SeismicSpectrumService`, `UniformTemperatureService` (traffic-loads → environmental-loads), `EurocodeConcrete` (analysis-api → materials) ve `Lm1DefaultsFactory` dosyalarındaki sayısal literal çok-kümeleri `1646245` ile birebir aynı. Eski `FastSolverModelBuilder` ondalık literal kümesi, yeni `model-builder` + api `FastSolverModelBuilder` toplamında aynı.
- `git diff -M --summary 1646245 -- backend` → 58 rename.
- `api` dışındaki modüllerin `src/main` dosyalarında `org.springframework`/`jakarta.` yok.
- Not: Uygulayıcı rename sayımı için `git add -N backend` çalıştırdı; yeni dosyalar index'te intent-to-add durumunda, `git mv` taşımaları stage'li. Commit yapılmadı.
