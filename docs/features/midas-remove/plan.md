# Plan: midas-remove

Durum: READY. Mühendis kararları: Q1 = MIDAS kalıcı olarak kaldırılır; Q2 = MIDAS arayüz girdileri tümüyle kaldırılır; Q3 = `docs/midas-integration-analysis.md` arşiv/superseded notuyla korunur; Q4 = `ArchitectureRules` içindeki genel midas/scia/allplan tedarikçi-tipi koruması kalır.

## 1. Davranış ve kabul kriterleri

Hedef: MIDAS Civil NX entegrasyonu ürün yönünden kalıcı çıkar. Backend'de `analysis/infra/midas` adaptörü, testleri ve mimari testlerdeki MIDAS'a özel izinler silinir; frontend'de MIDAS navigasyon/placeholder girdileri silinir; yaşayan belgeler MIDAS'ı çözücü/doğrulama katmanı olarak göstermez.

Değişmeyenler: çözücüden bağımsız `AnalysisEngine` portu; `analysis/model/*` (`ISection`, `SolidCircularSection` dahil); native solver (`KopruqAnalysisEngine`); Fast Solver REST davranışı; `pom.xml`. MIDAS hiç REST'e açılmadı: API sözleşmesi değişmez, kalıcı veri/migrasyon yok.

- **AC1:** `backend/src/main/java/com/kopruq/analysis/infra/midas/` ve `backend/src/test/java/com/kopruq/analysis/infra/midas/` dizinleri yok.
- **AC2:** `backend/src` altında büyük/küçük harf duyarsız `midas` araması yalnızca genel tedarikçi korumasında eşleşir: `ArchitectureRules.solverViolations` içindeki `"midas"` alt-dize kontrolü ve `ArchitectureTests` sentetik negatif girdileri (`com.kopruq.midas`, `com.vendor.midas.Api`).
- **AC3:** `mvn -f backend/pom.xml -B package` BUILD SUCCESS (ArchitectureTests dahil). Controller sayısı 16 kalır, `pom_isOneModuleWithExactlyTheApprovedDependencies` geçer.
- **AC4:** `FastSolverService` hâlâ `KopruqAnalysisEngine`'e bağlı (`CoreConfiguration`). `FastSolverServiceTest`, `KopruqAnalysisEngineTest`, `FrameSolverTest`, `FrameSolverValidationTest`, `FastSolverModelBuilderTest`, `FrameBridgeModelBuilderTest`, `AppliedLoadSummaryTest` değişmeden geçer.
- **AC5:** Frontend'de `midas-nx-final-verification` SectionId, sidebar girdisi, `LEGACY_WORKSPACE` eşlemesi ve `PlaceholderPanel` metni yok; BIM / Export listesinde `'MIDAS'` yok; `frontend/src` içinde `midas` araması sonuçsuz.
- **AC6:** `cd frontend && npm run build`, `npm run test`, `npm run lint` geçer.
- **AC7:** Eski URL `/midas-nx-final-verification` hata vermez; `legacyWorkspaceFromPath` mevcut `?? 'project'` fallback'iyle `project` döndürür.
- **AC8:** Yaşayan belgelerde (`CLAUDE.md`, `AGENTS.md`, `README.md`, `backend/README.md`, `docs/architecture/backend-reference.md`, `docs/architecture.md` güncel durum/yapı bölümleri, `docs/roadmap.md` P06/P07 satırları) MIDAS mevcut/planlanan çözücü ya da doğrulama katmanı olarak geçmez. Spec belgeleri ve `docs/midas-integration-analysis.md` başına superseded notu eklenir. Tarihsel kayıtlar yeniden yazılmaz.

## 2. Doğrulanmış olgular

- `infra/midas` dışında `import com.kopruq.analysis.infra.midas` yok; `CoreConfiguration` MIDAS bean'i oluşturmaz (yalnızca satır 83 yorumu); yml/properties/`pom.xml`'de MIDAS özelliği veya bağımlılığı yok; MIDAS için REST endpoint/DTO yok.
- **Silinecek kaynaklar** (`com.kopruq.analysis.infra.midas`): `MidasApiCall`, `MidasApiClient`, `MidasApiException`, `MidasCivilNxAnalysisEngine`, `MidasHttpClient`, `MidasModelBuilder`, `MidasResultExtractor`, `MidasVocabulary`, `package-info.java`.
- **Silinecek testler:** `JsonAssertHelper`, `MidasAdapterContractTest`, `MidasCivilNxAnalysisEngineTest`, `MidasModelBuilderTest`, `MidasResultExtractorTest`, `MidasVocabularyTest`.
- **`ArchitectureRules.java`** (`backend/src/test/java/com/kopruq/architecture/`): satır 333-334 (`|| from.sub().equals("midas")`), 365-367 (midas Jackson izni), 411 ve 415-420 (`inMidas` dalı). Satır 421-426 genel alt-dize yasağı kalır.
- **`ArchitectureTests.java`:** sentetik girdiler satır 161, 163, 228-230, 234, 239-246, 294.
- **Yalnızca javadoc değişecek:** `analysis/application/AnalysisEngine.java`; `analysis/model/{AnalysisElement,AnalysisRequest,AnalysisResult,AnalysisSection,BoundaryCondition}.java`; `analysis/enums/AnalysisStatus.java`; `analysis/package-info.java`; `analysis/infra/nativeengine/{KopruqAnalysisEngine,package-info,RectangularSectionProperties}.java`; `bridge/package-info.java`; `bridge/model/BridgeAlternative.java`; `shared/config/CoreConfiguration.java:83`.
- **Frontend:** `app/navigation/sections.ts` (satır 101 SectionId, 221 SIDEBAR_GROUPS), `app/workspaces/registry.ts` (26 bim-export items, 42 LEGACY_WORKSPACE), `app/components/PlaceholderPanel.tsx` (38), `features/bridge-alternatives/model/types.ts` (5, yorum). Vitest ve `frontend/e2e` içinde MIDAS yok; `17-desteklenmeyen-ozellikler.spec.ts` yalnızca Allplan öğesini doğrular.

(Satır numaraları implementer tarafından yeniden doğrulanmalıdır.)

## 3. Uygulama adımları

1. **Backend silme:** AC1'deki iki dizin tümüyle silinir.
2. **`ArchitectureRules.java`:** 334'te `|| from.sub().equals("midas")` kaldırılır (koşul yalnızca `nativeengine`); 365-367 midas dalı kaldırılır; 411 `inMidas` ve 415-420 MIDAS'a özel `if` kaldırılır; 421-426 genel yasak aynen kalır.
3. **`ArchitectureTests.java`:** her negatif örnekte beklenen ihlal sayısı korunur. 161 aynen kalır; 163 silinir (gerekirse `com.kopruq.analysis.infra.nativeengine` konum örneği); 228, 229, 234 silinir; 230'daki import `com.vendor.midas.Api` (beklenen 1); 240, 241, 244 importları `com.vendor.midas.Api` (beklenen 1); 245-246 silinir (istenirse `com.kopruq.shared.config` composition muafiyeti için `com.vendor.midas.Api` ile pozitif örnek); test adı `t6_solverVendorTypes_outsideAnalysisInfra_areCaught`; 294'teki paket `com.kopruq.analysis.infra.nativeengine` (beklenen 1).
4. **Javadoc temizliği:** "MIDAS-P01 scope" → çözücüden bağımsız kapsam ifadesi (ör. "P01 scope: beam elements only", "reactions and displacements only"); `midas-adapter` ve `MidasCivilNxAnalysisEngine` atıfları kaldırılır; `AnalysisStatus`'taki "/doc/anal verified to block" → "the current engines run synchronously to completion"; `KopruqAnalysisEngine` FINAL katman → "not defined (MIDAS removed, see docs/roadmap.md MIDAS-REMOVE)"; `RectangularSectionProperties:15` eksen konvansiyonu korunur, yalnızca "(historically matched the removed MIDAS "SB" convention)" notu; `docs/midas-integration-analysis.md` bağlantıları "historical reference (archived)". Mühendislik içeriği eklenmez/değiştirilmez.
5. **`CoreConfiguration.java:83`:** yorum "named explicitly so a future second `AnalysisEngine` bean cannot make this ambiguous"; kod değişmez.
6. **`BridgeAlternativeTest`:** `canBeFullyConstructed_withoutAnyMidasOrExternalType` → `canBeFullyConstructed_withoutAnySolverOrExternalType`; P01 alıntısı kalır.
7. **Frontend:** `sections.ts` 101 ve 221 silinir; `registry.ts` 26 items `['Allplan', 'IFC', 'Excel', 'Reports']`, 42'deki `'midas-nx-final-verification': 'analysis'` silinir; `PlaceholderPanel.tsx` 38 silinir; `types.ts:5` "P07 (MIDAS analysis)" → "P07 (analysis)".
8. **Belgeler:**
   - `CLAUDE.md`: stack tablosundaki "MIDAS NX Adapter" satırı ve "Primary analysis solver" paragrafı kaldırılır; kısa not: "MIDAS removed 2026-10-16 (MIDAS-REMOVE); analysis port + native solver remain; future solver adapters behind the same port". Mimari kuraldaki tedarikçi listesi genel kalır.
   - `AGENTS.md`: satır 56, 145, 416, 447, 691, 701, 739, 782, 798, 811 düzenlenir; MIDAS doğrulama katmanı/adaptör ifadeleri kaldırılır, "final verification tier: not defined"; format listelerinden MIDAS çıkarılır.
   - `README.md` (kök): satır 33, 48, 51, 67, 70, 109, 157.
   - `backend/README.md`: mermaid düğümleri (40, 47, 52, 257, 262), paket ağacı (138), satır 62-63, 276, 726, 748.
   - `docs/architecture/backend-reference.md`: satır 146, 156, 159 "MIDAS" → "solver adapter"; R3 tedarikçi listesi genel kalır.
   - `docs/architecture.md`: durum/yapı bölümleri (3, 42, 53-55, 76, 121, 130, 143, 147-153); sona tarihli "MIDAS-REMOVE (2026-10-16)" girdisi; tarihsel milestone kayıtları (P06, Faz notları) yeniden yazılmaz.
   - `docs/roadmap.md`: P06 "Retired (MIDAS-REMOVE, 2026-10-16)"; P07 "MIDAS removed; analysis-integration milestone to be redefined with the engineer"; sona yeni kayıt; tarihsel bölümler korunur.
   - `docs/kopruq-master-spec.md`, `docs/architecture-amendment-v2.md`: başa "MIDAS-specific content superseded by MIDAS-REMOVE (2026-10-16)" notu; metin yeniden yazılmaz.
   - `docs/midas-integration-analysis.md`: başa "ARCHIVED / superseded – MIDAS integration removed 2026-10-16; kept as historical reference of verified MAPI behaviour" notu.
   - `docs/site-layout-platform-analysis.md`: başa kısa superseded notu.
   - `docs/e2e/17-desteklenmeyen-ozellikler.md` satır 10: "MIDAS/ALLPLAN/IFC" → "ALLPLAN/IFC".
   - Dokunulmaz: `archive/`, `docs/reviews/**`, diğer `docs/features/*`.

## 4. Test stratejisi / doğrulama

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Glob `backend/src/**/infra/midas/**` | sonuç yok |
| AC2 | Grep -i midas `backend/src` | yalnızca ArchitectureRules alt-dize kontrolü ve ArchitectureTests sentetik girdileri |
| AC3, AC4 | `mvn -f backend/pom.xml -B package` | BUILD SUCCESS; test sayısı yalnızca silinen MIDAS testleri/assert'leri kadar düşer |
| AC5 | Grep -i midas `frontend/src` | sonuç yok |
| AC6 | `cd frontend && npm run build`, `npm run test`, `npm run lint` | geçer |
| AC7 | `registry.ts` fallback incelemesi; isteğe bağlı küçük Vitest | `/midas-nx-final-verification` → `project` |
| AC8 | Grep -i midas yaşayan belgelerde + gözle inceleme | yalnızca tarihsel kayıt ve MIDAS-REMOVE notları |

İsteğe bağlı e2e: `cd frontend && npm run test:e2e -- 17-desteklenmeyen-ozellikler` (backend ve Playwright Chromium gerekir; etkilenmesi beklenmiyor).

Windows notu: CLAUDE.md'ye göre Maven `C:\Users\harput\tools\` altında ve yalnızca `~/.bashrc` PATH'inde. `mvn` bu makinede PATH'te değilse implementer bunu engel olarak raporlar; kurulum yapmaz. Bash çağrılarında mutlak yol kullanılır.

## 5. Riskler ve varsayımlar

- **Kirli çalışma ağacı:** commit edilmemiş Playwright e2e işi `README.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/e2e/17-desteklenmeyen-ozellikler.md`, `frontend/package*.json`, `frontend/e2e/`, `frontend/playwright.config.ts` dosyalarına dokunuyor (dal `codex/landxml-terrain-import`). State helper temiz kaynak ister; `/feature-implement` öncesi bu iş commit edilmeli veya ayrı branch/worktree kullanılmalı. Plan o değişiklikleri geri almaz; ortak dosyalarda yalnızca MIDAS satırları düzenlenir.
- **Bilgi kaybı:** canlı doğrulanmış MAPI yük bilgisi (vSIZE eşlemeleri, tablo HEAD'leri, ELNK/LM1) koddan çıkar; git geçmişinde ve arşivlenen analiz belgesinde kalır.
- **Mimari test kapsamı daralmamalı:** beklenen ihlal sayıları korunur, satır 421-426 dokunulmaz.
- `ISection` / `SolidCircularSection` üretimde artık tüketilmiyor; bilinçli korunuyor (silinmesi ayrı karar).
- Rollback: git revert. Veri/şema/REST göçü yok.
- Varsayım: `AnalysisEngine` portu kalır (FastSolverService buna bağlı; gelecekteki adaptörler aynı portu kullanır). P07'nin yeni tanımı bu kapsamda değil; yeni mühendislik içeriği yazılmaz.
