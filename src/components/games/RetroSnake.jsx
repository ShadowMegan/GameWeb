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
const MAX_PENDING = 3

const UP = { x: 0, y: -1 }
const DOWN = { x: 0, y: 1 }
const LEFT = { x: -1, y: 0 }
const RIGHT = { x: 1, y: 0 }

const DIRECTION_BY_KEY = {
  arrowup: UP,
  w: UP,
  arrowdown: DOWN,
  s: DOWN,
  arrowleft: LEFT,
  a: LEFT,
  arrowright: RIGHT,
  d: RIGHT,
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
  let direction = current.direction
  let pending = current.pending

  while (pending.length > 0) {
    const [next, ...rest] = pending
    pending = rest
    const isReverse = next.x === -direction.x && next.y === -direction.y
    const isSame = next.x === direction.x && next.y === direction.y
    if (!isReverse && !isSame) {
      direction = next
      break
    }
  }

  const head = current.snake[0]
  const target = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  }

  const hitsWall =
    target.x < 0 ||
    target.y < 0 ||
    target.x >= GRID_SIZE ||
    target.y >= GRID_SIZE
  const bitesTail = current.snake
    .slice(0, -1)
    .some((part) => part.x === target.x && part.y === target.y)

  if (hitsWall || bitesTail) {
    return {
      ...current,
      direction,
      pending,
      highScore: Math.max(current.highScore, current.score),
      status: 'over',
    }
  }

  const eatsApple =
    Boolean(current.apple) &&
    target.x === current.apple.x &&
    target.y === current.apple.y

  if (!eatsApple) {
    return {
      ...current,
      direction,
      pending,
      snake: [target, ...current.snake.slice(0, -1)],
    }
  }

  const grown = [target, ...current.snake]
  return {
    ...current,
    direction,
    pending,
    snake: grown,
    apple: randomApple(grown),
    score: current.score + POINTS_PER_APPLE,
  }
}

function createSnakeGame(highScore) {
  const snake = [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ]
  return {
    snake,
    apple: randomApple(snake) ?? { x: 3, y: 3 },
    direction: RIGHT,
    pending: [],
    score: 0,
    highScore,
    status: 'running',
  }
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

function RetroSnake({ onScore }) {
  const [game, setGame] = useState(() => ({
    ...createSnakeGame(readHighScore('retro-snake')),
    status: 'idle',
  }))
  const { snake, apple, score, highScore, status } = game
  const beatRecord = status === 'over' && score > 0 && score >= highScore
  const lastSavedScoreRef = useRef(highScore)
  const gameRef = useRef(game)

  useEffect(() => {
    gameRef.current = game
  })

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
      setGame(stepSnake)
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [status])

  function queueDirection(next) {
    setGame((current) => {
      if (current.status !== 'running') {
        return current
      }
      const last = current.pending.length
        ? current.pending[current.pending.length - 1]
        : current.direction
      const isReverse = next.x === -last.x && next.y === -last.y
      const isSame = next.x === last.x && next.y === last.y
      if (isReverse || isSame || current.pending.length >= MAX_PENDING) {
        return current
      }
      return { ...current, pending: [...current.pending, next] }
    })
  }

  function startGame() {
    setGame(createSnakeGame(gameRef.current.highScore))
  }

  useEffect(() => {
    function handleKey(event) {
      const current = gameRef.current
      const direction = DIRECTION_BY_KEY[event.key.toLowerCase()]
      if (direction) {
        event.preventDefault()
        if (current.status === 'running') {
          queueDirection(direction)
        }
        return
      }
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        current.status !== 'running'
      ) {
        event.preventDefault()
        startGame()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

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
        className="relative mx-auto aspect-square w-full max-w-md"
        style={{
          border: `2px solid ${ACCENT}`,
          boxShadow: `0 0 14px ${ACCENT}55, inset 0 0 22px rgba(18, 0, 43, 0.7)`,
        }}
      >
        <div
          className="grid h-full w-full"
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
              />
            )}
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.blur()
                startGame()
              }}
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
            onClick={() => queueDirection(UP)}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span aria-hidden="true" />
          <button
            type="button"
            aria-label="Mover izquierda"
            onClick={() => queueDirection(LEFT)}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover abajo"
            onClick={() => queueDirection(DOWN)}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover derecha"
            onClick={() => queueDirection(RIGHT)}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default RetroSnake
