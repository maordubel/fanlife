import 'server-only'

import {getCatalog} from '@/lib/universe/catalog'
import {DUBID_LEAGUE, explainClub, type Stage} from '@/lib/universe/discovery'
import {hubDecision, universePolicy} from '@/lib/universe/hub'
import {getFixtureFeed} from '@/lib/fixtures/service'

/**
 * Connected Football (owner's plan, 27.10.2026, package F; audit CF-08): what a fan sees from DUBID and OFFSIDES right now,
 * club by club, read from the SAME decision the hub card makes (lib/universe/hub.ts) — so the desk can never say "shown"
 * for a card the hub did not draw. Four stages are kept apart: eligible, selected for the hub card, suppressed by a switch,
 * and the one thing the server cannot know — whether this visitor snoozed the family on their device.
 * The switches live in Settings → Features → Universe bridge.
 */
const MARK: Record<Stage, string> = {selected: '● Shown on the hub', eligible: '◐ Eligible', suppressed: '⊘ Switched off', ineligible: '○ Not offered'}
export async function ConnectedDesk({clubs}: {clubs: readonly {id: string; name: string; status?: string}[]}) {
  const now = new Date()
  const open = clubs.filter(c => c.status !== 'paused')
  const [feed, cat, u, d] = await Promise.all([getFixtureFeed(now).catch(() => null), getCatalog().catch(() => null), universePolicy(), hubDecision(open, now).catch(() => null)])
  if (!cat) return <p className="desk-state" role="status">Connected Football: the catalog could not be read. No companion card is shown while it cannot be checked.</p>
  const ids = new Set(open.map(c => c.id))
  const fixtures = (feed?.fixtures ?? []).filter(f => ids.has(f.clubId))
  const watched = new Set([...Object.keys(DUBID_LEAGUE), ...fixtures.map(f => f.clubId)])
  const rows = open.filter(c => watched.has(c.id)).map(c => ({...c, ...explainClub(c.id, fixtures, cat, now, d ?? undefined, u.policy)}))
  const hub = d?.selected
  return <section className="desk-panel" aria-label="Connected Football" data-testid="connected-desk">
    <p className="desk-kicker">Connected Football</p>
    <h2 className="desk-h">What fans see from DUBID and OFFSIDES now</h2>
    <p className="desk-fine">Checked {new Date(cat.checkedAt).toLocaleString('en-GB', {timeZone: 'Asia/Jerusalem'})} (Israel time). {u.open ? '' : 'The Universe bridge is OFF — nothing is shown to fans. '}Home page card: {hub ? `${hub.action.family.toUpperCase()} · ${hub.action.copy.line} (${hub.action.intent}, until ${new Date(hub.action.expiresAt).toLocaleString('en-GB', {timeZone: 'Asia/Jerusalem'})})` : 'none — nothing true to offer'}.</p>
    <p className="desk-fine">“Shown on the hub” is what a first-time visitor sees. A visitor who pressed × on a card of that family sees nothing from it for seven days — that choice lives on their device and is not visible here.</p>
    <div className="desk-table-wrap"><table className="desk-table">
      <thead><tr><th scope="col">Club</th><th scope="col">DUBID</th><th scope="col">OFFSIDES</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}>
        <th scope="row">{r.name}</th>
        <td data-stage={r.dubid.stage}><b>{MARK[r.dubid.stage]}</b> · {r.dubid.reason}</td>
        <td data-stage={r.offsides.stage}><b>{MARK[r.offsides.stage]}</b> · {r.offsides.reason}</td>
      </tr>)}</tbody>
    </table></div>
  </section>
}
