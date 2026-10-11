# Backend mimari referansı (SPANOVA backend)

## Kaynak

| Alan | Değer |
|---|---|
| Repository | https://github.com/CemHarput/spanova-backend |
| İncelenen commit | `6beb984daa9eb2001199e198613cd5fbccd5a35c` (2026-09-09, "Add OpenAPI configuration and documentation tests") |
| İnceleme tarihi | 2026-10-11 |
| İnceleme yöntemi | `--depth 1` clone, salt okuma |

### İncelenen dosyalar
- `README.md`, `pom.xml`, `compose.yaml`, `src/main/resources/application.properties` ve tam dosya ağacı (80 dosya).
- **Controller:** `project/api/ProjectController.java`, `project/api/ProjectMapper.java`.
- **Application service ve port:** `project/application/ProjectService.java`, `ProjectRepository.java`, `ProjectFileRepository.java`; `workflow/application/GenerationJobService.java` (1-60. satırlar).
- **Model / domain:** `project/model/Project.java` (1-80. satırlar), `generative/domain/AlternativeGenerator.java` (1-50. satırlar).
- **Shared:** `shared/quantity/Length.java`, `shared/validation/Checks.java`.
- **Infra:** `project/infra/JsonProjectFileRepository.java`, `shared/config/CoreConfiguration.java`.
- **Hata:** `shared/exception/ApiExceptionHandler.java`, `ApplicationException.java`.
- **Mimari test:** `src/test/java/com/spanova/architecture/ArchitectureTests.java`.

Dosya ağacında görülüp okunmayan diğer test ve sınıflar bu belgede kanıt olarak kullanılmadı.

## Doğrulanan kurallar (referansta kanıtlı)

Her kural referanstaki kanıtıyla birlikte verilmiştir. "Test" etiketi, kuralın `ArchitectureTests` içinde otomatik olarak denetlendiğini gösterir.

### R1. Modüller iş alanına göre bölünür, her modülün içi katmanlara ayrılır
- **Paket düzeni:** `<feature>/{api, application, model, domain, infra, enums}`.
- **Feature'lar:** `bridge`, `geometry`, `rules`, `generative`, `project`, `workflow`, `shared`.
- **Kanıt:** dosya ağacı, README "Modül sınırları" tablosu.

### R2. Katman sorumlulukları
Her katmanın görevi:

| Katman | Sorumluluk |
|---|---|
| `api` | `@RestController`, istek/yanıt record'ları, statik mapper'lar (`ProjectMapper.toResponse`, `BridgeMapper.toDomain`). |
| `application` | `@Service` + `@Transactional` use-case koordinasyonu (repository, transaction, dosya, executor, saat) ve port arayüzleri. |
| `model` | Durum ve iş kurallarının sahibi olan sınıflar. Aggregate root `Project`'tir (`project.select(expectedRevision, …)` gibi davranış metotları taşır). |
| `domain` | Birden fazla modeli kullanan, framework'süz deterministik hesaplar (`AlternativeGenerator`, `SpanLayoutGenerator`, `RuleEngine`). |
| `infra` | Port uygulamaları (`JsonProjectFileRepository implements ProjectFileRepository`) ve executor yapılandırması. |
| `shared` | Ortak altyapı ve tipler: `quantity` (SI `Length`), `validation` (`Checks`), `exception`, `config`. |

**Kanıt:**
- `ProjectController.java:17-53`: controller'da iş kuralı yok; yalnızca mapper + service çağrısı yapıyor.
- `ProjectService.java:24-83`: servis yalnızca koordinasyon yapıyor.
- README "İş kurallarının yeri: kısmi DDD".

### R3. Model ve domain katmanları application, api veya Spring'e bağımlı olamaz (Test)
- **Kanıt:** `ArchitectureTests.domainDoesNotDependOnApplicationServicesOrHttp`. `model/` ve `domain/` paketlerindeki import'larda `.application.`, `.api.` ve `org.springframework.` yasak.
- **Not:** `jakarta.persistence` bu yasağın kapsamında değil.

### R4. Hesaplama paketleri izin listesindeki bağımlılıklarla sınırlıdır (Test)
- **Kanıt:** `ArchitectureTests.algorithmsDoNotDependOnPersistenceAdaptersOrHttp`.
  - `geometry` ve `rules/domain` yalnızca şunları import edebilir: `java.`, kendi paketi, `bridge.model`, `bridge.enums`, `shared`.
- **Ek doğrulama:** `generative/domain`, `geometry/domain` ve `rules/domain` altında `java.` ve `com.spanova.` dışında hiç import yok (grep ile kontrol edildi).

### R5. İş kuralı önce sahibi olan modelde yer alır
- Birden fazla modeli kapsayan kural domain servisine konur.
- Application servisi kural atlanamayacak şekilde model metodunu çağırır.
- **Kanıt:**
  - `ProjectService.java:43-70`: `requiredProject(id).update(...)` / `.select(...)`.
  - README: "Yeni bir iş kuralı önce sahibi olan modelde…".

### R6. Kalıcılık arayüzleri application katmanındadır, uygulamaları infra'dadır
- **Kanıt:**
  - `ProjectFileRepository` (`application`) → `JsonProjectFileRepository` (`infra`).
  - `ProjectRepository extends JpaRepository` `application` paketinde duruyor (Spring Data arayüzü port olarak kullanılıyor).

### R7. Domain hata sözleşmesi framework'süzdür; HTTP'ye çeviri tek noktada yapılır
- **Kanıt:**
  - `ApplicationException(code, message)` (`shared/exception/ApplicationException.java:3-13`).
  - `ApiExceptionHandler.java:37-46`: `code` → HTTP durumu eşlemesi yalnızca burada.
  - Tek tip `ErrorResponse(code, message, correlationId, errors)`; `unit` alanı metre.
  - Beklenmeyen hatada iç detay sızdırılmıyor (`:73-77`).

### R8. Doğrulama iki katmanlıdır
- **İstek şekli:** Bean Validation ile, `@Valid` ve `@NotNull`/`@Positive` (`ProjectController.java:50-53`).
- **Domain invariant'ları:** `Checks` ile (`Project.java:52-65`, `Length.java:10-14`).
- **Sıkı JSON okuma:** bilinmeyen alan, sondaki token ve skaler zorlama reddediliyor (`JsonProjectFileRepository.java:22-28`).

### R9. Birimler açık ve SI'dır
- `Length` metre tutar ve sonlu, negatif olmayan değer zorunludur (`Length.java:6-14`).
- API'deki uzunluklar metredir, örtük birim dönüşümü yapılmaz (README "Üretim sözleşmesi").

### R10. Mühendislik varsayılanı uydurulmaz
- Örnek: `slabThickness` zorunludur.
- Hesaplama limitleri mühendislik eşiği olmadığı açıkça yazılarak ayrı tutulur (`GenerationLimits`).
- Tanımsız yapısal kontroller açık `WARN` (`STRUCTURAL_CHECKS_NOT_CONFIGURED`) olarak raporlanır.
- **Kanıt:** README "Üretim sözleşmesi ve açık politikalar", `AlternativeGenerator.java:29-35`.

### R11. Record'lar yalnızca taşıma DTO'larında kullanılır; DTO'lar dönüşüm mantığı taşımaz (Test)
- **Kanıt:** `ArchitectureTests.recordsAreLimitedToTransportDtos`.

### R12. Bean bağlama ve framework'süz domain servisleri `@Configuration` ile kurulur
- **Kanıt:** `CoreConfiguration.java:20-23`: `new AlternativeGenerator(new SpanLayoutGenerator(), new RuleEngine(), …)`. Domain sınıflarında `@Component` yok.
- `Clock` enjekte edilir (`CoreConfiguration.java:15-18`, `ProjectService.java:29`).

### R13. Eşzamanlılık ve tutarlılık
- Domain düzeyinde `revision` + `expectedRevision` kontrolü yapılır.
- Teknik kilitleme için `@Version` ve `PESSIMISTIC_WRITE` kullanılır (`ProjectRepository.java:13-15`, `Project.java:24-25`).
- Dosya yazımı atomiktir: önce geçici dosya, sonra `force`, sonra `ATOMIC_MOVE` (`JsonProjectFileRepository.java:31-53`).

### R14. Gözlemlenebilirlik
- `CorrelationFilter` ve MDC ile her yanıta `X-Correlation-ID` eklenir.
- Actuator'da yalnızca `health` açıktır.
- **Kanıt:** `application.properties`, README "Hatalar ve izlenebilirlik".

### R15. Kalıcılık altyapısı
- Spring Data JPA ve PostgreSQL (runtime) kullanılır.
- Yerel veritabanı Docker Compose ile çalışır: `compose.yaml` içinde `postgres:17` ve healthcheck var; test profili `postgres-test` tmpfs üzerinde çalışır.
- Bağlantı bilgileri ortam değişkenlerinden okunur (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`).
- `open-in-view=false`.
- Testler H2'nin PostgreSQL modunda çalışır; gerçek PostgreSQL testi ayrı bir script ile yapılır.

### R16. Referanstaki bağımlılık seti
`pom.xml`:
- `spring-boot-starter-webmvc`, `-validation`, `-actuator`, `-data-jpa`
- `postgresql` (runtime), `spring-boot-devtools` (runtime, optional)
- test için `h2` ve `*-test` starter'ları
- `springdoc-openapi`

## KOPRUQ'a uyarlama

Referans teknolojisi KOPRUQ'tan farklı:

| | SPANOVA (referans) | KOPRUQ |
|---|---|---|
| Java | 26 | 21 |
| Spring Boot | 4.1.1 | 3.5.16 |
| Yapı | Tek Maven modülü | Maven çok modüllü (14 modül) |

Hedef teknoloji değiştirmek değil. Hedef, modül organizasyonunu, sorumluluk ayrımını ve bağımlılık ilkelerini KOPRUQ'un mevcut yapısında uygulamak. Referanstaki iş alanları (project, workflow, generation-job vb.) KOPRUQ'a birebir kopyalanmaz.

| Referans kuralı | KOPRUQ karşılığı |
|---|---|
| R1 feature + katman paketleri | Feature sınırları KOPRUQ'ta Maven modülleriyle zaten çizili (`bridge-core`, `rules-engine`, `generative-engine`, `terrain`, `alignment`, `traffic-loads`…). `api` modülü içinde de her feature için `api` (controller, DTO, mapper), `application` (use-case servis, port) ve `infra` alt paketleri kullanılmalı. |
| R2 controller ince, servis koordinasyon | `backend/api` controller'larında iş kuralı veya model kurma kodu olmamalı. Bunlar application servisine ya da framework'süz bir modüle ait. |
| R3/R4 domain framework'süz (Test) | **Daha sıkı uygulanır.** CLAUDE.md gereği `api` dışındaki tüm modüller Spring'den bağımsız kalır. `bridge-core` MIDAS, SCIA veya ALLPLAN'a da bağımlı olamaz. Referanstaki `ArchitectureTests` deseni (import izin listesi) KOPRUQ'ta modül başına mimari test olarak uyarlanmalı. Pom düzeyindeki bağımlılıklar da kontrol edilmeli. |
| R5 iş kuralı modelde/domain'de | Mühendislik ve iş kuralları ilgili framework'süz modülde (`rules-engine`, `generative-engine`, `bridge-core`…) yer alır, `api`'de değil. |
| R6 port application'da, uygulama infra'da | KOPRUQ'ta da `analysis-api` (port) ile `midas-adapter` (uygulama) aynı ilkeyi izliyor. Port tipleri solver'a özgü kavram taşımamalı. |
| R7 framework'süz hata sözleşmesi + tek handler | KOPRUQ'ta karşılığı yok. Önerilen: framework'süz modüllerde kodlu bir istisna, `api`'de tek bir `@RestControllerAdvice` ve tutarlı `ErrorResponse`. |
| R8 Bean Validation + domain Checks | `spring-boot-starter-validation` yalnızca `api`'ye eklenir. Domain invariant'ları modüllerde düz Java kontrolleriyle kalır. |
| R9 SI birimler | CLAUDE.md ile aynı. Uzunluk tipi gibi bir değer nesnesi ortak framework'süz bir modülde tutulabilir. |
| R10 mühendislik varsayılanı yok | CLAUDE.md "Engineering safety rules" ile aynı ve bağlayıcı. Hesaplama limitleri ile mühendislik eşikleri ayrı tutulmalı. |
| R11 record yalnızca DTO | **Opsiyonel.** KOPRUQ'ta değer nesneleri için record kullanımı yasak değil. Benimsenmesi mühendis/kullanıcı kararıdır. Review'da ihlal sayılmaz, yalnızca not edilir. |
| R12 `@Configuration` ile framework'süz bean kurma | `api` modülünde framework'süz modül sınıfları `@Configuration` ile bean yapılır. Framework'süz modüllere `@Component` eklenmez. |
| R13 revizyon / atomik dosya | Kalıcılık eklendiğinde uygulanır (aşağıya bakın). |
| R14 correlation ID, yalnızca health | `management.endpoints.web.exposure.include` daraltılabilir. Correlation filtresi `api`'de olur. |
| R15/R16 JPA + PostgreSQL + Compose | Aşağıdaki "Bağımlılıklar" bölümüne bakın. |

### KOPRUQ'un referanstan bilinçli olarak ayrıldığı nokta: JPA eşlemesinin yeri
- **Referansta:** domain modelleri doğrudan `@Entity` ve `@Embeddable` ile işaretli. `ArchitectureTests.persistentModelsAreDirectJpaModels` bunu zorunlu tutuyor.
- **KOPRUQ'ta:** CLAUDE.md, `api` dışındaki modüllerin framework'süz ve tek başına test edilebilir kalmasını istiyor. `bridge-core`, `rules-engine` ve `generative-engine` sınıflarına `jakarta.persistence` eklemek bu ilkeyle çelişir.
- **Uyarlama:** Kalıcılık eklendiğinde JPA entity'leri ve repository'leri `api` modülünde ya da ileride onaylanacak ayrı bir kalıcılık modülünde (`infra`) tutulmalı. Framework'süz model ile entity arasındaki dönüşüm mapper ile yapılmalı.
- Bu, referanstaki "ayrı persistence modeli yok" tercihinden bilinçli bir sapmadır. Kararı mühendis ve kullanıcı verir.

## Bağımlılıklar (kullanıcının belirttiği aday set)

Durum sütunu KOPRUQ'un `backend/api/pom.xml` dosyasının 2026-10-11 tarihli halini yansıtıyor.

| Bağımlılık | KOPRUQ'ta durum | Not |
|---|---|---|
| Spring Web | **Var** (`spring-boot-starter-web`, `api`) | |
| Validation | Yok | Yalnızca `api`'ye. Controller DTO'larında `@Valid` için gerekli. |
| Spring Boot Actuator | **Var** (`api`) | `health,info` açık. Referans yalnızca `health` açıyor. |
| Spring Boot DevTools | Yok | `runtime`, `optional`. Yalnızca geliştirme amaçlı. |
| Spring Boot Test | **Var** (`spring-boot-starter-test`, `api`) | |
| Spring Data JPA | Yok | Yalnızca `api`'ye ya da onaylı bir persistence modülüne. |
| PostgreSQL Driver | Yok | `runtime` kapsamı. |
| Docker Compose ile PostgreSQL | Yok (`compose.yaml` yok) | Referanstaki `compose.yaml` deseni: `postgres:17`, healthcheck, ortam değişkenli parola, ayrı test profili. |

**Kural (CLAUDE.md):** Bir Maven bağımlılığı, onu gerektiren milestone onaylanmadan eklenmez. Bu tablo bir hedef listesidir, kendiliğinden ekleme yetkisi vermez. Backend review'ında bu bağımlılıkların eksik olması tek başına bulgu sayılmaz. Bulgu sayılan durumlar şunlardır:
- mevcut kodun bu bağımlılıkların çözeceği bir sorunu elle ve hatalı biçimde çözmesi (ör. Bean Validation yerine elle yapılmış eksik doğrulama),
- bu bağımlılıkların yanlış modüle eklenmesi.

## Backend review'ında kullanım
Review sırasında bu belge mimari hedef olarak kullanılır:
- KOPRUQ ile referans arasındaki farklar R1–R16 kurallarına göre raporlanır.
- "KOPRUQ'a uyarlama" tablosu hangi kuralın nasıl uygulanacağını belirler.
- CLAUDE.md ile çelişen yerlerde CLAUDE.md geçerlidir.
- Review düzeltme uygulamaz.
