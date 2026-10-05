import type { CSSProperties, ReactNode } from 'react'
import type { NodeDefinition } from '../registry/nodeRegistry'
import { getNodeCategoryLabel, getNodeGroupTheme, getNodeHeaderStyle } from '../domain/nodeVisualThemes'
import { NodeIcon } from './NodeIcon'
import type { GraphExecutionState } from '../domain/types'

type Props = {
  definition: NodeDefinition
  type: string
  label?: ReactNode
  showIcon?: boolean
  className?: string
  style?: CSSProperties
  executionState?: GraphExecutionState
  isDirty?: boolean
  runRequired?: boolean
  hasError?: boolean
  resultValid?: boolean
}

/** Shared two-line header markup; the header remains the single visual source for graph nodes. */
export default function NodeHeader({ definition, type, label, showIcon = true, className = 'spn-graph-node-title', style, executionState = 'idle', isDirty = false, runRequired = false, hasError = false, resultValid = false }: Props) {
  const theme = getNodeGroupTheme(definition.category, type)
  const status = hasError ? 'ERROR' : executionState === 'running' ? 'RUNNING' : resultValid ? 'SUCCESS' : isDirty ? 'DIRTY' : runRequired ? 'RUN REQUIRED' : executionState === 'idle' ? '' : executionState.toUpperCase()
  const statusColor = statusColorFor(status)
  return <header className={className} style={{ ...getNodeHeaderStyle(definition.category, type), '--node-group-color': theme.dark, '--node-group-text': theme.text, ...style } as CSSProperties}>
    <span className="spn-node-header-main" title={definition.label}>
      {showIcon && <NodeIcon type={type} size={48} />}
      <span className="spn-node-header-copy">
        <strong className="spn-node-header-label">{label ?? definition.label}</strong>
        <small className="spn-node-header-category" title={getNodeCategoryLabel(definition.category)}>{getNodeCategoryLabel(definition.category)}</small>
      </span>
    </span>
    {status && <span className="spn-node-runtime-status" style={{ color: statusColor, WebkitTextFillColor: statusColor, opacity: 1, background: 'transparent', backgroundColor: 'transparent' }}>{status}</span>}
  </header>
}

function statusColorFor(status: string) {
  const colors = { success: '#6FAD8A', error: '#D97878', warning: '#D2A85C', running: '#7899B8' } as const
  const normalized = status.trim().toLowerCase()
  if (normalized === 'success') return colors.success
  if (normalized === 'error') return colors.error
  if (normalized === 'warning' || normalized === 'dirty') return colors.warning
  if (normalized === 'running') return colors.running
  return colors.running
}
