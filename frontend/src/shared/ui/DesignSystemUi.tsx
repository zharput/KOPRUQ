import type { ReactNode } from 'react'
import { generateValues, type Dimension } from './generation'

export function EngineeringInput({ value, onChange, ariaLabel }: { value: number | string; onChange: (value: number) => void; ariaLabel?: string }) {
  return <input aria-label={ariaLabel} className="spn-input spn-input-number ds-engineering-input" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
}

export function GenerationTable({ dimensions, onUpdateDimension, notConfiguredLabel = 'Not configured yet' }: { dimensions: Dimension[]; onUpdateDimension: (key: string, patch: Partial<Dimension>) => void; notConfiguredLabel?: string }) {
  return <div className="spn-param-table-wrap"><table className="spn-table spn-param-table ds-generation-table"><colgroup><col className="spn-col-label" /><col className="spn-col-value" /><col className="spn-col-value" /><col className="spn-col-value" /><col className="spn-col-result" /></colgroup><thead><tr>{['Parameter', 'Min', 'Max', 'Delta', 'Values SPANOVA Will Use'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{dimensions.map((dimension) => { const values = generateValues(dimension.min, dimension.max, dimension.delta); return <tr key={dimension.key}><td>{dimension.label}</td><td><EngineeringInput value={dimension.min} ariaLabel={`${dimension.label} Min`} onChange={(value) => onUpdateDimension(dimension.key, { min: value })} /></td><td><EngineeringInput value={dimension.max} ariaLabel={`${dimension.label} Max`} onChange={(value) => onUpdateDimension(dimension.key, { max: value })} /></td><td><EngineeringInput value={dimension.delta} ariaLabel={`${dimension.label} Delta`} onChange={(value) => onUpdateDimension(dimension.key, { delta: value })} /></td><td className="spn-col-result-cell">{values.length ? values.join(', ') : notConfiguredLabel}</td></tr> })}</tbody></table></div>
}

export function DesignSystemSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ds-section"><h3 className="spn-card-title ds-section-title">{title}</h3>{children}</section>
}

export function SchematicPanel({ children }: { children: ReactNode }) {
  return <div className="spn-shape-card-diagram ds-schematic-panel">{children}</div>
}

export function FamilyStatusBar({ variants, status, action, disabled, onAction }: { variants: number; status: string; action: string; disabled?: boolean; onAction: () => void }) {
  return <div className="ds-status-bar"><p>Generated Section Variants: <strong>{variants}</strong></p><p>Status: <strong>{status}</strong></p><button className="spn-button-primary" disabled={disabled} onClick={onAction}>{action}</button></div>
}
