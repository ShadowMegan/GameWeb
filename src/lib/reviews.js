const REVIEWS_KEY = 'gameweb:game-reviews'
const REVIEWS_EVENT = 'gameweb:game-reviews:updated'
const LEGACY_COMMENTS_KEY = 'gameweb:game-comments'
const LEGACY_RATINGS_KEY = 'gameweb:ratings'

export const REVIEW_MAX_LENGTH = 400

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `gr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseStoredObject(raw) {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

function normalizeReview(review) {
  if (!review || typeof review !== 'object') {
    return null
  }

  const userId = String(review.userId || '').trim()
  if (!userId) {
    return null
  }

  const numericStars = Number(review.stars)
  const stars = Number.isFinite(numericStars)
    ? Math.min(5, Math.max(0, Math.round(numericStars)))
    : 0
  const date = review.date || new Date().toISOString()

  return {
    id: review.id || createId(),
    userId,
    username: String(review.username || 'jugador'),
    name: String(review.name || 'Jugador'),
    stars,
    message: String(review.message || '').slice(0, REVIEW_MAX_LENGTH),
    date,
    updatedAt: review.updatedAt || date,
  }
}

function migrateLegacyReviews() {
  const comments = parseStoredObject(
    window.localStorage.getItem(LEGACY_COMMENTS_KEY),
  )
  const ratings = parseStoredObject(
    window.localStorage.getItem(LEGACY_RATINGS_KEY),
  )
  const hasComments = Object.keys(comments).length > 0
  const hasRatings = Object.keys(ratings).length > 0

  if (!hasComments && !hasRatings) {
    return {}
  }

  const migrated = {}

  Object.entries(comments).forEach(([gameId, list]) => {
    if (!Array.isArray(list)) {
      return
    }
    const gameRatings = ratings[gameId] || {}
    migrated[gameId] = list
      .map((comment) =>
        normalizeReview({
          ...comment,
          stars: gameRatings[comment.userId],
          updatedAt: comment.date,
        }),
      )
      .filter(Boolean)
  })

  try {
    window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(migrated))
  } catch {
    return {}
  }

  return migrated
}

function readAllReviews() {
  if (!canUseStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(REVIEWS_KEY)
    if (!raw) {
      return migrateLegacyReviews()
    }
    return parseStoredObject(raw)
  } catch {
    return {}
  }
}

function persistReviews(reviews) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
  } catch {
    return
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REVIEWS_EVENT))
  }
}

export function calculateReviewStats(reviews) {
  const values = reviews
    .map((review) => Number(review.stars))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5)
  const count = values.length
  const average =
    count > 0 ? values.reduce((total, value) => total + value, 0) / count : 0

  return { average, count }
}

export function readGameReviews(gameId) {
  const all = readAllReviews()
  const reviews = all[gameId]
  if (!Array.isArray(reviews)) {
    return []
  }

  return reviews
    .map(normalizeReview)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
}

export function readGameReviewStats(gameId) {
  return calculateReviewStats(readGameReviews(gameId))
}

export function readUserReview(gameId, userId) {
  if (!userId) {
    return null
  }
  return readGameReviews(gameId).find((review) => review.userId === userId) ?? null
}

export function submitGameReview(gameId, user, { stars, message }) {
  if (!gameId || !user?.dni) {
    return { error: 'Debes iniciar sesión para publicar una reseña.' }
  }

  const numericStars = Number(stars)
  if (!Number.isFinite(numericStars) || numericStars < 1 || numericStars > 5) {
    return { error: 'Selecciona una calificación de 1 a 5 estrellas.' }
  }

  const trimmed = String(message || '').trim()
  if (!trimmed) {
    return { error: 'Escribe tu reseña antes de publicar.' }
  }

  const all = readAllReviews()
  const gameReviews = Array.isArray(all[gameId]) ? all[gameId] : []
  const existing = gameReviews.find((review) => review.userId === user.dni)
  const now = new Date().toISOString()
  const review = normalizeReview({
    id: existing?.id || createId(),
    userId: user.dni,
    username: user.username,
    name: user.name,
    stars: Math.round(numericStars),
    message: trimmed,
    date: existing?.date || now,
    updatedAt: now,
  })

  const nextGameReviews = existing
    ? gameReviews.map((item) => (item.userId === user.dni ? review : item))
    : [review, ...gameReviews]

  persistReviews({ ...all, [gameId]: nextGameReviews })
  return { review }
}

export function deleteGameReviews(gameId) {
  const all = readAllReviews()
  if (!(gameId in all)) {
    return
  }
  const next = { ...all }
  delete next[gameId]
  persistReviews(next)
}

export function deleteUserGameReviews(userId) {
  if (!userId) {
    return
  }

  const all = readAllReviews()
  let changed = false
  const next = {}

  Object.entries(all).forEach(([gameId, reviews]) => {
    if (!Array.isArray(reviews)) {
      return
    }
    const filtered = reviews.filter((review) => review.userId !== userId)
    if (filtered.length !== reviews.length) {
      changed = true
    }
    if (filtered.length > 0) {
      next[gameId] = filtered
    }
  })

  if (changed) {
    persistReviews(next)
  }
}

export function subscribeGameReviews(gameId, listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => listener(readGameReviews(gameId))
  const handleStorage = (event) => {
    if (event.key === REVIEWS_KEY) {
      notify()
    }
  }

  window.addEventListener(REVIEWS_EVENT, notify)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(REVIEWS_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}
