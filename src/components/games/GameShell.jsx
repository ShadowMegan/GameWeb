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
      <div className="arcade-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al catálogo
          </button>
          <div className="min-w-0">
            <p className="arcade-profile-name truncate">{game.name}</p>
            <span
              className="arcade-chip mt-1"
              style={{ borderColor: `${game.accent}55`, color: game.accent }}
            >
              {game.category}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
          <div className="text-left sm:text-right">
            <p className="arcade-meta-label flex items-center justify-start gap-1.5 sm:justify-end">
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
          <p className="arcade-coin arcade-coin-inline">INSERT COIN</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default GameShell
