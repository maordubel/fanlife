'use client'

import { useEffect, useRef, useState } from 'react'

import { FilmSkipButton } from '@/components/life/FilmSkipButton'
import { t } from '@/lib/i18n'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'

/**
 * מעברון — a short documentary breath between playable rooms.
 *
 * Most clips are four seconds. `cup83-archive` is intentionally different: it is the
 * first real archive reveal of the game, shown after the player has already lived the
 * 1983 memory in Kobi's arms. It may therefore run for the length of the supplied film,
 * but it obeys the same fail-open rule as every other transition: a codec/error can never
 * stop the life underneath it.
 */
export function FilmCut({ film, onDone }: { film: NonNullable<LifeBusEvents['film']>; onDone: () => void }) {
  const archive = film.clip === 'cup83-archive'
  const [gone, setGone] = useState(false)
  const [sound, setSound] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const video = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    // The ordinary city clips are ~4 s. The supplied 1983 archive film is ~32 s.
    // Both get a hard ceiling, so neither a missing `ended` nor a decode stall can softlock.
    timer.current = setTimeout(() => setGone(true), archive ? 38_000 : 6_200)

    const attempt = video.current?.play()
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => onDone())

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.clip, archive])

  useEffect(() => {
    if (!gone) return
    const out = setTimeout(onDone, 620)
    return () => clearTimeout(out)
  }, [gone, onDone])

  return (
    <div
      dir="rtl"
      className={`absolute inset-0 z-[97] flex items-center justify-center bg-ink transition-opacity duration-500 ${
        archive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${gone ? 'opacity-0' : 'opacity-100'}`}
      data-life="film-cut"
      aria-hidden={!archive}
      style={{
        backgroundImage: `url(/life/film/${film.clip}.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={video}
        key={film.clip}
        src={`/life/film/${film.clip}.mp4`}
        poster={`/life/film/${film.clip}.jpg`}
        autoPlay
        muted={!archive || !sound}
        playsInline
        preload="auto"
        onEnded={() => setGone(true)}
        onError={onDone}
        className="h-full w-full bg-transparent object-contain motion-safe:animate-[film-in_500ms_ease-out_both]"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-ink via-ink/65 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-[8%] px-gutter text-center motion-safe:animate-[film-in_900ms_ease-out_both]">
        {archive && (
          <span className="mb-2 inline-flex border border-red/60 bg-ink/70 px-2 py-1 font-mono text-[9px] tabular-nums tracking-[0.16em] text-red">
            {t('life.filmCut.archive1983')}
          </span>
        )}
        <p className="font-body text-[13px] leading-snug text-sheet/90">
          <bdi>{film.captionHe}</bdi>
          <span className="block pt-1 font-mono text-[10px] tabular-nums tracking-[0.18em] text-concrete/70">
            {t('life.film.source')}
          </span>
        </p>
      </div>

      {/* (delta 93, brief §29) the long archive film carries the same skip as every other film;
          the four-second city breaths are not interactive and need none */}
      {archive && <FilmSkipButton onSkip={() => setGone(true)} data-life="film-cut-skip" />}

      {archive && (
        <button
          type="button"
          onClick={() => {
            setSound((value) => !value)
            const el = video.current
            if (el) void el.play().catch(() => undefined)
          }}
          className="absolute bottom-4 end-4 z-[2] min-h-tap border border-sheet/20 bg-ink/75 px-3 font-body text-[11px] text-sheet/80"
          aria-pressed={sound}
        >
          {sound ? t('life.filmCut.mute') : t('life.filmCut.sound')}
        </button>
      )}
    </div>
  )
}
