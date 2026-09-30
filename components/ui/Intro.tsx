'use client'

import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/Badge'

import { t } from '@/lib/i18n'

/**
 * המסך הפותח — Maor's animation, played over the wall.
 *
 * The clip is six and a half seconds of an attack that ends in a goal, with שער 5 on the
 * banner behind the terrace. It is the best piece of motion this project has and it was
 * sitting in a folder, so the only real questions were where it plays and how quickly a
 * person can get past it.
 *
 * **It never blocks the ground.** The wall is rendered underneath and is already
 * complete before this mounts: the intro is an overlay, not a route. Anyone who lands on
 * a shared link, a crawler, or a person on a slow connection gets the gates either way.
 *
 * **It plays once a visit, not once a page.** `sessionStorage`, so coming back from a
 * game does not replay it and tomorrow's visit still gets the opening. Once-ever would
 * mean nobody sees it twice; every-time would mean six seconds between a supporter and
 * the thing they came for.
 *
 * **Anything a person does dismisses it.** A tap anywhere, the skip plate, Escape. It
 * also dismisses itself when the clip ends, and — the case that actually bites — if the
 * browser refuses to autoplay, because a poster frozen on screen waiting for a `ended`
 * event that will never fire is worse than no intro at all.
 *
 * **It is off entirely under `prefers-reduced-motion`.** Rule 21: every animation in
 * this app is, and a full-screen one is the least defensible exception.
 */

/** Belt and braces: the clip is 6.4s, so nothing should ever sit here longer than this. */
const FAILSAFE_MS = 8000
const KEY = 'worker.intro.v1'

export function Intro() {
  const [show, setShow] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Decided after mount, never during render: the server has no session storage and
    // no media query, and guessing either one is a hydration mismatch.
    let seen = false
    try {
      seen = window.sessionStorage.getItem(KEY) === '1'
    } catch {
      // storage blocked — treat it as unseen and let the skip plate do the work
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (seen || still) return
    setShow(true)
  }, [])

  useEffect(() => {
    if (!show) return
    const timer = window.setTimeout(() => dismiss(), FAILSAFE_MS)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    // The page must not scroll behind a full-screen overlay.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  /**
   * The flag is written HERE, not when the intro is chosen.
   *
   * Writing it up front looked equivalent and was not: React runs effects twice in
   * development, so the second pass read back the flag its own first pass had just
   * written, decided the opening had already been seen, and the intro never appeared at
   * all. Marking it seen at the moment it is actually over makes the effect idempotent
   * and makes the flag mean what its name says.
   */
  function dismiss() {
    try {
      window.sessionStorage.setItem(KEY, '1')
    } catch {
      // an intro that plays twice is a smaller problem than one that throws
    }
    setLeaving(true)
    window.setTimeout(() => setShow(false), 420)
  }

  useEffect(() => {
    if (!show) return
    const element = video.current
    if (!element) return
    // A browser that refuses the autoplay leaves a still frame and never fires `ended`.
    // Asking for the play and treating a rejection as "get out of the way" is the
    // difference between a nice opening and a stuck screen.
    void element.play().catch(() => dismiss())
  }, [show])

  if (!show) return null

  return (
    <div
      role="presentation"
      onClick={dismiss}
      // z-[60], above the tab bar's z-50. An opening that the navigation prints over is
      // not an opening, and the skip plate was landing underneath it.
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 overflow-hidden bg-ink px-5 ${
        leaving ? 'animate-liftOff' : ''
      }`}
    >
      {/* The clip is 1:1 and a phone is about 1:2, so `object-cover` cropped away more
          than half its width — the goal, the crowd and the שער 5 banner all gone, and
          what was left was one torso. The square is CONTAINED instead, and the ink that
          the letterbox leaves is used: the mark above it, the skip below. A title card
          made out of the dead space beats a crop that throws the animation away. */}
      <div className="flex items-center gap-3">
        {/* Through Badge, never a raw <Image>: the mark is drawn in exactly one place
            so no re-encoder can put yellow back into it (rule 8). */}
        <Badge size={52} priority />
        <p className="font-latin text-[22px] font-bold tracking-[0.14em] text-paper" dir="ltr">
          THE WORKER
        </p>
      </div>

      {/* object-cover on a square clip: the action is centred, and letterboxing an
          opening shot reads as a video embedded in a page rather than as the page. */}
      {/* Two sources, and both are needed.
          h.264 in an mp4 is the one every real browser decodes, Safari and iOS
          included, so it is what most people will actually get. But the open-source
          Chromium this project's QA runs in ships WITHOUT the proprietary h.264 decoder
          — `play()` rejects with "no supported source was found" — which meant the
          opening could not be verified here at all, only assumed. VP9 in a WebM is
          royalty-free, so it plays in the QA browser and in every evergreen Chromium,
          and the client downloads whichever ONE of the two it can use. Assuming a
          feature works is how this got shipped broken the first time. */}
      <video
        ref={video}
        className="max-h-[62vh] w-full max-w-[62vh] border-rule border-red object-contain"
        muted
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        onEnded={dismiss}
        onError={dismiss}
      >
        <source src="/video/intro.webm" type="video/webm" />
        <source src="/video/intro.mp4" type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={dismiss}
        className="min-h-tap border-rule border-paper px-8 font-body text-step-0 font-extrabold text-paper"
      >
        {t('intro.skip')}
      </button>
    </div>
  )
}
