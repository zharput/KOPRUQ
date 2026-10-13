# Review: g4 — 2. tur (güncel)

**Karar: CHANGES_REQUESTED** (yalnızca P3; P0/P1/P2 yok). 1. turdaki P3-1..P3-6'nın altısı da kod düzeyinde kapanmış; onarımlar iki yeni küçük sorun (N1, N2) getirmiş. Bu karar özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- Baseline HEAD `a1e1684904b0b30b59a3e4fabccea29076026953` (güncel HEAD ile aynı). Review sonrası diff özeti (md5), izlenmeyen dosya özeti ve `git status` özeti değişmedi → review güncel.
- Okunan: 6225 satırlık diff'in tamamı (App.css ve silinen dosyalarda saf silme/taşıma kontrolü), `previewExecutorParity.test.ts`, `sourceEncoding.test.ts`, `layerRules.test.ts` tam; `nodeRegistry.ts` ve `frontend/README.md` diff ile karşılaştırıldı; mojibake, `useQuery`/`useMutation` ve `vitest-errors.txt` için grep.
- Reviewer komut çalıştırmadı. `npm test` 84 dosya/830 test, build OK, dist CSS sha256 aynı (`4936a632…16fa2d`), lint 66 uyarı (baseline 81) koordinatör beyanıdır; elle Chromium kontrolleri yapılmadı.

## 1. turdaki bulguların durumu
| Bulgu | Durum | Kanıt |
|---|---|---|
| P3-1 superstructure koruması | Çözüldü (dokümanda eksik, N2) | `nodeRegistry.ts:108` koşulu baseline'daki `!girder.length` ile aynı; executor gövdesi ve 80 satırlık GOLDEN tablosu değişmemiş; 4 yeni test (`previewExecutorParity.test.ts:251-285`): girder yok + NaN deckWidth → preview `[]`, executor reject; Run öncesi adapter `error` değil; girder bağlıyken parite; girder bağlı + NaN → preview de fırlatır. Adapter testi yalnızca `not.toBe('error')` (zayıf ama yeterli). |
| P3-2 malzeme çözücü yolu | Çözüldü | `:287-343`, 3 tip × 5 test; resolver çağrıları kaydediliyor, bağlı string id'nin resolver'a gittiği, nesne malzemenin geçtiği, her adayın `material`'ının çözülmüş `fck`'e eşit olduğu doğrulanıyor. Yalnızca birer temsilci tip (circular pier, rectangular cap, shallow foundation); diğerleri aynı fabrika ve `compute`. |
| P3-3 `vitest-errors.txt` | Çözüldü | `D  frontend/vitest-errors.txt` staged silme, dosya diskte; `docs/architecture.md` A-16 ve `docs/roadmap.md` gerçek durumla uyumlu; `implementation.md:44`'teki eski cümleyi `:52` geçersiz sayıyor. "By the engineer" bir varsayım. |
| P3-4 bayat yorumlar | Çözüldü | 9 yorum düzeltilmiş, bu dosyalarda yorum dışı değişiklik yok. Kozmetik: `sections.ts:12` `removed in G4),'project-information'` arasında boşluk eksik. |
| P3-5 README listesi | Çözüldü | Liste repodaki `useQuery`/`useMutation` dosyalarıyla örtüşüyor (layout, alternatives, fast solver, 3 LandXML, terrain DTM, terrain viewer, 5 loads hook'u). |
| P3-6 bayat izin listesi | Mantık çözüldü, yeni kusur (N1) | `findStaleAllowEntries` dosyanın varlığını ve en az bir işaretçiyi kontrol ediyor; sentetik fixture beklenen iki satırı üretiyor. |

## Yeni bulgular
**N1 (P3): P3-6 fixture'ı kaynağa gerçek bir mojibake dizisi ekledi.** `frontend/src/test/architecture/sourceEncoding.test.ts:76`: ``'/src/has-marker.ts': `const x = 'PLAN Â· A'` `` — U+00C2 kaçış dizisi olarak değil, karakterin kendisi olarak yazılmış (koordinatör grep ile doğruladı). `Â|â€|Ã¢|Ä±|U+FFFD` grep'i artık üç dosya buluyor (`projectWorkspace.ts`, testi ve bu dosya); plan AC2 "yalnızca `projectWorkspace.ts:35-41` ve testini bulur" ve dosyanın `:8-9` başlık yorumu ("does not itself contain a corrupted sequence") ile çelişiyor. Test muhtemelen Vite `import.meta.glob`'un çağıran dosyayı sonuçlara katmaması yüzünden geçiyor (varsayım, çalıştırılarak doğrulanmadı); bu dosyaya eklenen işaretçiler sessiz kalır. Öneri: `:87`'deki gibi kaçış dizisi kullanılsın: `'PLAN Â· A'`.

**N2 (P3): P3-1 istisnası yalnızca kod yorumu ve testte belgelenmiş; dokümanlar tek farkın malzeme olduğunu söylüyor.** `frontend/README.md:44-47` "the only intended difference is that the preview does not resolve materials"; `docs/architecture.md` G4 track A-04 satırı ve `docs/roadmap.md` A-04 maddesi superstructure ön koşulundan söz etmiyor; test yorumu (`:258-260`) ikinci istisna olarak tanımlıyor; plan §3.1/AC5 "belgelenmiş superstructure ön koşulu" istiyor. Öneri: README ve G4 track A-04 satırına tek cümle: "girder bağlı değilken superstructure önizlemesi `[]` döner; Run girişleri doğrulamaya devam eder".

## Kapsam dışı gözlem (g4 işi değil)
- 18 izlenmeyen `docs/e2e/**` dosyası (içerik review edilmedi) ve ilk turdan sonra değişen kök `README.md` (baştan sona Türkçe yeniden yazılmış, diff `:16-410`; ilk tur `g4-status.txt`'te yoktu; `docs/e2e/README.md`'ye link veriyor). Kaynağı g4 ajanları veya takip onarımları değil. AC14'ün izinli yolları kök `README.md`'yi kapsamıyor; g4 değişiklikleri commit edilirken bu dosyalar ayrı tutulmalı veya kaynağı kullanıcıyla netleştirilmeli.

## Belirsiz hipotezler (açık)
- `layerRules.test.ts:52` blok yorum regex'i string içindeki `/*` dizisine de eşleşir (false-negative riski, düşük).
- `:93` yalnızca göreli importları kontrol ediyor; ileride path alias eklenirse kural atlatılabilir.
- D1'in eski graph'lara etkisi: span parametresi eksik eski kayıt Run öncesi kırmızı görünebilir; eski `.kopruq` ile elle kontrol önerilir.
- N1 mekanizması (Vite glob'un çağıran dosyayı dışlaması) varsayım.

## Kabul kriterleri
AC1 raporda. AC2 **kısmen** (N1). AC3 karşılandı. AC4 GOLDEN değişmedi, executor aynı, resolver yolu artık kapsanıyor. AC5 kod ve testte karşılandı, dokümanda eksik (N2). AC6/AC7 testli. AC8 literal liste yok, tip kümesi testli, `structural.assembly` dışarıda. AC9 5 öğe silinmiş, yorumlar temiz. AC10 değişmedi (R1/R2/R4, 23 kayıt, bayat kayıt kontrolü). AC11 `strict: true` iki tsconfig'de. AC12 17 sıralı `@import`, yasaklı at-rule yok; hash eşitliği koordinatör beyanı. AC13 büyük ölçüde tamam (N2). AC14 g4'ün kendi değişiklikleri izinli yollarda; `nodeRegistry` varsayılanları ve mühendislik sabitleri aynı (abutment `[1,1,1,3,5,1,2,18]`, steel E/ν/ρ/γ, span 60/30/90); g4 dışı kök `README.md` ve `docs/e2e/` gözlem olarak not edildi. AC15 koordinatör beyanı.

## Test kanıtı ve sınırlar
Yeni testlerde `it.fails`/`skip`/`only` yok; `KNOWN_DIVERGENT` boş. P3-2 testleri üç temsilci tipi kapsıyor. "Preview resolver çağırmaz" yapısal olarak garanti (`preview`'a services parametresi yok). Chromium elle kontrolleri bekliyor (abutment ve superstructure düğüm renkleri, `mm` projede span değerleri, CSS görsel karşılaştırması, `—`/`·`/`…`).

## Not
N1 ve N2 tek satırlık düzeltmeler; koordinatör kabul edilebilir risk sayarsa PASS'e çevrilebilir. Düzeltme istenirse `refactor-implementer` ayrı ve açık bir komutla çağrılmalı (otomatik düzeltme yok).

---

# 1. tur (önceki): CHANGES_REQUESTED
P3-1..P3-6 yukarıdaki tabloda çözüldü olarak işaretlendi. Ayrıntılı 1. tur metni aşağıdadır.

# Review: g4 (A-04, A-08, A-11, A-12, A-13, A-14, A-15, A-16)

**Karar: CHANGES_REQUESTED** (yalnızca P3, engelleyici değil). P0/P1/P2 bulgu yok. Bu, özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- Baseline HEAD `a1e1684904b0b30b59a3e4fabccea29076026953` (güncel HEAD ile aynı). Review sonrası diff özeti (md5), izlenmeyen dosya özeti ve `git status` özeti değişmedi → review güncel.
- Okunan: 5709 satırlık diff'in tamamı (App.css ve silinen dosyalar için yalnızca saf silme/taşıma doğrulandı), `g4-status.txt`, 23 izlenmeyen dosya; tam okunan: `nodeRegistry.ts` (ilgili bölümler ve 1–323), `reactFlowAdapter.ts`, `App.css`, `previewExecutorParity.test.ts`, `layerRules.test.ts`, `sourceEncoding.test.ts`, `shared/ui/WorkspaceLayout.tsx`, `shared/lib/parameterSweep.ts`, `.editorconfig`, iki tsconfig, `package.json`, `superstructureCandidates.ts`, `familyResults.ts`. CSS parçalarından 01, 02, 17'nin ilk satırları örneklendi; parçalarda `@import`, `@charset`, `@layer`, `@font-face`, `@namespace` yok.
- Reviewer komut çalıştırmadı. Test/build/lint/hash sonuçları koordinatör ve implementer beyanıdır. Koordinatör ayrıca doğruladı: `npm test` 84 dosya/810 test; build OK; dist CSS sha256 baseline ile aynı; 17 CSS parçasının birleşimi sha256 `8f5f9107…c53349` / 325160 bayt (baseline'ın disk üzerindeki CRLF `App.css`'i ile aynı; `git show` LF 320953 bayt verir, beklenen autocrlf farkı); lint 66 uyarı (baseline 81); `backend`, `package*.json`, `graph/domain` diff'i boş.
- Elle Chromium kontrolleri yapılmadı.

## Bulgular
**P3-1: Superstructure'ın boş girder koruması kalktı; onaylı D1/D2 dışında belgelenmemiş önizleme farkı.** `frontend/src/features/graph/registry/nodeRegistry.ts:106` — superstructure artık `syncNode` kullanıyor (`preview` executor'ın kendisi); eski `previewDesignOutput` içindeki `if(!girder.length) return []` koruması silindi. Senaryo: girder bağlı değilken Deck Width/Girder Spacing/Slab geçersiz (NaN, boş alan) veya bağlı bir length girişi boş liste → eskiden önizleme hata vermeden `[]` dönerdi; şimdi `resolvedSuperstructureLength` → `normalizeCandidateInput` hata fırlatıyor (`pierCandidates.ts:13,16`), adapter yakalıyor ve düğüm Run'dan önce `executionState: 'error'` gösteriyor. Run ile tutarlı ama plan §3.1/AC5 bunu "belgelenmiş superstructure ön koşulu" olarak ayırmıştı; implementer raporu yalnızca "executor boş girder için `[]` döner" diyor, fırlatan durumu anmıyor; parite matrisinde geçersiz parametre hücresi yok. Öneri: davranışı D1/D2 kapsamında belgeleyip onay alın veya korumayı yalnızca preview'a geri koyup AC5 istisnası olarak testle sabitleyin; iki seçenekte de "girder yok + geçersiz deckWidth" test hücresi ekleyin.

**P3-2: Golden test refactor edilen malzeme çözücü yolunu kapsamıyor.** `nodeRegistry.ts:126,144,170` pier/cap/foundation executor'ları `resolveConcrete(…, services)` kullanıyor; golden yalnızca services'siz çalışıyor (`previewExecutorParity.test.ts:203`). Kod okumasıyla eski üçlü ifadeyle eşdeğer (string ise resolver, yoksa placeholder; nesne/undefined olduğu gibi), ama otomatik kanıt yok; `resolveConcreteMaterial` kullanan tek test material düğümünü sınıyor (`graphEngine.test.ts:208`). Öneri: sahte resolver ile pier/cap/foundation hücrelerini golden'a ekleyin (çözülmüş `fck` görünmeli).

**P3-3: `vitest-errors.txt` git durumu ile rapor/doküman arasında çelişki.** `g4-status.txt:35` `D  frontend/vitest-errors.txt` (index'te silinmiş, diskte duruyor); `implementation.md:44` ve `docs/architecture.md` A-16 / `docs/roadmap.md` "git rm --cached…" cümleleri dosyanın hâlâ izlendiğini söylüyor. Plan "Implementer git işlemi yapmaz" diyor; adımı kimin attığı belirsiz. Koordinatör notu: implementer raporu (teslim anında) dosyanın izlendiğini söylüyordu; staged silme implementer teslimi ile review anlığı arasında kullanıcı tarafından atılmış olabilir (koordinatör bu adımı atmadı). Öneri: adımı kimin attığını teyit edin, rapor ve doküman cümlelerini gerçek duruma göre düzeltin.

**P3-4: A-13 silmelerinden sonra yanlış kalan kod yorumları.** `frontend/src/app/App.tsx:46-47` hâlâ "The legacy Sidebar and TopBar sources remain available" diyor; diğer yorumlar: `app/navigation/sections.ts:12,24-25,59,133`, `app/components/BigMenuPanel.tsx:11`, `features/bridge-alternatives/model/types.ts:2`, `bridge-alternatives/components/GenerateWorkflow.tsx:18`, `features/project/components/ProjectPanel.tsx:28`. Yalnızca yanıltma riski; kod referansı, import ve `import()` yok. Öneri: en azından `App.tsx:46-47` ve `sections.ts:59,133`'ü düzeltin.

**P3-5: README'deki backend çağrı listesi eksik.** `frontend/README.md` TanStack Query için yalnızca layout, alternatives, fast solver ve LandXML'i sayıyor; loads (`useLoadGroups`, `useResolveTraffic`, `useSeismicSpectrum`, `useUniformTemperature`, `useLm1Defaults`) ve terrain-viewer hook'ları da `useQuery`/`useMutation` kullanıyor. Öneri: "e.g." ile örnek olduğunu belirtin veya listeyi tamamlayın.

**P3-6: `sourceEncoding` testindeki "bayat izin listesi" kontrolü zayıf.** `frontend/src/test/architecture/sourceEncoding.test.ts:57-59` yalnızca dosyanın var olduğunu kontrol ediyor, işaretçi içermeye devam ettiğini değil; `projectWorkspace.ts` eşleştiricileri bir gün kaldırılırsa izin listesi sessizce bayat kalır. Öneri: izinli her dosyada en az bir işaretçinin hâlâ bulunduğunu da doğrulayın.

## Belirsiz hipotezler (bulgu değil)
- Katman testinde yorum temizleme: `layerRules.test.ts:52` blok yorum regex'i string içindeki `/*` dizisine de eşleşir (ör. `'/src/**/*.ts'`); böyle bir string'den sonra gelen importlar görünmez kalabilir (false negative). Importlar dosya başında olduğu için pratik risk düşük; string içinde `/*` geçen satırdan sonra gelen import için fixture eklenebilir.
- Yalnızca göreli importlar kontrol ediliyor (`:93`); bugün path alias yok (`paths` tanımlı değil), ileride alias/`/src/...` importu kuralı atlatır.
- D1'in eski kayıtlara etkisi: precast/steel girder'da eksik span parametresi artık executor gibi davranıyor (NaN birim → hata); bu parametreler olmadan kaydedilmiş eski bir graph varsa önizleme Run'dan önce kırmızı görünür. Yüklemede varsayılanla dolduran bir mekanizma görülmedi; eski `.kopruq` örnekleriyle elle kontrol önerilir.

## Sapma değerlendirmeleri
- **D1 precast aday `id` anahtar sırası:** güvenli. Executor sırası (`H,tf,bf,w,th1,bh1,th2,bh2`) korunmuş; family snapshot'ları ve `candidateId` yalnızca executor sonucundan (`familyResults.ts:81-118`), fingerprint graph parametrelerinden üretiliyor; önizleme id'leri kalıcı veriye yazılmıyor. Kabul.
- **SystemAssemblyPanel kayıplı dizi → `'—'`:** yalnızca görüntü metni; K9 ile tutarlı; kabul, onaylanması önerilir.
- **`reactFlowAdapter.ts:89-95` `startsWith` çağrıları:** tip listesi değil, düğüm başına önizleme seçimi; AC8'in hedefi `:48` listesi kaldırılmış. Kabul.
- **Strict:** TS `~6.0.2` (`package.json:47`) ile varsayılan zaten true; açıkça yazmak zararsız ve geleceğe karşı koruyucu; `include: ["src"]` olduğu için testler de tip kontrolüne giriyor; `tsconfig.node.json` yalnızca `vite.config.ts`'i kapsıyor.
- **layerRules test-first kanıtı:** kırmızı durum testle değil envanter betiği ve geçici probe ile gösterilmiş; testin yeterliliği sentetik fixture'larla sağlanıyor (`:107-147`). Kabul.

## Kabul kriterleri
| AC | Değerlendirme |
|---|---|
| AC1 | Raporda var (implementer beyanı) |
| AC2 | Karşılandı (grep: yalnızca `projectWorkspace.ts` ve testinde işaret; `.editorconfig` doğru; roadmap U+FFFD düzeltilmiş) |
| AC3 | Kısmen: ignore satırı ve AGENTS.md tamam; dosyanın git durumu rapor/doküman ile çelişiyor (P3-3) |
| AC4 | Golden mekanizması anlamlı (80 hücre, cyrb53, `toEqual(GOLDEN)`; GOLDEN boşsa test kırılır); kayıt anının "refactor öncesi" olduğu doğrulanamaz; resolver yolu kapsanmıyor (P3-2) |
| AC5 | Kod gereği sağlanıyor (`syncNode`, ortak `compute`); superstructure istisnası farklı ele alınmış (P3-1) |
| AC6 | Testli (`:226-233`, `canonicalGirderLength`) |
| AC7 | Doğru alanlar ve bağlı girişler; adapter testi `idle`, `[]`, hata yok |
| AC8 | Literal liste yok; tip kümesi testi, `structural.assembly` dışarıda; önizlemede malzeme `placeholderConcrete` |
| AC9 | 5 öğe silinmiş, kod referansı yok; yorum referansları kalmış (P3-4) |
| AC10 | R1/R2/R4, bayat kayıt kontrolü ve izin listesi kapsamı doğru; taşımalar içerik olarak özdeş |
| AC11 | `strict: true` iki dosyada da var |
| AC12 | `App.css` başlık yorumu + 17 sıralı `@import`; yasaklı at-rule yok; bayt/hash eşitliği koordinatör beyanı |
| AC13 | Büyük ölçüde tamam; P3-4, P3-5 |
| AC14 | Diff yalnızca izinli yollarda; `package.json` diff'te yok; `nodeRegistry` varsayılanları ve sabitleri aynı |
| AC15 | 810/810, build, lint 66 (koordinatör beyanı) |

## Test kanıtı ve sınırlar
Yeni testlerde `it.fails`, `skip` veya `only` kalmamış; `KNOWN_DIVERGENT` boş. Parite matrisinin kapsamadıkları: geçersiz parametre durumları, services ile çalışma, Inspector/Shell üzerinden render edilen önizleme. Elle Chromium kontrolleri bekliyor: abutment düğümünün rengi, `mm` projede girder span değerleri, CSS bölünmesinden sonra görsel karşılaştırma, `—`, `·`, `…` görünümü.

## Not
En önemli iki madde P3-1 ve P3-3; diğerleri temizlik ve küçük test güçlendirmesi. Koordinatör P3'leri kabul edilebilir risk sayarsa PASS'e yükseltilebilir; düzeltme istenirse `refactor-implementer` ayrı ve açık bir komutla çağrılmalıdır (otomatik düzeltme yok).
