import { describe, expect, it } from 'vitest'
import { convertQuantity, formatQuantity, makeQuantity, quantityFromCanonical } from './quantities'

describe('engineering quantities and unit registry',()=>{
 it('converts units through canonical quantities',()=>{
  expect(convertQuantity(2000,'mm','m')).toBe(2)
  expect(convertQuantity(1.9,'m','mm')).toBe(1900)
  expect(convertQuantity(250,'cm','m')).toBe(2.5)
  expect(convertQuantity(1,'MN','kN')).toBe(1000)
  expect(convertQuantity(40000,'kPa','MPa')).toBe(40)
  expect(convertQuantity(180,'deg','rad')).toBeCloseTo(Math.PI)
  expect(convertQuantity(25,'kN/m3','N/m3')).toBe(25000)
 })
 it('keeps kind and display unit while storing canonical value',()=>{
  const q=makeQuantity(2000,'length','mm')
  expect(q).toMatchObject({value:2,quantityKind:'length',unit:'mm'})
  expect(quantityFromCanonical(q.value,q.quantityKind,'m')).toBe(2)
  expect(formatQuantity(q)).toBe('2000.00 mm')
  expect(()=>makeQuantity(2,'stress','m')).toThrow('invalid for stress')
 })
})
