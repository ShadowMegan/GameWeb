import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'
import { GamePauseButton, GamePauseOverlay } from './GamePauseControls.jsx'
import { useGamePause } from './useGamePause.js'

const GAME_ID = 'neon-doom'
const ACCENT = '#ff3b30'
const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 440
const FOV = Math.PI / 3
const MOVE_SPEED = 2.15
const TURN_SPEED = 1.9

const MAP = [
  '111111111111',
  '100000000001',
  '101111011101',
  '100000010001',
  '101101110101',
  '100100000101',
  '111101111101',
  '100000000001',
  '101111011101',
  '100000010001',
  '100000000001',
  '111111111111',
]

function isWall(x, y) {
  const mapX = Math.floor(x)
  const mapY = Math.floor(y)
  return (
    mapY < 0 ||
    mapY >= MAP.length ||
    mapX < 0 ||
    mapX >= MAP[0].length ||
    MAP[mapY][mapX] === '1'
  )
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

function angleDifference(a, b) {
  return normalizeAngle(a - b)
}

function castRay(originX, originY, angle) {
  let distance = 0
  const step = 0.025
  let hitX = originX
  let hitY = originY
  while (distance < 30) {
    hitX = originX + Math.cos(angle) * distance
    hitY = originY + Math.sin(angle) * distance
    if (isWall(hitX, hitY)) break
    distance += step
  }
  const mapX = Math.floor(hitX)
  const mapY = Math.floor(hitY)
  const side =
    Math.abs(hitX - (mapX + 0.5)) > Math.abs(hitY - (mapY + 0.5))
      ? 'x'
      : 'y'
  return { distance, side, mapX, mapY }
}

function createEnemies(wave) {
  const positions = [
    [10, 1], [9, 9], [2, 9], [9, 3], [2, 3],
    [6, 9], [6, 2], [4, 7], [8, 7], [3, 5],
  ]
  const count = Math.min(12, 3 + wave * 2)
  return positions.slice(0, count).map(([x, y], index) => ({
    id: `${wave}-${index}-${Math.random()}`,
    x: x + 0.5,
    y: y + 0.5,
    health: 100,
    attackTimer: Math.random(),
    patrolAngle: Math.random() * Math.PI * 2,
    flash: 0,
  }))
}

function createGame(highScore) {
  return {
    status: 'idle',
    player: { x: 1.5, y: 1.5, angle: 0 },
    enemies: createEnemies(1),
    pickups: [],
    health: 100,
    ammo: 24,
    score: 0,
    wave: 1,
    highScore,
    firing: 0,
    transitionTimer: 0,
    hitMarker: 0,
  }
}

function findAimTarget(game) {
  let target = null
  let bestAngle = 0.075
  for (const enemy of game.enemies) {
    if (enemy.health <= 0) continue
    const dx = enemy.x - game.player.x
    const dy = enemy.y - game.player.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const enemyAngle = Math.atan2(dy, dx)
    const difference = Math.abs(angleDifference(enemyAngle, game.player.angle))
    if (
      difference < bestAngle &&
      distance < 8 &&
      hasLineOfSight(game.player.x, game.player.y, enemy.x, enemy.y)
    ) {
      target = enemy
      bestAngle = difference
    }
  }
  return target
}

function hasLineOfSight(fromX, fromY, toX, toY) {
  const dx = toX - fromX
  const dy = toY - fromY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.ceil(distance / 0.08)
  for (let index = 1; index < steps; index += 1) {
    const ratio = index / steps
    if (isWall(fromX + dx * ratio, fromY + dy * ratio)) return false
  }
  return true
}

function tryMove(game, dx, dy) {
  const nextX = game.player.x + dx
  const nextY = game.player.y + dy
  if (!isWall(nextX, game.player.y)) game.player.x = nextX
  if (!isWall(game.player.x, nextY)) game.player.y = nextY
}

function updateGame(game, dt, keys) {
  if (game.status !== 'running') return
  const player = game.player

  if (keys.left) player.angle -= TURN_SPEED * dt
  if (keys.right) player.angle += TURN_SPEED * dt
  player.angle = normalizeAngle(player.angle)

  let forward = 0
  let strafe = 0
  if (keys.w || keys.up) forward += 1
  if (keys.s || keys.down) forward -= 1
  if (keys.a) strafe -= 1
  if (keys.d) strafe += 1

  if (forward !== 0) {
    tryMove(
      game,
      Math.cos(player.angle) * forward * MOVE_SPEED * dt,
      Math.sin(player.angle) * forward * MOVE_SPEED * dt,
    )
  }
  if (strafe !== 0) {
    const strafeAngle = player.angle + Math.PI / 2
    tryMove(
      game,
      Math.cos(strafeAngle) * strafe * MOVE_SPEED * dt,
      Math.sin(strafeAngle) * strafe * MOVE_SPEED * dt,
    )
  }

  game.firing = Math.max(0, game.firing - dt)
  game.hitMarker = Math.max(0, game.hitMarker - dt)

  for (const enemy of game.enemies) {
    if (enemy.health <= 0) continue
    enemy.flash = Math.max(0, enemy.flash - dt)
    enemy.attackTimer -= dt
    const dx = player.x - enemy.x
    const dy = player.y - enemy.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const hasSight = hasLineOfSight(enemy.x, enemy.y, player.x, player.y)

    if (hasSight && distance > 0.75) {
      const speed = 0.48 + game.wave * 0.045
      const moveX = (dx / distance) * speed * dt
      const moveY = (dy / distance) * speed * dt
      if (!isWall(enemy.x + moveX, enemy.y)) enemy.x += moveX
      if (!isWall(enemy.x, enemy.y + moveY)) enemy.y += moveY
    } else if (!hasSight) {
      enemy.patrolAngle += dt * 0.45
      const moveX = Math.cos(enemy.patrolAngle) * 0.16 * dt
      const moveY = Math.sin(enemy.patrolAngle) * 0.16 * dt
      if (!isWall(enemy.x + moveX, enemy.y)) enemy.x += moveX
      if (!isWall(enemy.x, enemy.y + moveY)) enemy.y += moveY
    }

    if (hasSight && distance < 1.05 && enemy.attackTimer <= 0) {
      game.health = Math.max(0, game.health - (7 + Math.min(5, game.wave)))
      enemy.attackTimer = Math.max(0.48, 1.05 - game.wave * 0.04)
      if (game.health <= 0) {
        game.status = 'over'
        game.firing = 0
      }
    }
  }

  game.pickups = game.pickups.filter((pickup) => {
    const distance = Math.hypot(player.x - pickup.x, player.y - pickup.y)
    if (distance >= 0.55) return true
    if (pickup.type === 'health') game.health = Math.min(100, game.health + 25)
    if (pickup.type === 'ammo') game.ammo = Math.min(60, game.ammo + 12)
    return false
  })

  const remaining = game.enemies.filter((enemy) => enemy.health > 0)
  if (remaining.length === 0 && game.status === 'running') {
    game.transitionTimer += dt
    if (game.transitionTimer >= 1.7) {
      game.wave += 1
      game.transitionTimer = 0
      game.ammo = Math.min(60, game.ammo + 8)
      game.enemies = createEnemies(game.wave)
      game.pickups = []
    }
  } else {
    game.transitionTimer = 0
  }
}

function fireWeapon(game) {
  if (game.status !== 'running' || game.ammo <= 0) return
  game.ammo -= 1
  game.firing = 0.12
  const target = findAimTarget(game)

  if (target) {
    game.hitMarker = 0.14
    target.health -= 34
    target.flash = 0.16
    if (target.health <= 0) {
      game.score += 100
      game.highScore = Math.max(game.highScore, game.score)
      const roll = Math.random()
      if (roll < 0.28) {
        game.pickups.push({
          x: target.x,
          y: target.y,
          type: roll < 0.14 ? 'health' : 'ammo',
        })
      }
    }
  }
}

function drawCrosshair(ctx, game) {
  if (game.status !== 'running') return

  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const onTarget = Boolean(findAimTarget(game))
  const color = onTarget ? '#ff2e88' : '#00e5ff'

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(5, 1, 10, 0.92)'
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(-13, 0)
  ctx.lineTo(-5, 0)
  ctx.moveTo(5, 0)
  ctx.lineTo(13, 0)
  ctx.moveTo(0, -13)
  ctx.lineTo(0, -5)
  ctx.moveTo(0, 5)
  ctx.lineTo(0, 13)
  ctx.stroke()

  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(-12, 0)
  ctx.lineTo(-5, 0)
  ctx.moveTo(5, 0)
  ctx.lineTo(12, 0)
  ctx.moveTo(0, -12)
  ctx.lineTo(0, -5)
  ctx.moveTo(0, 5)
  ctx.lineTo(0, 12)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
  ctx.fill()

  if (game.hitMarker > 0) {
    ctx.strokeStyle = '#ffffff'
    ctx.shadowColor = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-9, -9)
    ctx.lineTo(-4, -4)
    ctx.moveTo(9, -9)
    ctx.lineTo(4, -4)
    ctx.moveTo(-9, 9)
    ctx.lineTo(-4, 4)
    ctx.moveTo(9, 9)
    ctx.lineTo(4, 4)
    ctx.stroke()
  }
  ctx.restore()
}

function drawWallScene(ctx, game) {
  ctx.fillStyle = '#080217'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT / 2)
  sky.addColorStop(0, '#19002f')
  sky.addColorStop(1, '#09152d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2)

  const floor = ctx.createLinearGradient(0, CANVAS_HEIGHT / 2, 0, CANVAS_HEIGHT)
  floor.addColorStop(0, '#16102b')
  floor.addColorStop(1, '#05010a')
  ctx.fillStyle = floor
  ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT / 2)

  const zBuffer = new Array(CANVAS_WIDTH).fill(Infinity)
  const stripWidth = 2
  for (let x = 0; x < CANVAS_WIDTH; x += stripWidth) {
    const rayAngle =
      game.player.angle - FOV / 2 + (x / CANVAS_WIDTH) * FOV
    const ray = castRay(game.player.x, game.player.y, rayAngle)
    const corrected = ray.distance * Math.cos(rayAngle - game.player.angle)
    zBuffer[x] = corrected
    const wallHeight = Math.min(CANVAS_HEIGHT * 1.8, CANVAS_HEIGHT / Math.max(0.12, corrected) * 0.72)
    const top = (CANVAS_HEIGHT - wallHeight) / 2
    const shade = Math.max(18, 150 - corrected * 13)
    ctx.fillStyle =
      ray.side === 'x'
        ? `rgb(${Math.floor(shade * 0.45)}, ${Math.floor(shade * 0.9)}, ${shade})`
        : `rgb(${Math.floor(shade * 0.35)}, ${Math.floor(shade * 0.65)}, ${shade * 0.82})`
    ctx.fillRect(x, top, stripWidth + 1, wallHeight)
  }

  const sprites = [
    ...game.enemies
      .filter((enemy) => enemy.health > 0)
      .map((enemy) => ({ ...enemy, kind: 'enemy' })),
    ...game.pickups.map((pickup) => ({ ...pickup, kind: 'pickup' })),
  ].sort((a, b) =>
    Math.hypot(b.x - game.player.x, b.y - game.player.y) -
    Math.hypot(a.x - game.player.x, a.y - game.player.y),
  )

  for (const sprite of sprites) {
    const dx = sprite.x - game.player.x
    const dy = sprite.y - game.player.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angleToSprite = Math.atan2(dy, dx)
    const relative = angleDifference(angleToSprite, game.player.angle)
    if (Math.abs(relative) > FOV * 0.68) continue
    if (!hasLineOfSight(game.player.x, game.player.y, sprite.x, sprite.y)) continue

    const screenX =
      CANVAS_WIDTH / 2 +
      (Math.tan(relative) / Math.tan(FOV / 2)) * (CANVAS_WIDTH / 2)
    const size = Math.min(180, (CANVAS_HEIGHT / Math.max(distance, 0.2)) * 0.75)
    const bottom = CANVAS_HEIGHT / 2 + size * 0.7
    const centerX = screenX

    if (sprite.kind === 'enemy') {
      ctx.save()
      ctx.shadowColor = sprite.flash > 0 ? '#ffffff' : '#ff2e88'
      ctx.shadowBlur = 16
      ctx.fillStyle = sprite.flash > 0 ? '#ffffff' : '#ff2e88'
      ctx.beginPath()
      ctx.moveTo(centerX, bottom - size)
      ctx.lineTo(centerX - size * 0.38, bottom - size * 0.42)
      ctx.lineTo(centerX - size * 0.28, bottom)
      ctx.lineTo(centerX + size * 0.28, bottom)
      ctx.lineTo(centerX + size * 0.38, bottom - size * 0.42)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffd319'
      ctx.fillRect(centerX - size * 0.12, bottom - size * 0.58, size * 0.24, size * 0.08)
      ctx.restore()
    } else {
      ctx.save()
      ctx.shadowColor = sprite.type === 'health' ? '#00ffa3' : '#ffd319'
      ctx.shadowBlur = 12
      ctx.fillStyle = sprite.type === 'health' ? '#00ffa3' : '#ffd319'
      ctx.fillRect(centerX - size * 0.16, bottom - size * 0.28, size * 0.32, size * 0.28)
      ctx.restore()
    }
  }

  ctx.save()
  ctx.strokeStyle = '#00e5ff'
  ctx.fillStyle = 'rgba(7, 3, 15, 0.82)'
  ctx.lineWidth = 2
  const mapSize = 96
  const cell = mapSize / MAP.length
  ctx.fillRect(8, 8, mapSize + 4, mapSize + 4)
  ctx.strokeRect(8, 8, mapSize + 4, mapSize + 4)
  MAP.forEach((row, y) => {
    row.split('').forEach((cellValue, x) => {
      if (cellValue === '1') {
        ctx.fillStyle = '#8a2be2'
        ctx.fillRect(10 + x * cell, 10 + y * cell, cell, cell)
      }
    })
  })
  ctx.fillStyle = '#00e5ff'
  ctx.beginPath()
  ctx.arc(
    10 + game.player.x * cell,
    10 + game.player.y * cell,
    3,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.restore()

  const weaponOffset = game.firing > 0 ? 12 : 0
  ctx.save()
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT - weaponOffset)
  ctx.fillStyle = '#b9f7ff'
  ctx.strokeStyle = '#00e5ff'
  ctx.lineWidth = 4
  ctx.fillRect(-52, -46, 104, 46)
  ctx.strokeRect(-52, -46, 104, 46)
  ctx.fillStyle = '#1a1738'
  ctx.fillRect(-18, -72, 36, 28)
  ctx.fillStyle = '#ff3b30'
  ctx.fillRect(-8, -84, 16, 14)
  if (game.firing > 0) {
    ctx.shadowColor = '#ffd319'
    ctx.shadowBlur = 24
    ctx.fillStyle = '#ffd319'
    ctx.beginPath()
    ctx.moveTo(-14, -84)
    ctx.lineTo(0, -118)
    ctx.lineTo(14, -84)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  drawCrosshair(ctx, game)

  if (game.transitionTimer > 0) {
    ctx.save()
    ctx.fillStyle = '#ffd319'
    ctx.font = 'bold 26px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`OLEADA ${game.wave + 1} ENTRANDO`, CANVAS_WIDTH / 2, 70)
    ctx.restore()
  }
}

function NeonDoom({ userId, onScore, onStateChange, pauseRequested = false }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(createGame(readHighScore(userId, GAME_ID)))
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    left: false,
    right: false,
    up: false,
    down: false,
  })
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [ammo, setAmmo] = useState(24)
  const [wave, setWave] = useState(1)
  const [highScore, setHighScore] = useState(() =>
    readHighScore(userId, GAME_ID),
  )
  const [newRecord, setNewRecord] = useState(false)
  const [mouseMode, setMouseMode] = useState('free')
  const lastSavedScoreRef = useRef(highScore)
  const { isPaused, pausedRef, togglePause } = useGamePause(
    status === 'running',
    pauseRequested,
  )

  const syncHud = useCallback(() => {
    const game = gameRef.current
    setScore(game.score)
    setHealth(game.health)
    setAmmo(game.ammo)
    setWave(game.wave)
  }, [])

  const startGame = useCallback(() => {
    const nextGame = createGame(gameRef.current.highScore)
    nextGame.status = 'running'
    gameRef.current = nextGame
    setStatus('running')
    setNewRecord(false)
    syncHud()
  }, [syncHud])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = CANVAS_WIDTH * pixelRatio
    canvas.height = CANVAS_HEIGHT * pixelRatio
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    drawWallScene(context, gameRef.current)

    if (status !== 'running' || isPaused) return undefined
    let frameId = 0
    let lastTime = window.performance.now()

    function frame(now) {
      if (pausedRef.current) return
      const dt = Math.min((now - lastTime) / 1000, 0.035)
      lastTime = now
      const game = gameRef.current
      const previousScore = game.score
      const previousStatus = game.status
      updateGame(game, dt, keysRef.current)
      drawWallScene(context, game)

      if (
        game.score !== previousScore ||
        game.health !== health ||
        game.ammo !== ammo ||
        game.wave !== wave
      ) {
        syncHud()
      }
      if (game.score !== previousScore) onScore?.(game.score)
      if (game.status !== previousStatus) setStatus(game.status)
      frameId = window.requestAnimationFrame(frame)
    }
    frameId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(frameId)
  }, [status, isPaused, pausedRef, syncHud, health, ammo, wave, onScore])

  useEffect(() => {
    onStateChange?.({
      status: isPaused ? 'paused' : status,
      score,
      level: wave,
    })
  }, [isPaused, status, score, wave, onStateChange])

  useEffect(() => {
    function handlePointerLockChange() {
      if (!document.pointerLockElement) {
        setMouseMode('free')
      }
    }
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () =>
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [])

  useEffect(() => {
    if (isPaused && document.pointerLockElement) {
      document.exitPointerLock()
      setMouseMode('free')
    }
  }, [isPaused])

  useEffect(() => {
    if (status !== 'over' || score <= 0) return
    if (score > lastSavedScoreRef.current) {
      lastSavedScoreRef.current = score
      saveHighScore(userId, GAME_ID, score)
      setHighScore(score)
      setNewRecord(true)
    }
  }, [status, score, userId])

  useEffect(() => {
    function keyDown(event) {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        if (document.pointerLockElement) {
          document.exitPointerLock()
        }
        setMouseMode('free')
        return
      }
      if (isPaused) return
      const key = event.key.toLowerCase()
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        event.preventDefault()
        keysRef.current[key] = true
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        keysRef.current.left = true
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        keysRef.current.right = true
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        keysRef.current.up = true
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        keysRef.current.down = true
      }
      if (event.key === ' ' || key === 'enter') {
        event.preventDefault()
        if (gameRef.current.status === 'running') {
          if (event.key === ' ') fireWeapon(gameRef.current)
        } else {
          startGame()
        }
      }
    }
    function keyUp(event) {
      const key = event.key.toLowerCase()
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keysRef.current[key] = false
      }
      if (event.key === 'ArrowLeft') keysRef.current.left = false
      if (event.key === 'ArrowRight') keysRef.current.right = false
      if (event.key === 'ArrowUp') keysRef.current.up = false
      if (event.key === 'ArrowDown') keysRef.current.down = false
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [isPaused, startGame])

  function handlePointerMove(event) {
    if (gameRef.current.status !== 'running' || pausedRef.current) return
    if (mouseMode === 'locked' && document.pointerLockElement === canvasRef.current) {
      gameRef.current.player.angle += (event.movementX || 0) * 0.0022
      return
    }
    if (mouseMode === 'locked') {
      const rect = event.currentTarget.getBoundingClientRect()
      if (!rect.width) return
      const position = (event.clientX - rect.left) / rect.width
      gameRef.current.player.angle += ((position - 0.5) * 0.008)
    }
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (gameRef.current.status === 'running') {
      fireWeapon(gameRef.current)
      syncHud()
      if (
        mouseMode === 'locked' &&
        document.pointerLockElement !== canvasRef.current &&
        canvasRef.current?.requestPointerLock
      ) {
        canvasRef.current.requestPointerLock()
      }
    } else {
      startGame()
    }
  }

  function toggleMouseMode() {
    if (mouseMode === 'locked') {
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
      setMouseMode('free')
      return
    }

    setMouseMode('locked')
    if (
      status === 'running' &&
      canvasRef.current?.requestPointerLock
    ) {
      canvasRef.current.requestPointerLock()
    }
  }

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="arcade-meta-label">
          Salud: <span style={{ color: '#00ffa3' }}>{health}%</span> · Munición:{' '}
          <span style={{ color: '#ffd319' }}>{ammo}</span> · Oleada:{' '}
          <span style={{ color: ACCENT }}>{wave}</span>
        </p>
        <div className="flex items-center gap-2">
          <p className="arcade-meta-label flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Récord:{' '}
            <span style={{ color: '#ffd319' }}>{highScore}</span>
          </p>
          <button
            type="button"
            onClick={toggleMouseMode}
            aria-pressed={mouseMode === 'locked'}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm"
            title={
              mouseMode === 'locked'
                ? 'Liberar el cursor del juego'
                : 'Capturar el cursor para girar la cámara'
            }
          >
            {mouseMode === 'locked'
              ? 'MOUSE BLOQUEADO'
              : 'MOUSE LIBRE'}
          </button>
          {status === 'running' && (
            <GamePauseButton isPaused={isPaused} onToggle={togglePause} />
          )}
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-2xl overflow-hidden"
        style={{
          border: `2px solid ${ACCENT}`,
          boxShadow: `0 0 16px ${ACCENT}55, inset 0 0 24px rgba(18, 0, 43, 0.7)`,
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          role="img"
          aria-label="Campo de batalla raycasting de NEON DOOM"
          className="block h-auto w-full"
        />

        {status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {status === 'idle' && (
              <>
                <p className="arcade-subtitle">NEON DOOM</p>
                <p className="arcade-hint max-w-md">
                  W A S D mueve · FLECHAS gira · ARRIBA/ABAJO mueve · ESPACIO/clic dispara
                </p>
              </>
            )}
            {status === 'over' && (
              <>
                <h4 className="arcade-success-title text-sm">GAME OVER</h4>
                <p className="arcade-meta-label">
                  Puntaje: <span style={{ color: ACCENT }}>{score}</span> · Récord:{' '}
                  <span style={{ color: '#ffd319' }}>{Math.max(highScore, score)}</span>
                </p>
                {newRecord && (
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

      <div
        className="grid grid-cols-4 gap-2 border-2 border-[#ff3b3055] bg-[#12002b] p-2 text-center"
        aria-label="HUD clásico"
      >
        <div>
          <p className="arcade-meta-label">SALUD</p>
          <p className="font-mono text-lg text-[#00ffa3]">{health}%</p>
        </div>
        <div>
          <p className="arcade-meta-label">MUNICIÓN</p>
          <p className="font-mono text-lg text-[#ffd319]">{ammo}</p>
        </div>
        <div>
          <p className="arcade-meta-label">OLEADA</p>
          <p className="font-mono text-lg text-[#ff3b30]">{wave}</p>
        </div>
        <div>
          <p className="arcade-meta-label">PUNTOS</p>
          <p className="font-mono text-lg text-[#ffd319]">{score}</p>
        </div>
      </div>

      <p className="arcade-hint text-center">
        W/A/S/D: mover · FLECHAS IZQ/DER: girar · ARRIBA/ABAJO: avanzar/retroceder · ESPACIO/clic: disparar · MOUSE BLOQUEADO/LIBRE alterna captura del cursor
      </p>
    </div>
  )
}

export default NeonDoom
