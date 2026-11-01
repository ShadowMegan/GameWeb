const PREFIX = 'gameweb:user'
const ANONYMOUS_OWNER = 'anonimo'

function resolveOwner(userId) {
  return userId ? String(userId) : ANONYMOUS_OWNER
}

function scoreKey(userId, gameId) {
  return `${PREFIX}:${resolveOwner(userId)}:score:${gameId}`
}

function progressKey(userId, gameId) {
  return `${PREFIX}:${resolveOwner(userId)}:progress:${gameId}`
}

function playedKey(userId) {
  return `${PREFIX}:${resolveOwner(userId)}:played`
}

export function readHighScore(userId, gameId) {
  try {
    const parsed = Number(window.localStorage.getItem(scoreKey(userId, gameId)))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

export function saveHighScore(userId, gameId, score) {
  if (!Number.isFinite(score) || score <= 0) {
    return
  }
  try {
    window.localStorage.setItem(scoreKey(userId, gameId), String(score))
  } catch {
    return
  }
}

export function readProgress(userId, gameId) {
  try {
    const raw = window.localStorage.getItem(progressKey(userId, gameId))
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveProgress(userId, gameId, progress) {
  try {
    window.localStorage.setItem(
      progressKey(userId, gameId),
      JSON.stringify({ ...progress, savedAt: new Date().toISOString() }),
    )
  } catch {
    return
  }
}

export function readPlayedGames(userId) {
  try {
    const raw = window.localStorage.getItem(playedKey(userId))
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((gameId) => typeof gameId === 'string')
  } catch {
    return []
  }
}

export function markGamePlayed(userId, gameId) {
  if (!gameId) {
    return
  }
  try {
    const playedGames = readPlayedGames(userId)
    if (playedGames.includes(gameId)) {
      return
    }
    window.localStorage.setItem(
      playedKey(userId),
      JSON.stringify([...playedGames, gameId]),
    )
  } catch {
    return
  }
}

export function deleteUserScores(userId) {
  try {
    const prefix = `${PREFIX}:${resolveOwner(userId)}:`
    const keys = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(prefix)) {
        keys.push(key)
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    return
  }
}
