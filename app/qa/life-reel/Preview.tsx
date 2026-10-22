'use client'
import type { CSSProperties } from 'react'

import { Reel } from '@/components/clubs/life/Reel'
import styles from '@/components/clubs/life/life.module.css'

const COPY: Record<string, string> = { loading: 'Loading', beginDay: 'Begin the day', reelSkip: 'Skip', age: 'Age', 'place.now': 'Now' }

/** QA only: one chapter reel, the way LIFE opens a chapter, with no world loading behind it. */
export function Preview({ style, club }: { style: CSSProperties; club: string | null }) {
  return (
    <div className={styles.life} style={style} data-life="qa-reel">
      <Reel
        input={{ no: 3, of: 12, age: 16, prevAge: 9, title: 'The first away day', kicker: 'Chapter three', intro: 'You saved for weeks. Tonight the whole street walks the same way.', places: ['Ticket office', 'Tunnel', 'The stand'], keep: null, club }}
        copy={COPY}
        ready
        onBegin={() => {}}
      />
    </div>
  )
}
