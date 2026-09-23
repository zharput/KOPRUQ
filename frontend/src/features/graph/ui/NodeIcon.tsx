import type { LucideIcon } from 'lucide-react'
import { Activity, AlignHorizontalSpaceAround, ArrowDownUp, Binary, Box, Calculator, Circle, ClipboardList, Divide, Eye, FileText, GitBranch, Hash, List, Minus, MoveHorizontal, Package, PanelTop, Plus, Ruler, Square, Table2, ToggleLeft, Triangle, X } from 'lucide-react'
const ICONS: Record<string, LucideIcon> = {
  'input.number': Binary, 'input.integer': Hash, 'input.boolean': ToggleLeft, 'input.integer-list': List, 'input.quantity': Activity, 'input.range': MoveHorizontal, 'input.length': Ruler, 'input.notes': FileText,
  'math.add': Plus, 'math.subtract': Minus, 'math.multiply': X, 'math.divide': Divide, 'material.concrete': Box, 'material.reinforcement': AlignHorizontalSpaceAround, 'material.prestressing': GitBranch, 'material.structuralSteel': PanelTop,
  'substructure.pier.circular': Circle, 'substructure.pier.rectangular': Square, 'substructure.pier.oval': Activity, 'substructure.pier.box': Package, 'substructure.pier.h': Hash, 'substructure.foundation.shallow': Triangle, 'substructure.foundation.piled': Table2, 'substructure.bearing.elastomeric': AlignHorizontalSpaceAround,
  'structural.superstructure': ArrowDownUp, 'structural.girder.precast': PanelTop, 'structural.girder.steel': PanelTop, 'structural.abutment': Box, 'structural.assembly': GitBranch, 'output.watch': Eye, 'output.list': ClipboardList,
}
export function NodeIcon({ type, size = 15 }: { type: string; size?: number }) { const Icon = ICONS[type] ?? Calculator; const input = type.startsWith('input.'); const oval = type === 'substructure.pier.oval'; return <span className={`spn-node-icon${input ? ' spn-node-icon-input' : ''}${oval ? ' spn-node-icon-oval' : ''}`}><Icon size={size} strokeWidth={2} aria-hidden="true" /></span> }
