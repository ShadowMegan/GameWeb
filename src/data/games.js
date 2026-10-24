// Catálogo ficticio de juegos (datos de prueba) para la HU-3.
export const GAME_CATEGORIES = ['Todos', 'Arcade', 'Acción', 'Puzzle', 'Estrategia']

export const GAMES = [
  {
    id: 'retro-runner',
    name: 'Retro Runner',
    category: 'Arcade',
    accent: '#00e5ff',
    description: 'Corre por una autopista infinita de neón y esquiva todo lo que se cruce.',
    howTo: 'Salta con ESPACIO o TOQUE. Un solo impacto y fin de la partida.',
  },
  {
    id: 'space-shooter',
    name: 'Space Shooter',
    category: 'Acción',
    accent: '#ff2e88',
    description: 'Defiende el sector ET-7 de oleadas infinitas de drones hostiles.',
    howTo: 'Muévete con las FLECHAS y dispara con Z o CLIC. Cada 5 oleadas llega un jefe.',
  },
  {
    id: 'cyber-puzzle',
    name: 'Cyber Puzzle',
    category: 'Puzzle',
    accent: '#ffd319',
    description: 'Enciende la matriz conectando nodos y cerrando el circuito completo.',
    howTo: 'Arrastra bloques con el MOUSE o desliza con el DEDO hasta unir los nodos.',
  },
  {
    id: 'pixel-tactics',
    name: 'Pixel Tactics',
    category: 'Estrategia',
    accent: '#8a2be2',
    description: 'Comanda una escuadra de 8 bits y conquista la retícula casilla a casilla.',
    howTo: 'Selecciona una unidad y muévela con CLICK. Combina piezas para atacar en cadena.',
  },
  {
    id: 'neon-drift',
    name: 'Neon Drift',
    category: 'Acción',
    accent: '#00ffa3',
    description: 'Derrapa en un circuito nocturno donde cada curva roba tu ventana de tiempo.',
    howTo: 'Gira con IZQUIERDA y DERECHA y suelta el ACELERADOR en curvas de 90°.',
  },
  {
    id: 'high-score-mayhem',
    name: 'High Score Mayhem',
    category: 'Arcade',
    accent: '#ff6ec7',
    description: 'Maratón rápida de minijuegos clásicos sin pausa ni piedad.',
    howTo: 'Sobrevive 90 segundos cambiando de juego ante cada campana. Bate tu récord.',
  },
]
