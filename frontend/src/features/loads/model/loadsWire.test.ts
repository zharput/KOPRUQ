import { describe, expect, it } from 'vitest'
import { parseProjectData } from '../../../shared/project-store/projectDataValidation'
import type { Lm1Parameters } from '../api/trafficLoadsService'
import {
  SEISMIC_SECTION, SELF_WEIGHT_SECTION, TEMPERATURE_SECTION, TRAFFIC_LM1_SECTION, WIND_SECTION, WIND_SNAPSHOT_SECTION, loadsWireSchema, seismicToWire, selfWeightToWire,
  temperatureToWire, trafficLm1FromWire, trafficLm1ToWire, trafficLm1WireSchema, windSnapshotFromWire, windSnapshotToWire, windSnapshotWireSchema, windToWire,
  type SelfWeightInputs, type WindSnapshotInputsValue,
} from './loadsWire'
import type { WindCalculationSnapshot } from './windTypes'

// Same data as SAMPLE_MODULES in app/project-file/projectModulesRoundTrip.test.ts
const SEISMIC = { a: '0.2', g: 'C', t: 'Type 2', i: '1.2' }
const WIND = { vb: '27', terrain: 'III', ze: '12' }
const TEMPERATURE = { min: '-20', max: '40', t0: '10' }
const SELF_WEIGHT: SelfWeightInputs = { asphaltThicknessM: 0.12, asphaltUnitWeightKNm3: 23, sidewalkThicknessM: 0.2, sidewalkUnitWeightKNm3: 25, faciaCount: 2, faciaWidthM: 0.6, faciaThicknessM: 0.1, faciaUnitWeightKNm3: 25, guardrailCount: 1, guardrailUnitLoadKNm: 2, pedestrianRailingCount: 2, pedestrianRailingUnitLoadKNm: 1.5, protectiveFenceCount: 0, protectiveFenceUnitLoadKNm: 1, soundPanelCount: 1, soundPanelUnitLoadKNm: 1 }
const LM1: Lm1Parameters = {
  tandemSystem: [{ label: 'Lane 1', characteristicValue: { value: 300, provenance: 'CODE_DEFAULT', codeDefaultValue: 300 }, adjustmentFactor: { value: null, provenance: 'NATIONAL_ANNEX', codeDefaultValue: null } }],
  udl: [{ label: 'Lane 1', characteristicValue: { value: 9, provenance: 'CODE_DEFAULT', codeDefaultValue: 9 }, adjustmentFactor: { value: 1, provenance: 'PROJECT_OVERRIDE', codeDefaultValue: 0.8 } }],
  remainingAreaUdl: { label: 'Remaining', characteristicValue: { value: 2.5, provenance: 'CODE_DEFAULT', codeDefaultValue: 2.5 }, adjustmentFactor: { value: 0.8, provenance: 'PROJECT_OVERRIDE', codeDefaultValue: 1 } },
}
const SNAPSHOT: WindCalculationSnapshot = {
  schemaVersion: 1, status: 'VALID', inputs: { vb: '27', terrain: 'III', ze: '12', deckWidthM: 13.8, drefM: 2.1 },
  result: { status: 'VALID', z0M: 0.3, zminM: 5, kr: 0.2, cr: 1, vmMs: 27, turbulenceIntensity: 0.2, qpKNm2: 1, bOverD: 6, cfx: 1.3, transverseKNm: 5, missing: null },
}

describe('loads wire mapping', () => {
  it('round-trips the string-input and self-weight sections and keeps the backend key order', () => {
    expect(SEISMIC_SECTION.codec.fromWire(seismicToWire({ ...SEISMIC, extra: 1 } as typeof SEISMIC))).toEqual(SEISMIC)
    expect(SEISMIC_SECTION.codec.toWire(SEISMIC)).toEqual(SEISMIC); expect(Object.keys(seismicToWire(SEISMIC))).toEqual(['a', 'g', 't', 'i'])
    expect(WIND_SECTION.codec.fromWire(windToWire(WIND))).toEqual(WIND); expect(Object.keys(windToWire(WIND))).toEqual(['vb', 'terrain', 'ze'])
    expect(TEMPERATURE_SECTION.codec.fromWire(temperatureToWire(TEMPERATURE))).toEqual(TEMPERATURE); expect(Object.keys(temperatureToWire(TEMPERATURE))).toEqual(['min', 'max', 't0'])
    expect(SELF_WEIGHT_SECTION.codec.fromWire(selfWeightToWire(SELF_WEIGHT))).toEqual(SELF_WEIGHT)
    expect(Object.keys(selfWeightToWire(SELF_WEIGHT))).toEqual(['asphaltThicknessM', 'asphaltUnitWeightKNm3', 'sidewalkThicknessM', 'sidewalkUnitWeightKNm3', 'faciaCount', 'faciaWidthM', 'faciaThicknessM', 'faciaUnitWeightKNm3', 'guardrailCount', 'guardrailUnitLoadKNm', 'pedestrianRailingCount', 'pedestrianRailingUnitLoadKNm', 'protectiveFenceCount', 'protectiveFenceUnitLoadKNm', 'soundPanelCount', 'soundPanelUnitLoadKNm'])
  })
  it('keeps the user-typed text of seismic, wind and temperature unchanged', () => {
    const typed = { a: ' 0,2 ', g: '', t: 'x', i: '1.20' }
    expect(seismicToWire(typed)).toEqual(typed)
  })
  it('round-trips LM1 including its null parameter values and keeps the key order', () => {
    const wire = trafficLm1ToWire(LM1)
    expect(Object.keys(wire)).toEqual(['tandemSystem', 'udl', 'remainingAreaUdl'])
    expect(Object.keys(wire.tandemSystem[0])).toEqual(['label', 'characteristicValue', 'adjustmentFactor'])
    expect(Object.keys(wire.tandemSystem[0].characteristicValue)).toEqual(['value', 'provenance', 'codeDefaultValue'])
    expect(wire.tandemSystem[0].adjustmentFactor).toEqual({ value: null, provenance: 'NATIONAL_ANNEX', codeDefaultValue: null })
    expect(parseProjectData(trafficLm1WireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    expect(trafficLm1FromWire(wire)).toEqual(LM1)
    expect(TRAFFIC_LM1_SECTION.codec.toWire(LM1)).toEqual(wire)
  })
  it('wind snapshot: drops result on the way out and returns no result on the way back', () => {
    const wire = windSnapshotToWire(SNAPSHOT)
    expect(Object.keys(wire)).toEqual(['schemaVersion', 'status', 'inputs']); expect(Object.keys(wire.inputs)).toEqual(['vb', 'terrain', 'ze', 'deckWidthM', 'drefM'])
    expect(JSON.stringify(wire)).not.toContain('result')
    const back = windSnapshotFromWire(wire)
    expect(back).toEqual({ schemaVersion: 1, status: 'VALID', inputs: SNAPSHOT.inputs }); expect('result' in back).toBe(false)
  })
  it('wind snapshot: a missing status goes out as null and a null status is omitted on read', () => {
    const noStatus: WindSnapshotInputsValue = { schemaVersion: 1, inputs: SNAPSHOT.inputs }
    const wire = windSnapshotToWire(noStatus); expect(wire.status).toBeNull()
    const back = windSnapshotFromWire(wire); expect(back).toEqual(noStatus); expect('status' in back).toBe(false)
    expect(WIND_SNAPSHOT_SECTION.codec.fromWire(wire)).toEqual(noStatus)
  })
  it('strict schemas reject unknown keys, a wrong schemaVersion and a wrong provenance with the full path', () => {
    const snapshot = JSON.parse(JSON.stringify(windSnapshotToWire(SNAPSHOT)))
    expect(() => parseProjectData(windSnapshotWireSchema, { ...snapshot, result: null }, 'loads.windSnapshot')).toThrow('loads.windSnapshot')
    expect(() => parseProjectData(windSnapshotWireSchema, { ...snapshot, schemaVersion: 2 }, 'loads.windSnapshot')).toThrow('loads.windSnapshot.schemaVersion')
    const lm1 = JSON.parse(JSON.stringify(trafficLm1ToWire(LM1))); lm1.udl[0].adjustmentFactor.provenance = 'GUESS'
    expect(() => parseProjectData(trafficLm1WireSchema, lm1, 'loads.trafficLm1')).toThrow('loads.trafficLm1.udl[0].adjustmentFactor.provenance')
    expect(() => parseProjectData(loadsWireSchema, { seismic: null, wind: null, temperature: null, selfWeight: null, trafficLm1: null }, 'loads')).toThrow('loads.windSnapshot')
  })
  it('all six sections are clearable at their paths and read null as undefined', () => {
    const sections = [SEISMIC_SECTION, WIND_SECTION, TEMPERATURE_SECTION, SELF_WEIGHT_SECTION, TRAFFIC_LM1_SECTION, WIND_SNAPSHOT_SECTION]
    expect(sections.map((s) => s.path)).toEqual(['loads/seismic', 'loads/wind', 'loads/temperature', 'loads/self-weight', 'loads/traffic-lm1', 'loads/wind-snapshot'])
    for (const section of sections) { expect(section.codec.clearable).toBe(true); expect(section.codec.fromWire(null)).toBeUndefined() }
  })
})
