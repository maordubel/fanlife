'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { Grain } from '@/components/life/FilmFx'
import { FilmSkipButton } from '@/components/life/FilmSkipButton'
import { DocumentaryGround } from '@/components/life/OpeningDocumentary'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { nextFilmStep, outcomeForPlayError, type FilmNext } from '@/lib/life/filmPlayback'
import { FILM } from '@/lib/life/opening'
import { clockFor, FILM_CLOCK, FILM_START, step, type FilmSignal } from '@/lib/life/openingAttempt'

/**
 * The shared policy's answer, in this film's own vocabulary. `retry-muted` is handled by the
 * caller (it is an action, not a state); `run` needs no signal — `timeupdate` proves it.
 */
function signalFor(next: FilmNext): FilmSignal | null {
  if (next === 'gate') return 'refused'
  if (next === 'fallback') return 'broken'
  return null
}

/** what the film hands the documentary when it cannot go on */
export type FilmHandover = { sound: boolean; atMs: number }

/**
 * הפתיח, כסרט — 21.4 שניות בשחקנים חיים, ואז המשחק.
 *
 * מאור, 17.9.2026: *"זה הסרטון פתיחה שאני רוצה לצרף לתחילת המשחק החיים המלא במקום המצגת
 * שיש כעת"*, ואחרי המדידה: *"הסרטון מאושר כפי שהוא."* הסרט הוא תמיד הבחירה הראשונה.
 *
 * ## ניסיון הוגן, לא המתנה (מפרט 25.9.2026, §34–37, §57)
 *
 * עד היום שעון יחיד של שתי שניות הפיל כל טלפון איטי למצגת. עכשיו `lib/life/openingAttempt.ts`
 * מחליט, ושם כל המעברים:
 *
 *  1. **אוטופליי מושתק**, preload auto, WebM ואז MP4 — 2.5 ש׳.
 *  2. **`load()` + `play()` פעם אחת**, בשקט — עוד 1.8 ש׳.
 *  3. **"▶ להתחיל"** — רק כשהמדיה תקינה והדפדפן סירב להתחיל לבד (iOS בחיסכון סוללה).
 *     המחווה היא `play()`; אם גם היא נכשלת — הדוקומנטרי.
 *
 * אין לולאה ואין מסך שחור מת: כל עוד מחכים, מוצגים הפוסטר ומתחתיו אותה קרקע של הדוקומנטרי
 * (דיו, וינייטה, הנקודה האדומה שממנה החוט ייוולד). כשהסרט נופל הוא **דוהה לדיו** ב-420ms
 * והדוקומנטרי קם על אותם פיקסלים (§37). מרגע שנבחר מסלול לא חוזרים ממנו (§58) — חוץ
 * מהצלה אחת: סרט שהתנגן וקפא 6 שניות נמסר לדוקומנטרי **בביט המקביל**, לא מההתחלה.
 *
 * ## מה הקומפוננטה הזאת לא עושה
 *
 * **לא מדפיסה שום מילה על הסרט** — הכתוביות צרובות בתמונה. **ולא דורשת קול**: הסרט מתחיל
 * מושתק; כפתור הקול הוא המחווה, והבחירה עוברת הלאה לדוקומנטרי אם הסרט לא יכול.
 */
export function OpeningFilm({ onDone, onFallback }: { onDone: () => void; onFallback: (handover: FilmHandover) => void }) {
  const video = useRef<HTMLVideoElement | null>(null)
  const done = useRef(false)
  const latest = useRef(onDone)
  latest.current = onDone
  const fallback = useRef(onFallback)
  fallback.current = onFallback

  const [state, signal] = useReducer(step, FILM_START)
  const [sound, setSound] = useState(false)
  const soundRef = useRef(sound)
  soundRef.current = sound
  const [leaving, setLeaving] = useState(false)
  const wasRolling = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    latest.current()
  }, [])
  const dialogRef = useDialog<HTMLDivElement>(finish)

  /**
   * One attempt, judged by `lib/life/filmPlayback.ts` — the same policy the historical films
   * obey: refused with sound → the same attempt again, muted; refused muted → the gate (or,
   * after the gate's own gesture, the documentary); a media error → the documentary.
   */
  const tryPlay = useCallback((gestured = false) => {
    const el = video.current
    if (!el) return
    const attempt = () => {
      try {
        el.play()?.catch(judge)
      } catch (error) {
        judge(error)
      }
    }
    function judge(error: unknown) {
      if (!el) return
      const outcome = outcomeForPlayError(error, el.muted)
      if (!outcome) return
      const next = nextFilmStep(outcome, { gestured })
      if (next === 'retry-muted') {
        el.muted = true
        setSound(false)
        attempt()
        return
      }
      const sig = signalFor(next)
      if (sig) signal(sig)
    }
    attempt()
  }, [])

  // --- the browser knows neither encoding: nothing to wait for ----------------------
  useEffect(() => {
    const el = video.current
    if (!el) return
    const anyFormat =
      el.canPlayType('video/webm; codecs="vp9"') !== '' || el.canPlayType('video/mp4; codecs="avc1.640028"') !== ''
    if (!anyFormat) signal('broken')
  }, [])

  // --- what the media element says, heard natively (source errors do not bubble) -----
  useEffect(() => {
    const el = video.current
    if (!el) return
    const onTime = () => {
      if (el.currentTime > 0.05) signal('playing')
    }
    const onData = () => signal('data')
    const onError = () => {
      // every <source> failed, or the element itself did — `error` fires on the source
      // tags, which is why this listens in the capture phase on the video
      if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) signal('broken')
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadeddata', onData)
    el.addEventListener('canplay', onData)
    el.addEventListener('error', onError, true)
    // A failure that happened before this listener existed — the page is server-rendered,
    // and a blocked file can fail before hydration — is read off the element itself one
    // moment later: NO_SOURCE with no current source, well after source selection began, means
    // every candidate has already been tried. Attempt 2's `load()` is the second net.
    const late = window.setTimeout(() => {
      if (el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && el.readyState === 0 && el.currentSrc === '') signal('broken')
    }, 700)
    return () => {
      window.clearTimeout(late)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadeddata', onData)
      el.removeEventListener('canplay', onData)
      el.removeEventListener('error', onError, true)
    }
  }, [])

  // --- the attempts: 1 autoplay (the attribute, plus a play() we can hear refuse), 2 reload
  useEffect(() => {
    const el = video.current
    if (!el) return
    if (state.attempt === 'initial') tryPlay()
    if (state.attempt === 'retry-load') {
      el.load()
      tryPlay()
    }
    if (state.attempt === 'rolling') wasRolling.current = true
  }, [state.attempt, tryPlay])

  // --- the clock of the current attempt (a late `hasData` never restarts it) -----------
  const clock = clockFor(state)
  useEffect(() => {
    if (clock === null) return
    const id = window.setTimeout(() => signal('deadline'), clock)
    return () => window.clearTimeout(id)
  }, [state.attempt, state.tapped, clock])

  // --- rolling, then frozen: the network died under the film ---------------------------
  useEffect(() => {
    if (state.attempt !== 'rolling') return
    const el = video.current
    if (!el) return
    let last = el.currentTime
    let moved = Date.now()
    const id = window.setInterval(() => {
      if (el.paused || el.ended || document.visibilityState === 'hidden' || el.currentTime !== last) {
        last = el.currentTime
        moved = Date.now()
        return
      }
      if (Date.now() - moved > FILM_CLOCK.stall) signal('stalled')
    }, 1000)
    return () => window.clearInterval(id)
  }, [state.attempt])

  // --- committed to the documentary: fade the film to ink, then hand over --------------
  useEffect(() => {
    if (state.attempt !== 'failed' || done.current) return
    setLeaving(true)
    const atMs = wasRolling.current ? Math.round((video.current?.currentTime ?? 0) * 1000) : 0
    const id = window.setTimeout(() => {
      video.current?.pause()
      fallback.current({ sound: soundRef.current, atMs })
    }, FILM_CLOCK.handover)
    return () => window.clearTimeout(id)
  }, [state.attempt])

  const asking = state.attempt === 'gesture-ready'

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      className="absolute inset-0 z-[60] overflow-hidden bg-ink outline-none"
      aria-modal="true"
      aria-label={t('life.opening.film')}
      data-life="opening"
      data-path="film"
      data-attempt={state.attempt}
    >
      {/* the ground: what is under the poster, and under a poster that never arrived */}
      <DocumentaryGround point={state.attempt !== 'rolling'} />

      <video
        ref={video}
        poster={FILM.poster}
        muted={!sound}
        playsInline
        autoPlay
        preload="auto"
        onEnded={finish}
        className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[420ms] ease-out"
        style={{ opacity: leaving ? 0 : 1 }}
      >
        {/* 25.9.2026: ה-WebM קודד מחדש מתוך ה-MP4 (25.86 ש׳, 775 פריימים — הקובץ שעלה ב-23.9
            נחתך אחרי 7.95 ש׳), ולכן VP9 חוזר להיות הראשון, כמו שכלל 30 מסדר. */}
        <source src={FILM.webm} type='video/webm; codecs="vp9, opus"' />
        <source src={FILM.mp4} type='video/mp4; codecs="avc1.640028, mp4a.40.2"' />
      </video>

      <Grain opacity={0.1} />

      {/* attempt 3 — the one gesture: the whole glass is the button, the square is the sign */}
      {asking && !leaving && (
        <button
          type="button"
          onClick={() => {
            signal('tap')
            const el = video.current
            if (!el) return
            el.muted = !soundRef.current
            tryPlay(true)
          }}
          aria-label={t('life90g.film.playLabel')}
          data-life="opening-play"
          className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-4 animate-fx-pop"
        >
          <span aria-hidden="true" className={`odoc-play-mark ${state.tapped ? 'opacity-60' : ''}`} />
          <span className="bg-ink/85 px-4 py-1 font-display text-[20px] text-sheet">{t('life90g.film.play')}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setSound((on) => !on)
          // a gesture: from here the browser allows sound, and a refused autoplay may start
          const el = video.current
          if (el) {
            el.muted = sound
            void el.play()?.catch(() => undefined)
          }
        }}
        aria-pressed={sound}
        className="absolute z-10 flex min-h-tap items-center px-3 font-body text-[12px] text-concrete/60"
        style={{ insetInlineEnd: 12, bottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {sound ? t('life.opening.sound.on') : t('life.opening.sound.off')}
      </button>

      {/* skip, from the first frame — the shared control; Escape is `useDialog`'s */}
      <FilmSkipButton onSkip={finish} data-life="opening-skip" />
    </div>
  )
}
