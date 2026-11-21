// Catálogo ficticio de juegos (datos de prueba) para la sala GameWeb.
// Juegos arcade con estética retro, incluyendo Pong.
export const GAME_CATEGORIES = ['Todos', 'Arcade', 'Acción', 'Puzzle', 'Estrategia']

export const GAMES = [
  {
    id: 'neon-flappy',
    name: 'Neon Flappy',
    category: 'Arcade',
    accent: '#00ffa3',
    description:
      'Pilot un dron neón a través de tuberías luminosas y supera el mayor número de huecos posible.',
    howTo:
      'Presiona ESPACIO, haz clic izquierdo o toca la pantalla para impulsarte. Esquiva las tuberías y suma 1 punto por cada obstáculo superado. El puntaje queda registrado en tu perfil.',
  },
  {
    id: 'retro-snake',
    name: 'Retro Snake',
    category: 'Arcade',
    accent: '#00e5ff',
    description:
      "El clásico del gusanito: guíalo con las teclas W, A, S, D o las flechas y consume las manzanas que aparecen al azar en el tablero.",
    howTo:
      'Mueve con W A S D o FLECHAS. Cada manzana suma 10 puntos; si chocas contra el borde o tu cuerpo, pierdes. Tu mejor marca queda registrada en tu perfil.',
  },
  {
    id: 'neon-tetris',
    name: 'Neon Tetris',
    category: 'Puzzle',
    accent: '#ffd319',
    description:
      "El clásico de bloques que caen: acomoda las piezas para formar líneas horizontales completas y hacerlas desaparecer.",
    howTo:
      'Mueve con FLECHAS, rota con ARRIBA y suelta con ESPACIO. Elimina líneas para sumar puntos que se registran en tu perfil.',
  },
  {
    id: 'cyber-pacman',
    name: 'Cyber Pacman',
    category: 'Acción',
    accent: '#ff2e88',
    description:
      'Laberinto arcade: evadas a los drones enemigos mientras recolectas los puntos repartidos por el circuito.',
    howTo:
      'Muévete con W A S D o FLECHAS. Cada punto suma 10. Tienes 3 vidas; si un dron te alcanza pierdes una. Tu marcador queda registrado en tu perfil.',
  },
  {
    id: 'block-grid-puzzle',
    name: 'Block Grid Puzzle',
    category: 'Estrategia',
    accent: '#8a2be2',
    description:
      'Rompecabezas de bloques laterales: coloca piezas generadas al azar en la retícula y completa líneas para liberar espacio.',
    howTo:
      'Elige una pieza y haz clic en una celda para colocarla. Completa filas o columnas para liberarlas y sumar puntos. Tu marcador queda registrado en tu perfil.',
  },
  {
    id: 'pong',
    name: 'Neon Pong',
    category: 'Arcade',
    accent: '#39ff14',
    description:
      'El duelo de paletas más clásico: devuelve la pelota, conserva tus 3 vidas y suma puntos en una mesa de neón.',
    howTo:
      'Mueve tu paleta con W / S, las FLECHAS o arrastrando sobre la mesa. Empiezas con 3 vidas y ganas 100 puntos por cada pelota que pasa la paleta del bot. Pierdes una vida si el bot devuelve el balón detrás de tu paleta.',
  },
]
