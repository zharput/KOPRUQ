import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { KopruqNode } from '../domain/types'
import { getNodeDefinition, previewDesignOutput } from '../registry/nodeRegistry'
import NodeInspector from './NodeInspector'

const handlers = { onNodeChange: vi.fn(), onParameterChange: vi.fn() }
function node(type: string, id = 'internal-uuid-7f91'): KopruqNode { return { id, type, name: getNodeDefinition(type)!.label, position: { x: 0, y: 0 }, parameters: getNodeDefinition(type)!.createDefaultParameters({ length: 'm' }) } }
const familyRow = (label: string) => screen.getByText(label, { selector: '.spn-engineering-family span' }).closest('.spn-graph-inspector-row') as HTMLElement
const rowValue = (label: string) => familyRow(label).querySelector('strong')!.textContent

describe('Engineering Inspector FAMILY section', () => {
  it('does not count INCOMPLETE candidates as valid or summarise them as VALID (steel girder)', () => {
    render(<NodeInspector node={node('structural.girder.steel')} states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(Number(rowValue('Candidate Count'))).toBeGreaterThan(0)
    expect(rowValue('Valid')).toBe('0')
    expect(rowValue('Validation')).toBe('INCOMPLETE')
    expect(familyRow('Validation').textContent).not.toMatch(/\bVALID\b/)
  })

  it('keeps VALID when every candidate is valid (rectangular pier)', () => {
    render(<NodeInspector node={node('substructure.pier.rectangular')} states={{}} errors={{}} outputs={{}} {...handlers} />)
    const count = rowValue('Candidate Count')
    expect(Number(count)).toBeGreaterThan(0)
    expect(rowValue('Valid')).toBe(count)
    expect(rowValue('Validation')).toBe('VALID')
  })

  describe('Validation colour follows the displayed status, not the node run state', () => {
    const valueClass = () => familyRow('Validation').querySelector('strong')!.className
    it('INCOMPLETE after a successful run is not drawn as success', () => {
      const value = node('structural.girder.steel')
      render(<NodeInspector node={value} states={{ [value.id]: 'success' }} errors={{}} outputs={{}} {...handlers} />)
      expect(rowValue('Validation')).toBe('INCOMPLETE')
      expect(valueClass()).not.toContain('state-success')
      expect(valueClass()).not.toContain('state-error')
    })
    it('VALID is drawn as success', () => {
      const value = node('substructure.pier.rectangular')
      render(<NodeInspector node={value} states={{ [value.id]: 'success' }} errors={{}} outputs={{}} {...handlers} />)
      expect(rowValue('Validation')).toBe('VALID')
      expect(valueClass()).toContain('state-success')
    })
    it('preview FAILED is drawn as error even after a successful run', () => {
      const value = node('structural.girder.precast')
      render(<NodeInspector node={value} states={{ [value.id]: 'success' }} errors={{}} outputs={{}} previewInputs={{ H: { sourceName: 'X', value: [] } }} {...handlers} />)
      expect(rowValue('Validation')).toBe('FAILED')
      expect(valueClass()).toContain('state-error')
    })
    it('an execution error is drawn as error', () => {
      const value = node('substructure.pier.rectangular')
      render(<NodeInspector node={value} states={{ [value.id]: 'success' }} errors={{ [value.id]: 'boom' }} outputs={{}} {...handlers} />)
      expect(rowValue('Validation')).toBe('FAILED')
      expect(valueClass()).toContain('state-error')
    })
  })

  it('shows an unknown Invalid count as a dash, not 0', () => {
    render(<NodeInspector node={node('structural.girder.steel')} states={{}} errors={{}} outputs={{}} {...handlers} />)
    expect(rowValue('Invalid')).toBe('—')
  })

  it('shows the Run Invalid count when the output provides it', () => {
    const value = node('structural.girder.steel')
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{ [value.id]: { generatedCombinations: 5, invalidCombinations: 2 } }} {...handlers} />)
    expect(rowValue('Invalid')).toBe('2')
  })

  it('surfaces a preview exception as a message and FAILED when there are no candidates', () => {
    const value = node('structural.girder.precast')
    render(<NodeInspector node={value} states={{}} errors={{}} outputs={{}} previewInputs={{ H: { sourceName: 'X', value: [] } }} {...handlers} />)
    expect(rowValue('Candidate Count')).toBe('0')
    expect(rowValue('Validation')).toBe('FAILED')
    let expected = ''
    try { previewDesignOutput(value, 'candidates', { H: [] }) } catch (error) { expected = error instanceof Error ? error.message : String(error) }
    expect(expected).not.toBe('')
    const alert = within(document.querySelector('.spn-engineering-family') as HTMLElement).getByRole('alert')
    expect(alert.textContent).toBe(expected)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('reports FAILED when the node has an execution error', () => {
    const value = node('substructure.pier.rectangular')
    render(<NodeInspector node={value} states={{}} errors={{ [value.id]: 'boom' }} outputs={{}} {...handlers} />)
    expect(rowValue('Validation')).toBe('FAILED')
  })
})
