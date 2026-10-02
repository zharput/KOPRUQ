export const TECHNICAL_DIMENSION_DECIMALS = 2
export function formatTechnicalDimension(value: number, convert: (value: number) => number): string { return convert(value).toFixed(TECHNICAL_DIMENSION_DECIMALS) }
export function formatDimensionValue(value: number, format: (value: number) => number): string { return formatTechnicalDimension(value, format) }
