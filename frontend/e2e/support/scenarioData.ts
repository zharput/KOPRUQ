/**
 * Test data taken from the manual scenarios in docs/e2e. Every constant names its source document and step.
 * These are synthetic software-test inputs, not engineering design values or acceptances.
 */

/** docs/e2e/04-kopru-kimligi.md, table "Köprü formuna girilecek test verileri". */
export const BRIDGE_A = {
  no: 'E2E-A',
  km: '0+000.000',
  crossingType: 'Test Crossing A',
  estimatedLengthM: '120',
  roadWidthM: '10',
  terrain: 'Not imported',
  status: 'Draft',
} as const

/** docs/e2e/04-kopru-kimligi.md, table "Köprü formuna girilecek test verileri". */
export const BRIDGE_B = {
  no: 'E2E-B',
  km: '0+200.000',
  crossingType: 'Test Crossing B',
  estimatedLengthM: '80',
  roadWidthM: '10',
  terrain: 'Not imported',
  status: 'Draft',
} as const

export type BridgeRow = { no: string; km: string; crossingType: string; estimatedLengthM: string; roadWidthM: string; terrain: string; status: string }

/** docs/e2e/16-maliyet-tablosu.md, "Ön koşul": başlıklar `Kalem`, `BirimFiyat`; veri satırı `E2E örnek`, `1` (dosya okuma testi, gerçek fiyat değil). */
export const COST_SHEET: (string | number)[][] = [['Kalem', 'BirimFiyat'], ['E2E örnek', 1]]

/** docs/e2e/12-malzeme-katalogu.md adım 2: "farklı bir seçenek seçin; örneğin `C35/45`" (veri akışı testi, malzeme onayı değil). */
export const MATERIAL_CHOICE = 'C35/45'

/** docs/e2e/11-api-hata-sozlesmesi.md adım 1: bozuk JSON gövdesi. */
export const MALFORMED_BODY = '{bozuk-json'

/** docs/e2e/14-sicaklik-durumu.md, "Ön koşul" ve adımlar 2-3: `0`, `20`, `10 °C` (sentetik test girdisi, tasarım sıcaklığı değil). */
export const TEMPERATURE = { min: '0', max: '20', t0: '10' } as const

/** docs/e2e/15-deprem-durumu.md, "Ön koşul" ve adım 2: `agR = 0.2`, `γI = 1` (sentetik test girdisi). */
export const SEISMIC = { agR: '0.2', importanceFactor: '1' } as const

/** docs/e2e/07-ruzgar-guncellik.md adım 1 ve 4: `vb = 27`, Terrain Category `II`, `ze = 10`; sonra `vb = 28` (sentetik test girdisi). */
export const WIND = { vb: '27', vbChanged: '28', terrain: 'II', ze: '10' } as const

/** docs/e2e/06-trafik-yukleri.md adım 3 ve 6: ilk LM1 `α` alanına `1.1` (sentetik arayüz test verisi). */
export const LM1_ALPHA = '1.1'

/** docs/e2e/19-yuk-birimleri.md - adım sayısı: değerler belge metninden (sentetik test girdileri / ekran biçimleri, mühendislik kabulü değil). */
export const UNITS_DOC = {
  /** adım 1: varsayılan birimlerde (kN, m, °C). */
  defaults: { guardrailUnitLoad: '2.0000', guardrailResult: '4.0000 kN/m' },
  /** adım 2: Force = tonf (Length = m). */
  tonf: { guardrailUnitLoad: '0.2039', guardrailResult: '0.4079 tonf/m', concreteUnitWeight: '2.5493', asphaltUnitWeight: '2.4473' },
  /** adım 3: Length = mm (Force = tonf; belgedeki `0.0004079 tonf/mm` örneği) ve cm. */
  mm: { asphaltThickness: '100.0', guardrailResult: '0.0004079 tonf/mm' },
  cm: { asphaltThickness: '10.000' },
  /** adım 4: LM1 Tandem ve UDL (Force = tonf, Length = m). */
  lm1: { tandem: '30.59', udl: '0.9177' },
  /** adım 5: Length = mm iken ze alanına `10000` yazılır; m'ye dönünce `10.0000`; vb belge 07'den (27). */
  wind: { zeInMm: '10000', zeInM: '10.0000', vb: '27' },
  /** adım 6: Temperature = °F iken girilen değerler. */
  temperatureF: { min: '-4', max: '104', t0: '50' },
  /** adım 7: sabit not metni. */
  seismicNote: 'agR and ag are in g, periods in s - independent of the project units.',
  /** adım 5: sabit not metni. */
  windNote: 'vb and vm are in m/s - independent of the project units.',
} as const

/** docs/e2e/19 adım 2/4: kN -> tonf dönüşüm böleni (`quantities.ts` birim kaydındaki faktör; yalnız birim dönüşümü, mühendislik kuralı değil). */
export const KN_PER_TONF = 9.80665

/** docs/e2e/13-kopru-tanimi.md adım 2: "Selected span lengths" alanına `30, 40, 50` (örnek geometri verisi). */
export const SPAN_TEXT = '30, 40, 50'
/** docs/e2e/13 adım 3: aks konumları `0`, `30`, `70`, `120 m` (girilen sayıların kümülatif toplamı). */
export const SPAN_TOTAL_M = 120
export const AXES_30_40_50 = [
  { name: 'A1', type: 'ABUTMENT', chainageM: 0 },
  { name: 'P1', type: 'PIER', chainageM: 30 },
  { name: 'P2', type: 'PIER', chainageM: 70 },
  { name: 'A2', type: 'ABUTMENT', chainageM: 120 },
] as const

/** docs/e2e/04-kopru-kimligi.md adım 2 ve 3: Graph adları. */
export const GRAPH_NAME_A = 'A grafiği'
export const GRAPH_NAME_B = 'B grafiği'

/**
 * docs/e2e/08-landxml-kalici-veri.md (sentetik fixture backend/src/test/resources/sample.landxml: 4 nokta, 2 yüz; "Existing Ground", "Main Alignment").
 * Adım 2: Surface = Existing Ground, 4 nokta / 2 yüz / metre; adım 3: Coordinate 1 = Y; coordinate 2 = X (FIRST_Y_SECOND_X), Alignment = Main Alignment.
 */
export const LANDXML_DOC = {
  surface: 'Existing Ground',
  alignment: 'Main Alignment',
  coordinateOrder: 'FIRST_Y_SECOND_X',
  points: 4,
  faces: 2,
  units: 'meter',
} as const

/** docs/e2e/05-graph-family.md, "Önce bilinmesi gerekenler" ve adım 6: Girder Height varsayılanı 2.5 m, değişiklik 2.6 (küçük bir miktar; sentetik test girdisi). */
export const GIRDER_HEIGHT = { initial: 2.5, changed: 2.6 } as const
/** docs/e2e/05 adım 2: Steel Class varsayılanı S355 (görünür kalır). */
export const STEEL_CLASS = 'S355'
/** docs/e2e/05 adım 1/3: bağlantı yokken beklenen doğrulama mesajı. */
export const GIRDER_NOT_CONNECTED = 'Input Structural Steel is not connected.'
