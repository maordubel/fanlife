'use client'
/**
 * The chapter reel: a short documentary made of the game's own pieces — a ticking age, the places
 * of the day, one narrator line, the title. Code only (no video file): grain, letterbox, flicker
 * and a slow push-in over the club's own colours. A tap anywhere skips to the end; the begin button
 * is always there, so the day can start at any moment. Reduced motion (and automated browsers) get the last frame.
 */
import {useEffect, useMemo, useRef, useState} from 'react'
import {PixelSprite, spriteForKeep, type SpriteName} from './PixelSprite'
import {instantText} from './Typed'
import {reelBeats, shotFor, shotSrc, type ReelBeat, type ReelInput} from '@/lib/life/universal/reel'
import styles from './reel.module.css'

export function Reel({input, copy, ready, onBegin, onCue, storyProps, primary}: {
  input: ReelInput
  copy: Record<string, string>
  ready: boolean
  onBegin: () => void
  onCue?: (name: string) => void
  storyProps?: React.HTMLAttributes<HTMLElement>
  primary?: React.Ref<HTMLButtonElement>
}) {
  const sig = JSON.stringify(input)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => reelBeats(input), [sig])
  const [at, setAt] = useState(() => (instantText() ? beats.length - 1 : 0))
  const [age, setAge] = useState(() => (instantText() ? input.age : input.prevAge))
  const cue = useRef(onCue)
  cue.current = onCue
  const beat = beats[at]!
  const last = at >= beats.length - 1

  useEffect(() => {
    if (last) { cue.current?.('reveal'); return }
    cue.current?.('page')
    const t = setTimeout(() => setAt(n => Math.min(n + 1, beats.length - 1)), beat.ms)
    return () => clearTimeout(t)
  }, [at, beat.ms, beats.length, last])

  // the age counts up while the slate is on
  useEffect(() => {
    if (beat.k !== 'slate') { setAge(input.age); return }
    const span = beat.to - beat.from
    if (span <= 0) { setAge(beat.to); return }
    const steps = Math.min(span, 40), every = (beat.ms * 0.7) / steps
    let i = 0
    setAge(beat.from)
    const t = setInterval(() => { i++; setAge(Math.round(beat.from + (span * i) / steps)); if (i >= steps) clearInterval(t) }, every)
    return () => clearInterval(t)
  }, [beat, input.age])

  const sprite = input.keep ? spriteForKeep(input.keep) : 'cup'
  const scale = 6 + Math.min(age, 60) / 14
  // the beat stands on a still the world itself was photographed into; a club without shots (or a file that
  // will not load) keeps the code-drawn card it always had
  const voiceNo = beats.slice(0, at).filter(b => b.k === 'voice').length
  const src = input.club ? shotSrc(input.club, shotFor(beat, voiceNo)) : null
  const [broken, setBroken] = useState(false)
  const shot = !!src && !broken
  return (
    <div className={styles.reel} data-beat={beat.k} data-last={last ? 'true' : 'false'} data-shot={shot ? 'true' : 'false'} data-life="reel" onClick={() => !last && setAt(beats.length - 1)}>
      <div className={styles.frame} key={`${at}-${beat.k}`} data-k={beat.k}>
        {shot
          // eslint-disable-next-line @next/next/no-img-element -- a still from the club's own world, measured as shipped (rule 61): no re-encode
          ? <img className={styles.shot} src={src!} alt="" aria-hidden="true" decoding="async" onError={() => setBroken(true)} data-life="reel-shot" />
          : <div className={styles.dots} aria-hidden="true" />}
        <div className={styles.push}>{renderBeat(beat, age, scale, sprite, input, copy, storyProps)}</div>
      </div>
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.bar} data-at="top" aria-hidden="true" />
      <div className={styles.bar} data-at="bottom">
        <ol className={styles.ticks} aria-hidden="true">{beats.map((b, i) => <li key={i} data-on={i <= at ? 'true' : 'false'} />)}</ol>
        <button type="button" ref={primary} className={`${styles.begin} min-h-tap`} onClick={e => { e.stopPropagation(); onBegin() }} disabled={!ready} data-life="begin-day">
          {!ready ? copy.loading : last ? copy.beginDay : copy.reelSkip}
        </button>
      </div>
    </div>
  )
}

function renderBeat(b: ReelBeat, age: number, scale: number, sprite: SpriteName, input: ReelInput, copy: Record<string, string>, story?: React.HTMLAttributes<HTMLElement>) {
  switch (b.k) {
    case 'slate': return (
      <div className={styles.slate}>
        <p className={styles.reelNo}>№ <bdi>{String(b.no).padStart(2, '0')}</bdi> / <bdi>{String(b.of).padStart(2, '0')}</bdi></p>
        <p className={styles.ageNum} aria-label={`${copy.age} ${b.to}`}><bdi>{age}</bdi></p>
        <p className={styles.ageWord}>{copy.age}</p>
        <div className={styles.walker} aria-hidden="true"><PixelSprite name="kid" scale={scale} /></div>
      </div>
    )
    case 'place': return (
      <div className={styles.place}>
        <p className={styles.slateLabel}>{copy['place.now']} · <bdi>{b.i + 1}</bdi></p>
        <p className={styles.placeName} {...story}>{b.name}</p>
        <div className={styles.row} aria-hidden="true">
          <PixelSprite name="kid" scale={scale} />
          {b.i % 2 === 0 ? <PixelSprite name="ball" scale={Math.max(4, scale - 2)} className={styles.bounce} /> : <PixelSprite name="scarf" scale={Math.max(4, scale - 2)} />}
        </div>
      </div>
    )
    case 'voice': return (
      <div className={styles.voice}>
        <p className={styles.subtitle} {...story}>{b.text}</p>
      </div>
    )
    case 'title': return (
      <div className={styles.titleCard}>
        <p className={styles.slateLabel} {...story}>{b.kicker}</p>
        <h2 id="life-card-title" className={styles.bigTitle} {...story}>{b.title}</h2>
        <div className={styles.keep} aria-hidden="true"><PixelSprite name={sprite} scale={8} /></div>
      </div>
    )
  }
}
