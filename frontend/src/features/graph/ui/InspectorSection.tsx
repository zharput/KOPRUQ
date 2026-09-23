import type { ReactNode } from 'react'

type Props = {
  title: string
  className?: string
  children: ReactNode
}

/** Shared Inspector section markup; styling remains owned by existing CSS selectors. */
export default function InspectorSection({ title, className, children }: Props) {
  return <section className={className}><h3>{title}</h3>{children}</section>
}
