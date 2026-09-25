import type { CSSProperties, ReactNode } from 'react'
import type { NodeDefinition } from '../registry/nodeRegistry'
import { getNodeCategoryLabel, getNodeHeaderStyle } from '../domain/nodeVisualThemes'
import { NodeIcon } from './NodeIcon'

type Props = {
  definition: NodeDefinition
  type: string
  label?: ReactNode
  showIcon?: boolean
  className?: string
  style?: CSSProperties
}

/** Shared two-line header markup; the header remains the single visual source for graph nodes. */
export default function NodeHeader({ definition, type, label, showIcon = true, className = 'spn-graph-node-title', style }: Props) {
  return <header className={className} style={{ ...getNodeHeaderStyle(definition.category, type), ...style }}>
    <span className="spn-node-header-main" title={definition.label}>
      {showIcon && <NodeIcon type={type} size={48} />}
      <span className="spn-node-header-copy">
        <strong className="spn-node-header-label">{label ?? definition.label}</strong>
        <small className="spn-node-header-category" title={getNodeCategoryLabel(definition.category)}>{getNodeCategoryLabel(definition.category)}</small>
      </span>
    </span>
  </header>
}
