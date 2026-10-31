import { deleteCommentsByUser } from './comments.js'
import { clearUserFavorites } from './favorites.js'
import { markUserOffline } from './presence.js'
import { deleteUserGameReviews } from './reviews.js'
import { deleteUserScores } from './scores.js'

export function purgeUserAccountData(userId, username) {
  if (!userId) {
    return
  }

  deleteUserScores(userId)
  clearUserFavorites(userId)
  deleteUserGameReviews(userId)
  markUserOffline(userId)

  if (username) {
    deleteCommentsByUser(username)
  }
}
