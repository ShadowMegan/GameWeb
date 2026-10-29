import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'

const ACCENT = '#ffd319'
const COLS = 10
const ROWS = 20
const STEP_MS = 580
const SOFT_DROP_POINTS = 1
const HARD_DROP_POINTS = 2
const LINE_POINTS = [0, 100, 300, 500, 800]

const COLORS = {
  I: '#00e5ff',
  O: '#ffd319',
  T: '#ff2e88',
  S: '#00ffa3',
  Z: '#ff4d6d',
  J: '#4d7cff',
  L: '#ff9f1c',
}

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  L: [
    [1, 0, 0],
    [1, 1, 1],
  ],
}

const PIECE_KINDS = Object.keys(SHAPES)

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function rotateShape(shape) {
  return shape[0].map((_, colIndex) =>
    shape.map((row) => row[colIndex]).reverse(),
  )
}

function randomPiece() {
  const kind = PIECE_KINDS[Math.floor(Math.random() * PIECE_KINDS.length)]
  return { kind, shape: SHAPES[kind], row: 0, col: 3 }
}

function fits(board, shape, row, col) {
  if (row < 0 || col < 0) {
    return false
  }
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) {
        continue
      }
      const boardRow = row + y
      const boardCol = col + x
      if (boardCol >= COLS || boardRow >= ROWS) {
        return false
      }
      if (board[boardRow][boardCol]) {
        return false
      }
    }
  }
  return true
}

function clearLines(board) {
  const next = board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - next.length
  const padded = Array.from({ length: cleared }, () => Array(COLS).fill(null))
  return { board: [...padded, ...next], cleared }
}

function applyTetrisStep(current) {
  if (current.status !== 'running') {
    return current
  }

  const { board, piece } = current
  if (fits(board, piece.shape, piece.row + 1, piece.col)) {
    return {
      ...current,
      piece: { ...piece, row: piece.row + 1 },
    }
  }

  const merged = board.map((row) => [...row])
  piece.shape.forEach((shapeRow, y) => {
    shapeRow.forEach((cell, x) => {
      if (cell) {
        merged[piece.row + y][piece.col + x] = piece.kind
      }
    })
  })

  const { board: cleaned, cleared } = clearLines(merged)
  const spawn = current.next
  const lockedOut = !fits(cleaned, spawn.shape, spawn.row, spawn.col)

  const lines = current.lines + cleared
  const score =
    current.score +
    LINE_POINTS[Math.min(cleared, LINE_POINTS.length - 1)]

  return {
    ...current,
    board: cleaned,
    piece: lockedOut ? piece : spawn,
    next: lockedOut ? current.next : randomPiece(),
    lines,
    score,
    highScore: Math.max(current.highScore, score),
    status: lockedOut ? 'over' : 'running',
  }
}

function spawnState(highScore) {
  return {
    board: emptyBoard(),
    piece: randomPiece(),
    next: randomPiece(),
    lines: 0,
    score: 0,
    highScore,
    status: 'running',
  }
}

function hardDropStep(current) {
  let { piece } = current
  let distance = 0
  while (fits(current.board, piece.shape, piece.row + 1, piece.col)) {
    piece = { ...piece, row: piece.row + 1 }
    distance += 1
  }
  return applyTetrisStep({
    ...current,
    piece,
    score: current.score + distance * HARD_DROP_POINTS,
  })
}

function NextPiecePreview({ piece }) {
  const shape = piece.shape
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="arcade-meta-label">Siguiente</p>
      <div
        className="grid gap-0.5 p-2"
        style={{
          gridTemplateColumns: `repeat(${shape[0].length}, 10px)`,
          border: `2px solid ${ACCENT}66`,
          background: 'rgba(7, 3, 15, 0.7)',
        }}
      >
        {shape.flat().map((cell, index) => (
          <span
            key={index}
            className="h-2.5 w-2.5"
            style={{
              background: cell ? COLORS[piece.kind] : 'rgba(138,43,226,0.15)',
              boxShadow: cell ? `0 0 6px ${COLORS[piece.kind]}` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function NeonTetris({ onScore }) {
  const [game, setGame] = useState(() => ({
    ...spawnState(readHighScore('neon-tetris')),
    status: 'idle',
  }))
  const score = game.score
  const highScore = game.highScore
  const status = game.status
  const beatRecord = status === 'over' && score > 0 && score >= highScore
  const lastSavedScoreRef = useRef(highScore)

  function buildDisplayBoard(state) {
    if (state.status === 'over' || state.status === 'idle') {
      return state.board
    }
    const display = state.board.map((row) => [...row])
    state.piece.shape.forEach((shapeRow, y) => {
      shapeRow.forEach((cell, x) => {
        if (cell && state.piece.row + y >= 0) {
          display[state.piece.row + y][state.piece.col + x] = state.piece.kind
        }
      })
    })
    return display
  }

  useEffect(() => {
    if (score > 0) {
      onScore?.(score)
    }
  }, [score, onScore])

  useEffect(() => {
    if (highScore > lastSavedScoreRef.current) {
      lastSavedScoreRef.current = highScore
      saveHighScore('neon-tetris', highScore)
    }
  }, [highScore])

  useEffect(() => {
    if (status !== 'running') {
      return undefined
    }
    const timer = window.setInterval(() => {
      setGame(applyTetrisStep)
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [status])

  function move(colDelta) {
    if (game.status !== 'running') {
      return
    }
    setGame((current) => {
      const { board, piece } = current
      const col = piece.col + colDelta
      return fits(board, piece.shape, piece.row, col)
        ? { ...current, piece: { ...piece, col } }
        : current
    })
  }

  function rotate() {
    if (game.status !== 'running') {
      return
    }
    setGame((current) => {
      const { board, piece } = current
      const shape = rotateShape(piece.shape)
      const spread = [0, -1, 1, -2, 2].find(
        (offset) => fits(board, shape, piece.row, piece.col + offset),
      )
      return spread === undefined
        ? current
        : { ...current, piece: { ...piece, shape, col: piece.col + spread } }
    })
  }

  function softDrop() {
    if (game.status !== 'running') {
      return
    }
    setGame((current) => {
      const { board, piece } = current
      if (!fits(board, piece.shape, piece.row + 1, piece.col)) {
        return current
      }
      return {
        ...current,
        piece: { ...piece, row: piece.row + 1 },
        score: current.score + SOFT_DROP_POINTS,
      }
    })
  }

  function hardDrop() {
    if (game.status !== 'running') {
      return
    }
    setGame(hardDropStep)
  }

  function startGame() {
    setGame(spawnState(highScore))
  }

  useEffect(() => {
    function handleKey(event) {
      const key = event.key
      if (key === 'ArrowLeft') {
        event.preventDefault()
        move(-1)
        return
      }
      if (key === 'ArrowRight') {
        event.preventDefault()
        move(1)
        return
      }
      if (key === 'ArrowDown') {
        event.preventDefault()
        softDrop()
        return
      }
      if (key === 'ArrowUp') {
        event.preventDefault()
        rotate()
        return
      }
      if (key === ' ' && game.status === 'running') {
        event.preventDefault()
        hardDrop()
        return
      }
      if ((key === 'Enter' || key === ' ') && game.status !== 'running') {
        event.preventDefault()
        startGame()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="arcade-meta-label">
          Puntos: <span style={{ color: ACCENT }}>{game.score}</span> · Líneas:{' '}
          <span style={{ color: ACCENT }}>{game.lines}</span>
        </p>
        <p className="arcade-meta-label flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Récord:{' '}
          <span style={{ color: '#ffd319' }}>{highScore}</span>
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-md items-stretch gap-3">
        <div
          className="relative flex-1"
          style={{
            border: `2px solid ${ACCENT}`,
            boxShadow: `0 0 14px ${ACCENT}44, inset 0 0 22px rgba(18, 0, 43, 0.7)`,
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, calc(min(90vw, 24rem) / 50))`,
            }}
          >
            {buildDisplayBoard(game)
              .flat()
              .map((cell, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid rgba(138, 43, 226, 0.28)',
                    background: cell
                      ? COLORS[cell]
                      : `rgba(7, 3, 15, 0.72)`,
                    boxShadow: cell ? `inset 0 0 6px ${COLORS[cell]}aa` : undefined,
                  }}
                />
              ))}
          </div>

          {game.status !== 'running' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
              {game.status === 'idle' && <p className="arcade-subtitle">NEON TETRIS</p>}
              {game.status === 'over' && (
                <>
                  <h4 className="arcade-success-title text-sm">GAME OVER</h4>
                  <p className="arcade-meta-label">
                    Puntos: <span style={{ color: ACCENT }}>{game.score}</span> ·
                    Récord: <span style={{ color: '#ffd319' }}>{Math.max(highScore, game.score)}</span>
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
                onClick={startGame}
                className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {game.status === 'idle' ? 'INICIAR' : 'JUGAR OTRA VEZ'}
              </button>
            </div>
          )}
        </div>

        <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-3">
          {game.status !== 'over' ? (
            <NextPiecePreview piece={game.next} />
          ) : null}
        </div>
      </div>

      <p className="arcade-hint text-center">
        FLECHAS: mover · ARRIBA: rotar · ABAJO: caída suave · ESPACIO: caída
        total
      </p>
    </div>
  )
}

export default NeonTetris
