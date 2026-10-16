# Implementation: midas-remove

Sonuç: implemented. Plan hash a95d32e6…1702, baseline HEAD 9a6b398.

## Silinenler
- `backend/src/main/java/com/kopruq/analysis/infra/midas/` (9 kaynak)
- `backend/src/test/java/com/kopruq/analysis/infra/midas/` (6 test)

## Değişenler
- **Mimari testler:** `ArchitectureRules.java` (MIDAS'a özel sub/Jackson/inMidas dalları kaldırıldı, genel midas|scia|allplan koruması kaldı), `ArchitectureTests.java` (sentetik girdiler `com.vendor.midas.Api`/`nativeengine`; beklenen sayılar korundu; test `t6_solverVendorTypes_outsideAnalysisInfra_areCaught`).
- **Backend javadoc/yorum:** `AnalysisEngine`, `AnalysisStatus`, `KopruqAnalysisEngine`, `nativeengine/package-info`, `RectangularSectionProperties`, `AnalysisElement/Request/Result/Section`, `BoundaryCondition`, `analysis/package-info`, `bridge/package-info`, `BridgeAlternative`, `CoreConfiguration` (kod değişmedi). `BridgeAlternativeTest` yöntemi `canBeFullyConstructed_withoutAnySolverOrExternalType`.
- **Frontend:** `sections.ts`, `registry.ts`, `PlaceholderPanel.tsx`, `types.ts`.
- **Belgeler:** `CLAUDE.md`, `AGENTS.md`, `README.md`, `backend/README.md`, `docs/architecture/backend-reference.md`, `docs/architecture.md`, `docs/roadmap.md`, superseded/arşiv notları (`kopruq-master-spec`, `architecture-amendment-v2`, `midas-integration-analysis`, `site-layout-platform-analysis`), `docs/e2e/17-desteklenmeyen-ozellikler.md`.

## Kabul kriterleri
- AC1: karşılandı (`analysis/infra` altında yalnızca `nativeengine`; koordinatör doğruladı).
- AC2: karşılandı, bir notla. `backend/src` içinde kalan eşleşmeler: genel tedarikçi koruması, sentetik test girdileri ve plan adım 4'ün kendisinin öngördüğü javadoc atıfları (`KopruqAnalysisEngine:23`, `RectangularSectionProperties:15`, `docs/midas-integration-analysis.md` "historical reference" işaretleri). Plan AC2 ile adım 4 arasında bu noktada kendi içinde tutarsız; adım 4 izlendi. İstenirse ayrı bir işte temizlenebilir.
- AC3: `mvn -f backend/pom.xml -B package` BUILD SUCCESS, 707 test, 0 failure/error, 1 skipped (implementer raporu).
- AC4: CoreConfiguration kodu değişmedi, tüm suite geçti (Fast Solver testleri tek tek ayrıca çalıştırılmadı).
- AC5: `frontend/src` içinde `midas` yok (koordinatör Grep ile doğruladı).
- AC6: `npm run build`, `test`, `lint` exit 0 (yalnızca `GraphWorkspace.tsx` önceden var olan uyarıları) (implementer raporu).
- AC7: kod incelemesi, `LEGACY_WORKSPACE[id] ?? 'project'`; ek Vitest eklenmedi (registry test altyapısı yok).
- AC8: yaşayan belgelerden MIDAS çözücü/doğrulama katmanı ifadeleri çıkarıldı; kalanlar MIDAS-REMOVE notları, tarihsel kayıtlar ve genel tedarikçi listesi.

## Sapmalar ve notlar
- `BridgeAlternative` javadoc'u ve `BridgeAlternativeTest` yorumunda "independently of MIDAS" → "independently of any solver" olarak değiştirildi; plan adım 6 P01 alıntısının korunmasını söylüyordu.
- `docs/architecture.md` T7'de "exactly 12 @RestController" ifadesi önceden bayat (16); kapsam dışı bırakıldı.
- Çalıştırılmayan: `npm run test:e2e` (isteğe bağlı).
- Hiçbir şey commit/push edilmedi. Çalışma ağacındaki Playwright işine ait değişikliklere dokunulmadı; ortak dosyalarda yalnızca MIDAS satırları düzenlendi.
