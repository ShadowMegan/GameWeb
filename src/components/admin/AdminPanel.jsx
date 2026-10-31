import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Gamepad2,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import {
  addGame,
  deleteGame,
  readCatalog,
  subscribeCatalog,
  updateGame,
} from '../../lib/catalog.js'
import {
  clearGameFavorites,
  readFavoriteStats,
  subscribeFavoriteStats,
} from '../../lib/favorites.js'
import { readHighScore, readPlayedGames } from '../../lib/scores.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import GameFormModal from './GameFormModal.jsx'

function AdminStatus({ status }) {
  if (!status) {
    return null
  }

  const isError = status.type === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`arcade-message ${
        isError ? 'arcade-message-error' : 'arcade-message-success'
      }`}
    >
      {isError ? (
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      ) : (
        <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <p>{status.message}</p>
    </div>
  )
}

function AdminPanel({ user, users = {}, onBack }) {
  const [games, setGames] = useState(() => readCatalog())
  const [favoriteStats, setFavoriteStats] = useState(() => readFavoriteStats())
  const [formOpen, setFormOpen] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [clearFavoritesTarget, setClearFavoritesTarget] = useState(null)
  const [status, setStatus] = useState(null)

  useEffect(() => subscribeCatalog(setGames), [])
  useEffect(() => subscribeFavoriteStats(setFavoriteStats), [])

  const favoriteTotal = useMemo(
    () => Object.values(favoriteStats).reduce((total, count) => total + count, 0),
    [favoriteStats],
  )

  const favoriteGames = useMemo(
    () =>
      games
        .map((game) => ({ game, count: favoriteStats[game.id] || 0 }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count),
    [games, favoriteStats],
  )

  const communityCount = games.filter((game) => !game.builtIn).length

  function openCreateForm() {
    setEditingGame(null)
    setFormOpen(true)
  }

  function openEditForm(game) {
    setEditingGame(game)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingGame(null)
  }

  function handleFormSubmit(form) {
    if (editingGame) {
      const result = updateGame(editingGame.id, form, user)
      if (result.errors) {
        return result.errors
      }
      if (result.error) {
        setStatus({ type: 'error', message: result.error })
        return {}
      }
      setStatus({
        type: 'success',
        message: `"${result.game.name}" se actualizó correctamente.`,
      })
      closeForm()
      return {}
    }

    const result = addGame(form, user)
    if (result.errors) {
      return result.errors
    }
    if (result.error) {
      setStatus({ type: 'error', message: result.error })
      return {}
    }
    setStatus({
      type: 'success',
      message: `"${result.game.name}" se agregó al catálogo público.`,
    })
    closeForm()
    return {}
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return
    }
    const result = deleteGame(deleteTarget.id, user)
    if (result.error) {
      setStatus({ type: 'error', message: result.error })
    } else {
      clearGameFavorites(deleteTarget.id)
      setStatus({
        type: 'success',
        message: `"${result.game.name}" se eliminó del catálogo.`,
      })
    }
    setDeleteTarget(null)
  }

  function confirmClearFavorites() {
    if (!clearFavoritesTarget) {
      return
    }
    clearGameFavorites(clearFavoritesTarget.id)
    setStatus({
      type: 'success',
      message: `Se reiniciaron los favoritos de "${clearFavoritesTarget.name}".`,
    })
    setClearFavoritesTarget(null)
  }

  return (
    <div className="animate-fade-slide flex flex-col gap-5">
      <div className="arcade-card flex flex-wrap items-center gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="arcade-logo h-11 w-11 shrink-0">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="arcade-profile-name truncate">Panel de administración</p>
            <p className="arcade-hint truncate">
              @{user.username} · rol administrador
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={onBack}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ver catálogo
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Agregar elemento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="arcade-subcard p-3">
          <p className="arcade-meta-label">Elementos</p>
          <p className="arcade-meta-value mt-1 text-lg">{games.length}</p>
        </div>
        <div className="arcade-subcard p-3">
          <p className="arcade-meta-label">De la comunidad</p>
          <p className="arcade-meta-value mt-1 text-lg">{communityCount}</p>
        </div>
        <div className="arcade-subcard p-3">
          <p className="arcade-meta-label">Categorías</p>
          <p className="arcade-meta-value mt-1 text-lg">
            {new Set(games.map((game) => game.category)).size}
          </p>
        </div>
        <div className="arcade-subcard p-3">
          <p className="arcade-meta-label">Favoritos</p>
          <p className="arcade-meta-value mt-1 text-lg">{favoriteTotal}</p>
        </div>
      </div>

      <AdminStatus status={status} />

      <section className="arcade-card p-4" aria-labelledby="admin-catalog-title">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2
            id="admin-catalog-title"
            className="arcade-profile-name flex items-center gap-2"
          >
            <Gamepad2 className="h-5 w-5 text-[#00e5ff]" aria-hidden="true" />
            Elementos del catálogo
          </h2>
          <span className="arcade-hint">{games.length} registro(s)</span>
        </header>

        <div className="overflow-x-auto">
          <table className="arcade-table w-full">
            <thead>
              <tr>
                <th scope="col">Elemento</th>
                <th scope="col">Autor</th>
                <th scope="col">Origen</th>
                <th scope="col">Favoritos</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td className="arcade-table-cell">
                    <p className="font-bold text-white">{game.name}</p>
                    <span
                      className="arcade-chip mt-1"
                      style={{
                        borderColor: `${game.accent}55`,
                        color: game.accent,
                      }}
                    >
                      {game.category}
                    </span>
                  </td>
                  <td className="arcade-table-cell">
                    <p className="text-white">{game.author?.name}</p>
                    <p className="arcade-hint">@{game.author?.username}</p>
                  </td>
                  <td className="arcade-table-cell">
                    {game.builtIn ? 'Base' : 'Comunidad'}
                  </td>
                  <td className="arcade-table-cell">
                    {favoriteStats[game.id] || 0}
                  </td>
                  <td className="arcade-table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(game)}
                        className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(game)}
                        className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="arcade-card p-4"
        aria-labelledby="admin-favorites-title"
      >
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2
            id="admin-favorites-title"
            className="arcade-profile-name flex items-center gap-2"
          >
            <Star className="h-5 w-5 text-[#ffd319]" aria-hidden="true" />
            Favoritos de la comunidad
          </h2>
          <span className="arcade-hint">{favoriteTotal} marca(s)</span>
        </header>

        {favoriteGames.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {favoriteGames.map(({ game, count }) => (
              <li
                key={game.id}
                className="arcade-subcard flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-white">{game.name}</p>
                  <p className="arcade-hint">{count} usuario(s)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setClearFavoritesTarget(game)}
                  className="arcade-btn arcade-btn-secondary arcade-btn-sm shrink-0"
                >
                  Limpiar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="arcade-hint">
            Todavía no hay favoritos registrados por los jugadores.
          </p>
        )}
      </section>

      <section className="arcade-card p-4" aria-labelledby="admin-users-title">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2
            id="admin-users-title"
            className="arcade-profile-name flex items-center gap-2"
          >
            <Users className="h-5 w-5 text-[#00e5ff]" aria-hidden="true" />
            Usuarios registrados
          </h2>
          <span className="arcade-hint">
            {Object.values(users).length} cuenta(s)
          </span>
        </header>

        <div className="overflow-x-auto">
          <table className="arcade-table w-full">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">DNI</th>
                <th scope="col">Récords</th>
                <th scope="col">Juegos jugados</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(users).map((account) => {
                const totalScore = games.reduce(
                  (total, game) =>
                    total + readHighScore(account.dni, game.id),
                  0,
                )
                const playedIds = readPlayedGames(account.dni)
                const playedGames = games.filter((game) =>
                  playedIds.includes(game.id),
                )
                return (
                  <tr key={account.dni}>
                    <td className="arcade-table-cell">
                      <p className="text-white">{account.name}</p>
                      <p className="arcade-hint">@{account.username}</p>
                    </td>
                    <td className="arcade-table-cell">{account.dni}</td>
                    <td className="arcade-table-cell">
                      {totalScore > 0 ? (
                        <span className="arcade-table-score">
                          <Trophy
                            className="h-3.5 w-3.5 text-[#ffd319]"
                            aria-hidden="true"
                          />
                          {totalScore} pts
                        </span>
                      ) : (
                        'Sin récords'
                      )}
                    </td>
                    <td className="arcade-table-cell">
                      {playedGames.length > 0
                        ? playedGames.map((game) => (
                            <span
                              key={game.id}
                              className="arcade-table-game-tag"
                            >
                              {game.name}
                            </span>
                          ))
                        : 'Ninguno'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen && (
        <GameFormModal
          key={editingGame?.id || 'new-game'}
          game={editingGame}
          games={games}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ELIMINAR ELEMENTO"
          message={`¿Seguro que quieres eliminar "${deleteTarget.name}" del catálogo? Esta acción no se puede deshacer y también se borrarán sus favoritos.`}
          confirmLabel="Eliminar"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {clearFavoritesTarget && (
        <ConfirmDialog
          title="LIMPIAR FAVORITOS"
          message={`¿Quieres quitar "${clearFavoritesTarget.name}" de la lista de favoritos de todos los jugadores?`}
          confirmLabel="Limpiar favoritos"
          tone="warning"
          onConfirm={confirmClearFavorites}
          onCancel={() => setClearFavoritesTarget(null)}
        />
      )}
    </div>
  )
}

export default AdminPanel
