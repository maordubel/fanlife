import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Shell } from '@/components/master/Shell'
import { readState, stateUnavailable } from '@/lib/master/store'
import { REGISTRY } from '@/lib/master/registry'
import { loadClub } from '@/lib/clubs/resolver'
import { gateAvailability } from '@/lib/clubs/gates'
import { gateAccess } from '@/lib/clubs/access'
import { clubTheme, themeStyle, rivalBans } from '@/lib/clubs/theme'
import { TELEGRAM_GAMES, telegramGameHref } from '@/lib/telegram/routes'

export const dynamic = 'force-dynamic'

export default async function TelegramHome({ searchParams }: { searchParams: { club?: string } }) {
  const state = await readState()
  const unavailable = stateUnavailable()
  // No evaluation shortcut: Telegram exposes only live, genuinely playable gates.
  const candidates = unavailable ? [] : REGISTRY.filter(reg => state.clubs.some(c => c.id === reg.id && c.status === 'live'))
  const clubs = (await Promise.all(candidates.map(async reg => {
    const control = state.clubs.find(c => c.id === reg.id)!
    const core = await loadClub(reg.id).catch(() => null)
    if (!core) return null
    const games = TELEGRAM_GAMES.filter(game => gateAccess(control, game.number, false).allowed && gateAvailability(core.data, game.key).playable)
    return games.length ? { reg, games } : null
  }))).filter((club): club is NonNullable<typeof club> => club !== null)
  const selected = clubs.find(club => club.reg.id === searchParams.club)
  const theme = selected ? clubTheme(selected.reg) : null

  return <Shell theme={theme ?? undefined} locale="en"><main id="main" className="tg-lobby" style={theme ? themeStyle(theme, 'en') as CSSProperties : undefined} data-rival-no={theme ? rivalBans(theme).join(' ') : undefined}>
    <header className="tg-cover">
      {/* eslint-disable-next-line @next/next/no-img-element -- exact existing brand asset */}
      <img src="/brand/fanlife/logo-mono.webp" width={112} height={112} alt="FAN LIFE — Football. Forever." />
      <p className="tg-issue">THE TELEGRAM EDITION · NO. 01</p>
      <h1>{selected ? selected.reg.name : <>YOUR CLUB.<br />YOUR CALL.</>}</h1>
      <p>{selected ? 'The same games. The same club. A new way in.' : 'Pick your colours. Bring your opinions. Pass it on.'}</p>
    </header>
    {selected ? <>
      <Link href="/telegram" className="tg-switch">← Choose another club</Link>
      <section className="tg-games" aria-label={`${selected.reg.name} games`}>
        {selected.games.map(game => <Link prefetch={false} key={game.key} className="tg-game" href={telegramGameHref(selected.reg.id, game.key)!}>
          <span className="tg-number">{String(game.number).padStart(2, '0')}</span>
          <span><h2>{game.title}</h2><p>{game.description}</p></span><b aria-hidden="true">↗</b>
        </Link>)}
      </section>
    </> : <section className="tg-clubs" aria-label="Choose your club">
      {clubs.map(({ reg, games }) => <Link prefetch={false} className="tg-club" key={reg.id} href={`/telegram?club=${reg.id}`}>
        <span>{reg.initials}</span><strong>{reg.name}</strong><small>{games.length} games ↗</small>
      </Link>)}
      {!clubs.length && <p role="status">{unavailable ? 'The club list is temporarily unavailable. Please try again shortly.' : 'No clubs have playable Telegram games yet. Please check back soon.'}</p>}
    </section>}
    <aside className="tg-note">Games and club content are shared with the main site. Telegram verification does not automatically link an existing Fan Life account. Guest progress stays in this browser; cross-device account linking is not included in this first release.</aside>
    <footer className="tg-footer"><a href="https://fanlife.dubelteam.com" target="_blank" rel="noopener noreferrer">FanLife.DubelTeam.com</a><span>FOOTBALL. FOREVER.</span></footer>
  </main></Shell>
}
