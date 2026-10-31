// Sistema de almacenamiento global de valoraciones y comentarios

const STORAGE_KEY_COMMENTS = 'gameweb_global_comments';
const STORAGE_KEY_RATINGS = 'gameweb_global_ratings';

// Obtener todos los comentarios globales
export function getGlobalComments(gameId) {
  const allComments = JSON.parse(localStorage.getItem(STORAGE_KEY_COMMENTS) || '[]');
  if (!gameId) return allComments;
  return allComments.filter(c => c.gameId === gameId);
}

// Obtener promedio y conteo de estrellas por juego
export function getGameRatingStats(gameId) {
  const allRatings = JSON.parse(localStorage.getItem(STORAGE_KEY_RATINGS) || '[]');
  const gameRatings = allRatings.filter(r => r.gameId === gameId);
  
  if (gameRatings.length === 0) {
    return { average: 0, total: 0 };
  }
  
  const sum = gameRatings.reduce((acc, curr) => acc + curr.stars, 0);
  const average = (sum / gameRatings.length).toFixed(1);
  return { average: parseFloat(average), total: gameRatings.length };
}

// Guardar o actualizar reseña unificada (Estrellas + Comentario)
export function saveGameReview(gameId, user, stars, text) {
  if (!user || !gameId) return false;

  const timestamp = new Date().toISOString();

  // 1. Guardar/Actualizar Rating
  let allRatings = JSON.parse(localStorage.getItem(STORAGE_KEY_RATINGS) || '[]');
  const existingRatingIndex = allRatings.findIndex(r => r.gameId === gameId && r.username === user.username);
  
  if (existingRatingIndex >= 0) {
    allRatings[existingRatingIndex].stars = stars;
    allRatings[existingRatingIndex].updatedAt = timestamp;
  } else {
    allRatings.push({ gameId, username: user.username, stars, createdAt: timestamp });
  }
  localStorage.setItem(STORAGE_KEY_RATINGS, JSON.stringify(allRatings));

  // 2. Guardar Comentario si contiene texto
  if (text && text.trim() !== '') {
    let allComments = JSON.parse(localStorage.getItem(STORAGE_KEY_COMMENTS) || '[]');
    const newComment = {
      id: Date.now().toString(),
      gameId,
      username: user.username,
      text: text.trim(),
      stars,
      createdAt: timestamp
    };
    allComments.unshift(newComment);
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(allComments));
  }

  // Notificar a otras pestañas/componentes
  window.dispatchEvent(new Event('storage'));
  return true;
}