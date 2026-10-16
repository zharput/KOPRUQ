# Implementation: e2e-test-data-cleanup

Durum: **implemented** - AC12 ve AC13, izole test veritabanında koordinatör tarafından doğrulandı (aşağıdaki "E2E doğrulaması" bölümü). Rapor feature-implementer çıktısıdır; koordinatör git status ve plan hash'ini bağımsız kontrol etti (`approval_matches: true`).

## Değişen dosyalar

**Backend main**
- `bridge/application/ProjectService.java`: `delete(UUID)` ve ortam temizliği yardımcıları; kurucu `TerrainRepository terrains, LandXmlImportRepository imports` alır.
- `bridge/application/ProjectRepository.java` (`delete`), `ProjectContentRepository.java` (`deleteAll`, `isTerrainReferenced`, `isLandXmlImportReferenced`).
- `bridge/api/ProjectController.java`: `@DeleteMapping("/{projectId}")`, 204. Yeni controller yok.
- `bridge/infra/persistence/`: `JpaProjectRepository`, `JpaProjectContentRepository`, `DesignSystemContentStore`, `LoadInputContentStore`, `GraphContentStore`, `GraphDocumentJpaRepository`, `ProjectSectionPresenceJpaRepository`, `ProjectInfoJpaRepository`.
- `landxml/application/LandXmlImportRepository.java` (`findTerrainId`, `findIdsByTerrainId`, `deleteById`); `landxml/infra/persistence/`: `JpaLandXmlImportRepository`, `LandXmlImportJpaRepository`, `LandXmlImportEntity` (`getId`).
- `terrain/application/TerrainRepository.java` (javadoc), `shared/config/CoreConfiguration.java`.

**Backend test**
- Yeni: `contract/ProjectDeleteContractTest.java` (9 test).
- Değişen: `ProjectServiceTest` (+7), `ProjectServiceIntegrationTest` (atomiklik), `JpaLandXmlImportRepositoryTest`, `EndpointInventoryContractTest` (42 uç), `ArchitectureRules` (`DOMAIN_DEPS["bridge"] = {terrain, landxml}`), `WorkspaceFixtures`, `InMemoryProjectRepository`, `InMemoryProjectContentRepository`, `InMemoryLandXmlImportRepository`, `LandXmlImportUseCaseTest`, `LandXmlImportTransactionTest`.

**Frontend:** `frontend/e2e/support/fixtures.ts` (otomatik `projectCleanup` fixture), `projects.ts` (yorum), `global-setup.ts` (uyarı metni).

**Docs:** `backend/README.md`, `docs/e2e/README.md`, `docs/architecture.md`, `docs/roadmap.md`.

## Kabul kriterleri

| AC | Sonuç | Kanıt |
|---|---|---|
| AC1 | Karşılandı | `ProjectDeleteContractTest`: 204 boş gövde, GET 404 `PROJECT_NOT_FOUND`, listede yok |
| AC2 | Karşılandı | JDBC metadata ile FK tabloları (çocuklar dahil) bulunur; silinen projede 0 satır, diğer projede sayılar aynı |
| AC3 | Karşılandı | Rastgele UUID 404 + code; `abc` 400 `INVALID_PARAMETER`; ikinci silme 404 |
| AC4 | Karşılandı | `delete_unsharedTerrainAndImport_areRemovedWithTheirChildren` (8 tablo) |
| AC5 | Karşılandı | `delete_sharedTerrainAndImport_stayUntilTheLastProjectIsDeleted` + unit test |
| AC6 | Karşılandı | `delete_terrainReferencedOnlyThroughAnotherProjectsImport_stays` + unit test |
| AC7 | Karşılandı | `delete_importWithoutAlignment_isRemovedBeforeItsTerrain` + unit test |
| AC8 | Karşılandı | `delete_danglingEnvironmentReferences_stillReturns204...` + unit test |
| AC9 | Karşılandı | `ProjectServiceIntegrationTest.delete_failingStep_rollsBack...` (gerçek JPA adaptörleri, gerçek `TransactionTemplate`) |
| AC10 | Karşılandı | CORS kodu değişmedi; DELETE preflight 403 testi tam koşuda geçti |
| AC11 | Karşılandı | `EndpointInventoryContractTest` 42 uç, `ArchitectureTests` yeşil, controller sayısı 16 |
| AC12 | Karşılandı | Bkz. "E2E doğrulaması": 19/19 spec geçti, koşu sonrası `project`, `terrain`, `landxml_import` tablolarında 0 satır |
| AC13 | Karşılandı | mvn package, build, lint, vitest ve test:e2e geçti |

## Çalıştırılan komutlar
- `mvn -f backend/pom.xml -B package` (tam, testlerle): BUILD SUCCESS, 725 test, 0 failure, 0 error, 1 skipped (mevcut `BentleyProductionTerrainTest`). Testler H2 bellek içi veritabanı kullanır, gerçek veriye dokunulmadı.
- `npm run build`: exit 0 (yalnızca chunk-size uyarısı).
- `npm run lint`: exit 0, yalnızca mevcut uyarılar.
- `npm test`: 1183 / 1183 geçti.
- `npm run test:e2e`: **koşulmadı.** localhost:8080'de büyük olasılıkla kullanıcının geliştirme örneği (eski jar) ayakta; gerçek veritabanına yazmamak için koşulmadı, izole 5433 test veritabanı aranmadı, sunucu başlatılmadı.

## Plandan sapmalar
1. Plan "en az 23 FK tablosu" demişti; migration'lar ve JDBC metadata **22** gösterir (V2: 3, V3: 2, V4: 10, V5: 7). Test `>= 22` doğrular ve 22'sinin de boşaldığını kontrol eder.
2. Planın anonim `LandXmlImportRepository` dediği `JpaLandXmlImportRepositoryTest:140` ve `LandXmlImportTransactionTest:68` aslında anonim `TerrainRepository`; değişiklik gerekmedi. Yalnızca gerçek `LandXmlImportRepository` implementasyonları (`LandXmlImportUseCaseTest`, `LandXmlImportTransactionTest`) stub'landı.
3. `InMemoryTerrainRepository` değişmedi (`deleteById` zaten vardı).

## Kalan iş ve sınırlamalar
- **AC12:** Yeni jar'ı izole bir backend + test veritabanı (5433) üzerinde başlatıp `npm run test:e2e` koşmak; koşu öncesi/sonrası `GET /api/projects` karşılaştırmak; bilerek düşürülen bir spec'in de temizlendiğini görmek. Çalışan 8080 backend'i yeni jar'a geçmezse teardown 405 + "jar güncel mi?" mesajıyla düşer.
- Kabul edilmiş riskler (plan bölüm 6) değişmedi: uç açık, ad koruması ve kimlik doğrulama yok; eşzamanlı PUT sarkan referans bırakabilir; eski `E2E-` projeleri ve yetim terrain/import satırları temizlenmez.
- `projectCleanup` fixture'ı proje id'sini POST yanıt gövdesinden okur; sayfa gövde okunmadan kapanırsa o id sessizce atlanır.

## E2E doğrulaması (koordinatör, 2026-10-16)

Kullanıcının isteğiyle izole ortamda koşuldu; geliştirme veritabanına (5432) dokunulmadı.
- Başlangıçta 8080, 5173, 5432 ve 5433'te dinleyen süreç yoktu; docker çalışıyordu, konteyner yoktu.
- `docker compose --profile postgres-test up -d --wait postgres-test` (PostgreSQL 17, 5433, tmpfs).
- `mvn -f backend/pom.xml -B -q package -DskipTests` ile yeni jar derlendi.
- Backend, `DB_URL=jdbc:postgresql://localhost:5433/kopruq_test` ile başlatıldı; `/actuator/health` `UP`, `GET /api/projects` boş liste (doğru veritabanı kanıtı).
- `npm run test:e2e` (frontend/): **19 passed (3.0m)**, hiçbir spec düşmedi, 405 teardown hatası yok.
- Koşu sonrası `GET /api/projects`: boş liste. Veritabanında `project = 0`, `terrain = 0`, `landxml_import = 0` (spec 08'in terrain/LandXML kayıtları da temizlendi).
- Backend süreci ve test konteyneri kapatıldı (`docker compose --profile postgres-test down`).

Doğrulanmadı: bilerek düşürülen bir spec'in teardown'da temizlendiği (isteğe bağlı kontrol, koşulmadı).
