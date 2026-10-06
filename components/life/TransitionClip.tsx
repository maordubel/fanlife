'use client'

import { useEffect, useRef } from 'react'
import { FilmSkipButton } from '@/components/life/FilmSkipButton'
import { TRANSITIONS, type TransitionKey } from '@/lib/life/transitions'

/**
 * A cut between two places, played over the game. Muted, decorative (aria-hidden), always
 * skippable, gone under reduced motion, and if the file will not play it calls `onDone` at
 * once — the story never waits for a video (film-playback policy §5–6).
 */
export function TransitionClip({ clip, onDone }: { clip: TransitionKey; onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }
  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      finish()
      return
    }
    const video = ref.current
    if (video) {
      // React sets `muted` as a property only; iOS Safari wants the attribute to allow autoplay.
      video.muted = true
      video.setAttribute('muted', '')
      video.setAttribute('webkit-playsinline', '')
    }
    const guard = window.setTimeout(finish, TRANSITIONS[clip].ms + 1500)
    const play = video?.play()
    if (play) play.catch(() => finish())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(guard)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip])
  return (
    <div className="absolute inset-0 z-[41] overflow-hidden bg-ink" data-life="transition-clip" data-clip={clip}>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        onEnded={finish}
      >
        <source src={TRANSITIONS[clip].mp4} type="video/mp4" />
        <source src={TRANSITIONS[clip].src} type="video/webm" onError={finish} />
      </video>
      <div className="absolute bottom-3 end-3 z-[42]">
        <FilmSkipButton onSkip={finish} data-life="transition-skip" />
      </div>
    </div>
  )
}
