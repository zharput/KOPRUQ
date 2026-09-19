import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

export type CanvasSelectProps<T> = {
  items: readonly T[]
  value: T
  getKey: (item: T) => string
  getLabel: (item: T) => string
  onChange: (item: T) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel: string
  className?: string
}

/** Controlled select for interactive controls inside a transformed React Flow canvas. */
export default function CanvasSelect<T>({ items, value, getKey, getLabel, onChange, disabled = false, placeholder = 'Select…', ariaLabel, className = '' }: CanvasSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.findIndex(item => getKey(item) === getKey(value))))
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const selectedKey = getKey(value)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node) || menuRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); buttonRef.current?.focus() }
    }
    document.addEventListener('pointerdown', closeOutside, true)
    document.addEventListener('keydown', closeOnEscape, true)
    return () => { document.removeEventListener('pointerdown', closeOutside, true); document.removeEventListener('keydown', closeOnEscape, true) }
  }, [open])

  useEffect(() => {
    if (!open || !buttonRef.current || !menuRef.current) return
    const anchor = buttonRef.current.getBoundingClientRect()
    const menu = menuRef.current
    const width = Math.max(anchor.width, 190)
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))
    const roomBelow = window.innerHeight - anchor.bottom
    const maxHeight = Math.max(120, Math.min(280, roomBelow > 180 ? roomBelow - 8 : anchor.top - 16))
    menu.style.left = `${left}px`
    menu.style.width = `${Math.min(width, window.innerWidth - 16)}px`
    menu.style.maxHeight = `${maxHeight}px`
    menu.style.top = roomBelow > 180 ? `${anchor.bottom + 3}px` : `${Math.max(8, anchor.top - maxHeight - 3)}px`
  }, [open, items.length])

  useEffect(() => {
    if (!open) return
    const active = menuRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    active?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  const commit = (item: T) => { onChange(item); setOpen(false); buttonRef.current?.focus() }
  const toggle = () => {
    if (disabled) return
    if (!open) setActiveIndex(Math.max(0, items.findIndex(item => getKey(item) === selectedKey)))
    setOpen(current => !current)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { setActiveIndex(Math.max(0, items.findIndex(item => getKey(item) === selectedKey))); setOpen(true) }
      else setActiveIndex(current => (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) toggle()
      else if (items[activeIndex]) commit(items[activeIndex])
    } else if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false) }
  }

  return <div ref={rootRef} className={`spn-canvas-select nodrag ${className}`} onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <button ref={buttonRef} type="button" className="spn-canvas-select-trigger nodrag" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={toggle} onKeyDown={onKeyDown}>
      <span>{items.find(item => getKey(item) === selectedKey) ? getLabel(value) : placeholder}</span><span aria-hidden="true" className="spn-canvas-select-chevron">{open ? '▴' : '▾'}</span>
    </button>
    {open && createPortal(<div ref={menuRef} id={id} role="listbox" aria-label={ariaLabel} className="spn-canvas-select-menu nodrag nowheel" onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onWheel={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); buttonRef.current?.focus() } }}>
      {items.length ? items.map((item, index) => {
        const key = getKey(item), selected = key === selectedKey
        return <div role="option" aria-selected={selected} tabIndex={-1} className={`spn-canvas-select-option nodrag${selected ? ' is-selected' : ''}`} data-index={index} key={key} onMouseEnter={() => setActiveIndex(index)} onClick={() => commit(item)}><span>{getLabel(item)}</span>{selected && <span aria-hidden="true">✓</span>}</div>
      }) : <div className="spn-canvas-select-empty">{placeholder}</div>}
    </div>, document.body)}
  </div>
}
