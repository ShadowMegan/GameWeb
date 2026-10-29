const PREFIX = 'gameweb:score:'

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
