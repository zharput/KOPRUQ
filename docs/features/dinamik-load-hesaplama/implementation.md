# Uygulama raporu: dinamik-load-hesaplama

Sonuç: RESULT: COMPLETE (implementer raporu; koordinatör hedefli frontend testlerini bağımsız yeniden çalıştırdı: 16 dosya / 166 test geçti).

## Değişen ve yeni dosyalar

Frontend, yeni:
- `frontend/src/features/loads/model/loadUnits.ts` (+ `loadUnits.test.ts`): `LoadQuantity`, `loadUnit`, `formatLoadValue`, `formatLoad`, `loadFormatter`, `formatDisplayNumber`, `canonicalText`, `displayText`; bileşik birimler `quantities.ts` kayıtlarından türetilir, yeni katsayı yok.
- `frontend/src/features/loads/components/UnitTextInput.tsx` (+ test)
- `frontend/src/features/loads/components/LoadsUnits.test.tsx` (panel bazlı `projectUnits`/`rerender`, AC10)
- `frontend/src/shared/ui/DecimalInput.test.tsx`

Frontend, değişen: `shared/ui/DecimalInput.tsx` (opsiyonel `format`), `SelfWeightPermanent.tsx`, `LoadsPanel.tsx`, `traffic/{TrafficLoadsPanel,CarriagewayNotionalLanes,Lm1Panel,TrafficPreviewValidation}.tsx`, `wind/WindLoadsPanel.tsx`, `temperature/UniformTemperaturePanel.tsx`, `seismic/SeismicPanel.tsx`, `app/workspaces/WorkspacePage.tsx`, `app/router.tsx`; testler: `quantities.test.ts`, `LoadsPanel.test.tsx`, `WindLoadsPanel.test.tsx`, `UniformTemperaturePanel.test.tsx`.

Backend: javadoc (`WindInputs`, `TemperatureInputs`, `SelfWeightInputs`, `TrafficLm1Inputs`, `ProjectInfo.Units`); yeni contract testi `workspaceUnitChange_leavesEveryLoadSectionUnchanged`. Yeni endpoint/migration/bağımlılık yok.

Dokümanlar: `docs/architecture.md`, `docs/roadmap.md`, `docs/e2e/19-yuk-birimleri.md` (yeni), `docs/e2e/README.md`.

## Kabul ölçütleri (özet kanıt)

AC1-AC15 implementer tarafından panel/birim testleriyle karşılandı (`LoadsUnits.test`, `loadUnits.test`, Wind/Temperature/LM1 testleri, contract testi AC11). Örnekler: tonf `0.2039`, `0.4079 tonf/m`, `2.4473`; mm `100.0`, `0.004000 kN/mm`, `2.400e-8 kN/mm³`; LM1 `30.59` tonf, `0.9177` tonf/m²; Wind `zeM: 10` gövdede; °F `-4` -> `-20` istekte; birim değişince PUT sayısı değişmez.

## Çalıştırılan kontroller

- `cd frontend && npm run build` -> geçti (implementer)
- `cd frontend && npm run lint` -> exit 0 (implementer; uyarılar loads dışı)
- `cd frontend && npm test` -> 124 dosya / 1177 test geçti (implementer)
- Koordinatör: `npm test -- src/features/loads src/features/graph/domain/quantities.test.ts src/shared/ui src/test/architecture` -> 16 dosya / 166 test geçti
- `mvn -f backend/pom.xml -B test -Dtest=ProjectLoadGraphApiContractTest` -> 111 test, 0 hata (implementer)
- `mvn -f backend/pom.xml -B package` -> BUILD SUCCESS, 733 test, 0 hata, 1 atlanan (implementer)
- Tarayıcıda elle test yapılmadı; yerine `docs/e2e/19-yuk-birimleri.md` yazıldı.

## Plan dışı ayrıntılar / sınırlamalar

1. Wind örnek sayısı `12.3457 kN/m` (plandaki `12.3460` yerine; `transverseKNm`=12.345678…; kural plana uygun).
2. `LoadsPanel.test.tsx`: `projectUnits` verilmese de Length=m kuralı (4 ondalık) uygulandığı için iki beklenti güncellendi (`0.10`->`0.1000`, `0.20`->`0.2000`).
3. `type="number"` kısıtı: React sayısal eşit değerde DOM metnini yeniden yazmaz; `UnitTextInput` odak dışında bazen yazılan metni (`10000`) koruyabilir. Başlangıç/rerender ve birim değişiminde biçimli metin görünür; sınırlama `architecture.md`'de.
4. αT biçimi `10.00 × 10⁻⁶ /°C` oldu (eskiden `10`).
5. cm'de küçük pressure/unitWeight değerleri az haneli çıkar (plan Riskleri).
6. Eklenenler: Wind/Temperature birim ipucu satırı; Sidewalk pasif girdi genişliği 104 -> 136 px.

Review yapılmadı.
