# İnceleme: `backend-db-persistence-m5c2` (M5c geçişi)

**Karar: CHANGES_REQUESTED.** Bir P2 bulgu ve birkaç P3 bulgu var. "Hatasız" denemez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). Baseline HEAD `d221191b6e9f3d24a6b185be0f2456c477fc3ddb` = güncel HEAD. Çalışma ağacı anlık görüntüsü (docs/features/** hariç) inceleme öncesi ve sonrası aynı: `29ee147627a8b6b7e072932702bda69e554d0655`, durum listesi de aynı; rapor bayat değil.

## Kapsam ve sınırlar
- İncelenen: 4932 satırlık tam diff, 97 satırlık durum listesi, 8 untracked dosyanın tamamı; ayrıca App, useUrlProjectId, useBeforeUnloadWarning, controller, TopWorkspaceNav, modal/dialog'lar, depolar (projectWorkspace, bridge-definition store, familyRepository, useFamilyCatalog, graphStore ve bellek depoları, projectModuleStore), loadsWire, WindLoadsPanel, paneller, test altyapısı ve yeni testler.
- Reviewer'ın koşamadıkları (yalnızca implementer/koordinatör raporu): build, test (115/1075), lint, `tsc -b`, `mvn package` (732), `sourceEncoding`/`layerRules`. Koordinatör build/test/lint ve korunan yol durumunu bağımsız yeniden koştu (AC18 bu kısmen koordinatör kanıtıdır); backend `mvn` yeniden koşulmadı.
- Gerçek tarayıcı ve gerçek backend ile elle kontrol yapılmadı.
- Reviewer'ın Grep doğrulamaları: production'da `localStorage|sessionStorage|indexedDB|showOpenFilePicker|showSaveFilePicker|.kopruq|project-data-changed|persist*` izi yok; silinen dosyaların tüketicisi kalmamış; yeni `.only/.skip/.todo` yok; status'ta `backend/**` ve `package.json` yok.

## Bulgular

### P2-1 — Malzemeler ve Kiriş kütüphanesi panelleri bölüme reaktif değil; atılan değişiklikler geri yazılıyor
- **Yer:** `frontend/src/features/materials/components/MaterialsPanel.tsx:43-45` (`useState(readMaterials)` + `[materials]` effect'i); `frontend/src/features/girder-library/components/GirderLibraryPanel.tsx:61-68` (`useState(saved?.enabled…)`, `useState(saved?.dimensions…)` + yazma effect'i).
- **Senaryo:** Malzemeler panelinde bir beton sınıfı değiştirilir. PUT 400/500 alır ya da bekleyen yazma varken "Değişiklikleri at" seçilir. `discard()` bölümü geri alır (`serverSection.revert` → notify) ama panel mount anındaki yerel state'i göstermeye devam eder (`discard` epoch'u değiştirmediği için remount yok). Kullanıcı başka bir satırı değiştirince effect tüm `materials` dizisini yazar; atıldığı sanılan değer PUT ile sunucuya gider. Kiriş kütüphanesinde `{enabled, dimensions}` için aynısı olur; 409 sonrası sunucu değeri benimsenince de panel güncellenmez.
- **Etki:** Ekranda kaydedilmemiş değer görünür; "atılan" değişiklik sonraki düzenlemeyle geri döner. Veri bütünlüğü ve AC6 ("Discard çalışır") bu iki panelde karşılanmıyor.
- **Kanıt:** Paneller `kopruq:material-catalog-changed` / `kopruq:girder-catalog-changed` olaylarını dinlemiyor, hook üzerinden de okumuyor. `AppSession.test.tsx` "Discard reverts" testi yalnızca proje adını (reaktif `useProjectState`) sınıyor; Discard'ın bu paneller üzerindeki etkisini sınayan test yok.
- **Öneri:** İki paneli bölüme abone yapın (`useFamilyCatalog('MATERIAL', …)` ve `useProjectModule(GIRDER_LIBRARY_MODULE, …)` ya da olay dinleyicisiyle yerel state'i bölüm değerinden türetin). D9 mount yazması korunmalı, "okurken yazma" eklenmemeli. Discard sonrası panelin geri döndüğünü ve sonraki düzenlemenin atılan değeri göndermediğini doğrulayan test ekleyin.

### P3-1 — Pier fallback'i (RECT-M) yalnızca Pier panelinde görünüyor
- **Yer:** `useFamilyCatalog.ts:10-16`; tüketiciler `BridgeDefinitionWorkspace.tsx:49`, `SystemAssemblyPanel.tsx:80`, `registry.ts:32` (`getFamilyRecords('PIER')`, fallback yok).
- **Senaryo:** Yeni projede Pier Families RECT-M gösterir; Bridge Definition'daki pier ataması, System Assembly ve Registry aynı kataloğu boş görür. M5c öncesinde panel RECT-M'i okurken yazdığı için ziyaretten sonra diğer ekranlar da görüyordu.
- **Etki:** Ekranlar arası tutarsızlık. Kullanıcı kararı Q2/S9'un (okurken yazma yok) doğrudan sonucu ama plan çapraz tüketicileri ele almıyor.
- **Öneri:** Mühendise teyit ettirin: ya tutarsızlık kabul edilip dokümana yazılsın ya da fallback ortak `getFamilyRecords` seviyesine (yazmadan) taşınsın.

### P3-2 — Ctrl+N gerçek tarayıcıda yakalanamayabilir (AC16)
- **Yer:** `frontend/src/app/layout/TopWorkspaceNav.tsx:42`.
- Chrome/Edge Ctrl+N'yi tarayıcıya ayırır; `preventDefault` yeni pencereyi engellemeyebilir. jsdom `fireEvent.keyDown` testi bunu gösteremez.
- **Öneri:** Elle kontrol listesine ekleyin; gerekirse kısayolu değiştirmek için kullanıcı kararı alın.

### P3-3 — Kilitli karar varken Ctrl+O / Ctrl+N kapatılamayan diyalog açıyor
- **Yer:** `TopWorkspaceNav.tsx:41-42`, `App.tsx:107, 139-140`.
- `UnsavedChangesModal` açıkken Ctrl+O → `ProjectListDialog` `busy=true` ile açılır (Kapat pasif, Escape yok sayılır); karar çözülünce açık kalır. Veri riski yok.
- **Öneri:** `pendingSwitch !== null` iken `onOpenList` ve `onNew` işlem yapmasın.

### P3-4 — Test kanıtı zayıf ya da eksik
- `useUrlProjectId` için doğrudan birim testi yok (aynı değerde no-op, path/hash/parametre koruma, replace). `AppSession.test.tsx:385-393` `history.length` ile no-op'u ayırt edemez.
- `realDefaultsWire.test.tsx:90` Preferred span için `toBeLessThanOrEqual(1)`; 0 PUT ile de geçer. Senaryoda tam 1 PUT beklenmeli.
- `sectionWrites.test.ts:90-102` yeniden açılışta yalnızca bir alt kümeyi (workspace, bridge-definitions, girder, wind-snapshot, rules, PIER) karşılaştırıyor; cross-section, diğer yük bölümleri, materials, pier-cap/foundation/bearing ve graph karşılaştırılmıyor.
- "Accepted by the server contract" ifadesi abartılı: `fakeProjectApi.ts` PUT gövdesini sunucu sözleşmesine göre doğrulamıyor; kanıt yalnızca istemci `toWire`/strict şema.
- **Öneri:** Üç testi sıkılaştırın; adaptör için `MemoryRouter` ile küçük bir birim testi ekleyin.

### P3-5 — `noBrowserStorage` ratchet'ı dar
- **Yer:** `frontend/src/test/architecture/noBrowserStorage.test.ts:19`.
- Bugünkü sembolleri ve `'storage'` literal'ini yakalıyor; `showDirectoryPicker`, `FileSystemHandle`/`FileSystemDirectoryHandle`, `caches`, `document.cookie`, `navigator.storage` yakalanmıyor.
- **Öneri:** Sembol listesini genişletin.

### P3-6 — implementation.md sayı tutarsızlığı
- "10 files deleted, 5 added" yazıyor; silinen test dosyası 9 (8 `app/project-file` testi + `sessionLayerUnwired`); 119 − 9 + 5 = 115. Rapor düzeltilmeli.

## Belirsiz hipotezler (doğrulanmadı)
- **H1:** Uygulama içi bazı `navigate('/…')` çağrıları (ör. System Assembly aile yönlendirmesi) `?project`'i düşürüyor; bu sırada listeden seçilmiş bir Open uçuştaysa `useProjectSessionController.ts:267` `cancelPendingOpen()` seçimi sessizce iptal eder. Mantık M5b'den; M5c bağlamasıyla erişilebilir oldu. Olasılığı düşük.
- **H2:** Panel açıkken girder bölümü Discard edilirse `PreferredSpanPanel` girder olayını dinlediği için `ensureRules` effect'i yeni bir kural PUT'u tetikleyebilir (yalnızca iki ekran aynı anda mount'luysa).
- **H3:** `graphStore.addNode` (`graphStore.ts:90-98`) commit başarısız olsa da `node.id` döndürüyor; `graphStore.test.ts` bunu `toBeDefined()` ile sabitliyor. Workspace mount'lu iken etkisi düşük.

## Doğrulananlar (bulgu değil)
- `useSyncExternalStore` kararlılığı: boş fallback sabit referans; bridge-definition okuması bölüm/workspace/katman referanslarıyla memo'lu; graph snapshot notify ile yenileniyor; `useFamilyCatalog` kategori başına önbellekli fallback; sonsuz render riski yok (satır içi `subscribe` her render'da yeniden abone oluyor; sızıntı yok, gereksiz iş).
- `onProjectSwitch` dinleyicileri yalnızca bellek state'ini bildirimsiz sıfırlıyor, bölüm okumuyor; hydrate sırasında senkron yazma yok.
- `setBridges`: workspace yazması başarısızsa ikinci yazmaya geçilmiyor; PUT sırası `['workspace','bridge-definitions']`, revizyonlar `[17,18]`.
- D6 katmanı: UI-only değişiklik 0 PUT; wire `keyBy`'ı göndermiyor.
- Rüzgâr: `requireFinite` kapsamı plan 3.6 ile birebir; `rejected` → Retry → `idle`, 500 → Retry sırası test edilmiş; STALE kuralı değişmemiş.
- Reload koruması controller `:194`'te; gösterge düğmesi `busy` iken pasif; testli. `ProjectListDialog` odak çözümü plana uygun; sapma 2 (`dialogsLocked`) ve 3 (`window.location.search`) gerekçeli ve belgeli.
- Katman kuralı ihlali yok; yeni mühendislik formülü/birim/varsayılan yok.

## Kabul kriterleri
| AC | Durum | Not |
|---|---|---|
| AC1 | Karşılanıyor | Allow-list'ler boş, production grep temiz; ratchet kapsamı dar (P3-5) |
| AC2 | Karşılanıyor | `browserStorageRuntime.test.tsx` uygun |
| AC3 | Karşılanıyor | |
| AC4 | Kısmen | 17 path ve revizyon zinciri tam; yeniden açılış eşitliği alt kümede (P3-4) |
| AC5 | Karşılanıyor | |
| AC6 | Kısmen | Workspace için karşılanıyor; Materials/Girder'da Discard yansımıyor (P2-1) |
| AC7 | Karşılanıyor | |
| AC8 | Karşılanıyor | |
| AC9 | Kısmen | Pier/Cap/Foundation/Bearing 0 PUT; Preferred assert zayıf; RECT-M tutarsızlığı (P3-1, P3-4) |
| AC10 | Karşılanıyor | |
| AC11 | Karşılanıyor | |
| AC12 | Karşılanıyor | |
| AC13 | Karşılanıyor | |
| AC14 | Kısmen | Adaptör no-op'u doğrudan test edilmemiş (P3-4) |
| AC15 | Karşılanıyor | |
| AC16 | Kısmen | jsdom'da var; gerçek tarayıcıda Ctrl+N riski (P3-2) |
| AC17 | Karşılanıyor | |
| AC18 | Kısmen doğrulandı | Reviewer koşamadı; koordinatör frontend build/test/lint ve korunan yol durumunu bağımsız doğruladı; `mvn` implementer raporu |
| AC19 | Karşılanıyor | |

## implementation.md ile kod arasındaki farklar
1. "10 files deleted" → gerçekte 9 test dosyası (P3-6).
2. "Accepted by the server contract" ifadesi fake API ile doğrulanamaz (P3-4).
3. AC4 "Yes" → yeniden açılış eşitliği kısmi.
4. AC6 "Yes" → P2-1 nedeniyle iki panelde Discard karşılanmıyor.
5. Sapmalar 1–6 kodla uyumlu; silinen 23 dosya durum listesiyle tutarlı.

## Elle kontrol ve M5c sonrası riskler
- Gerçek backend ile uçtan uca kontrol (plan 6.2 / parent 7.2) koşulmadı; rüzgâr adımında DevTools'ta `PUT loads/wind-snapshot` gövdesinde `result` görülmeli.
- Gerçek tarayıcıda Ctrl+N / Ctrl+O / Ctrl+S ve `beforeunload` davranışı.
- Bölümler arası atomiklik yok (`setBridges`, rüzgâr girdisi + snapshot); kabul edildi.
- Büyük graph sürükleme maliyeti ölçülmedi.
- Aktif graph id artık saklanmıyor; yeniden açılışta ilk graph aktif oluyor (kasıtlı değişiklik, kullanıcıya bildirilmeli).
- RECT-M tutarsızlığı için mühendis teyidi gerekli.
- Backend'in sonlu olmayan rüzgâr değerlerini nasıl işlediği doğrulanmadı (yerel ret kapsıyor).
