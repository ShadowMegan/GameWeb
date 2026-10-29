import { createContext, useContext } from 'react'
import { THEMES, THEME_STORAGE_KEY } from '../lib/themes.js'

export const ThemeContext = createContext(null)

export function loadStoredTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw && THEMES.some((theme) => theme.id === raw)) {
      return raw
    }
  } catch {
    // almacenamiento bloqueado: usar tema por defecto
  }
  return 'cyberpunk'
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}
