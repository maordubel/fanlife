'use client'

import { ShareRow } from '@/components/share/ShareRow'
import { t } from '@/lib/royal-rumble/i18n'
import { posterCard } from '@/lib/share/artefacts'
import { voiceAction } from '@/lib/voice'

/**
 * "אותם קלפים, אותו יריב" — the gate's challenge banner, now on the result screen and
 * sharing through the ONE share system (rule 19): the five-player poster (§28) and a
 * challenge link that hands over the same round (`?seed=` + `r`) with this five hashed
 * for the comparison at the end. The live H2H is a different thing and keeps its room.
 *
 * `seed` is the board's own offer seed — printed as the code. The LINK carries the round
 * (`roundSeed` + `cursor`), because the route folds the cursor in again.
 */
export function RoyalRumbleChallenge({
  seed,
  roundSeed,
  cursor = 0,
  five,
}: {
  seed: number
  roundSeed: number
  cursor?: number
  /** the five the player sent out, in slot order — slug for the challenge, role + name for the poster */
  five: ReadonlyArray<{ slug: string; roleHe: string; nameHe: string }>
}) {
  const code = String(seed >>> 0).padStart(8, '0').slice(-8)

  return (
    <aside className="relative mx-auto mt-3 w-full max-w-5xl shrink-0 overflow-hidden border-rule border-ink bg-paper text-ink">
      <div className="absolute inset-y-0 start-0 w-2 bg-red" />
      <div className="relative p-3 ps-5 sm:p-4 sm:ps-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono tabular-nums text-[8px] font-black tracking-[0.22em] text-red" dir="ltr">SAME RUMBLE · SAME ENEMY</span>
          <span className="border-hair border-ink/20 px-2 py-0.5 font-mono tabular-nums text-[9px] font-black tracking-[0.12em]" dir="ltr">#{code}</span>
        </div>
        <h2 className="mt-1 font-display text-[20px] leading-none sm:text-[29px]">{voiceAction(9, 'sameCards')}</h2>
        <p className="mt-1 max-w-2xl font-body text-[10px] leading-relaxed text-concrete">{t('challengeBody')}</p>
        <ShareRow
          kind="rumble"
          params={{ s: String(roundSeed), r: String(cursor) }}
          headline={`#${code}`}
          card={posterCard({ rows: five.map((man) => ({ role: man.roleHe, name: man.nameHe })) })}
          challenge={{ gate: 9, result: { gate: 9, picks: five.map((man) => man.slug) } }}
        />
      </div>
    </aside>
  )
}
