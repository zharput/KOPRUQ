# Implementation report: backend (PostgreSQL + JPA + Docker)

Kaynak: feature-implementer el-teslim raporu (koordinatör tarafından kaydedildi). Bağımsız incelenmedi (review yok). Koordinatör doğrulaması: `git status` dosya listesi rapordaki listeyle uyuşuyor; ajanın komut çıktıları yeniden çalıştırılmadı.

**Sonuç (ajan):** T1-T11 tamamlandı. **Koordinatör kararı: `blocked`** — AC17 (start-dev.bat tam çalıştırma) doğrulanmadı; plan tüm AC'lerin karşılanmasını şart koşuyor.

Helper `check backend`: ajan düzenleme öncesi ve sonunda exit 0 (approval_matches true). plan.md, state.json, request.md, CLAUDE.md değişmedi.

## Ortam
- `mvn` PATH'te yoktu; Maven 3.9.16 (`C:\Users\cemha\.m2\wrapper\dists\...`) + JDK 21 (Adoptium 21.0.11) kullanıldı (sistem varsayılan JDK 26).
- Baseline: 369 test, 0 hata, 1 skipped. Sonra: 402 test, 0 hata, 1 skipped (+33 test).
- 8080'de kullanıcının çalışan backend'i (PID 20700) var; durdurulmadı.

## Dosyalar
**Değişen:** `backend/pom.xml`; `application.properties`; `Alignment.java` (`elements()`); `Project.java` (id); `bridge/package-info.java`; `LandXmlImportUseCase.java` (4 argümanlı kurucu, `TransactionOperations`); `LandXmlImportRepository.java`, `TerrainRepository.java`, `TerrainController.java` (javadoc); `CoreConfiguration.java` (`TransactionOperations` bean); `ArchitectureRules.java`, `ArchitectureTests.java`; `start-dev.bat`; `backend/README.md`; `docs/architecture.md`; `docs/roadmap.md`; `docs/architecture/backend-reference.md`.

**Yeni:** `db/migration/V1__terrain_landxml.sql`, `V2__bridge_project.sql`; `src/test/resources/config/application.properties`; `terrain/infra/persistence/` (TinBinaryCodec, TerrainEntity, TerrainSourceEntity, TerrainBoundaryEntity, TerrainBreaklineEntity, TerrainJpaRepository, JpaTerrainRepository); `landxml/infra/persistence/` (LandXmlImportEntity, AlignmentElementEntity, ProfilePviEntity, LandXmlImportJpaRepository, JpaLandXmlImportRepository); `bridge/application/ProjectRepository.java`; `bridge/infra/persistence/` (ProjectEntity, ProjectBridgeEntity, ProjectDesignSpaceEntity, BridgeAlternativeEntity, Girder/Deck/Pier/FoundationEmbeddable, ProjectJpaRepository, JpaProjectRepository); `shared/config/DatabaseConfigurationGuard.java`; `backend/Dockerfile`, `backend/.dockerignore`, `compose.yaml`, `.env.example`; testler: TinBinaryCodecTest, JpaTerrainRepositoryTest, JpaLandXmlImportRepositoryTest, JpaProjectRepositoryTest, contract/PersistenceContractTest, LandXmlImportTransactionTest, DatabaseConfigurationGuardTest.

**Taşınan (git mv, staged):** `InMemoryTerrainRepository`, `InMemoryLandXmlImportRepository` → `src/test/java` (aynı paket). **Silinen (git rm, staged):** `SharedRepositoriesConfig.java`.

## Kabul kriterleri (ajan kanıtı)
| AC | Kanıt | Durum |
|---|---|---|
| 1 | `mvn -B package` scratchpad kopyasında: exit 0, 402 test. Yerinde çalıştırma repackage'de başarısız (jar kullanıcının çalışan backend'i tarafından kilitli; testler geçti) | Karşılandı (kopyada) |
| 2 | Flyway V1/V2 + validate H2 ve PG 17'de; mevcut @SpringBootTest'ler değişmeden geçti | Karşılandı |
| 3 | JpaTerrainRepositoryTest 8 test geçti | Karşılandı |
| 4 | TinBinaryCodecTest 5 test geçti | Karşılandı |
| 5 | JpaLandXmlImportRepositoryTest geçti | Karşılandı |
| 6 | PersistenceContractTest 3 test; LandXmlTerrainContractTest, EndpointInventoryContractTest geçti | Karşılandı |
| 7 | LandXmlImportTransactionTest + LandXmlImportUseCaseTest geçti | Karşılandı |
| 8 | JpaProjectRepositoryTest 5 test geçti | Karşılandı |
| 9 | V1/V2'de DEFAULT yalnızca yorumda; CHECK'ler yapısal | Karşılandı |
| 10 | ArchitectureTests geçti (11 bağımlılık, persistence importları yalnızca infra.persistence, 12 controller) | Karşılandı |
| 11 | `InMemory*` main'de yok; SharedRepositoriesConfig silindi | Karşılandı |
| 12 | DB_PASSWORD'süz jar exit 1, `Could not resolve placeholder 'DB_PASSWORD'` (guard bean gerekti) | Karşılandı |
| 13 | `compose config` (şifresiz exit 1, şifreyle 0), `build backend` exit 0 | Karşılandı |
| 14 | `up -d --wait` exit 0, `/actuator/health` UP (BACKEND_PORT=18080), Flyway PG 17.11 | Karşılandı |
| 15 | Import → `restart backend` → mesh/profile/sample 200, bilinmeyen id 404 | Karşılandı |
| 16 | postgres-test + KOPRUQ_TEST_DB_* ile `mvn test`: 402 test, 0 hata | Karşılandı |
| 17 | `.env`siz çalıştırma mesajla exit 1 doğrulandı; `.env` ayrıştırma döngüsü ayrı test edildi; `.env` ile tam çalıştırma YAPILMADI | **Kısmen** |
| 18 | `.env.example`'da `DB_PASSWORD` boş; `.env` ignore'da; repoda `.env` yok | Karşılandı |
| 19 | `npm run build` exit 0 | Karşılandı |
| 20 | 4 belge güncellendi | Karşılandı |

## Çalıştırılmayan kontroller
- AC17 tam çalıştırma (8080 dolu, iki pencere açıyor): kullanıcı elle doğrulamalı.
- Matristeki tekil `-Dtest=...` çalıştırmaları: sınıflar tam suite'lerde (H2 ve PG) koştu, ayrı koşturulmadı.
- AC1 yerinde `mvn package`: jar kilidi nedeniyle repackage'de başarısız.

## Yan etki (dikkat)
Yerinde başarısız `package`, `backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar` dosyasını ince/çalıştırılamaz bir jar ile ezdi; ajan nihai kaynaktan derlenen çalıştırılabilir jar'ı üzerine kopyaladı (health 8080'de UP). Çalışan süreç jar'dan yeni; uygun olunca yeniden başlatılmalı.

## Plandan sapmalar
1. `DatabaseConfigurationGuard` (BeanFactoryPostProcessor) eklendi: çözümlenmemiş `${DB_PASSWORD}` Boot'ta literal şifre olarak kaldığı için AC12 gerektirdi.
2. `terrain.has_coordinate_system` kolonu eklendi (null CRS ile `CoordinateSystem(null,null)` ayrımı).
3. Boundary/breakline ve alignment/PVI satırları `@Embeddable` element collection (`@OrderColumn`); PK'ler planla aynı.
4. `createdUtc` `ProjectEntity.apply` içinde µs'ye kesiliyor.
5. İşlem senaryosu ayrı `LandXmlImportTransactionTest` sınıfında.
6. Compose'a `BACKEND_PORT` (varsayılan 8080) ve backend healthcheck (`bash /dev/tcp`) eklendi; `BACKEND_PORT` `.env.example`'da yok.
7. H2 skaler DOUBLE kolonda `-0.0`'ı `0.0`'a normalleştirir; TIN blob'larında bit-bit korunur.
8. BOM sürümleri çalıştı, pin gerekmedi.

## Sınırlamalar / kalan iş
- H2 varsayılan `BINARY VARYING` (~1 MB) sınırı çok büyük TIN'lerde H2 testlerini etkileyebilir; üretimde PG `bytea`.
- Bridge `Project`'i kaydeden endpoint/use-case yok (yalnızca repo + test). Terrain–Project bağı yok. Domain revizyonu yok.
- `CLAUDE.md` "Build & test" güncellenmeli: `java -jar` artık `DB_PASSWORD` + erişilebilir PostgreSQL ister (`docker compose up -d --wait postgres`). Dokunulmadı.
- Mühendislik notu: PILE/SPREAD ↔ kazık alanı tutarlılık kuralı modelde/DB'de yok; mühendis tanımlamalı.
- Yerel Docker'da `kopruq-backend:latest` imajı kaldı.
- Hiçbir şey commit edilmedi.
