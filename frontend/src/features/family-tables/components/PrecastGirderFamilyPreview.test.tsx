import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { canonicalPrecastParameters, PrecastGirderSectionProperties } from './PrecastGirderFamilyPreview'
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
  })
})
