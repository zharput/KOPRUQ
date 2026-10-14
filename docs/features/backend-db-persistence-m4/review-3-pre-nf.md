# Üçüncü inceleme: backend-db-persistence-m4 (ikinci onarım turu ve son disk düzenlemeleri dahil)

**Karar: CHANGES_REQUESTED**

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob; test, build veya lint koşturmadı). Önceki incelemeler: `review-1-pre-fix.md`, `review-2-pre-repair2.md`. Bir P2 bulgusu var (NF1). Önceki bulguların (N1–N4, H1–H3, F7 boşluğu, sentinel anahtar) hepsi kaynak okumasına göre çözülmüş; F1–F8'de gerileme görülmedi. Bu sonuç özelliğin hatasız olduğu anlamına gelmez.

## Kapsam ve sınırlar
- **Baseline:** `cab209cc6128c5a81658534115f18f335e4b3f2f` (HEAD ile aynı; koordinatör doğruladı). Çalışma ağacı anlık görüntüsü (uygulama dosyaları, `docs/features/**` hariç) inceleme öncesi ve sonrası aynı: `fce52e4e83a181ee2611357fabda5b5105d94db9`; rapor bayat değil.
- **Not (durum):** İkinci onarım turu raporlandıktan sonra `writeQueue.ts`, `projectSession.ts`, ilgili testleri ve `docs/architecture.md` implementer raporları dışında bir kaynaktan diskte yeniden düzenlenmiş (test sayısı 1023 → 1026; `implementation.md`'de "H1/H3 follow-up" bölümü var). Reviewer **güncel dosya içeriğini** esas aldı. Koordinatör bu güncel durumda build (çıkış 0), lint (çıkış 0), `npm test` (102 dosya / 1026 test) koştu.
- **Reviewer'ın okuduğu:** iş akışı belgeleri, request.md, plan.md, implementation.md (tamamı), önceki iki review, state.json; `shared/project-store/{projectApi,projectDataValidation,projectSession,serverSection,writeQueue}.ts` ve testleri, 7 wire mapper ve testleri, `app/project-session/*` ve `projectDocument.test.ts`, `shared/api/http.ts`, `architecture.md:3257-3277`; `http.test.ts` ve `roadmap.md` kısmen. Backend spot-check: `FamilyDtos`, `GraphDtos`, `LoadInputDtos`, `SectionWriteResponse` (sapma yok).
- **Doğrulanmayanlar:** test/build/lint reviewer tarafından çalıştırılmadı; yeni testlerin eski kodda başarısız olacağı yalnızca kaynak okumasıyla çıkarıldı; gerçek backend ile uçtan uca (Jackson alan sırası, `%2F`, `1.0` biçimi); vitest sahte zamanlayıcı ayrıntıları.

## Önceki bulgular → durum
| Bulgu | Durum | Kanıt |
|---|---|---|
| F1 | Çözüldü, gerileme yok | `writeQueue.ts` hata dalı + `enqueue` ayıklama; `writeQueue.test.ts:201-234` |
| F2 | Çözüldü | `serverSection.ts` `confirm` (`current === confirmed` → sunucu değeri); koleksiyonda `!now \|\| … \|\| now === confirmed.get(id)` |
| F3 | Çözüldü | `drop(key)`; `ServerSection.discard` = `drop` + `revert`; koleksiyon `discard` her id için `drop`. Kenar durum: NF3 |
| F4 | Çözüldü | `stall()` conflict yalnızca conflict ile değişir; `shown()` önce conflict; `drop` conflict'i silmez |
| F5 | Çözüldü | `projectApi.ts` `SectionEnvelopeError`; kuyrukta okunabilir revizyon uygulanır |
| F6 | Çözüldü (N2 ile) | `syncEpoch` + `stale()` epoch karşılaştırması |
| F7 | Çözüldü | `projectDocument.test.ts:72-97` (16 bölüm + graph'lar `JSON.stringify` eşitliği), `:98-114`; `bridgeDefinitionWire.test.ts:108-127` |
| F8 | Çözüldü | `architecture.md:3269` D3 tam |
| N1 | Çözüldü | `writeQueue.ts` `discard`: uçuştaki girdiye `onDiscarded`; hata dalında `inFlightDropped` yeniden kuyruğa almıyor; başarıda `confirm` benimsiyor. Testler `writeQueue.test.ts:183-189, 329-338`; `serverSection.test.ts:230-246, 256-286` |
| N2 | Çözüldü | `projectSession.ts` `epoch`; `writeQueue.ts` `syncEpoch` + `stale()`. Testler `:341-369` |
| N3 | Çözüldü | `failures` sıralı liste; `drop` yalnızca o anahtarın conflict olmayan kaydını siler; `retry`/`discard`/`reset` → `unstall`. Testler `:392-416` |
| N4 | Çözüldü | okunabilir revizyonda `setRevision` + `onConfirmed` + `stall`; null revizyon + `inFlightDropped` → `stall`. Testler `:419-439` (`:433` regresyon kilidi) |
| H1 | Çözüldü (kodla da) | `enqueue` ve `reportLocalRejection` önce `syncEpoch()` çağırıyor. Test `:371-390` |
| H2 | Çözüldü | `dispose()`: `reset` + `disposed` + `unsubscribe`; `publish` no-op; `enqueue` fırlatır. Test `:473-486` |
| H3 | Kuyruk ve session için çözüldü; ServerSection dinleyicileri için **çözülmedi (NF1)** | `guard()` ve `projectSession.set` try/catch; ama `serverSection.ts` `createListeners().notify` korumasız |
| Koleksiyon `idOf` sentinel | Çözüldü | `failedKey = \`${definition.id}[${index}]\``; test `serverSection.test.ts:247-253` |

## Yeni bulgular (önem sırasıyla)

### NF1 — P2 — `write` önce bildiriyor, sonra kuyruğa ekliyor: aynı bölüme eşzamanlı yazan dinleyici eski değeri gönderiyor, ayna sessizce ayrışıyor
- **Dosya:** `frontend/src/shared/project-store/serverSection.ts` — `createServerSection` → `write`: `current = { wire, value: next }; notify(); deps.queue.enqueue({ … wire … })`; `createServerSectionCollection` → `write`: `refresh(); notify();` ardından `enqueue` döngüsü.
- **Senaryo:** (1) K'ya `write(v1)`: `current = v1`, ardından `notify()`. (2) Bir abone (ör. M5'te normalleştiren/uzlaştıran bir store reaksiyonu) bildirim içinde aynı bölüme `write(v2)` yapıyor: `current = v2` ve `enqueue(K=v2)`. (3) Dış çağrı devam edip `enqueue(K=v1)` çağırıyor; birleştirme (`pending[index] = write`) daha yeni v2'nin üstüne eski v1'i yazıyor. (4) v1 gönderilip 200 gelince `confirm`'de `current.wire (v2) ≠ sent (v1)` ve `current !== confirmed` olduğundan yalnızca `confirmed = v1`.
- **Etki:** UI v2 gösteriyor, sunucuda v1 var, kuyruk boş, durum `idle`, hata yok. v2'yi tekrar yazmak `same(wire, current.wire)` nedeniyle no-op. Sessiz veri kaybı; yeniden yüklemede görülür.
- **İkinci yol:** Abone istisna fırlatırsa `notify` korumasız olduğundan `enqueue` hiç çağrılmıyor ve istisna `write` çağıranına yayılıyor: ayna v1, kuyrukta girdi yok, durum `idle`.
- **Not:** `implementation.md` "listener exceptions are logged, not thrown" diyor; bu ServerSection/koleksiyon dinleyicileri için doğru değil.
- **Önerilen düzeltme:** İki yerde de `enqueue`'yu `notify()`'dan önce çağırın (iç yazma sonra birleşir, en yeni değer kazanır). İsteğe bağlı: `createListeners().notify` her dinleyiciyi session'daki gibi try/catch ile izole etsin. Test ekleyin: dinleyici aynı bölüme yazıyor; dinleyici istisna fırlatıyor.

### NF2 — P3 — `queue.discard()`/`drop` sonrası uçuştaki isteğe gelen 409 sessizce yutuluyor
- **Dosya:** `writeQueue.ts`, hata dalı `else if (inFlightDropped) { publish(); … return }`.
- **Senaryo:** K uçuşta; kullanıcı vazgeçiyor (`discard` veya `section.discard`); istek 409 alıyor. Durum `idle` oluyor, revizyonun bayat olduğu bilgisi kayboluyor.
- **Etki:** Veri kaybı yok (ayna zaten geri alınmış). Ama kullanıcı başka bölümleri düzenlemeye devam ediyor; sonraki ilk PUT 409 alıyor ve bu düzenlemeler yeniden yükleme ile kaybolabilir. Conflict daha erken gösterilebilirdi.
- **Öneri:** `inFlightDropped` dalında `statusOf(error) === 'conflict'` ise `stall(entry.key, error)` çağrılsın (yeniden kuyruğa almadan) ya da davranış D7 (c)'de belgelensin.

### NF3 — P3 — Koleksiyon `discard()` henüz listede olmayan öğenin yerel reddini temizlemiyor
- **Dosya:** `serverSection.ts`, koleksiyon `discard()` yalnızca `current ∪ confirmed` id'leri için `drop(pathOf(id))` çağırıyor; `write` ise yeni öğenin `toWire` hatasını veya yinelenen yeni id'yi `pathOf(newId)` altında, `idOf` hatasını sentinel `graphs[i]` altında raporluyor.
- **Senaryo:** Yeni graph temsil edilemeyen bir parametreyle yazılıyor (`false`, `rejected`). `collection.discard()` çağrılıyor ama kuyruk `rejected` kalıyor; diğer bölümlerin yazmaları biriktiriliyor, gönderilmiyor; çıkış ancak global `queue.retry()`/`discard()` ile.
- **Etki:** Bölüm bazlı discard sözleşmesi tutarsız. ServerSection için "kendi yolundaki reddi temizler" testi var (`serverSection.test.ts:196-202`), koleksiyon için yok.
- **Öneri:** Koleksiyon raporladığı reddedilmiş anahtarları kaydetsin ve `discard()`'da bunları da `drop` etsin (ya da `definition.id` önekiyle temizlesin). Test ekleyin.

## Nitler ve doğrulanmamış hipotezler
- **Uçuştaki istek iptal edilmiyor:** `startNext` `putSection`'a `AbortSignal` vermiyor; `reset`/`dispose` uçuştaki `fetch`'i iptal etmiyor; `reset`'ten önce başlamış bir `flush()` eski `flight`'ı beklediği için hiç tamamlanmayabilir; zaman aşımı yok. Plan istemiyor; M5 için not.
- **`guard` hataları gizliyor:** `guard`, `onConfirmed` içinde `codec.fromWire` hatasını da yutuyor; ayna değişmiyor ama durum `idle`, hata yalnızca konsolda. Şema doğrulamasından geçmiş wire ile pek olası değil.
- **`onConfirmed` reset'ten sonra çağrılabiliyor:** başarı dalında `setRevision`, `inFlight = null`'dan önce çağrılıyor; `setRevision` dinleyicisi içinden `queue.reset()` çağrılırsa `onConfirmed` yine çalışıyor ("reset geri çağırım yapmaz" kuralına aykırı kenar durum).
- **Aynı anahtara çift `onDiscarded`:** uçuşta K ve bekleyen K varken `discard()` K için iki kez çağırıyor; yerleşik bölümler idempotent, arayüz yorumu belirtmiyor.
- **Eşzamanlı `retry()`:** ikincisi birincinin `flush`'ı bitmeden resolve oluyor.
- **Mesaj biçimi:** `bridgeDefinitionWire.ts` boş axisId için yolu `definitions[0].axisAssignments.` (sonda nokta) üretiyor — kozmetik.
- **Fixture sayıları:** `projectDocumentFixtures.ts` yalnızca testlerde import ediliyor; içindeki değerler test verisi, mühendislik varsayılanı değil.

## Test değerlendirmesi
- **Eski davranışta başarısız olacak testler** (kaynak akıl yürütmesiyle): `writeQueue.test.ts` N1 (`:183`, `:330`), N2 (`:342`, `:354`, `:363`), H1 (`:372`), N3 (`:393`), N4 (`:425`), H3 (`:443`, `:457`, `:467`), dispose (`:473`); `serverSection.test.ts` `:230`, `:239`, `:247`, `:256-286`; `projectSession.test.ts:25`.
- **Regresyon kilidi** (eski kodda da geçebilir; totoloji değil): `writeQueue.test.ts:433`, `projectDocument.test.ts:72-114`.
- Totolojik test bulunmadı. **Eksik testler:** NF1 (aynı bölüme eşzamanlı yazma, istisna fırlatan bölüm dinleyicisi), NF2, NF3.

## AC kapsamı
| AC | Kanıt | Durum |
|---|---|---|
| AC1 | `http.ts` `putJson`, `http.test.ts:32-44` | Karşılandı |
| AC2 | `projectApi.test.ts` | Karşılandı |
| AC3 | `projectDataValidation.test.ts` | Karşılandı |
| AC4–AC6 | `writeQueue.test.ts:34-88`, F1 testleri | Karşılandı |
| AC7 | `:91-103`, F4/N3 testleri | Karşılandı; NF2 kenar durumu |
| AC8–AC9 | `:104-144` | Karşılandı |
| AC10 | `:166-182`, N1/N4 `flush` testleri | Karşılandı |
| AC11 | `:190-198`, `:154-162`, N2 testleri | Karşılandı |
| AC12 | `serverSection.test.ts` | **Kısmen:** aynı bölüme eşzamanlı yazmada ayna/kuyruk tutarlılığı bozuluyor (NF1); koleksiyon discard kenar durumu (NF3) |
| AC13–AC16 | 7 mapper testi | Karşılandı |
| AC17–AC18 | `projectDocument.test.ts` | Karşılandı |
| AC19 | `project-store` yalnızca `*Wire.ts`, `projectDocument.ts` ve testlerde; fixture yalnızca testte | Karşılandı (kaynak) |
| AC20 | `shared/project-store` içinde `features/`/`app/` import'u ve tarayıcı storage kullanımı yok (grep) | Karşılandı (kaynak) |
| AC21 | build/test/lint koordinatörce koşuldu; `architecture.md` M4 bölümü ve roadmap M4 `[x]` | Raporlandı |

## implementation.md ile kod arasındaki tutarsızlıklar
1. "Second repair round → Visible to M5": "the queue must be created before any session listener that writes during `begin` (H1)" artık geçersiz: kod `enqueue`/`reportLocalRejection` içinde epoch'u kendisi senkronize ediyor ("H1/H3 follow-up" bölümü ve kodla uyumlu).
2. "Remaining risks: a session listener that throws inside `publish` is not guarded" artık geçersiz: `projectSession.set` her dinleyiciyi try/catch ile çağırıyor.
3. "listener exceptions are logged, not thrown" ServerSection ve koleksiyon dinleyicileri için doğru değil (NF1).
4. "H1/H3 follow-up" bölümünde test sayısı (1023 → 1026) ve kontrol koşusu kaydı yok; "Second repair round" hâlâ 1023 diyor; üst bölüm ve AC tablosundaki 979 ve "No independent review has run" ifadeleri tarihsel ve bayat.
5. Son disk düzenlemeleri ("H1/H3 follow-up") kodla ve `architecture.md` D7 (e)/(f) ile uyumlu.

## Doğrulayamadıklarım
- Test, build ve lint sonuçları ve yeni testlerin eski kodda gerçekten başarısız olduğu; gerçek backend ile uçtan uca davranış; vitest sahte zamanlayıcı ayrıntıları; M5 entegrasyonunda dinleyici davranışı (NF1'in sıklığı M5 store tasarımına bağlı).
