import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'

// SPANOVA uses the light UI only. Dark mode is intentionally disabled.
document.documentElement.setAttribute('data-theme', 'light')
localStorage.removeItem('spanova.theme')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
