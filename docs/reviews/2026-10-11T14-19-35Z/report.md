# Project review — 2026-10-11T14:19:35Z (UTC)

## Result
- **Verdict: STALE** (fingerprints differ) — doğrulanmış, eylem gerektiren bulgular da var (aksi halde ACTION_REQUIRED olurdu).
  - Fark yalnızca HEAD'den kaynaklanıyor: inceleme sırasında `3704d25` commit'i atıldı ve yalnızca `.claude/` araçlarını ekledi. **Seçili 345 frontend dosyasının içerik hash'lerinin tamamı başlangıç ve bitişte aynı**, yani bulgular inceledikleri kodu yansıtıyor; yine de iş akışı kuralı gereği karar STALE.
- **Scope:** `frontend` (backend kapsam dışı; kök dokümanlar yalnızca bağlam).
- **HEAD:** başlangıç `0cc62f9bab8a69b9ab348d8673aa28402d53b620`, bitiş `3704d251e76ddddd4a3cd24ea8f28bd64496c4ea`.
- **Fingerprints:** önce `248ac885b5e76abe3a8e5ad20f77be1e20cfb237eaeb27193d74477576125a7a`, sonra `4c47f2ea828ad8c7674fa580c9607feb661e9359850ca517e96dda2daf0f2f52` → **changed** (HEAD).
- **Architecture summary:** React + TypeScript (Vite) web uygulaması; `app → features → shared` yönü README'de beyan edilmiş ama uygulanmıyor (shared → features, features → app, 13 feature'da barrel atlanıyor). Tek durum sahibi `App.tsx` (~25 prop); Graph alt sistemi `graphStore` (modül tekili) → `graphEngine` → `nodeRegistry` (72 KB) → `domain/*` (React'tan bağımsız). Kalıcılık ~20 modülde doğrudan `localStorage` ve string literal `window` olaylarıyla; `.kopruq` dosyası bunun bir kısmını taşıyor. Ortak HTTP katmanı yok. Ayrıntı `architecture.md`.
- **Full text inspection:** 306/307 seçili metin dosyası tam okundu.
- **Partial / not inspected / excluded:** 1 partial (`frontend/package-lock.json`, talimat gereği yalnızca anomali kontrolü); 19 binary/non-UTF-8 ve 19 oversized dosya (`public/**/*.png`, `src/assets/hero.png`, `frontend/vitest-errors.txt` — görseller ve UTF-16 log) incelenmedi; 0 excluded, 0 deleted, 0 symlink. Git'in yok saydığı dosyalar (`node_modules`, `dist`) envanterde yok.
- **Analyzer state:** oxlint, tsc, vitest çalıştırıldı; build, Sonar, npm audit, coverage atlandı (aşağıda).

## Confirmed findings
Bulgu sayısı (ID adedi, ölçüm değil): 1 CRITICAL, 53 MAJOR, 74 MINOR, 14 INFO. BLOCKER yok. Tam kanıt, tetikleyici ve doğrulama adımları ilgili `architecture.md` / `batches/NNN.md` dosyasındadır; kök neden gruplaması `code-quality.md`'de.

| ID | Severity | Category | Confidence | Location | Impact | Smallest useful repair |
| --- | --- | --- | --- | --- | --- | --- |
| A-01 | CRITICAL | Kalıcılık | high | `shared/project-file/projectFileService.ts:7,10-13`; `App.tsx:70,84`; `LoadsPanel.tsx:56` | Projeye ait girdiler dosyaya girmiyor, projeler arası sızıyor/kayboluyor | Proje kapsamlı anahtar listesi; build/apply/newProject'e eklemek; round-trip testi |
| A-02 | MAJOR | Domain kimliği | high | `bridge-definition/model/store.ts:23,43,49`; `ProjectPanel.tsx:108,313` | `no` değişince köprü tanımı siliniyor | Store'u `bridge.id`'ye taşıyıp göç |
| A-03 | MAJOR | Tekrar domain kuralı | high | `foundation-families/model/service.ts:12-14`; `graph/domain/foundationCandidates.ts:49-50`; `nodeRegistry.ts:42-45` | İki ekranda farklı aday; B/D yönü ters | Tek framework'süz domain modülü; B/D'yi mühendisle hizalamak |
| A-04 | MAJOR | God object | high | `nodeRegistry.ts:276-346,342-343,324` | Önizleme ≠ Run; abutment önizlemesi geçersiz | Önizlemeyi executor üzerinden; metadata'ya taşıma |
| A-05 | MAJOR | Sözleşme | medium-high | `nodeRegistry.ts:73,320`; `girderCandidates.ts:11-12,26` | Precast kesit özellikleri NaN | Tek `PrecastGeometry` tipi |
| A-06 | MAJOR | Mühendislik güvenliği | high | `abutmentCandidates.ts:64-66`; `nodeRegistry.ts:221`; `WindLoadsPanel.tsx:7,9` | Kaynaksız eşik/sabitler üründe | Mühendis onayı/kaynak; kuralları tek modülde |
| A-07 | MAJOR | Kalıcılık | high | `MaterialsPanel.tsx:46`; `registry.ts:24,49`; `FamilyResultsViewer.tsx:21,25` | Dirty uyarısı yok, bayat veri | Tipli storage modülü |
| A-08 | MAJOR | Katman ihlali | high | `projectFileService.ts:1-4`; `GraphWorkspace.tsx:4`; `ParamSweepCard.tsx:21-22` | Bağımsız refactor zor | project-file'ı app'e; import kısıtı |
| A-09 | MAJOR | HTTP / hata | high | 9 modülde `API_BASE`; `SeismicPanel.tsx:7`; `WindLoadsPanel.tsx:9` | Localhost'a bağlı; yarış ve sessiz hata | `shared/api/http.ts`; TanStack Query |
| A-10 | MAJOR | SI birim kuralı | high | `girder-library/model/variants.ts:6,10-19` | cm/m karışıklığı riski | Metre depolama + göç |
| A-11 | MINOR | Doküman | high | `frontend/README.md:27-28,53-54`; `docs/roadmap.md` | Doküman kodu yansıtmıyor | README/roadmap güncellemesi |
| A-12 | MINOR | Tip güvenliği | high | `tsconfig.app.json`, `tsconfig.node.json` | Null hataları derlemede yakalanmıyor | `strictNullChecks`'ten başlamak |
| A-13 | MINOR | Ölü kod | high | `FamilyTablesWorkspace.tsx`, `HomePanel.tsx`, `Sidebar.tsx`, `TopBar.tsx`; `router.tsx:102-150` | Bakım yükü | Kullanıcı kararıyla silmek |
| A-14 | MINOR | Stil bağlılığı | high | `src/app/styles/App.css` (325 KB) | Global stil, !important yoğunluğu | Feature'a ait stil dosyaları |
| A-15 | MINOR | Kodlama bozulması | high | `WorkspacePage.tsx:24,27`; `BridgeDefinitionWorkspace.tsx:122…220`; `FoundationFamiliesPanel.tsx:80`; `EngineeringNodeShell.tsx:86,150` | Kullanıcıya bozuk karakter | UTF-8 düzeltme + `.editorconfig` |
| A-16 | INFO | Artefakt | high | `frontend/vitest-errors.txt` | Yerel yol/eski ad repoda | `.gitignore` |
| C-001-01 | MAJOR | Hata yönetimi | high | `App.tsx:164`; `useProjectFile.ts:13` | Save hatası gösterilmiyor | Ortak hata yardımcısı |
| C-001-02 | MINOR | Test bakımı | high | `App.test.tsx:83-85` | Bayat test paketi kırmızı | Beklentileri güncellemek |
| C-001-03 | MINOR | Hata yönetimi | high | `App.tsx:90-97`; `RecentFileAccessModal.tsx:4` | Yanlış diyalog, işlevsiz düğme | Ayrı diyalog |
| C-001-04 | MINOR | Tip güvenliği | medium-high | `navigation/sections.ts:250-257`; `router.tsx:98,153` | Başlıksız placeholder | Cast'siz etiketler, yönlendirme |
| C-001-05 | MINOR | Durum tutarlılığı | medium | `App.tsx:76,82-86` | Kısmi sıfırlama "temiz" görünüyor | Önce doğrula sonra uygula |
| C-001-06 | MINOR | Coupling | high | `App.tsx:165`; `TopWorkspaceNav.tsx:7,10` | Yanlış dosya seçici açılabilir | Ref/callback |
| C-001-07 | MINOR | Build hijyeni | high | `scripts/loads-typography-diagnostic.mjs:1,14` | Betik çalışmaz, regex hatalı | Bağımlılık/regex düzeltme |
| C-001-08 | MINOR | Okunabilirlik | medium | `TopWorkspaceNav.tsx:12,14` | Diff/blame yapılamıyor | Formatter |
| C-001-09 | INFO | Şablon artığı | high | `public/favicon.svg`, `public/icons.svg` | — | Temizlik |
| C-002-01 | MAJOR | Stil tekrarı | high | `App.css:7-148,2311-2406,2564,3007,3109` | Kaskad savaşı, regresyon riski | Kopyaları silmek, bölmek, Stylelint rapor modu |
| C-002-02 | MAJOR | Global stil sızması | high | `App.css:2158-2159`; `.spn-validation-error` tanımsız | Doğrulama hataları gri | `*`/!important kaldırma, hata token'ı |
| C-002-03 | MINOR | Ölü kod | high | `App.css:217-304,3335-3467,494-773` | — | Silmek |
| C-002-04 | MAJOR | Performans | medium | `bearing-families/model/service.ts:13`; `BearingFamiliesPanel.tsx:61` | Küçük deltada donma | Sayıyı çarpımla; üst sınır (mühendis teyidi) |
| C-002-05 | MINOR | Tutarsız kural | high | `BearingFamiliesPanel.tsx:64`; `DesignSystemUi.tsx:5,9` | Reddedilen değerler "kullanılacak" görünüyor | Servis aday fonksiyonu |
| C-002-06 | MINOR | Hata yönetimi | high | `useFamilyCatalog.ts:46`; `BearingFamiliesPanel.tsx:24-28` | Girdi sessizce kayboluyor | Boolean dönüş + hata |
| C-002-07 | MINOR | UX doğruluğu | high | `GenerateWorkflow.tsx:96,131` | Yanıltıcı başlık/mesaj | Ayrı sayılar, hata türleri |
| C-002-08 | MINOR | UX | high | `WorkspacePage.tsx:25-26`; `registry.ts:58` | Ağaç düğmeleri işlevsiz | Rotaya bağlamak |
| C-002-09 | INFO | Analyzer | high | `GenerateWorkflow.tsx:72` | — | `useWatch` (opsiyonel) |
| C-003-01 | MAJOR | Birim | medium-high | `FamilyResultsViewer.tsx:27,29` | Boyut aralıkları 1000 kat yanlış birimle | `toDisplayValue` + proje birimi |
| C-003-02 | MAJOR | Durum tutarlılığı | medium | `BridgeDefinitionWorkspace.tsx:76,100-107` | Eski span'lar yeni projeye yazılabilir | Effect bağımlılığı |
| C-003-03 | MINOR | Gizli yan etki | medium-high | `useFamilyCatalog.ts:15,26-42` | Açmak dirty yapıyor | Effect + `useCallback` |
| C-003-04 | MINOR | Tekrar / test | high | `PrecastGirderFamilyPreview.tsx:27-28`; `PrecastGirderSectionProperties.tsx:15` | Test yanlış kopyayı doğruluyor | Tek bileşen |
| C-003-05 | MINOR | Durum | medium | `FamilyResultsViewer.tsx:20` | Proje değişince sonuçlar boş | Senkron effect |
| C-003-06 | MINOR | Doğrulama | high | `BridgeDefinitionWorkspace.tsx:103,113,136,140,203` | Negatif/kesirli değerler | Tip-aralık sağlığı |
| C-003-07 | MINOR | Sorumluluk | high | `BridgeDefinitionWorkspace.tsx:118-164` | Bakım zorluğu | Bileşen bölme |
| C-003-08 | INFO | Ölü alan | high | `bridge-definition/model/types.ts:48,52,54` | — | Temizlik |
| C-004-01 | MAJOR | Birim | high | `graphFamilyPresentation.ts:96-97` | Rijitlikler 1000 kata kadar yanlış | `stiffness.kr` kontrolünü önce |
| C-004-02 | MAJOR | Mühendislik güvenliği | medium-high | `GirderLibraryPanel.tsx:46-53,77-81`; `variants.ts:11-17` | UI "mühendis değeri" diyor, kaynaksız aralık | Mühendis teyidi |
| C-004-03 | MINOR | Sözleşme | high | `graphFamilyPresentation.ts:7`; `FamilyResultsViewer.tsx:29` | Ana boyutlar "—" / " m" | Kanonik eşleme |
| C-004-04 | MINOR | Birim | high | `graphFamilyPresentation.ts:66-77,98` | Birimsiz başlık | `units` geçirmek |
| C-004-05 | MINOR | Doğruluk | high | `pierSectionGeometry.ts:35-40` | B = D oval çizilmiyor | Daire üretmek |
| C-004-06 | MINOR | Domain tutarlılığı | medium | `FoundationSchematic.tsx:7,8,15` | Eksen yönü tutarsız | Mühendisle konvansiyon |
| C-004-07 | MINOR | Tekrar kural | high | `variants.ts:21-30` | tf/bf/w taramaları yok sayılıyor | Tek domain modülü |
| C-004-08 | MINOR | Gizli yan etki | medium-high | `GirderLibraryPanel.tsx:61,65-68` | Açmak depoya yazıyor | Yalnızca kullanıcı değişikliğinde |
| C-004-09 | INFO | Ölü kod | high | `generated-bridge-model/model/types.ts` vb. | — | Temizlik |
| C-005-01 | MAJOR | Mühendislik çıktısı | high | `girderCandidates.ts:17` vs `:23` | Precast Wy 4 kat farklı | Mühendis teyidi + parantez + referans testi |
| C-005-02 | MAJOR | Doğrulama | high | `girderCandidates.ts:26` | Geçersiz aday `VALID` | `reasons` + `isFinite` |
| C-005-03 | MAJOR | Domain kuralı | high | `bridgeAssembly.ts:22,34`; `nodeRegistry.ts:234,237-245` | ERROR abutment ile assembly VALID | Durum yayılımı; A2 mesajı |
| C-005-04 | MAJOR | Mühendislik güvenliği | medium-high | `abutmentCandidates.ts:47,57,64` | Eksik girdi varsayılanla dolduruluyor/NaN | `INCOMPLETE` |
| C-005-05 | MINOR | Tekrar / performans | high | `reactFlowAdapter.ts:50-55,100-132`; `GraphWorkspace.tsx:74,174` | Yutulan önizleme hatası | Tek çözümleyici |
| C-005-06 | MINOR | Tekrar | high | 6 Kartezyen üreteç (`pierCandidates.ts:42-61` vb.) | Farklı limit semantiği | Ortak üreteç |
| C-005-07 | INFO | Ölü kod | high | `nodeVisualThemes.ts:33,73` vb. | — | Temizlik |
| C-006-01 | MAJOR | Mühendislik çıktısı | high | `pierSectionProperties.ts:17,19` | Oval Wx/Wy yer değiştirmiş | Mühendis teyidi + test |
| C-006-02 | MAJOR | Durum bütünlüğü | high | `familyResults.ts:47`; `graphRunValidity.ts:9-13` | Birim değişince sonuç VALID kalıyor | Parmak izine `projectUnits` |
| C-006-03 | MAJOR | Durum bütünlüğü | high | `graphRunValidity.ts:10,13`; `NodeHeader.tsx:24` | Üst düğüm değişse de SUCCESS | Geçişli parmak izi |
| C-006-04 | MAJOR | Paylaşılan durum | high | `familySnapshotStore.ts:3,6,11`; `FamilyResultsViewer.tsx:21-23`; `GraphWorkspace.tsx:84-90` | Bayat aileler geçerli görünüyor | Okuma anında kontrol, rozet, temizleme |
| C-006-05 | MINOR | Doğruluk | high | `graphEngine.ts:14-15,27` | Length + Quantity reddediliyor | Tek tür çözümleyici |
| C-006-06 | MINOR | Test/sözleşme | medium-high | `quantities.ts:28` | 12 UI testi kırmızı | Hassasiyet politikası kararı |
| C-006-07 | MINOR | Sağlamlık | high | `superstructureCandidates.ts:6` | Sınırsız, bağlamsız mesajlar | Ortak üreteç |
| C-006-08 | MINOR | Sayısal doğruluk | high | `spanArrangement.ts:72-74` | Son istasyon ≠ toplam | Tamsayı kümülatif |
| C-006-09 | INFO | Ölü yol | high | `familyResults.ts:58`; `graphRunValidity.ts:7,13` | — | Temizlik |
| C-007-01 | MAJOR | İşlev / güvenlik | high | `nodeRegistry.ts:75-76`; `EngineeringNodeInspector.tsx:43-53` | Girder span/family düzenlenemiyor | Inspector bölümü veya alanları kaldırmak |
| C-007-02 | MAJOR | Sözleşme | high | `nodeRegistry.ts:223,231,382-390`; `AssemblyInspector.tsx:13` | Span/Abutment/Assembly bağlanamıyor | `display:any` + dönüşüm portu |
| C-007-03 | MAJOR | Birim | high | `BaseNode.tsx:49-54`; `NodeInspector.tsx:56` | Range değeri iki kez dönüştürülüyor | Simetrik dönüşüm |
| C-007-04 | MAJOR | Hata yönetimi | medium-high | `EngineeringNodeInspector.tsx:32,39,40,65` | Geçersiz düzenleme sonrası eski aday VALID | `validationStatus` + hata gösterimi |
| C-007-05 | MINOR | Tutarlılık | high | `nodeRegistry.ts:76,100,323` | Steel adaylar INCOMPLETE | `resolveMaterial` |
| C-007-06 | MINOR | Doğrulama | high | `nodeRegistry.ts:32,266-267` | Listeden yalnızca ilk değer | Skaler port veya hata |
| C-007-07 | MINOR | Gizli yan etki | high | `graphStore.ts:64-75`; `useProjectFile.ts:11` | Gezinme dirty yapıyor | Olay/`event.key` filtresi |
| C-007-08 | MINOR | Veri bütünlüğü | high | `graphStore.ts:101-106` | Grup kimliği çakışması | UUID |
| C-007-09 | MINOR | Erişilebilirlik | high | `CanvasSelect.tsx:70,79,85` | Aktif seçenek görünmüyor | `aria-activedescendant` |
| C-007-10 | MINOR | Birim | high | `BaseNode.tsx:99-100`; `EngineeringNodeInspector.tsx:73-82` | Sabit "m" | `formatDisplayValue` |
| C-007-11 | MINOR | Test borcu | high | `EditableNumericInput.tsx:25` ve testler | 10 test kırmızı | `spinbutton` + sayısal |
| C-007-12 | INFO | Okunabilirlik | high | `nodeRegistry.ts:34,69,76,100` | — | Bölme, cast azaltma |
| C-008-01 | MAJOR | Durum / mühendislik güvenliği | high | `GraphWorkspace.tsx:49,130,173`; `EngineeringNodeShell.tsx:75-80`; `NodeInspector.tsx:47` | Abutment eski sismik durumu gösteriyor | Dirty'de çıktıları boşaltmak |
| C-008-02 | MAJOR | Tekrar kural / doğruluk | high | `EngineeringNodeShell.tsx:41-42` | "e yeterli" ters mesaj, birim yok sayılıyor | Adaydan okumak |
| C-008-03 | MAJOR | Doğruluk | high | `EngineeringSchematics.tsx:118-154` | Box pier t hep 0,30 m | `wx`/`wy` |
| C-008-04 | MINOR | Ölü kod | high | `EngineeringSchematics.tsx:74-111`; `EngineeringNodeShell.tsx:44-51` | oxlint no-unreachable | Silmek / butonu geri eklemek |
| C-008-05 | MINOR | Tutarlılık | high | `NodeHeader.tsx:24,39`; `NodeStatusIndicator.tsx:10,29` | Başlık/alt durum çelişkisi | Tek durum fonksiyonu |
| C-008-06 | MINOR | Eşzamanlılık | medium-high | `GraphWorkspace.tsx:71,77-98` | Eski sonuç yeni grafa | `abort()`, `finally` |
| C-008-07 | MINOR | Kullanılabilirlik | medium | `GraphWorkspace.tsx:124-125` | Canvas'ta undo çalışmıyor | Koşulu kaldırmak |
| C-008-08 | INFO | Okunabilirlik | high | `EngineeringSchematics.tsx:138,241` vb. | — | Temizlik |
| C-009-01 | MAJOR | Veri bütünlüğü | medium-high | `LandXmlImportPanel.tsx:18,33,40` | Proje CRS'i eziliyor | Proje etiketini korumak, uyarı |
| C-009-02 | MINOR | Doğrulama | high | `FastSolverPanel.tsx:115-120`; `SiteLayoutPanel.tsx:93-98` | Görünmeyen hata submit'i engelliyor | `error` prop'ları |
| C-009-03 | MINOR | Hata yönetimi | high | `fastSolverService.ts:49-51`; `layoutService.ts:34-36` | Backend mesajı kayboluyor | Ortak `errorMessage` |
| C-009-04 | MINOR | Veri bütünlüğü | high | `SiteLayoutPanel.tsx:118` | Tekrar eden zone ID | Sayaç + benzersizlik |
| C-009-05 | INFO | Ölü kod | high | `fastSolverService.ts:55` vb. | — | Temizlik |
| C-010-01 | MAJOR | Eşzamanlılık | high | `SeismicPanel.tsx:7`; `UniformTemperaturePanel.tsx:6` | Ekrandaki sonuç ekrandaki girdiye ait değil | `useQuery` ile anahtar |
| C-010-02 | MAJOR | Doğrulama | high | `traffic/Lm1Panel.tsx:5,11` | α=0 sessizce | `DecimalInput`, reset |
| C-010-03 | MAJOR | Veri kaybı | high | `TabDetailPanel.tsx:51-55`; `SelfWeightPermanent.tsx:88`; `TrafficLoadsPanel.tsx:29-35` | Sekme değişiminde girdiler kayboluyor | State'i yukarı taşımak |
| C-010-04 | MAJOR | Veri tutarlılığı | high | `LoadsPanel.tsx:56`; `WindLoadsPanel.tsx:7,9` | Yeni girdi + eski sonuç raporu | Girdi snapshot + STALE |
| C-010-05 | MINOR | Hata yönetimi | high | `SeismicPanel.tsx:7`; `WindLoadsPanel.tsx:9`; `UniformTemperaturePanel.tsx:6` | Bozuk depo → beyaz ekran | `readStored` + ErrorBoundary |
| C-010-06 | MINOR | Mühendislik güvenliği kuralı | high | `SelfWeightPermanent.tsx:97-106` | Formülün otomatik testi yok | Saf fonksiyon + `architecture.md:1864-1866` örneği |
| C-010-07 | INFO | Ölü kod | high | `SeismicMathFormula.tsx` vb. | — | Temizlik |
| C-011-01 | MAJOR | Doğrulama | high | `project/api/excelImport.ts:20-46` | "13,8" → 13, geçersiz → 0 | Sıkı ayrıştırma + `issues` |
| C-011-02 | MAJOR | Veri kaybı | high | `ProjectPanel.tsx:140-145`; `excelImport.ts:34-57` | Onaysız tablo değişimi | Onay + tekrar reddi |
| C-011-03 | MAJOR | Mühendislik güvenliği | medium | `excelImport.ts:49-54`; `ProjectPanel.tsx:123-127` | Kaynaksız varsayılanlar işaretsiz | Mühendis onayı / `null` |
| C-011-04 | MAJOR | İşlev | high | `PierCapFamiliesPanel.tsx:13,22-23,34` | Boş katalogda ekleme yok | Ekle butonu |
| C-011-05 | MAJOR | İşlev | high | `PierFamiliesPanel.tsx:57,59` | İki kolon aralığı girilemiyor | Alanları göstermek |
| C-011-06 | MAJOR | Veri kaybı | high | `PreferredSpanPanel.tsx:43-81` | Kurallar kalıcı siliniyor | Silmeden saklamak |
| C-011-07 | MAJOR | Durum sahipliği | high | `ProjectDashboardPanel.tsx:46-49` | Sabit "Sibiu-Pitesti-Lot2" | `project` prop'una bağlamak |
| C-011-08 | MINOR | Göç | high | `PierFamiliesPanel.tsx:13-22` | Legacy göç çalışmıyor | `normalize` adımı |
| C-011-09 | MINOR | Mantık | high | `PierCapFamiliesPanel.tsx:24,26` | Çift ad kontrolü işlevsiz | Yeni ad + `return` |
| C-011-10 | MINOR | Ölü davranış | high | `MaterialsPanel.tsx:50` vb. | Dinleyici yok | Kaldırmak/bağlamak |
| C-011-11 | MINOR | Doğrulama | high | `ProjectDashboardPanel.tsx:31-35` | Yanlış Route Length | `< 1000` kontrolü |
| C-012-01 | MAJOR | Veri sözleşmesi | high | `projectWorkspace.ts:35`; `EngineeringNodeInspector.tsx:108-109` | Inspector'da istisna, değer kaydedilmiyor | Kimlik + normalizasyon |
| C-012-02 | MAJOR | Veri kaybı | high | `ProjectWorkspace.tsx:65-66,72` | Birim Save'de geri alınıyor | `draft` üzerinden |
| C-012-03 | MAJOR | Veri akışı | high | `TerrainDtmPanel.tsx:66`; `BridgeDefinitionWorkspace.tsx:126` | projectId/CRS/alignment kayboluyor | Props + `onImported` |
| C-012-04 | MAJOR | Hata / performans | high | `AlignmentOverlay.tsx:26-44` | Sınırsız istek, yutulan hata | Toplu/sınırlı istek, catch |
| C-012-05 | MAJOR | Doğrulama | high | `DecimalInput.tsx:43-47`; `PrecastCrossSection.tsx:72,102` | Negatif yük uyarısız | Aralık kontrolleri (mühendis teyidi) |
| C-012-06 | MINOR | Görselleştirme | high | `PrecastCrossSection.tsx:168,197-198` | Ölçü s/2 farklı | Mühendise sormak |
| C-012-07 | MINOR | Tutarlılık | high | `SystemAssemblyPanel.tsx:45-53,73,79-84` | Kullanılamaz aileler kullanılabilir görünüyor | Servis durumları |
| C-012-08 | MINOR | Sunum | high | `SystemAssemblyPanel.tsx:84,116` | 1,25 ve 1,30 aynı görünüyor | `formatEngineeringValue` |
| C-012-09 | MINOR | Doğrulama | high | `ProjectPanel.tsx:298-305` | Negatif/tekrar `no` | Ortak doğrulayıcı |
| C-012-10 | MINOR | UX | high | `TerrainCanvasFrame.tsx:35-49` | Kamera resize'da sıfırlanıyor | Yalnızca bounds'ta fit |
| C-012-11 | INFO | Ölü kod / bellek | high | `SystemAssemblyPanel.tsx:21,32`; `TerrainMesh.tsx:18-21,59` | — | Temizlik |
| C-013-01 | MAJOR | Güvenilmeyen girdi | high | `projectFileService.ts:16,18,43-44`; `useProjectFile.ts:14` | Bozuk dosya depoya yazılıp çöküyor | Eleman düzeyinde şema |
| C-013-02 | MAJOR | Veri bütünlüğü | high | `useProjectFile.ts:14`; `projectFileService.ts:57` | Save önceki projenin dosyasına yazabiliyor | Doğrula-sonra-uygula; hatada `ref` sıfırlama |
| C-013-03 | MAJOR | Kimlik | high | `recentProjects.ts:13` | Recent yanlış dosyayı açıyor | Handle'ı korumamak / `isSameEntry` |
| C-013-04 | MINOR | Hata yönetimi | medium | `projectFileService.ts:60` | İndirme doğrulanmadan "kaydedildi" | Dirty'yi korumak |
| C-013-05 | MINOR | Durum | high | `TerrainViewerPanel.tsx:62-82` | Eski aks koordinatları | `key={terrainId}` |
| C-013-06 | INFO | Ölü kod | high | `FamilyUiTokens.ts`; `index.css:8,20,32,85-109` | — | Temizlik |
| C-014-01 | MINOR | Eşzamanlılık | medium | `useProjectFile.ts:12-13` | Dirty yanlış temizleniyor | Fingerprint karşılaştırma |
| C-014-02 | MINOR | Ölü kod | high | `SectionPreviewTokens.ts:17-19` vb. | Yanıltıcı ölçek API'si | Kaldırmak |
| C-014-03 | MINOR | Tekrar | high | `SectionBounds.ts:3`; `DrawingBounds.ts:4,17` | — | Tek tip |
| C-014-04 | MINOR | Yanıltıcı soyutlama | high | `TechnicalDrawingFit.ts:11-24` | Zarf ölçeği etkilemiyor | Parametreyi kaldırmak/katmak |
| C-014-05 | MINOR | Okunabilirlik | high | `DimensionArrow.tsx:4,13-14,21` | Süreksiz ok boyutu | Tek oran |
| C-014-06 | MINOR | Test kalitesi | high | `DimensionGeometry.test.ts:68-82` vb. | Totolojik testler | Gerçek davranışa bağlamak |
| C-014-07 | MINOR | Birim gösterimi | high | `DimensionFormatter.ts:1-2` | 0,125 → "0.13"; NaN metni | Birime bağlı hassasiyet |
| C-015-01 | MINOR | Çizim | high | `DimensionLayers.tsx:18` | Dikey etiketler kayık | `dominantBaseline` geçirmek |
| C-015-02 | MINOR | Ölü kod | high | `ImportActionScreen.tsx`, `ParameterProvenanceTable.tsx` vb. | — | Kaldırmak/işaretlemek |
| C-015-03 | MINOR | Tekrar | high | `ParamSweepCard.tsx:25-65`; `TechnicalDimensionGroup.tsx:13-20` | Dört ölçü uygulaması | Tek bileşen |
| C-015-04 | MINOR | Yanıltıcı soyutlama | high | `BulbTeeGirderShape.tsx:31,41-50` | Deck kesiti boyutlardan bağımsız | Parametrik path / etiket |
| C-015-05 | MINOR | Doğrulama | high | `DecimalInput.tsx:46-49` | Virgül sessizce reddediliyor | Normalize / hata |
| C-015-06 | MINOR | Erişilebilirlik | medium | `RecentFileAccessModal.tsx:4`; `UnsavedChangesModal.tsx:4` | Odak yönetimi yok | Radix `Dialog` |
| C-015-07 | INFO | Gizlilik | high | `CountryMap.tsx:17-28` | Konum Google'a gidiyor | `no-referrer`, `sandbox` |
| C-016-01 | MAJOR | Mühendislik veri bütünlüğü | high | `shared/ui/generation.ts:4,7` | 0,125 m → 0,13 m sessizce; yinelenen aday | İndeksten adım; hassasiyet mühendis kararı |

Not: Tablo satırları özettir; her bulgu için tam çağrı yolu, tetikleyici, sonuç, kuralın bu projeye neden uyduğu ve doğrulama adımı batch dosyalarındadır.

## Architecture map
`architecture.md` §1: giriş (`main.tsx` → göç → `App.tsx`), iki katmanlı yönlendirme (`workspaces/registry.ts` + `router.tsx`), gerçek bağımlılık kenarları tablosu (shared → features, features → app ihlalleri), Graph zinciri (`graphStore` → `graphEngine` → `nodeRegistry` → `domain/*`), kalıcılık haritası (localStorage anahtarları, `kopruq:*` olayları, IndexedDB recent), API katmanı (9 modülde `API_BASE`). Döngüsel import kanıtlanmadı.

## Code quality
`code-quality.md`: 12 kök neden grubu (kalıcılık, köprü kimliği, mühendislik hesabı, bayat sonuçlar, birim, tekrar kural/kaynaksız sabit, doğrulama, HTTP, katman/ölü kod, stil, okunabilirlik, testler) ve başarısız test kök neden tablosu.

## Hypotheses and optional improvements
Doğrulanmamış; onaylanmış bulgu sayılmaz:
- **H-01:** Abutment/Span/Assembly düğümleri, Wind/Seismic/Temperature, `.kopruq` ve kaynaksız sabitler için belgelenmiş milestone/mühendis onayı yok.
- **H-02:** Sınırsız aday üretimi — C-002-04 ile kısmen doğrulandı; diğer üreteçlerde ek kanıt (batch 011, 016).
- **H-03 → doğrulandı (C-016-01).** **H-04 → doğrulandı (C-010-01).** **H-06 → doğrulandı (C-010-05).** **H-08 → doğrulandı (C-006-04).**
- **H-05:** `legacyStorageMigration` döngüsü — somut atlama gösterilemedi; işaretçi olmadığı için silinen anahtar geri gelebilir.
- **H-07:** `main.tsx` import sırası — mekanizma doğru, şu an kusur değil.
- Batch hipotezleri: HC-001-a…e, HC-002-a…d, HC-003-a…e, HC-004-b…e (HC-004-a çürütüldü), H-005-a/b, H-006-a…c, H-007-a…d, H-008-a…d, H-009-01…06 (H-009-02 C-012-03 ile doğrulandı), H-010-01…04, HC-011-a…d, H-012-a…f, H-013-a…c, H-014-a…c, H-015-a…c. Ayrıntı ilgili batch dosyalarında.

## Analyzer evidence
| Command/tool | Version | Scope | Exit code | Output | Interpretation and limits |
| --- | --- | --- | --- | --- | --- |
| `./node_modules/.bin/oxlint` (repo config, no `--fix`) | 1.82.0 | `frontend/` | 0 | `analyzers/oxlint.txt` | 85 uyarı, 0 hata; kök nedenler batch'lerde eşlendi (ör. no-unreachable → C-008-04, exhaustive-deps → C-003-02) |
| `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` | 6.0.3 | `frontend/src` | 0 | `analyzers/tsc.txt` | Tip hatası yok; `strict` kapalı olduğu için sınırlı güvence (A-12) |
| `./node_modules/.bin/vitest run` | `vitest.txt` satır 1 | `frontend/` | 1 | `analyzers/vitest.txt` | 62 dosya: 6 başarısız / 56 geçti; 456 test: 26 başarısız / 430 geçti; kök nedenler `code-quality.md` §12 |
| `tsc -b` / `npm run build` | — | — | atlandı | — | buildinfo/dist yazar |
| SonarQube | — | — | atlandı | — | sunucu/rapor yok |
| npm audit | — | — | atlandı | — | ağ gerektirir |
| Coverage | — | — | atlandı | — | check-only script yok; sayısal coverage ölçülmedi |

CI workflow bulunamadı.

## Coverage
| File | Full / partial / not inspected / excluded | Reason and batch |
| --- | --- | --- |
| 306 metin dosyası (`list-001.txt` … `list-016.txt`) | full | Batch 001–016 kapsam tabloları |
| `frontend/package-lock.json` | partial | Batch 001: 1-40, 4520-4534 + `resolved` URL Grep'i (306/307 npm registry, `xlsx` → cdn.sheetjs.com, integrity var) |
| 19 binary/non-UTF-8 (`public/kopruq_nodes_logo/*.png` vb., `src/assets/hero.png`, `frontend/vitest-errors.txt`) | not inspected | Görsel/UTF-16 log; `vitest-errors.txt` mimari fazda 1-30 okundu (A-16) |
| 19 oversized (`public/kopruq-logo.png`, `public/kopruq_nodes_logo/*.png`) | not inspected | Görsel, kaynak kod değil |
| Git ignored (`node_modules`, `dist`) | excluded | Envanterde yok |

## Repair priorities
Küçük, sıralı, davranışı korumaya yönelik adımlar. Mühendislik değerleri değişikliklerinde önce mühendis onayı alınmalı; hiçbir formül, sınır veya varsayılan uydurulmamalı.
1. **Veri kaybını önle (proje dosyası):** C-013-02 (açma hatasında `ref` sıfırla, `modules ?? {}`), C-013-01 (eleman düzeyinde doğrulama, depoya yazmadan önce), C-013-03 (recent handle eşlemesi), C-001-01 (Save hatasını göster). Doğrulama: `useProjectFile`/`projectFileService` testleri.
2. **A-01 round-trip:** proje kapsamlı anahtar listesi + `buildProjectFile`/`applyProjectFile`/`newProject`; ardından C-010-03, C-010-04, C-011-06, C-011-07, C-012-02. Doğrulama: "A'yı düzenle → B'yi aç" ve round-trip testleri.
3. **Mühendislik hesabı düzeltmeleri (mühendis teyidiyle):** C-005-01, C-006-01, C-004-01, C-016-01, C-008-02 mesajı, C-008-03; her biri için referans değerli birim testi.
4. **Bayat sonuçları geçerli gösterme:** C-008-01 (dirty'de çıktıları boşalt), C-006-02/03 (parmak izi), C-006-04 (snapshot tazeliği), C-007-04, C-005-02/03 (geçerlilik yayılımı).
5. **Birim sözleşmesi:** C-012-01 (kimlik + normalizasyon), C-007-03, C-003-01, A-10.
6. **Girdi doğrulama:** C-011-01/02, C-010-02, C-012-05, C-011-04/05.
7. **HTTP katmanı:** A-09 + C-010-01, C-012-04, C-009-01, C-012-03.
8. **Kimlik:** A-02 (`no` → `id` göçü).
9. **Testleri yeşile döndür:** C-007-11, C-001-02, C-006-06 (hassasiyet politikası kararı sonrası); A-03 B/D çelişkisi için mühendis kararı.
10. **Yapısal sadeleştirme:** A-04, A-03, A-08, C-002-01/02, ölü kod (A-13, kullanıcı kararıyla).

## Limits and next steps
- **STALE:** HEAD inceleme sırasında `0cc62f9` → `3704d25` değişti (yalnızca `.claude/` araçları eklendi). Frontend içerik hash'leri değişmedi; tam güncel bir karar için incelemenin yeni HEAD'de yeniden snapshot'la teyidi yeterli olabilir, ancak iş akışı kuralı gereği bu rapor STALE.
- Bu bir AI destekli inceleme ve isteğe bağlı araç kanıtıdır; kapsamlı bir SonarQube motoru değildir. Kalite skoru, borç süresi veya kalite kapısı üretilmedi.
- Çalışma zamanı davranışları çoğunlukla kod izlemesinden çıkarıldı; uygulama çalıştırılmadı (vitest hariç).
- Backend kapsam dışıydı; frontend–backend sözleşmesine dayanan bazı hipotezler (H-009-03/04, H-010-01…03, H-012-d) backend incelemesi gerektirir.
- Binary/oversized görseller ve `package-lock.json`'ın tamamı incelenmedi.
- Mühendis kararı gereken konular: B/D yön konvansiyonu (A-03), kaynaksız sabit ve varsayılanlar (A-06, C-004-02, C-011-03, H-01), formül teyitleri (C-005-01, C-006-01), uzunluk hassasiyeti (C-016-01, C-006-06).
- Düzeltmeler yalnızca ayrı ve açık bir kullanıcı isteğiyle uygulanır.
