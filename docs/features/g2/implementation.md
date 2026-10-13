# Implementation report: g2 (C-006-04, C-007-04, C-010-04)

Kaynak: feature-implementer el-teslim raporu. Koordinatör doğrulaması: `npm test` 79 dosya / 574 test geçti; `npm run build` başarılı; `git status` yalnızca `frontend/src` ve `docs`; `bridgeAssembly`, `girderCandidates`, `superstructureCandidates`, `nodeRegistry`, `abutmentCandidates`, `graphRunValidity` ve `backend`, `package.json` için diff yok. Lint koordinatör tarafından çalıştırılmadı. Review yapılmadı.

**Sonuç: implemented.** T0-T7 tamam, AC1-AC14 karşılandı. Elle Chromium kontrolleri çalıştırılmadı.

## Baseline vs final
| Kontrol | Baseline | Final |
|---|---|---|
| `npm run build` | exit 0 (chunk-size uyarısı) | exit 0 |
| `npx vitest run` | 78 dosya, 554 test, 0 başarısız | 79 dosya, 574 test, 0 başarısız |
| `npm run lint` | exit 0, yalnızca uyarı | exit 0; dosya başına uyarılar aynı, `FamilyResultsViewer.tsx` 10→9 |

## Değişen dosyalar
- `graph/family/familyResults.ts`: `currentFreshness`, `candidateValidationStatus`, `isCandidateValid`.
- `graph/family/familySnapshotStore.ts`: `getFamilySnapshots` isteğe bağlı 3. argüman `currentFingerprint`; argümansız çağrı aynı; depo değişmez, olay yok.
- `family-tables/components/FamilyResultsViewer.tsx`: graph `useGraphStore`'dan, isteğe bağlı `projectUnits` prop'u, tazelik `useMemo` ile türetilir; localStorage JSON okuması kalktı.
- `app/workspaces/WorkspacePage.tsx`: `projectUnits={project.units}`.
- `family-tables/model/graphFamilyPresentation.ts`: ortak aday yardımcılarını kullanır (davranış aynı).
- `graph/ui/EngineeringNodeInspector.tsx`: Valid sayısı ve Validation özeti adayların kendi durumundan; önizleme istisnası FAMILY bölümünde uyarı; bilinmeyen Invalid `—`.
- `loads/components/wind/WindLoadsPanel.tsx`: STALE iken eski sonuç gizli; Details güncel girdileri ve Status `STALE`.
- Testler: `familySnapshotStore.test.ts`, `familyResults.test.ts`, `FamilyResultsViewer.test.tsx`, `WindLoadsPanel.test.tsx`; yeni `graph/ui/EngineeringNodeInspector.test.tsx`.
- Docs: `docs/architecture.md`, `docs/roadmap.md` ("G2 stale/valid track").

## Test-first kanıtı
T1: derived-STALE testi kırmızı. T3: `candidateValidationStatus`/`isCandidateValid` yok hatası. T2: iki STALE testi kırmızı. T4: 3 test kırmızı (steel Valid, Invalid `—`, preview hata FAILED). T5: 4 yeni/değişen Wind testi kırmızı, diğer 5 yeşil. Her düzeltmeden sonra yeşil.

## Kabul kriterleri
AC1 baseline kayıtlı. AC2 `FamilyResultsViewer.test.tsx` (birim `mm` → STALE, depo VALID kalır, eski birimde VALID). AC3 graph store değişimi STALE, geri alınca VALID. AC4 aynı graph/birimle VALID kalır; saklanan STALE/FAILED asla VALID değil. AC5 `familySnapshotStore.test.ts`. AC6 steel girder Valid 0 / `INCOMPLETE`; rectangular pier `VALID`. AC7 önizleme hatası uyarı + `FAILED`; `errors` → `FAILED`. AC8 Invalid `—`. AC9–AC11 Wind testleri. AC12 yasaklı dosyalarda diff yok (koordinatör teyit etti). AC13 build/test/lint. AC14 dokümanlar güncel. Hepsi karşılandı.

## Sapmalar ve sınırlamalar
- `outputs[node.id]` var ama sayısal `invalidCombinations` yoksa Invalid de `—` gösterir (planda yalnızca output yok durumu vardı).
- Pier-cap/foundation/bearing istatistik önizleme istisnası artık yutulmayıp uyarı olarak görünür.
- Karışık ağırlık önceliği (INVALID/ERROR > INCOMPLETE > diğer) için ayrı test yok; yalnızca hep-VALID ve hep-INCOMPLETE yolları kapsanıyor.
- Mevcut 3 viewer testi graph'ı `importGraphDocuments` ile kurar ve gerçek parmak izi kullanır (planın izin verdiği fixture değişikliği).
- `projectUnits` verilmezse viewer kendi `units` state'ine düşer; tek çağıran prop'u geçer.
- Kapsam dışı, dokunulmadı: H-006-c, canvas footer "valid" sayısı, abutment kabuğu, ölü `CandidateTable`, snapshot yokken Wind "Status: INVALID".
- Graph precast adayları Inspector'da `INCOMPLETE` görünür (A-05 çözülmedi).

## Elle yapılacak kontroller (Chromium)
1. Graph'ta Run → Project'te Length `mm` → Family STALE.
2. İki sekme: B'de graph düzenle → A'da Family STALE.
3. Precast girder Inspector: Valid 0, `INCOMPLETE`.
4. Wind: Calculate → vb değiştir → Summary/Details `—`/STALE → vb geri al → sonuç döner.

## Takip onarımları (P3-1..P3-3, plan dışı, kullanıcı isteğiyle)
`review.md` 1. tur CHANGES_REQUESTED bulgularını kullanıcı açık isteğiyle `refactor-implementer` kapattı (feature planı/state'i dışında, koordinatör doğrulamasıyla):
- **P3-1:** `EngineeringNodeInspector.tsx` `validationClass()`: VALID→`state-success`; FAILED/INVALID/ERROR→`state-error`; diğer→`state-idle` (CSS kuralı yok, nötr). +4 test.
- **P3-2:** `summarizeValidation` `graph/family/familyResults.ts`'e taşındı ve export edildi (gövde birebir, parametre `unknown[]`); +6 birim test.
- **P3-3:** önizleme istisnası testi güçlendirildi: uyarı `.spn-engineering-family` içinde aranır ve aynı girdiyle üretilen gerçek hata mesajıyla tam eşleşir.
Sonuç (koordinatör yeniden çalıştırdı): `npm test` 79 dosya / 584 test geçti, `npm run build` başarılı, değişen dosyalarda lint uyarısı yok.
