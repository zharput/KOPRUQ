# İnceleme (3. tur): `backend-db-persistence-m5c2` (M5c geçişi)

**Karar: CHANGES_REQUESTED.** Önceki turun P3-B, P3-C ve P3-3 bulguları kapanmış. P2-A için kullanıcı kararı (b) kayıtlı ve kod bununla tutarlı. Ancak kullanıcının istediği "taslak kaybolmadan önce uyarı" en doğal çıkış yollarından birinde çalışmıyor: aktif görünen **Family** sekmesi taslağı uyarısız siliyor (yeni P2-B). Bunun dışında birkaç P3 var. Bu rapor "hatasız" anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). Önceki turlar: `review-1-changes-requested.md`, `review-2-changes-requested.md`. Baseline HEAD `d221191b6e9f3d24a6b185be0f2456c477fc3ddb` = güncel HEAD; kaynak anlık görüntüsü (docs/features/** hariç) inceleme öncesi ve sonrası aynı: `e1299201d1b8626270886c75fb78f0241b4a6400`, durum listesi aynı; rapor bayat değil.

## Kapsam ve sınırlar
- Okunanlar: 5266 satırlık diff'in tamamı (silinen `app/project-file/*` gövdeleri silme olarak tarandı), 104 satırlık durum listesi, 12 untracked dosyanın tamamı; ayrıca `App.tsx`, `TopWorkspaceNav.tsx`, `router.tsx`, `workspaces/registry.ts`, `WorkspacePage.tsx`, `useProjectSessionController.ts`, `PierFamiliesPanel.tsx` (+test), `PreferredSpanPanel.tsx` (+test), `useProjectModule.ts`, `AppSession.test.tsx`, `TopWorkspaceNav.test.tsx`, `docs/architecture.md:3315-3336`.
- Reviewer'ın koşamadıkları: build, test, lint, `tsc -b`, `mvn package`, `layerRules`, `sourceEncoding`. Koordinatörün son bağımsız koşusu (118 dosya / 1095 test, build ve lint çıkış 0, tsc temiz, korunan yollarda değişiklik yok) reviewer tarafından doğrulanmadı; backend 732 test implementer raporuna dayanıyor.
- Gerçek tarayıcı ve gerçek backend ile elle kontrol yapılmadı.
- Grep: yeni `.only/.skip/.todo` yok; durum listesinde `backend/**` ve `package.json` yok; katman kuralı ihlali yok (`PierFamiliesPanel` → `shared/project-store/unsavedDrafts` uygun). `App.tsx` ve `unsavedDrafts.ts` CRLF, `activeProject.ts` LF; depo zaten karışık, somut etkisi yok.

## Önceki bulguların durumu
| Bulgu | Durum | Not |
|---|---|---|
| P2-1, P3-4, P3-5, P3-6 | Kapalı (2. tur) | Değişmedi |
| P2-A Pier taslağı (D14 sapması) | **Karar kayıtlı, kod tutarlı** | `implementation.md:89` seçenek (b); `PierFamiliesPanel.tsx:15-16,25-27` (taslak yerel), `:46` (Add Pier yalnızca `VALID`), `:58` (yeni `PIER-<ts>` id, tek yazma). Uyarı mekanizmasında boşluk: P2-B |
| P3-B Preferred span Discard | **Kapandı** | `PreferredSpanPanel.tsx:69` `ensureRules(previous, variants, type)`; `setRules` sabit, `ensureRules` effect'i ek yazma tetiklemiyor. Test `PreferredSpanPanel.test.tsx:32-45` |
| P3-C architecture sayısı | **Kapandı** | `architecture.md:3334` "eight" |
| P3-3 Kilitli karar altında Ctrl+O/N | **Kapandı** | `App.tsx:112-113`; test `AppSession.test.tsx:452-471` |
| P3-2 Ctrl+N tarayıcı | **Açık** | `TopWorkspaceNav.tsx:43` değişmedi; elle kontrol |
| H1, H2, H3 | Açık hipotez | `useProjectSessionController.ts:267`, `PreferredSpanPanel` girder Discard, `graphStore.ts:96-97` |

## Yeni bulgular

### P2-B — Pier ekranından "Family" sekmesine dönüş taslağı uyarısız siliyor
- **Yer:** `frontend/src/app/layout/TopWorkspaceNav.tsx:75` — `onClick={(event) => { if (active?.id !== id && !confirmDiscardDrafts()) event.preventDefault() }}`. İlgili: `:35` (`active = workspaceFromPath(pathname) ?? legacyWorkspaceFromPath(pathname)`), `workspaces/registry.ts:40` (`'pier-families': 'family-tables'`), `App.tsx:199` (legacy rotada WorkspacePage key'i `location.pathname` içeriyor).
- **Senaryo:** Yeni projede `/pier-families?project=…` açılır → RECT-M taslağında "Family Name" değiştirilir (kirli bayrak set) → üst bardaki **Family** sekmesine tıklanır; sekme `aria-current="page"` ile aktif görünür çünkü `active.id === 'family-tables'` → guard koşulu `active?.id !== id` false, `confirm` çağrılmaz → link `/family-tables?project=…` adresine gider, key değişir, panel unmount olur, cleanup bayrağı temizler, taslak uyarısız kaybolur.
- **Etki:** Kullanıcının açıkça istediği "kaybolan taslak için uyarı" Pier ekranından kütüphaneye dönmenin en doğal yolunda çalışmıyor. Yalnızca yerel taslak düzenlemesi kaybolur (sunucu verisi bozulmaz). Guard'ın "aktif link gezinmez" varsayımı yalnızca `workspaceFromPath` ile eşleşen kök yollar için doğru; legacy alt rotalarda (`/pier-families` vb.) ve `/project/<alt>` yollarında yanlış.
- **Kanıt:** `AppSession.test.tsx:426-449` yalnızca Project ve Loads linklerini sınıyor; Family linki için test yok.
- **Öneri:** Koşulu "hedef URL mevcut pathname'den farklı mı" olarak değiştirin (örn. `pathname !== \`/${id}\` && !confirmDiscardDrafts()`) ya da guard'ı yalnızca `hasDirtyDrafts()` ile sınırlayın. İsteğe bağlı: değiştirici tuşlu tıklamada (`ctrlKey`, `metaKey`, `shiftKey`, `button !== 0`) sormayın (yeni sekmede açmak taslağı kaybettirmez; bugün iptal edilirse yeni sekme de açılmıyor). `/pier-families` → Family linki için AppSession testi ekleyin.

### P3-D — Uyarı kapsamındaki diğer boşluklar ve yanıltıcı istemler
- **Yer:** `App.tsx:139` (`onReload` guard'sız), `App.tsx:109-110`, `App.tsx:137-138`.
1. **Conflict sonrası "Yeniden yükle":** `reloadProject` → `openNow` → `applyPreparedProject` epoch'u değiştirir, workspace remount olur; kirli Pier taslağı uyarısız kaybolur. `implementation.md:90` yalnızca geri/ileri tuşlarını kapsam dışı sayıyor.
2. **`openProjectFromList` / `createProject`:** Diyalog `confirm`'den önce kapanıyor. Kullanıcı "İptal" derse yazdığı proje adı ve liste seçimi kaybolur (UX; veri riski yok).
3. **Açık projeyi Recent'ten tıklamak ve Exit:** Recent listesi açık projeyi de içerir; `runOpen` no-op olduğu halde (`useProjectSessionController.ts:158-160`) "taslak kaybolacak" diye sorulur. `exitProject` de `pendingRef !== null` iken no-op ama yine sorar.
- **Öneri:** Reload için de `confirmDiscardDrafts()` çağırın ya da yolu `implementation.md` / `architecture.md`'de kapsam dışı olarak belgeleyin; confirm'i diyalog kapatılmadan önce sorun; `projectId === saveStatus.projectId` ise confirm'i atlayın.

### P3-E — Taslak kirliliği referans karşılaştırmasıyla izleniyor; Add Pier sonrası taslak sıfırlanmıyor
- **Yer:** `PierFamiliesPanel.tsx:15, 21-22, 58`.
1. **Düzenle ve geri al:** Ad "My Pier" yapılıp tekrar "RECT-M" yazılırsa `draft !== INITIAL` true kalır; içerik aynı olduğu halde `beforeunload` ve confirm sorar (yanlış pozitif).
2. **Add Pier → tüm aileleri sil:** `addFamily` `draft` state'ini sıfırlamıyor; katalog tekrar boşalınca editör, kaydedilip silinmiş eski düzenlemeleri "Henüz projeye kaydedilmedi" etiketiyle gösterir ve kirli sayar.
- **Etki:** Veri kaybı yok; gereksiz uyarı ve kafa karıştırıcı taslak içeriği. (Add Pier PUT'u başarısız olup Discard edilirse eski taslağın geri gelmesi aslında faydalı.)
- **Öneri:** Kirliliği içerik karşılaştırmasıyla hesaplayın (örn. `JSON.stringify(draft) !== JSON.stringify(INITIAL)`); Add Pier yazması kabul edildiğinde `setDraft(INITIAL)` çağırın.

### P3-F — Uyarı testleri iddialarını tam karşılamıyor; describe yapısı bozuk
- **Yer:** `AppSession.test.tsx:426`, `:416-418`, `:473`.
- Test adı "…Exit **or opening a project**" diyor ama yalnızca Project linki ve Exit sınanıyor; `openProjectFromList`, Recent ve `createProject` confirm yolları (`App.tsx:109-110, 137`) test edilmiyor; Family linki de edilmiyor (P2-B).
- `unsavedDrafts.test.ts` `confirmDiscardDrafts`'ı sınamıyor (temiz durumda `window.confirm` çağrılmaması, kirli durumda dönüş değeri).
- `describe('No open project')` bloğu `:416`'da kapanmıyor; "Unsaved Pier starter draft" ve "Shortcuts under the unsaved-changes gate" blokları içine gömülü (kapanış `:473`). Testler koşar ama yanlış başlık altında raporlanır.
- `confirm` spy'ları testin sonunda `mockRestore()` ile geri alınıyor; assertion önce düşerse spy sızar. `afterEach`'te `vi.restoreAllMocks()` önerilir.

### P3-G — Dokümanlar yeni davranışı yansıtmıyor
- `docs/architecture.md:3331` "`useBeforeUnloadWarning` warns while writes are pending or the status is error/rejected/conflict" diyor; artık kirli taslakta da uyarıyor (`useBeforeUnloadWarning.ts:10`).
- `docs/architecture.md:3327` Pier starter draft maddesi (b) kararını (D14'ten bilinçli sapma) ve `unsavedDrafts` / `confirm` mekanizmasıyla kapsam dışı yolları anmıyor.

## Belirsiz hipotezler ve gözlemler
- Global kirli bayrak sızıntısı riski görülmedi: proje değişimi ve Reload epoch'u değiştirip workspace'i remount ediyor, panel cleanup'ı `setDraftDirty('pier-starter', false)` çağırıyor; Exit/Welcome'da `RoutedApplication` unmount oluyor; yeni projede Pier ailesi varsa `isDraft` false; StrictMode'un çift effect'i zararsız.
- jsdom'da spy'lanmamış `window.confirm` "Not implemented" uyarısı verip falsy döner; bir App testinde taslak kirli kalırsa gezinme sessizce iptal edilir. Bugünkü testlerde tetiklenmiyor.
- H1 ve H3 açık.

## Kabul kriterleri
| AC | Durum | Not |
|---|---|---|
| AC1 | Karşılanıyor | Allow-list'ler boş, ratchet genişletilmiş (kaynak incelendi) |
| AC2–AC5, AC7, AC8, AC10–AC13, AC15, AC17 | Karşılanıyor | |
| AC4 | Karşılanıyor | 16 bölüm + graph, revizyon zinciri, yeniden açılış eşitliği |
| AC6 | Karşılanıyor | Materials/Girder/Preferred span Discard düzeldi; `beforeunload` kirli taslağı da kapsıyor |
| AC9 | Karşılanıyor (kullanıcı kararı b ile) | D14 sapması kayıtlı |
| AC14 | Karşılanıyor | H1 açık hipotez |
| AC16 | Kısmen | Gerçek tarayıcıda Ctrl+N riski (P3-2) |
| AC18 | Yalnızca rapor | Reviewer koşmadı; koordinatör: 118/1095, build+lint 0, tsc temiz; mvn implementer raporu |
| AC19 | Büyük ölçüde | P3-G |
| Kullanıcı isteği: taslak uyarısı | **Kısmen** | `beforeunload`, Project/Loads/… linkleri, Exit, Open, Recent, New kapsanıyor; **Family linki (P2-B)** ve Reload kapsanmıyor; geri/ileri belgelenmiş sınır |

## implementation.md ile kod arasındaki farklar
1. `:90` "the workspace links in TopWorkspaceNav … ask via `window.confirm` first" — aktif görünen legacy-rota linki (Family) sormuyor (P2-B).
2. `:90` yalnızca geri/ileri kapsam dışı — conflict Reload da kapsanmıyor (P3-D).
3. AppSession testi "opening a project" iddiasını sınamıyor (P3-F).
4. P2-A karar kaydı, P3-B, P3-3 ve P3-C anlatımları kodla uyumlu; yeni test dosyası listesi ve 118 dosya sayısı tutarlı (115 + 3).

## Elle kontrol ve riskler
- Gerçek backend ile uçtan uca kontrol (plan 6.2 / üst plan 7.2); rüzgâr adımında `PUT loads/wind-snapshot` gövdesinde `result` görülmeli.
- Gerçek tarayıcıda: Ctrl+N/O/S (P3-2); kirli Pier taslağıyla sekme kapatma/yenileme; **Family** sekmesine dönüş (P2-B); tarayıcı geri tuşu; Ctrl+tıklama ile yeni sekmede açma.
- Kabul edilmiş riskler: bölümler arası atomiklik yok; aktif graph id yeniden açılışta korunmuyor; büyük graph sürükleme maliyeti ölçülmedi; backend'in sonlu olmayan rüzgâr değerini nasıl işlediği doğrulanmadı (yerel ret kapsıyor).
