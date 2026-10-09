'use client'
// FAN LIFE — hand-written (rest of the world, 9.10.2026). A poster, not a banner: two real press photographs
// cut out on a torn block of ink, one sentence, one button. No flags, no empty field.

import { PressPhoto, TornBlocks } from '@/components/master/Poster'
import { h } from '@/lib/fanlife/hub/copy'

export function WorldBand({ count, onList, onBrowse, browsing }: { count: number | null; onList: () => void; onBrowse: () => void; browsing: boolean }) {
  return (
    <aside className="fl-world" data-hub="world-band" aria-label={h('hub.scope.world')}>
      <TornBlocks seed="world" inks={['var(--mag-vermilion)', 'var(--mag-ink)', 'var(--mag-navy)']} />
      <div className="fl-world-in">
        <div className="fl-world-text">
          <p className="fl-world-kicker">{h('hub.world.kicker')}</p>
          <h2 className="fl-world-title">{h('hub.world.title')}</h2>
          <p className="fl-world-sub">{h('hub.world.sub')}</p>
          <div className="fl-world-cta">
            <button type="button" className="fl-world-go min-h-tap" onClick={onList}>{h('hub.world.list')}</button>
            {!browsing ? (
              <button type="button" className="fl-world-alt min-h-tap" onClick={onBrowse}>
                {h('hub.world.browse')}{count ? ` · ${count}` : ''} <span aria-hidden="true">›</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="fl-world-art" aria-hidden="true">
          <PressPhoto art="striped-shirt" className="fl-world-a" />
          <PressPhoto art="memorabilia" className="fl-world-b" />
        </div>
      </div>
    </aside>
  )
}
