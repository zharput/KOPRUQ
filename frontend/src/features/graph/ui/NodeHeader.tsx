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

/** Shared header markup; layout and existing class names intentionally remain unchanged. */
export default function NodeHeader({ definition, type, label, showIcon = true, className = 'spn-graph-node-title', style }: Props) {
  return <header className={className} style={{ ...getNodeHeaderStyle(definition.category, type), ...style }}>
    <span title={definition.label}>{showIcon && <NodeIcon type={type} />}{label ?? definition.label}</span>
    <small title={getNodeCategoryLabel(definition.category)}>{getNodeCategoryLabel(definition.category)}</small>
  </header>
}
