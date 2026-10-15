# Plan: dinamik-load-hesaplama

Mühendis kararları (kullanıcı, chat üzerinden, 2026-10-15):
- **Q1:** Payda birimi Length tercihini izler (Length=mm iken `tonf/mm`, `tonf/mm³`). Birim ağırlık kuvvet tabanlıdır (Force/Length³); Mass'e bağlı yoğunluk değildir.
- **Q2 (revize 2026-10-15):** Ondalık sayısı proje Length birimine göre belirlenir: **m -> 4 ondalık, cm -> 3 ondalık, mm -> uzunluk değerleri 1 ondalık; mm iken kuvvet-bölü-uzunluk türevleri (lineLoad, pressure, unitWeight) 4 anlamlı hane** (üçüncü revizyon, seçenek A: mm'de türevler `toPrecision(4)` ile gösterilir; örn. `0.004000`, `0.00004079`, `2.400e-8`; JS `toPrecision` üssü < -6 olunca otomatik üstel gösterim yapar). m ve cm kuralı değişmedi. Bu kural Length'i içeren boyutlu değerlere uygulanır: length, lineLoad (F/L), pressure (F/L²), unitWeight (F/L³). Length içermeyen boyutlu değerler (force, temperature, temperatureDifference, 1/ΔT) sabit 2 ondalık kalır. Dimensionless katsayılar ve m/s, g, s bugünkü biçimini korur. (İlk sürümdeki "her yerde sabit 2 ondalık" kararı bununla değiştirildi.)
- **Q3:** Loads altındaki TÜM paneller proje birimlerine bağlanır. Pressure = Force/Length². Sıcaklık Temperature tercihini izler. Proje birim türü olmayan büyüklükler (m/s, g, s) sabit kalır ve ekranda belirtilir.
- **Q4 = A:** Hesap frontend'de kalır. Backend'de yalnızca javadoc + contract testi; yeni endpoint yok.
- **Q5:** `tonf` = 9.80665 kN (metrik ton-kuvvet, g_n kaynaklı), `kgf` = 0.00980665 kN (mevcut `quantities.ts:8-9`).

## 0. Özellik var mı?

**Hayır.** Project > Units & Preferences içinde Force, Length veya Temperature değiştiğinde Loads sekmesindeki hiçbir değer ya da birim etiketi değişmiyor.

- `frontend/src/features/loads/components/SelfWeightPermanent.tsx`: birim metinleri sabit (`:113`, `:123`, `:129-203`, `:211`, `:261`); Concrete Self Weight sabit `"25.00"` (`:122`); tek prop `crossSectionValues` (`:88`).
- `LoadsPanel.tsx:51` birim almıyor. Çağıranlar: `app/workspaces/WorkspacePage.tsx:23` ve `app/router.tsx:121` birim geçirmiyor; aynı dosyada family-tables alıyor (`WorkspacePage.tsx:21`, `projectUnits={project.units}`).
- Diğer paneller sabit birimli: `traffic/Lm1Panel.tsx:47,50,53-55` (kN, kN/m²); `traffic/CarriagewayNotionalLanes.tsx:37-75,103,112` ve `traffic/TrafficPreviewValidation.tsx:42,46` (m); `wind/WindLoadsPanel.tsx:10,12-13` (m, m/s, kN/m², kN/m, toFixed(3)); `temperature/UniformTemperaturePanel.tsx:7` (°C, /°C); `seismic/SeismicPanel.tsx:8,10` (g, s).
- Backend birimleri yorumlamıyor: `ProjectInfo.java:67` ("Unit labels as entered"); contract testi boş birimleri kabul ediyor (`ProjectLoadGraphApiContractTest.java:479`); kalıcı yük hesabı backend'de yok.
- `docs/architecture.md:2525-2526`: "Unit preferences use SI display defaults ... without implementing conversions".
- Mevcut altyapı: `frontend/src/features/graph/domain/quantities.ts` (kgf/tonf `:8-9`, C/F/K ve delta birimleri, `getDisplayUnit/toDisplayValue/toInternalValue` `:26-31`). Eksik: lineLoad ve pressure türleri; unitWeight için tonf/kgf yok. `'kN/m'` id'si `translationalStiffness` türüne ait (`:6`, `getUnit` ilk eşleşeni döndürür `:15`) -> aynı id ile yeni kayıt eklenemez.

## 1. Davranış, kapsam, kabul ölçütleri

**Hedef:** Saklama kanonik SI (kN, m, kN/m, kN/m², kN/m³, °C) kalır. Çevrim yalnızca gösterim/girdi sınırında yapılır (graph ve family-tables deseni). Birim değişince ekran yeniden çizilir, hiçbir yük bölümü yazılmaz.

**Kapsam:** Self Weight, Traffic (Carriageway, LM1, Preview), Wind, Temperature, Seismic.

**Kapsam dışı:** Fast Solver; formül/katsayı/EN değeri değişikliği; backend'e hesap taşıma ya da yeni endpoint; m/s, g, s için yeni birim türü; `quantities.ts`'in `shared/` altına taşınması.

### Boyut tablosu

**Self Weight & Permanent**

| Öğe | Alan | Boyut | Kanonik | Girdi? |
|---|---|---|---|---|
| Concrete Self Weight | sabit 25 | unitWeight | kN/m³ | pasif |
| Kalınlık/genişlik | `asphaltThicknessM`, `sidewalkThicknessM`, `faciaWidthM`, `faciaThicknessM` | length | m | evet |
| Pasif genişlikler | carriageway, `left + right` walkway | length | m | pasif |
| Birim ağırlıklar | `asphaltUnitWeightKNm3`, `sidewalkUnitWeightKNm3`, `faciaUnitWeightKNm3` | unitWeight | kN/m³ | evet |
| Birim yükler | `guardrail/pedestrianRailing/protectiveFence/soundPanel…UnitLoadKNm` | lineLoad | kN/m | evet |
| Adetler | `…Count` | dimensionless | - | evet, çevrilmez |
| Satır sonuçları, TOTAL | - | lineLoad | kN/m | çıktı |

**Traffic**

| Öğe | Alan | Boyut | Kanonik | Girdi? |
|---|---|---|---|---|
| Carriageway | deck, left/right walkway, carriageway, lane `widthM`, `remainingAreaWidthM`, SVG etiketleri | length | m | pasif |
| LM1 Tandem | `characteristicValue`, effective | force | kN | çıktı |
| LM1 UDL, Remaining area | `characteristicValue`, effective | pressure | kN/m² | çıktı |
| LM1 α | `adjustmentFactor` | dimensionless | - | evet, çevrilmez |
| Preview | carriageway, remaining area | length | m | çıktı |

**Wind**

| Öğe | Boyut | Kanonik | Not |
|---|---|---|---|
| `vb` | hız | m/s | girdi, **sabit** |
| Terrain | kategori | - | girdi |
| `ze` | length | m | girdi (metin) |
| `deckWidthM`, `drefM` | length | m | pasif |
| `z0M`, `zminM` | length | m | çıktı |
| `vmMs` | hız | m/s | çıktı, **sabit** |
| `qpKNm2` | pressure | kN/m² | çıktı |
| `transverseKNm` | lineLoad | kN/m | çıktı |
| `bOverD`, `kr`, `cr`, `Iv`, `cfx` | dimensionless | - | çevrilmez |

**Temperature**

| Öğe | Boyut | Kanonik | Not |
|---|---|---|---|
| Te,min, Te,max, T0 (`min`,`max`,`t0`) | temperature | °C | girdi (metin) |
| `effectiveMinimumC`, `effectiveMaximumC`, `initialTemperatureC` | temperature | °C | çıktı |
| `contractionC`, `expansionC` (ΔTcon, ΔTexp) | temperatureDifference | °C | çıktı |
| `concreteAlphaTPerC`, `steelAlphaTPerC` | 1/temperatureDifference | 1/°C | çıktı |

**Seismic:** agR/ag/spektral ivme (g), TB/TC/TD/T (s) **sabit**; γI, S, η dimensionless.

### Kabul ölçütleri

- **AC1:** Varsayılan birimlerde (`m, kN, kNm, MPa, t, C`) etiketler bugünkü ile aynı; değerler Q2 gereği Length=m için 4 ondalıkla gösterilir (örn. `0.1000 m`, `4.0000 kN/m`), Length içermeyen boyutlu değerler 2 ondalık (AC12).
- **AC2:** Force=tonf, Length=m (4 ondalık): Self Weight lineLoad girdileri, satır sonuçları ve TOTAL `tonf/m`; değer `kN/9.80665`. Guardrail birim yükü 2.0 kN/m -> `0.2039`; satır sonucu 4.0 kN/m -> `0.4079 tonf/m`.
- **AC3:** Force=tonf, Length=m: unitWeight `tonf/m³`; 24 kN/m³ -> `2.4473`, Concrete Self Weight 25 kN/m³ -> `2.5493`. Mass tercihi değişince hiçbir Loads değeri değişmez.
- **AC4:** Length=mm: length terimleri 1 ondalık (0.10 m -> `100.0`); paydalar Length'i izler: `tonf/mm`, `tonf/mm³`, `tonf/mm²`. lineLoad/pressure/unitWeight 4 anlamlı hane: 4.0 kN/m -> `0.004000 kN/mm`, `0.0004079 tonf/mm`; 9 kN/m² -> `0.000009000 kN/mm²`; 24 kN/m³ -> `2.400e-8 kN/mm³`; TOTAL 55.55 kN/m -> `0.05555 kN/mm`. Değer 0 ise `0.000`. Length=cm (3 ondalık): 0.10 m -> `10.000`.
- **AC5:** Traffic: Carriageway, lane genişlikleri, SVG etiketleri ve Preview uzunlukları Length biriminde ve Length'in ondalık kuralıyla; sütun başlıkları dinamik (`Width (mm)`).
- **AC6:** LM1: Tandem force (Length içermez, 2 ondalık; tonf iken 300 kN -> `30.59 tonf`); UDL ve Remaining area Force/Length² (Stress'ten bağımsız; Length ondalık kuralı: Length=m iken `kN/m²` -> `9.0000`, `tonf/m²` -> `0.9177`); effective değerler aynı birimde; Unit sütunu dinamik; α değişmez.
- **AC7:** Wind: `ze` Length biriminde gösterilir/düzenlenir, saklanan ve backend'e giden `zeM` metre kalır (Length=mm iken `10000` yazılırsa `ze="10"`). `z0`, `zmin`, deck width, `dref` Length; `qp` pressure; transverse lineLoad. `vb`/`vm` m/s sabit, ekranda "proje biriminden bağımsız" notu. Yalnızca birim değişikliği snapshot'ı STALE yapmaz.
- **AC8:** Temperature: Te,min/Te,max/T0 girdileri ve sonuçları Temperature biriminde (°C/°F/K); ΔT `deltaC/deltaF/deltaK`; αT `/°C`, `/°F`, `/K`. T0=10 °C -> `50.00 °F`; ΔT=-20 °C -> `-36.00 °F`. °F girdi saklanırken/backend'e giderken °C olur (`-4` °F -> `"-20"`).
- **AC9:** Seismic'te hiçbir değer çevrilmez; ekranda "agR/ag g, periyotlar s - proje biriminden bağımsız" notu.
- **AC10:** Birim değişikliği hiçbir `loads/*` bölümüne yazma isteği göndermez (`selfWeightInputs`, wind, temperature, `trafficLm1`); okunan değerler önce/sonra derin eşit. Wind ve temperature sorguları yeniden tetiklenmez (query key kanonik değerlerden).
- **AC11:** Backend: `PUT /workspace` ile `force:"tonf"`, `length:"mm"`, `temperature:"F"` -> tüm `loads` bölümleri (selfWeight, wind, temperature, trafficLm1, seismic, windSnapshot) aynen kalır (yeni contract testi).
- **AC12:** Ondalık kuralı: Length içeren boyutlu değerler (length, lineLoad, pressure, unitWeight) Length birimine göre: length değerleri m=4, cm=3, mm=1 ondalık; lineLoad/pressure/unitWeight m=4, cm=3 ondalık, mm=4 anlamlı hane; Length içermeyenler (force, temperature, ΔT, 1/ΔT) 2 ondalık. Wind lineLoad/pressure ve LM1 pressure da bu kurala girer (Wind `12.300 kN/m` Length=m'de `12.3000 kN/m`, Length=mm'de `0.01230 kN/mm`). Çevrilmeyenler bugünkü biçimini korur: dimensionless katsayılar (Wind `toFixed(3)`), m/s, g, s.
- **AC13:** Gidiş-dönüş: Force=tonf, Length=m, Guardrail alanına `0.5` -> `4.903325` kN/m saklanır; kN'ye dönünce `4.9033` görünür. Odaklanıp düzenlemeden çıkış değeri değiştirmez.
- **AC14:** TOTAL kanonik değerler toplanıp çevrilir (yuvarlanmış satırların toplamı değil).
- **AC15:** Bilinmeyen/boş birim id'si -> kanonik birime düşer, hata yok.
- **AC16:** `npm run build`, `npm run lint`, `npm test`, `mvn -f backend/pom.xml -B package` geçer.

## 2. Kararlar ve değişiklikler

- **K1:** Saklama ve backend'e giden istekler kanonik SI/°C. Göç, şema değişikliği, Flyway yok. Mevcut metin alanları (`ze`, `min`, `max`, `t0`) zaten m ve °C.
- **K2:** Bileşik birimler kayıt defterine eklenmez, mevcut tanımlardan türetilir: `display = F.fromCanonical(v) x L.toCanonical(1)^n`; ters: `v = F.toCanonical(display / L.toCanonical(1)^n)`; n: lineLoad 1, pressure 2, unitWeight 3. αT: `display = a x dT.toCanonical(1)` (/°F için `a x 5/9`). Yeni katsayı yok.
- **K3:** Birimler prop ile taşınır (`projectUnits?: ProjectUnits`); verilmezse kanonik. `realDefaultsWire.test.tsx:53` ve `LoadsPanel.test.tsx:22` bozulmaz.
- **K4:** Backend: yalnızca javadoc + contract testi (Q4=A).

### Frontend

- **Yeni `features/loads/model/loadUnits.ts`:** `LoadQuantity = 'length'|'force'|'lineLoad'|'pressure'|'unitWeight'|'temperature'|'temperatureDifference'|'perTemperatureDifference'`; `loadUnit(q, units)` -> `{label, toDisplay, toCanonical}` (force/length `getDisplayUnit('Force'|'Length', units)`, sıcaklık `toDisplayValue/toInternalValue` ile `'Absolute Temperature'|'Temperature Difference'`); `formatLoadValue(v, q, units)` (sayı metni): length türü Length m->4, cm->3, mm->1 ondalık (`toFixed`); lineLoad/pressure/unitWeight Length m->4, cm->3 ondalık (`toFixed`), mm->`toPrecision(4)`; bilinmeyen/boş Length id -> m kuralı (4 ondalık); force/temperature/ΔT/1/ΔT 2 ondalık; kasıtlı olarak `getLengthDisplayPrecision` kullanılmaz (cm için 2 verir); `formatLoad(v,q,units)` = `formatLoadValue(...)+' '+label`; `canonicalText/displayText` (boş boş kalır, sayı olmayan yazılmaz, `Number(x.toPrecision(15))`). `graph/domain/quantities` bağımlılığı (R3 sayacı; R4 ihlali yok).
- **Yeni `features/loads/components/UnitTextInput.tsx`:** Wind/Temperature metin alanları; odakta taslak, odak dışında `formatLoadValue` biçimi; geçerli sayı/boş değişimde kanonik metin yazılır; `type="number"` ve aria korunur.
- `shared/ui/DecimalInput.tsx`: opsiyonel `format?: (value:number)=>string` prop'u eklenir (varsayılan `v=>v.toFixed(2)`, mevcut kullanımlar değişmez; başlangıç, odak ve görünüm metni bu fonksiyondan). Çevrilmiş `value` verilir, `onChange`'de `toCanonical` uygulanır. Düzenlemeden çıkış `onChange` çağırmaz. `format` testi eklenir (4 anlamlı hane ve üstel biçim dahil); üstel metin (`2.400e-8`) girişte `Number()` ile ayrıştırılabilir olduğu için tekrar yazılabilir.
- `SelfWeightPermanent.tsx`: `projectUnits` prop; `Term.quantity`; `FormulaRow`/TOTAL `loadUnit` ile; Concrete 25 kanonik, gösterim çevrilir; alt başlık ve Sidewalk `left + right` çevrilir; hesap satırları (`:98-107`) aynen.
- Traffic: `TrafficLoadsPanel.tsx` -> `CarriagewayNotionalLanes.tsx`, `Lm1Panel.tsx` (sabit `'kN'|'kN/m²'` yerine `'force'|'pressure'`), `TrafficPreviewValidation.tsx`.
- `WindLoadsPanel.tsx`: `ze` `UnitTextInput`; `fmt` yerine `formatLoad`; `vb`/`vm` sabit m/s + not; dimensionless `toFixed(3)` korunur.
- `UniformTemperaturePanel.tsx`: üç girdi `UnitTextInput` (temperature); `display`/`alpha` birime duyarlı; `+` öneki korunur; Details formül metinleri çevrilmiş.
- `SeismicPanel.tsx`: yalnızca not.
- `LoadsPanel.tsx`: `projectUnits?` tüm alt panellere. `WorkspacePage.tsx:23` ve `router.tsx:121`: `projectUnits={project.units}` (`project` kapsamda: `:15`, `:98`).

### Backend (Q4=A)

- Javadoc: `WindInputs` ("kanonik metin: ze m, vb m/s"), `TemperatureInputs` ("kanonik metin, °C") - bugün "exactly as the user typed them" diyor; `SelfWeightInputs`, `TrafficLm1Inputs`, `ProjectInfo.Units`: "proje birimleri yalnızca gösterim tercihidir; yük girdileri kanonik SI".
- Test: `ProjectLoadGraphApiContractTest` içine `workspaceUnitChange_leavesEveryLoadSectionUnchanged` (AC11): `LOADS` dizisindeki (`:116-`) her bölüme PUT, `/workspace` `units` değiştirip PUT, `/loads/*` önceki ile eşit.

## 3. Uygulama adımları

1. `quantities.test.ts`: tonf (9.80665) ve kgf (0.00980665) testleri.
2. `loadUnits.ts` + `loadUnits.test.ts` (tüm türler; kN/tonf/kgf/N x m/cm/mm; C/F/K ve delta; αT; gidiş-dönüş; boş/bilinmeyen id; etiketler; metin yardımcıları).
3. `UnitTextInput.tsx` + test.
4. `SelfWeightPermanent.tsx` (AC2-4, 13, 14).
5. Traffic bileşenleri (AC5, 6).
6. `WindLoadsPanel.tsx` (AC7).
7. `UniformTemperaturePanel.tsx` (AC8).
8. `SeismicPanel.tsx` notu (AC9).
9. Prop zinciri: `LoadsPanel.tsx`, `WorkspacePage.tsx:23`, `router.tsx:121`.
10. Mevcut test güncellemeleri: `WindLoadsPanel.test.tsx` (lineLoad/pressure metinleri Length=m için 4 ondalığa: `'12.300 kN/m'`->`'12.3000 kN/m'`, `'12.346 kN/m'`->`'12.3460 kN/m'`, `:62-66`, `:112-200`; `'99 m/s'` `:56` ve dimensionless `toFixed(3)` değişmez); `UniformTemperaturePanel.test.tsx` (`'-8 °C'`->`'-8.00 °C'`, `:21-30`); `Lm1Panel.test.tsx` birim/ondalık beklentileri (pressure 4 ondalık, force 2).
11. Yeni testler: her panel için `projectUnits` + `rerender` (AC1-9, 12, 15); AC10 (`readProjectData` önce/sonra + PUT sayısı); AC7/AC8 istek gövdesinin kanonik olması (`fetch` stub body).
12. Backend javadoc + AC11 testi.
13. Dokümanlar: `docs/architecture.md` "Loads birim çevrimi" bölümü (`:2525` notu güncellenir); `docs/roadmap.md` girdisi; yeni `docs/e2e/19-yuk-birimleri.md`. `docs/e2e/05-graph-family.md`'ye DOKUNULMAZ (kullanıcının commit edilmemiş değişikliği var).

## 4. Doğrulama

| AC | Kontrol | Beklenen |
|---|---|---|
| AC1 | Varsayılan birimle mevcut+yeni testler | Etiketler aynı |
| AC2-4 | `SelfWeightPermanent` testi; `{force:'tonf'}`, `{length:'mm'}` | Örnek değerler |
| AC5-6 | Traffic testleri | `mm` başlıklar, `30.59 tonf`, `0.92 tonf/m²` |
| AC7 | Wind testi, Length=mm | `ze` "10", istekte `zeM: 10`, STALE yok |
| AC8 | Temperature testi, F | `50.00 °F`; istekte °C |
| AC9 | Seismic testi | Not var, değerler aynı |
| AC10 | `readProjectData` + PUT sayısı | Değişiklik yok |
| AC11 | `mvn -f backend/pom.xml -B test -Dtest=ProjectLoadGraphApiContractTest` | Geçer |
| AC12-15 | Birim ve bileşen testleri | Beklenen metin/değer |
| AC16 | Tam komutlar | Başarılı |

Komutlar:
- Hedefli: `cd frontend && npm test -- src/features/loads src/features/graph/domain/quantities.test.ts src/app/project-session/realDefaultsWire.test.tsx src/test/architecture`
- Tam: `cd frontend && npm run build && npm run lint && npm test`
- Backend: `mvn -f backend/pom.xml -B package`
- Elle: Force=tonf, Length=mm, Temperature=F seçip her Loads sekmesini gez; kN, m, °C'ye dönünce değerlerin aynen döndüğünü gör.

## 5. Riskler

- **Length=cm iken pressure ve unitWeight yine küçük çıkar** (3 ondalık): 24 kN/m³ -> 0.000024 kN/cm³ -> `0.000`; 9 kN/m² -> 0.0009 kN/cm² -> `0.001`; `tonf/cm³` ve `tonf/cm²` daha da küçük. Kullanıcının kuralı (A) yalnızca mm için anlamlı hane verdi; cm bilinçli olarak 3 ondalık bırakıldı. Gerekirse cm de anlamlı hane kuralına alınabilir (ayrı karar).
- **Length=mm iken üstel gösterim:** çok küçük birim ağırlık değerleri `2.400e-8` gibi görünür; okunabilirlik kullanıcı tarafından A seçeneği olarak kabul edildi.
- Length=m için lineLoad `tonf/m` 4 kN/m -> `0.4079`; Length=cm için `tonf/cm` 4 kN/m -> `0.004`.
- Force=N iken değerler büyür (Length=m, 4000.0000 N/m).
- Ondalık değişikliği görünür fark yaratır: Wind (3->2), LM1 (0/1->2), Temperature (biçimsiz->2); ilgili testler güncellenir.
- Wind/Temperature metin girdilerinde davranış değişir: geçersiz ara metin (tek başına `-`) saklanmaz, yalnızca taslakta kalır (bugün her tuş vuruşu saklanıyor).
- Bilinmeyen birim id'leri sessizce kanonik birime düşer (backend doğrulamıyor).
- Loads, graph domain dosyasına bağımlı olur (R3 sayacı); taşıma ayrı iş.
- Wind snapshot: eski `inputs.ze` metni kanonik; kullanıcı düzenlerse `toPrecision(15)` ile normalleşir (örn. `"10.0"` -> `"10"`) ve snapshot STALE olabilir; yalnızca düzenlemede, birim değişikliğinde değil.

## 6. Varsayımlar

- Pressure Force/Length² türetilir, Stress'i izlemez (mühendis kararı); birim ağırlık Force/Length³, Mass kullanılmaz (mühendis kararı).
- Hız (m/s), ivme (g), periyot (s) için proje birim türü yok; sabit kalır, ekranda belirtilir; yeni birim türü eklenmez.
- `tonf` = 9.80665 kN (metrik ton-kuvvet, g_n = 9.80665 m/s², CGPM 1901 / ISO 80000-3), `kgf` = 0.00980665 kN; katsayılar `quantities.ts:8-9`.
- Ondalık kuralı (m=4, cm=3, mm: length 1 ondalık, türevler 4 anlamlı hane) Length içeren boyutlu değerlere uygulanır (length, lineLoad, pressure, unitWeight); force/temperature/ΔT/αT 2 ondalık kalır (kullanıcı kuralının yorumu, Length yalnızca uzunluk değerleri için verilmiş olsa da türevler paydadaki Length'i izler). Proje Length seçenekleri yalnızca m, cm, mm (`ProjectWorkspace.tsx:31`); bilinmeyen id -> 4.
- Saklanan değerler zaten kanonik; göç gerekmez.
- Birim seçimi anında uygulanır, kaydet/iptal dışındadır (`ProjectWorkspace.tsx:65,101`).
- Formüller ve varsayılanlar değişmez; hesap frontend'de.

STATUS: READY
