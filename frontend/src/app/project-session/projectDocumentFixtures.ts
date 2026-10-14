/**
 * Hand-written contract fixtures of the project document, in the exact JSON shape the backend returns. They are NOT produced by the
 * frontend mappers, so a mapper change cannot silently change them. Source of the shape (keep in sync by hand on a DTO change):
 * backend/src/main/java/com/kopruq/bridge/api/{ProjectDocumentResponse,WorkspaceDto,BridgeDefinitionsDto,FamilyDtos,FamiliesDto,
 * GirderLibraryDto,PreferredSpanRuleDto,CrossSectionDto,LoadInputDtos,LoadsDto,GraphDtos}.java.
 * Keys appear in the backend record order; absent optional values are explicit nulls.
 */
const projectInfo = {
  name: 'Corridor 7', id: 'KB-07', client: 'Client', designer: 'Designer', country: 'TR', region: 'Region', projectType: 'Viaduct', status: 'Draft',
  startDate: '2026-01-01', targetDate: '2027-01-01', description: 'Test project', locationStart: '13+000', locationEnd: '25+000', coordinateSystem: 'ITRF96',
  designStandardFamily: 'Eurocode', concreteCode: 'EN 1992', steelCode: 'EN 1993', compositeCode: 'EN 1994', seismicCode: 'EN 1998', geotechnicalCode: 'EN 1997',
  trafficLoadStandard: 'EN 1991-2',
  units: { length: 'm', force: 'kN', moment: 'kNm', stress: 'MPa', mass: 't', temperature: 'C' },
  coordinate: { name: 'ITRF96 / TM30', epsg: '5254', horizontalDatum: 'ITRF96', verticalDatum: 'EGM2008', originX: '500000', originY: '4500000', originZ: '0', northAngle: '0' },
  criteria: { designLife: '100', reliabilityClass: 'RC2', exposure: 'XC4', concreteClass: 'C35/45', cover: '45', philosophy: 'Limit state' },
  environment: { terrainDatasetId: null, landXmlImportId: 'landxml-1' },
  lastModified: '2026-10-13T10:00:00Z',
}

const bridgeRow = (id: string, no: string, extra: Record<string, unknown>) => ({
  id, no, km: '14+170.000', crossingType: 'Valley', estimatedLengthM: 205.0, roadWidthM: 13.8, terrain: 'Flat', status: 'Planned', bridgeType: 'Precast Girder',
  spansM: [30.0, 35.0, 40.0], girderDepthCm: [160.0, 190.0], girderNote: null, pierShape: 'Circular', ...extra,
})

const rule = (min: number | null, max: number | null, delta: number | null) => ({ min, max, delta })
const sweep = (key: string, label: string, min: number, max: number, delta: number) => ({ key, label, min, max, delta })
const parameter = (value: number | null, provenance: string, codeDefaultValue: number | null) => ({ value, provenance, codeDefaultValue })

const abutment = (id: string, name: string, chainageM: number) => ({ id, name, type: 'ABUTMENT', chainageM, elevationM: 101.5, skewDegrees: null })
const pierAxis = (id: string, chainageM: number) => ({ id, name: id, type: 'PIER', chainageM, elevationM: null, skewDegrees: 5.0 })

export const CANONICAL_PROJECT_DOCUMENT_JSON = {
  projectId: '2c0e8b1a-6a53-4a3e-9d57-0f6a1b0c9e01',
  revision: 17,
  createdAt: '2026-10-13T09:00:00Z',
  updatedAt: '2026-10-13T10:30:00Z',
  workspace: {
    project: projectInfo,
    bridges: [
      bridgeRow('bridge-1', 'VIA-02', {}),
      bridgeRow('bridge-2', 'VIA-01', { bridgeType: 'Cantilever Bridge', spansM: [140.0], girderDepthCm: null, girderNote: 'Box (fixed cross-section)', pierShape: 'Box' }),
    ],
  },
  bridgeDefinitions: {
    definitions: [{
      definitionKey: 'bridge-1', bridgeId: 'bridge-1', spanLengthsM: [30.0, 35.0, 40.0],
      axes: [abutment('A1', 'A1', 0.0), pierAxis('P1', 30.0), pierAxis('P2', 65.0), abutment('A2', 'A2', 105.0)],
      superstructureType: 'Precast Girder', girderFamilyId: 'PG-200', girderVariantId: 'PG-H160', girderCount: 5.0, deckWidthOverrideM: null,
      axisAssignments: [
        {
          axisId: 'P1', pierFamilyId: 'pier-circ', pierHeightM: 12.5, pierCapFamilyId: 'cap-t', foundationFamilyId: 'fnd-piled', foundationElevationM: 88.0, soilReference: 'BH-1',
          bearingFamilyId: 'brg-1', bearingQuantity: 4.0, bearingOrientation: 'x', longitudinalBehavior: 'free', transverseBehavior: 'fixed',
        },
        {
          axisId: 'P2', pierFamilyId: null, pierHeightM: null, pierCapFamilyId: null, foundationFamilyId: null, foundationElevationM: null, soilReference: '',
          bearingFamilyId: null, bearingQuantity: null, bearingOrientation: '', longitudinalBehavior: '', transverseBehavior: '',
        },
      ],
      abutmentFamilyIds: { A1: 'abt-1', A2: null },
      constructionMethod: 'Launching', constructionStagesNote: 'Stage note',
      constraints: [
        { id: 'c1', kind: 'ROAD_RAILWAY', name: 'Highway', startChainageM: 10.0, endChainageM: 20.0, note: '' },
        { id: 'c2', kind: 'OTHER', name: 'Other', startChainageM: null, endChainageM: null, note: 'n' },
      ],
    }],
  },
  families: {
    piers: [
      {
        id: 'pier-circ', name: 'Circular', pierType: 'CIRCULAR', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', dimensions: [sweep('D', 'D (m)', 1.2, 1.8, 0.2)],
        allowedConfigurations: ['SINGLE_COLUMN', 'TWO_COLUMNS'], twoColumnSpacing: sweep('S', 'Spacing (m)', 4.0, 6.0, 1.0),
        heightApplicability: { minimumHeight: 5.0, preferredHeightMin: 8.0, preferredHeightMax: 20.0, maximumHeight: 30.0 },
      },
      {
        id: 'pier-legacy', name: 'Legacy', pierType: 'H_TYPE', enabled: false, source: 'PROJECT_DESIGN_SYSTEM', dimensions: [], allowedConfigurations: [],
        twoColumnSpacing: null, heightApplicability: { minimumHeight: null, preferredHeightMin: null, preferredHeightMax: null, maximumHeight: null },
      },
      { id: 'pier-wall', name: null, pierType: 'WALL', enabled: null, source: null, dimensions: null, allowedConfigurations: null, twoColumnSpacing: null, heightApplicability: null },
    ],
    pierCaps: [
      {
        id: 'cap-t', name: 'T cap', capType: 'T_CAP', compatiblePierConfiguration: 'SINGLE_COLUMN', enabled: true, source: 'PROJECT_DESIGN_SYSTEM',
        capTransverseLength: rule(8.0, 10.0, 1.0), capStructuralHeight: rule(1.5, 2.0, 0.5), stemWidth: rule(1.0, 1.2, 0.2),
      },
      {
        id: 'cap-r', name: 'Rect cap', capType: 'RECTANGULAR', compatiblePierConfiguration: 'TWO_COLUMNS', enabled: true, source: 'PROJECT_DESIGN_SYSTEM',
        capTransverseLength: rule(8.0, null, null), capStructuralHeight: rule(1.0, 1.0, 0.0), stemWidth: null,
      },
    ],
    foundations: [
      {
        id: 'fnd-shallow', name: 'Shallow', foundationType: 'SHALLOW', enabled: true, source: 'PROJECT_DESIGN_SYSTEM',
        shallowGeneration: { lengthX: rule(4.0, 6.0, 1.0), lengthY: rule(4.0, 6.0, 1.0), height: rule(1.5, 2.0, 0.5) }, piledGeneration: null,
      },
      {
        id: 'fnd-piled', name: 'Piled', foundationType: 'PILED', enabled: true, source: 'PROJECT_DESIGN_SYSTEM', shallowGeneration: null,
        piledGeneration: { pileDiameter: rule(1.0, 1.2, 0.2), pileCountX: rule(2.0, 3.0, 1.0), pileSpacingX: rule(3.0, 3.0, 0.0), pileCountY: rule(2.0, 3.0, 1.0), pileSpacingY: rule(3.0, 3.0, 0.0), height: rule(1.5, 2.0, 0.5) },
      },
    ],
    bearings: [{
      id: 'brg-1', name: 'Elastomeric', bearingType: 'ELASTOMERIC', enabled: true, source: 'PROJECT_DESIGN_SYSTEM',
      length: rule(300.0, 500.0, 50.0), width: rule(400.0, 600.0, 50.0), height: rule(40.0, 80.0, 10.0),
    }],
    materials: [
      { id: 'FOUNDATION', no: 2.0, element: 'Foundation', concreteClass: 'C30/37' },
      { id: 'DRILLED_PILES', no: 1.0, element: 'Drilled piles', concreteClass: 'C30/37' },
    ],
  },
  girderLibrary: { enabled: true, dimensions: [sweep('H', 'H (cm)', 160.0, 190.0, 10.0), sweep('tf', 'tf (cm)', 120.0, 150.0, 10.0)] },
  preferredSpanRules: [{ id: 'girder-span-PG-H160', superstructureType: 'PRECAST_GIRDER', girderVariantId: 'PG-H160', minSpan: 20.0, maxSpan: 30.0, spanDelta: 5.0, primarySpan: 25.0, enabled: true, source: 'PROJECT_DESIGN_SYSTEM' }],
  crossSection: { platformWidthM: 13.8, leftWalkwayM: 1.0, rightWalkwayM: 1.5, spaceOfGirderM: 2.0, numberOfGirders: 5.0 },
  loads: {
    seismic: { a: '0.2', g: 'C', t: 'Type 2', i: '1.2' },
    wind: { vb: '27', terrain: 'III', ze: '12' },
    temperature: { min: '-20', max: '40', t0: '10' },
    selfWeight: {
      asphaltThicknessM: 0.12, asphaltUnitWeightKNm3: 23.0, sidewalkThicknessM: 0.2, sidewalkUnitWeightKNm3: 25.0, faciaCount: 2.0, faciaWidthM: 0.6, faciaThicknessM: 0.1, faciaUnitWeightKNm3: 25.0,
      guardrailCount: 1.0, guardrailUnitLoadKNm: 2.0, pedestrianRailingCount: 2.0, pedestrianRailingUnitLoadKNm: 1.5, protectiveFenceCount: 0.0, protectiveFenceUnitLoadKNm: 1.0, soundPanelCount: 1.0, soundPanelUnitLoadKNm: 1.0,
    },
    trafficLm1: {
      tandemSystem: [{ label: 'Lane 1', characteristicValue: parameter(300.0, 'CODE_DEFAULT', 300.0), adjustmentFactor: parameter(null, 'NATIONAL_ANNEX', null) }],
      udl: [{ label: 'Lane 1', characteristicValue: parameter(9.0, 'CODE_DEFAULT', 9.0), adjustmentFactor: parameter(1.0, 'PROJECT_OVERRIDE', 0.8) }],
      remainingAreaUdl: { label: 'Remaining', characteristicValue: parameter(2.5, 'CODE_DEFAULT', 2.5), adjustmentFactor: parameter(0.8, 'PROJECT_OVERRIDE', 1.0) },
    },
    windSnapshot: { schemaVersion: 1, status: null, inputs: { vb: '27', terrain: 'III', ze: '12', deckWidthM: 13.8, drefM: 2.1 } },
  },
  graphs: [
    {
      id: 'graph-1', name: 'Main', schemaVersion: 1, projectId: 'proj-1', bridgeId: 'bridge-1',
      nodes: [
        {
          id: 'n1', type: 'number', name: 'Span', position: { x: 10.0, y: -20.5 },
          parameters: [
            { key: 'value', kind: 'NUMBER', value: 35.0 }, { key: 'flag', kind: 'BOOLEAN', value: true }, { key: 'label', kind: 'STRING', value: 'abc' },
            { key: 'list', kind: 'NUMBER_ARRAY', value: [30.0, 35.0, 40.0] }, { key: 'none', kind: 'NUMBER_ARRAY', value: [] },
          ],
        },
        { id: 'n2', type: 'display', name: 'Out', position: { x: 0.0, y: 0.0 }, parameters: [] },
      ],
      connections: [{ id: 'c1', sourceNodeId: 'n1', sourcePortId: 'out', targetNodeId: 'n2', targetPortId: 'in' }],
      groups: [{ id: 'grp', name: 'Group', nodeIds: ['n1'], color: '#ffffff' }],
    },
    { id: 'graph-2', name: 'Legacy', schemaVersion: 1, projectId: null, bridgeId: null, nodes: [], connections: [], groups: null },
    { id: 'graph-3', name: 'Empty groups', schemaVersion: 1, projectId: null, bridgeId: null, nodes: [], connections: [], groups: [] },
  ],
}

/** What `POST /api/projects` (201) returns: the workspace is stored, every other section is still unwritten. */
export const NEW_PROJECT_DOCUMENT_JSON = {
  projectId: '5d3b6f0c-1c1e-4c3a-8d2b-7a9f0e6b1c02',
  revision: 1,
  createdAt: '2026-10-13T09:00:00Z',
  updatedAt: '2026-10-13T09:00:00Z',
  workspace: { project: projectInfo, bridges: [] as unknown[] },
  bridgeDefinitions: null,
  families: { piers: null, pierCaps: null, foundations: null, bearings: null, materials: null },
  girderLibrary: null,
  preferredSpanRules: null,
  crossSection: null,
  loads: { seismic: null, wind: null, temperature: null, selfWeight: null, trafficLm1: null, windSnapshot: null },
  graphs: [] as unknown[],
}
