import { Component, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Gamepad2, RefreshCw } from 'lucide-react'

const MIN_LOAD_MS = 1400

const GAME_LOADERS = {
  'retro-snake': () => import('./RetroSnake.jsx'),
  'neon-tetris': () => import('./NeonTetris.jsx'),
  'cyber-pacman': () => import('./CyberPacman.jsx'),
  'block-grid-puzzle': () => import('./BlockGridPuzzle.jsx'),
}

function LoadingPanel({ game, progress }) {
  return (
    <div
      className="arcade-card flex flex-col items-center gap-4 p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <Gamepad2
        className="h-10 w-10 animate-pulse"
        style={{ color: game.accent }}
        aria-hidden="true"
      />
      <div>
        <p className="arcade-subtitle">CARGANDO {game.name.toUpperCase()}</p>
        <p className="arcade-hint mt-1">
          Preparando tablero y componentes del juego...
        </p>
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-1 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[#b9f7ff]">
          <span>Cargando</span>
          <span aria-hidden="true">{progress}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden border-2 border-[#ff2e88] bg-[#12002b]"
          role="progressbar"
          aria-label={`Cargando ${game.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="arcade-progress-fill h-full"
            style={{
              width: `${progress}%`,
              transition: 'width 120ms linear',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ErrorPanel({ gameName, message, onRetry, onExit }) {
  return (
    <div
      className="arcade-card flex flex-col items-center gap-4 p-8 text-center"
      role="alert"
    >
      <AlertTriangle
        className="h-10 w-10 text-[#ff4d6d]"
        strokeWidth={2}
        aria-hidden="true"
      />
      <h3 className="arcade-title text-base">ERROR AL CARGAR EL JUEGO</h3>
      <p className="max-w-md text-sm leading-relaxed text-[#d9c8ff]">
        {message}
      </p>
      <p className="arcade-hint">
        Juego afectado: <span className="text-white">{gameName}</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
        </button>
        <button
          type="button"
          onClick={onExit}
          className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al
          catálogo
        </button>
      </div>
    </div>
  )
}

class GameRenderBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPanel
          gameName={this.props.gameName}
          message="Ocurrió un error al renderizar el tablero del juego. Puedes reintentar la carga o volver al catálogo."
          onRetry={this.props.onRetry}
          onExit={this.props.onExit}
        />
      )
    }
    return this.props.children
  }
}

function GameStage({ game, userId, onExit, onScore, onStateChange }) {
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState('loading')
  const [progress, setProgress] = useState(0)
  const [GameView, setGameView] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loader = GAME_LOADERS[game.id]
    if (!loader) {
      return undefined
    }

    let cancelled = false
    let finishTimer = null
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current
        }
        const step = current < 45 ? 9 : current < 75 ? 5 : 2
        return Math.min(92, current + step)
      })
    }, 110)

    const minimumDelay = new Promise((resolve) => {
      window.setTimeout(resolve, MIN_LOAD_MS)
    })

    Promise.all([loader(), minimumDelay])
      .then(([module]) => {
        if (cancelled) {
          return
        }
        if (!module?.default) {
          throw new Error('El módulo del juego no es válido.')
        }
        window.clearInterval(progressTimer)
        setProgress(100)
        finishTimer = window.setTimeout(() => {
          if (cancelled) {
            return
          }
          setGameView(() => module.default)
          setPhase('ready')
        }, 320)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        window.clearInterval(progressTimer)
        setPhase('error')
        setErrorMessage(
          `No pudimos cargar "${game.name}". Revisa tu conexión e inténtalo de nuevo.`,
        )
      })

    return () => {
      cancelled = true
      window.clearInterval(progressTimer)
      if (finishTimer) {
        window.clearTimeout(finishTimer)
      }
    }
  }, [game.id, game.name, attempt])

  function retry() {
    setPhase('loading')
    setProgress(0)
    setGameView(null)
    setErrorMessage('')
    setAttempt((current) => current + 1)
  }

  if (!GAME_LOADERS[game.id]) {
    return (
      <ErrorPanel
        gameName={game.name}
        message={`No encontramos los archivos de "${game.name}". Elige otro juego del catálogo.`}
        onRetry={retry}
        onExit={onExit}
      />
    )
  }

  if (phase === 'error') {
    return (
      <ErrorPanel
        gameName={game.name}
        message={errorMessage}
        onRetry={retry}
        onExit={onExit}
      />
    )
  }

  if (phase === 'loading' || !GameView) {
    return <LoadingPanel game={game} progress={progress} />
  }

  return (
    <GameRenderBoundary
      key={attempt}
      gameName={game.name}
      onRetry={retry}
      onExit={onExit}
    >
      <GameView
        userId={userId}
        onScore={onScore}
        onStateChange={onStateChange}
      />
    </GameRenderBoundary>
  )
}

export default GameStage
