import type { GraphValue, SpanovaConnection, SpanovaNode } from '../domain/types'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { getUnit } from '../domain/quantities'
import type { EngineeringInspectorSchema } from '../registry/nodeRegistry'
import { displayLength, displayRange, geometryValues } from './engineeringSchematicValues'
import { bulbTeeGirderPath } from '../../../shared/ui/BulbTeeGirderShape'

type Props = { schema: EngineeringInspectorSchema; node: SpanovaNode; candidates: GraphValue[]; previewInputs: Record<string, { sourceName: string; value?: GraphValue; error?: string }>; connections: SpanovaConnection[]; projectUnits?: ProjectUnitPreferences }

export function EngineeringSchematic({ schema, node, candidates, previewInputs, connections, projectUnits }: Props) {
  if (schema.schematic === 'superstructure') return <StaticSuperstructureCard />
  const connected = new Set(connections.filter(edge => edge.targetNodeId === node.id).map(edge => edge.targetPortId))
  if (schema.schematic === 'pier') return <PierSchematic node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />
  if (schema.schematic === 'pier-cap') return <PierCapSchematic node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />
  if (schema.schematic === 'foundation') return <FoundationSchematic node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />
  if (schema.schematic === 'girder') return <GirderSchematic node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />
  return <BearingSchematic node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />
}
function StaticSuperstructureCard(){return <SchematicCard className="engineering-schematic-single"><svg viewBox="0 0 300 260" role="img" aria-label="Superstructure catalog schematic"><rect x="38" y="55" width="224" height="24" fill="#d8d1c7" stroke="#6b6258"/><g fill="#cfc5b8" stroke="#6b6258">{[65,98,131,164,197,230].map(x=><path key={x} d={`M${x-9} 79h18v18h-5v72h-8V97h-5z`}/>)}</g><path d="M38 42h224M38 42v10M262 42v10M38 38l6 4-6 4M262 38l-6 4 6 4" stroke="#222" fill="none"/><text x="150" y="33" textAnchor="middle" className="engineering-dimension">W = Deck Width</text><text x="150" y="195" textAnchor="middle" className="engineering-dimension">6 × Girder · s = Spacing · t = Slab</text><text x="150" y="218" textAnchor="middle" className="engineering-dimension">e = Clear Edge · Btf = Top Flange · H = Height</text><text x="18" y="244" className="engineering-dimension">Parameters</text><text x="18" y="255" className="engineering-dimension">W  Deck Width   n  Girder Count   s  Girder Spacing   t  Deck Slab Thickness</text></svg></SchematicCard>}

function GirderSchematic({ node, candidates, previewInputs, connected, projectUnits }: Omit<Props, 'schema' | 'connections'> & { connected: Set<string> }) {
  const steel=node.type.endsWith('.steel'), keys=steel?['H','Btf','ttf','Bbf','tbf','tw']:['H','tf','bf','w','th1','th2','bh1','bh2']
  const vals=Object.fromEntries(keys.map(key=>[key,dimensionValue(node,candidates,previewInputs,connected,key,key,projectUnits)]))
  const g=Object.fromEntries(keys.map(key=>[key,representativeMetres(node,candidates,previewInputs,connected,key,key)])) as Record<string,number|undefined>
  const precastPath=bulbTeeGirderPath({H:g.H??1.9,tf:g.tf??1.5,bf:g.bf??.8,w:g.w??.2,th1:g.th1??.12,th2:g.th2??.1,bh1:g.bh1??.28,bh2:g.bh2??.15})
  return <SchematicCard className="engineering-schematic-single"><svg viewBox="0 0 300 250" role="img" aria-label={`${steel?'Steel':'Precast'} girder section schematic`}><path className="engineering-outline" d={steel?'M92 48H208V62H158V132H208V146H92V132H142V62H92Z':precastPath} transform={steel?undefined:'translate(40 48) scale(220 100)'} /><DimensionHorizontal x1={92} x2={208} y={25} toY={48} label={`${steel?'Btf':'tf'} = ${vals[steel?'Btf':'tf']??vals.H}`}/><DimensionVertical y1={48} y2={148} x={236} toX={208} label={`H = ${vals.H}`} compact/><text className="engineering-dimension" x="150" y="184" textAnchor="middle">{steel?`Btf ${vals.Btf} · ttf ${vals.ttf} · Bbf ${vals.Bbf} · tbf ${vals.tbf} · tw ${vals.tw}`:`tf ${vals.tf} · bf ${vals.bf} · w ${vals.w} · th1 ${vals.th1} · th2 ${vals.th2} · bh1 ${vals.bh1} · bh2 ${vals.bh2}`}</text><BridgeAxis y={215}/></svg></SchematicCard>
}

function PierSchematic({ node, candidates, previewInputs, connected, projectUnits }: Omit<Props, 'schema' | 'connections'> & { connected: Set<string> }) {
  const kind = node.type.split('.').at(-1) ?? 'rectangular'
  const dimensions: Record<string, { key: string; port: string; fallback: string }> = {
    circular: { key: 'D', port: 'diameter', fallback: 'D' },
    rectangular: { key: 'B', port: 'width', fallback: 'B' }, oval: { key: 'B', port: 'width', fallback: 'B' },
    box: { key: 'B', port: 'outerWidth', fallback: 'B' }, h_section: { key: 'B', port: 'width', fallback: 'B' },
  }
  const b = dimensionValue(node, candidates, previewInputs, connected, kind === 'h_section' ? 'depth' : (dimensions[kind]?.port ?? 'width'), kind === 'h_section' ? 'D' : (dimensions[kind]?.key ?? 'B'), projectUnits)
  const d = kind === 'circular' ? b : dimensionValue(node, candidates, previewInputs, connected, kind === 'h_section' ? 'width' : (kind === 'box' ? 'outerDepth' : 'depth'), kind === 'h_section' ? 'B' : 'D', projectUnits)
  const tw = dimensionValue(node, candidates, previewInputs, connected, 'wallThickness', 'tw', projectUnits)
  const tf = dimensionValue(node, candidates, previewInputs, connected, 'flangeThickness', 'tf', projectUnits)
  const height = dimensionValue(node, candidates, previewInputs, connected, 'height', 'height', projectUnits)
  const B = representativeMetres(node, candidates, previewInputs, connected, kind === 'h_section' ? 'depth' : (dimensions[kind]?.port ?? 'width'), kind === 'h_section' ? 'D' : (dimensions[kind]?.key ?? 'B'))
  const D = kind === 'circular' ? B : representativeMetres(node, candidates, previewInputs, connected, kind === 'h_section' ? 'width' : (kind === 'box' ? 'outerDepth' : 'depth'), kind === 'h_section' ? 'B' : 'D')
  const max = Math.max(B ?? 0, D ?? 0, 0.01), scale = 112 / max
  const w = clamp((B ?? max) * scale, 34, 112), h = clamp((D ?? max) * scale, 34, 112), cx = 150, cy = 88
  const circleRadius = clamp(w / 2, 18, 56)
  const shape = kind === 'circular'
    ? <circle className="engineering-outline" cx={cx} cy={cy} r={circleRadius} />
    : kind === 'oval'
      ? <rect className="engineering-outline" x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={Math.min(w, h) / 2} />
      : kind === 'box'
        ? <g className="engineering-outline"><rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} /><rect className="engineering-void" x={cx - Math.max(4, w / 2 - wallPixels(representativeMetres(node,candidates,previewInputs,connected,'wallThickness','tw')??.3, scale, w))} y={cy - Math.max(4, h / 2 - wallPixels(representativeMetres(node,candidates,previewInputs,connected,'wallThickness','tw')??.3, scale, h))} width={Math.max(8, w - 2 * wallPixels(representativeMetres(node,candidates,previewInputs,connected,'wallThickness','tw')??.3, scale, w))} height={Math.max(8, h - 2 * wallPixels(representativeMetres(node,candidates,previewInputs,connected,'wallThickness','tw')??.3, scale, h))} /></g>
        : kind === 'h_section'
          ? <HSection cx={cx} cy={cy} width={w} height={h} web={wallPixels(representativeMetres(node,candidates,previewInputs,connected,'webThickness','tw')??.2, scale, w)} flange={wallPixels(representativeMetres(node,candidates,previewInputs,connected,'flangeThickness','tf')??.2, scale, h)} />
          : <rect className="engineering-outline" x={cx - w / 2} y={cy - h / 2} width={w} height={h} />
  const label = kind === 'circular' ? `Ø = ${b}` : `B = ${b}`
  const aria = `${kind.replace('_', ' ')} pier schematic. ${label}; ${kind !== 'circular' ? `D = ${d}; ` : ''}Bridge Axis.`
  return <SchematicCard className="engineering-schematic-single"><svg viewBox="0 0 300 250" role="img" aria-label={aria}>
    {shape}
    {kind === 'circular' && <><CenterLine x1={cx - 44} y1={cy} x2={cx + 44} y2={cy} /><DimensionHorizontal x1={cx - circleRadius} x2={cx + circleRadius} y={cy + circleRadius + 12} toY={cy + circleRadius} label={`Ø = ${b}`} /></>}
    {kind !== 'circular' && <><DimensionHorizontal x1={cx - w / 2} x2={cx + w / 2} y={20} toY={cy - h / 2} label={`B = ${b}`} /><DimensionVertical y1={cy - h / 2} y2={cy + h / 2} x={232} toX={cx + w / 2} label={`D = ${d}`} />{(kind === 'box' || kind === 'h_section') && <text className="engineering-dimension" x="150" y="177" textAnchor="middle">{kind === 'box' ? `tw = ${tw}` : `tw = ${tw}   tf = ${tf}`}</text>}</>}
    <BridgeAxis y={201} /><text className="engineering-dimension" x="150" y="239" textAnchor="middle">Pier Height = {height}</text>
  </svg></SchematicCard>
}

function HSection({ cx, cy, width, height, web, flange }: { cx: number; cy: number; width: number; height: number; web: number; flange: number }) {
  // The former I-like glyph is rotated 90 degrees: the two legs run in the longitudinal (D) direction.
  // Keep the engineering web thickness represented without allowing a very
  // small default value to turn the reinforced-concrete section into a steel
  // I-profile. This only affects the illustrative SVG; candidate geometry is
  // still read from the existing resolved parameters above.
  const f = clamp(flange, 9, width * .32), t = clamp(web, 12, height * .38)
  return <path data-orientation="rotated-90" className="engineering-outline" d={`M${cx - width / 2} ${cy - height / 2} H${cx - width / 2 + f} V${cy - t / 2} H${cx + width / 2 - f} V${cy - height / 2} H${cx + width / 2} V${cy + height / 2} H${cx + width / 2 - f} V${cy + t / 2} H${cx - width / 2 + f} V${cy + height / 2} H${cx - width / 2} Z`} />
}

function PierCapSchematic({ node, candidates, previewInputs, connected, projectUnits }: Omit<Props, 'schema' | 'connections'> & { connected: Set<string> }) {
  const t = node.type.endsWith('.t')
  const dims = t ? ['length', 'topWidth', 'stemWidth', 'totalHeight', 'flangeThickness'] : ['length', 'width', 'height']
  const values = Object.fromEntries(dims.map(key => [key, dimensionValue(node, candidates, previewInputs, connected, key, key, projectUnits)]))
  const top = representativeMetres(node, candidates, previewInputs, connected, t ? 'topWidth' : 'width', t ? 'topWidth' : 'width') ?? 3
  const stem = representativeMetres(node, candidates, previewInputs, connected, 'stemWidth', 'stemWidth') ?? 1.5
  const tall = representativeMetres(node, candidates, previewInputs, connected, t ? 'totalHeight' : 'height', t ? 'totalHeight' : 'height') ?? 2
  const ft = representativeMetres(node, candidates, previewInputs, connected, 'flangeThickness', 'flangeThickness') ?? .8
  const maxWidth = t ? top : top
  const scale = Math.min(104 / Math.max(maxWidth, 0.01), 94 / Math.max(tall, 0.01)), w = clamp(top * scale, 52, 124), h = clamp(tall * scale, 48, 100), sw = clamp((stem / Math.max(top, .01)) * w, 18, w - 10), thk = clamp((ft / Math.max(tall, .01)) * h, 8, h * .6), cx = 150, bottom = 146
  const shape = t
    ? <path data-flange-position="bottom" className="engineering-outline" d={`M${cx-sw/2} ${bottom-h} H${cx+sw/2} V${bottom-thk} H${cx+w/2} V${bottom} H${cx-w/2} V${bottom-thk} H${cx-sw/2} Z`} />
    : <rect className="engineering-outline" x={cx-w/2} y={bottom-h} width={w} height={h} />
  return <SchematicCard className="engineering-schematic-single"><svg viewBox="0 0 300 250" role="img" aria-label={`${t ? 'T-Cap with bottom flange and upward stem' : 'Rectangular Pier Cap'}: ${dims.map(key => `${key} ${values[key]}`).join(', ')}. Bridge Axis.`}>
    {shape}
    <DimensionHorizontal x1={cx-w/2} x2={cx+w/2} y={24} toY={bottom-h} label={`${t ? 'Top / Flange Width' : 'Width'} = ${values[t ? 'topWidth' : 'width']}`} />
    <DimensionVertical y1={bottom-h} y2={bottom} x={232} toX={cx+w/2} label={`H = ${values[t ? 'totalHeight' : 'height']}`} />
    {t && <><DimensionHorizontal x1={cx-sw/2} x2={cx+sw/2} y={166} toY={bottom-thk} label={`Stem = ${values.stemWidth}`} compact /><DimensionVertical y1={bottom-thk} y2={bottom} x={214} toX={cx+w/2} label={`tf = ${values.flangeThickness}`} compact /></>}
    <text className="engineering-dimension" x="150" y="194" textAnchor="middle">Length = {values.length}</text>
    <BridgeAxis y={222} />
  </svg></SchematicCard>
}

function FoundationSchematic({ node, candidates, previewInputs, connected, projectUnits }: Omit<Props, 'schema' | 'connections'> & { connected: Set<string> }) {
  const piled = node.type.endsWith('.piled')
  return <SchematicCard className="engineering-schematic-foundation">
    <svg viewBox="0 0 300 410" role="img" aria-label={piled ? 'Piled foundation plan and section with dimensions and Bridge Axis' : 'Shallow foundation plan and section with dimensions and Bridge Axis'}>
      <text className="engineering-view-title" x="150" y="12" textAnchor="middle">PLAN</text>
      {piled ? <PiledPlan node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} /> : <ShallowPlan node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />}
      <text className="engineering-view-title" x="150" y="221" textAnchor="middle">SECTION</text>
      {piled ? <PiledSection node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} /> : <ShallowSection node={node} candidates={candidates} previewInputs={previewInputs} connected={connected} projectUnits={projectUnits} />}
    </svg>
  </SchematicCard>
}

function ShallowPlan(p: { node: SpanovaNode; candidates: GraphValue[]; previewInputs: Props['previewInputs']; connected: Set<string>; projectUnits?: ProjectUnitPreferences }) {
  const Lx=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'Lx','Lx',p.projectUnits), Ly=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'Ly','Ly',p.projectUnits)
  const { x, y, w, h } = planRect(representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'Lx','Lx')??8, representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'Ly','Ly')??6, 53, 36, 194, 111)
  return <><rect className="engineering-outline" x={x} y={y} width={w} height={h}/><DimensionHorizontal x1={x} x2={x+w} y={31} toY={y} label={`Lx = ${Lx}`}/><DimensionVertical y1={y} y2={y+h} x={242} toX={x+w} label={`Ly=${Ly.replace(' ','')}`} compact/><BridgeAxis y={y+h+13}/></>
}
function ShallowSection(p: { node: SpanovaNode; candidates: GraphValue[]; previewInputs: Props['previewInputs']; connected: Set<string>; projectUnits?: ProjectUnitPreferences }) {
  const h=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'height','height',p.projectUnits), Lx=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'Lx','Lx',p.projectUnits)
  const rect={x:70,y:275,width:160,height:65}
  return <><rect className="engineering-outline" {...rect}/><DimensionHorizontal x1={rect.x} x2={rect.x+rect.width} y={258} toY={rect.y} label={`Lx = ${Lx}`}/><DimensionVertical y1={rect.y} y2={rect.y+rect.height} x={236} toX={rect.x+rect.width} label={`H=${h.replace(' ','')}`} compact/></>
}

function PiledPlan(p: { node: SpanovaNode; candidates: GraphValue[]; previewInputs: Props['previewInputs']; connected: Set<string>; projectUnits?: ProjectUnitPreferences }) {
  const Lx=derivedValue(p,'Lx'), Ly=derivedValue(p,'Ly'), D=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'pileDiameter','pileDiameter',p.projectUnits), nx=numberValue(p,'pileCountX','pileCountX'), ny=numberValue(p,'pileCountY','pileCountY'), ax=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'pileSpacingX','pileSpacingX',p.projectUnits), ay=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'pileSpacingY','pileSpacingY',p.projectUnits)
  const nxv=representativeNumber(p,'pileCountX','pileCountX')??2, nyv=representativeNumber(p,'pileCountY','pileCountY')??2, d=representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'pileDiameter','pileDiameter')??1, axv=representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'pileSpacingX','pileSpacingX')??3, ayv=representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'pileSpacingY','pileSpacingY')??3
  const Lxv=Math.max(2*d+(nxv-1)*axv,.01), Lyv=Math.max(2*d+(nyv-1)*ayv,.01), {x,y,w,h}=planRect(Lxv,Lyv,58,42,184,94)
  const cols=Math.max(1,Math.min(8,Math.floor(nxv))),rows=Math.max(1,Math.min(8,Math.floor(nyv))),radius=clamp((d/Math.max(2*d+(nxv-1)*axv,2*d+(nyv-1)*ayv))*Math.min(w,h)*.5,2.5,8)
  const piles=Array.from({length:cols*rows},(_,i)=>{const c=i%cols,r=Math.floor(i/cols),cx=x+(d/Lxv+(cols===1?0:c/(cols-1)*(Lxv-2*d)/Lxv))*w,cy=y+(d/Lyv+(rows===1?0:r/(rows-1)*(Lyv-2*d)/Lyv))*h;return <circle key={`${c}-${r}`} className="engineering-pile" cx={cx} cy={cy} r={radius}/>})
  return <><rect className="engineering-outline" x={x} y={y} width={w} height={h}/>{piles}<DimensionHorizontal x1={x} x2={x+w} y={33} toY={y} label={`Lx = ${Lx}`}/><DimensionVertical y1={y} y2={y+h} x={242} toX={x+w} label={`Ly=${Ly.replaceAll(' ','')}`} compact/><text className="engineering-dimension" x="150" y="153" textAnchor="middle">Nx = {nx}   Ny = {ny}</text><text className="engineering-dimension" x="150" y="168" textAnchor="middle">ax = {ax}   ay = {ay}   D = {D}</text><BridgeAxis y={187}/></>
}
function PiledSection(p: { node: SpanovaNode; candidates: GraphValue[]; previewInputs: Props['previewInputs']; connected: Set<string>; projectUnits?: ProjectUnitPreferences }) {
  const H=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'capHeight','capHeight',p.projectUnits), D=dimensionValue(p.node,p.candidates,p.previewInputs,p.connected,'pileDiameter','pileDiameter',p.projectUnits), count=representativeNumber(p,'pileCountX','pileCountX')??2, spacing=representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'pileSpacingX','pileSpacingX')??3, diameter=representativeMetres(p.node,p.candidates,p.previewInputs,p.connected,'pileDiameter','pileDiameter')??1.2
  const length=representativeDerived(p,'Lx')??(2*diameter+(count-1)*spacing), rect={x:82,y:276,width:136,height:34}, piles=Math.max(1,Math.min(8,Math.floor(count))), pileW=clamp(diameter/Math.max(length,.01)*rect.width,8,26), pileCenters=Array.from({length:piles},(_,i)=>rect.x+(diameter+(piles===1?0:i*spacing))/Math.max(length,.01)*rect.width)
  return <><rect className="engineering-outline" {...rect}/>{pileCenters.map((x,i)=><rect key={i} className="engineering-pile-section" x={x-pileW/2} y={rect.y+rect.height} width={pileW} height={57}/>)}<DimensionHorizontal x1={rect.x} x2={rect.x+rect.width} y={260} toY={rect.y} label={`Lx = ${derivedValue(p,'Lx')}`}/><DimensionVertical y1={rect.y} y2={rect.y+rect.height} x={238} toX={rect.x+rect.width} label={`H = ${H}`} compact/><DimensionHorizontal x1={pileCenters[0]-pileW/2} x2={pileCenters[0]+pileW/2} y={395} toY={367} label={`D = ${D}`} compact/></>
}

function BearingSchematic({ node, candidates, previewInputs, connected, projectUnits }: Omit<Props, 'schema' | 'connections'> & { connected: Set<string> }) {
  const lx=dimensionValue(node,candidates,previewInputs,connected,'lengthX','lengthX',projectUnits), wy=dimensionValue(node,candidates,previewInputs,connected,'widthY','widthY',projectUnits), h=dimensionValue(node,candidates,previewInputs,connected,'totalHeight','totalHeight',projectUnits)
  const geom=(key:string,fallback:string)=>representativeMetres(node,candidates,previewInputs,connected,key,key)??Number(node.parameters[`${fallback}Value`]??0.6)
  const {x,y,w, h:planH}=planRect(geom('lengthX','lengthX'),geom('widthY','widthY'),80,35,140,68)
  return <SchematicCard className="engineering-schematic-foundation"><svg viewBox="0 0 300 260" role="img" aria-label={`Elastomeric Bearing plan and section. Length X ${lx}; Width Y ${wy}; Total Height ${h}.`}>
    <text className="engineering-view-title" x="150" y="12" textAnchor="middle">PLAN</text><rect className="engineering-outline" x={x} y={y} width={w} height={planH}/><DimensionHorizontal x1={x} x2={x+w} y={28} toY={y} label={`Length X = ${lx}`}/><DimensionVertical y1={y} y2={y+planH} x={246} toX={x+w} label="" compact/><text className="engineering-dimension" x="150" y="113" textAnchor="middle">Width Y = {wy}</text><BridgeAxis y={131}/>
    <text className="engineering-view-title" x="150" y="158" textAnchor="middle">SECTION</text><rect className="engineering-outline" x="92" y="177" width="116" height="30"/><DimensionVertical y1={177} y2={207} x={238} toX={208} label={`H=${h.replace(' ','')}`} compact/>
  </svg></SchematicCard>
}

function dimensionValue(node: SpanovaNode, candidates: GraphValue[], previewInputs: Props['previewInputs'], connected: Set<string>, port: string, key: string, projectUnits?: ProjectUnitPreferences) {
  const fromCandidates=geometryValues(candidates,key)
  if(fromCandidates.length)return displayRange(fromCandidates,projectUnits)
  if(connected.has(port))return formatInputLength(previewInputs[port]?.value,projectUnits)
  const raw=node.parameters[`${key}Value`]
  const unitId=String(node.parameters[`${key}Unit`]??'m'), source=getUnit(unitId)
  if(typeof raw==='number'&&source?.kind==='length')return displayLength(source.toCanonical(raw),projectUnits)
  return '—'
}
function representativeMetres(node:SpanovaNode,candidates:GraphValue[],preview:Props['previewInputs'],connected:Set<string>,port:string,key:string){const v=geometryValues(candidates,key)[0];if(v!==undefined)return v;if(connected.has(port))return inputValues(preview[port]?.value)[0];const raw=node.parameters[`${key}Value`],unit=getUnit(String(node.parameters[`${key}Unit`]??'m'));return typeof raw==='number'&&unit?.kind==='length'?unit.toCanonical(raw):undefined}
function representativeNumber(p:{node:SpanovaNode;candidates:GraphValue[];previewInputs:Props['previewInputs'];connected:Set<string>},port:string,key:string){const v=geometryValues(p.candidates,key)[0];if(v!==undefined)return v;if(p.connected.has(port)){const raw=p.previewInputs[port]?.value;return inputValues(raw)[0]}const value=p.node.parameters[`${key}Value`];return typeof value==='number'?value:undefined}
function representativeDerived(p:{candidates:GraphValue[]},axis:'Lx'|'Ly'){for(const item of p.candidates){if(typeof item!=='object'||item===null||Array.isArray(item)||!('geometry'in item))continue;const derived=(item.geometry as Record<string,unknown>).derived as Record<string,unknown>|undefined;if(typeof derived?.[axis]==='number')return derived[axis]}return undefined}
function numberValue(p:{node:SpanovaNode;candidates:GraphValue[];previewInputs:Props['previewInputs'];connected:Set<string>},port:string,key:string){const values=p.candidates.map(item=>candidateProperty(item,key)).filter((v):v is number=>v!==undefined);if(values.length)return values.length===1?String(values[0]):`${Math.min(...values)}–${Math.max(...values)}`;if(p.connected.has(port)){const values=inputValues(p.previewInputs[port]?.value);return values.length?values.join('–'):'—'}const value=p.node.parameters[`${key}Value`];return typeof value==='number'?String(value):'—'}
function derivedValue(p:{node:SpanovaNode;candidates:GraphValue[];projectUnits?:ProjectUnitPreferences},axis:'Lx'|'Ly'){const values=p.candidates.map(item=>{if(typeof item!=='object'||item===null||Array.isArray(item)||!('geometry'in item))return undefined;const g=item.geometry as Record<string,unknown>,derived=g.derived as Record<string,unknown>|undefined;return typeof derived?.[axis]==='number'?derived[axis]:undefined}).filter((v):v is number=>v!==undefined);return values.length?displayRange(values,p.projectUnits):'—'}
function candidateProperty(item:GraphValue,key:string):number|undefined {if(typeof item!=='object'||item===null||Array.isArray(item)||!('geometry'in item))return;const value=(item.geometry as Record<string,unknown>)[key];return typeof value==='number'?value:undefined}
function inputValues(value:GraphValue|undefined):number[]{if(value===undefined)return[];const values=Array.isArray(value)?value:[value];return values.flatMap(item=>{if(typeof item==='number')return Number.isFinite(item)?[item]:[];if(typeof item==='object'&&item!==null&&'quantityKind'in item&&item.quantityKind==='length')return[item.value];return[]})}
function formatInputLength(value:GraphValue|undefined,units?:ProjectUnitPreferences){return displayRange(inputValues(value),units)}
function planRect(ax:number,ay:number,x:number,y:number,maxW:number,maxH:number){const ratio=clamp(ax/Math.max(ay,.0001),.55,1.8),w=maxW*Math.sqrt(ratio/1.8),h=maxH*Math.sqrt(1.8/ratio);return{x:x+(maxW-w)/2,y:y+(maxH-h)/2,w,h}}
function wallPixels(metres:number,scale:number,limit:number){return clamp(metres*scale,6,limit*.22)}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}

function SchematicCard({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={`spn-engineering-schematic ${className??''}`}>{children}</div> }
function DimensionHorizontal({x1,x2,y,toY,label,compact=false}:{x1:number;x2:number;y:number;toY:number;label:string;compact?:boolean}){const mid=(x1+x2)/2,top=y-(compact?7:6);return <g className="engineering-dimension-line"><path d={`M${x1} ${toY}v${y-toY} M${x2} ${toY}v${y-toY} M${x1} ${y}H${x2}`} /><path d={`M${x1-3} ${y+3}l6 -6 M${x2-3} ${y+3}l6 -6`} /><text className="engineering-dimension" x={mid} y={top} textAnchor="middle">{label}</text></g>}
function DimensionVertical({y1,y2,x,toX,label,compact=false}:{y1:number;y2:number;x:number;toX:number;label:string;compact?:boolean}){const mid=(y1+y2)/2;return <g className="engineering-dimension-line"><path d={`M${toX} ${y1}H${x} M${toX} ${y2}H${x} M${x} ${y1}V${y2}`} /><path d={`M${x-3} ${y1+3}l6 -6 M${x-3} ${y2+3}l6 -6`} /><text className={`engineering-dimension${compact?' is-compact':''}`} x={x+5} y={mid} textAnchor="start" dominantBaseline="middle">{label}</text></g>}
function BridgeAxis({y}:{y:number}){return <g className="engineering-axis"><path d={`M48 ${y}H252`} /><text x="150" y={y+12} textAnchor="middle">Bridge Axis</text></g>}
function CenterLine({x1,y1,x2,y2}:{x1:number;y1:number;x2:number;y2:number}){return <path className="engineering-centerline" d={`M${x1} ${y1}H${x2} M${(x1+x2)/2} ${y1-38}V${y2+38}`} />}
