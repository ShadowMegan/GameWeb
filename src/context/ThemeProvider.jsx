import { useEffect, useMemo, useState } from 'react'
import { THEMES, THEME_STORAGE_KEY } from '../lib/themes.js'
import { ThemeContext, loadStoredTheme } from './theme.js'

function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(loadStoredTheme)

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
    } catch {
      // almacenamiento bloqueado: la preferencia solo dura la sesión
    }
  }, [themeId])

  const value = useMemo(() => {
    const theme = THEMES.find((entry) => entry.id === themeId) ?? THEMES[0]
    return { themeId, theme, themes: THEMES, setThemeId }
  }, [themeId])

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export default ThemeProvider
