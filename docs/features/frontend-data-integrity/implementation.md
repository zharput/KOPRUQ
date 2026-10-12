# Implementation report: frontend-data-integrity

Kaynak: feature-implementer el-teslim raporu. Koordinatör bağımsız doğrulaması: `npm test` 78 dosya / 554 test geçti; `npm run build` başarılı; `git diff` yalnızca `frontend/src` ve `docs` altında; `generation.ts` diff'i boş; `girderCandidates.ts` diff'inde `Iy/Math.max` satırı yok. Review yapılmadı.

**Sonuç: implemented.** T0-T7 ve T9 tamam, AC1-AC12 karşılandı. C-005-01 ve C-016-01 plan gereği ertelendi.

## Baseline (T0, değişiklik öncesi, `frontend/`)
| Komut | Exit | Sonuç |
|---|---|---|
| `npm run build` | 0 | OK (yalnızca chunk-size uyarısı) |
| `npm test` | 0 | 77 dosya, 532 test, hepsi geçti (başarısız küme boş) |
| `npm run lint` | 0 | 82 mevcut oxlint uyarısı, 0 hata |

## Final
| Komut | Exit | Sonuç |
|---|---|---|
| `npm run build` | 0 | OK |
| `npm test` | 0 | 78 dosya, 554 test geçti (+22 test, +1 dosya) |
| `npm run lint` | 0 | dosya başına uyarılar baseline ile aynı |
| `npx tsc -b` | 0 | tip hatası yok |

## Değişen dosyalar
- `shared/project-file/projectFileService.ts`: `snapshotProjectStorage`, `restoreProjectStorage`, `resetProjectStorage`, `ProjectStorageRollbackError`; `applyProjectFile` yardımcıları kullanır, davranış ve "rollback failed" metni aynı.
- `shared/project-file/useProjectFile.ts`: `open` depolama snapshot'ı alır, hatada geri yükler; yeni `detachFile()`.
- `app/App.tsx`: `discardAndContinue` artık `setDirty(false)` çağırmaz; `newProject` `resetProjectStorage()` kullanır, `ProjectStorageRollbackError`'da `detachFile()`.
- `features/project/components/ProjectWorkspace.tsx`: Save yalnızca düzenlenen yolları yazar; yanlış Units notu düzeltildi.
- `features/terrain-dtm/components/TerrainDtmPanel.tsx`: `onImported({terrainId, landXmlImportId|null})`; LandXML yolu `projectId` ve CRS etiketini geçirir.
- `features/bridge-definition/components/BridgeDefinitionWorkspace.tsx`, `app/router.tsx`: güncellenmiş çağıranlar (router ayrıca `projectId` ve CRS etiketi geçirir).
- `features/graph/domain/girderCandidates.ts`: yalnızca `generatePrecastGirderCandidates` + `precastValues` yardımcısı; sonlu olmayan geometri aday düşürür ve sayılır; özellikler sonlu değilse `INCOMPLETE`; cast kaldırıldı; `:17` Wy formülü değişmedi.
- `features/graph/domain/bridgeAssembly.ts`: ERROR/INVALID→INVALID, INCOMPLETE→INCOMPLETE, WARNING yalnızca mesaj; `A2 ?? A1` kaldırıldı; tek abutment bağlıysa eksik taraf adıyla mesaj + INCOMPLETE.
- Testler: `projectFileService.test.ts` (+3), `useProjectFile.test.tsx` (+1), `App.test.tsx` (+3), `TerrainDtmPanel.test.tsx` (+1, bir mevcut beklenti güncellendi), `girderCandidates.test.ts` (+4), `bridgeAssembly.test.ts` (+6); yeni `ProjectWorkspace.test.tsx` (4 test).
- Docs: `docs/architecture.md`, `docs/roadmap.md` (yeni "FRONTEND-DATA-INTEGRITY track"; C-005-01, C-016-01, A-05 açık).

## Test-first kanıtı
Her yeni test düzeltmeden önce çalıştırılıp başarısız oldu (T1: 3, T2: 1, T3: 3, T4: 3/4, T5: 2, T6: 3; T7: eski `bridgeAssembly.ts` ile 5/11 başarısız).

## Kabul kriterleri
AC1 baseline kayıtlı. AC2 `useProjectFile.test.tsx`. AC3 `projectFileService.test.ts` + `App.test.tsx`. AC4 `App.test.tsx` (New Project ve bozuk Open sonrası '*' kalır). AC5 `ProjectWorkspace.test.tsx`. AC6 `TerrainDtmPanel.test.tsx`. AC7 `girderCandidates.test.ts` (pozitiflik/poligon kuralı yok). AC8 `bridgeAssembly.test.ts`. AC9 `generation.ts` diff'i boş, `girderCandidates.ts:17` değişmedi. AC10 build/lint exit 0, uyarılar baseline ile aynı, 554/554. AC11 yalnızca `frontend/src` + `docs`; `package.json`, localStorage anahtarları, `schemaVersion` değişmedi. AC12 iki doküman güncellendi. Hepsi karşılandı.

## Sapmalar
1. Plan "sonlu olmayan geometri → aday düşer, `invalidCombinations`++" diyordu; mevcut `normalizeCandidateInput` NaN/Infinity'de fırlattığı için precast'e özel `precastValues` eklendi. Sonuç: precast'te sonlu olmayan girdi artık fırlatılmaz, aday reddedilir ve sayılır. Steel üreteci ve `normalizeCandidateInput` dokunulmadı. Geçersiz birim ve boş liste hâlâ fırlatır.
2. `router.tsx` `TerrainDtmPanel`'e `projectId` ve CRS etiketi de geçirir (AC6 için gerekli).
3. `ProjectStorageRollbackError` mesajı özgün hata ile rollback hatasını birleştirir.

## Sınırlamalar
- Sonluluk kontrolü sıfır/negatif boyutları yakalamaz (Q3); sonlu özellikli aday VALID kalabilir.
- Graph'ta `tf/bf/w` adlandırmalı precast adayları artık `INCOMPLETE` (A-05 çözülmedi).
- Testler setState ve depolama hatalarını mock'larla taklit eder; gerçek kota hatası denenmedi.
- Açık, kod değişmedi: C-005-01, C-016-01, A-05. Planlanmadı: C-009-01, C-005-04, `abutmentFamilyId` iletilmemesi, superstructure üretecinin girder durumunu okumaması.

## Kullanıcının elle yapacağı kontroller
1. Save sonrası apply sırasında hata veren bir dosya Open; sonra Save → picker açılmalı, '*' kalmalı, graph/aileler Open öncesiyle aynı olmalı.
2. Dirty proje → New Project → DON'T SAVE; DevTools'ta localStorage kota hatası simüle et → ad ve graph kalır, uyarı çıkar, '*' kalır.
3. DTM/Terrain Reference'tan alignment'lı LandXML import: proje id ve CRS etiketiyle başlamalı, `landXmlImportId` projeye yazılmalı; XYZ import onu temizlemeli.
4. Project → Units: Edit Project → Length `mm` → Save ve Cancel; birim kalmalı.
5. Gerçek tarayıcı localStorage kota testi (New Project ve Open).
