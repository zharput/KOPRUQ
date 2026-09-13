import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Instant dark/light theme switch (2026-09-12, engineer's own request -
 * "sağ üst köşede frontend'in dark ve light olmak üzere 2 seçeneğe
 * anında dönüşme özelliğini ekle"). Domain-free (just a `<html
 * data-theme>` toggle + localStorage), so it lives in `shared/ui`.
 *
 * <p>The actual light-palette CSS variables live in `index.css`'s
 * `:root[data-theme='light']` block - every component already styled
 * via `var(--...)` needs no change to support both themes.
 */
const STORAGE_KEY = 'spanova.theme'

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(STORAGE_KEY, theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null) ?? 'dark',
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <button
      type="button"
      className="spn-icon-button"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
    >
      {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
    </button>
  )
}
