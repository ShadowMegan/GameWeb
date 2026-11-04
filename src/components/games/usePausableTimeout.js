import { useEffect, useRef } from 'react'

export function usePausableTimeout(callback, delay, active, isPaused) {
  const callbackRef = useRef(callback)
  const remainingRef = useRef(delay)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!active) {
      remainingRef.current = delay
      return undefined
    }
    if (isPaused) {
      return undefined
    }

    const remaining = remainingRef.current
    const deadline = Date.now() + remaining
    const timer = window.setTimeout(() => {
      remainingRef.current = delay
      callbackRef.current()
    }, remaining)

    return () => {
      window.clearTimeout(timer)
      remainingRef.current = Math.max(0, deadline - Date.now())
    }
  }, [active, delay, isPaused])
}
