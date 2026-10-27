import Link from 'next/link'
import {door} from '@/lib/features-server'
import {legendsReadyFor} from '@/lib/legends/server'
import {legendsHref} from '@/lib/legends/banner'
import {viewer} from '@/lib/legends/owner'
import {ownerIndex} from '@/lib/legends/store'
import {lifeEntry, lifeCompatFor} from '@/lib/clubs/life/entry'
import {loadClub} from '@/lib/clubs/resolver'
import {evaluationMode} from '@/lib/master/mode'
import {productAllowed} from '@/lib/universe/discovery'
import {universePolicy} from '@/lib/universe/hub'
import {DiscoveryUnit} from './DiscoveryUnit'
import {NextStepLife} from './NextStepLife'

/**
 * CONNECTED FOOTBALL — the next step after a game (owner's plan §6–§7, audit CF-01, 27.10.2026). ONE quiet card, and only
 * AFTER the game on the page has shown its result (lib/clubs/completion.ts announces it) — never over a board in play.
 * Inside FAN LIFE, from a game to the feature it naturally leads to, only when that feature is open for this club and not
 * switched off in the control room:
 *  · a historical XI, a Rumble draft or a line-up → Legends Manager ("now run the club"); a manager who already runs this
 *    club is offered his career back, not the game again;
 *  · the archive, a goal or the derby → the club's LIFE ("more stories from your club"), Continue when this device has a
 *    life the game can still open.
 * Nothing open → nothing drawn. Streamed in Suspense, so the board never waits on it.
 */
const TO_LEGENDS = new Set(['xi', 'royal-rumble', 'lineup'])
const TO_LIFE = new Set(['archive', 'derby', 'goal'])

export async function NextStep({gate, club, name, locale, floating}: {gate: string; club: string; name: string; locale: string; floating: boolean}) {
  const after = {club, gate}
  if (TO_LEGENDS.has(gate)) {
    const [d, u] = await Promise.all([door('fanLeague').catch(() => null), universePolicy()])
    if (!d?.open || !u.open || !productAllowed('legends', club, u.policy)) return null
    const r = await legendsReadyFor(club).catch(() => null); if (!r || r.verdict !== 'READY' || r.held) return null
    const owner = await viewer(false).catch(() => null)
    const mine = owner ? (await ownerIndex(owner).catch(() => null))?.careers.filter(c => c.club === club && c.status === 'active')
      .sort((a, b) => (b.enteredAt ?? b.createdAt).localeCompare(a.enteredAt ?? a.createdAt))[0] ?? null : null
    return <DiscoveryUnit unit="next-step" family="legends" after={after} floating={floating}>
      {mine
        ? <Line kicker="Your club is waiting." line={`Your ${name} career is mid-season.`} cta="Continue in Legends Manager" href={`/all-football/legends/career/${mine.id}`} family="legends" intent="resume"/>
        : <Line kicker={gate === 'xi' ? 'You picked the legends.' : 'You know the men.'} line={`Now take ${name} through a season.`} cta="Try Legends Manager" href={legendsHref(club)} family="legends" intent="start"/>}
    </DiscoveryUnit>
  }
  if (TO_LIFE.has(gate)) {
    const u = await universePolicy()
    if (!u.open || !productAllowed('life', club, u.policy)) return null
    const e = await lifeEntry(club, {evaluation: evaluationMode(), status: 'live', locale}).catch(() => null)
    if (!e?.href) return null
    const core = await loadClub(club).catch(() => null)
    return <DiscoveryUnit unit="next-step" family="life" after={after} floating={floating}>
      <NextStepLife club={club} href={e.href} name={name} compat={core ? lifeCompatFor(core.data) : null}/>
    </DiscoveryUnit>
  }
  return null
}

export function Line({kicker, line, cta, href, family, intent}: {kicker: string; line: string; cta: string; href: string; family: string; intent: 'start' | 'resume'}) {
  return <aside className="wk-panel wga-nextstep" aria-label={kicker} data-testid="next-step" data-family={family} data-intent={intent} lang="en" dir="ltr"
    style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', marginBlockStart: '1.5rem', padding: '0.9rem 3rem 0.9rem 1rem'}}>
    <p style={{margin: 0}}><b>{kicker}</b> {line}</p>
    <Link className="wk-btn min-h-tap" href={href}>{cta}</Link>
  </aside>
}
