import { getDisplayUnit, toDisplayValue, toInternalValue, type ProjectUnits } from '../../graph/domain/quantities'

/**
 * Loads unit conversion at the display/input boundary (feature
 * dinamik-load-hesaplama). Stored values and everything sent to the
 * backend stay canonical SI (kN, m, kN/m, kN/m2, kN/m3, deg C); only what
 * the engineer sees and types is converted with the project's unit
 * preferences. No new factor is introduced: force, length and temperature
 * come from the `quantities.ts` registry, the compound units are derived
 * by dimensional analysis:
 *
 * <pre>
 *   display = F.fromCanonical(v) x L.toCanonical(1)^n      (n: lineLoad 1, pressure 2, unitWeight 3)
 *   v       = F.toCanonical(display / L.toCanonical(1)^n)
 *   alphaT display = a x dT.toCanonical(1)                 (1/degF: a x 5/9)
 * </pre>
 *
 * Unknown/empty unit ids fall back to the canonical unit (registry rule).
 */
export type LoadQuantity =
  | 'length'
  | 'force'
  | 'lineLoad'
  | 'pressure'
  | 'unitWeight'
  | 'temperature'
  | 'temperatureDifference'
  | 'perTemperatureDifference'

export interface LoadUnit {
  label: string
  /** canonical -> display */
  toDisplay: (canonical: number) => number
  /** display -> canonical */
  toCanonical: (display: number) => number
}

const LENGTH_POWER: Partial<Record<LoadQuantity, number>> = { lineLoad: 1, pressure: 2, unitWeight: 3 }
const SUPERSCRIPT: Record<number, string> = { 1: '', 2: '²', 3: '³' }

export function loadUnit(quantity: LoadQuantity, units?: ProjectUnits): LoadUnit {
  const u = units ?? {}
  switch (quantity) {
    case 'length': {
      const unit = getDisplayUnit('Length', u)
      return { label: unit.label, toDisplay: unit.fromCanonical, toCanonical: unit.toCanonical }
    }
    case 'force': {
      const unit = getDisplayUnit('Force', u)
      return { label: unit.label, toDisplay: unit.fromCanonical, toCanonical: unit.toCanonical }
    }
    case 'lineLoad':
    case 'pressure':
    case 'unitWeight': {
      const n = LENGTH_POWER[quantity]!
      const force = getDisplayUnit('Force', u)
      const length = getDisplayUnit('Length', u)
      const scale = Math.pow(length.toCanonical(1), n)
      return {
        label: `${force.label}/${length.label}${SUPERSCRIPT[n]}`,
        toDisplay: (v) => force.fromCanonical(v) * scale,
        toCanonical: (d) => force.toCanonical(d / scale),
      }
    }
    case 'temperature':
      return {
        label: getDisplayUnit('Absolute Temperature', u).label,
        toDisplay: (v) => toDisplayValue(v, 'Absolute Temperature', u),
        toCanonical: (d) => toInternalValue(d, 'Absolute Temperature', u),
      }
    case 'temperatureDifference':
      return {
        label: getDisplayUnit('Temperature Difference', u).label,
        toDisplay: (v) => toDisplayValue(v, 'Temperature Difference', u),
        toCanonical: (d) => toInternalValue(d, 'Temperature Difference', u),
      }
    case 'perTemperatureDifference': {
      const unit = getDisplayUnit('Temperature Difference', u)
      const scale = unit.toCanonical(1)
      return { label: `/${unit.label}`, toDisplay: (a) => a * scale, toCanonical: (d) => d / scale }
    }
  }
}

/** Number of decimals for a value shown in a Length unit (m 4, cm 3, mm 1); unknown id -> m rule. */
function lengthDecimals(units?: ProjectUnits): number {
  const id = getDisplayUnit('Length', units ?? {}).id
  return id === 'mm' ? 1 : id === 'cm' ? 3 : 4
}

/**
 * Formats an ALREADY-CONVERTED display number. Length-bearing quantities
 * follow the Length unit (m 4, cm 3, mm 1 decimal; for lineLoad/pressure/
 * unitWeight in mm 4 significant digits); everything else is 2 decimals.
 * Deliberately not `getLengthDisplayPrecision` (that gives 2 for cm).
 */
export function formatDisplayNumber(display: number, quantity: LoadQuantity, units?: ProjectUnits): string {
  return withoutNegativeZero(formatRaw(display, quantity, units))
}

/** A value that rounds to zero never shows a minus sign (`-0.00` -> `0.00`). */
function withoutNegativeZero(text: string): string {
  return /^-0(\.0*)?$/.test(text) ? text.slice(1) : text
}

function formatRaw(display: number, quantity: LoadQuantity, units?: ProjectUnits): string {
  if (quantity === 'length') return display.toFixed(lengthDecimals(units))
  if (quantity === 'lineLoad' || quantity === 'pressure' || quantity === 'unitWeight') {
    const id = getDisplayUnit('Length', units ?? {}).id
    return id === 'mm' ? display.toPrecision(4) : display.toFixed(lengthDecimals(units))
  }
  return display.toFixed(2)
}

/** Canonical value -> number text in the project's unit (no unit label). */
export function formatLoadValue(canonical: number, quantity: LoadQuantity, units?: ProjectUnits): string {
  return formatDisplayNumber(loadUnit(quantity, units).toDisplay(canonical), quantity, units)
}

/** Canonical value -> number text with unit label, e.g. `4.0000 kN/m`. */
export function formatLoad(canonical: number, quantity: LoadQuantity, units?: ProjectUnits): string {
  return `${formatLoadValue(canonical, quantity, units)} ${loadUnit(quantity, units).label}`
}

/** Formatter for inputs that already receive the converted (display) number. */
export function loadFormatter(quantity: LoadQuantity, units?: ProjectUnits): (display: number) => string {
  return (display) => formatDisplayNumber(display, quantity, units)
}

function parseNumber(text: string): number | null {
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/**
 * Text typed in the project's unit -> canonical text for storage/backend.
 * Empty stays empty; a non-number yields null (nothing is written).
 */
export function canonicalText(displayText: string, quantity: LoadQuantity, units?: ProjectUnits): string | null {
  if (displayText.trim() === '') return ''
  const n = parseNumber(displayText)
  if (n === null) return null
  return String(Number(loadUnit(quantity, units).toCanonical(n).toPrecision(15)))
}

/** Canonical text -> unrounded text in the project's unit (empty/non-number stay as they are). */
export function displayText(canonical: string, quantity: LoadQuantity, units?: ProjectUnits): string {
  const n = parseNumber(canonical)
  if (n === null) return canonical.trim() === '' ? '' : canonical
  const unit = loadUnit(quantity, units)
  // A canonical value that is the image of display 0 (within the 15-digit canonical text) shows as 0, not as float noise.
  if (Math.abs(unit.toCanonical(0) - n) <= 1e-12 * Math.max(1, Math.abs(n))) return '0'
  // 12 significant digits hide the error of the 15-digit canonical text after an affine conversion (e.g. 51 degF).
  return String(Number(unit.toDisplay(n).toPrecision(12)))
}
