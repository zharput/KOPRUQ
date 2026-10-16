# Plan: e2e-test-data-cleanup

## 1. Davranış ve kabul kriterleri

**Amaç:** `DELETE /api/projects/{projectId}` ucu eklenecek. Uç projeyi ve projeye bağlı tüm satırları siler. Proje başka hiçbir projenin kullanmadığı bir terrain veya LandXML içe aktarımına bağlıysa, o satırlar da alt tablolarıyla birlikte silinir. Playwright e2e koşusu kendi oluşturduğu projeleri teardown'da bu uçla siler.

**Kullanıcı kararları (S1-S3):**
- Uç her ortamda açık. Property bayrağı veya koşullu kayıt yok.
- Ad koruması yok. Her proje silinebilir.
- terrain/landxml temizliği kapsamda, paylaşılan referans koruması ile.
- Spec 02/18 yeniden adlandırması gereksiz (ad koruması yok).

**Kapsam dışı:**
- Birikmiş E2E- projelerin tek seferlik temizliği (ayrıca listelenip onaylanacak).
- CI ve data-testid çalışması.
- CORS'a DELETE eklemek.
- Frontend uygulamasında silme arayüzü.
- Kimlik doğrulama veya yetkilendirme.
- Projenin artık referans vermediği eski terrain/import satırları.
- Yeni Flyway migration.

**Kabul kriterleri**
- **AC1:** Var olan bir proje için `DELETE /api/projects/{id}` 204 döner, gövde boştur. Ardından `GET /api/projects/{id}` 404 `PROJECT_NOT_FOUND` döner, `GET /api/projects` listesinde proje yoktur.
- **AC2:** Projenin içeriği önce yazılır: workspace, bridge rows, bridge-definitions, 5 aile kataloğu, girder library, preferred span rules, cross section, 6 yük bölümü ve en az bir graph (node, connection, group dahil). Silmeden sonra `project` tablosuna FK veren her tabloda (JDBC metadata ile bulunur) bu `project_id` için 0 satır kalır. Başka bir projenin satır sayıları değişmez. Torun tablolar da boşalır. Silme hata vermeden tamamlanır.
- **AC3:** Var olmayan bir UUID 404 döner, gövde standart `ApiErrorResponse`, `code = "PROJECT_NOT_FOUND"`. UUID olmayan yol parametresi 400 `INVALID_PARAMETER` döner (mevcut handler).
- **AC4:** Proje A, terrain T'ye ve LandXML import L'ye (L'nin `terrain_id` alanı T) bağlı, başka hiçbir proje bunlara bağlı değil. A silinince `terrain`, `terrain_source`, `terrain_boundary`, `terrain_breakline` tablolarında T satırları ve `landxml_import`, `landxml_import_warning`, `landxml_alignment_element`, `landxml_profile_pvi` tablolarında L satırları kalmaz.
- **AC5 (paylaşım):** A ve B aynı T ve L'ye bağlı. A silinince T ve L tüm alt satırlarıyla durur, B'nin GET yanıtı değişmez. Ardından B silinince T ve L de silinir.
- **AC6 (dolaylı paylaşım):** A sadece T'ye bağlı. B ise L'ye bağlı ve L'nin `terrain_id` alanı T. A silinince T ve L durur.
- **AC7 (alignment'sız import):** A sadece T'ye bağlı, `terrain_id = T` olan bir import satırı I var ve hiçbir proje I'ya bağlı değil. A silinince I ve T birlikte silinir. Önce I silinir (`fk_landxml_import_terrain`).
- **AC8 (sarkan referans):** `project_info` içindeki terrain veya import id'si var olmayan bir satırı gösteriyorsa silme yine 204 döner. Diğer satırlara dokunulmaz.
- **AC9 (atomiklik):** Silme sırasında bir adım hata verirse (testte enjekte edilen hata), proje, içeriği, terrain ve import satırları değişmeden kalır.
- **AC10:** CORS değişmez. `Access-Control-Allow-Methods` hâlâ `GET,POST,PUT,HEAD`, DELETE preflight hâlâ 403. Mevcut CORS testleri değişmeden yeşil kalır.
- **AC11:** `EndpointInventoryContractTest` 42 uçla yeşil. `ArchitectureTests` yeşil: controller sayısı 16'da kalır, `bridge` için pinlenen domain kenarları güncellenir.
- **AC12:** e2e koşusundan sonra koşunun oluşturduğu projelerin hiçbiri `GET /api/projects` listesinde kalmaz. Test başarısız olsa bile teardown silme yapar. Teardown'da 204 ve 404 dışındaki yanıt teardown'u açık mesajla düşürür.
- **AC13:** `mvn -f backend/pom.xml -B package` (testler dahil), `npm run build` (e2e tip kontrolü dahil), `npm run lint`, `npm test` ve backend ayaktayken `npm run test:e2e` (19 spec) yeşil.

## 2. Doğrulanmış mevcut durum

**Proje akışı**
- `ProjectController` (`backend\src\main\java\com\kopruq\bridge\api\ProjectController.java`): GET list, POST, GET `/{projectId}`, PUT `/{projectId}/workspace`. CORS `WebCorsConfiguration` içinde merkezi.
- `ProjectService` `TransactionOperations.execute` içinde çalışır. `findByIdForUpdate` kilit alır. 404 `notFound` -> `ResourceNotFoundException("PROJECT_NOT_FOUND", ...)` -> `ApiExceptionHandler.handleNotFound`.
- Servis `CoreConfiguration.projectService` bean'i (4 argüman).

**Portlar ve adaptörler**
- Portlar: `ProjectRepository` (save, findById, findByIdForUpdate, findSummaries), `ProjectContentRepository` (load, replace).
- `JpaProjectRepository` / `ProjectEntity`: bridge, designSpace, alternatives `cascade = ALL, orphanRemoval`.
- `JpaProjectContentRepository` workspace verisini `infos` ve `rows` ile yönetir; geri kalanı `DesignSystemContentStore`, `LoadInputContentStore`, `GraphContentStore`'a devreder. Store'lar entity tabanlı siler.

**FK yapısı:** V1-V6'da `ON DELETE CASCADE` yok. `project(id)`'ye FK veren 23 tablo (V2: 3, V3: 2, V4: 11, V5: 7).

**terrain ve landxml**
- `terrain` alt tablolarıyla: `terrain_source` (OneToOne cascade ALL), `terrain_boundary`, `terrain_breakline` (`@ElementCollection`).
- `landxml_import` `terrain_id NOT NULL`, `fk_landxml_import_terrain`. Alt tablolar: warning, alignment_element, profile_pvi (`@ElementCollection`).
- `TerrainRepository.deleteById` zaten var. `LandXmlImportRepository` yalnızca `save` ve `findById` sunar.
- Her iki JPA adaptörü `@Transactional` (REQUIRED); tek datasource, `TransactionTemplate` transaction'ına katılır.
- Proje ile bağ yalnızca `project_info.environment_terrain_dataset_id` ve `environment_land_xml_import_id` (VARCHAR, FK değil). `terrain.project_id` serbest string, bağ için kullanılmaz.
- Frontend: LandXML import'unda `terrainDatasetId` yazılır, `landXmlImportId` yalnızca alignment varsa dolar; XYZ import'unda yalnızca terrain id.

**Mimari testler:** `ArchitectureRules.DOMAIN_DEPS` içinde `bridge` için `Set.of()` pinli; `CORE_DEPS` değişmeyecek; controller sayısı 16.

**Test çiftleri / anonim port implementasyonları:** `InMemoryProjectRepository`, `InMemoryProjectContentRepository`, `InMemoryTerrainRepository`, `InMemoryLandXmlImportRepository`; anonim: `LandXmlImportUseCaseTest:55`, `LandXmlImportTransactionTest:51,68`, `JpaLandXmlImportRepositoryTest:140`; `ProjectServiceTest:61` servisi 4 argümanla kurar.

**e2e:** `frontend\e2e\support\fixtures.ts` `APIRequestContext` ile `E2E_API_BASE`'e gider (Origin yok, CORS uygulanmaz). 19 spec `createProjectViaUi` kullanır. `projects.ts:9` yorumu, `global-setup.ts:9` uyarısı ve `docs\e2e\README.md:50` "silme API'si yok" der.

## 3. Tasarım kararları

1. **Uç:** `ProjectController` içine `@DeleteMapping("/{projectId}")`, `ResponseEntity.noContent()`. Yeni controller yok, sayı 16'da kalır.
2. **Use case:** `ProjectService.delete(UUID)` tek `transactions.execute` içinde:
   1. `projects.findByIdForUpdate(id)`; yoksa `notFound`.
   2. `contents.load(id).workspace()` okunur; null değilse `project().environment()` içinden `terrainDatasetId` (T) ve `landXmlImportId` (L) alınır. Null workspace ortam temizliği yapmaz.
   3. `contents.deleteAll(id)`, ardından `projects.delete(id)`.
   4. Ortam temizliği (referans kontrolleri, projenin kendi satırları silindikten sonra kalan projelere bakar):
      - L null değilse ve varsa `lt = imports.findTerrainId(L)` okunur. `contents.isLandXmlImportReferenced(L)` false ise `imports.deleteById(L)`.
      - Aday terrain'ler: T ve `lt` (null olmayan, tekilleştirilmiş). Her aday X için: `contents.isTerrainReferenced(X)` true ise atla; değilse `imports.findIdsByTerrainId(X)` listelenir, bunlardan herhangi biri `isLandXmlImportReferenced` ise X atlanır (AC6); aksi halde önce bu import'lar `imports.deleteById` ile silinir (AC7), sonra `terrains.deleteById(X)`.
      - Var olmayan id'ler sessizce atlanır (AC8).
   - Bu persistans referans koordinasyonudur, mühendislik kuralı değil; `application` katmanında okunaklı private metodlar halinde durur.
3. **Port eklemeleri:**
   - `ProjectRepository.delete(UUID)`
   - `ProjectContentRepository.deleteAll(UUID)`, `boolean isTerrainReferenced(String)`, `boolean isLandXmlImportReferenced(String)`
   - `LandXmlImportRepository.findTerrainId(String): Optional<String>`, `findIdsByTerrainId(String): List<String>`, `deleteById(String)`
   - `TerrainRepository.deleteById`: yalnızca javadoc güncellenir.
4. **Cascade stratejisi:** açık, entity tabanlı silme; yeni Flyway migration yok (mevcut FK'leri yeniden yazmak DDL riski taşır, H2/PG farkı çıkarabilir). Sıra: graph'lar, yük bölümleri, design-system tabloları ve presence satırları, `project_bridge_row`, `project_info`, en sonda `project` (JPA cascade bridge/design space/alternatives'i siler); mevcut kalıpla `flush`. Eksik tablo FK ihlaliyle 500 verir, sessiz kalıntı bırakmaz; AC2 testi yakalar.
5. **Transaction:** tümü `ProjectService` içindeki tek `TransactionTemplate` içinde (AC9).
6. **Mimari kenar:** `bridge.application`, `terrain.application.TerrainRepository` ve `landxml.application.LandXmlImportRepository`'yi import eder; `DOMAIN_DEPS["bridge"] = Set.of("terrain", "landxml")`. `CORE_DEPS` değişmez, döngü yok. Reddedilen alternatif: `bridge.infra` içinden doğrudan SQL ile terrain/landxml tablolarına silme (veri sahipliğini deler).
7. **CORS değişmez;** e2e silmeyi `APIRequestContext` ile yapar.
8. **e2e:** `fixtures.ts`'e otomatik `projectCleanup` fixture'ı. `context.on('response')` ile `E2E_API_BASE` altındaki POST `/api/projects` 201 yanıtlarından `projectId` toplanır (18'deki ikinci sayfa dahil). Teardown'da her id için `request.delete(...)`; 204 ve 404 kabul, diğerleri `expect` ile Türkçe mesajla düşer (405: "backend DELETE ucunu desteklemiyor, jar güncel mi?"). Spec gövdeleri değişmez.

## 4. Uygulama sırası

1. **Portlar:** `ProjectRepository.delete`; `ProjectContentRepository` (`deleteAll`, `isTerrainReferenced`, `isLandXmlImportReferenced`); `landxml\application\LandXmlImportRepository` üç metod; `TerrainRepository` javadoc.
2. **bridge JPA:** `ProjectInfoJpaRepository` (`existsByEnvironmentTerrainDatasetId`, `existsByEnvironmentLandXmlImportId`); `ProjectSectionPresenceJpaRepository.deleteByProjectId`; `GraphContentStore.deleteAll`; `LoadInputContentStore.deleteAll`; `DesignSystemContentStore.deleteAll`; `JpaProjectContentRepository` (`deleteAll`, iki `isXReferenced`); `JpaProjectRepository.delete` (`findById(...).ifPresent(delete)` + flush).
3. **landxml JPA:** `LandXmlImportJpaRepository.findByTerrainId`; `JpaLandXmlImportRepository` (`findTerrainId`, `findIdsByTerrainId`, `deleteById`).
4. **Servis ve wiring:** `ProjectService` kurucusuna `TerrainRepository terrains, LandXmlImportRepository imports`; `delete` metodu; `CoreConfiguration.projectService` iki yeni parametre.
5. **Controller:** `ProjectController` `delete`, javadoc güncellemesi.
6. **Test çiftleri ve derleme:** `InMemoryProjectRepository.delete`; `InMemoryProjectContentRepository` (`deleteAll`, referans sorguları); `InMemoryTerrainRepository` kontrol; `InMemoryLandXmlImportRepository` üç metod; anonim implementasyonlara stub (`LandXmlImportUseCaseTest`, `LandXmlImportTransactionTest`, `JpaLandXmlImportRepositoryTest`); `ProjectServiceTest` kurucusu.
7. **Testler:** `ProjectServiceTest` (unit, paylaşım dalları); `ProjectServiceIntegrationTest` (atomiklik); `JpaLandXmlImportRepositoryTest` (yeni metodlar); yeni `backend\src\test\java\com\kopruq\contract\ProjectDeleteContractTest.java`; `EndpointInventoryContractTest` (`"DELETE /api/projects/{projectId}"`, 42); `ArchitectureRules.DOMAIN_DEPS`.
8. **e2e:** `fixtures.ts` `projectCleanup` fixture'ı ve tipi; `projects.ts:9` yorumu; `global-setup.ts:9` uyarısı (projeler teardown'da silinir; silme koruması yok, yalnızca yerel/test veritabanı önerilir).
9. **Dokümanlar:** `backend\README.md` (uç tablosu ~396, akış ~361); `docs\e2e\README.md:50`; `docs\architecture.md` (uç, silme stratejisi, bridge -> terrain/landxml kenarı); `docs\roadmap.md`.

## 5. Doğrulama

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1, AC3 | `ProjectDeleteContractTest` (MockMvc) | create -> delete 204 boş gövde; GET 404 `PROJECT_NOT_FOUND`; listede yok; rastgele UUID 404 + code; `abc` 400 `INVALID_PARAMETER` |
| AC2 | `ProjectDeleteContractTest` + `JdbcTemplate` | İki proje tüm bölümlerle doldurulur; FK tabloları `DatabaseMetaData.getExportedKeys(..., "project")` ile bulunur (H2/PG büyük-küçük harf farkına dikkat); silinen projede her tabloda 0 satır, diğerinde sayılar aynı; bulunan tablo sayısı >= 23 |
| AC4-AC8 | `ProjectDeleteContractTest` | `importSample(...)` ile terrain/import oluşturulur, id'ler workspace `environment` alanına yazılır, senaryolar kurulur; V1 tabloları JDBC ile sayılır |
| AC5-AC8 (ek) | `ProjectServiceTest` (in-memory) | Aynı senaryolar hızlı unit test olarak |
| AC9 | `ProjectServiceIntegrationTest` | Gerçek JPA adaptörleri + gerçek `TransactionTemplate`; `imports.deleteById` hata fırlatan sarmalayıcıdan geçer; hata sonrası proje, terrain, import durur |
| AC10 | Mevcut CORS testleri | Değişmeden yeşil |
| AC11 | `EndpointInventoryContractTest`, `ArchitectureTests` | Yeşil |
| AC12 | `npm run test:e2e` öncesi/sonrası `GET /api/projects` | Koşu sonrası yeni E2E projesi yok; düşen spec de temizlenir (elle) |
| AC13 | Aşağıdaki komutlar | Hepsi yeşil |

**Komutlar:**
- `mvn -f backend/pom.xml -B package`
- Odaklı: `mvn -f backend/pom.xml -B test -Dtest=ProjectDeleteContractTest,ProjectServiceTest,ProjectServiceIntegrationTest,EndpointInventoryContractTest,ArchitectureTests,JpaLandXmlImportRepositoryTest`
- `cd frontend && npm run build` (`tsc -b`, e2e tip kontrolü dahil)
- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && npm run test:e2e` (backend ve PostgreSQL ayakta; `start-dev.bat` veya `docs\e2e\README.md`)

## 6. Riskler

- **En yüksek risk:** kimlik doğrulama yok, ad koruması yok, uç her ortamda açık. `localhost:8080`'e ulaşan herkes gerçek projeler (ör. VIA-35) dahil her projeyi kalıcı olarak silebilir; geri alma yok. `start-dev.bat` e2e'yi ana geliştirme veritabanına bağlar. Hafifletme seçenekleri (kapsama alınmadı, kullanıcı değerlendirecek): (a) varsayılanı kapalı property bayrağı; (b) `E2E-` ad öneki koruması; (c) proje adını tekrar isteyen onay başlığı (`X-Confirm-Project-Name`); (d) e2e'yi yalnızca `postgres-test` (5433) veritabanına yönlendirmek; (e) kimlik doğrulama.
- **Paylaşılan referans yarışı:** silme sırasında başka bir proje aynı terrain'i PUT workspace ile referanslarsa sarkan referans oluşabilir (referanslar FK değil, kilit yok). Yerel kullanımda olasılık düşük; kabul edildi, dokümana not düşülür.
- **Kalıntılar:** projenin artık referans vermediği eski terrain/import satırları ve hiçbir projeye bağlanmamış terrain'ler birikmeye devam eder (kapsam dışı).
- **Gelecekteki tablolar:** projeye bağlanacak her yeni tablo `deleteAll`'a eklenmeli; eklenmezse FK ihlaliyle 500 olur, AC2'nin metadata tabanlı testi yakalar.
- **e2e teardown yarışı:** teardown sırasında bekleyen bir PUT 404 alabilir; test sonucunu etkilemez.

## 7. Varsayımlar

- Proje ile terrain/import arasındaki tek bağ `project_info.environment_*` alanlarıdır (`terrain.project_id` serbest string, doğrulandı).
- Başarılı silmede 204 ve boş gövde; revizyon kontrolü (`expectedRevision`) istenmez.
- Hibernate entity silmeleri H2 (PostgreSQL modu) ve PostgreSQL'de aynı davranır.

**Açık soru:** yok.
