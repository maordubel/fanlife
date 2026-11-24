import type {Metadata} from 'next'
import Link from 'next/link'
import copy from '@/messages/life-soon/en.json'
import styles from './soon.module.css'
import {CHANNEL} from '@/lib/stories/channel'
import {Shell} from '@/components/master/Shell'

export const metadata: Metadata = {title: copy.metaTitle, description: copy.metaDescription, robots: {index: false, follow: true}}

/**
 * Every LIFE door lands here while LIFE is closed (owner, 24.11.2026). The middleware rewrites `/life`,
 * `/clubs/<id>/life`, the Telegram LIFE and the LIFE labs to this screen for anyone but the owner.
 * Two designs: on a phone the terrace fills the screen behind the words; on a desk the words and the picture sit side by side.
 */
export default function LifeComingSoon() {
  return (
    <Shell>
    <main id="main" className={styles.soon}>
      <picture className={styles.art}>
        <source media="(min-width: 900px)" srcSet="/life-soon/terrace-1080.webp" />
        <img src="/life-soon/terrace-540.webp" alt="" width={540} height={960} decoding="async" fetchPriority="high" />
      </picture>
      <div className={styles.veil} aria-hidden="true" />
      <section className={styles.copy} aria-labelledby="soon-h">
        <p className={styles.kicker}>{copy.kicker}</p>
        <h1 id="soon-h" className={styles.title}>{copy.title}</h1>
        <p className={styles.stamp}>{copy.stamp}</p>
        <p className={styles.line}>{copy.line}</p>
        <p className={styles.lede}>{copy.lede}</p>
        <p className={styles.status}><span className={styles.dot} aria-hidden="true" />{copy.status}</p>
        <nav className={styles.actions}>
          <Link className={styles.primary} href="/">{copy.home}</Link>
          <Link className={styles.ghost} href="/our-games">{copy.games}</Link>
          <a className={styles.ghost} href={CHANNEL.url} target="_blank" rel="noreferrer">{copy.channel} ↗</a>
        </nav>
      </section>
    </main>
    </Shell>
  )
}
