import { useMutation } from '@tanstack/react-query'
import { importLandXml } from '../api/landXmlImportService'

export function useImportLandXml() {
  return useMutation({ mutationFn: importLandXml })
}
