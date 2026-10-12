# Implementation: frontend-remediation

Sonuç: **implemented** (onaylı kapsam: Faz 0, 1, 2, 3, 4, 6, 7, 8, 9). **Faz 5 bilinçli olarak uygulanmadı** (Q1–Q3 mühendis cevabı bekliyor).

Kaynak: feature-implementer el teslim raporu. Koordinatör bağımsız doğrulaması en altta.

## Faz durumu
| Faz | Durum | Özet |
|---|---|---|
| 0 | tamam | Baseline dosyaları yazıldı. Build exit 0; 26 başarısız test (plan §2.4 ile sayı ve dosya kümesi aynı); lint 85 uyarı. |
| 1 | tamam | `modules`'suz dosya normalize edilir, `modules.windLoads` doğrulanır. Başarısız açmada ref temizlenir ve proje dirty olur. Handle'sız Recent girişi eski handle'ı devralmaz. Save/Save As hatası `window.alert` ile gösterilir, `AbortError` gösterilmez. |
| 2 | tamam | `projectModules.ts` 8 modülü tutar, `useProjectModule` hook'u. Build/validate/apply modülleri kapsar; graph, aile ve modül deposu rollback'i var. Eksik modüller sıfırlanır ve bildirilir (D-1). `sessionId` `WorkspacePage` key'inde. Preferred Span yetim kuralları saklar. Dashboard salt okunur, proje verisinden (D-4). |
| 3 | tamam | Wind snapshot gerçek girdileri taşır; STALE (girdi ve deck genişliği); Details snapshot girdilerini gösterir; INVALID'de `missing` ve `—`; HTTP hatasında backend mesajı. |
| 4 | tamam | `stiffness.kr*` önce kontrol edilir; `parameterRangeDisplay`; `normalizeUnitId`/`normalizeProjectUnits`; `INITIAL_PROJECT.units` kimlikli; Inspector birimleri normalize eder, dönüşüm try/catch içinde; `EditableNumericInput.onCommit` `false` dönerse invalid. |
| 5 | **uygulanmadı** | `girderCandidates.ts`, `pierSectionProperties.ts`, `shared/ui/generation.ts` değişmedi. Doğrulanmamış notu Faz 9 dokümanlarında. |
| 6 | tamam | Parmak izleri normalize proje birimlerini içerir; düğüm parmak izi üst kapanış + gelen kenarlar; `executionDisplay.ts` yeni; publish graph snapshot'larını değiştirir; `markStale` değişiklik varsa olay yayar; Run bittiğinde graph/birim değişmişse snapshot STALE yayınlanır; `FamilyResultsViewer` freshness rozeti; Open/New snapshot ve kayıtlı run'ları temizler. |
| 7 | tamam | `shared/api/http.ts` (`API_BASE`+`VITE_API_BASE`, `ApiError`, `requestJson`, `requestBinary`, `postJson`, `postForm`, `formatApiError`), `shared/api/formErrors.ts`. 9 servis ve 3 satır içi fetch taşındı. Terrain import `status`/`warnings` gösterir; REVIEW_REQUIRED işaretlenir, `onImported` çağrılır (D-3). Layout ve Generate formları alan hatalarını gösterir. Faz 3'teki yerel ayrıştırıcı kaldırıldı. |
| 8 | tamam | Seismic ve Temperature `useQuery` hook'ları (`retry:false`, placeholder yok). INVALID uyarısı; Temperature `missingParameters` listeler. Lm1 α metin tamponu (Enter/blur, yalnızca sonlu sayı, aralık yok, Q4), satır başına "EN default". |
| 9 | tamam | `docs/architecture.md` ve `docs/roadmap.md` FRONTEND-REMEDIATION bölümü; doğrulanmamış Q1, Q2, Q3, Q5 listelenir. |

## Değişen / oluşturulan dosyalar
Toplam 58 değiştirilmiş + 22 izlenmeyen frontend dosyası (`git status` ile görülebilir).

**Dokümanlar:** `docs/architecture.md`, `docs/roadmap.md`; yeni `baseline-build.md`, `baseline-vitest.md`, `baseline-lint.md` (bu dizinde).

**Değişen kaynak (`frontend/src/`):**
- App: `app/App.tsx`, `app/router.tsx`
- Proje dosyası: `shared/project-file/{projectFileService,projectFileTypes,recentProjects,useProjectFile}.ts(x)`
- `features/family-registry/model/familyRepository.ts`
- Loads: `LoadsPanel`, `SelfWeightPermanent`, `seismic/SeismicPanel`, `temperature/UniformTemperaturePanel`, `wind/WindLoadsPanel`, `traffic/{Lm1Panel,TrafficLoadsPanel}`, `api/{temperatureService,trafficLoadsService}`
- `preferred-span/components/PreferredSpanPanel.tsx`; `project/components/{ProjectDashboardPanel,ProjectWorkspace}.tsx`; `project/model/projectWorkspace.ts`
- Family/graph: `family-tables/components/{FamilyResultsViewer,FamilyWorkspaceShell}.tsx`, `family-tables/model/graphFamilyPresentation.ts`, `graph/adapters/reactFlowAdapter.ts`, `graph/domain/quantities.ts`, `graph/family/{familyResults,familySnapshotStore,graphRunValidity}.ts`, `graph/ui/{EditableNumericInput,EngineeringNodeInspector,GraphWorkspace}.tsx`
- HTTP taşıma: `bridge-alternatives` (service, GenerateWorkflow), `graph/api/graphMaterialService.ts`, `kopruq-fast-solver` (service, FastSolverPanel), `landxml-import` (service, panel, LongitudinalProfileChart), `layout-generator` (service, SiteLayoutPanel), `terrain-dtm` (service, TerrainDtmPanel), `terrain-viewer` (service, TerrainMesh, TerrainPreview, TerrainViewerPanel)
- Genişletilen testler: `App.test`, `graphFamilyPresentation.test`, `familyResults.test`, `familySnapshotStore.test`, `graphRunValidity.test`, `NodeInspector.test`, `projectFileService.test`, `recentProjects.test`, `useProjectFile.test`

**Yeni kaynak:** `shared/project-file/{projectModules,useProjectModule}.ts`, `shared/api/{http,formErrors}.ts`, `features/loads/api/{windLoadsService,seismicService}.ts`, `features/loads/hooks/{useSeismicSpectrum,useUniformTemperature}.ts`, `features/graph/ui/executionDisplay.ts`

**Yeni testler:** `projectModules.test`, `projectModulesRoundTrip.test`, `http.test`, `LoadsPanel.test`, `WindLoadsPanel.test`, `SeismicPanel.test`, `UniformTemperaturePanel.test`, `Lm1Panel.test`, `PreferredSpanPanel.test`, `ProjectDashboardPanel.test`, `projectWorkspace.test`, `FamilyResultsViewer.test`, `executionDisplay.test`, `TerrainDtmPanel.test`, `SiteLayoutPanel.test`

## Kabul kriterleri
AC1–AC14, AC16–AC27: karşılandı (kanıt: yukarıdaki testler ve komutlar). **AC15: tasarım gereği değişmedi** (üç dosyada `git diff` boş).

Eksik kapsam notları (uygulayıcı bildirimi):
- AC7: workspace değişimi ve sayfa yenileme yalnızca depo destekli modüller üzerinden kapsanıyor, ayrı test yok.
- AC16: `GraphWorkspace` bileşen düzeyinde test yok; `executionDisplay` birim testi var.
- AC19: New Project'in snapshot temizlemesi kodda var, ayrı testi yok.
- AC20: `localhost:8080` `http.ts` varsayılanında ve bunu test eden `http.test.ts` içinde geçer.
- AC21: Generate formu aynı kod yolunu kullanıyor, ayrı test yok.

## Komutlar (`frontend/`)
- `npm run build`: her fazda exit 0 (yalnızca chunk-size uyarısı).
- `npm test`: her fazda exit 1, yalnızca baseline'daki 26 test başarısız; yeni başarısız test yok, baseline'dan yeşile dönen yok.
- `npm run lint`: exit 0; baseline 85 uyarı, dosya bazında artış yok.

| | Test dosyası | Test | Başarısız |
|---|---|---|---|
| Baseline | 62 (6 failed) | 456 | 26 |
| Final | 77 (6 failed) | 523 | 26 |

## Kararlar ve sapmalar
- D-1…D-5 planın önerilen varsayılanlarıyla; Q4 yalnızca sonlu sayı kontrolü.
- `modules` altında `null` = "boştu", eksik sayılmaz; yalnızca olmayan anahtarlar raporlanır.
- `savePrecastGirderDefinition` değer değişmediyse yazmaz ve gerçek değişimde `project-data-changed` yayar (GirderLibraryPanel mount yazımı dosyayı dirty yapmasın diye).
- Plan dışı: `useProjectFile`'a `settling` koruması; New Project sonrası `File *` kalmaması için.
- Temperature INVALID iken backend bir değer hesaplasa da daralma/genleşme `—` gösterilir (muhafazakâr).
- `setLm1` güncellemeleri etkin LM1'e (saklanan override, yoksa backend varsayılanı) göre çözülür; varsayılanlar ilk düzenlemeye kadar projeye yazılmaz.
- `graphRunValidity.ts` ikinci argüman artık `units`; `adaptGraphExecutionToFamilySnapshots` isteğe bağlı dördüncü `units` aldı. Tüm çağıranlar güncellendi.
- Round-trip testleri ayrı dosyada.
- Mojibake sırası: `'kNÂ·m'` yanlış eşleşiyordu, en özel etiket önce kontrol edilecek şekilde düzeltildi.

## Kalan iş ve manuel doğrulama
- Faz 5 (Q1 precast `Wy`, Q2 oval pier, Q3 tarama yuvarlaması) mühendis cevabı bekliyor; roadmap'te `[ ]`.
- 26 baseline testi (C-007-11, C-001-02, C-006-06, A-03) onarılmadı.
- Eski `.kopruq` dosyası açılınca eksik modüller için `window.alert` çıkar (D-1).
- Chromium'da elle doğrulanmalı: Open → düzenle → Save → başka proje → ilkini aç (Loads, Preferred Span, Cross Section dönüyor mu); File System Access ve IndexedDB Recent; canlı backend ile `message (Ref: id)` görünümü; `family-freshness*` CSS sınıflarının görünümü (stylesheet eklenmedi).
- Çalıştırılmadı: tarayıcı, canlı backend, `mvn`, CI.

## Koordinatör bağımsız doğrulaması
`frontend/` içinde yeniden çalıştırıldı: `npm run build` exit 0; `npm run lint` exit 0; `npm test` → 26 failed | 497 passed (523), 6 başarısız dosya (uygulayıcı raporuyla aynı). `git diff` Faz 5 dosyalarında ve `backend/` altında boş; `git status` izlenen değişiklikler yalnızca `frontend/src` ve iki doküman. Başarısız test adlarının baseline kümesiyle birebir eşleşmesi koordinatörce yeniden karşılaştırılmadı (yalnızca sayılar doğrulandı).
