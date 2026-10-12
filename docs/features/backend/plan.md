# Plan: backend (PostgreSQL + JPA kalıcılığı + Docker)

Repo kökü: `C:\Users\cemha\repos\KOPRUQ`. Yollar bu köke göredir.
Kullanıcı kararları: Q1 kapsam = Terrain + LandXML + Bridge domain; Q2 = PostgreSQL 17 + H2 (test); Q3 = `start-dev.bat` compose ile postgres başlatır, runtime in-memory modu kalmaz; Q4 = compose postgres + backend (+ postgres-test profili), frontend container'ı yok, Docker Desktop kurulu.

## 1. Amaç ve kapsam dışı

**Amaç.** Referans (`docs/architecture/backend-reference.md` R6, R13, R15, R16) model alınarak backend kalıcı DB kullanır:
- PostgreSQL 17, Spring Data JPA, Flyway (`ddl-auto=validate`).
- Testler H2 (PostgreSQL modu).
- Bağlantı ortam değişkenlerinden: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. Repo'ya secret yazılmaz.
- `spring.jpa.open-in-view=false`.

Kalıcı hale gelenler: (1) `TerrainModel`; (2) `LandXmlImportResult` (alignment, düşey profil, uyarılar, terrain referansı); (3) Bridge domain: `Project` aggregate'i (`Bridge`, `DesignSpace`, `BridgeAlternative`, `SpanLayout`/`Span`, `Girder`, `Deck`, `Pier`, `Foundation`).
Sonra Docker: `backend/Dockerfile`, `backend/.dockerignore`, kökte `compose.yaml`, `.env.example`; `start-dev.bat` güncellenir.

**Kapsam dışı**
- Yeni REST endpoint/controller/frontend özelliği YOK (CLAUDE.md). Bridge için yalnızca entity, Spring Data repository, `application` portu, `infra` adapter'ı ve testler. 12 controller ve endpoint envanteri değişmez. Project'i kaydeden use-case/endpoint ayrı milestone.
- Hesaplanan sonuçlar kalıcı yapılmaz: rule sonuçları (`RuleEngineResult`, `EvaluatedAlternative`), layout çıktıları, loads sonuçları, analiz işleri/sonuçları (MIDAS), materials. Gerekçe: girdiden deterministik yeniden hesaplanır; saklanırsa kural değişince eskimiş mühendislik değerleri "doğru" gibi kalır; hiçbir milestone saklama sözleşmesi tanımlamadı.
- Frontend localStorage durumu taşınmaz.
- Domain düzeyinde revizyon kontrolü (`expectedRevision`, R13) yok; yalnızca teknik `@Version`.
- Spring Boot/Java yükseltilmez; `spring-boot-docker-compose`, devtools, validation starter, springdoc, Testcontainers eklenmez.
- Hiçbir mühendislik kuralı/varsayılan/limit eklenmez; mühendislik kolonlarında DB `DEFAULT` ve değer `CHECK`'i yok.

## 2. Mevcut mimari (doğrulanmış)
- Tek Maven modülü `backend/pom.xml`, Boot 3.5.16, Java 21. Bağımlılıklar: starter-web, actuator, jts-core, jackson-databind, starter-test (test), junit-jupiter (test). Liste `ArchitectureRules.APPROVED_POM_DEPENDENCIES` ile sabit; `ArchitectureTests.t10` sentetik `APPROVED` string'i aynı listeyi tekrarlar.
- `ArchitectureRules.classify` `com.kopruq.<domain>.infra.<sub>` kabul eder. `coreIsolationViolations` core'da `jakarta.persistence.*`'e şu an izin verir (`t2`, ~176. satır "clean" doğrular). `externalAllowed` api/application/infra'da `org.springframework.`, `jakarta.`, `org.slf4j.`, `com.fasterxml.jackson.` önekine izin verir. `restControllers_onlyInDomainApi_andExactlyTwelve` controller sayısını 12'ye sabitler.
- Portlar: `terrain/application/TerrainRepository` (save, findById, deleteById) → `terrain/infra/InMemoryTerrainRepository`; `landxml/application/LandXmlImportRepository` (save, findById) → `landxml/infra/InMemoryLandXmlImportRepository`; ikisi `shared/config/SharedRepositoriesConfig`'te bean. `CoreConfiguration` framework'süz servisleri `@Bean` ile kurar. `LandXmlImportUseCase.importLandXml` önce terrain, sonra import kaydeder; ikinci başarısız olursa terrain'i `deleteById` ile geri alır (transaction yok). In-memory sınıflar `LandXmlImportUseCaseTest`, `LongitudinalProfileServiceTest`, `LandXmlImportQueriesTest`, `TerrainServicesTest`'te kullanılır.
- Modeller: `TerrainModel` record (id String UUID, serbest `projectId`, `CoordinateSystem(epsgCode,name)` nullable alanlar, `List<Point3D>`, `List<TerrainTriangle>`, `localOrigin`, `version`, `TerrainStatus`, boundaries/breaklines, nullable `TerrainSource`; <3 noktada bounds `±Infinity` olabilir). `LandXmlImportResult(id, terrain, alignment|null, profile|null, warnings)`; `Alignment` final sınıf, eleman getter'ı yok; `HorizontalElement` sealed (`StraightElement`, `CurveElement`); `VerticalProfile` ≥2 PVI. `bridge/model`: `Project` mutable, id alanı yok; `Bridge`, `DesignSpace`, `BridgeAlternative` (id UUID), `SpanLayout`, `Span`, `Girder`, `Deck`, `Pier`, `Foundation` immutable record; production'da `Project` kullanılmıyor.
- `@SpringBootTest` kullananlar: `ContractTestSupport`, `ApiExceptionHandlerTest`, `CorrelationIdFilterTest` → JPA sonrası datasource gerekir. `application.properties`'te datasource yok; `.gitignore` `.env`/`.env.*` yok sayar, `!.env.example` var. Repo'da Dockerfile/compose yok. `backend/README.md` ~101. satır "JPA/PostgreSQL ... future".

## 3. Tasarım

### 3.1 Sınırlar
- `model` framework'süz kalır. JPA entity'leri ayrı sınıflar: `terrain.infra.persistence`, `landxml.infra.persistence`, `bridge.infra.persistence`.
- Portlar `application`'da framework'süz arayüz (R6'nın uyarlaması). `*JpaRepository extends JpaRepository` infra'da. Adapter'lar `@Repository` + `@Transactional`, elle yazılmış mapper'larla entity↔domain.
- Referanstan bilinçli sapma: referans JPA'yı doğrudan modele koyar; burada record'lar/`Alignment` JPA tipi olamaz, TIN binary kodlanır, CLAUDE.md model katmanını framework'süz ister.
- Rehydration model kurucularıyla: invariant'lar okumada yeniden doğrulanır.

### 3.2 Bağımlılıklar (sürümleri Boot BOM yönetir)
`spring-boot-starter-data-jpa`, `flyway-core`, `flyway-database-postgresql` (runtime), `org.postgresql:postgresql` (runtime), `com.h2database:h2` (test).

### 3.3 Yapılandırma
`application.properties`: `spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/kopruq}`, `username=${DB_USERNAME:kopruq}`, `password=${DB_PASSWORD}` (varsayılan YOK, fail-fast), `spring.jpa.open-in-view=false`, `spring.jpa.hibernate.ddl-auto=validate`, `spring.flyway.locations=classpath:db/migration`.
Yeni `backend/src/test/resources/config/application.properties` (ana dosyaya ek, daha yüksek öncelik; multipart/CORS korunur, mevcut `@SpringBootTest`'ler değişmez): `url=${KOPRUQ_TEST_DB_URL:jdbc:h2:mem:kopruq;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1}`, `username=${KOPRUQ_TEST_DB_USERNAME:sa}`, `password=${KOPRUQ_TEST_DB_PASSWORD:}`. Env verilirse aynı testler gerçek PG'ye karşı koşar.

### 3.4 Şema (Flyway `V1__terrain_landxml.sql`, `V2__bridge_project.sql`)
Tipler: VARCHAR, DOUBLE PRECISION, INTEGER, BIGINT, BOOLEAN, UUID, TIMESTAMP WITH TIME ZONE, BYTEA (H2-PG modu ve PG 17'de geçerli).

**Terrain (V1):** `terrain` (id varchar(36) PK, `project_id` NOT NULL FK'sız, `crs_epsg_code`, `crs_name`, `source_type`, `source_file_name`, `bounds_min/max_x/y/z`, `min/max_elevation_m`, `local_origin_x/y/z`, `version` int, `status` varchar (STRING enum), `vertex_count`, `vertices bytea NOT NULL`, `triangle_count`, `triangles bytea NOT NULL`, `row_version bigint` (@Version)); `terrain_source` (0..1, PK=FK terrain(id), 12 alan); `terrain_boundary` (terrain_id FK, ordinal, name, type, edge_trim, point_count, points bytea); `terrain_breakline` (terrain_id FK, ordinal, name, point_count, points bytea).

**LandXML (V1):** `landxml_import` (id PK, `terrain_id` NOT NULL FK, `profile_name` nullable); `landxml_import_warning` (import_id, ordinal, message); `landxml_alignment_element` (import_id, ordinal, kind STRAIGHT|CURVE, start_x/y/z, end_x/y/z, center_x/y/z, radius_m, clockwise nullable yalnızca CURVE için dolu); `landxml_profile_pvi` (import_id, ordinal, chainage_m, elevation_m, curve_length_m). Eleman satırı yok ⇒ alignment null; PVI satırı yok ⇒ profile null.

**Bridge (V2):** `project` (id uuid PK, project_name, created_utc timestamptz, selected_alternative_id uuid nullable FK'sız, row_version); `project_bridge` (0..1, PK=FK; bridge_name, total_length_m, deck_width_m NOT NULL); `project_design_space` (0..1, PK=FK; DesignSpace'in 15 alanı birebir NOT NULL, `girder_depth_step_m` dahil, default yok); `bridge_alternative` (id uuid PK, project_id FK, ordinal, girder_count/depth_m/spacing_m NOT NULL; `deck_slab_thickness_m`; `pier_diameter_m`, `pier_height_m`, `pier_type`; `foundation_type`, `foundation_pile_count`, `foundation_pile_diameter_m` — nullable; varlık semantiği: deck ⇔ slab kalınlığı NOT NULL, pier ⇔ diameter NOT NULL, foundation ⇔ type NOT NULL; yalnızca yapısal `CHECK ((pier_diameter_m IS NULL) = (pier_height_m IS NULL))`; PILE/SPREAD–kazık alanı kısıtı YOK); `bridge_alternative_span` (alternative_id FK, span_index, length_m; @ElementCollection + @OrderColumn).

| Domain tipi | Saklama |
|---|---|
| Project | aggregate root, `project` |
| Bridge | değer nesnesi, `project_bridge` (0..1) |
| DesignSpace | değer nesnesi, `project_design_space` (0..1) |
| BridgeAlternative | kimlikli child entity, `bridge_alternative` (sıralı) |
| SpanLayout/Span | element collection |
| Girder / Deck / Pier / Foundation | embedded (Girder NOT NULL, diğerleri nullable) |
| FoundationType | enum STRING |

### 3.5 TIN kodlaması
`terrain.infra.persistence.TinBinaryCodec`: Point3D nokta başına 24 bayt (3× little-endian double); üçgen 3× little-endian int. Okumada bayt uzunluğu = count×stride ve üçgen indeksi 0..vertexCount-1 doğrulanır, aksi `IllegalStateException` (sessiz kırpma yok). Double bit-bit saklanır (NaN, ±Infinity dahil). Boundary/breakline noktaları da aynı codec.

### 3.6 Mühendislik güvenliği
DB `DEFAULT` yok; `CHECK` yalnızca yapısal; değer doğrulaması modelde ve rehydration'da; SI birimler, kolon adlarında `_m`; kural eklenmez, eksik veri varsayılanla doldurulmaz; `Pier.pierType` serbest metin.

### 3.7 Adapter'lar ve akış
- `JpaTerrainRepository implements TerrainRepository`: save (upsert), findById (readOnly tx içinde entity→domain), deleteById.
- `JpaLandXmlImportRepository implements LandXmlImportRepository`: save yalnızca `terrain_id` referansı yazar (terrain'i use-case kaydeder); findById terrain'i `TerrainRepository` portundan yükler (`landxml→terrain` kenarı zaten mevcut); terrain yoksa `IllegalStateException`.
- `JpaProjectRepository implements bridge.application.ProjectRepository` (`Project save(Project)`, `Optional<Project> findById(UUID)`): child alternative'leri id ile birleştirir (var olanı günceller, olmayanı orphanRemoval ile siler, yenisini ekler, ordinal'i yeniden atar) — Hibernate flush'ta INSERT DELETE'ten önce çalıştığı için "temizle ve yeniden ekle" PK ihlali verir.
- `Project`'e `private UUID id = UUID.randomUUID()` + `getId()/setId(UUID)` (mevcut davranış değişmez). `Alignment`'a `public List<HorizontalElement> elements()` (immutable liste).
- `LandXmlImportUseCase`: yeni kurucu `(importService, terrainRepo, importRepo, TransactionOperations tx)`; parse transaction dışında, iki `save` `tx.executeWithoutResult` içinde atomik. Mevcut 3 argümanlı kurucu `TransactionOperations.withoutTransaction()` ile delege eder (mevcut testler/telafi değişmez). `CoreConfiguration` `TransactionTemplate(PlatformTransactionManager)` verir.
- `SharedRepositoriesConfig` silinir; adapter'lar component scan ile bulunur. `InMemoryTerrainRepository` ve `InMemoryLandXmlImportRepository` aynı paket adlarıyla `src/test/java`'ya taşınır.

### 3.8 ArchitectureTests
- `APPROVED_POM_DEPENDENCIES` ve `t10 APPROVED` string'ine 5 yeni bağımlılık.
- Yeni `persistenceImportViolations`: `jakarta.persistence.`, `org.springframework.data.`, `org.hibernate.` yalnızca `<domain>.infra.persistence` içinde; core katmanlarda `jakarta.persistence` artık yasak (`t2` ~176. satır tersine çevrilir); sentetik `t11` (ihlal yakalanır, temiz geçer).
- Controller sayısı 12, `DOMAIN_DEPS` değişmez.

### 3.9 Docker
- `backend/Dockerfile` çok aşamalı: `maven:3.9-eclipse-temurin-21` (önce pom + `dependency:go-offline`, sonra `src` + `mvn -B -DskipTests package`); çalışma `eclipse-temurin:21-jre`, root olmayan kullanıcı, `EXPOSE 8080`, `java -XX:MaxRAMPercentage=75 -jar /app/app.jar`.
- `backend/.dockerignore`: `target/`, IDE dosyaları, `*.log`.
- `compose.yaml` (kök): `postgres` (`postgres:17`, `POSTGRES_DB=${DB_NAME:-kopruq}`, `POSTGRES_USER=${DB_USERNAME:-kopruq}`, `POSTGRES_PASSWORD=${DB_PASSWORD:?...}`, named volume `kopruq-pgdata`, `${DB_PORT:-5432}:5432`, `pg_isready` healthcheck); `backend` (`build: ./backend`, `DB_URL=jdbc:postgresql://postgres:5432/${DB_NAME:-kopruq}`, `DB_USERNAME`, `DB_PASSWORD`, `depends_on` service_healthy, `8080:8080`); `postgres-test` (`profiles: ["postgres-test"]`, tmpfs data, `${DB_TEST_PORT:-5433}:5432`, `POSTGRES_DB=kopruq_test`, healthcheck).
- `.env.example`: `DB_NAME`, `DB_USERNAME`, `DB_PORT`, `DB_TEST_PORT`, boş `DB_PASSWORD=`.
- `start-dev.bat`: `.env` yoksa mesajla çık; `.env`'i `for /f "usebackq eol=# tokens=1,* delims=="` ile ortama al; `docker compose up -d --wait postgres` (hatada çık); `DB_URL` yoksa `jdbc:postgresql://localhost:%DB_PORT%/%DB_NAME%`; sonra mevcut Maven build, backend, frontend adımları.

## 4. Alternatifler (reddedilenler)
1. JPA'yı doğrudan modele koymak — record/`Alignment` uygun değil, framework'süzlük kaybolur.
2. `ddl-auto=update` — sürümlü şema/geri alma yok.
3. Vertex başına satır — milyonlarca satır.
4. TIN'i jsonb — H2 uyumsuzluk riski.
5. Testcontainers — yeni bağımlılık; H2 + `postgres-test` profili seçildi.
6. Bridge değer nesnelerini `project` tablosuna gömmek — 15 kolonluk hepsi-var-ya-hiçbiri belirsizliği.
7. Kullanılmayan Project use-case servisi — erken iskele.

## 5. Uygulama görevleri
| # | Görev | Dosyalar | Bağımlı |
|---|---|---|---|
| T1 | Bağımlılıklar + mimari test onaylı listesi | `backend/pom.xml`, `ArchitectureRules.java`, `ArchitectureTests.java` (t10) | – |
| T2 | Datasource/JPA/Flyway ayarları, test config | `application.properties`, yeni `src/test/resources/config/application.properties` | T1 |
| T3 | Flyway migration'ları | `db/migration/V1__terrain_landxml.sql`, `V2__bridge_project.sql` | T2 |
| T4 | Terrain kalıcılığı | `terrain/infra/persistence/{TinBinaryCodec, TerrainEntity, TerrainSourceEntity, TerrainBoundaryEntity, TerrainBreaklineEntity, TerrainJpaRepository, JpaTerrainRepository}`; `TerrainRepository` javadoc | T3 |
| T5 | `Alignment.elements()` + LandXML kalıcılığı | `alignment/model/Alignment.java`; `landxml/infra/persistence/{LandXmlImportEntity, alignment element/PVI embeddable-entity, LandXmlImportJpaRepository, JpaLandXmlImportRepository}`; `LandXmlImportRepository` javadoc | T4 |
| T6 | Use-case transaction + bean bağlama | `LandXmlImportUseCase`, `CoreConfiguration`; sil `SharedRepositoriesConfig`; InMemory sınıflarını `src/test/java`'ya taşı | T4, T5 |
| T7 | Bridge kalıcılığı | `Project` (id), `bridge/application/ProjectRepository`, `bridge/infra/persistence/{ProjectEntity, ProjectBridgeEntity, ProjectDesignSpaceEntity, BridgeAlternativeEntity, Girder/Deck/Pier/Foundation embeddable, ProjectJpaRepository, JpaProjectRepository}`, `bridge/package-info.java` notu | T3 |
| T8 | Kalıcılık import kuralı | `ArchitectureRules`, `ArchitectureTests` (gerçek ağaç, t2 düzeltme, t11) | T4–T7 |
| T9 | Testler | `TinBinaryCodecTest`, `JpaTerrainRepositoryTest`, `JpaLandXmlImportRepositoryTest`, `JpaProjectRepositoryTest`, `contract/PersistenceContractTest`, `LandXmlImportUseCaseTest` (transaction'lı senaryo); JPA testleri `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(adapter)` | T4–T7 |
| T10 | Docker/dev ortamı | `backend/Dockerfile`, `backend/.dockerignore`, `compose.yaml`, `.env.example`, `start-dev.bat` | T1–T9 |
| T11 | Belgeler | `docs/architecture.md`, `docs/roadmap.md`, `docs/architecture/backend-reference.md` (R15/R16), `backend/README.md` | T10 |

CLAUDE.md "Build & test" bölümü ajan tarafından değiştirilmez; düzeltme kullanıcıya önerilir.

## 6. Kabul kriterleri
- **AC1** `mvn -f backend/pom.xml -B package` başarılı; tüm testler H2 ile geçer; PostgreSQL/Docker gerekmez.
- **AC2** Context açılışında Flyway V1/V2 çalışır, `validate` hata vermez; mevcut `@SpringBootTest` testleri değiştirilmeden geçer.
- **AC3** `JpaTerrainRepository` save/findById: LandXML terrain'i (source, boundaries, breaklines) ve XYZ terrain'i (`source == null`) eşit döner; vertex/üçgen bit-bit aynı; deleteById sonrası boş; boş mesh ve ±Infinity bounds da round-trip.
- **AC4** `TinBinaryCodec` uzunluk uyuşmazlığı ve aralık dışı üçgen indeksinde `IllegalStateException`.
- **AC5** `JpaLandXmlImportRepository` alignment (STRAIGHT/CURVE, `clockwise`), profil (PVI'ler, ad), uyarılarla import'u aynen döner; alignment'sız import'ta alignment/profile `null`; terrain yoksa okuma bütünlük hatası.
- **AC6** `/api/landxml/import` ve `/api/terrain/import` sonrası kayıtlar DB'de (`PersistenceContractTest`); mevcut endpoint yanıtları ve contract testleri aynı.
- **AC7** LandXML import'unda ikinci kayıt başarısız olursa terrain DB'de kalmaz (transaction'lı yol testi); telafi testi de geçer.
- **AC8** `JpaProjectRepository`: bridge/designSpace/alternatifli Project (deck/pier/foundation dolu-null karışık, span sırası, `selectedAlternativeId`) eşit döner (`createdUtc` mikrosaniyeye kesilerek karşılaştırılır); bridge/designSpace null ise null döner; alternatif silme/ekleme/sıra değiştirme ile ikinci save PK hatasız yeni durumu yansıtır.
- **AC9** Migration DDL'inde mühendislik kolonlarında `DEFAULT` yok; `CHECK` yalnızca yapısal.
- **AC10** `ArchitectureTests` geçer: pom tam 11 onaylı bağımlılık; persistence importları yalnızca `*.infra.persistence`; core'da yok; controller sayısı 12; `EndpointInventoryContractTest` değişmeden geçer.
- **AC11** Main ağacında `InMemory*Repository` ve `SharedRepositoriesConfig` yok.
- **AC12** `DB_PASSWORD` tanımsız `java -jar` başlamaz; hata eksik placeholder'ı adıyla gösterir.
- **AC13** `docker compose config` ve `docker compose build backend` başarılı.
- **AC14** Geçerli `.env` ile `docker compose up -d --wait` sonrası `/actuator/health` `UP` (DB kontrolü dahil).
- **AC15** Compose'ta terrain import → `docker compose restart backend` → `GET /api/terrain/{id}/mesh` 200.
- **AC16** `docker compose --profile postgres-test up -d --wait postgres-test` + `KOPRUQ_TEST_DB_URL=jdbc:postgresql://localhost:5433/kopruq_test` (+ kullanıcı/parola) ile `mvn -f backend/pom.xml -B test` geçer.
- **AC17** `start-dev.bat` `.env` yoksa açıklayıcı mesajla çıkar; varsa postgres'i başlatıp backend+frontend'i açar (manuel).
- **AC18** Repo'da secret yok; `.env.example`'da `DB_PASSWORD` boş; `.env` ignore'da.
- **AC19** `cd frontend && npm run build` başarılı.
- **AC20** `docs/architecture.md`, `docs/roadmap.md`, `docs/architecture/backend-reference.md`, `backend/README.md` güncel.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| 1,2 | `mvn -f backend/pom.xml -B package` | BUILD SUCCESS |
| 3,4 | `-Dtest=JpaTerrainRepositoryTest,TinBinaryCodecTest` | geçer |
| 5 | `-Dtest=JpaLandXmlImportRepositoryTest` | geçer |
| 6 | `-Dtest=PersistenceContractTest,LandXmlTerrainContractTest,EndpointInventoryContractTest` | geçer |
| 7 | `-Dtest=LandXmlImportUseCaseTest,PersistenceContractTest` | geçer |
| 8 | `-Dtest=JpaProjectRepositoryTest` | geçer |
| 9 | V1/V2 SQL incelemesi | DEFAULT yok, yalnızca yapısal CHECK |
| 10,11 | `-Dtest=ArchitectureTests`; Glob `backend/src/main/**/InMemory*` | geçer; boş |
| 12 | env'siz `java -jar backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar` | exit ≠ 0, placeholder hatası |
| 13 | `docker compose config`; `docker compose build backend` | exit 0 |
| 14 | `docker compose up -d --wait`; `curl localhost:8080/actuator/health` | UP |
| 15 | import → id; `docker compose restart backend`; `curl .../api/terrain/<id>/mesh` | 200 |
| 16 | postgres-test + env ile `mvn test` | BUILD SUCCESS |
| 17 | `start-dev.bat` (`.env` var/yok) | beklenen mesaj / health UP |
| 18 | `git status --ignored`, dosya incelemesi | parola yok |
| 19 | `cd frontend && npm run build` | başarılı |
| 20 | belge incelemesi | güncel |

Bilinmeyenler: Compose sürümü (`--wait` v2.17+ ister); AC15 için küçük XYZ fixture hazırlanacak (alternatif: `sample.landxml` ile `/api/landxml/import`); CI tanımı yok; baseline test sayısı implementasyon öncesi kaydedilmeli.

## 8. Riskler
- H2↔PG tip uyumu (`bytea`, `uuid`, `timestamptz`): AC2 ve AC16 yakalar; gerekirse `@JdbcTypeCode(SqlTypes.VARBINARY)` (org.hibernate yalnızca infra.persistence'ta).
- Büyük terrain'ler hâlâ tamamen bellekte; `MaxRAMPercentage=75`; PG `bytea` 1GB sınırı için üst sınır testi yok.
- Kodlama formatı sabit (little-endian, stride); değişirse Flyway migration + dönüştürücü gerekir; codec javadoc'unda belgelenir.
- Veri artık kalıcı: yetim terrain'i AC7 transaction'ı önler; `TerrainImportUseCase` tek kayıt adapter-transaction'lı.
- Child birleştirme (flush sırası) AC8 ile test edilir.
- Eşzamanlılık: teknik `@Version`, domain revizyonu yok; tetikleyecek endpoint yok, risk düşük.
- Kimlik doğrulama yok (mevcut durum); DB parolası yalnızca `.env`/ortam; compose PG portu host'a açık, yalnızca yerel geliştirme.
- Geri alma: git revert; V1/V2 yayınlandıktan sonra düzenlenmez, V3+ eklenir; `docker compose down -v` volume'u siler, bilinçli kullanılmalı.
- Testler aynı H2 in-memory DB'yi paylaşır; id'ler rastgele UUID; `@DataJpaTest` rollback yapar.
- `java -jar` artık `DB_PASSWORD` + çalışan PG ister; CLAUDE.md "Build & test" güncellemesi kullanıcıya önerilir.

## 9. Varsayımlar ve notlar
- JDK 21, Maven, Docker Desktop mevcut (kullanıcı beyanı); imaj etiketleri (`maven:3.9-eclipse-temurin-21`, `eclipse-temurin:21-jre`, `postgres:17`) çevrimdışı doğrulanmadı.
- Boot 3.5 BOM Flyway 11.x yönetir; PostgreSQL için `flyway-database-postgresql` gerekir.
- `terrain.project_id` `project` FK'sı değil (frontend serbest metin gönderiyor); terrain–Project bağlama ayrı milestone.
- `Project.id` eklenmesi yazılım kararı, mühendislik onayı gerekmez.
- Docker build `-DskipTests`; testler AC1/AC16'da koşar.
- Mühendislik notu (engelleyici değil): `Foundation` PILE/SPREAD ↔ kazık alanı tutarlılık kuralı modelde yok, DB'ye de eklenmedi; istenirse mühendis tanımlamalıdır. `Pier.pierType` serbest metin; `DesignSpace` "Pier Height aralığı" javadoc uyarısı değiştirilmedi.

Açık soru yok. READY
