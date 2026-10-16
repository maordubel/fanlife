import Link from 'next/link'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { Shell } from '@/components/master/Shell'
import { Plate } from '@/components/weekly/Plate'
import { Badge } from '@/components/clubs/Badge'
import { TelegramReturn } from '@/components/telegram/TelegramReturn'
import { livery, wearLivery } from '@/lib/club-livery'
import { readState } from '@/lib/master/store'
import { REGISTRY } from '@/lib/master/registry'
import { loadClub } from '@/lib/clubs/resolver'
import { gateAvailability } from '@/lib/clubs/gates'
import { gateAccess } from '@/lib/clubs/access'
import { clubTheme, themeStyle, rivalBans } from '@/lib/clubs/theme'
import { TELEGRAM_GAMES, telegramGameHref } from '@/lib/telegram/routes'

export const dynamic = 'force-dynamic'

export default async function TelegramHome({ searchParams }: { searchParams: { club?: string; choose?: string } }) {
  const state = await readState()
  // Use the site's public read policy, including its approved published/last-good fallback.
  // An unavailable write store must not close games the same public site can still serve.
  const candidates = REGISTRY.filter(reg => state.clubs.some(c => c.id === reg.id && c.status === 'live'))
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
    <header className="tg-cover wk-panel">
      <div className="tg-masthead"><p className="wk-k">THE TELEGRAM EDITION</p><span className="wk-k">FOOTBALL. FOREVER.</span></div>
      <div className="tg-cover-plate">
        <Plate art={selected ? 'kicker' : 'cheer'} ink={selected ? 'club' : 'red'} className="tg-cover-art" />
        <div className="tg-cover-copy"><Image unoptimized className="tg-seal" src={selected ? '/brand/fanlife/logo-mono.webp' : '/brand/fanlife/logo-192.png'} width={72} height={72} alt="FAN LIFE" />
          <p className="wk-k">{selected ? 'YOUR CLUB. YOUR COLOURS.' : 'THE WHOLE TERRACE. IN YOUR POCKET.'}</p>
          <h1>{selected ? selected.reg.name : <>YOUR CLUB.<br />YOUR CALL.</>}</h1>
          <p>{selected ? 'Take your place. Pick your game.' : 'The quiz. The debate. Your all-time XI.'}</p>
        </div>
      </div>
      <p className="tg-cover-strip wk-k">{selected ? 'ONE CLUB. A LIFETIME OF OPINIONS.' : `${clubs.length} CLUB${clubs.length === 1 ? '' : 'S'} READY TO PLAY · PICK YOUR COLOURS BELOW`}</p>
    </header>
    <TelegramReturn clubs={clubs.map(({reg,games}) => ({id:reg.id,name:reg.name,games:games.map(g=>g.key)}))} selected={selected?.reg.id} choose={searchParams.choose === '1'} />
    {selected ? <>
      <Link href="/telegram?choose=1" className="tg-switch">← Choose another club</Link>
      <section className="tg-games" aria-label={`${selected.reg.name} games`}>
        {selected.games.map(game => <Link prefetch={false} key={game.key} className="tg-game wk-panel wk-lift" href={telegramGameHref(selected.reg.id, game.key)!}>
          <span className="tg-number wk-num">{String(game.number).padStart(2, '0')}</span>
          <span><h2>{game.title}</h2><p>{game.description}</p></span><b aria-hidden="true">↗</b>
        </Link>)}
      </section>
    </> : <section aria-labelledby="tg-clubs-title">
      <div className="tg-section-title"><h2 id="tg-clubs-title">Pick your colours.</h2><span className="wk-k">YOUR STAND IS WAITING</span></div>
      <div className="tg-clubs">
      {clubs.map(({ reg, games }) => <Link prefetch={false} className="tg-club wk-panel wk-lift" style={wearLivery(livery(reg.id))} key={reg.id} href={`/telegram?club=${reg.id}`}>
        <Badge club={reg} /><span className="tg-club-copy"><strong>{reg.name}</strong><small>{games.length} games · Step inside ↗</small></span>
      </Link>)}
      {!clubs.length && <p role="status">No clubs have playable Telegram games yet. Please check back soon.</p>}
      </div>
    </section>}
    <aside className="tg-note">Play as a guest. Your progress stays on this device.</aside>
    <footer className="tg-footer"><a href="https://fanlife.dubelteam.com" target="_blank" rel="noopener noreferrer">FanLife.DubelTeam.com</a><span>FOOTBALL. FOREVER.</span></footer>
  </main></Shell>
}
