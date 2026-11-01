import { GAMES, GAME_CATEGORIES } from '../data/games.js'
import { deleteGameReviews } from './reviews.js'

export const CATALOG_STORAGE_KEY = 'gameweb:catalog:games'
export const CATALOG_EVENT = 'gameweb:catalog:updated'

export const GAME_ACCENTS = [
  '#00e5ff',
  '#ffd319',
  '#ff2e88',
  '#8a2be2',
  '#39ff14',
  '#ff7a18',
  '#00ff41',
]

export const COMMUNITY_CATEGORIES = GAME_CATEGORIES.filter(
  (category) => category !== 'Todos',
)

const NAME_MAX_LENGTH = 48
const DESCRIPTION_MAX_LENGTH = 200
const HOW_TO_MAX_LENGTH = 240
const BUILT_IN_IDS = new Set(GAMES.map((game) => game.id))

const TEAM_AUTHOR = {
  name: 'Equipo GameWeb',
  username: 'gameweb',
  dni: 'gameweb-team',
  role: 'admin',
}

const SEED_CATALOG = GAMES.map((game) => ({
  ...game,
  engine: 'builtin',
  builtIn: true,
  accent: game.accent || GAME_ACCENTS[0],
  author: TEAM_AUTHOR,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}))

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

function normalizeGame(game) {
  const builtIn = BUILT_IN_IDS.has(game.id)
  return {
    ...game,
    engine: game.engine || (builtIn ? 'builtin' : 'reaction'),
    builtIn,
    author: game.author || TEAM_AUTHOR,
    accent: game.accent || GAME_ACCENTS[0],
  }
}

function readStoredCatalog() {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeGame) : null
  } catch {
    return null
  }
}

function persistCatalog(games, notify = true) {
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(games))
    } catch {
      // Si el almacenamiento está bloqueado, la vista mantiene los datos en memoria.
    }
  }

  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATALOG_EVENT))
  }
}

export function readCatalog() {
  const stored = readStoredCatalog()
  if (stored) {
    return stored
  }
  persistCatalog(SEED_CATALOG, false)
  return SEED_CATALOG.map(normalizeGame)
}

export function subscribeCatalog(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => listener(readCatalog())
  const handleStorage = (event) => {
    if (event.key === CATALOG_STORAGE_KEY) {
      notify()
    }
  }

  window.addEventListener(CATALOG_EVENT, notify)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(CATALOG_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}

export function normalizeGameName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function slugify(value) {
  return normalizeGameName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function createUniqueId(name, games) {
  const base = slugify(name) || 'elemento'
  const existingIds = new Set(games.map((game) => game.id))
  if (!existingIds.has(base)) {
    return base
  }

  let index = 2
  let candidate = `${base}-${index}`
  while (existingIds.has(candidate)) {
    index += 1
    candidate = `${base}-${index}`
  }
  return candidate
}

export function canManageGame(game, user) {
  if (!game || !user) {
    return false
  }
  if (user.role === 'admin') {
    return true
  }
  return Boolean(game.author?.dni) && game.author.dni === user.dni
}

export function validateGameForm(form, games, editingId = '') {
  const errors = {}
  const name = form.name.trim()
  const description = form.description.trim()
  const howTo = form.howTo.trim()
  const normalizedName = normalizeGameName(name)

  if (!name) {
    errors.name = 'El nombre del elemento es obligatorio.'
  } else if (name.length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres.'
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`
  } else if (
    games.some(
      (game) =>
        game.id !== editingId &&
        normalizeGameName(game.name) === normalizedName,
    )
  ) {
    errors.name = 'Ya existe un elemento del catálogo con ese nombre.'
  }

  if (!form.category) {
    errors.category = 'Selecciona una categoría.'
  } else if (!COMMUNITY_CATEGORIES.includes(form.category)) {
    errors.category = 'La categoría seleccionada no es válida.'
  }

  if (!description) {
    errors.description = 'La descripción es obligatoria.'
  } else if (description.length < 10) {
    errors.description = 'La descripción debe tener al menos 10 caracteres.'
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`
  }

  if (!howTo) {
    errors.howTo = 'Indica cómo se juega.'
  } else if (howTo.length < 10) {
    errors.howTo = 'Las instrucciones deben tener al menos 10 caracteres.'
  } else if (howTo.length > HOW_TO_MAX_LENGTH) {
    errors.howTo = `Las instrucciones no pueden superar los ${HOW_TO_MAX_LENGTH} caracteres.`
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(form.accent || '')) {
    errors.accent = 'Elige un color de acento válido.'
  }

  return errors
}

function buildGamePayload(form) {
  return {
    name: form.name.trim(),
    category: form.category,
    accent: form.accent,
    description: form.description.trim(),
    howTo: form.howTo.trim(),
  }
}

export function addGame(form, author) {
  if (!author || !author.dni || !author.username) {
    return { error: 'Debes iniciar sesión para publicar un juego.' }
  }

  const games = readCatalog()
  const errors = validateGameForm(form, games)
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const now = new Date().toISOString()
  const game = {
    id: createUniqueId(form.name, games),
    ...buildGamePayload(form),
    engine: 'reaction',
    builtIn: false,
    author: {
      name: author.name,
      username: author.username,
      dni: author.dni,
      role: author.role || 'user',
    },
    createdAt: now,
    updatedAt: now,
  }

  persistCatalog([...games, game])
  return { game }
}

export function updateGame(gameId, form, actor) {
  const games = readCatalog()
  const target = games.find((game) => game.id === gameId)

  if (!target) {
    return { error: 'El elemento ya no existe en el catálogo.' }
  }
  if (!canManageGame(target, actor)) {
    return { error: 'No tienes permisos para editar este elemento.' }
  }

  const errors = validateGameForm(form, games, gameId)
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const updatedGame = {
    ...target,
    ...buildGamePayload(form),
    editedBy: {
      name: actor.name,
      username: actor.username,
      dni: actor.dni,
    },
    updatedAt: new Date().toISOString(),
  }

  persistCatalog(
    games.map((game) => (game.id === gameId ? updatedGame : game)),
  )
  return { game: updatedGame }
}

export function deleteGame(gameId, actor) {
  const games = readCatalog()
  const target = games.find((game) => game.id === gameId)

  if (!target) {
    return { error: 'El elemento ya no existe en el catálogo.' }
  }
  if (!canManageGame(target, actor)) {
    return { error: 'No tienes permisos para eliminar este elemento.' }
  }

  persistCatalog(games.filter((game) => game.id !== gameId))
  deleteGameReviews(gameId)
  return { game: target }
}
