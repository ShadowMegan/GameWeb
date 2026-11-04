import { Pause, Play } from 'lucide-react'

export function GamePauseButton({ isPaused, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isPaused ? 'Reanudar juego' : 'Pausar juego'}
      aria-pressed={isPaused}
      className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-1.5"
    >
      {isPaused ? (
        <Play className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Pause className="h-4 w-4" aria-hidden="true" />
      )}
      {isPaused ? 'Reanudar' : 'Pausa'}
    </button>
  )
}

export function GamePauseOverlay({ onResume }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
      <p className="arcade-success-title text-sm">JUEGO EN PAUSA</p>
      <p className="arcade-hint">Pulsa Escape o P para reanudar.</p>
      <button
        type="button"
        onClick={onResume}
        className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Reanudar
      </button>
    </div>
  )
}
