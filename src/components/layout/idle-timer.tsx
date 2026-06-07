'use client'

import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'

const IDLE_MS = 15 * 60 * 1000
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

export function IdleTimer() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => signOut({ callbackUrl: '/login' }), IDLE_MS)
    }

    reset()
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    return () => {
      if (timer.current) clearTimeout(timer.current)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])

  return null
}
