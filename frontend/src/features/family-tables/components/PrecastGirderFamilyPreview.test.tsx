import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrecastGirderFamilyPreview, { canonicalPrecastParameters, PrecastGirderSectionProperties } from './PrecastGirderFamilyPreview'
import { precastSectionProperties } from '../../graph/domain/girderCandidates'

describe('Precast girder family runtime properties', () => {
  it('derives valid PG-001 properties from the selected runtime candidate geometry', () => {
    render(<PrecastGirderSectionProperties candidate={{
      bridgeId: 'bridge-1', graphDocumentId: 'graph-1', sourceNodeId: 'node-1', sourceNodeType: 'structural.girder.precast', familyCategory: 'GIRDER', candidateId: 'pg-001',
      candidateData: { id: 'pg-001', geometry: { H: 2, Btf: 1, Bbf: .5, tw: .25, th1: .15, bh1: .1, th2: .3, bh2: .2 } },
    }} projectUnits={{ length: 'm', force: 'kN', moment: 'kNm', stress: 'MPa', mass: 't', temperature: 'C' }} />)

    const parameters = canonicalPrecastParameters({ bridgeId: 'bridge-1', graphDocumentId: 'graph-1', sourceNodeId: 'node-1', sourceNodeType: 'structural.girder.precast', familyCategory: 'GIRDER', candidateId: 'pg-001', candidateData: { geometry: { H: 2, Btf: 1, Bbf: .5, tw: .25, th1: .15, bh1: .1, th2: .3, bh2: .2 } } })
    expect(parameters).toEqual({ H: 2, Btf: 1, Bbf: .5, tw: .25, th1: .15, bh1: .1, th2: .3, bh2: .2 })
    for (const value of Object.values(precastSectionProperties(parameters!))) expect(value).toBeGreaterThan(0)
    const values = [...screen.getByTestId('section-properties').querySelectorAll('strong')].map(node => node.textContent)
    expect(values).toHaveLength(5)
    expect(values.every(value => value !== '—')).toBe(true)
    expect(values.every(value => !/[²⁴³]\s*$/.test(value ?? ''))).toBe(true)
    expect([...screen.getByTestId('section-properties').querySelectorAll('.property-unit')]).toHaveLength(5)
  })

  it('keeps the bottom Bbf annotation envelope inside the preview viewBox', () => {
    render(<PrecastGirderFamilyPreview candidate={{
      bridgeId: 'bridge-1', graphDocumentId: 'graph-1', sourceNodeId: 'node-1', sourceNodeType: 'structural.girder.precast', familyCategory: 'GIRDER', candidateId: 'pg-001',
      candidateData: { geometry: { H: 2, Btf: 1, Bbf: .5, tw: .25, th1: .15, bh1: .1, th2: .3, bh2: .2 } },
    }} projectUnits={{ length: 'm', force: 'kN', moment: 'kNm', stress: 'MPa', mass: 't', temperature: 'C' }} />)
    const svg = screen.getByRole('img', { name: /precast girder technical section/i })
    expect(svg.getAttribute('viewBox')).toBe('-45 0 430 350')
    expect(svg.getAttribute('data-drawing-bounds')).toBeTruthy()
    expect(svg.querySelector('[data-dimension="Bbf"]')).toBeInTheDocument()
    expect(svg.querySelectorAll('[data-extension-line]')).toHaveLength(14)
    expect(svg.querySelector('[data-dimension="Bbf"] text')?.getAttribute('y')).toBeTruthy()
  })
})
