'use client'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import {lifeProgress} from '@/lib/life/universal/progress'
import type {LifeCompat} from '@/lib/life/universal/compat'

/** The LIFE half of the next step: Continue only for a life the game can still open on this device (CF-10). */
export function NextStepLife({club, href, name, compat}: {club: string; href: string; name: string; compat: LifeCompat | null}) {
  const [resume, setResume] = useState(false)
  useEffect(() => { try { setResume(!!lifeProgress(club, window.localStorage, compat)) } catch { setResume(false) } }, [club, compat])
  return <aside className="wk-panel wga-nextstep" aria-label="LIFE" data-testid="next-step" data-family="life" data-intent={resume ? 'resume' : 'start'} lang="en" dir="ltr"
    style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', marginBlockStart: '1.5rem', padding: '0.9rem 3rem 0.9rem 1rem'}}>
    <p style={{margin: 0}}><b>{resume ? 'Your story is waiting.' : 'Every supporter has a first match.'}</b> {resume ? `Pick up your life with ${name}.` : `More stories from ${name} — live them in LIFE.`}</p>
    <Link className="wk-btn min-h-tap" href={href}>{resume ? 'Continue LIFE' : 'Start LIFE'}</Link>
  </aside>
}
