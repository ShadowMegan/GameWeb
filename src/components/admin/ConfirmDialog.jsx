import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

function ConfirmDialog({
  title = 'CONFIRMAR ACCIÓN',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const isDanger = tone === 'danger'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07030fe6] p-4"
      role="presentation"
    >
      <div
        className="arcade-panel w-full max-w-md p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`mt-0.5 h-8 w-8 shrink-0 ${
              isDanger ? 'text-[#ff4d6d]' : 'text-[#ffd319]'
            }`}
            aria-hidden="true"
          />
          <div>
            <h2 id="confirm-dialog-title" className="arcade-title text-base">
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-2 text-sm leading-relaxed text-[#d9c8ff]"
            >
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" aria-hidden="true" /> {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`arcade-btn arcade-btn-sm flex items-center justify-center gap-2 ${
              isDanger
                ? 'border-[#ff4d6d] bg-[#ff4d6d22] text-[#ff8fa3] hover:bg-[#ff4d6d33]'
                : 'arcade-btn-primary'
            }`}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />{' '}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
