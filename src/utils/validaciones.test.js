import { it, expect } from 'vitest';
import { esCorreoValido, esClaveValida } from './validaciones';
import { validarLogin } from '../../auth.js';
import { validateGameForm } from '../lib/catalog.js';
import { submitGameReview } from '../lib/reviews.js';
import { toggleFavorite } from '../lib/favorites.js';

it('esCorreoValido', () => {
  expect(esCorreoValido('ana@correo.com')).toBe(true);
});

it('esClaveValida', () => {
  expect(esClaveValida('a'.repeat(12))).toBe(true);
});

it('validarLogin', () => {
  expect(validarLogin('ana@correo.com', '123456789012')).toBe(true);
});

it('validateGameForm', () => {
  const form = {
    name: 'Neon Runner',
    category: 'Arcade',
    description: 'Un juego arcade de velocidad y reflejos.',
    howTo: 'Usa las flechas para moverte y superar los obstáculos.',
    accent: '#00e5ff',
  };

  expect(validateGameForm(form, [])).toEqual({});
});

it('submitGameReview', () => {
  const result = submitGameReview(
    'neon-tetris',
    {
      dni: 'demo-001',
      username: 'jugador_demo',
      name: 'Jugador Demo',
    },
    {
      stars: 5,
      message: 'Excelente juego de prueba.',
    },
  );

  expect(result.review).toMatchObject({
    userId: 'demo-001',
    stars: 5,
    message: 'Excelente juego de prueba.',
  });
});

it('toggleFavorite', () => {
  expect(toggleFavorite('demo-001', 'neon-tetris')).toEqual([]);
});