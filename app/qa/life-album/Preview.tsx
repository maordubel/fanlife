'use client'

import { useState } from 'react'

import { AlbumSheet } from '@/components/life/AlbumSheet'
import { PacketCard } from '@/components/life/PacketCard'
import { apply, emptyState, type LifeEvent } from '@/lib/life/events'
import { stickerFlag, tornFlag } from '@/lib/life/stickers'
import type { LifeState } from '@/lib/life/types'

/** a life with something in the album: two pages started, one man torn out, one ace kept */
const SEED: LifeEvent[] = [
  { t: 'flag.set', flag: stickerFlag('a-sg80a-00'), value: 2 },
  { t: 'flag.set', flag: stickerFlag('a-sg80a-05'), value: 1 },
  { t: 'flag.set', flag: stickerFlag('a-sg80a-07'), value: 1 },
  { t: 'flag.set', flag: stickerFlag('e-sg90-00'), value: 1 },
  { t: 'flag.set', flag: stickerFlag('e-sg90-03'), value: 1 },
  { t: 'flag.set', flag: stickerFlag('d-sg978-07'), value: 1 },
  { t: 'flag.set', flag: stickerFlag('box-ace-chodorov'), value: 1 },
  { t: 'flag.raised', flag: tornFlag('d-sg978-02') },
]

export function Preview({ show }: { show: 'packet' | 'box' | 'album' }) {
  const [state, setState] = useState(() =>
    SEED.reduce<LifeState>(
      (life, event) => apply(life, event),
      emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, 1986),
    ),
  )
  const [open, setOpen] = useState(true)
  return (
    /* fixed rather than relative: the app shell centres its main column, and a QA screen
       that inherits that gutter is not showing what the game shows */
    <main className="fixed inset-0 z-[80] bg-ink">
      {show === 'packet' && open && (
        <PacketCard
          ids={['a-sg80a-00', 'a-sg80a-05', 'a-sg80a-07']}
          before={{ 'a-sg80a-00': 1 }}
          onClose={() => setOpen(false)}
        />
      )}
      {show === 'box' && open && (
        <PacketCard ids={['box-ace-tish']} before={{}} fromBox onClose={() => setOpen(false)} />
      )}
      {show === 'album' && open && (
        <AlbumSheet
          state={state}
          onTear={(id) => setState((life) => apply(apply(life, { t: 'flag.set', flag: stickerFlag(id), value: 0 }), { t: 'flag.raised', flag: tornFlag(id) }))}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  )
}
