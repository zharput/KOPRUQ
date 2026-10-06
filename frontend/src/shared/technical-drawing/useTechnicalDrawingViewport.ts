import { useLayoutEffect, useState, type RefObject } from 'react'

export type TechnicalDrawingViewport = { width: number; height: number }

export function useTechnicalDrawingViewport<T extends HTMLElement>(
  ref: RefObject<T | null>,
): TechnicalDrawingViewport | undefined {
  const [viewport, setViewport] = useState<TechnicalDrawingViewport>()

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const update = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return
      setViewport((previous) => previous?.width === width && previous.height === height ? previous : { width, height })
    }

    const rect = element.getBoundingClientRect()
    update(rect.width, rect.height)

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return viewport
}
