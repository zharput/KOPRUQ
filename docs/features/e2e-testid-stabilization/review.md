# Review: e2e-testid-stabilization

Bağımsız feature-reviewer raporu (salt-okunur, komut çalıştırmadı). Kapsam: baseline HEAD `e06e7a0` = güncel HEAD; `review-input-full.diff` (639 satır) ve değişen kaynak dosyalar; yeni izlenmeyen kaynak dosya yok. Koordinatör inceleme sonrası `git status`'u karşılaştırdı: çalışma alanı inceleme sırasında değişmedi (rapor güncel).

## Sınırlar
Reviewer komut çalıştırmadı. vitest 1183/1183, lint, `tsc -b`, `tsc -p tsconfig.e2e.json` ve e2e 19/19 sonuçları yalnızca implementer'ın raporudur. Üçüncü parti davranışı kaynaktan doğrulandı: `@xyflow/react` `index.mjs:2356` node wrapper'a `...node.domAttributes` yayar; `types/nodes.d.ts:24` tip `Omit<HTMLAttributes<HTMLDivElement>, ...>`; `recharts` `ResponsiveContainer.js:140-151` kalan prop'ları kök `div`'e yayar. Bu rapor feature'ın hatasız olduğu anlamına gelmez.

## Verdict: PASS (APPROVED)
P0-P2 bulgu yok. İki P3 not var.

## Bulgular
**F1 - P3 - `frontend/e2e/12-malzeme-katalogu.spec.ts:127`:** `readRows` içinde `element: tr.querySelectorAll('td')[1].textContent` konuma dayalı okuma olarak kalmış. MaterialsPanel'de "No" sütunu kaldırılır/sütun sırası değişirse `element` yanlış hücreden okunur; "Diğer 7 satır değişmez" karşılaştırması iki tarafta aynı yanlış hücreyi okuyacağı için yine geçer, bozulma sessiz kalır. AC1 yalnız `table.spn-table` kullanılmamasını istediği için plana aykırı değil. Öneri: kabul edilebilir; istenirse `materials-element-<id>` eklenebilir veya konumsal okuma yorumla belgelenir.

**F2 - P3 - `docs/roadmap.md` (yeni bölüm):** "No behaviour, text, class or DOM change." ifadesi fazla iddialı (`data-testid` DOM'a öznitelik ekler). `docs/architecture.md` aynı şeyi doğru yazar ("No DOM structure ... changed"). Öneri: "No DOM structure change (attributes only)".

## AC değerlendirmesi
- AC1 Materials: karşılandı. `row.id` tekil, `key={row.no}` değişmedi; iddialar zayıflamamış (`toHaveCount(8)`, `toContainText`, id anahtarlı karşılaştırma). Tek kayıp "ilk satır Drilled piles" sıra kontrolü (id anahtarlı geçişin bilinçli sonucu).
- AC2 Aralıklar: karşılandı. İki `RangeField` kopyası da isteğe bağlı `testId` alır; `undefined` değer attribute yazmaz; başka `RangeField` tanımı/çağrısı yok; spec 09/11'de `.spn-range-` yok.
- AC3 Self Weight: karşılandı. `FormulaRow.testKey` zorunlu, 7 çağrının hepsine verilmiş, başka `FormulaRow` tanımı yok; 9 satır, 8 sonuç; `selfWeightResult` tipi `concrete`'i dışlar; sınıflar korunduğu için `LoadsUnits.test.tsx` etkilenmez.
- AC4 Wind: karşılandı. `Summary` bir kez render edilir (strict mode çakışması yok).
- AC5 Temperature: karşılandı. Virgüllü seçici belge sırasıyla döner (concrete-con, concrete-exp, steel-con, steel-exp), eski `td:nth-child(2), td:nth-child(3)` sırasıyla aynı.
- AC6 LM1: karşılandı. `rowKey` yerel string; anahtarlar tekil; spec 06'daki yeni satır kapsamlı locator eşdeğer (satırda tek textbox); kaldırılan `row` değişkeni başka yerde kullanılmıyor.
- AC7 Graph: karşılandı. `domAttributes` wrapper'a yayılır; `FlowGraphNode = Node<GraphNodeViewData,'kopruq'>` doğru tip; `as` dönüşümü karşılaştırılabilirlik kontrolünde excess-property'ye takılmaz (derlendiği implementer raporunda); grup düğümleri adapter'dan geçmez; `graph-node-` önekli başka `data-testid` yok; production `GraphWorkspace.tsx:186,194` `.react-flow__node[data-id]` okumaya devam eder (değişmemesi doğru); `e2e/**` içinde `react-flow__node` ve `data-id` kalmamış.
- AC8 Seismic: karşılandı. Eğri kutu içinde aranır, 1. adıma `toBeVisible` eklenmiş.
- AC9 Davranış değişmez: karşılandı. `src` diff'i yalnız öznitelikler, iki prop, `domAttributes` ve bir yerel `rowKey`; CSS/package.json/backend/.github/playwright.config.ts değişikliği yok; yeni `aria-label` yok; CSS'teki `data-testid` seçicileriyle çakışma yok.
- AC10 Kontroller: yalnız raporlanan; kaynak incelemesinde lint/tip hatası üretecek bir şey görülmedi (`Locator` hâlâ kullanılıyor, yeni import'lar kullanılıyor, `byId`/`exceptDrilledPiles` kullanılıyor).
- AC11 Belgeler: karşılandı (F2 hariç). Plan bölüm 6 seçicilerine dokunulmamış (spec 09:36, 16:31/46, 06:27 yerinde).

## Belirsiz konular
- `previewExecutorParity.test.ts`, `BaseNode.test.tsx`, `EngineeringNodeShell.test.tsx` tek tek okunmadı; `domAttributes` bir `toEqual`/`toStrictEqual` karşılaştırmasını bozabilir mi bakılmadı (implementer 1183/1183 bildirdi).
- `NodeWrapper` memo'lu; `domAttributes` her projeksiyonda yeni nesne ama node nesnesi de zaten her projeksiyonda yeniden oluşuyor; ek render maliyeti beklenmiyor, ölçülmedi.
- Kodla ilgisiz not: `implementation.md`'ye göre temizlikte komut satırında jar adı geçen iki java süreci durduruldu; birinin implementer'a ait olduğu doğrulanamadı. Yerelde başka bir backend çalışıyorduysa kapanmış olabilir.

## Kullanıcının elle doğrulaması gerekenler
1. `frontend/` içinde `npm test`, `npm run lint`, `npm run build` (özellikle `domAttributes` tip dönüşümünün derlendiği).
2. `npm run test:e2e` ile 19/19; istenirse spec 05 için `--repeat-each=2`.
3. Bir graph grubu oluşturup DevTools'ta grup wrapper'ında `data-testid` olmadığını, kopruq düğümlerinde `graph-node-<id>` olduğunu görmek.
4. GitHub CI'daki `e2e` job'ının yeşil olduğu.
