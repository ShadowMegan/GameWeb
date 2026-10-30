import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Trophy } from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'

const GAME_ID = 'pong'
const ACCENT = '#00e5ff'
const PLAYER_COLOR = '#00e5ff'
const BOT_COLOR = '#ff2e88'
const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 440
const PADDLE_WIDTH = 12
const PADDLE_HEIGHT = 88
const PADDLE_MARGIN = 26
const BALL_RADIUS = 8
const PLAYER_SPEED = 460
const BOT_SPEED = 330
const BALL_BASE_SPEED = 360
const BALL_MAX_SPEED = 660
const WIN_SCORE = 7
const SERVE_DELAY = 0.75
const MAX_BOUNCE_ANGLE = Math.PI / 3.4

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function createGame() {
  return {
    status: 'idle',
    ball: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      speed: BALL_BASE_SPEED,
    },
    playerY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
    botY: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
    playerScore: 0,
    botScore: 0,
    serveTimer: 0,
    serveDirection: Math.random() < 0.5 ? -1 : 1,
  }
}

function launchBall(game) {
  const angle = (Math.random() * 0.7 - 0.35)
  game.ball.x = CANVAS_WIDTH / 2
  game.ball.y = CANVAS_HEIGHT / 2
  game.ball.speed = BALL_BASE_SPEED
  game.ball.vx =
    Math.cos(angle) * game.ball.speed * game.serveDirection
  game.ball.vy = Math.sin(angle) * game.ball.speed
  game.serveTimer = 0
}

function queueServe(game, direction) {
  game.ball.x = CANVAS_WIDTH / 2
  game.ball.y = CANVAS_HEIGHT / 2
  game.ball.vx = 0
  game.ball.vy = 0
  game.ball.speed = BALL_BASE_SPEED
  game.serveDirection = direction
  game.serveTimer = SERVE_DELAY
}

function bounceOffPaddle(game, paddleY, direction) {
  const ball = game.ball
  const relative = clamp(
    (ball.y - (paddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2),
    -1,
    1,
  )
  const speed = Math.min(ball.speed * 1.06, BALL_MAX_SPEED)
  const angle = relative * MAX_BOUNCE_ANGLE

  ball.speed = speed
  ball.vx = Math.cos(angle) * speed * direction
  ball.vy = Math.sin(angle) * speed
}

function updateGame(game, dt, keys) {
  if (game.status !== 'running') {
    return
  }

  if (keys.up) {
    game.playerY -= PLAYER_SPEED * dt
  }
  if (keys.down) {
    game.playerY += PLAYER_SPEED * dt
  }
  game.playerY = clamp(
    game.playerY,
    0,
    CANVAS_HEIGHT - PADDLE_HEIGHT,
  )

  const ball = game.ball
  const botCenter = game.botY + PADDLE_HEIGHT / 2
  const botTracksBall = ball.vx > 0 && ball.x > CANVAS_WIDTH * 0.28

  if (botTracksBall) {
    const difference = ball.y - botCenter
    if (Math.abs(difference) > 5) {
      const movement = Math.min(
        Math.abs(difference),
        BOT_SPEED * dt,
      )
      game.botY = clamp(
        game.botY + Math.sign(difference) * movement,
        0,
        CANVAS_HEIGHT - PADDLE_HEIGHT,
      )
    }
  }

  if (game.serveTimer > 0) {
    game.serveTimer -= dt
    if (game.serveTimer <= 0) {
      launchBall(game)
    }
    return
  }

  const previousX = ball.x
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.y - BALL_RADIUS < 0) {
    ball.y = BALL_RADIUS
    ball.vy = Math.abs(ball.vy)
  } else if (ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
    ball.y = CANVAS_HEIGHT - BALL_RADIUS
    ball.vy = -Math.abs(ball.vy)
  }

  const playerRight = PADDLE_MARGIN + PADDLE_WIDTH
  const botLeft = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH

  if (
    ball.vx < 0 &&
    (ball.x - BALL_RADIUS <= playerRight ||
      previousX - BALL_RADIUS <= playerRight) &&
    (ball.x + BALL_RADIUS >= PADDLE_MARGIN ||
      previousX + BALL_RADIUS >= PADDLE_MARGIN) &&
    ball.y + BALL_RADIUS >= game.playerY &&
    ball.y - BALL_RADIUS <= game.playerY + PADDLE_HEIGHT
  ) {
    ball.x = playerRight + BALL_RADIUS
    bounceOffPaddle(game, game.playerY, 1)
  }

  if (
    ball.vx > 0 &&
    (ball.x + BALL_RADIUS >= botLeft ||
      previousX + BALL_RADIUS >= botLeft) &&
    ball.x - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_MARGIN &&
    ball.y + BALL_RADIUS >= game.botY &&
    ball.y - BALL_RADIUS <= game.botY + PADDLE_HEIGHT
  ) {
    ball.x = botLeft - BALL_RADIUS
    bounceOffPaddle(game, game.botY, -1)
  }

  if (ball.x + BALL_RADIUS < 0) {
    game.botScore += 1
  } else if (ball.x - BALL_RADIUS > CANVAS_WIDTH) {
    game.playerScore += 1
  } else {
    return
  }

  if (
    game.playerScore >= WIN_SCORE ||
    game.botScore >= WIN_SCORE
  ) {
    game.status = 'over'
    game.ball.vx = 0
    game.ball.vy = 0
    return
  }

  queueServe(
    game,
    game.playerScore > game.botScore ? 1 : -1,
  )
}

function drawPaddle(ctx, x, y, color) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillStyle = color
  ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT)
  ctx.restore()
}

function drawGame(ctx, game) {
  ctx.save()
  ctx.fillStyle = '#07030f'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  ctx.strokeStyle = 'rgba(138, 43, 226, 0.14)'
  ctx.lineWidth = 1
  for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_WIDTH, y)
    ctx.stroke()
  }

  ctx.setLineDash([12, 14])
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(CANVAS_WIDTH / 2, 0)
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.font = 'bold 58px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.save()
  ctx.shadowColor = PLAYER_COLOR
  ctx.shadowBlur = 16
  ctx.fillStyle = PLAYER_COLOR
  ctx.fillText(String(game.playerScore), CANVAS_WIDTH * 0.27, 34)
  ctx.restore()
  ctx.save()
  ctx.shadowColor = BOT_COLOR
  ctx.shadowBlur = 16
  ctx.fillStyle = BOT_COLOR
  ctx.fillText(String(game.botScore), CANVAS_WIDTH * 0.73, 34)
  ctx.restore()

  drawPaddle(ctx, PADDLE_MARGIN, game.playerY, PLAYER_COLOR)
  drawPaddle(
    ctx,
    CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
    game.botY,
    BOT_COLOR,
  )

  ctx.save()
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 20
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(game.ball.x, game.ball.y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(255, 46, 136, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 1)
  ctx.lineTo(CANVAS_WIDTH, 1)
  ctx.moveTo(0, CANVAS_HEIGHT - 1)
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 1)
  ctx.stroke()
  ctx.restore()
}

function PongGame({ userId, onScore, onStateChange }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(createGame())
  const keysRef = useRef({ up: false, down: false })
  const [status, setStatus] = useState('idle')
  const [scores, setScores] = useState({ player: 0, bot: 0 })
  const [newRecord, setNewRecord] = useState(false)
  const [highScore, setHighScore] = useState(() =>
    readHighScore(userId, GAME_ID),
  )
  const lastSavedScoreRef = useRef(highScore)

  const startGame = useCallback(() => {
    const nextGame = createGame()
    nextGame.status = 'running'
    nextGame.serveTimer = SERVE_DELAY
    nextGame.serveDirection = Math.random() < 0.5 ? -1 : 1
    gameRef.current = nextGame
    setScores({ player: 0, bot: 0 })
    setNewRecord(false)
    setStatus('running')
  }, [])

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

    let frameId = 0
    let lastTime = window.performance.now()

    function frame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const game = gameRef.current
      const previousStatus = game.status
      const previousPlayerScore = game.playerScore
      const previousBotScore = game.botScore

      updateGame(game, dt, keysRef.current)
      drawGame(context, game)

      if (
        game.playerScore !== previousPlayerScore ||
        game.botScore !== previousBotScore
      ) {
        setScores({ player: game.playerScore, bot: game.botScore })
      }
      if (game.status !== previousStatus) {
        setStatus(game.status)
      }

      frameId = window.requestAnimationFrame(frame)
    }

    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (scores.player > 0) {
      onScore?.(scores.player)
    }
  }, [scores.player, onScore])

  useEffect(() => {
    onStateChange?.({ status, score: scores.player, level: 1 })
  }, [status, scores.player, onStateChange])

  useEffect(() => {
    if (status !== 'over' || scores.player <= 0) {
      return
    }
    if (scores.player > lastSavedScoreRef.current) {
      lastSavedScoreRef.current = scores.player
      saveHighScore(userId, GAME_ID, scores.player)
      setHighScore(scores.player)
      setNewRecord(true)
    }
  }, [status, scores.player, userId])

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase()
      if (key === 'arrowup' || key === 'w') {
        event.preventDefault()
        keysRef.current.up = true
        return
      }
      if (key === 'arrowdown' || key === 's') {
        event.preventDefault()
        keysRef.current.down = true
        return
      }
      if (key === ' ' || key === 'enter') {
        const currentStatus = gameRef.current.status
        if (currentStatus === 'idle' || currentStatus === 'over') {
          event.preventDefault()
          startGame()
        }
      }
    }

    function handleKeyUp(event) {
      const key = event.key.toLowerCase()
      if (key === 'arrowup' || key === 'w') {
        keysRef.current.up = false
      }
      if (key === 'arrowdown' || key === 's') {
        keysRef.current.down = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [startGame])

  function handlePointerMove(event) {
    if (gameRef.current.status !== 'running') {
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.height) {
      return
    }
    const pointerY =
      ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
    gameRef.current.playerY = clamp(
      pointerY - PADDLE_HEIGHT / 2,
      0,
      CANVAS_HEIGHT - PADDLE_HEIGHT,
    )
  }

  function setTouchDirection(direction, pressed) {
    const key = direction === 'up' ? 'up' : 'down'
    keysRef.current[key] = pressed
  }

  const playerWon = scores.player > scores.bot

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="arcade-meta-label flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Jugador:{' '}
            <span style={{ color: PLAYER_COLOR }}>{scores.player}</span>
          </span>
          <span>
            Bot: <span style={{ color: BOT_COLOR }}>{scores.bot}</span>
          </span>
          <span>
            Primero a{' '}
            <span style={{ color: '#ffd319' }}>{WIN_SCORE}</span>
          </span>
        </p>
        <p className="arcade-meta-label flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Récord:{' '}
          <span style={{ color: '#ffd319' }}>{highScore}</span>
        </p>
      </div>

      <div
        className="relative mx-auto w-full max-w-2xl overflow-hidden"
        style={{
          border: `2px solid ${ACCENT}`,
          boxShadow: `0 0 16px ${ACCENT}55, inset 0 0 24px rgba(18, 0, 43, 0.7)`,
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          role="img"
          aria-label="Mesa de Pong con paleta del jugador a la izquierda y bot a la derecha"
          className="block h-auto w-full"
          style={{ touchAction: 'none', background: '#07030f' }}
        />

        {status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {status === 'idle' && (
              <>
                <p className="arcade-subtitle">NEON PONG</p>
                <p className="arcade-hint max-w-sm">
                  Mueve tu paleta con W / S, las flechas o arrastrando sobre la
                  mesa. Gana el primero en llegar a {WIN_SCORE} puntos.
                </p>
              </>
            )}
            {status === 'over' && (
              <>
                <h4 className="arcade-success-title text-sm">
                  {playerWon ? '¡GANASTE!' : 'GAME OVER'}
                </h4>
                <p className="arcade-meta-label">
                  Jugador:{' '}
                  <span style={{ color: PLAYER_COLOR }}>{scores.player}</span>{' '}
                  · Bot:{' '}
                  <span style={{ color: BOT_COLOR }}>{scores.bot}</span>
                </p>
                <p className="arcade-meta-label">
                  Récord:{' '}
                  <span style={{ color: '#ffd319' }}>
                    {Math.max(highScore, scores.player)}
                  </span>
                </p>
                {newRecord && (
                  <p
                    className="arcade-meta-label"
                    style={{ color: '#ffd319' }}
                  >
                    ¡Nuevo récord guardado!
                  </p>
                )}
              </>
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
        <div className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 sm:hidden">
          <button
            type="button"
            aria-label="Mover paleta hacia arriba"
            onPointerDown={() => setTouchDirection('up', true)}
            onPointerUp={() => setTouchDirection('up', false)}
            onPointerLeave={() => setTouchDirection('up', false)}
            onPointerCancel={() => setTouchDirection('up', false)}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex flex-1 justify-center"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Mover paleta hacia abajo"
            onPointerDown={() => setTouchDirection('down', true)}
            onPointerUp={() => setTouchDirection('down', false)}
            onPointerLeave={() => setTouchDirection('down', false)}
            onPointerCancel={() => setTouchDirection('down', false)}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex flex-1 justify-center"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export default PongGame
