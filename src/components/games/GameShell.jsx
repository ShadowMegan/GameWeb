import { ArrowLeft } from 'lucide-react'

function GameShell({ game, onExit, children }) {
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
        <p className="arcade-coin ml-auto">INSERT COIN</p>
      </div>
      {children}
    </div>
  )
}

export default GameShell
