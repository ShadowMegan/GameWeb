// Catálogo ficticio de juegos (datos de prueba) para la sala GameWeb.
// Un juego por cada categoría del sistema: Arcade, Acción, Puzzle y Estrategia.
export const GAME_CATEGORIES = ['Todos', 'Arcade', 'Acción', 'Puzzle', 'Estrategia']

export const GAMES = [
  {
    id: 'retro-snake',
    name: 'Retro Snake',
    category: 'Arcade',
    accent: '#00e5ff',
    description:
      "El clásico del gusanito: guíalo con las teclas W, A, S, D o las flechas y consume las manzanas que aparecen al azar en el tablero.",
    howTo:
      'Mueve con W A S D o FLECHAS. Cada manzana suma 10 puntos; si chocas contra el borde o tu cuerpo, pierdes. El récord se guarda en localStorage.',
  },
  {
    id: 'neon-tetris',
    name: 'Neon Tetris',
    category: 'Puzzle',
    accent: '#ffd319',
    description:
      "El clásico de bloques que caen: acomoda las piezas para formar líneas horizontales completas y hacerlas desaparecer.",
    howTo:
      'Mueve con FLECHAS, rota con ARRIBA y suelta con ESPACIO. Elimina líneas para sumar puntos que se guardan en localStorage.',
  },
  {
    id: 'cyber-pacman',
    name: 'Cyber Pacman',
    category: 'Acción',
    accent: '#ff2e88',
    description:
      'Laberinto arcade: evadas a los drones enemigos mientras recolectas los puntos repartidos por el circuito.',
    howTo:
      'Muévete con W A S D o FLECHAS. Cada punto suma 10. Tienes 3 vidas; si un dron te alcanza pierdes una. Ten 3 vidas y el marcador se guarda en localStorage.',
  },
  {
    id: 'block-grid-puzzle',
    name: 'Block Grid Puzzle',
    category: 'Estrategia',
    accent: '#8a2be2',
    description:
      'Rompecabezas de bloques laterales: coloca piezas generadas al azar en la retícula y completa líneas para liberar espacio.',
    howTo:
      'Elige una pieza y haz clic en una celda para colocarla. Completa filas o columnas para liberarlas y sumar puntos. El marcador se guarda en localStorage.',
  },
]
