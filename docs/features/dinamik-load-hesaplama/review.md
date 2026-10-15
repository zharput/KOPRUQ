# Bağımsız inceleme (2. tur, onarım sonrası): dinamik-load-hesaplama

Verdict: **PASS** (kodun hatasız olduğu anlamına gelmez)

Bu dosya ilk review'un (CHANGES_REQUESTED, 4 bulgu) yerine geçer.

## Kapsam ve sınırlar
- Baseline HEAD `b7255da` (güncel HEAD ile aynı). 941 satırlık tracked diff'in tamamı ve 7 untracked dosya baştan sona okundu; ilgili güncel kaynak, test ve layer-rule dosyaları incelendi. Onarım raporu dosya olarak yok; düzeltmeler doğrudan kodda doğrulandı.
- Reviewer hiçbir komut çalıştırmadı. `npm test` (124 dosya / 1183 test), build, lint ve `mvn package` (733 test) sonuçları implementer/repair raporlarıdır; koordinatörün hedefli çalıştırması (373 test) bağımsızdır. Tarayıcıda deneme yapılmadı.
- Snapshot kontrolü: inceleme sonrası `git status`, tracked diff ve untracked hash'leri değişmedi; rapor stale değil.

## Bulgular
Yeni P0-P3 bulgu yok. Onarımın yan etkileri için bakılan noktalar:
- `displayText` sıfır kontrolü (`loadUnits.ts:153`): tolerans `1e-12 x max(1,|n|)`; yalnızca odak taslağını etkiler, anlamlı hiçbir mühendislik değerini gizlemez; saklanan değer değişmez, odaklanıp çıkmak yazmaz (`UnitTextInput.tsx:42-43`).
- `toPrecision(12)` (`loadUnits.ts:155`): yalnızca odak taslağı; kayıt 15 anlamlı hane (`canonicalText`, `:144`).
- -0 normalleştirme (`loadUnits.ts:101-104`): yalnızca sıfıra yuvarlanan metni değiştirir; gerçek küçük negatifler korunur (`-1.000e-10`, `-1.00`).
- Self Weight `toPrecision(15)` (`SelfWeightPermanent.tsx:253`): 0.5 tonf/m tam `4.903325` kN/m saklanır.

## Önceki bulguların durumu
| # | Konu | Durum | Kanıt |
|---|---|---|---|
| 1 | °F/K odak gürültüsü, `-0.00 °F` | Düzeldi | `loadUnits.ts:98-104,148-156`; testler `loadUnits.test.ts:136-152`, `UnitTextInput.test.tsx:35-53` (sıfır kontrolü kaldırılırsa test kırılır) |
| 2 | Self Weight kanonik normalleştirme | Düzeldi | `SelfWeightPermanent.tsx:253`; `LoadsUnits.test.tsx:87-91` `toBe(30)` |
| 3 | AC10 testi zayıf, wiring testi yok | Düzeldi | `LoadsUnits.test.tsx:211-239` (6 bölüm tohumlu, 4 sekme gezilir, PUT sayısı + JSON eşitliği); `:242-256` WorkspacePage ve `/loads` route `tonf/mm` (bağlantı silinirse kırılır) |
| 4 | e2e adım 5 metni | Düzeldi | `docs/e2e/19-yuk-birimleri.md:13` `10.0000` |

## AC kapsama
AC1-AC15 kodda mevcut ve testle kapsanmış (`LoadsUnits.test.tsx`, `loadUnits.test.ts`, `UnitTextInput.test.tsx`, `LoadsPanel.test.tsx`, Wind/Temperature testleri, contract testi `workspaceUnitChange_leavesEveryLoadSectionUnchanged`). AC16 yalnızca raporlanmış; reviewer çalıştırmadı.

Mimari ve mühendislik güvenliği: yeni katsayı yok (tonf/kgf `quantities.ts`, bileşik birimler boyut analiziyle); backend'de yalnızca javadoc + contract testi; loads -> `graph/domain/quantities` yalnızca R3 sayacına giriyor, R4 ihlali yok.

## Kalan riskler ve doğrulanmamış hipotezler
- **Tarayıcıda `-` girişi (açık):** `type="number"` alanda tek başına `-` yazılınca tarayıcı `""` döndürebilir; `UnitTextInput` boş metni yazar ve Temperature için ara istek oluşabilir. Regresyon değil (eski davranış), ama plan Riskleri'ndeki "`-` saklanmaz" ifadesi gerçek tarayıcıda yanlış olabilir; jsdom'da doğrulanamaz.
- **Temperature `+` öneki:** `UniformTemperaturePanel.tsx:531` işareti biçimlemeden önce `d>0` ile belirliyor; 0 ile 0.005 arası pozitif değerler `+0.00`, negatifler `0.00` görünür (görsel asimetri, düşük olasılık).
- **Kabul edilmiş riskler:** Length=cm iken pressure/unitWeight `0.000`; Length=mm iken birim ağırlık `2.400e-8` üstel gösterim (mühendis kararı).
- **`implementation.md` güncel değil:** 1177/166 test sayılarını gösteriyor, onarım turu belgelenmemiş (koda etkisi yok).
- Testler reviewer tarafından çalıştırılmadı; contract testi ve tam build sonuçları raporlara dayanıyor.
