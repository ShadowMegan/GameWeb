import { useState, useEffect, useCallback } from 'react';
import { getGlobalComments, saveGameReview } from '../lib/ratings';

export default function GameComments({ gameId, currentUser }) {
  // Inicializamos el estado directamente para evitar llamadas síncronas en el efecto
  const [comments, setComments] = useState(() => getGlobalComments(gameId));
  const [text, setText] = useState('');
  const [stars, setStars] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const loadData = useCallback(() => {
    setComments(getGlobalComments(gameId));
  }, [gameId]);

  useEffect(() => {
    // El efecto solo registra el listener para sincronización entre pestañas
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [loadData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    saveGameReview(gameId, currentUser, stars, text);
    setText('');
    setSubmitted(true);
    loadData();
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="reviews-container" style={{ marginTop: '20px', padding: '15px', border: '1px solid #00ffcc', borderRadius: '8px' }}>
      <h3>Reseñas y Opiniones</h3>

      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div>
            <label>Tu Calificación: </label>
            {[1, 2, 3, 4, 5].map((num) => (
              <span
                key={num}
                onClick={() => setStars(num)}
                style={{ cursor: 'pointer', fontSize: '20px', color: num <= stars ? '#ffcc00' : '#555' }}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué te pareció este juego?"
            rows="3"
            style={{ width: '100%', marginTop: '10px', background: '#111', color: '#fff', border: '1px solid #333', padding: '8px' }}
          />

          <button type="submit" style={{ marginTop: '10px', padding: '8px 16px', background: '#ff007f', color: '#fff', border: 'none', cursor: 'pointer' }}>
            PUBLICAR RESEÑA
          </button>

          {submitted && <p style={{ color: '#00ffcc', marginTop: '5px' }}>¡Tu opinión se publicó correctamente!</p>}
        </form>
      ) : (
        <p style={{ color: '#888' }}>Inicia sesión para dejar una valoración o comentario.</p>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p>No hay comentarios aún. ¡Sé el primero!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} style={{ borderBottom: '1px solid #222', padding: '10px 0' }}>
              <strong>@{c.username}</strong> - <span style={{ color: '#ffcc00' }}>{'★'.repeat(c.stars)}</span>
              <small style={{ float: 'right', color: '#666' }}>{new Date(c.createdAt).toLocaleDateString()}</small>
              <p style={{ margin: '5px 0 0 0' }}>{c.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}