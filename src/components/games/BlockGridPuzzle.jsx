import { useEffect, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'

const ACCENT = '#8a2be2'
const GRID_SIZE = 8
const PIECE_PALETTE = ['#00e5ff', '#ff2e88', '#ffd319', '#00ffa3', '#ff9f1c']
const CELL_POINTS = 1
const LINE_POINTS = 10

const PIECE_SHAPES = [
  [[0, 0]],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 0],
  ],
  [
    [0, 0],
    [1, 1],
  ],
]

function createHand() {
  return Array.from({ length: 3 }, () => {
    const cells =
      PIECE_SHAPES[Math.floor(Math.random() * PIECE_SHAPES.length)]
    const color =
      PIECE_PALETTE[Math.floor(Math.random() * PIECE_PALETTE.length)]
    return {
      id: `${Math.random().toString(36).slice(2)}-${Date.now()}`,
      cells,
      color,
    }
  })
}

function keyFor(row, col) {
  return `${row},${col}`
}

function canPlace(grid, cells, row, col) {
  return cells.every(([dy, dx]) => {
    const targetRow = row + dy
    const targetCol = col + dx
    return (
      targetRow >= 0 &&
      targetRow < GRID_SIZE &&
      targetCol >= 0 &&
      targetCol < GRID_SIZE &&
      !grid[keyFor(targetRow, targetCol)]
    )
  })
}

function placePiece(grid, cells, row, col, color) {
  const next = { ...grid }
  cells.forEach(([dy, dx]) => {
    next[keyFor(row + dy, col + dx)] = color
  })
  return next
}

function clearFullLines(grid) {
  const fullRows = []
  const fullCols = []

  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (Array.from({ length: GRID_SIZE }, (_, col) => grid[keyFor(row, col)]).every(Boolean)) {
      fullRows.push(row)
    }
  }
  for (let col = 0; col < GRID_SIZE; col += 1) {
    if (Array.from({ length: GRID_SIZE }, (_, row) => grid[keyFor(row, col)]).every(Boolean)) {
      fullCols.push(col)
    }
  }
  if (fullRows.length === 0 && fullCols.length === 0) {
    return { grid, cleared: 0 }
  }

  const next = { ...grid }
  fullRows.forEach((row) => {
    Array.from({ length: GRID_SIZE }, (_, col) => col).forEach((col) => {
      delete next[keyFor(row, col)]
    })
  })
  fullCols.forEach((col) => {
    Array.from({ length: GRID_SIZE }, (_, row) => row).forEach((row) => {
      delete next[keyFor(row, col)]
    })
  })

  return { grid: next, cleared: fullRows.length + fullCols.length }
}

function hasAnyFittingSlot(grid, hand) {
  return hand.some((piece) => {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (canPlace(grid, piece.cells, row, col)) {
          return true
        }
      }
    }
    return false
  })
}

function PiecePreview({ piece, selected, onSelect }) {
  const rows = Math.max(...piece.cells.map(([y]) => y)) + 1
  const cols = Math.max(...piece.cells.map(([, x]) => x)) + 1

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`arcade-card flex flex-col items-center justify-center gap-1 p-3 ${
        selected ? 'scale-105' : ''
      }`}
      style={{
        borderColor: piece.color,
        boxShadow: selected
          ? `0 0 16px ${piece.color}, inset 0 0 16px rgba(18, 0, 43, 0.6)`
          : `0 0 8px ${piece.color}44, inset 0 0 12px rgba(18, 0, 43, 0.6)`,
        opacity: selected ? 1 : 0.85,
      }}
    >
      {Array.from({ length: rows }, (_, row) => (
        <span key={row} className="flex" style={{ minHeight: 10 }}>
          {Array.from({ length: cols }, (_, col) => {
            const filled = piece.cells.some(([y, x]) => y === row && x === col)
            return (
              <span
                key={col}
                className="block"
                style={{
                  width: 14,
                  height: 14,
                  background: filled ? piece.color : 'transparent',
                  boxShadow: filled ? `0 0 8px ${piece.color}99` : undefined,
                }}
              />
            )
          })}
        </span>
      ))}
    </button>
  )
}

function BlockGridPuzzle({ onScore }) {
  const [grid, setGrid] = useState({})
  const [hand, setHand] = useState(createHand)
  const [selectedId, setSelectedId] = useState(null)
  const [hover, setHover] = useState(null)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('idle')
  const [highScore, setHighScore] = useState(() =>
    readHighScore('block-grid-puzzle'),
  )
  const beatRecord = status === 'over' && score > 0 && score >= highScore

  useEffect(() => {
    if (score > 0) {
      onScore?.(score)
    }
  }, [score, onScore])

  function startGame() {
    setGrid({})
    setHand(createHand())
    setSelectedId(null)
    setHover(null)
    setScore(0)
    setStatus('running')
  }

  function handleCellClick(row, col) {
    if (status !== 'running') {
      return
    }
    const piece = hand.find((candidate) => candidate.id === selectedId)
    if (!piece) {
      return
    }
    if (!canPlace(grid, piece.cells, row, col)) {
      return
    }

    const filled = placePiece(grid, piece.cells, row, col, piece.color)
    const { grid: cleaned, cleared } = clearFullLines(filled)
    const remainingHand = hand.filter((candidate) => candidate.id !== piece.id)
    const nextHand = remainingHand.length > 0 ? remainingHand : createHand()

    const gained = piece.cells.length * CELL_POINTS + cleared * LINE_POINTS
    const nextScore = score + gained
    setGrid(cleaned)
    setHand(nextHand)
    setSelectedId(null)
    setHover(null)
    setScore(nextScore)

    if (nextScore > highScore) {
      setHighScore(nextScore)
      saveHighScore('block-grid-puzzle', nextScore)
    }

    if (!hasAnyFittingSlot(cleaned, nextHand)) {
      setStatus('over')
    }
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
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const row = Math.floor(index / GRID_SIZE)
            const col = index % GRID_SIZE
            const key = keyFor(row, col)
            const color = grid[key]
            const previewCells =
              status === 'running' &&
              hover &&
              selectedId &&
              (() => {
                const piece = hand.find(
                  (candidate) => candidate.id === selectedId,
                )
                if (piece && canPlace(grid, piece.cells, hover.row, hover.col)) {
                  return piece.cells.some(
                    ([dy, dx]) =>
                      hover.row + dy === row && hover.col + dx === col,
                  )
                }
                return false
              })()

            return (
              <button
                type="button"
                key={key}
                onClick={() => handleCellClick(row, col)}
                onMouseEnter={() => setHover({ row, col })}
                onFocus={() => setHover({ row, col })}
                aria-label={`Celda ${row + 1}-${col + 1}`}
                style={{
                  aspectRatio: '1',
                  border: '1px solid rgba(138, 43, 226, 0.28)',
                  background: color
                    ? color
                    : previewCells
                      ? `${hand.find((p) => p.id === selectedId)?.color}55`
                      : 'rgba(7, 3, 15, 0.65)',
                  boxShadow: color ? `inset 0 0 8px ${color}aa` : undefined,
                }}
              />
            )
          })}
        </div>

        {status !== 'running' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#07030fe6] p-4 text-center">
            {status === 'idle' && (
              <>
                <p className="arcade-subtitle">BLOCK GRID PUZZLE</p>
                <p className="arcade-hint max-w-xs">
                  Selecciona una pieza y colócala en la retícula para completar
                  líneas.
                </p>
              </>
            )}
            {status === 'over' && (
              <>
                <h4 className="arcade-success-title text-sm">SIN ESPACIO</h4>
                <p className="arcade-meta-label">
                  Puntos: <span style={{ color: ACCENT }}>{score}</span> ·
                  Récord: <span style={{ color: '#ffd319' }}>{Math.max(highScore, score)}</span>
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
              {status === 'idle' ? 'INICIAR' : 'JUGAR OTRA VEZ'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {status === 'running' &&
          hand.map((piece) => (
            <PiecePreview
              key={piece.id}
              piece={piece}
              selected={selectedId === piece.id}
              onSelect={() =>
                setSelectedId((current) =>
                  current === piece.id ? null : piece.id,
                )
              }
            />
          ))}
      </div>

      <p className="arcade-hint text-center">
        Selecciona una pieza y haz clic en una celda. Cada celda colocada suma 1
        y cada línea completa suma 10.
      </p>
    </div>
  )
}

export default BlockGridPuzzle
