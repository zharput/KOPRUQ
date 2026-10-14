# Beşinci inceleme: backend-db-persistence-m4 (NF4–NF6 sonrası)

**Karar: PASS.** İncelenen kapsamda P0, P1, P2 veya P3 bulgu yok; yalnızca engelleyici olmayan nitler var. Bu sonuç özelliğin hatasız olduğu anlamına gelmez. Reviewer testleri çalıştırmadı; sonuçlar yalnızca kaynak okumasına dayanıyor.

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob). Önceki incelemeler: `review-1-pre-fix.md`, `review-2-pre-repair2.md`, `review-3-pre-nf.md`, `review-4-pre-nf4.md`.

## Kapsam ve sınırlar
- **Baseline:** `cab209cc6128c5a81658534115f18f335e4b3f2f` (HEAD ile aynı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `535f58f162dc48e04898e2dc952dabed450a87fe`; rapor bayat değil.
- **Not (durum):** Dördüncü incelemeden sonra `serverSection.ts`, `writeQueue.ts`, testleri ve `docs/architecture.md` bu oturumun implementer raporları dışındaki bir kaynaktan diskte değiştirilmiş (`implementation.md`'de "Fourth review follow-up: NF4–NF6 (2026-10-14)" bölümü var). Reviewer **güncel disk içeriğini** esas aldı. Koordinatörün güncel durumdaki koşusu: build çıkış 0, lint çıkış 0, `npm test` 102 dosya / 1042 test geçti (reviewer doğrulaması değil). `backend/`, `package.json` ve lock dosyası değişmedi.
- **Baştan sona okunanlar (bu turda tüm test dosyaları dahil):** `shared/project-store/{writeQueue,serverSection,projectSession,projectApi,projectDataValidation}.ts` ve beşinin `.test.ts` dosyası; `shared/api/http.ts`, `http.test.ts`; yedi mapper üretim kodu ve testleri; `app/project-session/{projectDocument,projectDocumentFixtures}.ts`, `projectDocument.test.ts`; `docs/architecture.md:3257-3277`; `roadmap.md:1921`; `implementation.md`, `review-4-pre-nf4.md`, `plan.md` AC1–AC21.
- **Backend karşılaştırması:** `FamilyDtos`, `FamilyCatalogMapper`, `GirderLibraryDto`, `PreferredSpanRuleDto`, `CrossSectionDto`, `FamiliesDto`, `LoadsDto`, `ProjectDocumentResponse`, `SectionWriteResponse`, `WorkspaceWriteResponse`, `SectionChecks`, enum'lar: sıra, null olabilme ve enum değerlerinde sapma yok.
- **Yapılamayanlar:** test/build/lint koşturmak; yeni testlerin eski kodda gerçekten kırıldığını görmek (untracked dosyaların önceki hâli yok, diff alınamadı); gerçek backend ile uçtan uca davranış (`%2F`, Jackson sırası).

## Önceki bulgular → durum
| Bulgu | Durum | Kanıt |
|---|---|---|
| NF4: `section.discard` | Çözüldü | `serverSection.ts` `discard` (:71-75): `drop`'tan önce `before = current`, `revert` yalnızca `current === before` ise. Test `serverSection.test.ts:125` eski kodda kırılırdı. |
| NF4: kuyruktaki `onDiscarded` kendi girdisine bakıyor | Çözüldü | Bölümde `onDiscarded: () => { if (current === updated) revert() }` (:98), koleksiyonda `current.get(id) === updated` (:192). N1 senaryoları yeniden izlendi; gerileme yok. |
| NF4: `queue.discard` yayın sırası | Çözüldü | `writeQueue.ts` `discard` (:203-212): `unstall` → geri çağırımlar → `publish`. Test `serverSection.test.ts:136`. |
| NF4: koleksiyon `discard` | Çözüldü | `entries` anlık görüntüsü reddedilmiş anahtarlar düşürülmeden önce alınıyor (:210-213); döngüde `current.get(id) !== before` ise atlanıyor (:216), `drop` sonrası tekrar kontrol (:218). Testler `:290`, `:300`. |
| NF5 | Çözüldü | Koleksiyon `hydrate` (:205-206) izlenen anahtarları `deps.queue.drop` ediyor. Test `:279`. D9 güncel. |
| NF6 | Çözüldü | Bölüm `write` (:94-102): `enqueue` fırlatırsa ve `current === updated` ise eski değer geri yükleniyor, hata yeniden fırlatılıyor. Koleksiyon (:183-197) tüm Map'i ve `listed`'i geri yüklüyor. Testler `:147`, `:314`. Kısmi batch yolu ayrıca akıl yürütmeyle incelendi: ikinci `enqueue` yalnızca bir dinleyici `dispose`/`end` yaptığında fırlar; ikisi de kuyruğu sıfırlar, birinci girdi kuyrukta kalmaz. |
| NF1–NF3 | Gerileme yok | `enqueue` → `notify` sırası (:97-103, :187-198), bayat batch girdisinin atlanması (:190), NF2 `writeQueue.ts:150`, NF3 `rejectedKeys` (:142, :178) |
| N1–N4, H1–H3, F1–F8 | Gerileme yok | N1 `discard` in-flight (:206-209); N2 `stale()` (:114); N3 `failures`/`drop` (:94-99, :199); N4 (:138-148); H1 `syncEpoch` (:178, :187); H2 `dispose` (:216-219); H3 `guard` (:80-82) ve `projectSession.set` try/catch; F1 (:156-157); F2 `confirm` (:59-66, :145-153); F5 `SectionEnvelopeError`; F7 `projectDocument.test.ts:72-114` |

## Yeni bulgular
P0–P3 düzeyinde yeni bulgu yok.

## Nitler ve doğrulanmamış hipotezler (engelleyici değil)
1. **`section.hydrate` ile `collection.hydrate` tutarsız** (`serverSection.ts:106-109`). NF5'ten sonra koleksiyon `hydrate` kuyruktaki yerel reddi düşürüyor, bölüm `hydrate` düşürmüyor. Bölümün yolu sabit olduğundan `section.discard()` reddi yine temizleyebilir; ama aynı epoch içinde `hydrate` sonrası kuyruk `rejected` kalıp diğer yazmaları durdurabilir. D8/D9 bu farkı belirtmiyor.
2. **`rejectedKeys` hiç budanmıyor.** Başarılı yazma, `retry`/`discard`/`reset` veya `begin` sonrasında set temizlenmiyor. Daha sonraki bir `hydrate`, bir zamanlar reddedilmiş bir anahtarın meşru bekleyen yazmasını düşürür. Yalnızca aynı epoch içinde, bekleyen yazma varken `hydrate` çağrılırsa; bu durum zaten tanımsız (hipotez).
3. **Review-3 nitleri hâlâ açık:** `setRevision` dinleyicisi içinde `begin`/`reset` yapılırsa `writeQueue.ts:119-130`'da `onConfirmed` yine çağrılıyor (`stale()` yeniden kontrol edilmiyor); `guard` `codec.fromWire` hatasını yutuyor (`confirmed` eski kalıyor, kuyruk `idle`); `AbortSignal` kullanılmıyor (`startNext` :116); `bridgeDefinitionWire.ts:49` yolunun sonunda nokta kalıyor (`axisAssignments.`, test de bunu doğruluyor).
4. **`queue.discard` geçici durum farkı.** Geri çağırımlar çalışırken session hâlâ eski durumu gösteriyor (ör. `conflict`), kuyruk temizlenmiş; bir bölüm dinleyicisi bu anda yanlış durumu okuyabilir. Geçici, veri kaybı yok.
5. **İki `discard` yolu farklı davranıyor.** `section.discard` yayını geri almadan önce yapıyor (session dinleyicisi atılan değeri görüp yeniden yazabiliyor); `queue.discard` önce geri alıyor. İki yolda da ayna ve kuyruk tutarlı.
6. **Kapatılmış kuyrukta yerel ret fırlatmıyor.** Bölüm `write`, yerel ret yolunda `reportLocalRejection` çağırıp `false` dönüyor; `enqueue` ise fırlatıyor. Zararsız ama tutarsız.
7. **Test başlığı fazla iddialı.** `serverSection.test.ts:314` "partial graph batch" diyor ama fırlatma ilk öğede oluyor; kısmi batch yolu test edilmiyor (kod akıl yürütmeye göre doğru).
8. **Yayın sırası için doğrudan test yok.** `writeQueue.test.ts`'de `queue.discard` sırasını doğrudan sınayan test yok; yalnızca `serverSection.test.ts:136` üzerinden dolaylı.

## Test değerlendirmesi
- **Yeni testler (8):** `serverSection.test.ts:86, 125, 136, 147, 279, 290, 300, 314`. Akıl yürütmeyle: `:125`, `:290` eski `discard`'da; `:136` eski yayın sırasında; `:279` eski `hydrate`'te; `:147`, `:314` eski `write`'ta; `:300` eski koleksiyon `discard`'ında kırılır. `:86` eski kodda da geçebilir (NF1 sonrası davranış; anlamlı regresyon kilidi). Totolojik test yok.
- **Önceden var olan testler:** beklenti değişikliği izi görülmedi (dosyalar untracked olduğundan diff ile doğrulanamadı).
- **Sayım:** 1034 + 8 = 1042; koordinatörün koşusuyla tutarlı.

## AC kapsamı (tüm test dosyaları okundu)
| AC | Kanıt | Durum |
|---|---|---|
| AC1 | `http.test.ts:32-44` | Karşılandı |
| AC2 | `projectApi.test.ts:15-74` | Karşılandı |
| AC3 | `projectDataValidation.test.ts:12-33` | Karşılandı |
| AC4–AC6 | `writeQueue.test.ts:35-87` | Karşılandı |
| AC7 | `writeQueue.test.ts:91-103`; ayna geri alma `serverSection.test.ts:116` | Karşılandı |
| AC8 | `writeQueue.test.ts:104-122` | Karşılandı |
| AC9 | `writeQueue.test.ts:123-144` | Karşılandı |
| AC10 | `writeQueue.test.ts:166-182` | Karşılandı |
| AC11 | `writeQueue.test.ts:154-162`, `:190-198` | Karşılandı |
| AC12 | `serverSection.test.ts` (bölüm, koleksiyon, discard/N1 grupları) | Karşılandı |
| AC13 | 7 mapper testi; istisnalar açıkça doğrulanıyor | Karşılandı |
| AC14 | `Object.keys` sıra testleri, `extra`/UI-only alanlar yok | Karşılandı |
| AC15 | strict ret, `H_TYPE`/`WALL` kabul, null ile `[]` ayrı | Karşılandı |
| AC16 | workspace id, `keyBy`, boş axis id, graph parametresi testleri | Karşılandı |
| AC17 | `projectDocument.test.ts:13-134` (storage/event spy dahil) | Karşılandı |
| AC18 | `projectDocument.test.ts:138-152` | Karşılandı |
| AC19 | grep: `project-store` yalnızca `*Wire(.test).ts` ve `app/project-session` içinde | Karşılandı (kaynak) |
| AC20 | `shared/project-store` içinde `features/`/`app/` import'u ve storage kullanımı yok (grep); layer testleri reviewer tarafından koşturulmadı | Karşılandı (kaynak) |
| AC21 | Build/test/lint koordinatörün raporu; architecture M4 bölümü var; `roadmap.md:1921` M4 `[x]` | Raporlandı |

**Wire ve kurallar:** Mapper'lar backend record sırasıyla uyumlu. Üretim kodunda mühendislik değeri uydurulmamış; fixture'lardaki sayılar test verisi. Tarayıcı storage'ı kullanılmıyor, katman kuralı korunuyor.

## implementation.md ile kod arasındaki tutarsızlıklar
1. "Fourth review follow-up" bölümü "their two test files" diyor ama NF4–NF6 için eklenen 8 testin hepsi `serverSection.test.ts`'de; `writeQueue.test.ts`'de NF4/NF6 etiketli ya da yayın sırasını sınayan test yok (dosyanın değişip değişmediği doğrulanamadı).
2. Üst bölümdeki "979 tests", "No independent review has run" ve AC12 satırı ("8 ServerSection + 5 collection") bayat; belge bunları "historical snapshot" olarak işaretliyor.
3. "Second repair round"daki "queue must be created before any session listener…" ve "a session listener that throws inside `publish` is not guarded" artık geçersiz (tarihsel).
4. "Deviations"da yerel koleksiyon reddi yalnızca `graphs/<id>` altında anlatılıyor; sentinel `graphs[i]` eksik (tarihsel).
5. NF4–NF6 iddiaları kodla uyumlu; architecture D7(c), D8, D9 kodla uyumlu; D8/D9 bölüm `hydrate`'in yerel reddi temizlemediğini belirtmiyor (Nit 1).

## Doğrulayamadıklarım
- Test, build ve lint sonuçları; yeni testlerin eski kodda gerçekten başarısız olduğu; gerçek backend ile uçtan uca yol (`%2F`'in Tomcat'te reddi, Jackson anahtar sırası); re-entrant session dinleyicisi senaryolarının M5'te pratikte oluşup oluşmayacağı.
