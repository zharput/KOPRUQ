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

## KOPRUQ'a uyarlama (revizyon 2026-10-12)

**Karar (2026-10-12):** Eski "api dışındaki her modül framework'süz, ayrı Maven modülü" kuralı kaldırıldı (CLAUDE.md ve `docs/architecture-amendment-v2.md` "Revision 2026-10-12"). KOPRUQ backend'i, referans gibi **tek Maven modülünden oluşan bir Spring Boot modüler monolith** olur. Klasör ve paket yapısı referansla aynıdır.

| | SPANOVA (referans) | KOPRUQ (hedef) |
|---|---|---|
| Java | 26 | 21 (değişmez) |
| Spring Boot | 4.1.1 | 3.5.x (değişmez) |
| Yapı | Tek Maven modülü, domain'ler paket | Tek Maven modülü, domain'ler paket |

Java ve Spring Boot sürümü yükseltilmez. Referanstaki iş alanları (project, workflow, generation-job vb.) birebir kopyalanmaz. KOPRUQ'un kendi domain'leri (bridge, rules, generative, analysis, terrain, alignment, landxml, loads, materials…) aynı klasör düzeniyle kurulur.

**Hedef klasör yapısı:**
```
backend/src/main/java/com/kopruq/
  KopruqApplication.java
  <domain>/
    api/          controller, request/response DTO, mapper
    application/  use-case servisleri, transaction, port/repository arayüzleri
    domain/       birden fazla modeli kullanan framework'süz domain servisleri/algoritmalar
    model/        iş kurallarını ve invariant'ları taşıyan domain modelleri
    enums/        domain enum'ları
    infra/        adapter'lar (dosya, solver adapter, ileride kalıcılık)
  shared/
    config/  exception/  quantity/  validation/
```
Bir domain'de ihtiyaç olmayan alt paket açılmaz.

| Referans kuralı | KOPRUQ karşılığı |
|---|---|
| R1 feature + katman paketleri | **Aynen.** `com.kopruq.<domain>/{api,application,domain,model,enums,infra}`. |
| R2 controller ince, servis koordinasyon | Aynen. Controller yalnızca mapper + application servisi çağırır. |
| R3 model/domain → application/api/Spring yok (Test) | **Aynen.** Spring `api`, `application`, `infra`, `shared.config` paketlerinde serbest. `model` ve `domain` paketleri `org.springframework.`, `..application..`, `..api..` import etmez. Ayrıca bridge/rules/generative domain'leri MIDAS/SCIA/ALLPLAN tiplerine bağımlı olamaz (CLAUDE.md). |
| R4 algoritma izin listesi (Test) | Aynen; referanstaki `ArchitectureTests` deseniyle paket bazlı import izin listesi. Domain sınırları Maven modülleriyle değil, bu testlerle korunur. |
| R5 iş kuralı modelde/domain'de | Aynen. |
| R6 port application'da, uygulama infra'da | Aynen. Analiz portu `analysis` domain'inde, solver adapter'ları `analysis/infra/...` altında. Port tipleri solver'a özgü kavram taşımaz. |
| R7 framework'süz hata sözleşmesi + tek handler | Aynen: `shared/exception` (kodlu istisna + `ApiExceptionHandler`). |
| R8 Bean Validation + domain Checks | `spring-boot-starter-validation` eklenmesi milestone onayı ister (CLAUDE.md). Domain invariant'ları modellerde kalır. |
| R9 SI birimler | Aynen; `shared/quantity` uygun yer. |
| R10 mühendislik varsayılanı yok | CLAUDE.md ile aynı ve bağlayıcı. |
| R11 record yalnızca DTO | **Opsiyonel** (mühendis/kullanıcı kararı); review'da ihlal sayılmaz. |
| R12 `@Configuration` ile bean kurma | Aynen: framework'süz domain servisleri `shared/config` (veya domain `infra`/config) içinde `@Bean` olur; Spring bileşenleri (`@Service`, `@RestController`) `application`/`api` paketlerinde. |
| R13 revizyon / atomik dosya | Kalıcılık eklendiğinde uygulanır. |
| R14 correlation ID, yalnızca health | Aynen; `shared/config`. |
| R15/R16 JPA + PostgreSQL + Compose | **Uygulandi (feature `backend`, 2026-10-12).** PostgreSQL 17 + Spring Data JPA + Flyway (`ddl-auto=validate`), `open-in-view=false`, baglanti `DB_URL/DB_USERNAME/DB_PASSWORD`, testler H2 (PostgreSQL modu), `compose.yaml` (`postgres`, `backend`, `postgres-test`), `backend/Dockerfile`. Bilincli sapmalar: (1) JPA entity'leri `model` record'larina degil ayri `<domain>/infra/persistence` siniflarina konur ve elle eslenir (`model` framework'suz kalir; `jakarta.persistence` core katmanlarda artik YASAK, `ArchitectureTests` `persistenceImportViolations`); (2) portlar `application`'da framework'suz arayuz (R6), `Jpa*Repository` adapter'i infra'da; (3) `validation` starter, devtools, springdoc eklenmedi (yeni endpoint yok, milestone onayi yok). Bagimliliklar: `spring-boot-starter-data-jpa`, `flyway-core`, `flyway-database-postgresql` (runtime), `postgresql` (runtime), `h2` (test). |

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
