import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'
import { GamePauseButton, GamePauseOverlay } from './GamePauseControls.jsx'
import { useGamePause } from './useGamePause.js'

const GAME_ID = 'neon-flappy'
const ACCENT = '#00ffa3'
const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 440
const FLOOR_Y = 408
const BIRD_X = 150
const BIRD_RADIUS = 14
const GRAVITY = 980
const FLAP_VELOCITY = -390
const PIPE_WIDTH = 78
const PIPE_GAP = 150
const PIPE_SPACING = 250
const START_SPEED = 150
const MAX_SPEED = 205

function createPipe(x) {
  const gapTop = 74 + Math.random() * (FLOOR_Y - PIPE_GAP - 148)
  return { x, gapTop, gapBottom: gapTop + PIPE_GAP, scored: false }
}

function createGame(highScore) {
  return {
    status: 'idle',
    birdY: CANVAS_HEIGHT * 0.45,
    birdVelocity: 0,
    pipes: [createPipe(520), createPipe(520 + PIPE_SPACING), createPipe(520 + PIPE_SPACING * 2)],
    score: 0,
    highScore,
  }
}

function getObstacleSpeed(score) {
  return Math.min(MAX_SPEED, START_SPEED + Math.floor(score / 15) * 2.5)
}

function circleRectCollision(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width))
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy < radius * radius
}

function updateGame(game, dt) {
  if (game.status !== 'running') {
    return
  }

  game.birdVelocity += GRAVITY * dt
  game.birdY += game.birdVelocity * dt
  const speed = getObstacleSpeed(game.score)

  game.pipes.forEach((pipe) => {
    pipe.x -= speed * dt
  })

  const rightEdge = Math.max(...game.pipes.map((pipe) => pipe.x + PIPE_WIDTH))
  if (rightEdge < CANVAS_WIDTH - PIPE_SPACING) {
    const farthest = Math.max(...game.pipes.map((pipe) => pipe.x))
    game.pipes.push(createPipe(farthest + PIPE_SPACING))
  }
  game.pipes = game.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -20)

  let collision =
    game.birdY - BIRD_RADIUS <= 0 ||
    game.birdY + BIRD_RADIUS >= FLOOR_Y

  for (const pipe of game.pipes) {
    const top = { x: pipe.x, y: 0, width: PIPE_WIDTH, height: pipe.gapTop }
    const bottom = {
      x: pipe.x,
      y: pipe.gapBottom,
      width: PIPE_WIDTH,
      height: FLOOR_Y - pipe.gapBottom,
    }
    if (
      circleRectCollision(BIRD_X, game.birdY, BIRD_RADIUS, top) ||
      circleRectCollision(BIRD_X, game.birdY, BIRD_RADIUS, bottom)
    ) {
      collision = true
    }
    if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
      pipe.scored = true
      game.score += 15
      game.highScore = Math.max(game.highScore, game.score)
    }
  }

  if (collision) {
    game.status = 'over'
    game.birdVelocity = 0
  }
}

function drawPipe(ctx, pipe) {
  ctx.save()
  ctx.shadowColor = '#00ffa3'
  ctx.shadowBlur = 18
  ctx.fillStyle = '#11372f'
  ctx.strokeStyle = '#00ffa3'
  ctx.lineWidth = 4
  ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapTop)
  ctx.strokeRect(pipe.x, -2, PIPE_WIDTH, pipe.gapTop + 2)
  ctx.fillRect(pipe.x, pipe.gapBottom, PIPE_WIDTH, FLOOR_Y - pipe.gapBottom)
  ctx.strokeRect(pipe.x, pipe.gapBottom, PIPE_WIDTH, FLOOR_Y - pipe.gapBottom)
  ctx.restore()
}

function drawGame(ctx, game) {
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y)
  sky.addColorStop(0, '#17002f')
  sky.addColorStop(1, '#07152d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.save()
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.08)'
  ctx.lineWidth = 1
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, FLOOR_Y)
    ctx.stroke()
  }
  for (let y = 0; y < FLOOR_Y; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_WIDTH, y)
    ctx.stroke()
  }
  ctx.restore()

  game.pipes.forEach((pipe) => drawPipe(ctx, pipe))

  ctx.save()
  ctx.translate(BIRD_X, game.birdY)
  ctx.rotate(Math.max(-0.45, Math.min(0.75, game.birdVelocity / 600)))
  ctx.shadowColor = '#00e5ff'
  ctx.shadowBlur = 18
  ctx.fillStyle = '#00e5ff'
  ctx.beginPath()
  ctx.moveTo(16, 0)
  ctx.lineTo(-12, -11)
  ctx.lineTo(-7, 11)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#12002b'
  ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_Y)
  ctx.strokeStyle = '#00ffa3'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, FLOOR_Y)
  ctx.lineTo(CANVAS_WIDTH, FLOOR_Y)
  ctx.stroke()
}

function NeonFlappy({ userId, onScore, onStateChange, pauseRequested = false }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(createGame(readHighScore(userId, GAME_ID)))
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [highScore, setHighScore] = useState(() =>
    readHighScore(userId, GAME_ID),
  )
  const lastSavedScoreRef = useRef(highScore)
  const { isPaused, pausedRef, togglePause } = useGamePause(
    status === 'running',
    pauseRequested,
  )

  const startGame = useCallback(() => {
    const nextGame = createGame(gameRef.current.highScore)
    nextGame.status = 'running'
    nextGame.birdVelocity = FLAP_VELOCITY
    gameRef.current = nextGame
    setScore(0)
    setNewRecord(false)
    setStatus('running')
  }, [])

  const flap = useCallback(() => {
    if (pausedRef.current) {
      return
    }
    const game = gameRef.current
    if (game.status === 'running') {
      game.birdVelocity = FLAP_VELOCITY
    }
  }, [pausedRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }
    const context = canvas.getContext('2d')
    if (!context) {
      return undefined
    }
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = CANVAS_WIDTH * pixelRatio
    canvas.height = CANVAS_HEIGHT * pixelRatio
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    drawGame(context, gameRef.current)
    if (status !== 'running' || isPaused) {
      return undefined
    }

    let frameId = 0
    let lastTime = window.performance.now()
    function frame(now) {
      if (pausedRef.current) {
        return
      }
      const dt = Math.min((now - lastTime) / 1000, 0.035)
      lastTime = now
      const game = gameRef.current
      const previousScore = game.score
      const previousStatus = game.status
      updateGame(game, dt)
      drawGame(context, game)
      if (game.score !== previousScore) {
        setScore(game.score)
        onScore?.(game.score)
      }
      if (game.status !== previousStatus) {
        setStatus(game.status)
      }
      frameId = window.requestAnimationFrame(frame)
    }
    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [status, isPaused, onScore, pausedRef])

  useEffect(() => {
    onStateChange?.({
      status: isPaused ? 'paused' : status,
      score,
      level: Math.max(1, 1 + Math.floor(score / 10)),
    })
  }, [isPaused, status, score, onStateChange])

  useEffect(() => {
    if (status !== 'over' || score <= 0) {
      return
    }
    if (score > lastSavedScoreRef.current) {
      lastSavedScoreRef.current = score
      saveHighScore(userId, GAME_ID, score)
      setHighScore(score)
      setNewRecord(true)
    }
  }, [status, score, userId])

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        isPaused ||
        event.repeat ||
        event.key === 'Escape' ||
        event.key.toLowerCase() === 'p'
      ) {
        return
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        if (gameRef.current.status === 'running') {
          flap()
        } else {
          startGame()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flap, isPaused, startGame])

  function handlePointerDown() {
    if (gameRef.current.status === 'running') {
      flap()
    } else {
      startGame()
    }
  }

  const beatRecord = newRecord

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="arcade-meta-label flex flex-wrap items-center gap-x-4">
          <span>Puntos: <span style={{ color: ACCENT }}>{score}</span></span>
          <span>Criterio: <span style={{ color: '#ffd319' }}>+15 por tubería</span></span>
          <span>Velocidad: <span style={{ color: ACCENT }}>{getObstacleSpeed(score)} px/s</span></span>
        </p>
        <div className="flex items-center gap-2">
          <p className="arcade-meta-label flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Récord:{' '}
            <span style={{ color: '#ffd319' }}>{highScore}</span>
          </p>
          {status === 'running' && (
            <GamePauseButton isPaused={isPaused} onToggle={togglePause} />
          )}
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-2xl overflow-hidden"
        onPointerDown={handlePointerDown}
        style={{
          border: `2px solid ${ACCENT}`,
          boxShadow: `0 0 16px ${ACCENT}55, inset 0 0 24px rgba(18, 0, 43, 0.7)`,
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Dron neón esquivando tuberías luminosas"
          className="block h-auto w-full"
          style={{ background: '#17002f' }}
        />

        {status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {status === 'idle' && (
              <>
                <p className="arcade-subtitle">NEON FLAPPY</p>
                <p className="arcade-hint max-w-sm">
                  Presiona ESPACIO, clic izquierdo o toca para impulsarte.
                  Supera tuberías y suma 15 puntos por cada hueco.
                </p>
              </>
            )}
            {status === 'over' && (
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
            )}
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                event.currentTarget.blur()
                startGame()
              }}
              className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {status === 'idle' ? 'INICIAR' : 'JUGAR OTRA VEZ'}
            </button>
          </div>
        )}
        {isPaused && <GamePauseOverlay onResume={togglePause} />}
      </div>

      <p className="arcade-hint text-center">
        ESPACIO, clic izquierdo o toque: impulso · Esquiva las tuberías · 15 puntos por obstáculo
      </p>
    </div>
  )
}

export default NeonFlappy
