'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { parseTelegramVisit, rememberTelegramVisit, TELEGRAM_MEMORY_KEY, type TelegramVisit } from '@/lib/telegram/memory'
import { TELEGRAM_GAMES, telegramGameHref } from '@/lib/telegram/routes'

type Club = { id: string; name: string; games: string[] }
export function TelegramReturn({ clubs, selected, choose = false }: { clubs: Club[]; selected?: string; choose?: boolean }) {
  const [visit, setVisit] = useState<TelegramVisit | null>(null)
  useEffect(() => {
    try {
      if (selected) rememberTelegramVisit(window.localStorage, selected)
      setVisit(parseTelegramVisit(window.localStorage.getItem(TELEGRAM_MEMORY_KEY)))
    } catch { /* The club picker is available even without local storage. */ }
  }, [selected])
  const club = clubs.find(c => c.id === visit?.club)
  if (selected || choose || !club) return null
  const game = TELEGRAM_GAMES.find(g => g.key === visit?.game && club.games.includes(g.key))
  return <section className="tg-return wk-panel" aria-label="Your last visit">
    <p className="wk-k">WELCOME BACK TO THE STAND</p>
    <h2>Back to {club.name}?</h2>
    <div className="tg-return-actions">
      <Link className="wk-btn" href={`/telegram?club=${club.id}`}>Open your club ↗</Link>
      {game && <Link className="tg-text-link" href={telegramGameHref(club.id, game.key)!}>Open {game.title} →</Link>}
      <button className="tg-text-link" onClick={() => { try { window.localStorage.removeItem(TELEGRAM_MEMORY_KEY) } catch {} setVisit(null) }}>Forget this preference</button>
    </div>
  </section>
}
