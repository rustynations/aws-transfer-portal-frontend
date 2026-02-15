import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@cloudscape-design/global-styles/index.css'
import { applyTheme, getThemePreference } from './utils/theme'
import App from './App.tsx'

// Apply saved theme immediately to avoid flash
applyTheme(getThemePreference());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
