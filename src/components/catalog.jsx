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
  Save,
  Search,
  Trophy,
  User,
  X,
} from 'lucide-react'
import { GAMES, GAME_CATEGORIES } from '../data/games.js'
import {
  markGamePlayed,
  readHighScore,
  readProgress,
  saveHighScore,
  saveProgress,
} from '../lib/scores.js'
import GameShell from './games/GameShell.jsx'
import GameStage from './games/GameStage.jsx'
import ArcadeAvatar from './ArcadeAvatar.jsx'

const searchInputClass = 'arcade-input w-full pl-12 pr-4 py-3'
const chipBase = 'arcade-chip'
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

const ACTIVE_GAME_STATUSES = new Set(['running', 'levelup'])

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

function GameCard({ game, highScore, onPlay }) {
  const Icon = CATEGORY_ICONS[game.category] ?? Gamepad2

  return (
    <li
      className="arcade-card arcade-game-card flex h-full flex-col p-4"
      style={{ '--game-accent': game.accent }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center"
          style={{
            border: `2px solid ${game.accent}`,
            background: `${game.accent}1f`,
            boxShadow: `0 0 12px ${game.accent}66`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: game.accent }} aria-hidden="true" />
        </span>
        <span
          className={chipBase}
          style={{ borderColor: `${game.accent}55`, color: game.accent }}
        >
          {game.category}
        </span>
      </div>

      <h3 className="arcade-game-title mb-2">{game.name}</h3>

      <p className="mb-3 text-sm leading-relaxed text-[#d9c8ff]">
        {game.description}
      </p>

      <p className="arcade-meta-label mb-1">Cómo se juega</p>
      <p className="mb-4 text-sm leading-relaxed text-[#b9f7ff]">{game.howTo}</p>

      <div className="mt-auto flex flex-col gap-3 border-t border-[#8a2be255] pt-3">
        <p className="arcade-meta-label flex items-center gap-1.5">
          <Trophy
            className="h-3.5 w-3.5 shrink-0 text-[#ffd319]"
            aria-hidden="true"
          />
          Puntaje máximo:{' '}
          <span className="text-[#ffd319]">{highScore}</span>
        </p>

        <button
          type="button"
          aria-label={`Jugar ${game.name}`}
          onClick={onPlay}
          className="arcade-btn arcade-btn-secondary arcade-btn-sm w-full"
        >
          <Gamepad2 className="h-4 w-4" aria-hidden="true" />
          JUGAR
        </button>
      </div>
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

function ExitConfirmDialog({ gameName, score, onSave, onDiscard, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07030fe6] p-4"
      role="presentation"
    >
      <div
        className="arcade-panel w-full max-w-md p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-dialog-title"
        aria-describedby="exit-dialog-description"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-8 w-8 shrink-0 text-[#ffd319]"
            aria-hidden="true"
          />
          <div>
            <h2 id="exit-dialog-title" className="arcade-title text-base">
              SALIR DE LA PARTIDA
            </h2>
            <p
              id="exit-dialog-description"
              className="mt-2 text-sm leading-relaxed text-[#d9c8ff]"
            >
              Estás jugando <span className="text-white">{gameName}</span> con{' '}
              <span className="text-[#ffd319]">{score}</span> puntos. ¿Quieres
              guardar tu progreso actual antes de salir?
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center justify-center gap-2"
          >
            Salir sin guardar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" aria-hidden="true" /> Guardar y salir
          </button>
        </div>
      </div>
    </div>
  )
}

function GameCatalog({ user, onEditProfile, onLogout }) {
  const userId = user.dni
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(() =>
    readStoredFilter(CATEGORY_STORAGE_KEY, GAME_CATEGORIES, 'Todos'),
  )
  const [sortOrder, setSortOrder] = useState(() =>
    readStoredFilter(SORT_STORAGE_KEY, SORT_VALUES, 'az'),
  )
  const [activeGame, setActiveGame] = useState(null)
  const [gameSession, setGameSession] = useState({
    status: 'idle',
    score: 0,
    level: 1,
  })
  const [savedProgress, setSavedProgress] = useState(null)
  const [exitPromptOpen, setExitPromptOpen] = useState(false)
  const [pendingExitAction, setPendingExitAction] = useState('catalog')
  const [highScores, setHighScores] = useState(() =>
    Object.fromEntries(GAMES.map((game) => [game.id, readHighScore(userId, game.id)])),
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

  const handleSessionChange = useCallback((next) => {
    const normalized = {
      status: next.status ?? 'idle',
      score: next.score ?? 0,
      level: next.level ?? 1,
    }
    setGameSession((previous) => {
      if (
        previous.status === normalized.status &&
        previous.score === normalized.score &&
        previous.level === normalized.level
      ) {
        return previous
      }
      return normalized
    })
  }, [])

  const handleActiveGameScore = useCallback(
    (score) => {
      if (activeGame) {
        handleScore(activeGame, score)
      }
    },
    [activeGame, handleScore],
  )

  const inProgress = ACTIVE_GAME_STATUSES.has(gameSession.status)

  function closeGame() {
    setActiveGame(null)
    setGameSession({ status: 'idle', score: 0, level: 1 })
    setSavedProgress(null)
    setExitPromptOpen(false)
    setPendingExitAction('catalog')
    setHighScores(
      Object.fromEntries(
        GAMES.map((game) => [game.id, readHighScore(userId, game.id)]),
      ),
    )
  }

  function openGame(gameId) {
    const game = GAMES.find((candidate) => candidate.id === gameId)
    if (!game) {
      return
    }
    setActiveGame(game.id)
    setGameSession({ status: 'idle', score: 0, level: 1 })
    setSavedProgress(readProgress(userId, game.id))
    markGamePlayed(userId, game.id)
    setExitPromptOpen(false)
  }

  function performExit(action, shouldSave) {
    if (shouldSave && activeGame && gameSession.score > 0) {
      saveProgress(userId, activeGame, {
        score: gameSession.score,
        level: gameSession.level,
        status: gameSession.status,
      })
      if (gameSession.score > (highScores[activeGame] ?? 0)) {
        saveHighScore(userId, activeGame, gameSession.score)
      }
    }
    closeGame()
    if (action === 'profile') {
      onEditProfile()
    } else if (action === 'logout') {
      onLogout()
    }
  }

  function requestExit(action = 'catalog') {
    if (inProgress) {
      setPendingExitAction(action)
      setExitPromptOpen(true)
      return
    }
    performExit(action, false)
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
                <ArcadeAvatar user={user} size="sm" />
        <div className="min-w-0">
          <p className="arcade-profile-name truncate">{user.name}</p>
          <p className="arcade-hint truncate">
            @{user.username} · DNI {user.dni}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => requestExit('profile')}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
          >
            <User className="h-4 w-4" aria-hidden="true" /> Mi perfil
          </button>
          <button
            type="button"
            onClick={() => requestExit('logout')}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </div>

      {activeGame ? (
        (() => {
          const activeGameData = GAMES.find((game) => game.id === activeGame)
          if (!activeGameData) {
            return (
              <EmptyCatalog
                query={query}
                category={category}
                onReset={resetFilters}
              />
            )
          }
          return (
            <>
                <GameShell
                  game={activeGameData}
                  onExit={() => requestExit('catalog')}
                  highScore={highScores[activeGame] ?? 0}
                  savedProgress={savedProgress}
                  inProgress={inProgress}
                >
                  <GameStage
                    key={activeGameData.id}
                    game={activeGameData}
                    userId={userId}
                    onExit={() => requestExit('catalog')}
                    onScore={handleActiveGameScore}
                    onStateChange={handleSessionChange}
                  />
                </GameShell>
                {exitPromptOpen && (
                  <ExitConfirmDialog
                    gameName={activeGameData.name}
                    score={gameSession.score}
                    onSave={() => performExit(pendingExitAction, true)}
                    onDiscard={() => performExit(pendingExitAction, false)}
                    onCancel={() => setExitPromptOpen(false)}
                  />
                )}
            </>
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
            <div className="flex items-center gap-2 sm:ml-auto">
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
                  onPlay={() => openGame(game.id)}
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
