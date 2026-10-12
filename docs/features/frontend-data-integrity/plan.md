# Plan: frontend-data-integrity

Durum: READY. Kullanıcı cevapları Q0–Q4 ve D-1 işlendi. C-005-01 ve C-016-01 mühendis kararı beklediği için bu iş kapsamında DEĞİL (ertelendi).

## 0. Kaynak
Bulgu kimlikleri frontend review'ından: `docs/reviews/2026-10-11T14-19-35Z` (kullanıcı teyidi, Q0).
- İstekteki `2026-10-11T19-46-40Z` backend review'ıdır; aynı kimlikler orada başka Java bulgularını gösterir, C-013-02 ve C-016-01 orada yoktur.
- Frontend kanıtları: `report.md:39,70-72,130-131,141,160`; `batches/001.md:34-38`, `005.md:9-26`, `012.md:14-24`, `013.md:17-22`, `016.md:7-16`.
- "Sonraki review C-001-05 ve C-013-02'yi kısmen düzeltilmiş sayıyor" ifadesini destekleyen belge repoda yok; durumlar güncel koddan doğrulandı.

## 1. Amaç ve kapsam dışı
**Amaç:** Kapsamdaki 6 bulguyu (C-013-02, C-001-05, C-012-02, C-012-03, C-005-02, C-005-03) en küçük düzeltmeyle, davranış korumasıyla ve önce kırmızı testle düzeltmek.

**Ertelenen (mühendis kararı, kod değişmez):**
- C-005-01: precast `Wy` formülü (`girderCandidates.ts:17`).
- C-016-01: tarama yuvarlaması/yineleme (`shared/ui/generation.ts`).

**Kapsam dışı:**
- Backend, REST sözleşmesi, yeni npm bağımlılığı, yeni endpoint.
- Yeni mühendislik formülü, sabit, sınır, yuvarlama politikası veya geometri kuralı (pozitiflik, poligon tutarlılığı).
- İşaretli ama planlanmayan ilişkili bulgular: A-05 (Graph precast `tf/bf/w` ↔ `Btf/Bbf/tw`, kesit özellikleri NaN; `nodeRegistry.ts:73,76,320`, `girderCandidates.ts:11`; takma ad eşlemesi EKLENMEYECEK, D-1); C-009-01 (inspect sonrası CRS etiketi ezilir, `LandXmlImportPanel.tsx:34`); C-005-04 (`abutmentCandidates.ts:47`); Assembly'ye `abutmentFamilyId` iletilmemesi (`nodeRegistry.ts:237-245`); superstructure üretecinin girder durumunu okumaması (`superstructureCandidates.ts:6`); remediation kalanları P2-2, H2, C-014-01.
- Stil, ölü kod, `strict` modu, katman taşımaları (A-08).

## 2. Mevcut durum ve bulgu doğrulaması (güncel `frontend/src`)
| ID | Sonuç | Kök neden ve kanıt |
|---|---|---|
| C-013-02 | Kısmen düzeltilmiş | Düzeltilenler: `projectFileService.ts:22` `modules ?? {}`, `:24-29` modül doğrulaması, `useProjectFile.ts:17` catch'te `setRef(undefined)`+`setDirty(true)`; test `useProjectFile.test.tsx:28-48`. Kalan: `applyProjectFile` başarılı olduktan sonra bir adım (`clearFamilySnapshots`, `setProjectState`, `setBridgeDefinitions`, `setWindLoads`, `rememberRecentProject`) başarısız olursa depolama geri alınmıyor; `applyProjectFile` rollback'i (`projectFileService.ts:78-85`) yalnızca kendi adımlarını kapsıyor. Graph/aileler/modüller yeni dosyadan, React state eski projeden kalır; sonraki Save karışık durumu yazar. |
| C-001-05 | Güncel | `App.tsx:78` `discardAndContinue` eylemden önce `file.setDirty(false)`. `App.tsx:84-90` New Project sıfırlamasında rollback yok, catch yalnızca `alert`. `projectModules.ts:66-71` `reset()` hataları yutuyor. Aynı kök neden Don't Save sonrası okuma hatasıyla biten Open'da da var (`useProjectFile.ts:17`). |
| C-005-01 | Güncel, ertelendi | `girderCandidates.ts:17` `Iy/Math.max(Btf,Bbf)/2`; steel `:23` `Iy/(Math.max(Btf,Bbf)/2)`. |
| C-005-02 | Güncel | `girderCandidates.ts:26`: doğrulama yok; `validationStatus:'VALID'`, `invalidCombinations:0` sabit; `as unknown as GirderCandidate`. Graph yolunda özellikler NaN iken aday VALID (A-05). |
| C-005-03 | Güncel | `bridgeAssembly.ts:22` yalnızca superstructure durumunu okuyor; `:34` `abutmentA2 ?? abutmentA1` sessiz varsayılan; `:36` durum yalnızca `messages.length`, `'INVALID'` hiç üretilmiyor. Abutment `ERROR`/`WARNING` üretebiliyor (`abutmentCandidates.ts:5,65-67`); registry ilk adayı seçiyor (`nodeRegistry.ts:234,243-244`); `AssemblyInspector.tsx:13` `INVALID`'i zaten hata gösteriyor. |
| C-012-02 | Güncel | `ProjectWorkspace.tsx:63` birim seçimi doğrudan `setProject`; `:56-57` Save, düzenleme başında alınan `draft` snapshot'ını yazıyor → birim ve `environment` değişiklikleri geri dönüyor; `:99` metni yanlış; bileşenin testi yok. |
| C-012-03 | Güncel | `TerrainDtmPanel.tsx:67` `projectId`/`coordinateSystemLabel` geçirmiyor; `LandXmlImportPanel.tsx:11,50` varsayılanlar. `onImported` yalnızca `terrainId` (`TerrainDtmPanel.tsx:44`). Çağıranlar `setLandXmlImportId(null)` (`BridgeDefinitionWorkspace.tsx:126`, `router.tsx:146-151`). Doğru desen alignment yolunda: `BridgeDefinitionWorkspace.tsx:121`. |
| C-016-01 | Güncel, ertelendi | `generation.ts:4,7`. |

Araç zinciri: `frontend/package.json`: build=`tsc -b && vite build`, test=`vitest run`, lint=`oxlint`. CI yok.

## 3. Tasarım

### 3.1 Proje depolama snapshot/restore (C-013-02, C-001-05)
`projectFileService.ts`:
- `snapshotProjectStorage()` / `restoreProjectStorage(s)`: graph, 5 aile kategorisi, modül depolaması. `applyProjectFile:68,79-82`'deki satır içi kod dışarı çıkarılır; `applyProjectFile` bunları kullanır, davranış ve "Project import failed and rollback failed: …" metni aynı kalır.
- `ProjectStorageRollbackError extends Error`.
- `resetProjectStorage()`: sıra ve hata metinleri `App.tsx:85-88` ile aynı; modül reset sonrası `localStorage.getItem(key) == null` kontrolü (girderLibrary hariç); adım başarısızsa snapshot geri yüklenir, geri yükleme de başarısızsa `ProjectStorageRollbackError`.

`useProjectFile.ts`:
- `open`: `readProjectFile` başarılı olunca depolama snapshot'ı ve önceki `projectState`/`bridgeDefinitions`/`windLoads` alınır; catch'te depolama geri yüklenir, React state en iyi çabayla (try içinde) geri alınır, mevcut `setRef(undefined)`, `setDirty(true)`, `changeVersion++` korunur; geri yükleme de başarısızsa mesaj bunu belirtir.
- Yeni `detachFile()`: ref'i temizler, `dirty=true`, `changeVersion++`.

`App.tsx`:
- `discardAndContinue` artık `setDirty(false)` çağırmaz (başarılı eylemler `open`, `resetForNewProject`, `closeSession` dirty'yi kendileri temizler).
- `newProject`: `resetProjectStorage()` hata atarsa `ProjectStorageRollbackError` ise `file.detachFile()`, uyarı göster, dur; başarılıysa mevcut sıra.

### 3.2 ProjectWorkspace Save (C-012-02)
`update(field)` düzenlenen yolu bir kümeye ekler; `save` yalnızca bu yolları güncel `project` üzerine `writePath` ile yazar ve `lastModified`'ı günceller; `startEdit` ve Cancel kümeyi temizler. `:99` metni: "Unit selections are applied immediately and are not part of Edit Project / Save / Cancel."

### 3.3 DTM → LandXML (C-012-03)
- `TerrainDtmPanel.onImported`: `{ terrainId: string; landXmlImportId: string | null }`. XYZ yolu `landXmlImportId:null`. LandXML yolu `projectId` ve panelin `coordinateSystemLabel` state'ini `LandXmlImportPanel`'e geçirir; `landXmlImportId: value.hasAlignment ? value.landXmlImportId : null`.
- Çağıranlar güncellenir: `BridgeDefinitionWorkspace.tsx:126`, `router.tsx:146-151` (router'da `project` prop'u `:58`'de mevcut).

### 3.4 Precast aday doğrulaması (C-005-02, yalnızca sonluluk)
- Mevcut geometri değerlerinden biri `Number.isFinite` değilse aday düşer, `invalidCombinations++`.
- Pozitiflik veya poligon tutarlılığı kuralı EKLENMEZ (Q3).
- Hesaplanan `A, Ix, Iy, Wx, Wy`'den biri sonlu değilse `'INCOMPLETE'`, hepsi sonluysa `'VALID'`.
- `as unknown as` cast'i kaldırılır. Formüller değişmez; A-05 takma adı eklenmez.
- Beklenen yan etki: Graph adlandırmasıyla gelen precast adayları `INCOMPLETE` görünür.

### 3.5 Assembly durumu (C-005-03)
| Bileşen durumu | Assembly |
|---|---|
| Abutment `ERROR` veya superstructure `INVALID` | `INVALID` |
| Bileşen `INCOMPLETE` | `INCOMPLETE` |
| Abutment `WARNING` | durum değişmez (VALID), yalnızca mesaj |

Öncelik `INVALID > INCOMPLETE > VALID`; mesajlar `A1`/`A2` önekli ve benzersiz. `abutmentA2 ?? abutmentA1` kaldırılır (Q4): yalnızca biri bağlıysa diğer destekte `abutment` undefined, durum `INCOMPLETE`, eksik olanı adıyla belirten mesaj; hiçbiri bağlı değilse bugünkü davranış.

Uyumluluk: kalıcı biçim, localStorage anahtarları, `schemaVersion`, `BridgeAssembly` tipi değişmez. `TerrainDtmPanel.onImported` imzası değişir, iki çağıran güncellenir.

## 4. Alternatifler
- C-013-02 yalnızca ref temizleme: karışık depolama kalır; rollback deseni genişletildi.
- C-001-05 hatada yalnızca `setDirty(true)`: silinen veriyi geri getirmez; reddedildi.
- C-012-02 yalnızca `units` korumak: diğer eşzamanlı değişiklikleri ezer; düzenlenen-yol kümesi seçildi.
- C-005-02 A-05 takma adı ve pozitiflik kuralları: kullanıcı reddetti (D-1, Q3).
- C-005-03 WARNING→INCOMPLETE: mühendislik değerlendirmesi gerektirir; yalnızca görünürlük.

## 5. Sıralı görevler
Her görevde önce test yazılır ve kırmızı olduğu gösterilir, sonra düzeltme. Komutlar `frontend/` içinde.

- **T0 Baseline (kod yok):** `npm run build`, `npm test`, `npm run lint`; çıkış kodları ve başarısız test adları kaydedilir. Kullanıcı testlerin yeşil olduğunu bildirdi (doğrulanmadı). `node_modules` yoksa dur, sessiz kurulum yapma.
- **T1 Depolama yardımcıları:** `shared/project-file/projectFileService.ts`, `projectFileService.test.ts`. Testler: `pier-cap` anahtarında `setItem` hatasında `resetProjectStorage` hata atar, graph 'Before', PIER kayıtları ve `kopruq.seismic` eski değere döner; modül reset'i sessizce başarısız olursa hata atılır ve geri alınır; mevcut `:63-69` testi yeşil. Bağ: T0.
- **T2 C-013-02:** `useProjectFile.ts`, `useProjectFile.test.tsx`. Testler: apply sonrası `setProjectState` hata atarsa graph/PIER/seismic açma öncesine döner, `ref` undefined, dirty true; sonraki Save açma öncesi graph'ı yazar; mevcut `:28-58` yeşil. Bağ: T1.
- **T3 C-001-05:** `app/App.tsx`, `useProjectFile.ts` (`detachFile`), `app/App.test.tsx`. Testler: Dirty → New Project → DON'T SAVE, `pier-cap` yazımı hata atıyor → uyarı, ad 'Dirty Project' kalır, File düğmesinde '*', graph korunur; DON'T SAVE + bozuk dosya Open sonrası '*' kalır; rollback hatasında sonraki Save picker açar; mevcut `:249-255`, `:363-373` yeşil. Bağ: T1, T2.
- **T4 C-012-02:** `project/components/ProjectWorkspace.tsx`, yeni `ProjectWorkspace.test.tsx`. Testler: Edit → Length `mm` → Save → `'mm'`; Cancel birimi geri almaz; düzenleme sırasında dışarıdan değişen `environment.terrainDatasetId` Save'de korunur; yanlış metin yok. Bağ: T0.
- **T5 C-012-03:** `TerrainDtmPanel.tsx`, `TerrainDtmPanel.test.tsx`, `BridgeDefinitionWorkspace.tsx`, `app/router.tsx`. Testler (`LandXmlImportPanel` `vi.mock`): prop'lar `projectId='P-1'` ve CRS etiketiyle geçer; `hasAlignment:true`→`'lx1'`, `false`→`null`; XYZ testi `{terrainId:'terrain-1', landXmlImportId:null}` bekler. Bağ: T0.
- **T6 C-005-02:** `graph/domain/girderCandidates.ts` (yalnızca `:26` ve tip/cast; `:17` DEĞİŞMEZ), `girderCandidates.test.ts`. Testler: NaN geometri → aday yok, `invalidCombinations===1`; Infinity aynı; Graph adlandırması sonlu değerlerle → `INCOMPLETE`; kanonik `{H,Btf,Bbf,tw,…}` → `VALID`, özellikler bugünküyle aynı; mevcut `:5-6` yeşil; sıfır/negatif boyut için ret beklentisi YAZILMAZ. Bağ: T0.
- **T7 C-005-03:** `graph/domain/bridgeAssembly.ts`, `bridgeAssembly.test.ts`. Testler: A1 `ERROR`→`INVALID` ve 'A1' mesajı; `WARNING`→VALID+mesaj; yalnızca A1 bağlı→A2 undefined, `INCOMPLETE`, A2 mesajı; yalnızca A2 bağlı simetrik; hiçbiri bağlı değil→bugünkü sonuç; mevcut `:7-37` yeşil. Bağ: T0.
- **T9 Dokümantasyon:** `docs/architecture.md`, `docs/roadmap.md`: atomik New/Open, ProjectWorkspace Save, DTM'den LandXML, precast sonluluk doğrulaması, assembly durum yayılımı ve A2 kuralı; açık/mühendis kararı bekleyen C-005-01, C-016-01, A-05 listelenir.

(T8 kapsam dışı bırakıldığı için yoktur.)

## 6. Kabul kriterleri
- **AC1** T0 baseline kayıtlı.
- **AC2** Open'da apply sonrası adım başarısız olursa depolama açma öncesine döner, `ref` boşalır, dirty true; sonraki Save karışık veri yazmaz.
- **AC3** New Project sıfırlaması başarısız olursa graph/aileler/modüller geri yüklenir, kullanıcı uyarılır, proje state'i değişmez; rollback de başarısızsa dosya referansı bırakılır ve proje dirty olur.
- **AC4** DON'T SAVE sonrası eylem başarısız olursa proje temiz görünmez.
- **AC5** Edit modunda yapılan birim değişikliği Save/Cancel sonrası korunur; dışarıdan değişen alanlar Save'de geri alınmaz; yanlış metin kaldırılmış.
- **AC6** DTM'den LandXML importu projenin `projectId`'si ve CRS etiketiyle başlar; alignment seçildiyse `landXmlImportId` projeye yazılır, aksi halde null.
- **AC7** Precast üreteci NaN/Infinity geometriyi reddedip `invalidCombinations`'ta sayar; kesit özellikleri sonlu olmayan aday `INCOMPLETE`, diğerleri `VALID`; pozitiflik/poligon kuralı eklenmemiş.
- **AC8** Assembly `ERROR`→`INVALID`, `INCOMPLETE`→`INCOMPLETE` yayar; `WARNING` mesajı görünür; A2, A1'den kopyalanmaz (tek abutment bağlıysa `INCOMPLETE` + eksik olanı belirten mesaj; hiçbiri bağlı değilse bugünkü davranış).
- **AC9** C-005-01 ve C-016-01 ertelendi: `frontend/src/shared/ui/generation.ts` diff'i boş; `girderCandidates.ts:17` (Wy formülü) değişmemiş; dokümanda açık olarak listeli.
- **AC10** `npm run build` ve `npm run lint` exit 0, değişen dosyalarda yeni oxlint uyarısı yok; `npm test`: yeni testler yeşil, başarısız küme T0 kümesinin alt kümesi.
- **AC11** Backend, `package.json`, REST çağrıları, localStorage anahtarları ve `schemaVersion` değişmemiş; yeni mühendislik değeri/kuralı yok.
- **AC12** `docs/architecture.md` ve `docs/roadmap.md` güncel.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | T0 komutları | çıktılar kayıtlı |
| AC2 | `npm test -- src/shared/project-file` | yeşil |
| AC3, AC4 | `npm test -- src/shared/project-file src/app/App.test.tsx` | yeşil |
| AC5 | `npm test -- src/features/project` | yeşil |
| AC6 | `npm test -- src/features/terrain-dtm` | yeşil |
| AC7 | `npm test -- src/features/graph/domain/girderCandidates.test.ts` | yeşil |
| AC8 | `npm test -- src/features/graph/domain/bridgeAssembly.test.ts` | yeşil |
| AC9 | `git diff -- frontend/src/shared/ui/generation.ts` boş; `girderCandidates.ts` diff'inde `:17` yok | değişiklik yok |
| AC10 | `npm run build`; `npm test`; `npm run lint` | exit 0 / alt küme / exit 0 |
| AC11 | `git diff --stat` | yalnızca `frontend/src` ve `docs` |
| AC12 | doküman diff incelemesi | bölümler mevcut |

Windows PowerShell'de `npm.cmd` gerekebilir; `npm test` zaten `vitest run` çalıştırır. Bilinmeyenler: CI yok; Chromium'da elle doğrulanacaklar: Open hatası → Save, DTM'den alignment'lı LandXML importu, gerçek localStorage kota hatası.

## 8. Riskler
- **Veri:** T2/T3 hata yollarını değiştirir; rollback testleri yazılmadan uygulanmaz. Geri yükleme de başarısızsa dosya referansı bırakılır, mevcut dosyanın üzerine yazılmaz.
- **Görünür davranış değişiklikleri:** DON'T SAVE sonrası başarısız eylemde proje dirty kalır; Graph precast adayları `INCOMPLETE` görünür (A-05 çözülmüyor); tek abutment bağlı veya abutment'ı ERROR olan assembly'ler artık VALID değil. Bunlar AGENTS.md:1274'teki korunan "Graph validity / candidate generation" sözleşmesine dokunur; plan onayı bunu açıkça kapsar.
- **Kapsam bilinci:** Sonluluk kontrolü sıfır/negatif boyutları yakalamaz (Q3 gereği); özellikler sonluysa aday VALID kalabilir, dokümanda belirtilecek.
- **Mühendislik güvenliği:** hiçbir formül, sabit veya yuvarlama değişmez.
- **Geri alma:** her görev kendi dosya kümesiyle geri alınabilir; uygulayıcı git işlemi yapmaz.

## 9. Varsayımlar ve kararlar
- React `setState` hata atması nadir; testler yolu taklitle kanıtlar. `rememberRecentProject` iç hataları yakalar (`recentProjects.ts:13`).
- Test baseline'ının yeşil olduğu kullanıcı beyanıdır.
- Kararlar: Q0 frontend review; Q1/Q2 ertelendi; Q3 yalnızca sonluluk; Q4 A2 fallback kaldırılır; D-1 A-05 takma adı eklenmez.
- Açık (mühendis kararı): C-005-01 (Wy formülü, kaynak ve birimli referans örnek gerekli), C-016-01 (yuvarlama ızgarası, çözünürlük, yineleme politikası), A-05, C-009-01.

READY
