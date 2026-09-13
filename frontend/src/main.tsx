import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'

// Apply the saved theme before the first paint, so there's no dark->light
// (or light->dark) flash on load - shared/ui/ThemeToggle.tsx owns the
// same 'spanova.theme' key/attribute afterward.
const savedTheme = localStorage.getItem('spanova.theme')
if (savedTheme === 'light' || savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
