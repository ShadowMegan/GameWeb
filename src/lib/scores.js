const PREFIX = 'gameweb:score:'
const PROGRESS_PREFIX = 'gameweb:progress:'

export function readHighScore(gameId) {
  try {
    const parsed = Number(window.localStorage.getItem(`${PREFIX}${gameId}`))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

export function saveHighScore(gameId, score) {
  if (!Number.isFinite(score) || score <= 0) {
    return
  }
  try {
    window.localStorage.setItem(`${PREFIX}${gameId}`, String(score))
  } catch {
    return
  }
}

export function readProgress(gameId) {
  try {
    const raw = window.localStorage.getItem(`${PROGRESS_PREFIX}${gameId}`)
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

export function saveProgress(gameId, progress) {
  try {
    window.localStorage.setItem(
      `${PROGRESS_PREFIX}${gameId}`,
      JSON.stringify({ ...progress, savedAt: new Date().toISOString() }),
    )
  } catch {
    return
  }
}
