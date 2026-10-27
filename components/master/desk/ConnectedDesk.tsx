import 'server-only'

import {getCatalog} from '@/lib/universe/catalog'
import {DUBID_LEAGUE, companionFor, explainClub} from '@/lib/universe/discovery'
import {getFixtureFeed} from '@/lib/fixtures/service'

/**
 * Connected Football (owner's plan, 27.10.2026, package F): what a fan sees from DUBID and OFFSIDES right now, club by
 * club, and the reason — read from the same catalog and rules the hub card uses, so the desk can never disagree with
 * the page. Read only; the switches stay in Settings → Features and the products in lib/universe/registry.ts.
 */
export async function ConnectedDesk({clubs}: {clubs: readonly {id: string; name: string}[]}) {
  const now = new Date()
  const [feed, cat] = await Promise.all([getFixtureFeed(now).catch(() => null), getCatalog().catch(() => null)])
  if (!cat) return <p className="desk-state" role="status">Connected Football: the catalog could not be read. No companion card is shown while it cannot be checked.</p>
  const fixtures = feed?.fixtures ?? []
  const watched = new Set([...Object.keys(DUBID_LEAGUE), ...fixtures.map(f => f.clubId)])
  const rows = clubs.filter(c => watched.has(c.id)).map(c => ({...c, ...explainClub(c.id, fixtures, cat, now)}))
  const hub = companionFor(fixtures, cat, now)
  return <section className="desk-panel" aria-label="Connected Football" data-testid="connected-desk">
    <p className="desk-kicker">Connected Football</p>
    <h2 className="desk-h">What fans see from DUBID and OFFSIDES now</h2>
    <p className="desk-fine">Checked {new Date(cat.checkedAt).toLocaleString('en-GB', {timeZone: 'Asia/Jerusalem'})} (Israel time). Home page card: {hub ? `${hub.action.family.toUpperCase()} · ${hub.action.copy.line}` : 'none — nothing true to offer'}.</p>
    <div className="desk-table-wrap"><table className="desk-table">
      <thead><tr><th scope="col">Club</th><th scope="col">DUBID</th><th scope="col">OFFSIDES</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}>
        <th scope="row">{r.name}</th>
        <td data-shown={r.dubid.shown}>{r.dubid.shown ? '● ' : '○ '}{r.dubid.reason}</td>
        <td data-shown={r.offsides.shown}>{r.offsides.shown ? '● ' : '○ '}{r.offsides.reason}</td>
      </tr>)}</tbody>
    </table></div>
  </section>
}
