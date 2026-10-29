import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, Send, Star } from 'lucide-react'
import {
  MAX_MESSAGE_LENGTH,
  createComment,
  formatDate,
  loadComments,
  saveComments,
} from '../lib/comments.js'
import { containsBadWords, getBadWordsErrorMessage } from '../lib/badWords.js'

const EMPTY_FORM = { user: '', message: '', stars: 5 }

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Puntuación">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          onClick={() => onChange(star)}
          className="star-btn"
          data-on={star <= value || undefined}
        >
          <Star
            className="h-6 w-6"
            fill={star <= value ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  )
}

function CommunityComments({ sessionUser }) {
  const [comments, setComments] = useState(loadComments)
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    saveComments(comments)
  }, [comments])

  const averageStars = useMemo(() => {
    if (comments.length === 0) return 0
    const total = comments.reduce((sum, comment) => sum + comment.stars, 0)
    return (total / comments.length).toFixed(1)
  }, [comments])

  const resolvedUser = sessionUser?.username ?? form.user

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.message.trim()) {
      setStatus({ type: 'error', message: 'Escribe un mensaje antes de publicar.' })
      return
    }
    if (!resolvedUser.trim()) {
      setStatus({ type: 'error', message: 'Ingresa tu nombre de usuario.' })
      return
    }

    const badWordsError = containsBadWords(resolvedUser) || containsBadWords(form.message)
    if (badWordsError) {
      setStatus({ type: 'error', message: getBadWordsErrorMessage() })
      return
    }

    const comment = createComment({
      user: resolvedUser,
      stars: form.stars,
      message: form.message,
    })
    setComments((prev) => [comment, ...prev])
    setForm({ ...EMPTY_FORM, user: form.user })
    setStatus({
      type: 'success',
      message: '¡Comentario publicado correctamente!',
    })
  }

  return (
    <section
      className="arcade-card mt-6 w-full p-5"
      aria-labelledby="community-comments-title"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="community-comments-title" className="arcade-profile-name flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#ffd319]" aria-hidden="true" />
          Comentarios de la Comunidad
        </h2>
        {comments.length > 0 && (
          <p className="arcade-meta-label">
            {comments.length} comentario{comments.length > 1 ? 's' : ''} · Promedio{' '}
            <span className="text-[#ffd319]">{averageStars} ★</span>
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="comment-user" className="arcade-label mb-2 block">
            Usuario
          </label>
          <input
            id="comment-user"
            name="user"
            type="text"
            value={resolvedUser}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, user: event.target.value }))
            }
            disabled={Boolean(sessionUser)}
            placeholder="Tu nombre de jugador"
            maxLength={30}
            className="arcade-input w-full px-4 py-3"
          />
        </div>

        <div>
          <span className="arcade-label mb-2 block">Puntuación</span>
          <StarPicker
            value={form.stars}
            onChange={(stars) => setForm((prev) => ({ ...prev, stars }))}
          />
        </div>

        <div>
          <label htmlFor="comment-message" className="arcade-label mb-2 block">
            Tu opinión sobre el diseño
          </label>
          <textarea
            id="comment-message"
            name="message"
            value={form.message}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, message: event.target.value }))
            }
            placeholder="Cuéntanos qué te parecen los fondos, colores y efectos neón..."
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            className="arcade-input w-full resize-none px-4 py-3"
          />
          <p className="arcade-hint mt-1 text-right">
            {form.message.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>

        {status && (
          <p
            className={`arcade-message ${
              status.type === 'success'
                ? 'arcade-message-success'
                : 'arcade-message-error'
            }`}
            role="status"
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          className="arcade-btn arcade-btn-primary arcade-btn-sm w-full"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Publicar comentario
        </button>
      </form>

      {comments.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="arcade-subcard p-3">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="arcade-meta-label text-white">{comment.user}</p>
                <p className="arcade-hint text-xs">
                  {formatDate(comment.date)}
                </p>
              </div>
              <div className="mb-1 flex items-center gap-0.5" aria-label={`${comment.stars} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-3.5 w-3.5 text-[#ffd319]"
                    fill={star <= comment.stars ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="arcade-meta-value text-sm text-[#d9c8ff]">
                {comment.message}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="arcade-hint mt-4 text-center">
          Sé el primero en comentar el diseño de GameWeb.
        </p>
      )}
    </section>
  )
}

export default CommunityComments
