import { useMutation } from '@tanstack/react-query'
import { inspectLandXml } from '../api/landXmlImportService'

export function useInspectLandXml() {
  return useMutation({ mutationFn: inspectLandXml })
}
