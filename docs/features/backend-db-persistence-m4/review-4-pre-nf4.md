# Dördüncü inceleme: backend-db-persistence-m4 (NF1–NF3 sonrası)

**Karar: CHANGES_REQUESTED** — yalnızca P3 bulgular; P0, P1 veya P2 bulunmadı. NF1, NF2 ve NF3 kaynak okumasına göre çözülmüş; N1–N4, H1–H3 ve F1–F8'de gerileme görülmedi. Kalan P3'ler sınır durumlar; kullanıcı açıkça kabul ederse M5 notu olarak ertelenebilir. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob; test, build veya lint koşturmadı). Önceki incelemeler: `review-1-pre-fix.md`, `review-2-pre-repair2.md`, `review-3-pre-nf.md`.

## Kapsam ve sınırlar
- **Baseline:** `cab209cc6128c5a81658534115f18f335e4b3f2f` (HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `08f3848722f4d2d2eaacf52856f9e5946c4e50a6`; rapor bayat değil.
- **Not (durum):** Üçüncü incelemeden sonra `serverSection.ts`, `writeQueue.ts`, testleri ve `docs/architecture.md` bu oturumun implementer raporları dışındaki bir kaynaktan diskte değiştirilmiş (`implementation.md`'de "Third review follow-up: NF1–NF3 (2026-10-14)" bölümü var). Reviewer **güncel dosya içeriğini** esas aldı. Koordinatörün bu güncel durumdaki koşusu: build çıkış 0, lint çıkış 0, `npm test` 102 dosya / 1034 test geçti (reviewer doğrulaması değil).
- **Tamamı okunanlar:** `shared/project-store/{writeQueue,serverSection,projectSession,projectApi,projectDataValidation}.ts`; `writeQueue.test.ts`, `serverSection.test.ts`, `projectSession.test.ts`; `shared/api/http.ts`, `http.test.ts`; 7 wire mapper üretim kodu; `app/project-session/projectDocument.ts`, `projectDocument.test.ts`; `docs/architecture.md:3257-3277`; `implementation.md`; `review-3-pre-nf.md`. Backend spot-check: `BridgeDefinitionsDto`, `GraphDtos`, `LoadInputDtos`, `WorkspaceDto` (sapma yok).
- **Bu turda tam okunmayanlar (kapsam sınırı):** `projectApi.test.ts`, `projectDataValidation.test.ts`, 7 mapper `.test.ts`, `projectDocumentFixtures.ts`, `roadmap.md` (koordinatöre göre üçüncü incelemeden beri değişmedi; üçüncü inceleme okumuştu).
- **Çalıştırılmayanlar:** test/build/lint; "yeni test eski kodda başarısız olur" sonuçları yalnızca kaynak okumasına dayanıyor.

## Önceki bulgular → durum
| Bulgu | Durum | Kanıt |
|---|---|---|
| NF1 | Çözüldü | `serverSection.ts` `createServerSection.write`: `current = …` (:90) → `enqueue` (:91) → `notify()` (:92). Koleksiyon `write`: `current.set` + `refresh` (:172-173) → `enqueue` döngüsü, bayat girdiyi atlıyor (`if (!same(current.get(id)?.wire, wire)) continue`, :175) → `notify()` (:179). `createListeners().notify` her dinleyiciyi try/catch ile çağırıyor (:44-48). |
| NF2 | Çözüldü | `writeQueue.ts` :149-150: `inFlightDropped` ve `statusOf(error)==='conflict'` ise `stall(entry.key, error)`, yeniden kuyruğa alma yok. Testler `writeQueue.test.ts:341-353` (drop ve discard). |
| NF3 | Çözüldü (hydrate kenarı: NF5) | Koleksiyon `rejectedKeys` (:131, :167); `discard` önce bunları `drop` ediyor (:188-189); `hydrate` seti temizliyor (:185). Testler `serverSection.test.ts:227-239`, `:323-331`. |
| Nitler (review-3) | İşlenmemiş | AbortSignal yok (`startNext` :116); `guard` `fromWire` hatasını yutuyor; `setRevision` dinleyicisi içinde `reset` yapılırsa `onConfirmed` yine çağrılıyor (:118-130); aynı key'e çift `onDiscarded`; eşzamanlı `retry`; `bridgeDefinitionWire.ts:49` sondaki nokta |
| F1–F8 | Gerileme yok | `writeQueue.ts` :156-158, :94-98, :196-202; `serverSection.ts` `confirm` (:59-66, :134-142); `projectApi.ts` `SectionEnvelopeError`; `projectDocument.test.ts:72-114`; architecture D3 |
| N1–N4 | Gerileme yok | N1: `discard` :206-209; N2: `stale()` :114; N3: `failures`/`drop` :199; N4: :138-148; testler duruyor |
| H1–H3 | Gerileme yok; H3 artık bölüm dinleyicileri için de geçerli | `syncEpoch` `enqueue`/`reportLocalRejection` içinde (:178, :187); `dispose` (:215-218); `projectSession.set` try/catch (:38-40); `guard` (:80-82) |

## Yeni bulgular (önem sırasıyla)

### NF4 — P3 — `drop`/`discard` aynayı geri almadan önce yayın yapıyor; o sırada yazan bir session dinleyicisinin değeri kuyrukta kalıyor ama ayna geri alınıyor
- **Dosyalar:** `serverSection.ts:71` (`discard = () => { deps.queue.drop(path); revert() }`); koleksiyon `discard` `serverSection.ts:190`; `writeQueue.ts:200` (`drop` → `publish()`); `writeQueue.ts:208-210` (`discard` önce `unstall(); publish()`, `onDiscarded` geri çağırımları sonra).
- **Senaryo:** (1) S'de v bekliyor. (2) `section.discard()` → `drop(path)` → `publish()` (saving→idle) → session dinleyicisi aynı bölüme v' yazıyor; `current` hâlâ v olduğu için yazma no-op olmuyor: `current = v'` ve `enqueue(v')`. (3) `drop` dönünce `revert()` çalışıyor: `current = confirmed`.
- **Sonuç:** Ayna confirmed değeri, kuyruk v' tutuyor. Başarıda `confirm` (`current === confirmed`) v''yi benimsediği için toparlanıyor; başarısızlıkta (500, ağ) kuyruk v' ile takılı kalıyor, UI confirmed değeri gösteriyor. Kullanıcı confirmed değeri yazarsa `same()` no-op, `retry` ise kullanıcının görmediği v''yi gönderiyor. `queue.discard()` için de aynı sınıf durum var: `publish` içinde yazılan girdi yeni `pending`'e giriyor, ardından eski girdinin `onDiscarded` → `revert` çağrısı aynayı ezip geçiyor.
- **Etki:** Ayna ile kuyruk geçici, başarısızlıkta kalıcı ayrışıyor (NF1'in discard yolundaki karşılığı). Durum değişince senkron yazan bir session dinleyicisi gerektiriyor; M4'te böyle bir tüketici yok.
- **Öneri:** `ServerSection.discard`'da `drop`'tan önce `const before = current` alın; `revert` yalnızca `current === before` ise yapılsın; koleksiyonda id başına aynısı. `queue.discard`'da `publish()` geri çağırımlardan sonraya alınsın. Test: session dinleyicisi `drop`/`discard` sırasında aynı bölüme yazıyor.

### NF5 — P3 — Koleksiyon `hydrate` `rejectedKeys`'i temizliyor ama kuyruktaki reddi düşürmüyor
- **Dosya:** `serverSection.ts:185` (`rejectedKeys.clear()`, `drop` yok).
- **Senaryo:** Yeni graph `graphs/new` yerel olarak reddediliyor. Ardından `begin` olmadan `collection.hydrate(list)` çağrılıyor (epoch değişmediği için kuyruk sıfırlanmıyor). Sonraki `collection.discard()` `graphs/new`'i artık bilmiyor; kuyruk `rejected` kalıyor, çıkış yalnızca global `retry`/`discard`.
- **Etki:** NF3 sözleşmesinde küçük delik; M5 hydrate'i yalnızca `begin` sonrası çağırırsa ortaya çıkmaz.
- **Öneri:** `hydrate`'te temizlemeden önce izlenen anahtarları `deps.queue.drop` edin ya da "hydrate yalnızca begin/reset sonrası" kuralını arayüz yorumunda ve D9'da belgeleyin.

### NF6 — P3 — Kapatılmış kuyrukta `enqueue` fırlatınca ayna güncellenmiş kalıyor
- **Dosya:** `serverSection.ts:90-91` (`current` atanıyor, sonra `enqueue` `'Write queue disposed'` fırlatıyor); koleksiyon :172-177 (tüm `current.set` yapıldıktan sonra döngüde fırlatma).
- **Senaryo:** M5'te dispose edilmiş bir kuyruğa bağlı bölüme yazılıyor.
- **Sonuç:** Ayna kuyrukta olmayan bir değer tutuyor; dinleyicilere bildirim gitmiyor; koleksiyonda yarım kalmış batch.
- **Etki:** Yaşam döngüsü hatasının sessiz ayrışmaya dönüşmesi. NF1 öncesinde de vardı; yalnızca bildirim sırası değişti.
- **Öneri:** `enqueue` hatasında `current`'ı eski değere geri alın ya da `write` başında disposed kontrolü yapın.

## Nitler / doğrulanmamış hipotezler
- NF1 için ServerSection'da **session** dinleyicisinin `enqueue` → `publish` sırasında aynı bölüme yazdığı yol test edilmemiş; yalnızca koleksiyonda var (`serverSection.test.ts:200-216`). Kod okumasına göre doğru davranıyor.
- `syncEpoch` → `reset` → `publish` push'tan önce çalışıyor; `begin`/`end` snapshot'ı zaten CLEAN olduğundan `set` eşitlik kontrolüyle bildirim yapmıyor; bu yoldan re-entrant ezme pratikte oluşmuyor.
- Koleksiyonda iç yazma B'yi tam confirmed değerine çekerse gereksiz bir PUT oluşuyor; veri kaybı yok.
- `serverSection.ts:119`: koleksiyon `discard` yorumu yerel reddi temizlediğini söylemiyor (D9 söylüyor).
- Review-3 nitleri (yukarıdaki tabloda) hiçbiri değişmemiş.

## Test değerlendirmesi
- **Eski (NF öncesi) kodda başarısız olacak testler** (kaynak akıl yürütmesiyle): `serverSection.test.ts:74` (eski kodda dış `enqueue(v1)` iç v2'nin üstüne yazar), `:86` ve `:217` (korumasız `notify` fırlatır), `:189`, `:227` (yeni graph yolu düşürülmez), `:323-331` uzatması (sentinel düşürülmez); `writeQueue.test.ts:341-353` (eskiden `idle`).
- Ek test `:200-216` eski kodda başarısız olurdu; atlama satırı (:175) kaldırılırsa yeni kodda da başarısız olur: anlamlı, totoloji değil.
- Önceden var olan testlerde yalnızca `:323-331` uzatıldı (`discard` + `idle` beklentisi eklendi): meşru. Başka beklenti değişikliği izi yok. Totolojik test bulunmadı.
- **Eksik testler:** NF4, NF5, NF6 ve ServerSection için session dinleyicisi yolu.
- Sayım: 1026 + 8 = 1034, raporla tutarlı (koordinatörün koşusu).

## AC kapsamı
| AC | Kanıt | Durum |
|---|---|---|
| AC1 | `http.ts` `putJson`, `http.test.ts:32-44` | Karşılandı |
| AC2 | `projectApi.ts`; testi bu turda okunmadı (review-3 doğrulamıştı) | Karşılandı (önceki) |
| AC3 | `projectDataValidation.ts`; test önceki turda doğrulandı | Karşılandı (önceki) |
| AC4–AC6 | `writeQueue.test.ts:34-88`, F1 `:201-234` | Karşılandı |
| AC7 | `:91-103`, F4/N3, NF2 `:341-353` | Karşılandı |
| AC8–AC9 | `:104-144` | Karşılandı |
| AC10 | `:166-182`, N1/N4 flush | Karşılandı |
| AC11 | `:190-198`, `:154-162`, N2 | Karşılandı |
| AC12 | `serverSection.test.ts` (11 bölüm + 9 koleksiyon + discard/N1 grupları) | Karşılandı; NF4/NF5 kenar durumları açık |
| AC13–AC16 | 7 mapper (üretim kodu okundu, testler önceki turda) | Karşılandı (önceki) |
| AC17–AC18 | `projectDocument.test.ts` | Karşılandı |
| AC19 | `project-store` yalnızca `*Wire.ts`, `projectDocument.ts` ve testlerinde import ediliyor (grep) | Karşılandı |
| AC20 | `shared/project-store` içinde `features/`/`app/` import'u ve storage kullanımı yok (grep); layer testi reviewer tarafından koşturulmadı | Karşılandı (kaynak) |
| AC21 | Build/test/lint koordinatörce raporlandı; architecture M4 güncel; roadmap okunmadı | Raporlandı |

**Wire ve kurallar:** Mapper'lar backend record sırasıyla uyumlu; mühendislik değeri uydurulmamış; tarayıcı storage'ı kullanılmıyor; katman kuralı korunuyor.

## implementation.md ile kod arasındaki tutarsızlıklar
1. Üst bölüm (979 test, "No independent review has run") ve AC12 satırı ("8 ServerSection + 5 collection tests") bayat; NF bölümü bunları "historical snapshot" olarak işaretliyor.
2. "Second repair round → Visible to M5: the queue must be created before any session listener…" ve "Remaining risks: a session listener that throws inside `publish` is not guarded" artık geçersiz (H1/H3 follow-up ile aşıldı, tarihsel).
3. "Deviations: a local collection rejection … under `graphs/<id>`" eksik: sentinel `graphs[i]` de var (tarihsel).
4. NF1–NF3 bölümü kodla uyumlu; architecture.md D7 (c)/(e)/(f), D8 ve D9 kodla uyumlu; D9 hydrate–rejectedKeys etkileşimini (NF5) belirtmiyor.
5. Raporda "eski kodda başarısız olan 8 senaryo" iddiası var; reviewer'ın akıl yürütmesi uyumlu ama koşturulmadı.

## Doğrulayamadıklarım
- Test, build ve lint sonuçları; yeni testlerin eski kodda gerçekten kırıldığı; bu turda tam okunmayan test/fixture dosyaları ve `roadmap.md`; gerçek backend ile uçtan uca davranış (`%2F`, Jackson sırası); NF4'ün pratikte tetiklenip tetiklenmeyeceği (M5'teki dinleyici tasarımına bağlı).
