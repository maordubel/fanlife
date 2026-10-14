import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import { Shell } from '@/components/master/Shell'
import { Icon } from '@/components/weekly/Icon'
import { Plate } from '@/components/weekly/Plate'
import { DrawnShirt } from '@/components/fanlife/DrawnShirt'
import { fl, type FanKey } from '@/lib/fanlife/copy'
import { evaluationMode } from '@/lib/master/mode'

export type CornerTab = 'me' | 'file' | 'closet' | 'market' | 'auction' | 'shirts'
type Folder = { key: CornerTab; href: string; label: FanKey; sub: FanKey; icon: string; page: number; ink: string }
const TABS: Folder[] = [
  { key: 'me', href: '/me', label: 'corner.me', sub: 'corner.sub.me', icon: 'me', page: 1, ink: 'var(--mag-green)' },
  { key: 'file', href: '/me/file', label: 'corner.file', sub: 'corner.sub.file', icon: 'file', page: 3, ink: 'var(--mag-cyan)' },
  { key: 'closet', href: '/closet', label: 'corner.closet', sub: 'corner.sub.closet', icon: 'hanger', page: 5, ink: 'var(--mag-vermilion)' },
  { key: 'market', href: '/market', label: 'corner.market', sub: 'corner.sub.market', icon: 'shirt', page: 7, ink: 'var(--mag-orange)' },
  { key: 'auction', href: '/auction', label: 'corner.auction', sub: 'corner.sub.auction', icon: 'gavel', page: 11, ink: 'var(--mag-ink)' },
  { key: 'shirts', href: '/shirts', label: 'corner.shirts', sub: 'corner.sub.shirts', icon: 'grid', page: 13, ink: 'var(--mag-navy)' },
]

/** the auctioneer's gavel, drawn in the page's inks (decorative) */
function Gavel() {
  return (
    <svg viewBox="0 0 160 120" className="wkc-gavel" aria-hidden="true" focusable="false">
      <ellipse cx="96" cy="104" rx="50" ry="11" fill="var(--mag-orange-text)" stroke="var(--mag-ink)" strokeWidth="4" />
      <path d="M46 98 h100 v6 a50 11 0 0 1 -100 0 z" fill="var(--mag-orange-text)" stroke="var(--mag-ink)" strokeWidth="4" />
      <g transform="rotate(-32 80 60)">
        <rect x="74" y="44" width="80" height="10" fill="var(--mag-orange-text)" stroke="var(--mag-ink)" strokeWidth="4" />
        <rect x="40" y="22" width="44" height="54" rx="6" fill="var(--mag-orange-text)" stroke="var(--mag-ink)" strokeWidth="4" />
        <rect x="40" y="32" width="44" height="9" fill="var(--mag-vermilion)" stroke="var(--mag-ink)" strokeWidth="3" />
        <rect x="40" y="57" width="44" height="9" fill="var(--mag-vermilion)" stroke="var(--mag-ink)" strokeWidth="3" />
      </g>
    </svg>
  )
}

type Mast = { plate: string; art: ReactNode; burst?: boolean }
const MASTS: Record<CornerTab, Mast> = {
  me: { plate: 'wk-greenplate', art: <Plate art="fanfist" ink="green" className="wkc-mast-plate" /> },
  file: { plate: 'wk-sky', art: <Plate art="memo" ink="navy" className="wkc-mast-plate wkc-wide" /> },
  closet: { plate: 'wk-redplate', art: <DrawnShirt id="wkc-mast-closet" className="wkc-mast-shirt" /> },
  market: { plate: 'wk-orangeplate', art: <Plate art="swap" ink="red" className="wkc-mast-plate wkc-wide" />, burst: true },
  auction: { plate: 'wk-night', art: <Gavel />, burst: true },
  shirts: { plate: 'wk-navyplate', art: <span className="wkc-mast-rack"><DrawnShirt id="wkc-mast-s1" className="wkc-mast-shirt" /><DrawnShirt id="wkc-mast-s2" className="wkc-mast-shirt" /></span> },
}

/**
 * The page's masthead plate (THE WEEKLY, rule 124): a process-ink panel with speed lines, a comic figure breaking the
 * frame, the folder's page number, the title in Shrikhand and the lede on a caption box. Exported so a two-page spread
 * can set it on its first page.
 */
export function CornerMast({ tab, title, sub, kicker, badge }: { tab: CornerTab; title: string; sub?: string; kicker?: string; badge?: ReactNode }) {
  const m = MASTS[tab]
  const folder = TABS.find((f) => f.key === tab)!
  const size = title.length <= 4 ? 's' : title.length <= 12 ? 'm' : 'l'
  return (
    <header className={`wkc-mast ${m.plate}`} data-corner-mast={tab}>
      <span className="wkc-mast-in" aria-hidden="true"><span className="wk-speed" style={{ ['--sx' as string]: '82%', ['--sy' as string]: '72%' } as CSSProperties} /><span className="wkc-keyl" /></span>
      <span className="wkc-mast-art" aria-hidden="true">{m.art}</span>
      <div className="wkc-mast-text">
        <p className="wk-banner wkc-mast-k">{kicker ?? fl('corner.mast.page', { n: folder.page })}</p>
        <h1 className="wk-logo wkc-mast-h" data-len={size}>{title}</h1>
        {sub ? <p className="wk-cap white wkc-mast-cap">{sub}</p> : null}
      </div>
      {badge ?? (m.burst ? <span className="wk-burst white wkc-mast-burst" aria-hidden="true"><b>{fl('corner.fee')}</b></span> : null)}
    </header>
  )
}

/**
 * The frame of every page in "your corner" (the personal area ported from The Worker, 7.10.2026), dressed as THE
 * WEEKLY (rule 124): six folder tabs (two rows of three on a phone, a binder index down the side on a desktop), the
 * page's masthead plate, and `.fl-worker` — the surface that re-inks The Worker's components (their Tailwind tokens) in
 * the weekly's paper and inks.
 *
 * `mast`: `full` is the folder's masthead plate; `slim` a kicker + title for a page inside a folder; `none` when the
 * page draws its own headline (`market` keeps meaning that). `spread` lays a desktop out as two facing pages: the
 * children then render a `.wkc-l` (first page, under the masthead) and a `.wkc-r` (second page).
 */
export function FanPage({ active, title, sub, children, market = false, mast, spread = false, kicker, badge }: {
  active?: CornerTab; title: string; sub?: string; children: ReactNode
  /** the page draws its own headline */
  market?: boolean
  mast?: 'full' | 'slim' | 'none'
  spread?: boolean
  kicker?: string
  badge?: ReactNode
}) {
  const mode = mast ?? (market ? 'none' : 'slim')
  const folder = TABS.find((f) => f.key === active) ?? null
  const head = mode === 'full' && active ? (
    <CornerMast tab={active} title={title} sub={sub} kicker={kicker} badge={badge} />
  ) : mode === 'slim' ? (
    <header className="wkc-slim">
      <p className="wk-banner">{kicker ?? fl('corner.kicker')}</p>
      <h1 className="wk-logo red wk-tilt wkc-slim-h">{title}</h1>
      {sub ? <p className="wkc-slim-sub">{sub}</p> : null}
    </header>
  ) : null
  return (
    <Shell locale="en">
      <main id="main" className={`mag-section fl-corner wkc${market ? ' fl-market' : ''}`} data-corner={active ?? 'none'}>
        <div className="wkc-strip"><span className="wk-k red">{fl('corner.kicker')}</span><span className="wk-k wk-muted">{fl('corner.strip')}</span></div>
        <nav className="wk-folders wkc-folders" aria-label={fl('corner.nav')}>
          {TABS.map((tab) => (
            <Link key={tab.key} href={tab.href} aria-current={tab.key === active ? 'page' : undefined}><Icon name={tab.icon} size={20} />{fl(tab.label)}</Link>
          ))}
        </nav>
        <div className="wkc-desk">
          <nav className="wkc-index" aria-label={fl('corner.nav')}>
            <span className="wkc-index-head"><span className="wk-k red">{fl('corner.kicker')}</span><span className="wk-k wk-muted">{fl('corner.page')}</span></span>
            {TABS.map((tab) => (
              <Link key={tab.key} href={tab.href} aria-current={tab.key === active ? 'page' : undefined} style={{ ['--tc' as string]: tab.ink } as CSSProperties}>
                <Icon name={tab.icon} size={24} />
                <span><b>{fl(tab.label)}</b><small>{fl(tab.sub)}</small></span>
                <span className="wkc-pg">{tab.page}</span>
              </Link>
            ))}
          </nav>
          <div className={`wkc-spread${spread ? ' two' : ''}`}>
            {spread ? <><span className="wkc-staple" style={{ insetBlockStart: '22%' }} aria-hidden="true" /><span className="wkc-staple" style={{ insetBlockStart: '70%' }} aria-hidden="true" /></> : null}
            {head ? <div className="wkc-head">{head}</div> : null}
            {evaluationMode() ? <p className="fl-corner-note wkc-note">{fl('corner.preview')}</p> : null}
            <div className="fl-worker" dir="ltr" lang="en">{children}</div>
            {folder ? (
              <>
                <p className="wkc-folio wkc-folio-l"><span className="wk-k wk-muted">{fl('corner.folio')}</span><b className="wk-num">{folder.page}</b></p>
                {spread ? <p className="wkc-folio wkc-folio-r"><span className="wk-k wk-muted">{fl(folder.label)}</span><b className="wk-num">{folder.page + 1}</b></p> : null}
              </>
            ) : null}
          </div>
        </div>
      </main>
    </Shell>
  )
}
