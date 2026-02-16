import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@cloudscape-design/global-styles/index.css'
import { applyTheme, getThemePreference } from './utils/theme'
import { bootstrapConfig } from './config'
import App from './App.tsx'

// Apply saved theme immediately to avoid flash
applyTheme(getThemePreference());

// Bootstrap config from server settings, then render
bootstrapConfig().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
