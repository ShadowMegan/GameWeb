import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'
import { readHighScore, saveHighScore } from '../../lib/scores.js'

const ACCENT = '#8a2be2'
const GRID_SIZE = 8
const CELL_POINTS = 1
const LINE_POINTS = 10
const FLASH_MS = 550

const PIECE_PALETTE = ['#00e5ff', '#ff2e88', '#ffd319', '#00ffa3', '#ff9f1c']

const PIECE_POOL = [
  { cells: [[0, 0]], weight: 3 },
  { cells: [[0, 0], [0, 1]], weight: 3 },
  { cells: [[0, 0], [1, 0]], weight: 3 },
  { cells: [[0, 0], [0, 1], [0, 2]], weight: 2 },
  { cells: [[0, 0], [1, 0], [2, 0]], weight: 2 },
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 2 },
  { cells: [[0, 0], [0, 1], [1, 0]], weight: 2 },
  { cells: [[0, 1], [1, 0], [1, 1]], weight: 1 },
  { cells: [[0, 0], [1, 0], [1, 1]], weight: 1 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 1 },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 0]], weight: 1 },
]

const TOTAL_WEIGHT = PIECE_POOL.reduce((sum, piece) => sum + piece.weight, 0)

function pickPiece() {
  let roll = Math.random() * TOTAL_WEIGHT
  for (const piece of PIECE_POOL) {
    roll -= piece.weight
    if (roll <= 0) {
      return {
        id: `${Math.random().toString(36).slice(2)}-${Date.now()}`,
        cells: piece.cells,
        color: PIECE_PALETTE[Math.floor(Math.random() * PIECE_PALETTE.length)],
      }
    }
  }
  return null
}

function createHand() {
  return [pickPiece(), pickPiece(), pickPiece()]
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

function findFullLines(grid) {
  const fullRows = []
  const fullCols = []

  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (
      Array.from({ length: GRID_SIZE }, (_, col) => grid[keyFor(row, col)]).every(
        Boolean,
      )
    ) {
      fullRows.push(row)
    }
  }
  for (let col = 0; col < GRID_SIZE; col += 1) {
    if (
      Array.from({ length: GRID_SIZE }, (_, row) => grid[keyFor(row, col)]).every(
        Boolean,
      )
    ) {
      fullCols.push(col)
    }
  }

  return { fullRows, fullCols }
}

function collectLineCells({ fullRows, fullCols }) {
  const cells = new Set()
  fullRows.forEach((row) => {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      cells.add(keyFor(row, col))
    }
  })
  fullCols.forEach((col) => {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      cells.add(keyFor(row, col))
    }
  })
  return cells
}

function removeCells(grid, cells) {
  const next = { ...grid }
  cells.forEach((key) => {
    delete next[key]
  })
  return next
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
      onClick={(event) => {
        event.currentTarget.blur()
        onSelect(event)
      }}
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

const FLOATING_CELL = 22

function FloatingPiece({ piece, cursor }) {
  const cols = Math.max(...piece.cells.map(([, x]) => x)) + 1
  const rows = Math.max(...piece.cells.map(([y]) => y)) + 1

  return (
    <div
      className="pointer-events-none fixed z-30"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: 'translate(-50%, -50%)',
        opacity: 0.82,
        filter: `drop-shadow(0 0 10px ${piece.color})`,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: cols * FLOATING_CELL,
          height: rows * FLOATING_CELL,
        }}
      >
        {piece.cells.map(([dy, dx]) => (
          <span
            key={`${dy}-${dx}`}
            style={{
              position: 'absolute',
              left: dx * FLOATING_CELL,
              top: dy * FLOATING_CELL,
              width: FLOATING_CELL,
              height: FLOATING_CELL,
              background: piece.color,
              boxShadow:
                'inset 0 0 8px rgba(255, 255, 255, 0.45), 0 0 10px rgba(7, 3, 15, 0.5)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function BlockGridPuzzle({ onScore }) {
  const [grid, setGrid] = useState({})
  const [hand, setHand] = useState(createHand)
  const [selectedId, setSelectedId] = useState(null)
  const [hover, setHover] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [flashCells, setFlashCells] = useState(null)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('idle')
  const [highScore, setHighScore] = useState(() =>
    readHighScore('block-grid-puzzle'),
  )
  const beatRecord = status === 'over' && score > 0 && score >= highScore
  const flashPendingRef = useRef(false)
  const clearTimerRef = useRef(null)

  useEffect(() => {
    if (score > 0) {
      onScore?.(score)
    }
  }, [score, onScore])

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedId || status !== 'running') {
      return undefined
    }
    function handleMouseMove(event) {
      setCursor({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [selectedId, status])

  function startGame() {
    if (clearTimerRef.current) {
      window.clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
    flashPendingRef.current = false
    setGrid({})
    setHand(createHand())
    setSelectedId(null)
    setHover(null)
    setCursor(null)
    setFlashCells(null)
    setScore(0)
    setStatus('running')
  }

  function selectPiece(nextId, event) {
    if (flashPendingRef.current) {
      return
    }
    if (nextId === null) {
      setCursor(null)
    } else if (event) {
      setCursor({ x: event.clientX, y: event.clientY })
    }
    setSelectedId(nextId)
  }

  function handleCellClick(row, col) {
    if (status !== 'running' || flashPendingRef.current) {
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
    const lines = findFullLines(filled)
    const cleared = lines.fullRows.length + lines.fullCols.length
    const remainingHand = hand.filter((candidate) => candidate.id !== piece.id)
    const nextHand = remainingHand.length > 0 ? remainingHand : createHand()
    const nextScore = score + piece.cells.length * CELL_POINTS + cleared * LINE_POINTS

    if (nextScore > highScore) {
      setHighScore(nextScore)
      saveHighScore('block-grid-puzzle', nextScore)
    }

    if (cleared === 0) {
      finishPlacement(filled, nextHand)
      return
    }

    const flash = collectLineCells(lines)
    flashPendingRef.current = true
    setFlashCells(flash)
    setScore(nextScore)

    clearTimerRef.current = window.setTimeout(() => {
      clearTimerRef.current = null
      flashPendingRef.current = false
      const cleaned = removeCells(filled, flash)
      setFlashCells(null)
      finishPlacement(cleaned, nextHand)
    }, FLASH_MS)
  }

  function finishPlacement(nextGrid, nextHand) {
    setGrid(nextGrid)
    setHand(nextHand)
    setSelectedId(null)
    setHover(null)
    setCursor(null)
    if (!hasAnyFittingSlot(nextGrid, nextHand)) {
      setStatus('over')
    }
  }

  const selectedPiece = hand.find((piece) => piece.id === selectedId)

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
            const isFlashing = Boolean(flashCells?.has(key))
            const canPreview =
              status === 'running' &&
              hover &&
              selectedPiece &&
              canPlace(grid, selectedPiece.cells, row, col)
            const isPreviewCell =
              canPreview &&
              selectedPiece.cells.some(
                ([dy, dx]) =>
                  hover.row + dy === row && hover.col + dx === col,
              )

            return (
              <button
                type="button"
                key={key}
                onClick={() => handleCellClick(row, col)}
                onMouseEnter={() => setHover({ row, col })}
                onFocus={() => setHover({ row, col })}
                aria-label={`Celda ${row + 1}-${col + 1}`}
                className={isFlashing ? 'arcade-clear-cell' : ''}
                style={{
                  aspectRatio: '1',
                  border: isPreviewCell
                    ? `1px solid ${selectedPiece.color}`
                    : '1px solid rgba(138, 43, 226, 0.28)',
                  background: color
                    ? color
                    : isPreviewCell
                      ? `${selectedPiece.color}55`
                      : 'rgba(7, 3, 15, 0.65)',
                  boxShadow: color
                    ? `inset 0 0 8px ${color}aa`
                    : isPreviewCell
                      ? `0 0 10px ${selectedPiece.color}88`
                      : undefined,
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
                  <p
                    className="arcade-meta-label"
                    style={{ color: '#ffd319' }}
                  >
                    ¡Nuevo récord guardado!
                  </p>
                )}
              </>
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
              onSelect={(event) =>
                selectPiece(
                  selectedId === piece.id ? null : piece.id,
                  event,
                )
              }
            />
          ))}
      </div>

      {selectedPiece && cursor && (
        <FloatingPiece piece={selectedPiece} cursor={cursor} />
      )}

      <p className="arcade-hint text-center">
        Selecciona una pieza y haz clic en una celda; la pieza sigue tu cursor.
        Cada celda colocada suma 1 y cada línea completa suma 10.
      </p>
    </div>
  )
}

export default BlockGridPuzzle
