import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Target, Timer, Trophy } from 'lucide-react'

const ROUND_MS = 20000
const MOVE_INTERVAL_MS = 1100
const TICK_MS = 100

function randomTarget() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    left: 6 + Math.random() * 82,
    top: 8 + Math.random() * 78,
  }
}

function ReactionGame({ onScore, onStateChange }) {
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [target, setTarget] = useState(null)
  const scoreRef = useRef(0)
  const timeLeftRef = useRef(ROUND_MS)

  const report = useCallback(
    (nextStatus, nextScore) => {
      onStateChange?.({
        status: nextStatus,
        score: nextScore,
        level: 1,
      })
    },
    [onStateChange],
  )

  useEffect(() => {
    if (status !== 'running') {
      return undefined
    }

    const tick = window.setInterval(() => {
      const next = Math.max(0, timeLeftRef.current - TICK_MS)
      timeLeftRef.current = next
      setTimeLeft(next)
      if (next === 0) {
        setStatus('over')
        setTarget(null)
        report('over', scoreRef.current)
      }
    }, TICK_MS)

    const move = window.setInterval(() => {
      setTarget(randomTarget())
    }, MOVE_INTERVAL_MS)

    return () => {
      window.clearInterval(tick)
      window.clearInterval(move)
    }
  }, [status, report])

  function startRound() {
    scoreRef.current = 0
    timeLeftRef.current = ROUND_MS
    setScore(0)
    setTimeLeft(ROUND_MS)
    setStatus('running')
    setTarget(randomTarget())
    report('running', 0)
  }

  function hitTarget() {
    if (status !== 'running') {
      return
    }
    const nextScore = scoreRef.current + 10
    scoreRef.current = nextScore
    setScore(nextScore)
    setTarget(randomTarget())
    onScore?.(nextScore)
    report('running', nextScore)
  }

  const seconds = Math.ceil(timeLeft / 1000)
  const isRunning = status === 'running'

  return (
    <div className="arcade-card flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="arcade-profile-name flex items-center gap-2">
            <Target className="h-5 w-5 text-[#ff2e88]" aria-hidden="true" />
            Neon Reflex
          </p>
          <p className="arcade-hint mt-1">
            Toca los objetivos antes de que cambien de posición. Ronda de 20
            segundos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="arcade-chip border-[#00e5ff55] text-[#00e5ff]">
            <Timer className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {seconds}s
          </span>
          <span className="arcade-chip border-[#ffd31955] text-[#ffd319]">
            <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {score} pts
          </span>
        </div>
      </div>

      <div
        className="relative min-h-[320px] overflow-hidden border-2 border-[#8a2be255] bg-[#0d001f]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,229,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {isRunning && target && (
          <button
            type="button"
            onClick={hitTarget}
            aria-label="Objetivo"
            className="absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#ff2e88] bg-[#ff2e8833] text-[#ff2e88] shadow-[0_0_24px_rgba(255,46,136,0.8)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
            style={{ left: `${target.left}%`, top: `${target.top}%` }}
          >
            <Target className="h-7 w-7" aria-hidden="true" />
          </button>
        )}

        {!isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Target className="h-12 w-12 text-[#ff2e88]" aria-hidden="true" />
            <div>
              <p className="arcade-title text-base">
                {status === 'over' ? 'RONDA TERMINADA' : '¿LISTO?'}
              </p>
              <p className="mt-2 text-sm text-[#d9c8ff]">
                {status === 'over'
                  ? `Conseguiste ${score} puntos. ¿Jugamos otra vez?`
                  : 'Los elementos nuevos del catálogo usan este mini juego de reflejos.'}
              </p>
            </div>
            <button
              type="button"
              onClick={startRound}
              className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
            >
              {status === 'over' ? (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {status === 'over' ? 'Jugar de nuevo' : 'Comenzar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReactionGame
