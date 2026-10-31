const GAME_COMMENTS_KEY = 'gameweb:game-comments'
const GAME_COMMENTS_EVENT = 'gameweb:game-comments:updated'

export const GAME_COMMENT_MAX_LENGTH = 400

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

function readAllComments() {
  if (!canUseStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(GAME_COMMENTS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

function persistComments(comments) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(GAME_COMMENTS_KEY, JSON.stringify(comments))
  } catch {
    return
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GAME_COMMENTS_EVENT))
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `gc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function readGameComments(gameId) {
  const all = readAllComments()
  const comments = all[gameId]
  if (!Array.isArray(comments)) {
    return []
  }
  return [...comments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export function addGameComment(gameId, user, message) {
  if (!gameId || !user?.dni) {
    return { error: 'Debes iniciar sesión para comentar.' }
  }

  const trimmed = message.trim()
  if (!trimmed) {
    return { error: 'Escribe tu opinión antes de publicar.' }
  }

  const all = readAllComments()
  const comments = Array.isArray(all[gameId]) ? all[gameId] : []
  const comment = {
    id: createId(),
    userId: user.dni,
    username: user.username,
    name: user.name,
    date: new Date().toISOString(),
    message: trimmed.slice(0, GAME_COMMENT_MAX_LENGTH),
  }

  persistComments({ ...all, [gameId]: [comment, ...comments] })
  return { comment }
}

export function deleteGameComments(gameId) {
  const all = readAllComments()
  if (!(gameId in all)) {
    return
  }
  const next = { ...all }
  delete next[gameId]
  persistComments(next)
}

export function deleteUserGameComments(userId) {
  if (!userId) {
    return
  }
  const all = readAllComments()
  let changed = false
  const next = {}

  Object.entries(all).forEach(([gameId, comments]) => {
    if (!Array.isArray(comments)) {
      return
    }
    const filtered = comments.filter((comment) => comment.userId !== userId)
    if (filtered.length !== comments.length) {
      changed = true
    }
    if (filtered.length > 0) {
      next[gameId] = filtered
    }
  })

  if (changed) {
    persistComments(next)
  }
}

export function subscribeGameComments(gameId, listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => listener(readGameComments(gameId))
  const handleStorage = (event) => {
    if (event.key === GAME_COMMENTS_KEY) {
      notify()
    }
  }

  window.addEventListener(GAME_COMMENTS_EVENT, notify)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(GAME_COMMENTS_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}
