import type { Metadata } from 'next'

import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { pickerRoster } from '@/lib/archive/player-master'
import { formationList, rosterIndex } from '@/lib/game/allTimeXI'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { seasonOf, wardrobe } from '@/lib/kit/playerShirt'
import { cupYearsBySlug, shirtBoard, type ShirtBoard } from '@/lib/xi/board'
import { voice } from '@/lib/voice'
import { XI_OPENING } from '@/lib/xi/prompt'
import type { XITab } from '@/lib/xi/store'
import { readCursor } from '@/lib/rotation/deck'
import { XIBuilder } from './XIBuilder'

/**
 * שער 1 — הרכב כל הזמנים, free play.
 *
 * The quiz version — assemble the exact XI that started a given match — lives at
 * `/lineup`. This one has no right answer at all, which is the point: it is the
 * argument, not the exam.
 *
 * **`?tab=worst` is read here**, and so is `?prompt=` (+ `r`), the Manager Prompt (§10). A
 * shared worst eleven has to open on the sheet it is about; a link that lands on the
 * other tab is the same small lie as a `?seed=` on a page that deals no round
 * (rule 19). There is still no seed: gate 1 deals nothing.
 */
export const metadata: Metadata = gateMetadata('xi')

/**
 * Every man's REAL shirt (delta 88, `lib/kit/playerShirt.ts`): keyed by slug for his own
 * era, and by `slug@<version>` for each version the chooser offers — the shirt follows the
 * version, as it always did.
 */
function xiWardrobe(all: ReturnType<typeof rosterIndex>['all'], shirts: ShirtBoard) {
  const rows: Array<{ key: string; player: string; season?: string }> = []
  for (const entry of all) {
    const player = entry.id ?? entry.slug
    rows.push({ key: entry.slug, player })
    for (const version of shirts.versions[entry.slug] ?? []) {
      rows.push({ key: `${entry.slug}@${version.id}`, player, season: version.seasonLabel ?? seasonOf(version.fromYear) })
    }
  }
  return wardrobe(rows)
}

export default function XIPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[]; prompt?: string | string[]; r?: string | string[] }
}) {
  const asked = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab
  // `?prompt=<seed>&r=<cursor>` — a Manager Prompt somebody handed over (§10). The seed and
  // cursor name the PROMPT; nothing about anybody's picks travels in a URL.
  const promptSeed = readCursor(searchParams?.prompt)
  const promptLink = promptSeed > 0 ? { seed: promptSeed, cursor: readCursor(searchParams?.r) } : null
  const intro = voice({ gate: 1, moment: 'intro', seed: XI_OPENING })
  const tab: XITab = asked === 'worst' ? 'worst' : 'best'
  const roster = rosterIndex()
  const shirts = shirtBoard(roster)

  return (
    <Screen title={t('screen.xi.title')} sub={t('screen.xi.sub')} stage>
      {/* §10 — the gate opens on a line, not on controls */}
      <div className="mt-stack hidden max-w-prose md:block" data-xi="intro">
        <p className="font-display text-step-2 leading-tight text-ink">{intro.title}</p>
        {intro.body && <p className="mt-1 font-body text-step-0 leading-relaxed text-muted">{intro.body}</p>}
      </div>
      <XIBuilder
        formations={formationList()}
        roster={roster}
        shirts={shirts}
        wardrobe={xiWardrobe(roster.all, shirts)}
        // the six slugs a reviewed merge retired (21.9.2026): a sheet saved under one of
        // them still opens, on the id it now belongs to
        slugAliases={pickerRoster().slugAliases}
        tab={tab}
        cupYears={cupYearsBySlug(roster)}
        promptLink={promptLink}
      />
      <ReportLink />
    </Screen>
  )
}
