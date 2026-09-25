const NODE_LOGOS = {
  'input.number': 'number.png',
  'input.integer': 'integer.png',
  'input.boolean': 'boolean.png',
  'input.integer-list': 'integer list.png',
  'input.quantity': 'quantity.png',
  'input.range': 'range.png',
  'input.length': 'length.png',
  'input.notes': 'notes.png',
  'math.add': 'add.png',
  'math.subtract': 'subtract.png',
  'math.multiply': 'multiply.png',
  'math.divide': 'divide.png',
  'material.concrete': 'concrete.png',
  'material.reinforcement': 'reinforcement steel.png',
  'material.prestressing': 'prestressing steel.png',
  'material.structuralSteel': 'structural steel.png',
  'substructure.pier.circular': 'circular pier.png',
  'substructure.pier.rectangular': 'rentangular pier.png',
  'substructure.pier.oval': 'oval pier.png',
  'substructure.pier.box': 'box pier.png',
  'substructure.pier.h_section': 'h pier.png',
  'substructure.foundation.shallow': 'shallow foundation.png',
  'substructure.foundation.piled': 'piled foundation.png',
  'substructure.bearing.elastomeric': 'elastomeric bearing.png',
  'substructure.pier-cap.rectangular': 'rentangular cap.png',
  'substructure.pier-cap.t': 't-cap.png',
  'structural.girder.precast': 'precast girder.png',
  'structural.girder.steel': 'steel girder.png',
  'structural.span_arrangement': 'span arrangement.png',
  'structural.superstructure': 'superstructure.png',
  'structural.abutment': 'abutment.png',
  'structural.assembly': 'assembly.png',
  'output.watch': 'watch.png',
  'output.list': 'list.png',
} as const

export function getNodeLogo(type: string): string | undefined {
  const file = NODE_LOGOS[type as keyof typeof NODE_LOGOS]
  return file ? `/kopruq_nodes_logo/${encodeURIComponent(file).replace(/%20/g, ' ')}` : undefined
}

export { NODE_LOGOS }
