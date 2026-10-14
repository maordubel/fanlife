import type { Metadata } from 'next'
import Link from 'next/link'

import { FanPage } from '@/components/fanlife/FanPage'
import { ShirtShelf } from '@/components/fanlife/ShirtShelf'
import { fl } from '@/lib/fanlife/copy'
import { fanShirts, type FanShirt } from '@/lib/fanlife/catalog'
import { livery, wearLivery } from '@/lib/club-livery'
import { Badge } from '@/components/clubs/Badge'

export const metadata: Metadata = { title: fl('shirts.title'), description: fl('shirts.sub') }
export const dynamic = 'force-dynamic'

/**
 * The shirt archive across clubs — what the closet, the market and the auction point at (The Worker's
 * `/kits/archive?shirt=` link lands here). THE WEEKLY's album (rule 124): pick a club from the crest grid, jump to a
 * decade, and the album page shows that club's shirts oldest first. `?shirt=<slug>` opens that shirt's club and decade
 * and marks the shirt; `?club=` picks a club; `?decade=` a decade (all of them when absent). Clubs are in a–z order.
 */
export default async function ShirtsPage({ searchParams }: { searchParams: { shirt?: string; club?: string; decade?: string } }) {
  const all = await fanShirts()
  const names = new Map(all.map((s) => [s.club, s.clubName]))
  const clubs = [...names.keys()].sort((a, b) => names.get(a)!.localeCompare(names.get(b)!))
  const focus = typeof searchParams.shirt === 'string' ? searchParams.shirt : null
  const focused = focus ? all.find((s) => s.slug === focus) ?? null : null
  const club = focused?.club ?? (searchParams.club && names.has(searchParams.club) ? searchParams.club : clubs[0]!)
  const rows = all.filter((s) => s.club === club).sort((a, b) => a.year - b.year)
  const decades = [...new Set(rows.map((s) => s.decade))].sort((a, b) => a - b)
  const asked = Number(searchParams.decade)
  // a decade asked for; else the marked shirt's; `all` lays every decade out; else the club's latest decade
  const decade = decades.includes(asked) ? asked : focused && !searchParams.decade ? focused.decade : searchParams.decade === 'all' ? null : decades[decades.length - 1] ?? null
  const most = Math.max(1, ...decades.map((d) => rows.filter((s) => s.decade === d).length))
  const l = livery(club)
  const href = (c: string, d: number | 'all' | null = null) => `/shirts?club=${encodeURIComponent(c)}${d ? `&decade=${d}` : ''}`
  const at = decade === null ? -1 : decades.indexOf(decade)
  const pages: { d: number; shirts: FanShirt[] }[] = (decade === null ? decades : [decade]).map((d) => ({ d, shirts: rows.filter((s) => s.decade === d) }))

  return (
    <FanPage active="shirts" mast="full" spread title={fl('shirts.title')} sub={fl('shirts.sub')} kicker={fl('shirts.kicker')}
      badge={<span className="wk-roundel wkc-mast-roundel"><b>{all.length}</b><small>{fl('shirts.unit')}</small></span>}>
      <div className="wkc-l wkc-shirts-l">
        <section className="wkc-sec" aria-labelledby="shirts-pick">
          <div className="wkc-h2"><h2 id="shirts-pick" className="wk-head wkc-h2-head">{fl('shirts.pick')}</h2><span className="wk-k wk-muted">{fl('shirts.clubs', { c: clubs.length, n: all.length })}</span></div>
          <nav className="wkc-crestgrid" aria-label={fl('shirts.pick')}>
            {clubs.map((id) => {
              const lv = livery(id)
              return (
                <Link key={id} href={href(id)} aria-current={id === club ? 'page' : undefined} style={wearLivery(lv)}>
                  <Badge club={lv ?? { id, initials: names.get(id)!.slice(0, 2).toUpperCase() }} />
                  <b>{names.get(id)}</b>
                  <span className="wk-num">{all.filter((s) => s.club === id).length}</span>
                </Link>
              )
            })}
          </nav>
        </section>

        <section className="wkc-sec" aria-labelledby="shirts-decades" style={wearLivery(l)}>
          <div className="wkc-h2"><h2 id="shirts-decades" className="wk-head wkc-h2-head wkc-shirts-club"><Badge club={l ?? { id: club, initials: '' }} />{fl('shirts.byDecade', { club: names.get(club)! })}</h2><span className="wk-k wk-muted">{fl('shirts.count', { n: rows.length })}</span></div>
          <nav className="wkc-decades" aria-label={fl('shirts.byDecade', { club: names.get(club)! })}>
            <Link href={href(club, 'all')} aria-current={decade === null ? 'page' : undefined}><b>{fl('shirts.all')}</b><small>{fl('shirts.count', { n: rows.length })}</small><i aria-hidden="true" style={{ inlineSize: '100%' }} /></Link>
            {decades.map((d) => {
              const n = rows.filter((s) => s.decade === d).length
              return <Link key={d} href={href(club, d)} aria-current={decade === d ? 'page' : undefined}><b>{d}s</b><small>{fl('shirts.count', { n })}</small><i aria-hidden="true" style={{ inlineSize: `${Math.max(4, Math.round((n / most) * 100))}%` }} /></Link>
            })}
          </nav>
        </section>
      </div>

      <div className="wkc-r wkc-shirts-r">
        {pages.map((p, i) => (
          <section key={p.d} className="wkc-album" aria-labelledby={`album-${p.d}`} style={wearLivery(l)}>
            <div className="wkc-h2">
              <h2 id={`album-${p.d}`} className="wkc-h2-t navy">{fl('shirts.decade', { d: p.d })}</h2>
              <span className="wk-k wk-muted">{fl('shirts.oldest', { club: names.get(club)!, n: p.shirts.length })}</span>
            </div>
            {i === 0 ? (
              <p className="wkc-legend">
                <span><i className="wkc-flag-have" aria-hidden="true">✓</i>{fl('shirts.hold')}</span>
                <span><i className="wkc-flag-want" aria-hidden="true">♡</i>{fl('shirts.looking')}</span>
                <span><i className="wk-tag orange" aria-hidden="true">{fl('shirts.tag.market')}</i>{fl('shirts.market')}</span>
              </p>
            ) : null}
            <ShirtShelf shirts={p.shirts} focus={focus} limit={decade === null ? 10 : 15} />
          </section>
        ))}
        {decade !== null ? (
          <nav className="wkc-pager" aria-label={fl('shirts.byDecade', { club: names.get(club)! })}>
            {at > 0 ? <Link className="wk-k" href={href(club, decades[at - 1]!)}>← {fl('shirts.decade', { d: decades[at - 1]! })}</Link> : <span />}
            {at < decades.length - 1 ? <Link className="wk-k" href={href(club, decades[at + 1]!)}>{fl('shirts.decade', { d: decades[at + 1]! })} →</Link> : <span />}
          </nav>
        ) : null}
        <p className="wk-small wkc-shirts-tip">{fl('shirts.tip')}</p>
      </div>
    </FanPage>
  )
}
