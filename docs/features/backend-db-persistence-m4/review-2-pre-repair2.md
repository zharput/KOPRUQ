# Yeniden inceleme: backend-db-persistence-m4 (düzeltmelerden sonra)

**Karar: CHANGES_REQUESTED**

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob; test, build veya lint koşturmadı). İlk inceleme `review-1-pre-fix.md` olarak saklandı.

## Kapsam ve sınırlar
- **Baseline:** `cab209cc6128c5a81658534115f18f335e4b3f2f` (HEAD ile aynı). Çalışma ağacı anlık görüntüsü inceleme öncesi ve sonrası aynı (`de8571d516e59f24042688385a93da34c7053387`); rapor bayat değil. Plan sha256 `262fb2e4…8d01`.
- **Tamamı okunan dosyalar:** request.md, implementation.md (Post-review fixes dahil), önceki review.md, plan.md'nin ilgili bölümleri, `docs/architecture.md:3257-3277`; `frontend/src/shared/api/http.ts`, `shared/project-store/{projectApi,projectDataValidation,projectSession,serverSection,writeQueue}.ts` ve testleri, 7 `*Wire.ts` ve testleri, `app/project-session/{projectDocument,projectDocumentFixtures}.ts`, `projectDocument.test.ts`.
- `http.test.ts`: yalnızca `putJson` satırlarına bakıldı (önceki incelemeden sonra değişmedi). Backend DTO'ları bu turda yeniden okunmadı; wire mapper'larında yalnızca `bridgeDefinitionsFromWire` değişti (çıktı şekli aynı), önceki wire doğruluğu tespiti geçerli sayıldı.
- **Koşturulmayanlar:** test/build/lint reviewer tarafından çalıştırılmadı ("1003 test geçti" implementer raporu ve koordinatörün bağımsız koşusu; reviewer doğrulaması değil). Yeni regresyon testlerinin eski kodda başarısız olacağı yalnızca kaynak okuyarak çıkarıldı. Özelliğin hatasız olduğu anlamına gelmez.

## Önceki bulgular → durum
| Bulgu | Durum | Kanıt |
|---|---|---|
| F1 (aynı anahtar iki kez kalıyordu) | **Çözüldü** | `writeQueue.ts:130-131` daha yeni girdi varsa başa taşıyor, yoksa `unshift`; `enqueue` (`:153`) tekrarları ayıklıyor. `writeQueue.test.ts:201-235` eski kodda başarısız olurdu (`['K','K']` bırakıyordu). |
| F2 (uçuştayken `discard` aynayı ayırıyordu) | **Çözüldü**, yeni yan yol N1 | `serverSection.ts:55-62` `confirm` `current === confirmed` ile sunucu değerini benimsiyor; koleksiyonda `:129-137`. `serverSection.test.ts:166-180`, `:208-216` eski kodda başarısız olurdu. |
| F3 (`ServerSection.discard()` kuyruğu silmiyordu) | **Çözüldü** | `WriteQueue.drop(key)` (`writeQueue.ts:167-173`); `ServerSection.discard` (`serverSection.ts:67`) ve koleksiyon `discard` (`:179-181`) çağırıyor. `serverSection.test.ts:181-194`. |
| F4 (`conflict` kayboluyordu) | **Çözüldü** | `writeQueue.ts:77-82` severity ile `conflict` yapışkan; `drop` çakışmayı temizlemiyor (`:170`). Testler `:237-260`. Yan etki N3. |
| F5 (geçersiz 200 zarfında revizyon ilerlemiyordu) | **Çözüldü** | `projectApi.ts:20-26,42-46` `SectionEnvelopeError`; `writeQueue.ts:117-123`. Testler `projectApi.test.ts:54-62`, `writeQueue.test.ts:262-281`. Kenar durum N4. |
| F6 (kuyruk projeye bağlı değildi) | **Kısmen** | `writeQueue.ts:186-189` otomatik reset, `stale()` (`:93`). Testler `:283-300`. Aynı `projectId` ile yeniden `begin` algılanmıyor (N2). |
| F7 (eko referans korunumu test edilmiyordu) | **Büyük ölçüde çözüldü** | `projectDocument.test.ts:72-88`, `bridgeDefinitionWire.test.ts:108-127`. Kalan boşluk nitlerde. |
| F8 (doküman eksik) | **Çözüldü** | `architecture.md:3269` D3 listesi tamam. |
| Nit `__proto__` | Çözüldü | `bridgeDefinitionWire.ts:67-81`, test `:98-105`. |
| Nit girder library `[]→null`, `%2F` | Yalnızca belgelendi | `architecture.md:3277` |
| Nit barrel import | Değişmedi (zorunlu kural değil) | `familyWire.ts:5-9` |

## Yeni bulgular (önem sırasıyla)

### N1 — P2 — `queue.discard()` uçuştaki girdinin aynasını geri almıyor; istek başarısız olursa sessiz ayrışma (F3 düzeltmesinin yol açtığı regresyon)
- **Yer:** `frontend/src/shared/project-store/writeQueue.ts:174-180` (`discard`: `inFlightDropped = true` yapıyor ama uçuştaki girdi için `onDiscarded` çağırmıyor) ve `:124-129` (başarısızlıkta `inFlightDropped` ise girdi yeniden kuyruğa alınmıyor, durum `idle`).
- **Senaryo:** (1) K=v1 uçuşta, K için başka bekleyen girdi yok; ayna `current=v1`, `confirmed=v0`. (2) Başka bir bölümde temsil edilemeyen değer yazılıyor, `reportLocalRejection` kuyruğu `rejected` yapıyor; kullanıcı "Vazgeç" deyince `queue.discard()` çağrılıyor (`saving` durumunda da çağrılabilir; plan buna izin veriyor, `plan.md:240`). (3) v1 ağ hatası/500/400 alıyor; `inFlightDropped` olduğundan girdi kuyruğa girmiyor, durum `idle`, `flush()` başarıyla dönüyor.
- **Etki:** UI v1 gösteriyor, sunucuda v0 var; kuyruk boş, hata görünmüyor. Kullanıcı v1'i yeniden yazarsa `same(wire, current.wire)` no-op olduğundan hiçbir şey gönderilmiyor; fark yeniden yüklemede ortaya çıkıyor. Graph koleksiyonunda aynı yol, sunucuda hiç olmayan yeni bir graph'ı listede bırakıyor. Düzeltmeden önce başarısız uçuş girdisi kuyruğa geri girip `error` gösteriyordu (sorun görünürdü); sessiz kayıp düzeltmeyle ortaya çıktı.
- **Testlerin durumu:** Mevcut testler bu davranışı doğru diye sabitliyor: `writeQueue.test.ts:323-325` aynasız çalışıyor; `serverSection.test.ts:133-144` yalnızca başarı yolunu deniyor.
- **Önerilen düzeltme:** `discard()` içinde uçuştaki girdi için de `inFlight.onDiscarded()` çağrılsın, ayna `confirmed`'a dönsün (F2 sayesinde istek başarılı olursa `confirm` sunucu değerini zaten benimsiyor). Alternatif: başarısızlık dalında `inFlightDropped` ise ve aynı anahtar için bekleyen girdi yoksa `entry.onDiscarded()` çağrılsın. Gerçek `ServerSection` ile "uçuşta + `queue.discard()` + istek hatası → `read()` eski onaylı değer" testi eklensin.

### N2 — P3 — Aynı proje id'siyle yeniden `begin` hâlâ algılanmıyor (F6'nın kalanı)
- **Yer:** `writeQueue.ts:63,93,186-189` (yalnızca `projectId` karşılaştırılıyor), `projectSession.ts:40`.
- **Senaryo:** M5'teki en olası akış: 409 alınıyor, kullanıcı "sunucudan yeniden yükle" diyor, `session.begin(sameId, newRevision)` çağrılıyor. Kuyruk sıfırlanmıyor: `conflict` durumu ve bekleyen girdiler kalıyor; session `status: idle, pendingCount: 0` gösteriyor ama kuyrukta girdi var; uçuşta istek varsa yanıtı yeni revizyonun üzerine eski bir revizyon yazabiliyor, sonraki yazma 409 alıyor.
- **Durum:** Belgelendi ("önce `reset()` çağırın") ama mekanizma çağıranın disiplinine bırakılmış.
- **Önerilen düzeltme:** Session'a her `begin`/`end`'de artan bir `epoch` alanı eklensin; kuyruk ve `stale()` bunu karşılaştırsın.

### N3 — P3 — Maskelenmiş hata, `drop` ile otomatik yeniden denemeye dönüşüyor
- **Yer:** `writeQueue.ts:80` (eşit önemdeki yeni hata tutulmuyor) ve `:170-172`.
- **Senaryo:** (1) L için `reportLocalRejection` (`rejected`). (2) Uçuştaki K ağ hatası alıyor; K yeniden kuyruğa giriyor ama hata kaydedilmiyor (`failure` hâlâ L). (3) `ServerSection(L).discard()` → `drop(L)` → `unstall` → debounce sonrası K kullanıcıya hiç gösterilmeden yeniden gönderiliyor.
- **Etki:** "Otomatik retry yok" kuralı (D7, AC7) ihlal ediliyor; K'nın hatası kullanıcıya hiç görünmüyor. Veri kaybı yok.
- **Önerilen düzeltme:** Maskelenen hataları da tutun (L temizlenince K'nın hatasıyla durmaya devam edilsin) ya da bu davranışı D7'de açıkça belgeleyin.

### N4 — P3 — Zarf hatası ve uçuşta atılmış girdi bir arada olunca revizyon kayıyor
- **Yer:** `writeQueue.ts:117,124`.
- **Senaryo:** Girdi `drop` edilmiş, uçuştaki istek 200 alıyor ama zarf revizyonu okunamıyor (`SectionEnvelopeError`, `revision === null`). Sonuç `inFlightDropped` dalına düşüyor: durum `idle`, revizyon güncellenmiyor.
- **Etki:** Sunucu yazmayı commit etmiş olabilir; sonraki PUT büyük olasılıkla 409 alır. Ayna geri alınmış durumda kalır.
- **Önerilen düzeltme:** `SectionEnvelopeError` her durumda en az `error` ile dursun.

## Varsayımlar / doğrulanmamış hipotezler
- **H1 (dinleyici sırası):** Kuyruğun session aboneliği proje değişiminde `reset()` yapıyor. Kuyruk, M5'te `begin` sırasında yazma yapan bir dinleyiciden sonra abone olursa (ör. tembel oluşturma), o dinleyicinin p2 için kuyruğa koyduğu girdiler callback çağrılmadan silinir ve aynalar ayrışır. Bugün tetikleyen kod yok.
- **H2 (abonelik ömrü):** `createWriteQueue` session'a abone oluyor ama abonelikten çıkma/`dispose` sağlamıyor (`writeQueue.ts:186`). Aynı session üzerinde kuyruk yeniden oluşturulursa (HMR, M5'te yeniden kurulum) eski kuyruk abone kalır.
- **H3 (dinleyici istisnası):** `onConfirmed` → `notify` içinde bir dinleyici istisna fırlatırsa `flight` reddedilir; `inFlight` null olur ama `publish`/`startNext` çalışmaz, durum `saving`'de takılır, bekleyen girdiler başka bir `enqueue` gelene kadar gönderilmez; `flush()` çağrılmamışsa işlenmemiş promise reddi oluşur. Bu davranış düzeltmelerden önce de vardı.

## Nitler
- **F7 kalan boşluk:** `toWire` sırası `JSON.stringify` ile kanonik fixture'a karşı yalnızca workspace ve graph'lar için doğrulanıyor (`projectDocument.test.ts:67-71`); diğer 14 bölümde `toEqual` sıradan bağımsız, `Object.keys` testleri her iç içe düzeyi kapsamıyor (ör. kural nesneleri, girder library boyutları). Öneri: 16 bölümün hepsi için `JSON.stringify(codec.toWire(loaded…)) === JSON.stringify(CANONICAL…)`.
- **Koleksiyon hata anahtarı:** Koleksiyonun `write` metodunda `codec.idOf` fırlatırsa `failedId` önceki öğenin id'si kalıyor ve hata yanlış `graphs/<id>` anahtarıyla raporlanıyor (`serverSection.ts:151-161`). Graph codec'i bugün fırlatmıyor.
- **D7 (c) eksik:** `architecture.md:3272` D7 (c), `queue.discard()`'ın uçuştaki girdinin aynasını geri almadığını belirtmiyor (N1 ile ilişkili).

## AC kapsamı
| AC | Kanıt | Durum |
|---|---|---|
| AC1 | `http.ts:75-77`, `http.test.ts` putJson testleri | Karşılandı |
| AC2 | `projectApi.test.ts` (+ `SectionEnvelopeError`) | Karşılandı |
| AC3 | `projectDataValidation.test.ts` | Karşılandı |
| AC4–AC5 | `writeQueue.test.ts:34-88` | Karşılandı |
| AC6 | `:70-80`, F1 testleri `:201-235` | Karşılandı |
| AC7 | `:91-103`, F4 testleri | Karşılandı; N3 kenar durumunda "otomatik retry yok" kuralı deliniyor |
| AC8–AC9 | `:104-144`, `:201-219` | Karşılandı |
| AC10 | `:166-182` | Kısmen: N1 durumunda başarısız yazmaya rağmen `flush()` başarıyla dönüyor |
| AC11 | `:154-162`, `:190-198`, F5 ve F6 testleri | Karşılandı; aynı id ile `begin` açık (N2) |
| AC12 | `serverSection.test.ts` (F2/F3 dahil) | **Kısmen:** `queue.discard()` + uçuştaki isteğin hatası aynayı ayrıştırıyor (N1) |
| AC13–AC16 | Mapper testleri | Karşılandı |
| AC17–AC18 | `projectDocument.test.ts` | Karşılandı |
| AC19 | `project-store` yalnızca `*Wire.ts`, `projectDocument.ts` ve testlerde import ediliyor | Karşılandı (kaynak) |
| AC20–AC21 | Build/test/lint raporlandı (koordinatör tekrar koştu, reviewer doğrulamadı); M4 dokümanı mevcut, D3 tamam | Raporlandı; D7 (c) eksik (nit) |

## Doğrulayamadıklarım
- Test, build ve lint sonuçları (1003 test) ve yeni regresyon testlerinin eski kodda gerçekten başarısız olduğu.
- Vitest sahte zamanlayıcı davranışı; gerçek backend'e karşı uçtan uca davranış (Tomcat `%2F`, Jackson sayı biçimi); backend DTO'ları bu turda yeniden okunmadı; H1–H3 yalnızca hipotez.
