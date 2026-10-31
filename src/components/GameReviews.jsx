import { useEffect, useState } from 'react'
import { MessageSquare, Send, Star, UserRound } from 'lucide-react'
import {
  REVIEW_MAX_LENGTH,
  calculateReviewStats,
  readGameReviews,
  readUserReview,
  submitGameReview,
  subscribeGameReviews,
} from '../lib/reviews.js'
import { formatDate } from '../lib/comments.js'
import { containsBadWords, getBadWordsErrorMessage } from '../lib/badWords.js'

const STARS = [1, 2, 3, 4, 5]

function ReviewStars({ stars, size = 'md' }) {
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${stars} de 5 estrellas`}
    >
      {STARS.map((value) => {
        const active = value <= stars
        return (
          <Star
            key={value}
            className={starClass}
            style={{ color: active ? '#ffd319' : '#6b5b8f' }}
            fill={active ? '#ffd319' : 'none'}
            aria-hidden="true"
          />
        )
      })}
    </span>
  )
}

function GameReviews({ gameId, gameName, user }) {
  const [reviews, setReviews] = useState(() => readGameReviews(gameId))
  const initialReview = readUserReview(gameId, user?.dni)
  const [stars, setStars] = useState(initialReview?.stars || 0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [message, setMessage] = useState(initialReview?.message || '')
  const [status, setStatus] = useState(null)

  useEffect(
    () => subscribeGameReviews(gameId, setReviews),
    [gameId],
  )

  const stats = calculateReviewStats(reviews)
  const hasUserReview = reviews.some((review) => review.userId === user?.dni)
  const activeStars = hoveredStar || stars

  function handleSubmit(event) {
    event.preventDefault()

    if (!stars) {
      setStatus({
        type: 'error',
        message: 'Selecciona una calificación de 1 a 5 estrellas.',
      })
      return
    }

    if (!message.trim()) {
      setStatus({
        type: 'error',
        message: 'Escribe tu reseña antes de publicar.',
      })
      return
    }

    if (containsBadWords(message)) {
      setStatus({ type: 'error', message: getBadWordsErrorMessage() })
      return
    }

    const result = submitGameReview(gameId, user, { stars, message })
    if (result.error) {
      setStatus({ type: 'error', message: result.error })
      return
    }

    setStatus({
      type: 'success',
      message: hasUserReview
        ? 'Tu reseña se actualizó correctamente.'
        : 'Tu reseña se publicó correctamente.',
    })
  }

  return (
    <section
      className="arcade-card p-4"
      aria-labelledby={`game-reviews-title-${gameId}`}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          id={`game-reviews-title-${gameId}`}
          className="arcade-profile-name flex items-center gap-2"
        >
          <MessageSquare
            className="h-5 w-5 text-[#ffd319]"
            aria-hidden="true"
          />
          Reseñas de {gameName}
        </h2>
        <span className="arcade-hint">
          {stats.count > 0
            ? `${stats.average.toFixed(1)} ★ (${stats.count})`
            : 'Sin votos'}
        </span>
      </header>

      {user?.dni ? (
        <form
          onSubmit={handleSubmit}
          className="arcade-subcard space-y-3 p-3"
          noValidate
        >
          <div>
            <p className="arcade-label mb-2">Deja tu opinión</p>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label={`Calificar ${gameName}`}
              onMouseLeave={() => setHoveredStar(0)}
            >
              {STARS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={stars === value}
                  aria-label={`${value} estrella${value > 1 ? 's' : ''}`}
                  onMouseEnter={() => setHoveredStar(value)}
                  onFocus={() => setHoveredStar(value)}
                  onBlur={() => setHoveredStar(0)}
                  onClick={() => {
                    setStars(value)
                    setStatus(null)
                  }}
                  className="star-btn"
                  data-on={value <= activeStars || undefined}
                >
                  <Star
                    className="h-5 w-5"
                    fill={value <= activeStars ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <span className="arcade-hint ml-2">
                {stars > 0 ? `${stars}/5` : 'Elige tu puntuación'}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor={`game-review-${gameId}`}
                className="arcade-label"
              >
                Tu reseña
              </label>
              <span className="arcade-hint">
                {message.length}/{REVIEW_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id={`game-review-${gameId}`}
              name="message"
              rows="3"
              maxLength={REVIEW_MAX_LENGTH}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                setStatus(null)
              }}
              placeholder="¿Qué te pareció este juego?"
              className="arcade-input w-full resize-none px-4 py-3"
            />
          </div>

          {status && (
            <p
              role={status.type === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={`arcade-message ${
                status.type === 'error'
                  ? 'arcade-message-error'
                  : 'arcade-message-success'
              }`}
            >
              {status.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {hasUserReview ? 'Actualizar reseña' : 'Publicar reseña'}
            </button>
          </div>
        </form>
      ) : (
        <p className="arcade-hint">
          Inicia sesión para publicar una reseña.
        </p>
      )}

      {reviews.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {reviews.map((review) => {
            const isMine = review.userId === user?.dni
            return (
              <li key={review.id} className="arcade-subcard p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <UserRound
                        className="h-3.5 w-3.5 text-[#00e5ff]"
                        aria-hidden="true"
                      />
                      @{review.username}
                    </p>
                    {isMine && (
                      <span className="arcade-chip">Tu reseña</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ReviewStars stars={review.stars} size="sm" />
                    <p className="arcade-hint">{formatDate(review.date)}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-[#d9c8ff]">
                  {review.message}
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="arcade-hint mt-4">
          Todavía no hay reseñas. ¡Sé el primero en opinar!
        </p>
      )}
    </section>
  )
}

export default GameReviews
