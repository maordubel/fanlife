'use client'

import { useEffect, useState } from 'react'

import { mintChallengeAction } from '@/app/c/actions'
import { track } from '@/lib/analytics/meter'
import { GATE_ROUTE, type ChallengeGate, type ChallengeParams, type ChallengeResult } from '@/lib/challenges/contract'
import { challengeLink } from '@/lib/challenges/create'
import { inviteLine, telegramInviteHref, whatsappInviteHref } from '@/lib/challenges/invite'
import { decodeChallenge } from '@/lib/challenges/resolve'
import { emit, type ShareChannel } from '@/lib/profile/events'
import { challengeUrl, dareKey, whatsappHref, telegramHref, type ShareKind } from '@/lib/share/copy'
import { renderStory, type StoryCard } from '@/lib/share/story'
import { t, type MessageKey } from '@/lib/i18n'
import { SHARE_KEY } from '@/lib/voice/messages'
import { StandPost } from './StandPost'

/**
 * שורת השיתוף — "שלח ליציע" (ONE RED WORLD §2.1): four ways out of the app, in the order
 * they actually get used. The ONE share system (rule 19).
 *
 * 1. **סטורי** — renders the 1080×1920 artefact (`lib/share/story.ts`, §28) and hands it
 *    to `navigator.share({ files })`; on a desktop it downloads instead, and says so.
 * 2. **וואטסאפ** — the gate's own short human line (§29), then the link on its own line.
 * 3. **טלגרם** — the same, for the channels.
 * 4. **העתק קישור** — the fallback that always works.
 *
 * **Share V2 · the challenge.** A gate that passes `challenge` (the run it played and what
 * the player did) gets a `/c/<code>` link instead of the bare `?seed=` one: the landing
 * there carries the Open Graph card, re-checks that the seed still deals the same run,
 * and forwards the recipient into the identical run with the comparison waiting at the
 * end (`lib/challenges`). The code is minted on the server once the row is on screen
 * (the run's fingerprint, and for gate 10 the sealed man, are the server's to take);
 * until it answers — or if it never does — every button falls back to the plain
 * same-seed link, so a share never waits on the network to work.
 */
export type ShareChallenge = {
  gate: ChallengeGate
  /** what the player did — REAL ids; the challenge hashes them before they travel */
  result?: ChallengeResult
  params?: ChallengeParams
  /** defaults to `params.s` / `params.r` of the row */
  seed?: number
  cursor?: number
}

export function ShareRow({
  kind,
  params,
  headline,
  card,
  route,
  challenge,
}: {
  kind: ShareKind
  /** whatever the message template needs, plus `s` for the seed and `r` for the cursor */
  params: Record<string, string>
  /**
   * The exact path the link should land on, when the gate's own route is not enough.
   * Trivia is the case that forced it: the topic is a route SEGMENT, so `/trivia` sends
   * a challenged friend to the picker instead of to the round being bragged about.
   */
  route?: string
  /** the value the message leads with */
  headline: string
  /** the story card; omit and the story button is hidden */
  card?: StoryCard
  /** Share V2 — make the link a challenge (same run + the comparison at the end) */
  challenge?: ShareChallenge
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<MessageKey | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const seed = params.s ?? '1'
  const cursor = params.r ?? '0'
  const vars = { ...params, headline }

  const draftKey = challenge ? JSON.stringify(challenge) : ''
  useEffect(() => {
    if (!challenge) return
    let live = true
    const draft = {
      gate: challenge.gate,
      seed: challenge.seed ?? (challenge.gate === 1 || challenge.gate === 10 ? undefined : Number(seed)),
      cursor: challenge.cursor ?? Number(cursor),
      params: challenge.params ?? {},
      ...(challenge.result ? { result: challenge.result } : {}),
    }
    mintChallengeAction(draft)
      .then((minted) => {
        if (live) setCode(minted)
      })
      .catch(() => {
        // no code: the plain same-seed link is still a real link
      })
    return () => {
      live = false
    }
    // the draft is compared by value — a new object with the same run is not a new challenge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, seed, cursor])

  // the minted code, read back — for gate 10 its result is the server's, not the page's
  const decoded = code ? decodeChallenge(code) : null
  const link = code ? challengeLink(code) : challengeUrl(kind, seed, cursor, route)
  const gateRoute = challenge ? GATE_ROUTE[challenge.gate] : undefined

  // Every way out is a share on the card (`profile.shares`), counted when it actually
  // happened — a sheet opened, a link copied — never on a failed attempt. Share V2 adds
  // the plan's own names (§37): `share_created` per channel, `challenge_created` when the
  // thing shared was a challenge.
  const shared = (channel: ShareChannel) => {
    emit({ type: 'shared', kind, channel })
    track('share_created', { detail: `${kind}:${channel}`, ...(gateRoute ? { gate: gateRoute } : {}) })
    if (decoded && challenge) track('challenge_created', { detail: `g${challenge.gate}:${channel}`, gate: GATE_ROUTE[challenge.gate] })
  }

  async function story() {
    if (!card || busy) return
    setBusy(true)
    setNote(null)
    try {
      const blob = await renderStory(card)
      if (!blob) throw new Error('no blob')
      const file = new File([blob], 'the-worker.png', { type: 'image/png' })
      const shareable =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      if (shareable) {
        await navigator.share({ files: [file], text: link })
        shared('story')
      } else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'the-worker.png'
        anchor.click()
        URL.revokeObjectURL(url)
        shared('story')
        setNote('share.downloaded')
      }
    } catch {
      setNote('share.failed')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      shared('copy')
      setNote('share.copied')
    } catch {
      setNote('share.failed')
    }
  }

  const wa = code && decoded ? whatsappInviteHref(decoded, code) : whatsappHref(kind, vars, seed, cursor, route)
  const tg = code && decoded ? telegramInviteHref(decoded, code) : telegramHref(kind, vars, seed, cursor, route)

  return (
    <section aria-label={t(SHARE_KEY)} data-share-row={code ? 'challenge' : 'seed'} className="mt-stack border-rule border-ink bg-ink p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-step-1 leading-none text-paper">{t(SHARE_KEY)}</p>
        <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-red" dir="ltr">
          SPREAD IT
        </p>
      </div>
      {/* The dare describes what the LINK does, so it cannot be one sentence for every
          gate: a gate with a seed hands over the identical round, and the polls wing
          hands over a blank slip. A challenge says it in the gate's own voice (§29). */}
      <p className="mt-1.5 font-body text-[11.5px] leading-relaxed text-concrete">
        {decoded ? inviteLine(decoded) : t(dareKey(kind))}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {card && (
          <button
            type="button"
            onClick={story}
            disabled={busy}
            className="col-span-2 flex min-h-tap items-center justify-center gap-2 bg-red px-4 font-body text-step-0 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-60 motion-reduce:transition-none"
          >
            {busy ? (
              t('share.building')
            ) : (
              <>
                {t('share.story')}
                <span className="font-latin text-[9px] tracking-[0.16em] opacity-75" dir="ltr">
                  {t('share.storySize')}
                </span>
              </>
            )}
          </button>
        )}
        <a
          href={wa}
          onClick={() => shared('whatsapp')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-tap items-center justify-center border-hair border-concrete/50 px-3 font-body text-step-0 font-extrabold text-paper"
        >
          {t('share.whatsapp')}
        </a>
        <a
          href={tg}
          onClick={() => shared('telegram')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-tap items-center justify-center border-hair border-concrete/50 px-3 font-body text-step-0 font-extrabold text-paper"
        >
          {t('share.telegram')}
        </a>
        <button
          type="button"
          onClick={copy}
          className="col-span-2 flex min-h-tap items-center justify-center border-hair border-concrete/50 px-3 font-body text-step--1 text-concrete"
        >
          {t('share.copy')}
        </button>
      </div>
      <StandPost link={link} headline={headline} />

      {note && (
        <p aria-live="polite" className="mt-2 font-body text-[11px] text-red">
          {t(note)}
        </p>
      )}
    </section>
  )
}
