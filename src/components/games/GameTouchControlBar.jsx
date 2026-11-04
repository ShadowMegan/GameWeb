import { ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'

export function useTouchControlSide() {
  const [side, setSide] = useState('left')
  const toggleSide = () => {
    setSide((current) => (current === 'left' ? 'right' : 'left'))
  }
  return [side, toggleSide]
}

export function GameTouchControlBar({ side, onToggle, children }) {
  const nextSide = side === 'left' ? 'derecho' : 'izquierdo'

  return (
    <div
      className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:hidden"
      role="group"
      aria-label="Controles táctiles"
    >
      <div
        className={`row-start-1 flex ${side === 'left' ? 'col-start-1 justify-self-start' : 'col-start-3 justify-self-end'}`}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Mover controles al lado ${nextSide}`}
        title={`Mover controles al lado ${nextSide}`}
        className="arcade-btn arcade-btn-secondary arcade-btn-sm col-start-2 row-start-1 flex h-10 w-10 items-center justify-center rounded-full p-0"
      >
        <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
