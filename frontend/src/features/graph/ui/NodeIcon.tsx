import { getNodeLogo } from '../registry/nodeLogos'

export function NodeIcon({ type, size = 22 }: { type: string; size?: number }) {
  const logo = getNodeLogo(type)
  if (!logo) return null
  return <span className="spn-node-icon" style={{ width: size, height: size }} aria-hidden="true"><img src={logo} alt="" draggable={false} /></span>
}
