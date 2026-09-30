'use client'

import Link from 'next/link'

import { Num } from '@/components/ui/Num'
import { BALLOT, type Ballot, type PollQuestion } from '@/lib/polls/ballot'
import { t } from '@/lib/i18n'

/**
 * הפתק — the eight questions as one document, not eight cards.
 *
 * `אגף הסקרים — הקלפי.dc.html` builds this as a fifth kind of screen the app did not
 * have yet: a form that prints itself. Every row keeps a fixed number well and a fixed
 * stamp cell — 38px and 44px, the two measurements that turn eight paragraphs into a
 * SHEET — and the seal action at the foot is disabled until every stamp is down. There
 * is no "submit" here, because nothing is sent anywhere: sealing prints a stamp on the
 * paper this device already holds and unlocks the count board, and that is the whole
 * transaction.
 *
 * Two things the reference drew that this component deliberately does not reproduce:
 *
 *  · **No second masthead.** The reference is a standalone page and gives itself a big
 *    red banner repeating the gate's name and tagline. `<Screen>` already prints that
 *    exactly once, in `<SignPlate>` — "the screen title, and only the screen title. One
 *    per screen" — so the document here starts at the status bar rather than saying
 *    "אגף הסקרים" a second time in a different type size.
 *  · **No circle.** The reference's seal button carries a round ring (`border-radius:
 *    9999px`) and its position markers do the same. Rule 8 is radius 0 everywhere,
 *    with three named files exempted for a lamp, an arcade stick and a goal net — none
 *    of them this one — so the ring is a square here, the same stamp motif the rest of
 *    the sheet already uses.
 *
 * ## השם על החולצה, and where it is actually kept (19.9.2026)
 *
 * The reference asks for the name on the intro screen and keeps it in its own variable.
 * A printed slip has a name line at the head, so that is where this one is — but the
 * field it writes is NOT a new one. `lib/game/member.ts` has held `nameHe` and `number`
 * since gate 10 was built, `lib/portal/sync.ts` already carries `nameHe` up to
 * `worker_profile.display_name`, and the brief is explicit: *"do not duplicate these fields
 * separately if the profile already stores them."* So typing a name here changes the
 * name on the shirt in gate 10, and signing in carries one name rather than two that
 * disagree (rule 59). The note under the field says so out loud, because a field that
 * quietly edits another screen is worse than one that does not.
 *
 * ## The progress rail (21.9.2026, players.md §2 Gate 7 V3)
 *
 * The questions are asked one at a time on the stage above (`QuestionStage`); this slip
 * is the rail under it: the row on the stage is marked, a tap on any row puts that
 * question on the stage, and a stamp goes down as each answer lands. The picks are ids
 * and codes now, printed through `display`. The Supporter ID and the share card moved to
 * the manifesto the seal opens (`Manifesto`).
 *
 * The honesty plate is the one element every one of the four states shares. It is
 * printed OUTSIDE both the seal-button branch and the sealed branch, not duplicated
 * into each — the same sentence, in the same place, whether the slip is empty, half
 * done, full or signed (B1, rule 4).
 */
export function BallotSlip({
  ballot,
  filled,
  complete,
  sealed,
  nameHe,
  current = null,
  display,
  onRowTap,
  onName,
  onSeal,
  onNewSlip,
}: {
  ballot: Ballot
  filled: number
  complete: boolean
  sealed: boolean
  /** the name on the shirt — the member book's, not a second copy of it */
  nameHe: string
  /** the question on the stage — its row is marked */
  current?: string | null
  /** how a stored pick is printed (an id → a name, a code → a label) */
  display: (question: PollQuestion, pick: string) => string
  onRowTap: (question: PollQuestion) => void
  onName: (value: string) => void
  onSeal: () => void
  onNewSlip: () => void
}) {
  return (
    <div className="paper mt-stack border-rule border-ink lg:mt-0">
      {/* status bar — the one line of instruction, and the ratio */}
      <div className="flex items-stretch border-b-hair border-ink bg-ink">
        <div className="min-w-0 flex-1 px-3.5 py-2.5">
          <p className="font-body text-[9.5px] font-extrabold leading-snug tracking-[0.16em] text-concrete">
            {sealed ? t('poll.status.sealed') : complete ? t('poll.status.complete') : t('poll.intro')}
          </p>
        </div>
        <div className="flex shrink-0 items-center border-s-hair border-concrete/35 px-3.5">
          <span className="font-mono text-[15px] font-bold text-red">
            <Num>{`${filled}/${BALLOT.length}`}</Num>
          </span>
        </div>
      </div>

      {/* the name line — a slip has one at the head, and it is the member book's own */}
      <div className="border-b-hair border-ink/30 px-3.5 py-2">
        <label className="block">
          <span className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-muted">
            {t('poll.name.label')}
          </span>
          {sealed ? (
            <span className="mt-0.5 block truncate font-sign text-[18px] font-bold text-red">
              {nameHe === '' ? t('poll.id.noName') : nameHe}
            </span>
          ) : (
            <input
              value={nameHe}
              onChange={(event) => onName(event.target.value)}
              maxLength={18}
              placeholder={t('poll.name.placeholder')}
              className="mt-0.5 block h-tap w-full border-hair border-ink/35 bg-sheet px-2 font-sign text-[18px] font-bold text-ink placeholder:font-body placeholder:text-[14px] placeholder:font-normal placeholder:text-muted"
            />
          )}
        </label>
        {!sealed && (
          <p className="mt-1 font-body text-[10.5px] leading-snug text-muted">
            {t('poll.name.note')}
          </p>
        )}
      </div>

      {/* eight numbered rows, one document */}
      <ol>
        {BALLOT.map((question, index) => {
          const pick = ballot[question.id] ?? ''
          const onStage = !sealed && current === question.id
          const body = (
            <>
              <p dir="ltr" className="font-latin text-[8.5px] font-bold leading-none tracking-[0.16em] text-muted">
                {question.latin}
              </p>
              <p className="mt-[3px] font-sign text-[16px] leading-[1.25] text-ink">{t(question.ask)}</p>
              {pick !== '' && (
                <p className="mt-1 truncate font-sign text-[18px] font-bold leading-tight text-red">
                  {display(question, pick)}
                </p>
              )}
            </>
          )
          return (
            <li
              key={question.id}
              aria-current={onStage ? 'step' : undefined}
              className={`flex items-stretch border-b-hair border-ink/30 ${onStage ? 'bg-ink/[.06]' : ''}`}
            >
              <div
                className={`flex w-[38px] shrink-0 items-center justify-center border-e-hair border-ink/30 ${
                  onStage ? 'bg-ink' : 'bg-ink/5'
                }`}
              >
                <span className={`font-poster text-[20px] leading-none ${onStage ? 'text-sheet' : 'text-muted'}`}>
                  <Num>{String(index + 1)}</Num>
                </span>
              </div>
              {sealed ? (
                <div className="min-w-0 flex-1 px-3 py-2 text-start">{body}</div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRowTap(question)}
                  className="min-w-0 flex-1 px-3 py-2 text-start transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
                >
                  {body}
                </button>
              )}
              <div className="flex w-11 shrink-0 items-center justify-center border-s-hair border-ink/30">
                <span
                  aria-hidden="true"
                  className={`block h-[22px] w-[22px] border-2 ${pick !== '' ? 'border-red bg-red' : 'border-ink/35'}`}
                />
              </div>
            </li>
          )
        })}
      </ol>

      {/* the seal action, disabled below 8/8 — or, once sealed, the stamp and the way out */}
      {!sealed ? (
        <div className="p-4">
          <button
            type="button"
            onClick={onSeal}
            disabled={!complete}
            aria-disabled={!complete}
            className={`flex min-h-[56px] w-full items-center justify-between gap-3 border-rule border-ink px-4 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none disabled:active:scale-100 ${
              complete ? 'bg-red' : 'bg-ink/10'
            }`}
          >
            <span className={`font-body text-[18px] font-extrabold ${complete ? 'text-sheet' : 'text-muted'}`}>
              {t('poll.seal.cta')}
            </span>
            <span className="flex items-center gap-2">
              <span
                dir="ltr"
                className={`font-latin text-[9px] font-bold tracking-[0.16em] ${
                  complete ? 'text-sheet/70' : 'text-muted/70'
                }`}
              >
                SEAL IT
              </span>
              <span
                aria-hidden="true"
                className={`block h-[26px] w-[26px] border-plate ${complete ? 'border-sheet' : 'border-muted'}`}
              />
            </span>
          </button>
          <p className="mt-2.5 font-body text-[12px] leading-relaxed text-muted">
            {complete ? t('poll.seal.hintComplete') : t('poll.seal.hintIncomplete')}
          </p>
        </div>
      ) : (
        <div className="relative p-4 pt-6">
          <span
            aria-hidden="true"
            className="absolute top-2 inline-block -rotate-[8deg] border-plate border-red/85 px-3.5 py-1 font-poster text-[26px] leading-none tracking-[0.06em] text-red/85"
          >
            {t('poll.sealed.stamp')}
          </span>

          <p className="mt-8 font-body text-[12px] leading-relaxed text-muted">{t('poll.manifesto.slipNote')}</p>

          <div className="mt-2.5 flex gap-2">
            <Link
              href="/polls/board"
              className="flex min-h-tap flex-1 items-center justify-center border-rule border-ink bg-sheet font-body text-[16px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
            >
              {t('poll.board.link')}
            </Link>
            <button
              type="button"
              onClick={onNewSlip}
              className="flex min-h-tap shrink-0 items-center justify-center border-rule border-ink bg-paper px-3.5 font-body text-[14px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
            >
              {t('poll.clear')}
            </button>
          </div>
        </div>
      )}

      {/* the honesty plate — every state, including after sealing (B1, rule 4). No
          rule above it: the colour change from paper to ink is the seam, the same way
          a gate plate's ink foot carries no border of its own. */}
      <div className="bg-ink p-4">
        <p className="font-body text-[9.5px] font-extrabold tracking-[0.2em] text-red">{t('poll.noCount')}</p>
        <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-concrete">{t('poll.noCountBody')}</p>
      </div>
    </div>
  )
}
