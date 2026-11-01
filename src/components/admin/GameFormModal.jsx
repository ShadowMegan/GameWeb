import { useState } from 'react'
import { Check, Gamepad2, Pencil, X } from 'lucide-react'
import {
  COMMUNITY_CATEGORIES,
  GAME_ACCENTS,
  validateGameForm,
} from '../../lib/catalog.js'

const inputBase = 'arcade-input px-4 py-3'
const labelClass = 'arcade-label mb-2 block'
const errorText = 'arcade-error mt-1.5'

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  howTo: '',
  accent: GAME_ACCENTS[0],
}

function GameFormModal({ game, games, onSubmit, onClose }) {
  const isEditing = Boolean(game)
  const [form, setForm] = useState(() =>
    game
      ? {
          name: game.name,
          category: game.category,
          description: game.description,
          howTo: game.howTo,
          accent: game.accent,
        }
      : EMPTY_FORM,
  )
  const [errors, setErrors] = useState({})

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateGameForm(form, games, game?.id ?? '')
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const result = onSubmit(form)
    if (result && Object.keys(result).length > 0) {
      setErrors(result)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#07030fe6] p-4 sm:items-center"
      role="presentation"
    >
      <div
        className="arcade-panel my-6 w-full max-w-2xl p-5 sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-form-title"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="arcade-logo h-11 w-11 shrink-0">
              {isEditing ? (
                <Pencil className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 id="game-form-title" className="arcade-title text-base">
                {isEditing ? 'EDITAR ELEMENTO' : 'AGREGAR ELEMENTO'}
              </h2>
              <p className="arcade-hint mt-1">
                {isEditing
                  ? 'Actualiza los datos del elemento. El autor original se conserva.'
                  : 'El nuevo elemento se publicará de inmediato en el catálogo público.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="arcade-btn arcade-btn-secondary arcade-btn-sm"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isEditing && game?.author && (
          <p className="arcade-subcard mb-4 p-3 text-sm text-[#d9c8ff]">
            Autor original:{' '}
            <span className="text-white">{game.author.name}</span> · @
            {game.author.username}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="game-name" className={labelClass}>
                Nombre del elemento
              </label>
              <input
                id="game-name"
                name="name"
                type="text"
                maxLength={48}
                value={form.name}
                onChange={handleChange}
                placeholder="Ejemplo: Neon Reflex"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'game-name-error' : undefined}
                className={`${inputBase} ${errors.name ? 'arcade-input-error' : ''}`}
              />
              {errors.name && (
                <p id="game-name-error" className={errorText}>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="game-category" className={labelClass}>
                Categoría
              </label>
              <select
                id="game-category"
                name="category"
                value={form.category}
                onChange={handleChange}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={
                  errors.category ? 'game-category-error' : undefined
                }
                className={`${inputBase} ${
                  errors.category ? 'arcade-input-error' : ''
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {COMMUNITY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p id="game-category-error" className={errorText}>
                  {errors.category}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="game-description" className={labelClass}>
                Descripción
              </label>
              <span className="arcade-hint">{form.description.length}/200</span>
            </div>
            <textarea
              id="game-description"
              name="description"
              rows="3"
              maxLength={200}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe brevemente el elemento del catálogo."
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? 'game-description-error' : undefined
              }
              className={`${inputBase} resize-none ${
                errors.description ? 'arcade-input-error' : ''
              }`}
            />
            {errors.description && (
              <p id="game-description-error" className={errorText}>
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="game-how-to" className={labelClass}>
                Cómo se juega
              </label>
              <span className="arcade-hint">{form.howTo.length}/240</span>
            </div>
            <textarea
              id="game-how-to"
              name="howTo"
              rows="3"
              maxLength={240}
              value={form.howTo}
              onChange={handleChange}
              placeholder="Explica los controles y el objetivo."
              aria-invalid={Boolean(errors.howTo)}
              aria-describedby={
                errors.howTo ? 'game-how-to-error' : undefined
              }
              className={`${inputBase} resize-none ${
                errors.howTo ? 'arcade-input-error' : ''
              }`}
            />
            {errors.howTo && (
              <p id="game-how-to-error" className={errorText}>
                {errors.howTo}
              </p>
            )}
          </div>

          <div>
            <p className={labelClass}>Color de acento</p>
            <div className="flex flex-wrap items-center gap-2">
              {GAME_ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  onClick={() => setForm((previous) => ({ ...previous, accent }))}
                  aria-label={`Color ${accent}`}
                  aria-pressed={form.accent === accent}
                  className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: accent,
                    borderColor: form.accent === accent ? '#ffffff' : accent,
                    boxShadow:
                      form.accent === accent ? `0 0 14px ${accent}` : 'none',
                  }}
                />
              ))}
              <input
                type="color"
                aria-label="Color personalizado"
                value={form.accent}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    accent: event.target.value,
                  }))
                }
                className="h-9 w-12 cursor-pointer border-2 border-[#8a2be255] bg-transparent"
              />
            </div>
            {errors.accent && <p className={errorText}>{errors.accent}</p>}
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Cancelar
            </button>
            <button
              type="submit"
              className="arcade-btn arcade-btn-primary arcade-btn-sm flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {isEditing ? 'Guardar cambios' : 'Publicar elemento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GameFormModal
