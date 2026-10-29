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
const APPLE_GOAL = 5
const MAX_PENDING = 3
const OBSTACLE_MIN_DISTANCE = 5

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

function createInitialSnake() {
  return [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ]
}

function randomApple(excluded) {
  for (let tries = 0; tries < GRID_SIZE * GRID_SIZE * 4; tries += 1) {
    const cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    if (
      !excluded.some((part) => part.x === cell.x && part.y === cell.y)
    ) {
      return cell
    }
  }
  return null
}

function generateObstacles(snake, level) {
  const count = Math.min(level + 2, 9)
  const head = snake[0]
  const obstacles = []

  for (let guard = 0; guard < count * 40 && obstacles.length < count; guard += 1) {
    const cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    const sameRowAsSpawn = cell.y === head.y
    const tooClose =
      Math.abs(cell.x - head.x) + Math.abs(cell.y - head.y) <
      OBSTACLE_MIN_DISTANCE
    const duplicate = obstacles.some(
      (other) => other.x === cell.x && other.y === cell.y,
    )
    if (!sameRowAsSpawn && !tooClose && !duplicate) {
      obstacles.push(cell)
    }
  }

  return obstacles
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
  const hitsObstacle = current.obstacles.some(
    (cell) => cell.x === target.x && cell.y === target.y,
  )

  if (hitsWall || bitesTail || hitsObstacle) {
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
  const applesEaten = current.applesEaten + 1
  const score = current.score + POINTS_PER_APPLE

  if (applesEaten >= APPLE_GOAL) {
    return {
      ...current,
      direction,
      pending,
      snake: grown,
      apple: null,
      applesEaten,
      score,
      status: 'levelup',
    }
  }

  return {
    ...current,
    direction,
    pending,
    snake: grown,
    apple: randomApple([...grown, ...current.obstacles]),
    applesEaten,
    score,
  }
}

function createSnakeGame(highScore) {
  const snake = createInitialSnake()
  return {
    snake,
    apple: randomApple(snake) ?? { x: 3, y: 3 },
    obstacles: [],
    direction: RIGHT,
    pending: [],
    level: 1,
    applesEaten: 0,
    score: 0,
    highScore,
    status: 'running',
  }
}

function createLevelState(previous) {
  const snake = createInitialSnake()
  const obstacles = generateObstacles(snake, previous.level + 1)
  return {
    snake,
    apple: randomApple([...snake, ...obstacles]) ?? { x: 2, y: 2 },
    obstacles,
    direction: RIGHT,
    pending: [],
    level: previous.level + 1,
    applesEaten: 0,
    score: previous.score,
    highScore: previous.highScore,
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

function BoardCell({ x, y, snake, apple, obstacleSet }) {
  const snakeIndex = snake.findIndex(
    (part) => part.x === x && part.y === y,
  )
  const isHead = snakeIndex === 0
  const isApple = Boolean(apple) && apple.x === x && apple.y === y
  const isObstacle = obstacleSet.has(`${x},${y}`)

  return (
    <div
      className="relative"
      style={{
        border: isObstacle
          ? '1px solid rgba(255, 46, 136, 0.6)'
          : '1px solid rgba(138, 43, 226, 0.16)',
        background: isObstacle
          ? '#8a2be2'
          : snakeIndex >= 0
            ? `${ACCENT}${isHead ? '' : '88'}`
            : 'rgba(7, 3, 15, 0.6)',
        boxShadow: isObstacle
          ? 'inset 0 0 8px #07030f'
          : snakeIndex >= 0
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
}

function RetroSnake({ onScore }) {
  const [game, setGame] = useState(() => ({
    ...createSnakeGame(readHighScore('retro-snake')),
    status: 'idle',
  }))
  const { snake, apple, score, highScore, status, level, applesEaten } = game
  const beatRecord = status === 'over' && score > 0 && score >= highScore
  const lastSavedScoreRef = useRef(highScore)
  const gameRef = useRef(game)
  const obstacleSet = new Set(
    game.obstacles.map((cell) => `${cell.x},${cell.y}`),
  )

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

  useEffect(() => {
    if (status !== 'levelup') {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setGame(createLevelState)
    }, 1300)
    return () => window.clearTimeout(timer)
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
      const canStart =
        (event.key === 'Enter' || event.key === ' ') &&
        (current.status === 'idle' || current.status === 'over')
      if (canStart) {
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
        <p className="arcade-meta-label flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Puntos: <span style={{ color: ACCENT }}>{score}</span>
          </span>
          <span>
            Fase: <span style={{ color: '#ffd319' }}>{level}</span>
          </span>
          <span>
            Manzanas:{' '}
            <span style={{ color: ACCENT }}>
              {applesEaten}/{APPLE_GOAL}
            </span>
          </span>
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
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => (
            <BoardCell
              key={index}
              x={index % GRID_SIZE}
              y={Math.floor(index / GRID_SIZE)}
              snake={snake}
              apple={apple}
              obstacleSet={obstacleSet}
            />
          ))}
        </div>

        {status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {status === 'idle' && (
              <>
                <p className="arcade-subtitle">RETRO SNAKE</p>
                <p className="arcade-hint">
                  W A S D o FLECHAS · come {APPLE_GOAL} manzanas por fase
                </p>
              </>
            )}
            {status === 'levelup' && (
              <>
                <h4 className="arcade-success-title text-sm">
                  FASE {level} SUPERADA
                </h4>
                <p className="arcade-hint">
                  Generando obstáculos para la fase {level + 1}...
                </p>
              </>
            )}
            {status === 'over' && (
              <GameOverScreen
                score={score}
                highScore={highScore}
                beatRecord={beatRecord}
              />
            )}
            {(status === 'idle' || status === 'over') && (
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
            )}
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
