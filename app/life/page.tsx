import type { Metadata } from 'next'

import { Screen } from '@/components/ui/Screen'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { resolveChapterAnchor, resolvePrologueAnchor, resolveStageBAnchor, resolveUssishkinAnchor, resolveStageBAnchors } from '@/lib/life/anchor-server'

import { lifeDoors, lifeTriviaDoors } from '@/lib/life/bridge'
import { chapterFor } from '@/lib/life/content/chapters'

import { LifeStage } from './LifeStage'
import { resolveMechanicCatalog } from './mechanicCatalog'

/**
 * THE WORKER LIFE — the vertical slice.
 *
 * The route is a server component for one reason and it is the important one: the
 * canonical archive is `server-only`, so the anchors are resolved HERE and handed down as
 * plain objects. The game therefore never reads `content/manual/*`, never parses anything
 * and never touches Red-Fans data — the module boundary enforces brief §4 rather than a
 * convention doing it.
 *
 * `chrome={false}` because a game screen belongs to the game (rule 21).
 */
/**
 * A shared ticket lands here with `?ch=<chapter>` (§28, `StageFinale`): the chapter names the
 * preview ("חזרתי עכשיו ל־1986.") and nothing else — the game still opens where THIS device's
 * life stands, never in the middle of somebody else's chapter.
 */
export function generateMetadata({ searchParams }: { searchParams?: { ch?: string | string[] } }): Metadata {
  const base = gateMetadata('life')
  const raw = Array.isArray(searchParams?.ch) ? searchParams?.ch[0] : searchParams?.ch
  const chapter = typeof raw === 'string' && raw.length <= 40 ? chapterFor(raw) : null
  if (!chapter) return base
  const description = t('artefact.ticket.cta', { year: String(chapter.year) })
  return { ...base, description, openGraph: { ...base.openGraph, description }, twitter: { ...base.twitter, description } }
}

export default function LifePage() {
  const anchor = resolveChapterAnchor()
  const prologueAnchor = resolvePrologueAnchor()
  // `prologue` is in the map because `{anchor}` in a 1983 line must resolve to the 1983
  // fact. Without it the era lookup fell through to 1986 and the first memory in the game
  // printed a championship that had not happened yet.
  const anchors = { prologue: prologueAnchor, '1986': anchor, '1990': resolveStageBAnchor(), '1991': resolveUssishkinAnchor(), ...resolveStageBAnchors() }

  return (
    <Screen title={t('life.title')} sub={t('life.sub')} chrome={false} fullBleed night>
      <LifeStage anchor={anchor} prologueAnchor={prologueAnchor} anchors={anchors} catalog={resolveMechanicCatalog()} doors={lifeDoors()} trivia={lifeTriviaDoors()} />
    </Screen>
  )
}
