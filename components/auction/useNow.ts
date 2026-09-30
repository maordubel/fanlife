'use client'

import { useEffect, useState } from 'react'

/**
 * השעון של המסך — `Date.now()` שמתעדכן כל שנייה, ונעצר כשהלשונית מוסתרת.
 * `null` עד הרינדור הראשון בדפדפן, כדי שהשרת והדפדפן לא יחלקו על השנייה (hydration).
 */
export function useNow(every = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const tick = () => setNow(Date.now())
    const start = () => {
      tick()
      if (timer === null) timer = setInterval(tick, every)
    }
    const stop = () => {
      if (timer !== null) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => (document.hidden ? stop() : start())
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [every])
  return now
}
