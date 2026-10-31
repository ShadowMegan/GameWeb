const PREFIX = 'gameweb:user'
const FAVORITES_EVENT = 'gameweb:favorites:updated'

function favoritesKey(userId) {
  return `${PREFIX}:${userId || 'anonimo'}:favorites`
}

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

function notifyFavorites() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT))
  }
}

export function readFavorites(userId) {
  if (!canUseStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(favoritesKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((gameId) => typeof gameId === 'string')
      : []
  } catch {
    return []
  }
}

export function isFavorite(userId, gameId) {
  return readFavorites(userId).includes(gameId)
}

export function toggleFavorite(userId, gameId) {
  if (!canUseStorage() || !gameId) {
    return readFavorites(userId)
  }

  const current = readFavorites(userId)
  const next = current.includes(gameId)
    ? current.filter((id) => id !== gameId)
    : [...current, gameId]

  try {
    window.localStorage.setItem(favoritesKey(userId), JSON.stringify(next))
  } catch {
    return current
  }

  notifyFavorites()
  return next
}

export function readFavoriteStats() {
  const stats = {}
  if (!canUseStorage()) {
    return stats
  }

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(`${PREFIX}:`) || !key.endsWith(':favorites')) {
        continue
      }
      const raw = window.localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : []
      if (!Array.isArray(parsed)) {
        continue
      }
      parsed.forEach((gameId) => {
        if (typeof gameId === 'string') {
          stats[gameId] = (stats[gameId] || 0) + 1
        }
      })
    }
  } catch {
    return stats
  }

  return stats
}

export function clearGameFavorites(gameId) {
  if (!canUseStorage() || !gameId) {
    return 0
  }

  let cleared = 0
  const keysToUpdate = []

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(`${PREFIX}:`) || !key.endsWith(':favorites')) {
        continue
      }
      const raw = window.localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed) && parsed.includes(gameId)) {
        keysToUpdate.push({
          key,
          next: parsed.filter((id) => id !== gameId),
        })
      }
    }

    keysToUpdate.forEach(({ key, next }) => {
      window.localStorage.setItem(key, JSON.stringify(next))
      cleared += 1
    })
  } catch {
    return cleared
  }

  if (cleared > 0) {
    notifyFavorites()
  }
  return cleared
}

export function subscribeFavorites(userId, listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => listener(readFavorites(userId))
  const handleStorage = (event) => {
    if (event.key === favoritesKey(userId) || event.key === null) {
      notify()
    }
  }

  window.addEventListener(FAVORITES_EVENT, notify)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(FAVORITES_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}

export function subscribeFavoriteStats(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => listener(readFavoriteStats())
  const handleStorage = (event) => {
    if (event.key === null || event.key.includes(':favorites')) {
      notify()
    }
  }

  window.addEventListener(FAVORITES_EVENT, notify)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(FAVORITES_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}
