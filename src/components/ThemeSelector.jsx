import { useTheme } from '../context/theme.js'
import { THEMES } from '../lib/themes.js'

function ThemeSelector() {
  const { themeId, setThemeId } = useTheme()

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      role="radiogroup"
      aria-label="Elegir tema visual"
    >
      {THEMES.map((option) => {
        const isActive = themeId === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`Tema ${option.label}`}
            title={option.label}
            onClick={() => setThemeId(option.id)}
            className="theme-swatch"
            style={{
              '--swatch-a': option.swatch[0],
              '--swatch-b': option.swatch[1],
              '--swatch-c': option.swatch[2],
            }}
          >
            <span className="theme-swatch-ring" data-active={isActive || undefined}>
              <span className="theme-swatch-inner" />
            </span>
            <span className="theme-swatch-label">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeSelector
