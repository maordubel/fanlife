import type { Metadata } from 'next'

import { FanPage } from '@/components/fanlife/FanPage'
import { ShirtShelf } from '@/components/fanlife/ShirtShelf'
import { fl } from '@/lib/fanlife/copy'
import { fanShirts } from '@/lib/fanlife/catalog'
import { livery } from '@/lib/club-livery'

export const metadata: Metadata = { title: fl('shirts.title'), description: fl('shirts.sub') }
export const dynamic = 'force-dynamic'

/**
 * The shirt archive across clubs — what the closet, the market and the auction point at
 * (The Worker's `/kits/archive?shirt=` link lands here). Grouped by club, oldest first;
 * `?shirt=<slug>` opens that club's section and marks the shirt.
 */
export default async function ShirtsPage({ searchParams }: { searchParams: { shirt?: string } }) {
  const all = await fanShirts()
  const clubs = [...new Set(all.map((s) => s.club))]
  const focus = typeof searchParams.shirt === 'string' ? searchParams.shirt : null
  return (
    <FanPage active="shirts" title={fl('shirts.title')} sub={fl('shirts.sub')}>
      <div className="fl-shirts">
        {clubs.map((club) => {
          const rows = all.filter((s) => s.club === club).sort((a, b) => a.year - b.year)
          const l = livery(club)
          return (
            <details key={club} className="panel" open={!focus ? clubs[0] === club : rows.some((r) => r.slug === focus)} style={l ? { ['--club-primary' as string]: l.primary } : undefined}>
              <summary><span className="mag-badge" data-livery={l?.pattern} aria-hidden="true">{l?.initials}</span> <b>{rows[0]!.clubName}</b> · {fl('shirts.count', { n: rows.length })} · {rows[0]!.src ? fl('shirts.photo') : fl('shirts.drawn')}</summary>
              <ShirtShelf shirts={rows} focus={focus} />
            </details>
          )
        })}
      </div>
    </FanPage>
  )
}
