export function formatDimensionValue(value: number, format: (value: number) => number): string { return format(value).toFixed(2) }
