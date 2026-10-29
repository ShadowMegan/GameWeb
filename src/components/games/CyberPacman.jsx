import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Ghost,
  RotateCcw,
  Trophy,
} from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'

const ACCENT = '#ff2e88'
const STEP_MS = 310
const CHASE_PROBABILITY = 0.45
const POINTS_PER_DOT = 10
const LEVEL_BONUS = 50
const START_LIVES = 3

const MAZE = [
  '###################',
  '#P................#',
  '#.###.###.###.###.#',
  '#.................#',
  '#.###.###.###.###.#',
  '#......G...G......#',
  '#.................#',
  '#......G...G......#',
  '#.###.###.###.###.#',
  '#.................#',
  '#.###.###.###.###.#',
  '#.................#',
  '###################',
]

const DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

const DIRECTION_BY_KEY = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
}

function parseMaze() {
  const walls = new Set()
  const dotStarts = {}
  let playerStart = { x: 1, y: 1 }
  const ghostStarts = []

  MAZE.forEach((row, y) => {
    row.split('').forEach((symbol, x) => {
      const key = `${x},${y}`
      if (symbol === '#') {
        walls.add(key)
      } else if (symbol === '.') {
        dotStarts[key] = true
      } else if (symbol === 'P') {
        playerStart = { x, y }
      } else if (symbol === 'G') {
        ghostStarts.push({
          x,
          y,
          kind: ghostStarts.length < 2 ? 'fast' : 'slow',
        })
      }
    })
  })

  return { walls, dotStarts, playerStart, ghostStarts }
}

const { walls: WALLS, dotStarts: DOT_STARTS, playerStart: PLAYER_START, ghostStarts: GHOST_STARTS } = parseMaze()

function keyFor(cell) {
  return `${cell.x},${cell.y}`
}

function cellAt(row, x) {
  return x >= 0 && x < row.length
}

function isWall(x, y) {
  return y < 0 || y >= MAZE.length || x < 0 || !cellAt(MAZE[y], x) || WALLS.has(keyFor({ x, y }))
}

function createFreshState(highScore) {
  return {
    ticks: 0,
    dots: { ...DOT_STARTS },
    player: { ...PLAYER_START },
    ghosts: GHOST_STARTS.map((ghost) => ({ ...ghost })),
    direction: { x: 0, y: 0 },
    lives: START_LIVES,
    score: 0,
    level: 1,
    highScore,
    status: 'running',
  }
}

function respawnUnits(state) {
  return {
    ...state,
    player: { ...PLAYER_START },
    ghosts: GHOST_STARTS.map((ghost) => ({ ...ghost })),
    direction: { x: 0, y: 0 },
  }
}

function moveGhost(ghost, player, chaseProbability) {
  const options = DIRECTIONS.filter(
    (direction) => !isWall(ghost.x + direction.x, ghost.y + direction.y),
  )
  if (options.length === 0) {
    return ghost
  }

  const isPatrol = ghost.kind === 'slow'
  const chases = Math.random() < chaseProbability * (isPatrol ? 0.4 : 1)
  let direction = options[Math.floor(Math.random() * options.length)]

  if (chases) {
    let bestDirection = options[0]
    let bestDistance = Infinity
    options.forEach((candidate) => {
      const distance =
        Math.abs(ghost.x + candidate.x - player.x) +
        Math.abs(ghost.y + candidate.y - player.y)
      if (distance < bestDistance) {
        bestDirection = candidate
        bestDistance = distance
      }
    })
    direction = bestDirection
  }

  return {
    ...ghost,
    x: ghost.x + direction.x,
    y: ghost.y + direction.y,
  }
}

function advancePacman(state) {
  if (state.status !== 'running') {
    return state
  }

  const ticks = (state.ticks ?? 0) + 1
  const chaseProbability = Math.min(
    0.85,
    CHASE_PROBABILITY + (state.level - 1) * 0.05,
  )
  const direction = state.direction
  let player = state.player
  const dots = { ...state.dots }

  if (!isWall(player.x + direction.x, player.y + direction.y)) {
    player = { x: player.x + direction.x, y: player.y + direction.y }
  }

  const playerKey = keyFor(player)
  let score = state.score
  if (dots[playerKey]) {
    delete dots[playerKey]
    score += POINTS_PER_DOT
  }

  const previousGhosts = state.ghosts
  let ghosts = state.ghosts.map((ghost) => {
    if (ghost.kind === 'slow' && ticks % 2 === 1) {
      return ghost
    }
    return moveGhost(ghost, player, chaseProbability)
  })

  let collided = ghosts.some(
    (ghost) => ghost.x === player.x && ghost.y === player.y,
  )
  if (!collided) {
    collided = ghosts.some((ghost, index) => {
      const previous = previousGhosts[index]
      return (
        previous.x === player.x &&
        previous.y === player.y &&
        ghost.x === state.player.x &&
        ghost.y === state.player.y
      )
    })
  }

  let lives = state.lives
  let status = state.status
  let playerState = player
  let ghostState = ghosts

  if (collided) {
    lives -= 1
    if (lives <= 0) {
      status = 'over'
    } else {
      const respawn = respawnUnits({ ...state, ghosts })
      playerState = respawn.player
      ghostState = respawn.ghosts
    }
  }

  if (status === 'running' && Object.keys(dots).length === 0) {
    const nextScore = state.score + LEVEL_BONUS
    return {
      ticks: 0,
      dots: { ...DOT_STARTS },
      player: { ...PLAYER_START },
      ghosts: GHOST_STARTS.map((ghost) => ({ ...ghost })),
      direction: { x: 0, y: 0 },
      lives,
      score: nextScore,
      level: state.level + 1,
      highScore: Math.max(state.highScore, nextScore),
      status: 'running',
    }
  }

  return {
    ...state,
    ticks,
    dots,
    player: playerState,
    ghosts: ghostState,
    direction: collided ? { x: 0, y: 0 } : state.direction,
    lives,
    score,
    highScore:
      status === 'over'
        ? Math.max(state.highScore, score)
        : state.highScore,
    status,
  }
}

function EntityLayer({ cell, cols, rows, slotX, visible, children }) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: `${((cell.x + 0.5) * 100) / cols}%`,
        top: `${((cell.y + 0.5) * 100) / rows}%`,
        width: `${100 / cols}%`,
        height: `${100 / rows}%`,
        transform: `translate(calc(-50% + ${slotX * 22}%), -50%)`,
        transition: 'left 0.22s linear, top 0.22s linear',
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>
  )
}

function LivesRow({ lives }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${lives} vidas`}>
      {Array.from({ length: START_LIVES }, (_, index) => (
        <Ghost
          key={index}
          className="h-4 w-4"
          style={{
            color: index < lives ? ACCENT : 'rgba(138, 43, 226, 0.3)',
          }}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

function CyberPacman({ onScore }) {
  const [game, setGame] = useState(() => ({
    ...createFreshState(readHighScore('cyber-pacman')),
    status: 'idle',
  }))
  const score = game.score
  const status = game.status
  const highScore = game.highScore
  const beatRecord =
    status === 'over' && score > 0 && score >= highScore
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
      saveHighScore('cyber-pacman', highScore)
    }
  }, [highScore])

  useEffect(() => {
    if (status !== 'running') {
      return undefined
    }
    const timer = window.setInterval(() => {
      setGame(advancePacman)
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [status])

  function startGame() {
    setGame(createFreshState(gameRef.current.highScore))
  }

  function setPlayerDirection(direction) {
    setGame((current) =>
      current.status === 'running' &&
      (current.direction.x !== direction.x ||
        current.direction.y !== direction.y)
        ? { ...current, direction }
        : current,
    )
  }

  useEffect(() => {
    function handleKey(event) {
      const current = gameRef.current
      const direction = DIRECTION_BY_KEY[event.key.toLowerCase()]
      if (direction) {
        event.preventDefault()
        if (current.status === 'running') {
          setPlayerDirection(direction)
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

  const ghostSlots = []
  const ghostCellCount = {}
  game.ghosts.forEach((ghost, index) => {
    const key = keyFor(ghost)
    const slot = ghostCellCount[key] ?? 0
    ghostCellCount[key] = slot + 1
    ghostSlots[index] = slot
  })

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="arcade-meta-label flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Puntos: <span style={{ color: ACCENT }}>{game.score}</span>
          </span>
          <span>
            Fase: <span style={{ color: '#ffd319' }}>{game.level}</span>
          </span>
          <span className="flex items-center gap-2">
            Vidas: <LivesRow lives={game.lives} />
          </span>
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
          className="grid"
          style={{ gridTemplateColumns: `repeat(${MAZE[0].length}, 1fr)` }}
        >
          {MAZE.map((row, y) =>
            row.split('').map((symbol, x) => {
              const hasDot =
                game.status !== 'over' && game.dots[keyFor({ x, y })]

              return (
                <div
                  key={`${x}-${y}`}
                  className="relative flex items-center justify-center"
                  style={{
                    aspectRatio: '1',
                    border:
                      symbol === '#'
                        ? '1px solid rgba(138, 43, 226, 0.6)'
                        : undefined,
                    background:
                      symbol === '#' ? '#8a2be2' : 'rgba(7, 3, 15, 0.6)',
                    boxShadow:
                      symbol === '#' ? 'inset 0 0 8px #07030f' : undefined,
                  }}
                >
                  {hasDot && (
                    <span
                      className="h-1.5 w-1.5"
                      style={{
                        borderRadius: '9999px',
                        background: '#ffd319',
                        boxShadow: '0 0 6px #ffd319',
                      }}
                    />
                  )}
                </div>
              )
            }),
          )}
        </div>

        <div className="pointer-events-none absolute inset-0">
          <EntityLayer
            cell={game.player}
            cols={MAZE[0].length}
            rows={MAZE.length}
            slotX={0}
            visible={game.status !== 'idle'}
          >
            <span
              className="block h-3 w-3"
              style={{
                borderRadius: '9999px',
                background: '#ffd319',
                boxShadow: '0 0 10px #ffd319',
              }}
            />
          </EntityLayer>
          {game.ghosts.map((ghost, index) => {
            const ghostColor =
              ghost.kind === 'slow' ? '#8a2be2' : ACCENT

            return (
              <EntityLayer
                key={`ghost-${index}`}
                cell={ghost}
                cols={MAZE[0].length}
                rows={MAZE.length}
                slotX={ghostSlots[index] ?? 0}
                visible={game.status !== 'idle'}
              >
                <Ghost
                  className="h-4 w-4"
                  style={{
                    color: ghostColor,
                    filter: `drop-shadow(0 0 6px ${ghostColor})`,
                  }}
                  aria-hidden="true"
                />
              </EntityLayer>
            )
          })}
        </div>

        {game.status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {game.status === 'idle' && (
              <>
                <p className="arcade-subtitle">CYBER PACMAN</p>
                <p className="arcade-hint">W A S D o FLECHAS para esquivar los drones</p>
              </>
            )}
            {game.status === 'over' && (
              <>
                <h4 className="arcade-success-title text-sm">GAME OVER</h4>
                <p className="arcade-meta-label">
                  Puntos: <span style={{ color: ACCENT }}>{game.score}</span> ·
                  Récord: <span style={{ color: '#ffd319' }}>{highScore}</span>
                </p>
              </>
            )}
            {beatRecord && (
              <p className="arcade-meta-label" style={{ color: '#ffd319' }}>
                ¡Nuevo récord guardado!
              </p>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.blur()
                startGame()
              }}
              className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {game.status === 'idle' ? 'INICIAR' : 'JUGAR OTRA VEZ'}
            </button>
          </div>
        )}
      </div>

      {game.status === 'running' && (
        <div className="mx-auto grid w-fit grid-cols-3 gap-1.5 sm:hidden">
          <span aria-hidden="true" />
          <button
            type="button"
            aria-label="Mover arriba"
            onClick={() => setPlayerDirection({ x: 0, y: -1 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span aria-hidden="true" />
          <button
            type="button"
            aria-label="Mover izquierda"
            onClick={() => setPlayerDirection({ x: -1, y: 0 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover abajo"
            onClick={() => setPlayerDirection({ x: 0, y: 1 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mover derecha"
            onClick={() => setPlayerDirection({ x: 1, y: 0 })}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default CyberPacman
