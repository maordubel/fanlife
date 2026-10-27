'use client'
import { useEffect, useMemo, useRef } from 'react'

import { Theatre } from '@/components/highlights/Theatre'
import { H, NARROW, RES, WIDE, draw, drawEnds, freshCam } from '@/components/highlights/paint'
import { PALETTE, type Palette } from '@/lib/highlights/kit'
import { qaReel } from '@/lib/highlights/qa-reel'
import { sceneFor, type Scene } from '@/lib/highlights/scenes'

/** QA only: each scene as three stills — the first touch, the decisive frame, a beat after it */
export function Stand({ shape, play, narrow }: { shape: number | null; play: boolean; narrow: boolean }) {
  const reel = useMemo(qaReel, [])
  const scenes = useMemo(() => reel.moments.map((m, i) => sceneFor(reel, m, i)), [reel])
  if (play) return <main style={{ padding: 12 }}><Theatre reel={reel} autoStart /></main>
  const shown = shape === null ? scenes : scenes.slice(shape, shape + 1)
  return (
    <main data-qa="highlights" style={{ display: 'grid', gap: 16, padding: 12 }}>
      <section data-scene="ends"><p style={{ font: '600 13px monospace', margin: '0 0 4px' }}>half time · the teams change ends</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 6 }}><Ends reel={reel} w={WIDE} /><Ends reel={reel} w={NARROW} /></div></section>
      {shown.map((sc) => <Row key={sc.id} sc={sc} reel={reel} w={narrow ? NARROW : WIDE} />)}
    </main>
  )
}
function Row({ sc, reel, w }: { sc: Scene; reel: ReturnType<typeof qaReel>; w: number }) {
  const key = sc.cues.find((q) => ['goal', 'save', 'post', 'card-yellow', 'card-red', 'flag'].includes(q.kind))?.t ?? sc.duration * 0.6
  const kick = sc.cues.filter((q) => q.kind === 'kick').at(-1)?.t ?? key - 0.4
  const times = [Math.max(0, kick - 0.8), kick + 0.05, key, Math.min(sc.duration, key + 0.9)]
  return (
    <section data-scene={sc.variant}>
      <p style={{ font: '600 13px var(--mag-mono, monospace)', margin: '0 0 4px' }}>{sc.moment.minute}′ · {sc.outcome} · {sc.variant} · {sc.duration.toFixed(1)}s</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 6 }}>
        {times.map((t) => <Still key={t} sc={sc} t={t} teams={reel.teams} w={w} />)}
      </div>
    </section>
  )
}
function Still({ sc, t, teams, w }: { sc: Scene; t: number; teams: ReturnType<typeof qaReel>['teams']; w: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current?.getContext('2d'); if (!c) return
    // the camera settles as it would in play: walk it from the start of the scene to the still
    const cam = freshCam()
    for (let u = 0; u < t; u += 0.05) draw(c, sc, u, cam, true, PALETTE as unknown as Palette, teams, w)
    draw(c, sc, t, cam, true, PALETTE as unknown as Palette, teams, w)
  }, [sc, t, teams, w])
  return <figure style={{ margin: 0 }}><canvas ref={ref} width={w * RES} height={H * RES} style={{ inlineSize: '100%', imageRendering: 'pixelated' }} /><figcaption style={{ font: '12px monospace' }}>t={t.toFixed(2)}</figcaption></figure>
}
function Ends({ reel, w }: { reel: ReturnType<typeof qaReel>; w: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { const c = ref.current?.getContext('2d'); if (c) drawEnds(c, reel.teams, 40, 50, 1, PALETTE as unknown as Palette, w) }, [reel, w])
  return <canvas ref={ref} width={w * RES} height={H * RES} style={{ inlineSize: '100%', imageRendering: 'pixelated' }} />
}
