# Plan: backend-remediation (güncellenmiş, kullanıcı cevaplarıyla)

> architecture-planner tarafından hazırlandı. Planlayıcı yalnızca okuma araçlarıyla çalıştı: dosya düzenlemedi, komut çalıştırmadı. Bulgular güncel kaynakta (HEAD `e3a2693`) tek tek açılıp doğrulandı. Backend, review commit'i `bdca6d8`'den bu yana değişmedi (koordinatörün bildirdiği `git diff --stat` boş).
>
> **Bu revizyonda işlenen kullanıcı cevapları:**
> - **U7/A4 = evet:** Plan roadmap'te ayrı bir "BACKEND-REMEDIATION" izi olarak kaydedilecek. `/feature-implement` onayı CLAUDE.md milestone onayı yerine geçer.
> - **A3 = evet:** Faz 1'e dahil edildi.
> - **A5/E10 = evet:** Faz 7a'ya dahil edildi.
> - **U3 = şimdi kaldır:** Faz 9'a dahil edildi.
> - **Cevapsız kalanlar:** A1, A2, A6 veto edilebilir varsayım olarak duruyor. B1–B4 ve Faz 11 onaylanan kapsamın dışında. U6 ve U8 ile ilgili değişiklikler yapılmayacak, mevcut davranış korunacak.

## 0. Girdi durumu (doğrulanmış olgular)

- **Review:** `docs/reviews/2026-10-11T19-46-40Z/`. Durumu **STALE değil** (parmak izi aynı, backend diff boş) ve **INCOMPLETE değil**: kod fazında 232/232 dosya tam okunmuş, partial/unread/excluded dosya yok. Bir uyarı var: `architecture.md` §7'deki ara kapsam ("138 full / 93 not inspected") eski. Nihai `report.md` kod fazında hepsinin tam okunduğunu söylüyor. Bu plan için seçilen bulguların kaynağını yeniden açtım (§3).
- **Analyzer:** Review sırasında hiç analyzer çalıştırılmamış. Bulgular yalnızca kaynak okumasına dayanıyor.
- **Mimari referans:** `docs/architecture/backend-reference.md` **mevcut** (R1–R16 ve "KOPRUQ'a uyarlama" tablosu). Bu belgenin dışında referans kuralı varsaymadım.
- **Baseline test durumu:** `mvn -B -f backend/pom.xml test` (JDK 21.0.11 Eclipse Adoptium, Maven 3.9.16) → **BUILD SUCCESS, 123 test çalıştı, 0 failure, 0 error, 1 skipped** (`com.kopruq.api.terrain.BentleyProductionTerrainTest`, isteğe bağlı çalışan test). Log: `docs/features/backend-remediation/baseline-backend-tests.txt`.
  - Modül başına test sayısı: alignment 24, terrain 6, landxml-import 17, traffic-loads 18, bridge-layout 7, bridge-core 10, rules-engine 3, generative-engine 6, analysis-api 3, analysis-engine 3, midas-adapter 16, api 10 (1 skip). spatial-core ve constraints modüllerinde test yok.
  - Baseline'da çözülen plugin sürümleri: `maven-compiler-plugin:3.16.0` (log satır 42) ve `surefire:3.5.4` (log satır 65). Ayrıca "Ignoring incompatible plugin version 4.0.0-beta-*" uyarıları var.
  - **Backend'de önceden var olan test başarısızlığı yok.**
- **Kalıcılık ve transaction:** Backend'de `Transactional|jakarta.persistence|JpaRepository|DataSource` araması **0 sonuç** verdi. Veritabanı, JPA ve transaction yok. Talepteki "transaction problemleri" maddesine birebir uyan bir sorun yok. Karşılığı şu iki durum:
  1. `LandXmlController.java:89-90` iki ayrı repository'ye atomik olmayan yazım yapıyor (ikinci `save` başarısız olursa terrain sahipsiz kalır; pratikte yalnızca OOM veya NPE ile tetiklenebilir).
  2. `MidasCivilNxAnalysisEngine.submit` tek MIDAS oturumunu eşzamanlı çağrılara karşı korumuyor (C-009-02).
- **Frontend:** Bu feature'ın kapsamı dışında. Frontend review'ındaki 26 önceden var olan vitest hatası bu işle ilgili değil. Frontend dosyaları yalnızca tüketilen API sözleşmelerini görmek için okundu.

## 1. Hedef ve açıkça hedef olmayanlar

**Hedef.** Doğrulanmış backend bulgularını küçük ve ayrı ayrı doğrulanabilir fazlarla (Faz 0a–10) gidermek. Öncelik sırası:
1. Sessizce yanlış veya geçersiz mühendislik sonucu üreten yollar.
2. Bitmeyen döngü.
3. Tutarsız API hata davranışı.
4. Veri bütünlüğü (LandXML ve arazi).
5. Analiz portu sözleşmesi.
6. Bu önceliklere bağlı mimari düzenlemeler (R7, R14, R3/R4, R12, R2).

İş, roadmap'te ayrı bir **"BACKEND-REMEDIATION"** izi olarak kaydedilir (U7).

**Hedef olmayanlar:**
- Mühendislik değerlerini değiştirmek veya seçmek. Deprem tabloları, LM1, rüzgâr/sıcaklık sabitleri, fck aralığı, kurb tipi, CRS politikası, yinelenen nokta politikası ve hesaplama limiti sayıları bu kapsamda yok. Bu konularda yalnızca reddetme veya INVALID / REVIEW_REQUIRED işaretleme yapılacak.
- Yeni Maven bağımlılığı (Bean Validation, ArchUnit, enforcer, JPA, PostgreSQL), yeni REST endpoint'i, yeni Maven modülü, frontend değişikliği.
- Kalıcılık (R13/R15), JSON alan adlarını yeniden adlandırmak, toplu paket taşıma (R1).
- Actuator exposure değişikliği (U6 cevapsız). Örnekleme kurallarını birleştirmek (U8 cevapsız).
- **Bloklu paketler B1–B4 ve Faz 11.** Bunlar onaylanan kapsamın dışında ve uygulanmayacak.

## 2. Mevcut mimari (kanıtlarla)

- **Modüller:** `backend/pom.xml` 14 modül tanımlıyor. Spring yalnızca `api` modülünde (`backend/api/pom.xml:89-101`). Diğer modüller framework'süz. R3 bugün sağlanıyor ama otomatik olarak denetlenmiyor (F-17).
- **Pom'daki gerçek bağımlılıklar** (`docs/architecture.md:86-100` bu konuda güncel değil):
  - `api` diğer 13 modülün hepsine bağlı.
  - `midas-adapter` → `bridge-core`, `analysis-api`, `jackson-databind`.
  - `analysis-api` → `bridge-core`.
  - Bunlardan şu üçü kaynakta hiç kullanılmıyor (grep 0 sonuç): `api → midas-adapter`, `midas-adapter → bridge-core`, `analysis-api → bridge-core`.
- **Controller'lar:** 12 controller düz feature paketlerinde duruyor. Domain servisleri `new` ile kuruluyor (ör. `FastSolverController.java:37-38`, `TerrainController.java:48-49`). Yalnızca iki repository bean olarak tanımlı (`SharedRepositoriesConfig.java:30-38`). Her controller'da `@CrossOrigin(origins = "http://localhost:5173")` var.
- **Hata yönetimi:** `@RestControllerAdvice` yok. `application.properties:12` içinde `server.error.include-message=always` var. Üç farklı hata stili kullanılıyor (F-04).
- **Fast Solver akışı:** `FastSolverRequest` (primitive alanlar) → `FastSolverModelBuilder` (api modülünde) → `KopruqAnalysisEngine.submit` (map'e yazar, hiç silmez) → `FrameSolver` → controller içinde denge kontrolü.
- **LandXML akışı:** `LandXmlParser` (StAX, DTD ve harici varlıklar kapalı, `:42-45`) → `LandXmlImportService.commit` → `LandXmlTerrainMapper` (status = `warnings.isEmpty() ? VALID : REVIEW_REQUIRED`, `:68`) → controller iki repository'ye yazıyor.
- **Frontend'in tükettiği sözleşmeler (korunacak):**
  - `landXmlImportService.ts:94-97` hata gövdesinden **`message`** alanını okuyor.
  - Diğer servisler yalnızca `!res.ok` kontrol ediyor.
  - `SeismicPanel.tsx` `res.ok` kontrol etmiyor, `status`/`points` alanlarını okuyor ve yalnızca `"Type 1"`/`"Type 2"` ile `A`–`E` gönderiyor.
  - `WindLoadsPanel.tsx` yalnızca `res.ok` olduğunda sonucu gösteriyor.
  - `temperatureService.ts` `!ok` olduğunda hata fırlatıyor.
  - Zod şemaları tüm alanları zorunlu tutuyor. Boyutlar `positive`. `sdlKnPerM` ve bearing rijitlikleri için bilinçli olarak işaret veya aralık kısıtı yok (`fastSolverSchema.ts:6-12`).

## 3. Bulgu doğrulaması

Durum değerleri: **D** = doğrulandı, **K** = kısmen doğrulandı, **Y** = yeniden üretilemedi veya kapsam dışı bırakıldı.

| ID | Durum | Kanıt (güncel kaynak) | Not |
|---|---|---|---|
| F-01 | D (kod) | `FastSolverRequest.java:19-32` tüm alanlar `double`; `FastSolverModelBuilder.java:51,58-60,121-124,130` alanları kontrolsüz kullanıyor; aynı desen `KernelStateRequest.java:21-30`, `LayoutGenerationRequest.java:18-29` | Jackson'ın eksik alanı 0 yapması Faz 0'da ölçülecek. |
| F-02 | D | `SeismicSpectrumService.java:1`: `spectrumType` null veya tanınmayan değer → Tip 1 tablosu, sonuç `"VALID"` | Tablo değerleri E1. |
| C-011-01 | D | Aynı satır: `"ABCDE".indexOf(groundType)`. `""` → A; `"AB"` → A | |
| C-012-01 | D (kod) | `WindLoadsService.java:6` sonluluk ve `ze` işaret kontrolü yok; `:8` null `terrainCategory` ile `switch` → NPE → 500; `UniformTemperatureService.java:9-24` sonluluk yok | NaN'ın JSON üzerinden ulaşıp ulaşmadığı (H-012-01) Faz 0'da test edilecek. |
| F-03 | D | `KopruqAnalysisEngine.java:33,38,52,55`; `FastSolverController.java:38`; `MidasCivilNxAnalysisEngine.java:37,52,74,77` | |
| F-04 | D | `LandXmlController.java:65-66` her `RuntimeException`'ı 400 yapıyor; `:85` `LandXmlParseException`'ı yakalamıyor → import'ta 500; ayrıca `TerrainController.java:72-74`, `FastSolverController.java:47-49`, `application.properties:12` | |
| F-05 | D | Builder api modülünde; `FastSolverController.java:80-122`; `:111-112` dikdörtgen dışı kesitte alan 0 | Bugün yanlış sonuç oluşmuyor. Faz 11 (bloklu). |
| F-06 | K | `MidasModelBuilder.java:40-65` `elasticLinks` ve `uniformLoads`'ı yok sayıyor; `FastSolverModelBuilder.java:54,140` `"CONC"`/`"D"` | MIDAS yolu REST'ten erişilemez. |
| F-07 | D (mekanizma) | `AlignmentController.java:72-80`, `LandXmlController.java:110-117`, `FrameSolver.java:50`, `application.properties:7-8` | Limit değerleri U1 → B1. |
| F-08 | K | `docs/` altında (review klasörleri hariç) bu uçlardan hiç söz edilmiyor; test yok | E1–E3. |
| F-09 | K | `Lm1DefaultsFactory.java:23-31` ile `package-info.java:4-5` ve `TrafficLoadsServiceTest.java:16-25` çelişiyor | E4. |
| F-10 | D | `RuleEngine.java:36` | U5 → B4. |
| F-11 | D | `InMemory*Repository.java:9-15`; `LandXmlController.java:89-90` | Kapasite U2 → B2. Atomiklik Faz 10'da. |
| F-12 | D | Kullanılmayan üç pom bağımlılığı (grep) | Faz 9'da kaldırılacak (U3). |
| F-13 | D | `AlignmentController.java:72,76` (L/20, `<`) ile `LandXmlController.java:110,114,118` (L/50, `<=`) farklı | Birleştirme U8; yalnızca taşınacak, kurallar korunacak. |
| F-15, F-18 | D | `new` ile kurulan servisler ve 12 `@CrossOrigin` | |
| F-16 | K | Okunan main dosyalarında Logger yok; `KopruqAnalysisEngine.java:53-56` stack trace'i kaybediyor | |
| F-17 | D | Mimari test yok | |
| F-14, F-19 | K | Okunan yerlerde doğru | Port tipini kıran değişiklik gerektirir. Ertelendi. |
| C-001-01 | D | `LandXmlParser.java:315-317,341-343` yer tutucu eleman üretiyor | |
| C-001-03 | D | `staStart` hiç okunmuyor; `LandXmlController.java:127` | |
| C-001-04 / C-008-02 | D (kod) | `LandXmlParser.java:372-378`; fixture'ın kendine özgü biçimi `sample.landxml:64` | Şema anlamı A6. |
| C-001-05 | D | `VerticalProfile.java:61-64` ekstrapolasyon; PVI sırası kontrol edilmiyor | |
| C-002-01 | D | `DenseLinearSolver.java:26` mutlak eşik; NaN pivot kontrolü geçiyor | |
| C-002-02 | D | `FrameSolver.java:106-108` bilinmeyen düğümlü mesnet atlanıyor; `SolidRectangleSection.java:4` değişmez yok | |
| C-002-03 | D | `FrameSolver.java:75-93` yük durumunu dikkate almıyor | |
| C-002-04 | D | `EurocodeConcrete.java:46-50` (fck=0 → ≈20.6 GPa; fck < −8 → NaN) | |
| C-003-02 | D | `FrameSolver.java:30-34` yinelenen kimlik üzerine yazıyor | |
| C-004-01 | D | `XyzTerrainParser.java:29-46` ondalık virgül bölünüyor, BOM'lu satır atlanıyor, sonluluk yok | |
| C-005-01 | D | `Bridge.java:8` değişmez yok | Testler `Bridge("Zero",0,0)`, `Bridge("Impossible",100,0)` kullanıyor. |
| C-005-02 | D | `AlternativeGenerator.java:75-79,56` int doyması → döngü bitmiyor | |
| C-005-03 | D | `TrafficLoadsService.java:42-46` boş liste → `allMatch` true; `LaneFactor.java:12` NPE | |
| C-006-01 | D | `BridgeLayoutEngine.java:46-48,109-111`; `AlternativeGenerator.java:90-92` | |
| C-006-02 | D | `BridgeSite.java:14`, `NoPierZone.java:20`, `BridgeLayoutEngine.java:123-134` | |
| C-008-01 | D | `LandXmlParser.java:283-286` profiller birleşiyor | |
| C-008-03 | D | `LandXmlParser.java:346,350-355,369,376` | |
| C-008-05 | D (kod) | `LandXmlParser.java:184-186` `i` özniteliği okunmuyor | E9 → B3. |
| C-009-01 | D | `MidasResultExtractor.java:50-79` sütun indeksi sabit, `HEAD` kontrolü yok | |
| C-009-02 | D | `MidasCivilNxAnalysisEngine.java:50-78` kilit yok | |
| C-009-06 | D | `backend/pom.xml:78-91`; baseline log | |
| C-010-01 | K | `TerrainImportService.java:41-44` ödünleşim javadoc'ta belgeli, ama API yanıtında görünmüyor | |
| C-010-02 | D | `TerrainImportService.java:84,89-90` | |
| C-010-03 | D | `TerrainQueryService.java:42-48` | |
| C-011-02 | D | `NotionalLaneGenerator.java:30-32` (1e308 → OOM); `TrafficLoadsService.java:32` (0 şeritte uyarı yok) | OOM kısmı B1'de. |
| C-012-02 / 03 / 04 | D (kod) | `WindLoadsService.java:7,9`; `UniformTemperatureService.java:19-27` | E2, E3 → B3. |
| C-007-02 | D | `LandXmlParser.java:105`; `LandXmlImportService.java:53` | E7 → B3. |
| H-03 | Y (bugün erişilemez) | `FastSolverController.java:62-70` | Faz 4'te savunma amaçlı guard. |
| Diğer MINOR'lar (C-002-05, C-009-03/04/07, C-007-01/03/04, C-006-03/04, C-011-03/04/05, C-005-04/05, C-004-02/04, C-001-02/06/07, C-008-04/06/07, C-010-04, C-012-05, C-002-06/07, C-003-03) | Y (açılmadı) | — | Bu planın kapsamı dışında. |

## 4. Önerilen tasarım

### 4.1 İlkeler
- **Fail-closed.** Yük servislerinde geçersiz girdi mevcut desenle 200 + `"INVALID"` döner (A2). Diğer uçlarda `IllegalArgumentException` (IAE) fırlatılır ve tek handler bunu 400'e çevirir. Belirsiz veri `REVIEW_REQUIRED` ve uyarıyla işaretlenir ya da reddedilir. Hiçbir yerde yeni bir mühendislik sayısı seçilmez.
- **Sonluluk ve fiziksel tanım alanı kontrolleri** mühendislik değeri sayılmıyor ve frontend'deki Zod sözleşmesiyle aynı (A1).
- **Yeni bağımlılık yok.** Doğrulama için boxed tipler ve elle yazılmış, alan listesi döndüren kontroller kullanılacak. MockMvc ve `OutputCaptureExtension` zaten `spring-boot-starter-test` içinde. Log için api'de SLF4J (`spring-boot-starter-web` üzerinden geçişli), framework'süz modüllerde JDK'nın `System.Logger`'ı. Mimari koruma için düz JUnit ile dosya taraması.
- **Global Jackson ayarı yok.** `FAIL_ON_MISSING_CREATOR_PROPERTIES` gibi bir ayar sıcaklık ve deprem uçlarının "eksik alan = null" sözleşmesini bozardı.
- **Hata gövdesi mevcut Spring gövdesinin üst kümesi olacak:** `{timestamp, status, error, code, message, path, correlationId, errors[]}`. `message` alanı korunuyor.

### 4.2 Arayüzler (yeni veya değişen)

| Bileşen | Konum | Ne değişiyor |
|---|---|---|
| `ApiErrorResponse`, `FieldViolation(field, message)`, `InvalidRequestException(List<FieldViolation>)`, `ApiExceptionHandler` | `backend/api/src/main/java/com/kopruq/api/error/` | Yeni |
| `CorrelationIdFilter` | `backend/api/src/main/java/com/kopruq/api/observability/` | Yeni |
| Domain değişmezleri | Ilgili record'ların compact constructor'ları | Ekleniyor. İhlalde IAE. |
| `XyzParseResult` | terrain | Yeni |
| `TerrainImportService.importXyzWithDiagnostics` | terrain | Ek metod. `importXyz` imzası korunuyor. |
| `TerrainImportResponse` | api | Ek alanlar: `status`, `warnings` |
| `TerrainRepository.deleteById` | terrain | Yalnızca iç kullanım. Endpoint yok. |
| `VerticalProfile.covers(double)` | alignment | Ek metod. `elevationAt` değişmiyor. |
| `CoreConfiguration`, `WebCorsConfiguration` | api config | Yeni |
| `LandXmlImportUseCase`, `ChainageSampler` | api `application` paketleri | Yeni |
| `AnalysisEngine` javadoc | analysis-api | `getResults` sonucu bir kez teslim eder ve işi siler. |

### 4.3 Uyumluluk
- Mutlu yollarda JSON alan adları, HTTP 200 ve sayısal sonuçlar karakterizasyon testleriyle sabitlenecek.
- **Kasıtlı davranış değişiklikleri** her fazda listelendi. Özet: 500 → 400; 500 gövdesinden iç mesaj kalkıyor; null spektrum tipi → INVALID; bozuk XML import'ta 400; iç boşluklu hizalama 400; belirsiz LandXML profili eklenmiyor (`hasProfile=false`).
- Yeni JSON alanları yalnızca ekleme niteliğinde.

## 5. Alternatifler ve seçim gerekçesi

| Konu | Alternatif | Seçim ve gerekçe |
|---|---|---|
| Eksik alanlar (F-01) | Bean Validation; global Jackson `FAIL_ON_*` | **Boxed tip + elle doğrulama.** Bean Validation yeni bağımlılık ister. Global ayar null sözleşmelerini bozar. |
| Kodlu hata sözleşmesi (R7) | Yeni `kopruq-common` modülü | **Reddedildi.** Yeni modül onay ister. Handler mevcut istisna tiplerini eşliyor. |
| Mimari koruma (F-17) | ArchUnit / enforcer | **Düz JUnit taraması.** Bağımlılık eklemiyor. |
| Job map (F-03) | Tahliyeli yönetici; port'a `solve()` eklemek | **`getResults` sonrası silmek.** En küçük değişiklik, mevcut testlerle uyumlu (`MidasCivilNxAnalysisEngineTest.java:55-56,81-82`). |
| Döngüler | Hemen `ComputationLimits` eklemek | **Sayı gerektirmeyen düzeltme:** `long` sayaç, indeks tabanlı adım, ilerleme kontrolü. Limitler B1'de. |
| LandXML belirsizlikleri | Ofseti uygulamak veya kurbu yorumlamak | **Fail-closed.** Yorum kararı mühendisin (E6). |
| Örnekleme (F-13) | İki kuralı birleştirmek | **Taşı ve iki kuralı koru** (U8 cevapsız). |

## 6. Sıralı uygulama fazları (onaylanan kapsam: Faz 0a–10)

**Her fazda ortak kurallar:**
- (1) Önce karakterizasyon testleri yazılır ve mevcut davranışla geçer. (2) Sonra davranış değiştirilir. (3) Kasıtlı olarak değişen testler fazda isim isim listelenir.
- Her faz `docs/architecture.md` ve `docs/roadmap.md` içine "BACKEND-REMEDIATION Faz N" girdisi ekler. Roadmap'te yeni iz tablosu açılır (U7).
- Kalıcı veri yok, dolayısıyla **veri geçişi yok**. API yeniden başlatıldığında in-memory durum zaten siliniyor; bu mevcut davranış.
- **Geri dönüş:** İş akışı commit yapmayı yasaklıyor. Bu yüzden her fazın kullanıcının ayrıca isteyeceği tek bir commit olarak kaydedilmesi öneriliyor. O durumda geri dönüş `git revert <faz-commit>`, tersten sırayla. Commit yoksa geri dönüş, implementation.md'deki faz dosya listesinin elle geri alınmasıdır.

**Komut ortamı (Git Bash):**
```bash
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
MVN=/c/Users/cemha/.m2/wrapper/dists/apache-maven-3.9.16/0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0/bin/mvn
# Windows yolu: C:\Users\cemha\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn
```
- Tam doğrulama (her faz sonunda zorunlu, CLAUDE.md build komutu, testleri de çalıştırır): `"$MVN" -B -f backend/pom.xml package`
- Tüm testler: `"$MVN" -B -f backend/pom.xml test`
- Odaklı: `"$MVN" -B -f backend/pom.xml -pl <modul> -am test`
- Tek test: `-Dtest=<Sinif> -Dsurefire.failIfNoSpecifiedTests=false` eklenir.
- Offline (`-o`) mod baseline'da başarısız oldu (surefire 3.5.4 yerel depoda eksikti). İlk çalıştırma online yapılmalı.

**Başarısızlıkları ayırma.** Baseline 123/0/0/1-skip. Bir faz sonrası:
- (a) Fazın "beklenen değişen testler" listesindeki testler kasıtlı değişikliktir.
- (b) Plugin veya ağ çözümleme hatası ortam hatasıdır; online olarak yeniden çalıştırılır.
- (c) Bunların dışındaki her failure veya error **değişiklikten kaynaklanır** ve faz tamamlanmış sayılmaz.

Skipped sayısı 1 kalmalı. Toplam test sayısı = 123 + eklenen testler. Her fazın sayıları implementation.md'ye yazılır.

---

### Faz 0a — Build hijyeni (C-009-06)
- **Dosya:** `backend/pom.xml` `pluginManagement`.
  - `maven-compiler-plugin` → **3.16.0**, `maven-surefire-plugin` → **3.5.4**.
  - Diğer varsayılan plugin'ler (resources, jar, install, clean) yalnızca baseline log'daki `--- <plugin>:<sürüm>` satırlarından okunan sürümlerle sabitlenir. Sürüm tahmin edilmez.
- **Korunacak:** Derleme çıktısı ve test sonuçları.
- **Kabul:** AC1. **Bağımlılık:** Yok.

### Faz 0b — Karakterizasyon ve test altyapısı (C-004-03, C-003-01 kısmen, H-012-01)
- **Yeni dosyalar:** `backend/api/src/test/java/com/kopruq/api/contract/*ContractTest.java`. `@SpringBootTest` + `@AutoConfigureMockMvc` ile tek, önbelleklenen bir context.
- **Test fixture'ı:** `sample.landxml` `backend/api/src/test/resources/landxml/` altına kopyalanır.
- **Sabitlenecekler:**
  1. **Endpoint envanteri testi:** `RequestMappingHandlerMapping` kullanılarak mevcut uç kümesi doğrulanır.
  2. **Mutlu yollar:**
     - fast-solver (mühendisin 5 açıklıklı örneği): status, satır etiketleri, değerlerin anlık görüntüsü ("karakterizasyon, mühendislik doğrulaması değildir" yorumuyla) ve `totalAppliedLoadKn ≈ totalReactionKn` dengesi.
     - deprem Type 1/A ve Type 2/E; rüzgâr II; sıcaklık; trafik `lm1-defaults?laneCount=3` ve 13.80/1.00/1.50 resolve (3 şerit, 2.30 m).
     - LandXML inspect/import/profile; terrain import, `mesh.bin`, elevation, 404 mesajı; alignment sample (POST ve GET); layout, alternatives, kernel-state.
     - CORS preflight (`Origin: http://localhost:5173`).
  3. **`current_*` adlı mevcut kusur testleri** (kasıtlı olarak ileride değişecek): eksik `sdlKnPerM` → 200 COMPLETED; null `spectrumType` → VALID; null `terrainCategory` → 500; bozuk XML import → 500; `"NaN"` string'i çift alana gönderildiğinde Jackson'ın gerçek davranışı.
- **Kabul:** AC2. **Bağımlılık:** 0a.

### Faz 1 — Yük servislerinde sessiz geçersiz sonuç (F-02, C-011-01, C-012-01, F-04'ün rüzgâr NPE kısmı)
- **Değişecek dosyalar:**
  - `backend/traffic-loads/src/main/java/com/kopruq/trafficloads/SeismicSpectrumService.java`: okunur hâle getirilir; **tablo değerleri birebir aynı kalır**. Önce mevcut tek satırlık sürümle anlık görüntü testi yazılır.
  - `WindLoadsService.java`, `UniformTemperatureService.java`.
- **Yeni testler:** `SeismicSpectrumServiceTest`, `WindLoadsServiceTest`; `UniformTemperatureServiceTest`'e ekleme.
- **Davranış:**
  - **Deprem:** `spectrumType` yalnızca tam olarak `"Type 1"` veya `"Type 2"`; null veya başka bir değer → INVALID. `groundType` yalnızca tek harf `A`–`E`; aksi → INVALID. `agR` ve `importanceFactor` sonlu ve > 0 olmalı.
  - **Rüzgâr:** `terrainCategory` null veya tanınmayan → INVALID ("invalid terrain category"). `vb`/`ze`/`deckWidth`/`dref` sonlu olmalı. **`ze < 0` → INVALID ve `deckWidthM ≤ 0` → INVALID** (A3, kullanıcı onayladı).
  - **Sıcaklık:** Sonlu olmayan değer eksik sayılır ve `missingParameters` listesine mesajla eklenir.
- **Korunacak:** HTTP 200 + `status:"INVALID"` deseni (A2); yanıt alan adları; geçerli girdilerde değerlerin aynen kalması (INVALID'deki `cfx = 1.3` dahil; C-012-02 E2'ye bağlı ve değişmiyor).
- **Beklenen değişen testler:** `current_seismicNullType…`, `current_windNullCategory…`.
- **Kabul:** AC3, AC4, AC5. **Bağımlılık:** Faz 0.

### Faz 2 — Tek hata sözleşmesi (F-04, R7)
- **Yeni dosyalar:** `api/error/ApiExceptionHandler.java`, `ApiErrorResponse.java`, `FieldViolation.java`, `InvalidRequestException.java`.
- **Değişecek dosyalar:**
  - `application.properties`: `server.error.include-message=always` silinir. Actuator satırı **değişmez** (U6).
  - `LandXmlController.java`: inspect'teki genel `catch RuntimeException` kaldırılır; hatalar handler'a bırakılır.
  - `TerrainController.java`: try/catch sadeleştirilir.
- **Eşleme:**

  | İstisna | HTTP | `code` | `message` |
  |---|---|---|---|
  | Spring `org.springframework.web.ErrorResponse` uygulayan istisnalar (`ResponseStatusException`, `NoResourceFoundException`, 405/415 vb.) | Kendi durum kodu | Duruma göre | `ResponseStatusException` için reason aynen; diğerlerinde reason phrase |
  | IAE (`NumberFormatException` dahil) | 400 | `INVALID_INPUT` | Mesaj aynen |
  | `LandXmlParseException` | 400 | `INVALID_LANDXML` | Mesaj aynen |
  | `InvalidRequestException` | 400 | `INVALID_REQUEST` | `errors[]` doldurulur |
  | `HttpMessageNotReadableException` | 400 | `MALFORMED_REQUEST_BODY` | Genel mesaj |
  | `MissingServletRequestParameterException`, `MethodArgumentTypeMismatchException`, `MissingServletRequestPartException` | 400 | — | — |
  | `MaxUploadSizeExceededException` | 413 | `UPLOAD_TOO_LARGE` | — |
  | `UncheckedIOException` | 400 | `UPLOAD_UNREADABLE` | — |
  | Diğer `Exception` | 500 | `INTERNAL_ERROR` | Genel mesaj; log'da stack trace |

- **Korunacak:** 4xx mesaj metinleri; `message` anahtarı; `ConcreteMaterialController` 404; FastSolver çözücü hatası hâlâ 200 + `FAILED` + `errorMessage`.
- **Kasıtlı değişiklikler:** alternatives, layout ve fast-solver IAE'leri 500 → 400; LandXML import'ta bozuk XML 500 → 400; inspect'te NPE 400 → 500 (genel mesaj); 500 gövdelerinden iç mesaj kalkıyor.
- **Beklenen değişen testler:** `current_landxmlImportMalformed…`.
- **Kabul:** AC6, AC7. **Bağımlılık:** Faz 0.

### Faz 3 — Gözlemlenebilirlik (F-16, R14)
- **Yeni dosya:** `api/observability/CorrelationIdFilter.java` (`OncePerRequestFilter`).
  - Gelen `X-Correlation-ID` güvenli desene uyuyorsa (alfanümerik veya tire, uzunluk sınırlı; teknik seçim) kullanılır, aksi hâlde UUID üretilir.
  - Değer MDC'ye `correlationId` olarak yazılır, yanıt başlığına eklenir ve `ApiErrorResponse.correlationId` alanını doldurur.
- **Değişecek dosyalar:**
  - `application.properties`: `logging.pattern.level` içine MDC alanı eklenir.
  - `ApiExceptionHandler`: 5xx `error` seviyesinde stack trace ile, 4xx `debug`/`info` seviyesinde loglanır.
  - `KopruqAnalysisEngine.java`, `MidasCivilNxAnalysisEngine.java`: FAILED durumunda `System.Logger` ile istisnayla birlikte log.
- **Yapılmayacak:** Actuator exposure değişikliği (U6).
- **Kabul:** AC8. **Bağımlılık:** Faz 2.

### Faz 4 — Fast Solver girdi güvenliği (F-01, C-002-04 kısmen, C-002-01 kısmen, H-03, C-003-01)
- **Değişecek dosyalar:**
  - `FastSolverRequest.java`: tüm sayısal alanlar `Double` olur. JSON adları aynı kalır.
  - `FastSolverModelBuilder.java`: `validate()` eklenir. Tüm ihlaller toplanır ve `InvalidRequestException` fırlatılır.
  - `EurocodeConcrete.java`: fck sonlu değil veya ≤ 0 ise IAE. Tablo 3.1 aralığı uygulanmaz (E5).
  - `KopruqAnalysisEngine.java`: sonlu olmayan deplasman veya reaksiyon → FAILED.
  - `FastSolverController.java`: düğüm sonucu eksikse FAILED (NPE yerine).
- **Kurallar:**
  - Tüm alanlar zorunlu ve sonlu. Liste elemanları null olamaz.
  - `spanLengthsM` boş olamaz ve her eleman > 0. `pierHeightsM` boyu = açıklık sayısı − 1 ve her eleman > 0.
  - Boyutlar ve fck > 0.
  - `sdlKnPerM` ve `bearingK*` için **yalnızca zorunluluk ve sonluluk**.
- **Yeni testler:** `backend/api/src/test/java/com/kopruq/api/fastsolver/FastSolverModelBuilderTest.java` (topoloji ve ihlaller); `EurocodeConcreteTest`'e ekleme; `backend/analysis-engine/src/test/java/com/kopruq/analysisengine/KopruqAnalysisEngineTest.java`; web testi.
- **Korunacak:** Mutlu yol anlık görüntüsü (göreli 1e-9); `GET /api/materials/concrete`'in 14 sınıfı.
- **Beklenen değişen testler:** `current_fastSolverMissingSdl…`.
- **Kabul:** AC9, AC10, AC11. **Bağımlılık:** Faz 2.

### Faz 5 — Trafik/LM1 doğrulaması (C-005-03, C-011-02'nin OOM dışı kısmı)
- **Değişecek dosyalar:**
  - `TrafficLoadsService.java`:
    - Boş veya null `tandemSystem`/`udl` listesi ya da null satır → çözümlenmemiş sayılır ve LM1 uyarısı verilir.
    - Provenansı `CODE_DEFAULT` olup `value ≠ codeDefaultValue` olan satır için yalnızca uyarı.
    - Dar yol uyarısı genişlik < `NARROW_CARRIAGEWAY_THRESHOLD_M` olduğunda **0 şerit dahil** verilir (mevcut sabit kullanılıyor).
  - `LaneFactor.java`: null `ParameterValue` → `effectiveValue = null`.
  - `CarriagewayInput.java`: sonlu olmayan değer → IAE.
  - `TrafficLoadsController.java`: `carriageway` null → IAE.
- **Kapsam dışı:** LM1 değerleri ve F-09 testi (E4); 1e308 genişlikte OOM (B1).
- **Korunacak:** Mevcut 4 `TrafficLoadsServiceTest` ve `lm1-defaults` JSON çıktısı.
- **Kabul:** AC12. **Bağımlılık:** Faz 2.

### Faz 6 — Döngü sonlanması ve domain değişmezleri (C-005-02, C-006-01, C-006-02, C-005-01, F-01'in diğer DTO'ları)
- **Değişecek dosyalar:**
  - `AlternativeGenerator.java`:
    - Span ve girder sayısı döngüleri taşmaya karşı güvenli (`long`). Integer aralığını aşan sayı → IAE "temsil edilemez".
    - Derinlikler indeks tabanlı üretilir (`min + i*step`, mevcut 1e-6 yuvarlama ve +1e-9 toleransı korunur).
    - Bir adım ilerletmiyorsa IAE.
  - `BridgeLayoutEngine.java`: C1 ve span adımları indeks tabanlı; ilerleme kontrolü; tasarım uzayının tüm alanları için sonluluk.
  - Compact constructor'lar:
    - `BridgeSite`, `NoPierZone`, `LayoutDesignSpace`: sonluluk.
    - `Bridge`: sonlu ve ≥ 0 (pozitiflik kontrolü yok; testler 0 kullanıyor).
    - `DesignSpace`: yalnızca sonluluk.
  - `KernelStateRequest`, `LayoutGenerationRequest`, `AlignmentSampleRequest`, `NoPierZoneRequest`: boxed tipler + `InvalidRequestException`.
- **Korunacak:** `AlternativeGeneratorTest` (6), `BridgeLayoutEngineTest` (7), `LayoutGenerationControllerTest`, `KernelStateControllerTest`, `RuleEngineTest`; Faz 0 anlık görüntüleri (1e-9 toleransla).
- **Kabul:** AC13, AC14, AC15. **Bağımlılık:** Faz 2.

### Faz 7a — LandXML sayısal sağlamlık, yer tutucular ve iç boşluk reddi (C-008-03, C-001-01, A5)
- **Değişecek dosyalar:**
  - `LandXmlParser.java`:
    - `parseNe` en az 2 token ve sonlu değer ister.
    - `radius` sonlu ve > 0; PVI ve kurb uzunluğu sonlu. Aksi `LandXmlParseException` (eleman bağlamıyla).
    - Eksik `Line`/`Curve` için **yer tutucu eklenmez**; eleman "atlandı" olarak kaydedilir.
  - `LandXmlAlignment.java`: atlanan elemanların konum bilgisi eklenir.
  - `LandXmlImportService.java`: seçilen alignment'ta atlanan bir elemandan (eksik Line/Curve veya Spiral) **sonra** başka eleman varsa → IAE `ALIGNMENT_INCOMPLETE: …`. Mesaj alignment adını ve atlanan elemanın sırasını içerir; sonuç 400. Bu A5/E10 kararı (kullanıcı onayladı). Sondaki atlanmış eleman (fixture'daki Spiral) mevcut uyarıyla kabul edilir.
- **Yeni testler:** `LandXmlParserTest` ve `LandXmlImportServiceTest`'e negatif testler (tek token, NaN, `radius=0`, ortada Spiral, ortada eksik Line).
- **Korunacak:** `sample.landxml` sonuçları; `LandXmlImportServiceTest` (6), `BentleyTerrainImportTest` (7), `LandXmlParserTest` (4).
- **Kabul:** AC16. **Bağımlılık:** Faz 2.

### Faz 7b — Düşey profil fail-closed (C-008-01, C-008-02, C-001-04 kısmen, C-001-03 kısmen, C-001-05)
- **Değişecek dosyalar:**
  - `LandXmlParser.java`:
    - Her `ProfAlign` ayrı bir `LandXmlProfile` olarak okunur.
    - Metin içeren `CircCurve`, herhangi bir `ParaCurve`/`UnsymParaCurve` → profil "desteklenmiyor" olarak işaretlenir. Fixture'daki kendini kapatan `<CircCurve length=…/>` biçimi **aynen** davranmaya devam eder (A6, E6).
    - `staStart` okunur.
  - `LandXmlImportService.java`: profil eklenmez (`hasProfile=false`) ve uyarı verilir, eğer: alignment başına > 1 profil varsa (`MULTIPLE_PROFILES`); desteklenmeyen kurb varsa (`VERTICAL_CURVE_UNSUPPORTED`); `staStart` sonlu ve ≠ 0 ise (`STATION_OFFSET_UNCONFIRMED`); `VerticalProfile` değişmez ihlali varsa.
  - `VerticalProfile.java`: PVI chainage'ları sonlu ve kesin artan olmalı (aksi IAE); `covers(chainage)` eklenir.
  - `LandXmlController.java` (profil): kapsam dışındaki chainage'larda `designElevationM = null`.
- **Not:** Terrain status bu uyarılardan etkilenmez (`LandXmlImportService.java:53` ve `:58-69`).
- **Korunacak:** Fixture profil değerleri; `VerticalProfileTest` (4); `elevationAt` imzası; `Alignment.toXYZ(…, VerticalProfile)`.
- **Kabul:** AC17. **Bağımlılık:** 7a.

### Faz 7c — XYZ ve arazi veri bütünlüğü (C-004-01 kısmen, C-010-01 işaretleme, C-010-02, C-010-03)
- **Değişecek dosyalar:**
  - `XyzTerrainParser.java`: BOM temizlenir; sonlu olmayan ve 3'ten fazla sayısal sütunlu satırlar sayılır; `XyzParseResult` döner.
  - `TerrainImportService.java`, yeni `importXyzWithDiagnostics`:
    - Aynı (x,y)'de farklı z (tam eşitlik karşılaştırması, tolerans yok) → `REVIEW_REQUIRED` + sayılı uyarı.
    - 3'ten az tekil nokta veya 0 üçgen → `REVIEW_REQUIRED`.
    - Belirsiz sütun düzeni → `REVIEW_REQUIRED`.
    - Hangi z'nin korunacağı politikası değişmiyor (E8).
  - `TerrainQueryService.java`: sonlu olmayan x/y → `Optional.empty()`.
  - `TerrainImportResponse.java`: `status` ve `warnings` eklenir.
  - `TerrainController.java`: yeni metod kullanılır.
- **Korunacak:** Mevcut yanıt alanları; `importXyz` imzası; `TerrainImportServiceTest`, `XyzTerrainParserTest`, `TerrainQueryServiceTest`; `mesh.bin` biçimi.
- **Kabul:** AC18. **Bağımlılık:** Faz 2.

### Faz 8 — Analiz portu ve adaptör sözleşmesi (F-03, C-002-02, C-003-02, C-002-03, F-06 kısmen, C-009-01 kısmen, C-009-02)
- **Değişecek dosyalar:**
  - `FrameSolver.java`: bilinmeyen mesnet düğümü → IAE; yinelenen düğüm/eleman/malzeme/kesit/link kimliği → IAE; `loadCases.size() > 1` veya bilinmeyen yük durumu adı → IAE.
  - `SolidRectangleSection` (boyutlar sonlu ve > 0), `ElasticLinkElement` (sonlu): değişmezler.
  - `KopruqAnalysisEngine.java`, `MidasCivilNxAnalysisEngine.java`: `getResults` terminal işi map'ten siler. Midas `submit` `synchronized` olur.
  - `MidasModelBuilder.java`: `elasticLinks` veya `uniformLoads` doluysa açık istisna → FAILED.
  - `MidasResultExtractor.java`: `HEAD` javadoc'taki sütun listesiyle eşleşmezse `MidasApiException`. Birim doğrulaması ertelendi.
  - `AnalysisEngine.java`: javadoc güncellenir.
- **Korunacak:** FastSolver mutlu yolu; `FrameSolverTest` (3); midas testleri (16; uygulayıcı fixture'ların yeni kısıtlarla çakışmadığını kontrol etmeli).
- **Kabul:** AC19. **Bağımlılık:** Faz 4.

### Faz 9 — Mimari koruma ve bağımlılık temizliği (F-17, F-12; U3 = şimdi kaldır)
- **Yeni dosya:** `backend/api/src/test/java/com/kopruq/api/architecture/ModuleBoundaryTest.java`.
  - `backend/pom.xml` yukarı doğru aranarak bulunur.
  - Api dışındaki modüllerin `src/main/java` dosyalarında `org.springframework.`, `jakarta.`, `lombok` importu olmamalı.
  - `bridge-core`, `rules-engine`, `generative-engine` içinde `com.kopruq.midas` olmamalı.
  - Modül başına izin verilen `com.kopruq.*` listesi pom bağımlılıklarından türetilir.
  - Api dışında `org.springframework` groupId'li pom bağımlılığı olmamalı.
  - Tarayıcı, sentetik girdiyle negatif bir birim testiyle de sınanır.
- **Değişecek dosyalar:**
  - `backend/analysis-api/pom.xml`: `bridge-core` kaldırılır.
  - `backend/midas-adapter/pom.xml`: `bridge-core` kaldırılır.
  - `backend/api/pom.xml`: `midas-adapter` kaldırılır (P07'de yeniden eklenecek; roadmap'e not düşülür).
  - `docs/architecture.md`: bağımlılık grafiği ve modül ağacı gerçek duruma göre yeniden yazılır.
- **Doğrulanmış önkoşullar:** api'de `com.kopruq.midas` importu yok. `analysis-api`, `midas-adapter` ve `analysis-engine` src altında `com.kopruq.bridgecore` importu yok (main ve test, grep). Jackson api'ye `spring-boot-starter-web` üzerinden geliyor.
- **Kabul:** AC20. **Bağımlılık:** Faz 8.

### Faz 10 — Katmanlama: R12, R2, CORS, atomik import (F-15, F-18, F-13 kısmen, F-11'in atomiklik kısmı)
- **Yeni dosyalar:**
  - `api/config/CoreConfiguration.java`: framework'süz servisler `@Bean` olarak tanımlanır; domain sınıflarına `@Component` eklenmez.
  - `api/config/WebCorsConfiguration.java`: `/api/**`, origin property'si `kopruq.cors.allowed-origins=http://localhost:5173` (mevcut değer), metodlar GET/POST/HEAD, `exposedHeaders: X-Correlation-ID`.
  - `api/landxml/application/LandXmlImportUseCase.java`: commit, terrain kaydı, import kaydı. İkinci yazım başarısız olursa `terrainRepository.deleteById` ile telafi.
  - `api/alignment/application/ChainageSampler.java`: iki mod, **iki mevcut kuralı birebir korur** (U8 cevapsız, birleştirme yok).
- **Değişecek dosyalar:** 12 controller (constructor injection, `@CrossOrigin` kaldırılır); `TerrainRepository` ve `InMemoryTerrainRepository` (`deleteById`); controller'ları `new` ile kuran testler (`AlternativeGenerationControllerTest`, `KernelStateControllerTest`, `LayoutGenerationControllerTest`, `ConcreteMaterialControllerTest`). Bu testlerde yalnızca kurulum satırı mekanik olarak güncellenir, assert'ler değişmez.
- **Korunacak:** Tüm Faz 0 anlık görüntüleri, CORS preflight sonucu, endpoint envanteri.
- **Kabul:** AC21. **Bağımlılık:** Faz 9.

### Onaylanan kapsamın dışında: bloklu iş paketleri (uygulanmayacak)
- **Faz 11 (U4) — F-05:** Builder ve denge kontrolünü framework'süz bir modüle taşımak. Hedef modül kararı bekliyor.
- **B1 `ComputationLimits` (F-07, C-011-02 OOM, devasa sayımlar):** Değerler U1'e bağlı.
- **B2 Sınırlı repository'ler (F-11):** Kapasite veya tahliye politikası U2'ye bağlı. `DELETE` endpoint'i yeni endpoint sayılır.
- **B3 Mühendislik provenansı ve kararları:** F-02 tabloları, F-08, F-09, C-012-02/03/04, C-002-04 aralığı, C-001-03 ofseti, C-001-04 kurbu, C-007-02, C-008-05, C-010-01 politikası, C-004-01 biçimi, C-002-01 göreli eşik. E1–E9 ve E11'e bağlı.
- **B4 F-10 `NOT_EVALUATED`:** U5'e bağlı.
- **Ertelenenler:** F-06'nın port sözlüğü kısmı ve F-14 (port birimleri). P07 ile ele alınmalı. U6 actuator kısıtı ve U8 örnekleme birleştirme de cevap gelene kadar ertelendi.

## 7. Kabul kriterleri

- **AC1.** `backend/pom.xml` içinde `maven-compiler-plugin` 3.16.0 ve `maven-surefire-plugin` 3.5.4 sabitlenmiş; diğer sabitlenen sürümler baseline log ile aynı. Tam build BUILD SUCCESS, 0 failure/error, 1 skipped; compiler için "Ignoring incompatible plugin version" uyarısı yok.
- **AC2.** Endpoint envanteri testi mevcut uç kümesini birebir doğruluyor. Dokunulan her uç için mutlu yol durum kodu, JSON alan adları ve anlık görüntü test altında. `current_*` testleri mevcut kusurları belgeliyor.
- **AC3.** `POST /api/seismic/spectrum`: `spectrumType` ∈ {null, `"type 2"`, `"Type 3"`} veya `groundType` ∈ {`""`, `"AB"`, `"a"`, null} veya sonlu olmayan `agR`/`importanceFactor` → 200, `status:"INVALID"`, `points:[]`. Geçerli `"Type 1"`/`"Type 2"` × `A`–`E` → değerler Faz 0 görüntüsüyle aynı.
- **AC4.** `POST /api/wind-loads/resolve`: null veya tanınmayan `terrainCategory`, sonlu olmayan girdi, `ze < 0` ya da `deckWidthM ≤ 0` → 200 `INVALID` (500 değil). Geçerli girdi → görüntüyle aynı.
- **AC5.** `POST /api/temperature/uniform/resolve`: sonlu olmayan girdi → 200, `INVALID`, ilgili mesaj `missingParameters` içinde. Geçerli girdi değişmiyor.
- **AC6.** `/api/**` altındaki her 4xx/5xx yanıtı `timestamp,status,error,code,message,path,correlationId,errors` anahtarlarını içeriyor. 4xx'te `ResponseStatusException` ve IAE mesajları aynen korunuyor. 5xx `message` genel bir metin ve istisna metni içermiyor. `server.error.include-message` kaldırılmış. Actuator ayarı değişmemiş.
- **AC7.** Bozuk LandXML hem `/inspect` hem `/import`'ta 400 `INVALID_LANDXML`. Alternatives, layout ve fast-solver IAE'leri 400. Inspect'te NPE artık 400 değil.
- **AC8.** Her yanıtta `X-Correlation-ID` var. Geçerli gelen kimlik yankılanıyor, geçersiz olan değiştiriliyor. Hata gövdesindeki `correlationId` başlıkla aynı. 5xx log'u stack trace ve correlationId içeriyor. Analiz motoru FAILED olduğunda log yazılıyor.
- **AC9.** `POST /api/fast-solver/solve`: eksik veya null alan ya da null liste elemanı → 400 ve `errors[].field` alanları adlandırıyor. Sonlu olmayan değer → 400. Pozitif olmayan boyut veya fck → 400. `sdlKnPerM` ve bearing değerlerinde işaret kısıtı yok. Mühendis örneği → 200 COMPLETED, görüntüyle aynı (göreli 1e-9).
- **AC10.** `EurocodeConcrete` fck ≤ 0, NaN veya ±∞ için IAE fırlatıyor. C30/37 değerleri ve 14 sınıflık `/api/materials/concrete` çıktısı değişmemiş.
- **AC11.** Sonlu olmayan deplasman veya reaksiyon üreten analiz `FAILED` dönüyor.
- **AC12.** LM1'de boş liste veya null satır/değer → `lm1Resolved=false`, LM1 uyarısı, 500 yok. `carriageway` null veya sonlu değil → 400. 6 m'den dar taşıt yolu (0 şerit dahil) uyarı veriyor. Mevcut 4 `TrafficLoadsServiceTest` değişmeden geçiyor.
- **AC13.** Integer sınırına yakın aralıklar ve ULP altı adımlarda `AlternativeGenerator` ve `BridgeLayoutEngine` ya doğru sayıda sonuç üretiyor ya da IAE fırlatıyor; zaman aşımlı testlerde döngü sonlanıyor. Mevcut fixture sonuçları aynı.
- **AC14.** NaN veya ±∞ içeren `BridgeSite`, `NoPierZone`, `LayoutDesignSpace`, `Bridge`, `DesignSpace` kurulumu IAE fırlatıyor; REST üzerinden 400. Mevcut domain testleri değişmeden geçiyor.
- **AC15.** kernel-state, alternatives, layout ve alignment-sample uçlarında eksik sayısal alan → 400 ve alan listesi.
- **AC16.** LandXML'de tek token, NaN veya ∞ koordinat, sonlu olmayan veya ≤ 0 `radius`, sonlu olmayan PVI → 400 (500 değil). Eksik Line/Curve için orijinde yer tutucu üretilmiyor. İç boşluklu alignment seçilirse → 400 ve mesaj `ALIGNMENT_INCOMPLETE` ile alignment adını içeriyor. Sondaki Spiral'li fixture sonuçları değişmemiş.
- **AC17.** Birden fazla `ProfAlign`, metin içeren veya desteklenmeyen kurb, `staStart ≠ 0` ya da geçersiz PVI sırası → `hasProfile=false` ve ilgili uyarı; profiller birleştirilmiyor. Fixture profil değerleri aynı. `/profile` yanıtında PVI kapsamı dışında `designElevationM = null`.
- **AC18.** XYZ: BOM'lu ilk satır içe aktarılıyor. NaN veya ∞ içeren satırlar atlanıp sayılıyor. Çelişen z, 3'ten az tekil nokta, 0 üçgen ya da 3'ten fazla sütun → `status:"REVIEW_REQUIRED"` ve uyarı. Yanıta `status` ve `warnings` eklenmiş, diğer alanlar aynı. `/elevation?x=NaN` → `elevationM:null`.
- **AC19.** `FrameSolver` bilinmeyen mesnet, yinelenen kimlik, birden fazla yük durumu ve bilinmeyen yük durumu için açık mesajla FAILED üretiyor. `getResults` sonrası iki motorun job map'i boş. Midas builder link veya yayılı yük içeren istekte FAILED. `HEAD` uyuşmazlığında FAILED. Eşzamanlı Midas `submit` çağrıları sıraya giriyor. FastSolver mutlu yolu değişmemiş.
- **AC20.** `ModuleBoundaryTest` geçiyor; sentetik ihlalde başarısız olduğu testle gösteriliyor. `api → midas-adapter`, `midas-adapter → bridge-core` ve `analysis-api → bridge-core` pom'lardan kaldırılmış. Tam build geçiyor. `docs/architecture.md` bağımlılık grafiği gerçek durumla aynı. Roadmap P07 notu eklenmiş.
- **AC21.** api main kodunda domain servislerinin `new` ile kurulmadığı ve `@CrossOrigin` kalmadığı grep ile görülüyor. `http://localhost:5173`'ten preflight kabul ediliyor; başka origin reddediliyor. İkinci repository yazımı başarısız olursa terrain kalmıyor. Örnekleme çıktıları iki uçta da görüntüyle aynı.
- **AC22.** Her fazdan sonra `docs/architecture.md` ve `docs/roadmap.md` güncel ("BACKEND-REMEDIATION" izi). Pom diff'inde yeni dependency yok (yalnızca plugin sürüm sabitlemesi ve AC20'deki kaldırmalar). Endpoint envanteri testi değişmeden geçiyor. B1–B4 ve Faz 11 kapsamındaki dosyalara dokunulmamış.

## 8. Doğrulama matrisi

Komutlar §6'daki `JAVA_HOME` ve `$MVN` tanımlarıyla çalıştırılır.

| AC | Kontrol / test | Komut | Beklenen sonuç |
|---|---|---|---|
| AC1 | Tam build; log'da uyarı araması | `"$MVN" -B -f backend/pom.xml package` | BUILD SUCCESS, 0 F/E, 1 skip, uyarı yok |
| AC2 | `api/contract/*ContractTest` | `"$MVN" -B -f backend/pom.xml -pl api -am test` | Tümü geçer |
| AC3 | `SeismicSpectrumServiceTest`, contract testi | `-pl traffic-loads -am test`; `-pl api -am test` | INVALID durumları; görüntü eşit |
| AC4 | `WindLoadsServiceTest`, contract testi | aynı | 200 INVALID; görüntü eşit |
| AC5 | `UniformTemperatureServiceTest` | `-pl traffic-loads -am test` | INVALID + mesaj |
| AC6–AC7 | `ApiExceptionHandlerTest` (MockMvc) | `-pl api -am test` | Durum kodları ve gövde anahtarları |
| AC8 | `CorrelationIdFilterTest` + `OutputCaptureExtension` | `-pl api -am test` | Başlık, gövde ve log eşleşir |
| AC9 | `FastSolverModelBuilderTest`, contract testi | `-pl api -am test` | 400 + errors; mutlu yol eşit |
| AC10 | `EurocodeConcreteTest`, `ConcreteMaterialControllerTest` | `-pl analysis-api -am test`; `-pl api -am test` | IAE; değerler aynı |
| AC11 | `KopruqAnalysisEngineTest` | `-pl analysis-engine -am test` | FAILED |
| AC12 | `TrafficLoadsServiceTest`, contract testi | `-pl traffic-loads -am test`; `-pl api -am test` | Uyarılar, NPE yok, 400 |
| AC13 | `AlternativeGeneratorTest`, `BridgeLayoutEngineTest` (`assertTimeoutPreemptively`) | `-pl generative-engine,bridge-layout -am test` | Sonlanır; eski testler geçer |
| AC14–AC15 | Record testleri, contract testi | `-pl bridge-core,bridge-layout,constraints -am test`; `-pl api -am test` | IAE / 400 |
| AC16–AC17 | `LandXmlParserTest`, `LandXmlImportServiceTest`, `VerticalProfileTest`, contract testi | `-pl landxml-import -am test`; `-pl api -am test` | 400 / `hasProfile=false`; fixture aynı |
| AC18 | `XyzTerrainParserTest`, `TerrainImportServiceTest`, `TerrainQueryServiceTest`, contract testi | `-pl terrain -am test`; `-pl api -am test` | REVIEW_REQUIRED; ek alanlar |
| AC19 | `FrameSolverTest`, `KopruqAnalysisEngineTest`, Midas testleri | `-pl analysis-engine,midas-adapter -am test` | FAILED mesajları; map boş |
| AC20 | `ModuleBoundaryTest`; pom diff | `-pl api -am test`; tam `package` | Geçer; negatif test başarısız olur; build geçer |
| AC21 | Contract, CORS ve `LandXmlImportUseCaseTest`; grep `@CrossOrigin` → 0 | `-pl api -am test` | Görüntüler eşit; telafi çalışır |
| AC22 | Pom diff, endpoint envanteri testi, doküman incelemesi | Tam `package` | Yeni bağımlılık yok; dokümanlar güncel |

**Bilinmeyenler:**
- Boot 3.5.16'nın `MaxUploadSizeExceededException` için varsayılan durumu ve Jackson'ın `"NaN"` string'ini zorlayıp zorlamadığı: Faz 0 testleri bunları **ölçer**, varsaymaz.
- Frontend: kod değişmediği için `npm run build` zorunlu değil. CLAUDE.md "build the solution" kuralı gereği son fazdan sonra bir kez `cd frontend && npm run build` çalıştırılıp sonucu kaydedilebilir. Vitest'teki 26 hata önceden var ve kapsam dışı.
- CI tanımlı değil.

## 9. Riskler, geçiş ve geri dönüş

- **Davranış değişiklikleri:** 500 → 400, bozuk import → 400, iç boşluklu hizalama → 400, null spektrum tipi → INVALID, negatif `ze` → INVALID, belirsiz profil → `hasProfile=false`. Frontend genel olarak yalnızca `!res.ok` kontrol ediyor. LandXML ekranı `message` alanını görmeye devam ediyor. Rüzgâr paneli INVALID sonucu 200 ile aldığı için gösteriyor. Profil grafiği belirsiz dosyalarda tasarım kotunu boş gösterecek; bu kasıtlı.
- **Kayan nokta farkları:** İndeks tabanlı adım son bit düzeyinde farklı değer üretebilir. Görüntüler 1e-9 toleransla korunuyor; sınırdaki eleman sayısı değişirse faz durdurulur.
- **Tek seferlik `getResults`:** Port semantiği değişiyor. Şu an yalnızca `FastSolverController` tüketici. Javadoc güncellenecek.
- **Global IAE → 400 eşlemesi:** Programlama hataları da 400 olarak sınıflanabilir. Bu kabul edilmiş bir risk ve loglanacak.
- **Bilgi sızıntısı:** 5xx mesajları kalkıyor. `X-Correlation-ID` girdisi desen kontrolünden geçiyor (log injection'a karşı). Kodda auth yok ve bu plan auth eklemiyor.
- **CORS merkezileştirme:** Varsayılan izinler `@CrossOrigin`'dan farklı olabilir. Preflight testi ve açıkça belirtilen metodlar bu riski kapatıyor.
- **`api → midas-adapter` kaldırılması:** P07'de yeniden eklenmesi gerekir; roadmap'e not düşülecek. Api'de bugün kullanılmıyor (grep).
- **Atomiklik:** Gerçek transaction yok. Telafi yazımı yalnızca süreç içi hatayı kapsıyor; süreç çökerse in-memory durum zaten tamamen kayboluyor.
- **Geçiş:** Kalıcı veri yok, veri geçişi gerekmiyor.
- **Geri dönüş:** Faz başına ayrı commit önerisi; `git revert` tersten sırayla (Faz 10 → 9 → 8 …). Faz 4 Faz 2'ye, Faz 10 Faz 9'a bağlı.

## 10. Varsayımlar ve açık sorular

**Kullanıcının onayladığı kararlar:**
- **A3:** Rüzgârda `ze < 0` ve `deckWidthM ≤ 0` → INVALID.
- **A4/U7:** Ayrı "BACKEND-REMEDIATION" izi; `/feature-implement` onayı milestone onayı sayılır.
- **A5/E10:** İç boşluklu hizalama 400 ile reddedilir; sondaki atlanmış eleman uyarıyla kabul edilir.
- **U3:** Üç kullanılmayan pom bağımlılığı Faz 9'da kaldırılır.

**Varsayımlar** (kullanıcı veto etmedi; veto edilebilir):
- **A1.** Sonluluk ve "uzunluk > 0" kontrolleri mühendislik değeri değildir. Frontend'deki Zod sözleşmesiyle aynıdır.
- **A2.** Yük servislerinde geçersiz girdi için 200 + INVALID deseni korunur.
- **A6.** LandXML şemasında `CircCurve`/`ParaCurve` elemanlarının metni bir PVI'dır. Fixture'daki kendini kapatan biçim projeye özgüdür ve korunur.

**Açık sorular** (yalnızca bloklu paketleri etkiliyor; onaylanan kapsamı bloklamıyor):
- **E1.** Deprem tabloları, plato, periyot aralığı ve adımı, η için provenans; `agR` birimi (B3).
- **E2.** Rüzgâr sabitleri için provenans; INVALID sonuçta `cfx` değeri (B3).
- **E3.** Sıcaklık α değerleri için provenans; T0 aralık dışındaysa INVALID mı uyarı mı (B3).
- **E4.** LM1 değerlerinin onayı; satır sayısı ile şerit sayısı ilişkisi (B3).
- **E5.** fck aralığı C12–C90 ile mi sınırlanmalı (B3).
- **E6.** Kurb tipi ve `staStart` ofseti (B3).
- **E7.** CRS politikası (B3).
- **E8.** XYZ biçimi ve yinelenen nokta politikası (B3).
- **E9.** Gizli yüzler (`F i="1"`) dışlanmalı mı (B3).
- **E11.** Tekil matris için göreli eşik (B3).
- **U1.** `ComputationLimits` değerleri ve aşımda dönecek durum kodu (B1).
- **U2.** Repository kapasitesi, tahliye politikası ve `DELETE` endpoint'i (B2).
- **U4.** F-05 için hedef modül (Faz 11).
- **U5.** `NOT_EVALUATED` durumu (B4).
- **U6.** Actuator yalnızca `health` olsun mu (ertelendi; mevcut davranış korunuyor).
- **U8.** Örnekleme kurallarını birleştirmek (ertelendi; iki kural korunuyor).

Onaylanan kapsam (Faz 0a–10) açık sorulardan bağımsız ve tam tanımlı. Bloklu paketler kapsam dışında tutuluyor.

**READY**
