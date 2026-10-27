import Link from 'next/link'
import {door} from '@/lib/features-server'
import {legendsReadyFor} from '@/lib/legends/server'
import {legendsHref} from '@/lib/legends/banner'
import {lifeEntry} from '@/lib/clubs/life/entry'
import {evaluationMode} from '@/lib/master/mode'

/**
 * CONNECTED FOOTBALL — the next step after a game (owner's plan §6–§7, 27.10.2026). ONE quiet line under the board, never a
 * banner over it: inside FAN LIFE, from a game to the feature it naturally leads to, and only when that feature is open for
 * this club. A historical XI or a Rumble draft → Legends Manager ("now run the club"); the archive or the timeline → the
 * club's LIFE ("more stories from your club" — club-level wording, because no scene is matched to the fact).
 * Nothing open → nothing drawn. Streamed in Suspense, so the board never waits on it.
 */
const TO_LEGENDS = new Set(['xi', 'royal-rumble', 'lineup'])
const TO_LIFE = new Set(['archive', 'derby', 'goal'])

export async function NextStep({gate, club, name, locale}: {gate: string; club: string; name: string; locale: string}) {
  if (TO_LEGENDS.has(gate)) {
    const d = await door('fanLeague').catch(() => null); if (!d?.open) return null
    const r = await legendsReadyFor(club).catch(() => null); if (!r || r.verdict !== 'READY' || r.held) return null
    return <Line kicker={gate === 'xi' ? 'You picked the legends.' : 'You know the men.'} line={`Now take ${name} through a season.`} cta="Try Legends Manager" href={legendsHref(club)} family="legends"/>
  }
  if (TO_LIFE.has(gate)) {
    const e = await lifeEntry(club, {evaluation: evaluationMode(), status: 'live', locale}).catch(() => null)
    if (!e?.href) return null
    return <Line kicker="Every supporter has a first match." line={`More stories from ${name} — live them in LIFE.`} cta="Start LIFE" href={e.href} family="life"/>
  }
  return null
}

function Line({kicker, line, cta, href, family}: {kicker: string; line: string; cta: string; href: string; family: string}) {
  return <aside className="wk-panel wga-nextstep" aria-label={kicker} data-testid="next-step" data-family={family} lang="en" dir="ltr"
    style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', marginBlockStart: '1.5rem', padding: '0.9rem 1rem'}}>
    <p style={{margin: 0}}><b>{kicker}</b> {line}</p>
    <Link className="wk-btn min-h-tap" href={href}>{cta}</Link>
  </aside>
}
