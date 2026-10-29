import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Trophy,
} from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'

const ACCENT = '#00e5ff'
const GRID_SIZE = 15
const STEP_MS = 140
const POINTS_PER_APPLE = 10

const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

const DIRECTION_BY_KEY = {
  arrowup: DIRECTIONS[0],
  w: DIRECTIONS[0],
  arrowdown: DIRECTIONS[1],
  s: DIRECTIONS[1],
  arrowleft: DIRECTIONS[2],
  a: DIRECTIONS[2],
  arrowright: DIRECTIONS[3],
  d: DIRECTIONS[3],
}

function createInitialSnake() {
  return [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ]
}

function randomApple(snake) {
  for (let tries = 0; tries < GRID_SIZE * GRID_SIZE; tries += 1) {
    const cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    if (!snake.some((part) => part.x === cell.x && part.y === cell.y)) {
      return cell
    }
  }
  return null
}

function stepSnake(current) {
  const head = current.snake[0]
  const next = {
    x: head.x + current.direction.x,
    y: head.y + current.direction.y,
  }

  const hitsWall =
    next.x < 0 || next.y < 0 || next.x >= GRID_SIZE || next.y >= GRID_SIZE
  const bitesTail = current.snake
    .slice(0, -1)
    .some((part) => part.x === next.x && part.y === next.y)

  if (hitsWall || bitesTail) {
    return {
      ...current,
      highScore: Math.max(current.highScore, current.score),
      status: 'over',
    }
  }

  const eatsApple =
    Boolean(current.apple) &&
    next.x === current.apple.x &&
    next.y === current.apple.y

  if (!eatsApple) {
    return {
      ...current,
      snake: [next, ...current.snake.slice(0, -1)],
    }
  }

  const grown = [next, ...current.snake]
  return {
    ...current,
    snake: grown,
    apple: randomApple(grown),
    score: current.score + POINTS_PER_APPLE,
  }
}

function createSnakeGame(highScore) {
  const snake = createInitialSnake()
  return {
    snake,
    apple: randomApple(snake) ?? { x: 3, y: 3 },
    direction: { x: 1, y: 0 },
    score: 0,
    highScore,
    status: 'running',
  }
}

function RetroSnake({ onScore }) {
  const [game, setGame] = useState(() => ({
    ...createSnakeGame(readHighScore('retro-snake')),
    status: 'idle',
  }))
  const snake = game.snake
  const apple = game.apple
  const score = game.score
  const highScore = game.highScore
  const status = game.status
  const beatRecord = status === 'over' && score > 0 && score >= highScore
  const lastSavedScoreRef = useRef(highScore)
  const directionRef = useRef({ x: 1, y: 0 })
  const queuedRef = useRef(null)

  useEffect(() => {
    if (score > 0) {
      onScore?.(score)
    }
  }, [score, onScore])

  useEffect(() => {
    if (highScore > lastSavedScoreRef.current) {
      lastSavedScoreRef.current = highScore
      saveHighScore('retro-snake', highScore)
    }
  }, [highScore])

  useEffect(() => {
    if (status !== 'running') {
      return undefined
    }
    const timer = window.setInterval(() => {
      if (queuedRef.current) {
        setGame((previous) => ({
          ...previous,
          direction: queuedRef.current,
        }))
        queuedRef.current = null
      }
      setGame(stepSnake)
    }, STEP_MS)

    return () => window.clearInterval(timer)
  }, [status])

  function queueDirection(next) {
    const current = directionRef.current
    const pending = queuedRef.current ?? current
    if (pending.x === -next.x && pending.y === -next.y) {
      return
    }
    directionRef.current = next
    queuedRef.current = next
  }

  useEffect(() => {
    function handleKey(event) {
      const direction = DIRECTION_BY_KEY[event.key.toLowerCase()]
      if (direction) {
        event.preventDefault()
        if (status === 'running') {
          queueDirection(direction)
        }
        return
      }
      if ((event.key === 'Enter' || event.key === ' ') && status !== 'running') {
        event.preventDefault()
        startGame()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function startGame() {
    directionRef.current = { x: 1, y: 0 }
    queuedRef.current = null
    setGame(createSnakeGame(highScore))
  }

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="arcade-meta-label">
          Puntos: <span style={{ color: ACCENT }}>{score}</span>
        </p>
        <p className="arcade-meta-label flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Récord:{' '}
          <span style={{ color: '#ffd319' }}>{highScore}</span>
        </p>
      </div>

      <div
        className="relative mx-auto w-full max-w-md"
        style={{
          border: `2px solid ${ACCENT}`,
          boxShadow: `0 0 14px ${ACCENT}55, inset 0 0 22px rgba(18, 0, 43, 0.7)`,
        }}
      >
        <div
          className="grid aspect-square"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const x = index % GRID_SIZE
            const y = Math.floor(index / GRID_SIZE)
            const snakeIndex = snake.findIndex(
              (part) => part.x === x && part.y === y,
            )
            const isHead = snakeIndex === 0
            const isApple = Boolean(apple) && apple.x === x && apple.y === y

            return (
              <div
                key={`${x}-${y}`}
                className="relative"
                style={{
                  border: '1px solid rgba(138, 43, 226, 0.16)',
                  background:
                    snakeIndex >= 0
                      ? `${ACCENT}${isHead ? '' : '88'}`
                      : 'rgba(7, 3, 15, 0.6)',
                  boxShadow:
                    snakeIndex >= 0
                      ? `inset 0 0 6px ${ACCENT}${isHead ? 'cc' : '55'}`
                      : undefined,
                }}
              >
                {isApple && (
                  <span
                    className="absolute inset-1"
                    style={{
                      borderRadius: '9999px',
                      background: '#ff2e88',
                      boxShadow: '0 0 10px #ff2e88',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {status === 'idle' && (
              <>
                <p className="arcade-subtitle">RETRO SNAKE</p>
                <p className="arcade-hint">W A S D o FLECHAS para moverte</p>
              </>
            )}
            {status === 'over' && (
              <GameOverScreen
                score={score}
                highScore={highScore}
                beatRecord={beatRecord}
                onRestart={startGame}
              />
            )}
            <button
              type="button"
              onClick={startGame}
              className="arcade-btn arcade-btn-primary arcade-btn-sm"
            >
              {status === 'idle' ? 'INICIAR' : 'JUGAR OTRA VEZ'}
            </button>
          </div>
        )}
      </div>

      {status === 'running' && (
        <div className="mx-auto grid w-fit grid-cols-3 gap-1.5 sm:hidden">
          <span aria-hidden="true" />
          <button
            type="button"
            aria-label="Mover arriba"
            onClick={() => queueDirection({ x: 0, y: -1 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span aria-hidden="true" />
          <button
            type="button"
            aria-label="Mover izquierda"
            onClick={() => queueDirection({ x: -1, y: 0 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover abajo"
            onClick={() => queueDirection({ x: 0, y: 1 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover derecha"
            onClick={() => queueDirection({ x: 1, y: 0 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function GameOverScreen({ score, highScore, beatRecord }) {
  return (
    <>
      <h4 className="arcade-success-title text-sm">GAME OVER</h4>
      <p className="arcade-meta-label">
        Puntos: <span style={{ color: ACCENT }}>{score}</span> · Récord:{' '}
        <span style={{ color: '#ffd319' }}>{Math.max(highScore, score)}</span>
      </p>
      {beatRecord && (
        <p className="arcade-meta-label" style={{ color: '#ffd319' }}>
          ¡Nuevo récord guardado!
        </p>
      )}
    </>
  )
}

export default RetroSnake
