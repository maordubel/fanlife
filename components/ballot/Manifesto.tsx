'use client'

import { ShareRow } from '@/components/share/ShareRow'
import { SupporterId } from '@/components/ballot/SupporterId'
import { Confetti } from '@/components/play/Confetti'
import type { KitSpec } from '@/lib/kit/spec'
import { BALLOT, type Ballot, type PollQuestion } from '@/lib/polls/ballot'
import type { PickFact } from '@/lib/polls/pickFact'
import type { SupporterId as Id } from '@/lib/polls/supporter'
import { t } from '@/lib/i18n'
import { debateCard } from '@/lib/share/artefacts'

/**
 * המניפסט — what a sealed slip turns into (players.md §2, Gate 7 "A — Manifesto").
 *
 * One sentence in the voter's own picks — the favourite, the number, the position — and
 * the line that keeps it honest: nobody on the terrace has to agree with it. Under it the
 * Supporter ID with EVERY reason the voter marked (the reference printed four), and the
 * share card. The celebration is the house `Confetti`, which draws nothing under
 * `prefers-reduced-motion` and cleans itself up after 1.4s; it plays once, at the seal.
 *
 * Nothing here is a verdict. A ballot is an opinion, and the manifesto is the opinion
 * printed large.
 */
export function Manifesto({
  ballot,
  supporter,
  nameHe,
  shirt,
  favourite,
  celebrate,
  display,
}: {
  ballot: Ballot
  supporter: Id
  nameHe: string
  shirt: KitSpec
  favourite: PickFact | null
  /** true only on the render that follows the seal itself — never on a reload */
  celebrate: boolean
  display: (question: PollQuestion, pick: string) => string
}) {
  const sentence = t('poll.manifesto.sentence', {
    favourite: supporter.favourite ?? t('poll.manifesto.noFavourite'),
    number: supporter.number === null ? '—' : String(supporter.number),
    position: supporter.positionHe ?? t('poll.manifesto.noPosition'),
  })
  return (
    <section className="border-rule border-ink bg-sheet" aria-labelledby="poll-manifesto-title">
      {celebrate && <Confetti />}
      <div className="bg-ink px-4 py-3">
        <p dir="ltr" className="text-end font-latin text-[9px] font-bold tracking-[0.2em] text-red">
          GATE 07 · SUPPORTER MANIFESTO
        </p>
        <h2 id="poll-manifesto-title" className="mt-1 font-display text-step-2 leading-tight text-sheet">
          {t('poll.manifesto.title')}
        </h2>
      </div>
      <p className="px-4 pt-3 font-sign text-[19px] font-bold leading-snug text-ink">{sentence}</p>
      <p className="px-4 pt-1 font-body text-[11px] leading-snug text-muted">{t('poll.manifesto.note')}</p>

      <div className="p-4">
        <SupporterId id={supporter} shirt={shirt} favourite={favourite} />
      </div>

      <div className="px-4 pb-4">
        <ShareRow
          kind="polls"
          params={{ n: String(supporter.filled) }}
          headline={t('poll.slip')}
          // §28: the debate sticker — "אני לקחתי את X. מה אתה אומר?" — on the favourite; a
          // slip with no favourite marked still travels as the whole printed ballot
          card={supporter.favourite ? debateCard({ question: t('poll.favourite'), pick: supporter.favourite }) : {
            template: 'ballot' as const,
            kicker: 'GATE 7 · THE BALLOT',
            label: t('screen.polls.title'),
            eyebrow: t('poll.slip'),
            hero: t('poll.slip'),
            stats: [],
            // The name goes on as a ROW rather than into the hero line: the ballot
            // template sizes its rows by how many there are and measures every baseline.
            ballot: [
              ...(nameHe === '' ? [] : [{ ask: t('poll.name.label'), latin: 'NAME ON THE SHIRT', pick: nameHe }]),
              ...BALLOT.filter((question) => (ballot[question.id] ?? '') !== '').map((question) => ({
                ask: t(question.ask),
                latin: question.latin,
                pick: display(question, ballot[question.id] as string),
              })),
            ],
            cta: t('poll.cta'),
            challenge: t('poll.challenge'),
          }}
        />
      </div>
    </section>
  )
}
