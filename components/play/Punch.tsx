'use client'

import { useEffect } from 'react'

import { punchToday, readBook, writeBook } from '@/lib/game/member'

/**
 * החתמת המשבצת — stamps today's slot in the member book when a run ends.
 *
 * Mounted by every result screen. Without it gate 10 is decoration: a punch card that
 * nothing punches. It fires once per day whatever you play and however many runs you
 * finish, because the card records that you TURNED UP, not how much you scored — which
 * is the whole distinction the handoff draws between a member book and a scoreboard.
 *
 * Renders nothing. It is an effect with a name, kept as a component so every result
 * screen picks it up by adding one line rather than by remembering to call a hook.
 */
export function Punch() {
  useEffect(() => {
    const book = readBook()
    const punched = punchToday(book)
    if (punched !== book) writeBook(punched)
  }, [])
  return null
}
