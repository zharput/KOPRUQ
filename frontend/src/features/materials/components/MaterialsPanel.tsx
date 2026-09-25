import { useEffect, useState } from 'react'
import { publishFamilySelection } from '../../family-registry/model/registry'
import { EN_CONCRETE_CLASS_IDS } from '../model/materialCatalog'

/**
 * Materials (revised 2026-09-11): concrete grade by structural element -
 * the engineer's own simplified table (dropped the exposure-class column
 * and the bilingual RO names from the previous version, dropped the
 * illegible "Foundation levelling" row entirely rather than guessing its
 * value). Each element's concrete class is now a **dropdown**, not a
 * fixed value - "malzeme EN'dan alÄ±nacak" (material comes from EN): the
 * option list is the full EN 1992-1-1 Table 3.1 strength-class set, not
 * invented (same table `backend/analysis-api`'s `EurocodeConcrete`
 * already computes Ecm/fcm from). Defaults to the engineer's own given
 * class per element. Presentation/local state only - not wired into any
 * backend computation yet, same discipline as the rest of Project
 * Information.
 */
interface MaterialRow {
  id: string
  no: number
  element: string
  concreteClass: string
}

const INITIAL_MATERIALS: MaterialRow[] = [
  { id: 'DRILLED_PILES', no: 1, element: 'Drilled piles', concreteClass: 'C30/37' },
  { id: 'FOUNDATION', no: 2, element: 'Foundation', concreteClass: 'C30/37' },
  { id: 'PIER_ABUTMENT', no: 3, element: 'Elevations ( Pier / Abutments )', concreteClass: 'C30/37' },
  { id: 'SEISMIC_BEARING_BLOCKS', no: 4, element: 'Seismic and Bearing Blocks', concreteClass: 'C35/45' },
  { id: 'PRECAST_GIRDER', no: 5, element: 'Precast Girder', concreteClass: 'C45/55' },
  { id: 'POST_TENSIONED_BOX_GIRDER', no: 6, element: 'Post-tensioned Concrete Box Girder', concreteClass: 'C45/55' },
  { id: 'CAST_IN_SITU_DECK', no: 7, element: 'Reinforced concrete cast-in-situ bridge deck', concreteClass: 'C35/45' },
  { id: 'TRANSVERSE_BEAMS', no: 8, element: 'Transverse beams', concreteClass: 'C35/45' },
]
const STORAGE_KEY = 'kopruq.project-design-system.material-assignments'
function readMaterials(): MaterialRow[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<MaterialRow>[] | null
    return Array.isArray(saved) ? INITIAL_MATERIALS.map((row) => ({ ...row, ...saved.find((item) => item.id === row.id) })) : INITIAL_MATERIALS
  } catch { return INITIAL_MATERIALS }
}

export default function MaterialsPanel() {
  const [materials, setMaterials] = useState<MaterialRow[]>(readMaterials)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(materials)); window.dispatchEvent(new Event('kopruq:material-catalog-changed')) }, [materials])

  function updateClass(no: number, concreteClass: string) {
    setMaterials((prev) => prev.map((m) => (m.no === no ? { ...m, concreteClass } : m)))
    publishFamilySelection('MATERIAL', `EN1992-1-1:${concreteClass}`)
  }

  return (
    <div className="spn-workflow">
      <div className="spn-card">
        <h2 className="spn-card-title">Concrete - by structural element</h2>
        <p className="spn-card-subtitle">Concrete class per element, selectable from EN 1992-1-1 Table 3.1's strength classes.</p>
        <table className="spn-table">
          <thead>
            <tr>
              {['No.', 'Structural Element', 'Concrete Class'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.map((row) => (
              <tr key={row.no}>
                <td>{row.no}</td>
                <td>{row.element}</td>
                <td>
                  <select
                    className="spn-input"
                    value={row.concreteClass}
                    onChange={(e) => updateClass(row.no, e.target.value)}
                  >
                    {EN_CONCRETE_CLASS_IDS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
