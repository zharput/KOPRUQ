# Plan: g2 (G2 grubu: "bayat sonuç geçerli görünüyor" — C-006-04, C-007-04, C-010-04)

Durum: READY (§9'daki varsayılan kararlarla; hiçbiri mühendislik kararı değil, hepsi geri alınabilir sunum kararı).

Kaynak: frontend review `docs/reviews/2026-10-11T14-19-35Z` (`report.md:80,89,114`; `batches/006.md:28-37`, `007.md:27-31`, `010.md:28-32`; `code-quality.md:16,52,54`). `19-46-40Z` backend review'ıdır, bu planla ilgisi yok.

## 1. Amaç ve kapsam dışı
**Amaç:** Üç bulgunun güncel koddaki kalan kısmını en küçük frontend değişikliğiyle kapatmak. Ekrandaki sonuç ekrandaki güncel girdilere ait olmalı; değilse açıkça STALE/FAILED/INCOMPLETE görünmeli, "VALID" gibi sunulmamalı.
- **C-006-04:** Family ekranı tazeliği okuma anında, güncel graph ve proje birimlerine göre yeniden hesaplanır; Graph ekranı mount edilmemiş olsa da doğru olur.
- **C-007-04:** Inspector FAMILY bölümünde "Valid" sayısı ve "Validation" özeti adayların kendi `validationStatus` değerinden türetilir. Önizleme hatası yutulmaz. Bilinmeyen "Invalid" sayısı `0` gösterilmez.
- **C-010-04:** Wind STALE iken eski sonuç (Summary, Details sonuçları, eski INVALID uyarısı) yeni girdilerin altında gösterilmez. Details güncel girdileri gösterir. Snapshot silinmez; girdiler snapshot'a dönerse sonuç yeniden görünür.

**Kapsam dışı (kesin):** backend, REST, yeni npm bağımlılığı, `package.json`, yeni localStorage anahtarı, `schemaVersion`. Yeni mühendislik formülü, sabit, sınır veya geçerlilik kriteri yok (`drefM: 3` dahil). Aday üreticileri değişmez (`girderCandidates.ts`, `superstructureCandidates.ts`, `nodeRegistry.ts`, `bridgeAssembly.ts`, `abutmentCandidates.ts`); `graphRunValidity.ts` değişmez; `frontend-data-integrity` geçerlilik yayılımı yeniden yapılmaz.

**İşaretli ama planlanmayan:** H-006-c (`family-tables/components/FamilyWorkspaceShell.tsx:9` rozet `getActiveGraph()` ile hesaplanıyor); canvas footer aynı kök neden (`graph/ui/EngineeringNodeShell.tsx:36` "valid" sayısı `validationStatus` okumuyor; abutment kabuğu `:75-79` C-008-01 kalıntısı); ölü kod `EngineeringNodeInspector.tsx:124-144` `CandidateTable`; A-05; C-007-05; C-007-07 (`graphStore.ts:64-75`); `FamilyTablesWorkspace.tsx` ölü ekran; Wind snapshot yokken Details "Status: INVALID" (`WindLoadsPanel.tsx:11`).

## 2. Mevcut durum ve yeniden doğrulama

### 2.1 C-006-04: KISMEN DÜZELTİLMİŞ
Düzeltilenler: (a) Open/New snapshot'ları temizliyor (`shared/project-file/useProjectFile.ts:17,18`); (b) rozet var (`FamilyResultsViewer.tsx:29`, STALE/FAILED/INCOMPLETE için "Results are not current"); (c) Run sırasında değişiklik varsa snapshot STALE yayınlanıyor (`graph/ui/GraphWorkspace.tsx:93-96`); (d) publish graph'ın eski snapshot'larını siliyor (`graph/family/familySnapshotStore.ts:7-12`).

Kalan kök neden: Tazelik yalnızca yayın anında saklanan `freshness` alanı; onu yalnızca `markFamilySnapshotsStale` (`familySnapshotStore.ts:17-21`) değiştiriyor, o da yalnızca `GraphWorkspace`'ten çağrılıyor (`GraphWorkspace.tsx:50,99`). Graph ve Family ekranları birbirini dışlıyor (`app/workspaces/WorkspacePage.tsx:18,21`), bu yüzden Graph mount değilken yapılan değişiklikler (Project ekranında birim değişimi `app/App.tsx:53`, başka sekmede graph değişimi) snapshot'ı STALE yapmıyor. `FamilyResultsViewer.tsx:21` yalnızca saklanan snapshot'ı okuyor; `:22` birim olayı yalnızca görüntü birimini güncelliyor, tazeliği yeniden hesaplamıyor. Viewer graph'ı localStorage JSON'undan okuyor (`:21,:25`); parmak izi ise bellekteki graph store ve App `project.units`'ten üretiliyor (`GraphWorkspace.tsx:50,89,94`). Snapshot `graphFingerprint` alanını zaten taşıyor (`graph/family/familyResults.ts:29,52-54`).

### 2.2 C-007-04: KISMEN DÜZELTİLMİŞ
Düzeltilen: Graph dirty iken Run çıktısı Inspector'a gelmiyor (`graph/ui/executionDisplay.ts:11-13`, `GraphWorkspace.tsx:52,137`).
Güncel olanlar: `EngineeringNodeInspector.tsx:65` "Valid" = `candidates.length`, "Validation" = aday varsa `'VALID'`; aday durumu okunmuyor, oysa adaylar `INCOMPLETE` olabilir (`graph/domain/girderCandidates.ts:25` steel yoğunluk yoksa; `:28` precast özellikler sonlu değilse; Graph precast önizlemesi `tf/bf/w` geçtiği için `nodeRegistry.ts:320-325` hepsi INCOMPLETE ama Inspector "Valid N / VALID" diyor). `:32` önizleme istisnası yutuluyor. `:39-40` `invalidCombinations` `outputs[node.id]?.invalidCombinations ?? 0`; dirty/çalıştırılmamış graph'ta bilinmiyor ama `0` gösteriliyor; `:40` istatistik hatasını yutuyor. Emsal kural: `family-tables/model/graphFamilyPresentation.ts:91-92` (`validationOf` = `validationStatus ?? validation.status`, `isValid` = `'VALID'` ya da durum yok; `familyGroups :34-35` kullanıyor); Inspector'da kopya kural yok.

### 2.3 C-010-04: KISMEN DÜZELTİLMİŞ
Düzeltilenler: snapshot gerçek girdileri taşıyor (`loads/components/wind/WindLoadsPanel.tsx:20,23`; tip `shared/project-file/projectFileTypes.ts:8`); STALE tespiti `:26` (deck genişliği dahil, `LoadsPanel.tsx:56`); INVALID gösterimi `:27-28`; HTTP hatası `:24`.
Güncel olanlar: `WindLoadsPanel.tsx:28` STALE iken de `<Summary result={shown}/>` eski `transverseKNm`'yi gösteriyor; `!valid` uyarısı eski INVALID mesajını yeni girdilerin altında gösteriyor; Details eski girdileri (`snapshot.inputs.*`) ve eski sonuçları gösteriyor; "The values below are from the previous calculation." eki STALE iken de çıkıyor. Bu davranış belgelenmiş ve testle sabitlenmiş (`docs/architecture.md:3065`, `WindLoadsPanel.test.tsx:44-49`); kullanıcının yeni gözlemi bunu reddediyor, yani değişen gereksinim — doküman T6'da güncellenir.

Araç zinciri: `build` = `tsc -b && vite build`, `test` = `vitest run`, `lint` = `oxlint`; CI yok. Son kayıt 78 dosya/554 test yeşil (doğrulanmadı; geçerli olan T0 çıktısı).

## 3. Tasarım

### 3.1 C-006-04: okuma anında tazelik
- `graph/family/familyResults.ts`: saf `currentFreshness(snapshot, currentFingerprint: string | undefined): SnapshotFreshness`. Saklanan `STALE`/`FAILED` aynen kalır (monoton, muhafazakâr; asla VALID'e yükseltilmez). Diğer durumlarda `snapshot.graphFingerprint !== currentFingerprint` (veya undefined) ise `'STALE'`, değilse saklanan değer.
- `graph/family/familySnapshotStore.ts`: `getFamilySnapshots(bridgeId, graphDocumentId, currentFingerprint?)`. Üçüncü argüman verilirse türetilmiş tazelikle kopyalar döner; depo mutasyona uğramaz, olay yayılmaz. Argümansız çağrı birebir aynı; mevcut çağıranlar ve testler değişmez.
- `family-tables/components/FamilyResultsViewer.tsx`: graph kaynağı bellekteki graph store (`useGraphStore()`, `graphs.find(g => g.bridgeId === bridgeId)`); `refresh` (`:21`) ve `nodeParameters` (`:25`) aynı graph'ı kullanır, localStorage JSON okuması kalkar. İsteğe bağlı prop `projectUnits?: ProjectUnits`; parmak izi `graphFingerprint(bridgeGraph, projectUnits ?? units)` ile `useMemo`'da hesaplanır. Görüntü birimleri (`units` state) değişmez. Tazelik render içinde türetilir.
- `app/workspaces/WorkspacePage.tsx:21`: `<FamilyResultsViewer bridges={bridges} projectUnits={project.units} />` (Graph `project.units` ile parmak izi üretiyor; `readProjectState` kullanılırsa varsayılan birleştirme yüzünden yanlış STALE oluşabilir).
- Korunanlar: `GraphWorkspace.tsx:50,99` depo düzeyinde işaretleme; snapshot şekli; adaylar STALE iken de listelenir (rozet ve not ile; D-1).

### 3.2 C-007-04: Inspector aday durumu
- `familyResults.ts`: `candidateValidationStatus(data: unknown)` (`validationStatus ?? validation.status`) ve `isCandidateValid(data)` (`'VALID'` ya da durum yok) — `graphFamilyPresentation.ts:91-92` kuralının aynen taşınması; `graphFamilyPresentation.ts` bunları import eder (davranış aynı). Yeni geçerlilik kriteri yok.
- `graph/ui/EngineeringNodeInspector.tsx`: `:32` catch mesajı `previewError` olarak yakalar; fallback aynen `outputs[node.id]?.candidates` (yalnızca dirty olmayan güncel Run'dan). `:34-40` `outputs[node.id]` yoksa `stats = undefined`; "Invalid" `—` gösterir (pier-cap, foundation, bearing önizleme istatistikleri aynen). Hata durumunda mesaj FAMILY bölümünde görünür. `:65`: "Valid" = `candidates.filter(isCandidateValid).length`; "Validation" sırası: (1) `errors[node.id]` varsa `FAILED`; (2) `previewError` var ve aday yoksa `FAILED`+mesaj; (3) aday yoksa `NO VALID CANDIDATES`; (4) tüm adaylar geçerliyse `VALID`; (5) aksi halde geçerli olmayanların en ağır durumu, adayın kendi durum metniyle (`INVALID`/`ERROR` > `INCOMPLETE` > diğer; D-2).
- Korunanlar: önizleme/aday üretimi, şematik, parametre denetimleri, AbutmentInspector, `NodeInspector.tsx` yönlendirmesi, Node SUCCESS/DIRTY mantığı.

### 3.3 C-010-04: Wind bayat sonucu gizleme
`loads/components/wind/WindLoadsPanel.tsx`: `current = snapshot !== null && !stale`; `shown = current && valid ? result : null`. `!valid` uyarısı yalnızca `current` iken; STALE notu aynen. `Summary` STALE iken `result=null` (değerler `—`). Details her zaman güncel girdileri gösterir (`vb, terrain, ze, deckWidthM, WIND_DREF_M`); sonuç satırları yalnızca `shown`; Status STALE iken `'STALE'`, değilse `result?.status`; snapshot yokken bugünkü davranış; `missing` yalnızca `current` iken. Hata ekindeki "previous calculation" metni yalnızca `current` iken.
Korunanlar: `onSnapshot` yalnızca Calculate'te (düzenleme snapshot'ı silmez/değiştirmez); istek gövdesi; `WIND_DREF_M = 3`; `CATEGORIES`; EN 1991-1-4 metinleri; `modules.windLoads` dosya şekli.

Uyumluluk: kalıcı biçim, anahtarlar, `schemaVersion`, REST aynı. `getFamilySnapshots` imzası geriye uyumlu genişler; `FamilyResultsViewer`'a isteğe bağlı prop eklenir.

## 4. Alternatifler
- Birim/graph olaylarında `markFamilySnapshotsStale`'i App/store düzeyinde çağırmak: her değişiklik yolunu bağlamak gerekir, biri unutulursa hata döner; okuma anında karşılaştırma tek noktada ve saf → seçildi.
- Viewer'da localStorage graph JSON'u ile parmak izi: JSON round-trip'te `undefined` parametreler düşer, yanlış STALE → graph store seçildi.
- Inspector'a `isDirty` geçirip fallback'i kaldırmak: önizlemenin desteklemediği güncel Run adaylarını gizleyebilir → reddedildi.
- Yeni "PARTIAL" durum etiketi: yeni sözcük icat eder → adayın kendi durumu öncelikli.
- Wind'de eski sonucu "Previous calculation" bloğunda göstermek: kullanıcı gözlemiyle ve Graph emsali/Seismic-Temperature kuralıyla (`architecture.md:3066`) çelişir → gizleme seçildi; snapshot korunur.

## 5. Sıralı görevler
Komutlar `frontend/` içinde (PowerShell'de `npm.cmd`); her görevde önce test yazılır ve düzeltmeden önce kırmızı olduğu kaydedilir; `node_modules` yoksa durulur.

- **T0 Baseline (kod yok):** build/test/lint; çıkış kodları, test dosya/test sayıları, başarısız test adları, dosya bazında oxlint uyarıları raporlanır.
- **T1 Tazelik türetimi:** `familyResults.ts` (`currentFreshness`), `familySnapshotStore.ts` (3. argüman). Testler `familySnapshotStore.test.ts`: (i) eşleşen parmak izi VALID; (ii) farklı parmak izi STALE, depodaki kayıt VALID kalır, olay yayılmaz; (iii) saklanan STALE/FAILED parmak izi eşleşse de aynı; (iv) argümansız çağrı bugünkü sonuç. Bağ: T0.
- **T2 Family viewer:** `FamilyResultsViewer.tsx`, `WorkspacePage.tsx`, `FamilyResultsViewer.test.tsx`. Fixture: graph `importGraphDocuments(...)` ile kurulur (graph store modül önbelleği nedeniyle); snapshot `graphFingerprint` gerçek `graphFingerprint(graph, INITIAL_PROJECT.units)`, `projectUnits={INITIAL_PROJECT.units}`; mevcut 3 test yeşil kalır. Yeni testler: (a) VALID snapshot + aynı birim → VALID, "not current" yok; (b) `projectUnits` length `mm` ile rerender → GraphWorkspace mount edilmeden ve `markFamilySnapshotsStale` çağrılmadan STALE + "not current"; (c) `act(() => importGraphDocuments(değişmiş parametre))` → STALE; (d) değişikliği geri alma → yeniden VALID. Bağ: T1.
- **T3 Ortak aday yardımcıları:** `familyResults.ts` (`candidateValidationStatus`, `isCandidateValid`), `graphFamilyPresentation.ts` bunları kullanır. Test `familyResults.test.ts`: `{validationStatus:'INCOMPLETE'}`→false; `{}`→true; `{validation:{status:'VALID'}}`→true; mevcut `graphFamilyPresentation.test.ts` yeşil. Bağ: T0.
- **T4 Inspector:** `EngineeringNodeInspector.tsx`, yeni `EngineeringNodeInspector.test.tsx` (`NodeInspector` üzerinden; `NodeInspector.test.tsx:10` `node()` deseni). Testler: (a) `structural.girder.steel` varsayılan/yerel malzeme → adaylar INCOMPLETE; "Valid" 0, Validation `INCOMPLETE`, `VALID` metni yok; (b) `substructure.pier.rectangular` varsayılan → Valid = Candidate Count, `VALID` (korunan); (c) `outputs={}` girder → "Invalid" `—`; (d) önizlemeyi fırlatan girdi (ör. `previewInputs={{H:{sourceName:'X',value:[]}}}`; uygulayıcı fırlattığını doğrulamalı, gerekirse başka deterministik fırlatan girdi seçmeli) → mesaj görünür, Validation `FAILED`; (e) `errors` varsa `FAILED` (korunan). Bağ: T3.
- **T5 Wind:** `WindLoadsPanel.tsx`, `WindLoadsPanel.test.tsx`. `:44-49` testi yeni sözleşmeyle değişir: STALE iken Details `99 m/s` gösterir, `27 m/s` yok; qp/kr/cfx `—`; Status `STALE`. Yeni testler: STALE iken Summary'de `12.300 kN/m` yok; önceki INVALID sonucu STALE olunca "Wind result is INVALID" uyarısı yok; vb snapshot değerine (`27`) dönünce `12.300 kN/m` yeniden görünür ve `onSnapshot` düzenleme sırasında çağrılmaz; STALE + HTTP hatası → "previous calculation" eki yok. Diğer 5 test yeşil kalır. Bağ: T0.
- **T6 Doküman:** `docs/architecture.md` (`:3065` Wind maddesi, `:3072` Family maddesi güncellenir; Inspector aday durumu kuralı için yeni madde), `docs/roadmap.md` ("G2 stale/valid track" + işaretli kapsam dışılar). Bağ: T2, T4, T5.
- **T7 Final:** T0 komutları yeniden; baseline ile final tablo.

T1→T2 ve T3→T4 sıralı; T5 bağımsız.

## 6. Kabul kriterleri
- **AC1** T0 baseline kayıtlı (kodlar, sayılar, başarısız test adları, dosya bazında lint).
- **AC2** Family'de VALID snapshot, Graph ekranı mount edilmeden proje uzunluk birimi değişince STALE rozeti ve "Results are not current" notuyla gösterilir.
- **AC3** VALID snapshot, graph store'da parametre/bağlantı değişince (Graph ekranı olmadan) STALE; graph eski haline dönerse VALID.
- **AC4** Run'ın yayınladığı parmak iziyle aynı graph ve aynı App birimlerinde rozet VALID kalır (yanlış STALE yok); saklanan STALE/FAILED asla VALID gösterilmez.
- **AC5** `getFamilySnapshots` argümansız çağrıda bugünkü sonucu verir; türetme depoyu değiştirmez, olay yaymaz.
- **AC6** Inspector "Valid" yalnızca `validationStatus` (veya `validation.status`) `VALID` olan ya da durumu olmayan adayları sayar; Validation özeti yalnızca tüm adaylar geçerliyse `VALID`; INCOMPLETE adaylı steel girder "VALID" göstermez.
- **AC7** Inspector önizleme istisnası FAMILY bölümünde mesaj olarak görünür; aday yoksa Validation `FAILED`; dirty graph'ta eski Run adayları gösterilmez (korunur).
- **AC8** Inspector "Invalid" bilinmediğinde `—` gösterir, `0` değil.
- **AC9** Wind STALE iken Summary, Details sonuç satırları ve önceki INVALID uyarısı eski sonucu göstermez; Details güncel girdileri gösterir; Status `STALE`.
- **AC10** Wind girdileri snapshot girdilerine dönünce sonuç yeniden görünür; düzenleme snapshot'ı değiştirmez/silmez.
- **AC11** Korunan Wind davranışları: snapshot gerçek girdileri saklar; güncel VALID sonuç gösterilir; INVALID'de `missing` ve `—`; HTTP 400 mesajı görünür.
- **AC12** `girderCandidates.ts`, `superstructureCandidates.ts`, `nodeRegistry.ts`, `bridgeAssembly.ts`, `abutmentCandidates.ts`, `graphRunValidity.ts`, `backend/`, `package.json` diff'i boş; yeni localStorage anahtarı, `schemaVersion` değişikliği veya mühendislik değeri yok.
- **AC13** `npm run build` ve `npm run lint` exit 0, değişen dosyalarda yeni oxlint uyarısı yok; `npm test`: yeni testler yeşil, başarısız küme T0 kümesinin alt kümesi.
- **AC14** `docs/architecture.md` ve `docs/roadmap.md` güncel; `:3065`'teki eski "Details shows the snapshot's inputs" ifadesi kalmamış.

## 7. Doğrulama matrisi
| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | T0 komutları | çıktılar raporda |
| AC2–AC4 | `npm test -- src/features/family-tables/components/FamilyResultsViewer.test.tsx` | yeşil |
| AC5 | `npm test -- src/features/graph/family` | yeşil |
| AC6–AC8 | `npm test -- src/features/graph/ui/EngineeringNodeInspector.test.tsx src/features/graph/family src/features/family-tables` | yeşil |
| AC9–AC11 | `npm test -- src/features/loads/components/wind` | yeşil |
| AC12 | koordinatör `git diff --stat` ve listelenen dosyalarda `git diff` | yalnızca `frontend/src` ve `docs`; listelenenler boş |
| AC13 | `npm run build`; `npm test`; `npm run lint` | exit 0 / alt küme / exit 0 |
| AC14 | doküman diff incelemesi | güncel |

Test-first: her yeni test için düzeltme öncesi kırmızı çıktı raporlanır. Elle kontrol (Chromium): (1) Graph'ta Run → Project'te Length `mm` → Family STALE; (2) iki sekme: B'de graph düzenle → A'da Family STALE; (3) precast girder Inspector Valid 0, `INCOMPLETE`; (4) Wind: hesapla → vb değiştir → Summary/Details `—`/STALE → vb geri al → sonuç döner.

## 8. Riskler
- **Görünür davranış değişikliği:** Graph precast girder Inspector'ı artık "VALID" yerine `INCOMPLETE` ve Valid 0 gösterir (A-05'in zaten var olan sonucu, `architecture.md:3108`; artık görünür). Steel girder yerel malzemeyle de `INCOMPLETE` (C-007-05). AGENTS.md:1274 korunan sözleşmeler (graph validity, Node SUCCESS, candidate generation): üretim, düğüm durumu ve graph geçerliliği değişmez, yalnızca Inspector özet sunumu değişir; plan onayı bunu kapsar.
- **Yanlış STALE riski:** viewer parmak izi Graph'tan farklı birim/graph kaynağı kullanırsa her şey STALE görünür; önlem: App `project.units` prop'u ve graph store (§3.1), AC4 testi.
- **Graph store aboneliği:** başka sekme storage olayında `notify` + `kopruq:project-data-changed` yayar (C-007-07); Family açıkken de projeyi dirty yapabilir; kabul edilen yan etki.
- **Performans:** `graphFingerprint` `useMemo` ile yalnızca graph/birim değişince.
- **Test kırılganlığı:** graph store modül önbelleği; viewer testleri `importGraphDocuments` ile kurulmalı.
- **Veri/geri alma:** kalıcı veri, anahtar, dosya biçimi değişmez; her görev kendi dosya kümesiyle geri alınabilir; implementer git işlemi yapmaz.
- **Mühendislik güvenliği:** hiçbir formül, sabit veya geçerlilik kriteri eklenmez; aday geçerliliği mevcut `validationStatus` alanından ve `graphFamilyPresentation.ts:92` kuralından gelir.

## 9. Varsayımlar ve kararlar
Varsayımlar (doğrulanmadı): test tabanı yeşil (T0 doğrular); boş liste girdisi `normalizeCandidateInput`'ta fırlatır; `useSyncExternalStore` aboneliği jsdom Family testleri için yeterli.
Yazılım kararları (varsayılan uygulanır, engelleyici değil):
- **D-1:** STALE snapshot'ın adayları Family'de listelenmeye devam eder (rozet ve not ile); aday Validation sütunu adayın kendi durumunu gösterir. Alternatif: STALE'de tabloyu gizlemek.
- **D-2:** Inspector özeti karışık durumda en ağır durumu gösterir (`INVALID`/`ERROR` > `INCOMPLETE` > diğer); yeni etiket icat edilmez.
- **D-3:** Wind STALE iken eski sonuç gizlenir, snapshot korunur. Alternatif ("önceki hesap" bloğu) reddedildi.
- **D-4:** H-006-c ve canvas footer "valid" sayısı bu işe alınmadı; ayrı küçük iş olabilir.
Mühendislik sorusu: yok.

READY
