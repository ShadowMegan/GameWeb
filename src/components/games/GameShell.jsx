import { ArrowLeft, Trophy } from 'lucide-react'

function GameShell({
  game,
  onExit,
  highScore = 0,
  savedProgress = null,
  inProgress = false,
  children,
}) {
  const hasRecord = highScore > 0
  const hasSavedProgress = Number(savedProgress?.score) > 0

  return (
    <div className="animate-fade-slide flex flex-col gap-4">
      <div className="arcade-card flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={onExit}
          className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al catálogo
        </button>
        <div className="min-w-0">
          <p className="arcade-profile-name truncate">{game.name}</p>
          <span
            className="border-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
            style={{ borderColor: `${game.accent}55`, color: game.accent }}
          >
            {game.category}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="arcade-meta-label flex items-center justify-end gap-1.5">
              <Trophy
                className="h-3.5 w-3.5 text-[#ffd319]"
                aria-hidden="true"
              />
              {hasRecord ? (
                <>
                  Récord previo:{' '}
                  <span className="text-[#ffd319]">{highScore}</span>
                </>
              ) : (
                'Sin récords previos'
              )}
            </p>
            {hasSavedProgress && (
              <p className="arcade-hint">
                Progreso guardado: {savedProgress.score} pts
                {Number(savedProgress.level) > 1
                  ? ` · fase ${savedProgress.level}`
                  : ''}
              </p>
            )}
            {inProgress && (
              <p className="arcade-hint text-[#ffd319]">Partida en curso</p>
            )}
          </div>
          <p className="arcade-coin">INSERT COIN</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default GameShell
