# Implementation report: g3 (A-01, A-07, C-013-01, C-013-03)

Kaynak: feature-implementer el-teslim raporu. Koordinatör doğrulaması: `npm test` 81 dosya / 713 test geçti; `npm run build` başarılı; `git status` yalnızca `frontend/src` ve `docs`; `backend`, `package.json`, `package-lock.json` diff'i boş; `projectFileService.ts`'te `CATEGORIES` kalmadı; `kopruq:project-data-changed` literal'i yalnızca olay sabiti dosyasında, modül dosyasında ve testlerde. Lint çıktısının sonu mevcut `EngineeringSchematics.tsx` uyarılarını gösteriyor; uyarı dağılımının baseline ile birebir aynı olduğu ajan beyanıdır (koordinatör dosya bazında karşılaştırmadı). Review yapılmadı.

**Sonuç: implemented.** T0-T5 tamam, AC1-AC13 karşılandı (elle Chromium kontrolleri hariç). K1-K5 kararlarına uyuldu.

## Baseline vs final (`frontend/`)
| Kontrol | Baseline | Final |
|---|---|---|
| `npm run build` | exit 0 (chunk uyarısı) | exit 0 |
| `npm test` | 79 dosya / 584 test | 81 dosya / 713 test (+2 dosya, +129 test), başarısız yok |
| `npm run lint` | exit 0, 19 dosya / 82 uyarı satırı | exit 0, dosya bazında dağılım baseline ile aynı (ajan beyanı), yeni uyarı yok |

## Yeni dosyalar (`frontend/src`)
`shared/project-file/projectDataContract.ts` (`PROJECT_DATA_ENTRIES` 14 anahtar, `PROJECT_FILE_SESSION_SECTIONS`, `entryValueInFile`), `projectDataEvents.ts` (`PROJECT_DATA_CHANGED_EVENT`), `projectFileValidation.ts` (`ProjectFileValidationError`, `parseWithSchema`); `features/project/model/projectStateSchema.ts`, `features/bridge-definition/model/schema.ts`, `features/family-registry/model/familySchemas.ts`, `features/graph/state/graphSchema.ts`; testler/fixture: `projectDataContract.test.ts`, `projectFileFixtures.ts` (geçerli dosya üretici + 15 bozuk dosya tablosu), `projectFileRealDefaults.test.tsx`.

## Değişen dosyalar
`projectFileService.ts` (entry listesi üzerinden, `CATEGORIES` kaldırıldı, `normalizeProjectFile`, `FileRef.recentId`), `projectModules.ts`, `familyRepository.ts` (`FAMILY_CATEGORIES`, `familyStorageKey`, `PRECAST_GIRDER_STORAGE_KEY`), `useFamilyCatalog.ts`, `graphStore.ts`, `bridge-definition/model/store.ts`, `projectWorkspace.ts` (`normalizeProjectState`), `useProjectFile.ts`, `recentProjects.ts` (UUID id, `recordRecentProject`, `isSameEntry`), `App.tsx`, `TopWorkspaceNav.tsx` (projectName + "Erişim yok"), `MaterialsPanel.tsx` (repository üzerinden, yalnızca değişince), literal→sabit: `registry.ts`, `BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx`, `PreferredSpanPanel.tsx`, `PierFamiliesPanel.tsx`, `FamilyTablesWorkspace.tsx`; testler: `projectFileService.test.ts`, `useProjectFile.test.tsx`, `recentProjects.test.ts`, `MaterialsPanel.test.tsx`, `TopWorkspaceNav.test.tsx`, `App.test.tsx`; docs: `architecture.md` (G3 track), `roadmap.md`, `kopruq-data-architecture.md` (MATERIAL notu).

## Kabul kriterleri
AC1 baseline/final kayıtlı. AC2 `projectDataContract.test.ts` 14 benzersiz anahtar; `CATEGORIES` `projectFileService.ts`'te yok; aile anahtarları yalnızca `familyRepository.ts`'te. AC3 her entry için round-trip, `apply` olayı, snapshot/restore, reset testleri yeşil. AC4 dosya yerleşimi, `schemaVersion: 1` ve mevcut hata metinleri testli; mevcut testler yeşil. AC5 `MaterialsPanel.test.tsx` (sınıf değişimi olay yayar; güncel depoda mount olay yaymaz; boş katalogda 8 satır tek olayla yazılır). AC6 literal'ler yalnızca sahiplerinde (koordinatör grep'i teyit etti; bir yorum satırında olay adı geçiyor). AC7 15 bozuk durum yolu adlandıran hatayla reddedilir; `open` sonrası 14 depo anahtarı, proje ve tanım anahtarları bayt bazında aynı; `ref`, dirty, React setter'ları değişmez. AC8 uyumluluk testleri (eksik environment/criteria/coordinate, eksik tanım alanları, id'siz köprü, `groups`'suz graph, `modules`'suz dosya, box `tw` göçü, `pierType` `H_TYPE`/`WALL`, fazladan alanlar); sayısal aralık kuralı yok (0, negatif, ondalık geçer); gerçek varsayılanlarla üretilen dosya doğrulamadan geçer. AC9 `environment`'sız dosya açılır, App çökmez, varsayılan `{null,null}`. AC10 Recent: id dosya adı değil; aynı adlı iki handle iki kayıt; `isSameEntry` true tek kayıt; `isSameEntry` yok/hata → eşleşme yok; handle'sız açma yalnızca handle'sız aynı adlı kayıtla birleşir; `recentId` ile Save aynı kaydı günceller; Save As yeni kayıt; repair; eski `{id:'Legacy.kopruq'}` kaydı çalışır; listede projectName ve "Erişim yok"; IndexedDB/metadata değişmedi. AC11 yalnızca `frontend/src` + `docs`. AC12 build 0, lint 0, testler yeşil. AC13 üç doküman güncel; A-02 ve diğerleri "Flagged, not part of G3".

## Test-first kanıtı
Kırmızı çalıştırıldı: `projectDataContract.test.ts` (modül yok), `MaterialsPanel.test.tsx` (3 yeni test), `projectFileService.test.ts` doğrulama/uyumluluk (34 başarısız), `useProjectFile.test.tsx` ret tablosu (15 başarısız) ve Recent testi, `recentProjects.test.ts` (8 başarısız), `TopWorkspaceNav.test.tsx`. Kırmızısı gösterilmeyenler: `projectFileRealDefaults.test.tsx` (uygulama sonrası, mevcut varsayılanların kabulünü kanıtlar) ve `App.test.tsx` AC9 testi (düzeltmeden sonra eklendi).

## Plandan sapmalar
1. `ProjectFileValidationError`/`parseWithSchema` döngüsel import yüzünden `projectFileValidation.ts`'e ayrıldı; sözleşme aynı sınıfı yeniden dışa aktarıyor.
2. `projectFileFixtures.ts` test yardımcısı; `MaterialsPanel.test.tsx` yeni dosya yerine genişletildi.
3. `importGraphDocuments` bilinçli olarak sığ `assertGraphDocuments` kullanıyor; derin şema `validateGraphDocuments` ile dosya girişinde çalışıyor (rollback'te mevcut depo snapshot'ının yeniden içe aktarımı derin kontrolle patlamasın diye).
4. `selectedBridgeId` dosyada isteğe bağlı (normalizasyon `ensureBridgeDefinitions` ile dolduruyor); plan `string|null` demişti.
5. Aile `allowedConfigurations` `string[]` olarak gevşek kontrol ediliyor (eski veri reddini önlemek için).
6. Eksik modülün `reset()`'i doğrulamalı: `applyProjectFile` içinde sessizce başarısız olursa hata fırlatıp rollback yapıyor (önceden sessizdi; plan §3.1 ile uyumlu).
7. Reset sırası: graph, aileler, modüller (girderLibrary ilk); davranış aynı.
8. `save()`: `recentId` yalnızca `next === ref` iken geçiriliyor; handle'sız ref ile picker yeni dosya açarsa Save As gibi yeni kayıt oluşur.
9. `TopWorkspaceNav`: `<small className="spn-recent-project">`, CSS'e dokunulmadı; grid'de yeni satıra iner.

## Sınırlamalar ve riskler
- **Eski dosya reddi:** eksik `BridgeRow` alanı, enum dışı değer, yanlış tip, tekrar eden aile id'si, axis `id/name/type/chainageM` veya constraint alanı eksikliği artık dosyayı reddeder; `Rule` iç alanları (`min/max/delta`) TS tipi gereği zorunlu. Gerçek eski `.kopruq` dosyaları repoda yok.
- **Açılışta normalizasyon:** `ensureBridgeDefinitions` karşılığı olmayan tanımları ve sıfır/negatif span'leri açılışta düşürür, sonraki Save bunu yazar (A-02 ile ilişkili, işaretli).
- **Recent:** aynı dosya bir kez handle'lı bir kez handle'sız açılırsa iki satır görünür; eski kayıtlar göç edilmedi.
- Oxlint için test fixture'ında `Record<string, any>` kullanıldı; yeni uyarı çıkmadı.

## Elle yapılacak kontroller (Chromium)
1. Gerçek `FileSystemFileHandle.isSameEntry` ve IndexedDB'de handle saklama.
2. Farklı klasörlerde aynı adlı iki dosyayla Save, Recent ve Open (iki ayrı Recent satırı, doğru handle).
3. Elinizdeki gerçek eski `.kopruq` dosyalarının açılması (ret olursa mesajdaki yol okunabilir mi).
4. Materials ekranında sınıf değiştirince başlıkta dirty `*`; yalnızca ekranı açıp kapatınca dirty olmaması.
5. Recent listede aynı adlı kayıtlarda proje adı ve "Erişim yok" görünümü.
