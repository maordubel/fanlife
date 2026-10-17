import Link from 'next/link'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { Suspense } from 'react'
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
import { GateCover } from '@/components/clubs/ClubGateWall'
import { PLAY_GROUPS } from '@/lib/clubs/play-groups'
import { gameCopy } from '@/lib/clubs/game-copy'
import { Contents } from '@/components/weekly/Contents'
import { clubSections, hubSections, menuClubs, menuCopy, menuCorner, menuFanLife } from '@/lib/weekly/menu'
import { lifeEntry } from '@/lib/clubs/life/entry'
import { LegendsBanner } from '@/components/legends/ClubBanner'
import type { ClubTheme } from '@/lib/clubs/theme'
import words from '@/messages/telegram/en.json'
import { belovedOf, wallNumbers } from '@/lib/clubs/beloved'
import { worldFor } from '@/lib/clubs/world'
import { contentsGates } from '@/lib/weekly/contents'
import { featuresOf } from '@/lib/features'

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
    const states = TELEGRAM_GAMES.map(game=>({key:game.key,allowed:gateAccess(control,game.number,false).allowed,playable:gateAvailability(core.data,game.key).playable}))
    return games.length ? { reg, games, states } : null
  }))).filter((club): club is NonNullable<typeof club> => club !== null)
  const selected = clubs.find(club => club.reg.id === searchParams.club)
  const theme = selected ? clubTheme(selected.reg) : null
  const copy = gameCopy('en'), menu = menuCopy('en'), corner = menuCorner('en')
  const features = featuresOf(state)
  const fanlife = menuFanLife('en').filter(item=>item.href!=='/all-football'||features.allFootball)
  const sections = selected ? clubSections(selected.reg.id, 'en', { terrace: menu.clubTabTerrace, away: null, kitArchive: true }) : hubSections('en').filter(item=>item.href!=='/all-football'||features.allFootball)
  const tiles = [{href:'/our-games',title:menu.ourGamesTitle,sub:menu.ourGamesKicker},...corner,...fanlife.filter(item=>item.href==='/all-football')]
  const beloved = selected ? belovedOf(worldFor(selected.reg).terrace,selected.games.map(g=>g.key)) : null
  const numbers = beloved ? wallNumbers(beloved) : null
  const gates = selected && beloved ? contentsGates({clubId:selected.reg.id,locale:'en',states:selected.states,beloved,copy:copy as Record<string,string>}) : undefined

  return <Shell theme={theme ?? undefined} locale="en"><main id="main" className="tg-lobby" style={theme ? themeStyle(theme, 'en') as CSSProperties : undefined} data-rival-no={theme ? rivalBans(theme).join(' ') : undefined}>
    <header className="tg-cover wk-panel">
      <div className="tg-masthead"><p className="wk-k">{words.edition}</p><Contents
        copy={{menu:menu.wkMenu,title:menu.wkContents,kicker:words.edition,close:menu.wkClose,corner:menu.wkCorner,clubs:menu.wkClubs,fanlife:menu.wkFanLife,section:menu.wkPaper,gates:menu.wkGates,quick:menu.wkQuick,deep:menu.wkDeep,archive:menu.wkArchive}}
        sections={sections} gates={gates} corner={corner} clubs={menuClubs(state.clubs.filter(c=>c.status==='live'),selected?.reg.id??null,'en',theme??undefined)} fanlife={fanlife}
        rivalNo={theme?rivalBans(theme).join(' '):undefined} paint={theme?themeStyle(theme,'en') as Record<string,string>:undefined}/></div>
      <div className="tg-cover-plate">
        <Plate art={selected ? 'kicker' : 'cheer'} ink={selected ? 'club' : 'red'} className="tg-cover-art" />
        <div className="tg-cover-copy"><Image unoptimized className="tg-seal" src={selected ? '/brand/fanlife/logo-mono.webp' : '/brand/fanlife/logo-192.png'} width={72} height={72} alt="FAN LIFE" />
          <p className="wk-k">{selected ? words.clubKicker : words.hubKicker}</p>
          <h1 style={{'--tg-title-length':selected?Math.max(8,...selected.reg.name.split(/\s+/).map(word=>word.length)):8} as CSSProperties}>{selected ? selected.reg.name : <>YOUR CLUB.<br />YOUR CALL.</>}</h1>
          <p>{selected ? words.clubIntro : words.hubIntro}</p>
        </div>
      </div>
      <p className="tg-cover-strip wk-k">{selected ? words.clubStrip : words.clubsReady.replace('{n}',String(clubs.length))}</p>
    </header>
    <TelegramReturn clubs={clubs.map(({reg,games}) => ({id:reg.id,name:reg.name,games:games.map(g=>g.key)}))} selected={selected?.reg.id} choose={searchParams.choose === '1'} />
    {selected ? <>
      <Link href="/telegram?choose=1" className="tg-switch">{words.choose}</Link>
      <nav className="tg-club-links" aria-label={menu.wkTheClub}>
        <Link className="wk-btn" href={`/clubs/${selected.reg.id}?lang=en`}>{words.clubHome} ↗</Link>
        <Link className="tg-text-link" href={`/clubs/${selected.reg.id}/history?lang=en`}>{words.clubHistory} ↗</Link>
        <span className="wk-k">{words.openGates.replace('{n}',String(selected.games.length))}</span>
      </nav>
      <p className="wk-k tg-gates-title">{words.allGates}</p>
      {PLAY_GROUPS.map(group=><section key={group.id} aria-labelledby={`tg-${group.id}`}>
        <h2 className="wk-head tg-group-title" id={`tg-${group.id}`}>{group.id==='quick'?menu.playQuick:group.id==='deep'?menu.playDeep:menu.wkkArchiveShort}</h2>
        <div className="tg-gate-grid">{group.keys.map(key=>{
          const game=TELEGRAM_GAMES.find(g=>g.key===key)!
          return <GateCover key={key} clubId={selected.reg.id} gate={key} n={numbers![key]} open={selected.games.some(g=>g.key===key)} locale="en" games={copy} soon={copy.comingSoon} gateWord={copy.ticketGate} href={telegramGameHref(selected.reg.id,key)!} className="tg-game"/>
        })}</div>
      </section>)}
      <Suspense fallback={null}><ClubExtras id={selected.reg.id} name={selected.reg.name} theme={theme!}/></Suspense>
    </> : <section aria-labelledby="tg-clubs-title">
      <div className="tg-section-title"><h2 id="tg-clubs-title">{words.colours}</h2><span className="wk-k">{words.waiting}</span></div>
      <div className="tg-clubs">
      {clubs.map(({ reg, games }) => <Link prefetch={false} className="tg-club wk-panel wk-lift" style={wearLivery(livery(reg.id))} key={reg.id} href={`/telegram?club=${reg.id}`}>
        <Badge club={reg} /><span className="tg-club-copy"><strong>{reg.name}</strong><small>{words.openGates.replace('{n}',String(games.length))} · {words.stepInside}</small></span>
      </Link>)}
      {!clubs.length && <p role="status">{words.empty}</p>}
      </div>
    </section>}
    <section className="tg-whole" aria-labelledby="tg-whole-title"><p className="wk-k">{words.corner}</p><h2 className="wk-head" id="tg-whole-title">{words.cornerIntro}</h2>
      <nav className="wk-tiles" aria-label={menu.wkCorner}>{tiles.map(item=><Link prefetch={false} key={item.href} href={item.href}><b>{item.title}</b>{item.sub&&<small>{item.sub}</small>}</Link>)}</nav>
    </section>
    <aside className="tg-note">{words.guest}</aside>
    <footer className="tg-footer"><a href="https://fanlife.dubelteam.com" target="_blank" rel="noopener noreferrer">FanLife.DubelTeam.com</a><span>FOOTBALL. FOREVER.</span></footer>
  </main></Shell>
}

async function ClubExtras({id,name,theme}:{id:string;name:string;theme:ClubTheme}) {
  const life=await lifeEntry(id,{evaluation:false,status:'live',locale:'en'}).catch(()=>null)
  return <>
    {life?.href&&<section className="tg-life wk-panel"><Plate art="fans" ink="club"/><div><h2 className="wk-head">{words.lifeTitle}</h2><p>{words.lifeIntro}</p><Link className="wk-btn" href={`/telegram/${id}/life`}>{words.lifePlay}</Link></div></section>}
    <LegendsBanner club={id} name={name} theme={theme}/>
  </>
}
