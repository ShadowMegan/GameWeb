import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Brain,
  Eraser,
  Filter,
  Gamepad2,
  LogOut,
  Puzzle,
  Rocket,
  Search,
  Trophy,
  User,
} from 'lucide-react'
import { GAMES, GAME_CATEGORIES } from '../data/games.js'
import { readHighScore } from '../lib/scores.js'
import GameShell from './games/GameShell.jsx'
import RetroSnake from './games/RetroSnake.jsx'
import NeonTetris from './games/NeonTetris.jsx'
import CyberPacman from './games/CyberPacman.jsx'
import BlockGridPuzzle from './games/BlockGridPuzzle.jsx'

const searchInputClass = 'arcade-input w-full pl-12 pr-4 py-3'
const chipBase =
  'border-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest'
const sortSelectClass =
  'arcade-input px-3 py-1.5 font-mono text-xs uppercase tracking-widest'

const CATEGORY_STORAGE_KEY = 'gameweb:catalog:category'
const SORT_STORAGE_KEY = 'gameweb:catalog:sort'

const SORT_OPTIONS = [
  { value: 'az', label: 'Nombre A-Z' },
  { value: 'za', label: 'Nombre Z-A' },
]
const SORT_VALUES = SORT_OPTIONS.map((option) => option.value)

const CATEGORY_ICONS = {
  Arcade: Gamepad2,
  Acción: Rocket,
  Puzzle: Puzzle,
  Estrategia: Brain,
}

const GAME_VIEWS = {
  'retro-snake': RetroSnake,
  'neon-tetris': NeonTetris,
  'cyber-pacman': CyberPacman,
  'block-grid-puzzle': BlockGridPuzzle,
}

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function readStoredFilter(key, validValues, fallback) {
  try {
    const stored = window.localStorage.getItem(key)
    return validValues.includes(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

function storeFilter(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

function getInitials(user) {
  const parts = (user.name || user.username || '?').split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function GameCard({ game, highScore, onPlay }) {
  const Icon = CATEGORY_ICONS[game.category] ?? Gamepad2

  return (
    <li
      className="arcade-card flex flex-col p-4"
      style={{
        borderColor: `${game.accent}55`,
        boxShadow: `0 0 16px ${game.accent}33, inset 0 0 24px rgba(18, 0, 43, 0.6)`,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="inline-flex h-10 w-10 items-center justify-center"
          style={{
            border: `2px solid ${game.accent}`,
            background: `${game.accent}1f`,
            boxShadow: `0 0 10px ${game.accent}66`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: game.accent }} aria-hidden="true" />
        </span>
        <span
          className={chipBase}
          style={{ borderColor: `${game.accent}55`, color: game.accent }}
        >
          {game.category}
        </span>
      </div>

      <h3
        className="mb-1 text-lg leading-snug text-white"
        style={{ textShadow: `0 0 8px ${game.accent}` }}
      >
        {game.name}
      </h3>

      <p className="mb-3 text-sm leading-relaxed text-[#d9c8ff]">
        {game.description}
      </p>

      <p className="arcade-meta-label mb-1">Cómo se juega</p>
      <p className="text-sm leading-relaxed text-[#b9f7ff]">{game.howTo}</p>

      <p className="arcade-meta-label mt-3 flex items-center gap-1.5">
        <Trophy
          className="h-3.5 w-3.5 text-[#ffd319]"
          aria-hidden="true"
        />{' '}
        Puntaje máximo:{' '}
        <span className="text-[#ffd319]">{highScore}</span>
      </p>

      <button
        type="button"
        aria-label={`Jugar ${game.name}`}
        onClick={onPlay}
        className="arcade-btn arcade-btn-secondary arcade-btn-sm mt-4 flex items-center justify-center gap-2"
      >
        <Gamepad2 className="h-4 w-4" aria-hidden="true" />
        JUGAR
      </button>
    </li>
  )
}

function EmptyCatalog({ query, category, onReset }) {
  return (
    <div
      className="arcade-card flex flex-col items-center gap-4 p-10 text-center"
      role="status"
      aria-live="polite"
    >
      <AlertCircle
        className="h-12 w-12 text-[#ff4d6d]"
        strokeWidth={2}
        aria-hidden="true"
      />
      <h3 className="arcade-title">CATÁLOGO NO ENCONTRADO</h3>
      <p className="max-w-sm text-sm leading-relaxed text-[#d9c8ff]">
        No hay juegos para{' '}
        <span className="text-white">“{query || 'cualquier término'}”</span> en la
        categoría <span className="text-white">“{category}”</span>. Revisa la
        escritura o prueba con: Arcade, Acción, Puzzle, Estrategia.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
      >
        <Eraser className="h-4 w-4" aria-hidden="true" /> Limpiar búsqueda
      </button>
    </div>
  )
}

function GameCatalog({ user, onEditProfile, onLogout }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(() =>
    readStoredFilter(CATEGORY_STORAGE_KEY, GAME_CATEGORIES, 'Todos'),
  )
  const [sortOrder, setSortOrder] = useState(() =>
    readStoredFilter(SORT_STORAGE_KEY, SORT_VALUES, 'az'),
  )
  const [activeGame, setActiveGame] = useState(null)
  const [highScores, setHighScores] = useState(() =>
    Object.fromEntries(GAMES.map((game) => [game.id, readHighScore(game.id)])),
  )

  useEffect(() => {
    storeFilter(CATEGORY_STORAGE_KEY, category)
  }, [category])

  useEffect(() => {
    storeFilter(SORT_STORAGE_KEY, sortOrder)
  }, [sortOrder])

  const handleScore = useCallback((gameId, score) => {
    setHighScores((previous) => {
      if ((previous[gameId] ?? 0) >= score) {
        return previous
      }
      return { ...previous, [gameId]: score }
    })
  }, [])

  function closeGame() {
    setActiveGame(null)
    setHighScores(
      Object.fromEntries(
        GAMES.map((game) => [game.id, readHighScore(game.id)]),
      ),
    )
  }

  const filteredGames = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim())
    const matches = GAMES.filter((game) => {
      const matchesCategory = category === 'Todos' || game.category === category
      if (!matchesCategory) {
        return false
      }
      if (!normalizedQuery) {
        return true
      }
      return [game.name, game.category, game.description, game.howTo].some(
        (field) => normalizeText(field).includes(normalizedQuery),
      )
    })

    return [...matches].sort((a, b) =>
      sortOrder === 'za'
        ? b.name.localeCompare(a.name, 'es')
        : a.name.localeCompare(b.name, 'es'),
    )
  }, [query, category, sortOrder])

  function resetFilters() {
    setQuery('')
    setCategory('Todos')
    setSortOrder('az')
  }

  return (
    <div className="animate-fade-slide flex flex-col gap-5">
      <div className="arcade-card flex flex-wrap items-center gap-4 p-4">
        <div className="arcade-avatar flex h-12 w-12 items-center justify-center text-base font-bold">
          {getInitials(user)}
        </div>
        <div className="min-w-0">
          <p className="arcade-profile-name truncate">{user.name}</p>
          <p className="arcade-hint truncate">
            @{user.username} · DNI {user.dni}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEditProfile}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
          >
            <User className="h-4 w-4" aria-hidden="true" /> Mi perfil
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </div>

      {activeGame ? (
        (() => {
          const activeGameData = GAMES.find((game) => game.id === activeGame)
          const GameView = GAME_VIEWS[activeGame]
          if (!activeGameData || !GameView) {
            return null
          }
          return (
            <GameShell game={activeGameData} onExit={closeGame}>
              <GameView onScore={(score) => handleScore(activeGame, score)} />
            </GameShell>
          )
        })()
      ) : (
        <>
          <div>
            <label htmlFor="catalog-search" className="arcade-label mb-2 block">
              Buscar juegos o categorías
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ff2e88]"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                name="query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ejemplo: snake o arcade"
                className={searchInputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="arcade-meta-label flex items-center gap-1.5 pr-1">
              <Filter className="h-4 w-4" aria-hidden="true" /> Filtrar
            </span>
            {GAME_CATEGORIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                aria-pressed={category === option}
                className={`arcade-tab ${category === option ? 'arcade-tab-active' : ''}`}
              >
                {option}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <label
                htmlFor="catalog-sort"
                className="arcade-meta-label flex items-center gap-1.5"
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden="true" /> Ordenar
              </label>
              <select
                id="catalog-sort"
                name="sortOrder"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className={sortSelectClass}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="arcade-hint" aria-live="polite">
            {filteredGames.length === GAMES.length
              ? 'Todos los juegos de la sala'
              : `${filteredGames.length} juego(s) encontrados`}
          </p>

          {filteredGames.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  highScore={highScores[game.id] ?? 0}
                  onPlay={() => setActiveGame(game.id)}
                />
              ))}
            </ul>
          ) : (
            <EmptyCatalog
              query={query}
              category={category}
              onReset={resetFilters}
            />
          )}
        </>
      )}
    </div>
  )
}

export default GameCatalog
