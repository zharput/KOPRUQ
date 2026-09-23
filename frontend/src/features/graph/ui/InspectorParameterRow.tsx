import type { ReactNode } from 'react'

type Props = {
  label: string
  connected?: ReactNode
  children: ReactNode
}

/** Shared generic parameter row; specialized controls stay owned by the caller. */
export default function InspectorParameterRow({ label, connected, children }: Props) {
  return <div className="spn-general-parameter"><label>{label}{connected}{children}</label></div>
}
