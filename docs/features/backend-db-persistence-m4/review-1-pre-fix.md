# İnceleme: backend-db-persistence-m4

**Karar: CHANGES_REQUESTED**

Kaynak: feature-reviewer raporu (yalnızca Read/Grep/Glob; test, build veya lint koşturmadı).

## Kapsam ve sınırlar
- **Baseline:** `cab209cc6128c5a81658534115f18f335e4b3f2f` (inceleme başında ve sonunda güncel HEAD ile aynı). Çalışma ağacı anlık görüntüsü (git status + uygulama diff'i + izlenmeyen dosya özetleri) inceleme öncesi ve sonrası aynı: `a9b33aa037651b2c09d3084c0fb4a951cc5c33c5`; rapor bayat değil. Plan sha256 `262fb2e4…8d01`.
- **Okunanlar:** request.md, plan.md (tamamı), implementation.md; `http.ts` diff'i; 15 yeni production ve 13 yeni test dosyasının tamamı; `docs/architecture.md:3257-3277`.
- **Karşılaştırılan gerçek backend sözleşmesi:** `WorkspaceDto`, `BridgeDefinitionsDto`, `FamilyDtos`, `FamiliesDto`, `GirderLibraryDto`, `PreferredSpanRuleDto`, `CrossSectionDto`, `LoadInputDtos`, `LoadsDto`, `GraphDtos`, `ProjectDocumentResponse`, `SectionWriteResponse`, `WorkspaceWriteResponse`, `ProjectSummaryResponse`, `DesignSystemPutRequests`; mapper'lar `BridgeDefinitionsMapper`, `FamilyCatalogMapper`, `GraphDocumentMapper`, `LoadInputMapper`; `SectionChecks`, `PierFamilyType`, controller path eşlemeleri.
- **Doğrulanmayanlar:** test/build/lint sonuçları (979 test, lint ok implementer raporu; koordinatör build, test ve lint'i bağımsız koşup aynı sonucu aldı — reviewer bunları görmedi); gerçek backend'e karşı uçtan uca deneme; vitest fake timer davranışı; fixture'ın gerçek backend yanıtlarıyla birebirliği (Jackson `DoubleNode` biçimi vb.); encoded slash'in Tomcat'te ele alınışı; M5 entegrasyon senaryoları. Bulgular kaynak okumasına dayanır; özelliğin hatasız olduğu anlamına gelmez.

## Bulgular (önem sırasıyla)

### F1 — P1 — Hata sonrası aynı anahtar kuyrukta iki kez kalıyor; sunucuya eski değer yazılıyor, UI yeni değeri gösteriyor
- **Yer:** `frontend/src/shared/project-store/writeQueue.ts:99-104` (hata dalında `pending.unshift(entry)`), `:123-124` (`enqueue` içinde `findIndex` ile birleştirme).
- **Kanıt:** Hata dalı başarısız girdiyi koşulsuz kuyruğun başına geri koyar; aynı `key` için daha yeni girdi olup olmadığına bakmaz. `enqueue` yalnızca ilk eşleşmeyi değiştirir.
- **Senaryo** (AC6 ile AC8/AC9 akışlarının birleşimi): (1) K=v1 uçuşta; (2) kullanıcı K=v2 yazar, kuyruk `[v2]`; (3) v1 400/500/ağ hatası alır, kuyruk `[v1, v2]`; (4) kullanıcı K=v3 yazar, `findIndex` 0. sırayı bulur, kuyruk `[v3, v2]`; (5) `retry()` önce v3'ü (200), sonra v2'yi (200) gönderir.
- **Etki:** Sunucuda v2 kalır; `serverSection.confirm` v2 için yalnızca `confirmed`'ı günceller, `read()` v3 döner; durum `idle`, hata görünmez — sessiz veri kaybı. Ek belirtiler: `pendingKeys()`/`pendingCount` aynı bölümü iki kez sayar, `discard` aynı `onDiscarded`'ı iki kez çağırır; 400 durumunda geçersiz ara değer tekrar tekrar gönderilebilir.
- **Önerilen düzeltme:** Hata dalında `pending` aynı anahtarı zaten içeriyorsa başarısız girdiyi geri ekleme, daha yeni girdiyi başa taşı (failedKey başta kalsın); içermiyorsa `unshift`. Bu senaryo için `writeQueue` testi ekle (uçuşta aynı anahtara yazma → hata → yeni yazma → `retry`; gönderim sırası ve son sunucu değeri doğrulansın).

### F2 — P2 — Uçuşta istek varken `discard`, aynayı sunucudan sessizce ayırıyor
- **Yer:** `frontend/src/shared/project-store/serverSection.ts:55-65` (`confirm`/`discard`), koleksiyonda `:127-139`; kuyruk tarafı `writeQueue.ts:138-143`.
- **Senaryo:** (1) K=v1 uçuşta, K=v2 bekliyor; (2) `queue.discard()` bekleyen v2 için `onDiscarded` çağırır, `current = confirmed (v0)`; (3) v1 200 döner; `confirm`'de `current.wire (v0) ≠ sent (v1)` olduğundan yalnızca `confirmed = v1` olur, bildirim yok. Durum `saving` iken ya da `reportLocalRejection` sonrası (uçuştaki istek sürerken) mümkün. Koleksiyonda: doğrudan `collection.discard()` uçuştaki yeni bir graph'ı listeden siler; onay gelince graph sunucuda var ama listede yok.
- **Etki:** UI v0 gösterir, sunucuda v1 var; `current !== confirmed` ama kuyrukta girdi yok. Kullanıcı v0'ı tekrar yazarsa `same(wire, current.wire)` no-op olduğundan hiçbir şey gönderilmez; fark yeniden yüklemede ortaya çıkar.
- **Önerilen düzeltme:** `confirm`'de "daha yeni yerel düzenleme yok" koşulunu `current === eskiConfirmed` ile de tanı; bu durumda `current = confirmed = server` yap ve bildirim gönder. Test ekle.

### F3 — P3 — `ServerSection.discard()` herkese açık ama kuyruktaki girdiyi silmiyor
- **Yer:** `serverSection.ts:62-65, 93`; koleksiyonda `:176-178`.
- **Senaryo:** M5 bir bölümü doğrudan `section.discard()` ile geri alırsa bekleyen PUT yine gönderilir; sunucu atılmış değeri saklar, ayna eski değeri gösterir (F2 ile aynı ayrışma).
- **Önerilen düzeltme:** Yalnızca kuyruk üzerinden çağrılacağını belgele (veya API'den çıkar) ya da kuyruğa anahtar bazlı `drop(key)` ekle.

### F4 — P3 — `stall` önceki başarısızlığın üzerine yazıyor; `conflict` durumu kayboluyor
- **Yer:** `writeQueue.ts:67-69`, `:130` (`reportLocalRejection`), `:134` (`retry` içindeki conflict kontrolü).
- **Senaryo:** 409 sonrası kullanıcı temsil edilemeyen bir değer yazar; durum `conflict`'ten `rejected`'a düşer, `lastError` 409 yerine `WireMappingError` olur; `retry()` bu kez izin verir ve eski revizyonla tekrar PUT atar (yine 409). Ters yön: `reportLocalRejection` sonrası uçuştaki isteğin ağ hatası `rejected` kaydını ve `failedKey`'i ezer.
- **Önerilen düzeltme:** `conflict` durumunu yapışkan tut; daha düşük önemli hata onu ezmesin.

### F5 — P3 — Geçersiz 200 zarfında revizyon ilerlemiyor; retry garanti 409 alıyor
- **Yer:** `projectApi.ts:31-33` (zarfı strict doğrulayıp fırlatır), `writeQueue.ts:99-104`.
- **Senaryo:** Backend `SectionWriteResponse`'a ek alan eklerse (R11) her PUT sunucuda commit olur ama istemci `error` gösterip girdiyi yeniden kuyruğa alır; `retry` 409 alır.
- **Not:** Plan D7/R8 ile uyumlu, ancak `value` doğrulama hatasında revizyonun güncellendiği yolla tutarsız ve belgelenmemiş.
- **Önerilen düzeltme:** Zarf doğrulamasını kuyrukta yap; `revision` okunabiliyorsa yine uygula.

### F6 — P3 (varsayım, M5 riski) — Kuyruk açık projeye bağlı değil
- **Yer:** `writeQueue.ts:80-83`.
- **Senaryo:** `reset()` çağrılmadan `session.begin(p2)` yapılırsa p1 isteğinin yanıtı p2'nin revizyonuna `setRevision` uygular; `begin`, kuyrukta girdi varken `pendingCount`'u 0'a çeker.
- **Önerilen düzeltme:** Gönderim anındaki `projectId`'yi yanıtta karşılaştır ya da `begin`'i `reset`'e bağla; en azından M5 için belgele.

### F7 — P3 — Test boşluğu: gerçek codec'lerle eko referans korunumu test edilmiyor
- D8/AC12'deki "aynı eko ⇒ aynı referans" davranışı zod çıktısının anahtar sırası ile `toWire` sırasının `JSON.stringify` düzeyinde aynı olmasına dayanır. `serverSection.test.ts` yalnızca sentetik codec kullanır; mapper testleri `parse(...).toEqual(wire)` ile karşılaştırır ve `toEqual` sıradan bağımsızdır. Bir şema/`toWire` sıra kayması (ör. bridge-definition UI seçimlerinin her kayıtta sıfırlanması) testlerde yakalanmaz.
- Elle kontrol: 7 mapper'ın hepsinde sıralar şu an eşleşiyor.
- **Önerilen düzeltme:** Her bölüm için `JSON.stringify(schema.parse(JSON.parse(JSON.stringify(w)))) === JSON.stringify(w)` testi ekle.

### F8 — P3 — Doküman eksik
- **Yer:** `docs/architecture.md:3269` (D3). `WireMappingError` listesinde şunlar yok: yinelenen graph id'si; id'siz veya boş id'li family kaydı; boş `definitionKey`/`axisId`; eksik foundation generation kuralı; temizlenemeyen bölüme `undefined` yazılması.

## Küçük notlar (nit)
- `girderLibraryToWire` boş olmayan her diziyi de `null` (temizle) olarak gönderir (`familyWire.ts:213`). Plan bunu onaylıyor (R4) ama boş olmayan legacy dizi sessizce silinir; M5 geçişinde dikkat.
- `bridgeDefinitionsFromWire` atama kullanır (`definitions[key] = …`, `axisAssignments[axisId] = …`, `bridgeDefinitionWire.ts:72,74`); `__proto__` gibi anahtar düşer. Gerçekçi değil; `Object.fromEntries`/`Object.create(null)` kullanılabilir.
- `familyWire.ts` diğer feature'ların `model/types` dosyalarını barrel'ı atlayarak import eder (zorunlu kural değil).
- `pathOf` graph id'sindeki `/` karakterini `%2F` olarak kodlar; Tomcat varsayılan ayarda encoded slash'i reddedebilir (doğrulanmadı).

## Wire doğruluğu (reviewer'ın kendi incelemesi)
- Record bileşen sırası, nullability ve zorunluluk: workspace (26 alan + 13 alanlı satır), BridgeDefinitions (`definitions` sarmalı, `definitionKey`, `axisAssignments` listesi, `{A1,A2}`), 5 family, girder library, preferred span, cross section, 6 yük ve graph (`key, kind, value`) Java DTO'larıyla birebir uyumlu.
- Enum'lar (`H_TYPE`, `WALL` dahil) doğru; `NUMBER_ARRAY` ile `[]` doğru eşleniyor; wind snapshot yalnızca girdileri içeriyor.
- `toWire` bilinmeyen alan göndermiyor, backend'in zorunlu tuttuğu hiçbir alanı atlamıyor.
- Kanonik fixture: DTO'larla çelişen nokta bulunmadı.

## AC kapsamı
| AC | Kanıt (kaynak/test okuması) | Durum |
|---|---|---|
| AC1 | `http.ts` putJson + 2 test | Karşılandı |
| AC2 | `projectApi.test.ts` | Karşılandı |
| AC3 | `projectDataValidation.test.ts` | Karşılandı |
| AC4–AC5 | `writeQueue.test.ts` debounce ve seri gönderim | Karşılandı |
| AC6 | Test var, ama F1 uçuşta yazma + hata kombinasyonunda bozuluyor | Kısmen |
| AC7–AC9 | Testler var; F1 (AC8/AC9 retry yolunda veri kaybı) ve F4 açık | Kısmen |
| AC10–AC11 | Testler var | Karşılandı |
| AC12 | Sentetik codec testleri var; F2/F3 ve F7 açık | Kısmen |
| AC13–AC16 | Mapper testleri | Karşılandı |
| AC17–AC18 | `projectDocument.test.ts` | Karşılandı |
| AC19–AC20 | grep: `project-store` yalnızca `*Wire.ts` ve `projectDocument.ts` içinde; `shared` → `features/app` import'u yok | Karşılandı (kaynak) |
| AC21 | Build/test/lint raporlandı (koordinatör bağımsız koştu); dokümanlar mevcut (F8) | Raporlandı |
