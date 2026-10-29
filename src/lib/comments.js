const COMMENTS_KEY = 'gameweb:comments'
const MAX_MESSAGE_LENGTH = 400

const FALLBACK_COMMENTS = [
  {
    id: 'demo-1',
    user: 'pixel_master',
    date: '2026-01-10T12:00:00.000Z',
    stars: 5,
    message:
      'El diseño me transporta directo a un arcade de los 80. El tema Synthwave con el Tetris es una locura.',
  },
  {
    id: 'demo-2',
    user: 'neon_ghost',
    date: '2026-01-12T09:30:00.000Z',
    stars: 4,
    message:
      'Muy buena ambientación neón. Me gustaría ver más juegos cooperativos en el catálogo.',
  },
]

export function loadComments() {
  try {
    const raw = window.localStorage.getItem(COMMENTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
    saveComments(FALLBACK_COMMENTS)
    return FALLBACK_COMMENTS
  } catch {
    return FALLBACK_COMMENTS
  }
}

export function saveComments(comments) {
  try {
    window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments))
  } catch {
    // almacenamiento bloqueado: la lista vive solo en memoria
  }
}

export function createComment({ user, stars, message }) {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: user.trim() || 'Invitado',
    date: new Date().toISOString(),
    stars: Math.min(5, Math.max(1, Math.round(stars))),
    message: message.trim().slice(0, MAX_MESSAGE_LENGTH),
  }
}

export function formatDate(isoDate) {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate))
  } catch {
    return isoDate
  }
}

export { MAX_MESSAGE_LENGTH }
