'use client'
/**
 * LIFE · the game's front door on a club's own address (`/clubs/<id>/life`). The street, its people and the picture are a
 * large piece of code that only this page needs: it is fetched after the page has painted, behind the game's own first
 * screen, so the address answers at once on a phone (owner, 23.11.2026: a first-time visitor must never think it is stuck).
 */
import dynamic from 'next/dynamic'
import type {HoodHostProps} from './HoodHost'
import css from './hood.module.css'

const Host = dynamic(() => import('./HoodHost').then(m => m.HoodHost), {ssr: false, loading: () => <div className={css.lgDoor} role="status" aria-live="polite"><img src="/brand/life/life-logo-light-600.webp" alt="LIFE" width={240} height={157} decoding="async" /><span aria-hidden="true" /></div>})

export function HoodDoor(props: Pick<HoodHostProps, 'club' | 'quality'>) {
  return <Host {...props} reduced={false} />
}
