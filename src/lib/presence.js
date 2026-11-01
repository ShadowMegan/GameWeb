const PRESENCE_KEY = 'gameweb:presence'
const PRESENCE_EVENT = 'gameweb:presence:updated'

export const ONLINE_WINDOW_MS = 45000

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

export function readPresence() {
  if (!canUseStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(PRESENCE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

function persistPresence(presence) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(presence))
  } catch {
    return
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRESENCE_EVENT))
  }
}

export function markUserOnline(userId) {
  if (!userId) {
    return
  }
  const presence = readPresence()
  persistPresence({ ...presence, [userId]: Date.now() })
}

export function markUserOffline(userId) {
  if (!userId) {
    return
  }
  const presence = readPresence()
  if (!(userId in presence)) {
    return
  }
  const next = { ...presence }
  delete next[userId]
  persistPresence(next)
}

export function isUserOnline(userId, presence = readPresence()) {
  const lastSeen = Number(presence[userId])
  if (!Number.isFinite(lastSeen) || lastSeen <= 0) {
    return false
  }
  return Date.now() - lastSeen < ONLINE_WINDOW_MS
}

export function subscribePresence(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => listener(readPresence())
  const handleStorage = (event) => {
    if (event.key === PRESENCE_KEY) {
      notify()
    }
  }

  window.addEventListener(PRESENCE_EVENT, notify)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(PRESENCE_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}
