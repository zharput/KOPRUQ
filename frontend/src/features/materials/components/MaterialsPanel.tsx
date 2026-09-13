import { useState } from 'react'

/**
 * Materials (revised 2026-09-11): concrete grade by structural element -
 * the engineer's own simplified table (dropped the exposure-class column
 * and the bilingual RO names from the previous version, dropped the
 * illegible "Foundation levelling" row entirely rather than guessing its
 * value). Each element's concrete class is now a **dropdown**, not a
 * fixed value - "malzeme EN'dan alınacak" (material comes from EN): the
 * option list is the full EN 1992-1-1 Table 3.1 strength-class set, not
 * invented (same table `backend/analysis-api`'s `EurocodeConcrete`
 * already computes Ecm/fcm from). Defaults to the engineer's own given
 * class per element. Presentation/local state only - not wired into any
 * backend computation yet, same discipline as the rest of Project
 * Information.
 */
const EN_CONCRETE_CLASSES = [
  'C12/15', 'C16/20', 'C20/25', 'C25/30', 'C30/37', 'C35/45', 'C40/50',
  'C45/55', 'C50/60', 'C55/67', 'C60/75', 'C70/85', 'C80/95', 'C90/105',
]

interface MaterialRow {
  no: number
  element: string
  concreteClass: string
}

const INITIAL_MATERIALS: MaterialRow[] = [
  { no: 1, element: 'Drilled piles', concreteClass: 'C30/37' },
  { no: 2, element: 'Foundation', concreteClass: 'C30/37' },
  { no: 3, element: 'Elevations ( Pier / Abutments )', concreteClass: 'C30/37' },
  { no: 4, element: 'Seismic and Bearing Blocks', concreteClass: 'C35/45' },
  { no: 5, element: 'Precast Girder', concreteClass: 'C45/55' },
  { no: 6, element: 'Post-tensioned Concrete Box Girder', concreteClass: 'C45/55' },
  { no: 7, element: 'Reinforced concrete cast-in-situ bridge deck', concreteClass: 'C35/45' },
  { no: 8, element: 'Transverse beams', concreteClass: 'C35/45' },
]

export default function MaterialsPanel() {
  const [materials, setMaterials] = useState<MaterialRow[]>(INITIAL_MATERIALS)

  function updateClass(no: number, concreteClass: string) {
    setMaterials((prev) => prev.map((m) => (m.no === no ? { ...m, concreteClass } : m)))
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
                    {EN_CONCRETE_CLASSES.map((c) => (
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
