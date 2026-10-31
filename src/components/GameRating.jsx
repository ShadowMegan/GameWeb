import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import {
  readGameReviewStats,
  subscribeGameReviews,
} from '../lib/reviews.js'

function GameRating({ gameId }) {
  const [stats, setStats] = useState(() => readGameReviewStats(gameId))

  useEffect(
    () =>
      subscribeGameReviews(gameId, () =>
        setStats(readGameReviewStats(gameId)),
      ),
    [gameId],
  )

  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="arcade-meta-label">Valoración</p>
      <p
        className="arcade-hint flex items-center gap-1"
        aria-label={
          stats.count > 0
            ? `Promedio ${stats.average.toFixed(1)} de 5 con ${stats.count} votos`
            : 'Sin votos'
        }
      >
        {stats.count > 0 ? (
          <>
            <span>{stats.average.toFixed(1)}</span>
            <Star
              className="h-3.5 w-3.5 text-[#ffd319]"
              fill="#ffd319"
              aria-hidden="true"
            />
            <span>({stats.count})</span>
          </>
        ) : (
          'Sin votos'
        )}
      </p>
    </div>
  )
}

export default GameRating
