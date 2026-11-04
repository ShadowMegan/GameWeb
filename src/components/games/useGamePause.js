import { useCallback, useEffect, useRef, useState } from 'react'

const isUserTyping = (target) => {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    Boolean(target.isContentEditable)
  )
}

export function useGamePause(isActive, pauseRequested = false) {
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [interrupted, setInterrupted] = useState(() => document.hidden)
  const isPaused =
    isActive && (manuallyPaused || interrupted || pauseRequested)
  const pausedRef = useRef(isPaused)
  pausedRef.current = isPaused

  const togglePause = useCallback(() => {
    if (!isActive || pauseRequested) {
      return
    }
    if (pausedRef.current) {
      setInterrupted(false)
      setManuallyPaused(false)
    } else {
      setManuallyPaused(true)
    }
  }, [isActive, pauseRequested])

  useEffect(() => {
    if (!isActive) {
      setManuallyPaused(false)
      setInterrupted(false)
      return undefined
    }

    function interrupt() {
      setInterrupted(true)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        interrupt()
      }
    }

    window.addEventListener('blur', interrupt)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', interrupt)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) {
      return undefined
    }

    function handleKeyDown(event) {
      if (isUserTyping(event.target)) return
      if (
        pauseRequested ||
        event.repeat ||
        (event.key !== 'Escape' && event.key.toLowerCase() !== 'p')
      ) {
        return
      }
      event.preventDefault()
      togglePause()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, pauseRequested, togglePause])

  return { isPaused, pausedRef, togglePause }
}
