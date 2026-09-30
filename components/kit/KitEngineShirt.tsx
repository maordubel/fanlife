import { useId, type ReactNode } from 'react'

import { MakerMark } from '@/components/kit/MakerMark'
import {
  resolveKitRender,
  type KitLook,
  type KitMarkPlan,
  type KitMarksRegime,
  type KitRenderPlan,
  type RenderBox,
} from '@/lib/kit/engine'
import type { KitBodyTemplate } from '@/lib/kit/body-templates'
import type { CollarId, KitSpec, NamesetId, PatternId, SleeveId } from '@/lib/kit/spec'

/**
 * The canonical shirt renderer — one engine, two looks (`lib/kit/engine.ts`).
 *
 * `look="photo"` prints the spec on the template's photographed garment where the template has
 * geometry for it, and falls back to the drawn cloth where it does not; `marks="granted"` prints
 * the real maker/sponsor logos Maor granted to gates 4–5 (rule 25 stands everywhere else).
 * `crop="top"` frames the shoulders and collar, for a construction card.
 *
 * Every layer, marks included, is inside ONE svg in the board's own units, so a caller can give
 * the shirt any box and nothing on it moves.
 */
export function KitEngineShirt({
  spec,
  className = '',
  title,
  look = 'vector',
  marks = 'rule25',
  crop = 'full',
  density = 'full',
}: {
  spec: KitSpec
  className?: string
  title?: string
  look?: KitLook
  marks?: KitMarksRegime
  crop?: 'full' | 'top'
  /**
   * `mini` — the same engine plan at thumbnail density (a roster row, a pitch chip, a
   * poster). The weave, the fold light, the dashed seams and the maker/sponsor marks are
   * noise at 28px and cost a pattern, a gradient and an image each, per row; the cloth,
   * the construction, the collar and the printed crest stay, and the outline is solid
   * ink so a red shirt never meets grass edge-on (docs/16). Always the drawn look.
   */
  density?: 'full' | 'mini'
}) {
  const uid = useId().replace(/:/g, '')
  const mini = density === 'mini'
  const plan = onTheBand(resolveKitRender(spec, { look: mini ? 'vector' : look, marks }), spec)
  const h = crop === 'top' ? Math.round(plan.height * (plan.photo ? 0.5 : 0.55)) : plan.height
  const viewBox = `0 0 ${plan.width} ${h}`
  return (
    <span className={`relative inline-block ${className}`} style={{ aspectRatio: `${plan.width} / ${h}` }} data-kit-look={plan.look}>
      <svg viewBox={viewBox} className="absolute inset-0 h-full w-full" role="img" aria-label={title ?? spec.seasonLabel}>
        {title && <title>{title}</title>}
        {plan.photo ? (
          <PhotoGarment plan={plan} spec={spec} uid={uid} />
        ) : (
          <VectorGarment plan={plan} spec={spec} uid={uid} mini={mini} />
        )}
      </svg>
    </span>
  )
}

/**
 * A chest band runs right under the sponsor, so the sponsor prints on the BAND, not the cloth:
 * a cream KETER on a cream band vanished (delta 88). The band's contrast is the shirt's own
 * colour where that is dark, ink otherwise.
 */
function onTheBand(plan: KitRenderPlan, spec: KitSpec): KitRenderPlan {
  const sponsor = plan.marks.sponsor
  if (spec.pattern !== 'chest-band' || !sponsor || sponsor.kind === 'alt' || (sponsor.kind === 'image' && sponsor.print === 'colour')) return plan
  const bandLight = ['cream', 'paper', 'concrete'].includes(spec.patternInk)
  const ink = bandLight ? (plan.dark ? plan.colours.base : 'rgb(var(--ink))') : 'rgb(var(--sheet))'
  return { ...plan, marks: { ...plan.marks, sponsor: { ...sponsor, ink } } }
}

/* ------------------------------------------------------------------ the marks, in board units */
/** the patterns a lettered sponsor crosses — there it gets a keyline, as a real print would */
const BUSY: readonly PatternId[] = ['stripe-wide', 'pinstripe', 'sash', 'halves', 'quarters', 'diagonal', 'hoop-tonal', 'jacquard', 'grid-tonal', 'chevron']

function Marks({ plan, uid, pattern = 'solid' }: { plan: KitRenderPlan; uid: string; pattern?: PatternId }) {
  const { crest, maker, sponsor } = plan.marks
  const keyline = BUSY.includes(pattern)
  return (
    <g aria-hidden="true">
      {crest && <image href={crest.src} x={crest.box.x} y={crest.box.y} width={crest.box.w} height={crest.box.h} preserveAspectRatio="xMidYMid meet" />}
      {maker && <Mark mark={maker} uid={`${uid}-mk`} />}
      {sponsor && <Mark mark={sponsor} uid={`${uid}-sp`} keyline={keyline} />}
    </g>
  )
}

function Mark({ mark, uid, keyline = false }: { mark: KitMarkPlan; uid: string; keyline?: boolean }) {
  const { box } = mark
  if (mark.kind === 'alt') {
    // the alternative mark is drawn on a 24×28 board; fit it into the slot without distortion
    const scale = Math.min(box.w / 24, box.h / 28)
    const x = box.x + (box.w - 24 * scale) / 2
    const y = box.y + (box.h - 28 * scale) / 2
    return <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`}><MakerMark id={mark.id} ink={mark.ink} /></g>
  }
  if (mark.kind === 'lettered') return <Lettered text={mark.text} box={box} ink={mark.ink} keyline={keyline} />
  if (mark.print === 'colour') {
    return <image href={mark.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid meet" />
  }
  // a one-colour mark is a white SHAPE printed through a mask in the cloth's contrast ink
  return (
    <g>
      <defs>
        <mask id={uid} maskUnits="userSpaceOnUse" x={box.x} y={box.y} width={box.w} height={box.h}>
          <image href={mark.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid meet" />
        </mask>
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={mark.ink} mask={`url(#${uid})`} />
    </g>
  )
}

/** the sponsor, lettered on the cloth — sized to the slot, squeezed only when it must be */
function Lettered({ text, box, ink, keyline = false }: { text: string; box: RenderBox; ink: string; keyline?: boolean }) {
  // a chest sponsor reads at about half the slot's height; the estimate is generous (Heebo 800 is
  // wide), and past it the word is squeezed to the slot rather than printed off the cloth
  const size = Math.min(box.h * 0.5, (box.w / Math.max(1, text.length)) * 1.45)
  const estimate = text.length * size * 0.72
  return (
    <text
      x={box.x + box.w / 2}
      y={box.y + box.h / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fill={ink}
      className="font-body"
      style={{ fontSize: size, fontWeight: 800, ...(keyline ? { paintOrder: 'stroke' } : {}) }}
      {...(keyline ? { stroke: ink.includes('--ink') ? 'rgb(var(--sheet))' : 'rgb(var(--ink))', strokeWidth: size * 0.16, strokeLinejoin: 'round' as const } : {})}
      {...(estimate > box.w ? { textLength: box.w, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
    >
      {text}
    </text>
  )
}

/* ------------------------------------------------------------------ photo */
function PhotoGarment({ plan, spec, uid }: { plan: KitRenderPlan; spec: KitSpec; uid: string }) {
  const photo = plan.photo!
  const g = photo.geometry
  const { base, secondary, sleeve, collar } = plan.colours
  const sil = `sil-${uid}`
  const torso = `torso-${uid}`
  const sleeves = spec.sleeves === 'raglan' ? g.raglan : g.sleeves
  // delta 87 (23.9.2026): retro-90s-boxy / retro-80s-long deliver a polo mask too — a cut whose
  // supports gate excludes 'polo'/'v-neck' never reaches here for that value (photoMissing already
  // fell back to vector), so an absent mask on a supported value cannot happen
  const collarPath =
    spec.collar === 'v-neck' ? g.masks.collarV : spec.collar === 'polo' && g.masks.collarPolo ? g.masks.collarPolo : g.masks.collarCrew
  const W = g.canvas.w
  const H = g.canvas.h
  return (
    <>
      <defs>
        <clipPath id={sil}><path d={g.silhouette} clipRule="evenodd" /></clipPath>
        <clipPath id={torso}><path d={g.torso} clipRule="evenodd" /></clipPath>
      </defs>
      <g style={{ isolation: 'isolate' }}>
        <path d={g.silhouette} fill={base} fillRule="evenodd" />
        <g fill={sleeve}>
          <path d={sleeves[0]} fillRule="evenodd" />
          <path d={sleeves[1]} fillRule="evenodd" />
        </g>
        <g clipPath={`url(#${torso})`}>
          {spec.pattern === 'side-panel' ? (
            <g fill={secondary}>
              <path d={g.masks.sidePanels} fillRule="evenodd" />
              <path d={g.masks.hem} fillRule="evenodd" />
            </g>
          ) : (
            <g transform={photo.patternTransform}>
              <PatternLayer id={spec.pattern} ink={secondary} />
            </g>
          )}
        </g>
        <g clipPath={`url(#${sil})`}>
          <path d={collarPath} fill={collar} fillRule="evenodd" />
          {spec.sleeves === 'cuff' && <path d={g.masks.cuffs} fill={collar} fillRule="evenodd" />}
          {spec.sleeves === 'shoulder-stripe' && g.masks.sleeveStripe && <path d={g.masks.sleeveStripe} fill={secondary} fillRule="evenodd" />}
          {spec.number !== null && (
            <g transform={photo.patternTransform}><FrontNumber value={spec.number} nameset={spec.nameset} dark={plan.dark} /></g>
          )}
          <Marks plan={plan} uid={uid} pattern={spec.pattern} />
        </g>
        {/* the cloth's light: folds multiply, sheen screens — over the print, so a fold runs through it */}
        <image href={g.shading} x="0" y="0" width={W} height={H} clipPath={`url(#${sil})`} style={{ mixBlendMode: 'multiply' }} />
        <image href={g.highlight} x="0" y="0" width={W} height={H} clipPath={`url(#${sil})`} style={{ mixBlendMode: 'screen' }} />
      </g>
    </>
  )
}

/* ------------------------------------------------------------------ vector */
/** the last point of a path — the armpit, read off the armhole seam */
function endPoint(path: string): [number, number] {
  const n = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  return [n[n.length - 2] ?? 0, n[n.length - 1] ?? 0]
}

const INK = 'rgb(var(--ink))'

function VectorGarment({ plan, spec, uid, mini = false }: { plan: KitRenderPlan; spec: KitSpec; uid: string; mini?: boolean }) {
  const t = plan.template
  const { base, secondary, sleeve, collar } = plan.colours
  const clipBody = `body-${uid}`
  const clipAll = `all-${uid}`
  if (mini) {
    // thumbnail density: solid ink outline (a red shirt never meets grass edge-on), the cloth,
    // the construction, the collar and the printed crest — no light, no seams, no lettering
    const crest = plan.marks.crest
    return (
      <>
        <defs>
          <clipPath id={clipBody}><path d={t.bodyPath} /></clipPath>
          <clipPath id={clipAll}><path d={t.bodyPath} /><path d={t.leftSleevePath} /><path d={t.rightSleevePath} /></clipPath>
        </defs>
        <g stroke={INK} strokeWidth="16" strokeLinejoin="round" fill={INK}>
          <path d={t.leftSleevePath} /><path d={t.rightSleevePath} /><path d={t.bodyPath} />
        </g>
        <path d={t.leftSleevePath} fill={sleeve} />
        <path d={t.rightSleevePath} fill={sleeve} />
        <path d={t.bodyPath} fill={base} />
        <g clipPath={`url(#${clipBody})`}>
          <PatternLayer id={spec.pattern} ink={secondary} template={t} />
        </g>
        <g clipPath={`url(#${clipAll})`}>
          <SleeveConstruction id={spec.sleeves} template={t} sleeve={sleeve} ink={secondary} mini />
          <CuffLayer id={spec.sleeves} left={t.cuffLeftPath} right={t.cuffRightPath} ink={collar} mini />
          <CollarLayer id={spec.collar} cx={t.neck.cx} cy={t.neck.cy} width={t.neck.width} depth={t.neck.depth} ink={collar} base={base} mini />
        </g>
        {crest && (
          <image href={crest.src} x={crest.box.x} y={crest.box.y} width={crest.box.w} height={crest.box.h} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
        )}
      </>
    )
  }
  const [axL, ayL] = endPoint(t.leftSleeveSeam)
  const [axR, ayR] = endPoint(t.rightSleeveSeam)
  return (
    <>
      <defs>
        <clipPath id={clipBody}><path d={t.bodyPath} /></clipPath>
        <clipPath id={clipAll}><path d={t.bodyPath} /><path d={t.leftSleevePath} /><path d={t.rightSleevePath} /></clipPath>
        <pattern id={`knit-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6L6 0M-1.5 1.5L1.5-1.5M4.5 7.5L7.5 4.5" stroke={INK} strokeWidth=".7" opacity=".05" />
        </pattern>
        {/* the torso's light, in its OWN box: shadowed at the side seams, lit a little left of centre */}
        <linearGradient id={`fold-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor={INK} stopOpacity=".2" />
          <stop offset=".13" stopColor={INK} stopOpacity=".03" />
          <stop offset=".4" stopColor="rgb(var(--sheet))" stopOpacity=".1" />
          <stop offset=".62" stopColor={INK} stopOpacity="0" />
          <stop offset=".88" stopColor={INK} stopOpacity=".05" />
          <stop offset="1" stopColor={INK} stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`drop-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity=".08" />
          <stop offset=".12" stopColor={INK} stopOpacity="0" />
          <stop offset=".9" stopColor={INK} stopOpacity="0" />
          <stop offset="1" stopColor={INK} stopOpacity=".12" />
        </linearGradient>
      </defs>

      <path d={t.leftSleevePath} fill={sleeve} />
      <path d={t.rightSleevePath} fill={sleeve} />
      <path d={t.bodyPath} fill={base} />

      <g clipPath={`url(#${clipBody})`}>
        <PatternLayer id={spec.pattern} ink={secondary} template={t} />
      </g>

      <g clipPath={`url(#${clipAll})`}>
        <SleeveConstruction id={spec.sleeves} template={t} sleeve={sleeve} ink={secondary} />
        <CuffLayer id={spec.sleeves} left={t.cuffLeftPath} right={t.cuffRightPath} ink={collar} />
      </g>

      {/* the cloth: the sleeves lie a shade behind the body, the knit over everything */}
      <g aria-hidden="true">
        <path d={t.leftSleevePath} fill={INK} opacity=".09" />
        <path d={t.rightSleevePath} fill={INK} opacity=".09" />
        <path d={t.bodyPath} fill={`url(#fold-${uid})`} />
        <path d={t.bodyPath} fill={`url(#drop-${uid})`} />
        <g clipPath={`url(#${clipAll})`}>
          <rect x="0" y="0" width="360" height="420" fill={`url(#knit-${uid})`} />
        </g>
        <g clipPath={`url(#${clipBody})`} fill="none" stroke={INK} strokeLinecap="round">
          {/* the drape under each arm */}
          <path d={`M${axL + 2} ${ayL + 6}Q${axL + 18} ${ayL + 20} ${axL + 40} ${ayL + 26}`} strokeWidth="3" opacity=".12" />
          <path d={`M${axR - 2} ${ayR + 6}Q${axR - 18} ${ayR + 20} ${axR - 40} ${ayR + 26}`} strokeWidth="3" opacity=".12" />
        </g>
      </g>

      <g fill="none" stroke={INK} strokeOpacity=".3" strokeWidth="1" strokeDasharray="2.5 2.5">
        <path d={t.leftSleeveSeam} /><path d={t.rightSleeveSeam} /><path d={t.hemPath} />
      </g>
      <g fill="none" stroke={INK} strokeOpacity=".72" strokeWidth="2" strokeLinejoin="round">
        <path d={t.leftSleevePath} /><path d={t.rightSleevePath} /><path d={t.bodyPath} />
      </g>

      <CollarLayer id={spec.collar} cx={t.neck.cx} cy={t.neck.cy} width={t.neck.width} depth={t.neck.depth} ink={collar} base={base} />
      {spec.number !== null && <FrontNumber value={spec.number} nameset={spec.nameset} dark={plan.dark} />}
      <Marks plan={plan} uid={uid} pattern={spec.pattern} />
    </>
  )
}

function FrontNumber({ value, nameset, dark }: { value: number; nameset: NamesetId; dark: boolean }) {
  const ink = dark ? 'rgb(var(--sheet))' : INK
  const common = { x: 180, y: 322, textAnchor: 'middle' as const, className: 'font-poster' }
  if (nameset === 'block-hollow') {
    return <text {...common} fill="none" stroke={ink} strokeWidth="2.4" style={{ fontSize: 54 }}>{value}</text>
  }
  return <text {...common} fill={ink} style={{ fontSize: nameset === 'condensed' ? 48 : 54 }}>{value}</text>
}

/**
 * A contrasting raglan is the SLEEVE colour carried up to the neck — the photo look fills the
 * raglan panel with the sleeve ink, and the drawn look does the same, so one spec reads one way.
 */
function SleeveConstruction({ id, template, sleeve, ink, mini = false }: { id: SleeveId; template: KitBodyTemplate; sleeve: string; ink: string; mini?: boolean }) {
  if (id === 'raglan') return <g fill={sleeve}><path d={template.shoulderPanelLeft} /><path d={template.shoulderPanelRight} /></g>
  if (id === 'shoulder-stripe') {
    // three stripes from the collar down the top of the sleeve: ink 4 · cloth 4 · ink 4 · cloth 4 · ink 4
    const paths = [template.sleeveTopLeft, template.sleeveTopRight]
    return (
      <g fill="none" strokeLinejoin="round">
        {mini ? paths.map((d) => <path key={d} d={d} stroke={ink} strokeWidth="12" />) : paths.flatMap((d) => [
          <path key={`a${d}`} d={d} stroke={ink} strokeWidth="20" />,
          <path key={`b${d}`} d={d} stroke={sleeve} strokeWidth="12" />,
          <path key={`c${d}`} d={d} stroke={ink} strokeWidth="4" />,
        ])}
      </g>
    )
  }
  if (id === 'arc') return <g fill="none" stroke={ink} strokeWidth="8" opacity=".9"><path d={template.cuffLeftPath} transform="translate(0,-18)" /><path d={template.cuffRightPath} transform="translate(0,-18)" /></g>
  return null
}

function CuffLayer({ id, left, right, ink, mini = false }: { id: SleeveId; left: string; right: string; ink: string; mini?: boolean }) {
  if (id !== 'cuff' && id !== 'shoulder-stripe') return null
  return <g fill="none" stroke={ink} strokeWidth={mini ? 14 : 9}><path d={left} /><path d={right} /></g>
}

/**
 * The collar sits IN the neckline: the body's outline is cut on the back neckline, the inside
 * of the back shows darker through the opening, and the front band follows the front neckline.
 */
function CollarLayer({ id, cx, cy, width, depth, ink, base, mini = false }: { id: CollarId; cx: number; cy: number; width: number; depth: number; ink: string; base: string; mini?: boolean }) {
  const x0 = cx - width / 2
  const x1 = cx + width / 2
  const back = `M${x0} ${cy}Q${cx} ${cy + depth * 0.32} ${x1} ${cy}`
  const band = mini ? 14 : id === 'ringer' ? 13 : 9
  const edge = mini ? 0 : 1.2
  const inside = (front: string) => (
    <>
      <path d={`${back}${front}Z`} fill={base} />
      <path d={`${back}${front}Z`} fill={INK} opacity=".42" />
      <path d={back} fill="none" stroke={ink} strokeWidth={mini ? 8 : 5} />
    </>
  )
  const ribbed = (d: string) => (
    <>
      {edge > 0 && <path d={d} fill="none" stroke={INK} strokeOpacity=".55" strokeWidth={band + edge * 2} strokeLinejoin="round" />}
      <path d={d} fill="none" stroke={ink} strokeWidth={band} strokeLinejoin="round" />
    </>
  )
  if (id === 'v-neck') {
    const front = `M${x0 + 2} ${cy + 1}L${cx} ${cy + depth * 1.75}L${x1 - 2} ${cy + 1}`
    return <g>{inside(`L${cx} ${cy + depth * 1.75}L${x0} ${cy}`)}{ribbed(front)}</g>
  }
  if (id === 'polo') {
    // two collar leaves lying on the shoulders, their points meeting on a short placket
    const leaf = (side: 1 | -1) => {
      const e = side === 1 ? x0 : x1
      return `M${cx - side * 2} ${cy + depth * 0.9}L${e + side * 2} ${cy - 3}Q${e - side * 14} ${cy + 1} ${e - side * 20} ${cy + 12}L${cx - side * 7} ${cy + depth * 1.75}Z`
    }
    return (
      <g>
        {inside(`Q${cx} ${cy + depth * 1.2} ${x0} ${cy}`)}
        {!mini && <path d={`M${cx - 8} ${cy + depth * 0.9}H${cx + 8}V${cy + depth * 2.7}H${cx - 8}Z`} fill={ink} stroke={INK} strokeOpacity=".45" strokeWidth="1" />}
        {!mini && [1.5, 2.2].map((k) => <circle key={k} cx={cx} cy={cy + depth * k} r="2.2" fill={INK} opacity=".55" />)}
        <path d={leaf(1)} fill={ink} stroke={INK} strokeOpacity={mini ? 0 : 0.55} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={leaf(-1)} fill={ink} stroke={INK} strokeOpacity={mini ? 0 : 0.55} strokeWidth="1.2" strokeLinejoin="round" />
      </g>
    )
  }
  const frontCurve = `M${x0 + 2} ${cy + 1}Q${cx} ${cy + depth * 2} ${x1 - 2} ${cy + 1}`
  if (id === 'laced') {
    return (
      <g>
        {inside(`Q${cx} ${cy + depth * 2} ${x0} ${cy}`)}
        {ribbed(frontCurve)}
        {!mini && <path d={`M${cx} ${cy + depth}V${cy + depth + 26}`} stroke={INK} strokeOpacity=".5" strokeWidth="2" />}
        {!mini && <path d={`M${cx - 7} ${cy + depth + 6}L${cx + 7} ${cy + depth + 14}M${cx + 7} ${cy + depth + 6}L${cx - 7} ${cy + depth + 14}M${cx - 7} ${cy + depth + 14}L${cx + 7} ${cy + depth + 22}M${cx + 7} ${cy + depth + 14}L${cx - 7} ${cy + depth + 22}`} stroke={ink} strokeWidth="2.2" />}
      </g>
    )
  }
  // crew and ringer
  return <g>{inside(`Q${cx} ${cy + depth * 2} ${x0} ${cy}`)}{ribbed(frontCurve)}</g>
}

/**
 * Surface patterns in the 360×420 board, wide enough for the widest cut (the torso is clipped to
 * it). Photo maps the same shapes onto its torso.
 */
function PatternLayer({ id, ink, template }: { id: PatternId; ink: string; template?: KitBodyTemplate }): ReactNode {
  if (id === 'solid') return null
  const span = (step: number, from = 20, to = 340) => {
    const out: number[] = []
    for (let x = 180; x >= from; x -= step) out.unshift(x)
    for (let x = 180 + step; x <= to; x += step) out.push(x)
    return out
  }
  if (id === 'stripe-wide') return <g fill={ink}>{span(44).map((x) => <rect key={x} x={x - 11} y="30" width="22" height="380" />)}</g>
  if (id === 'pinstripe') return <g fill={ink}>{span(18).map((x) => <rect key={x} x={x - 1.6} y="30" width="3.2" height="380" />)}</g>
  if (id === 'twin-stripe') return <g fill={ink}><rect x="163" y="30" width="9" height="380" /><rect x="188" y="30" width="9" height="380" /></g>
  if (id === 'hoop-tonal') return <g fill={ink}>{[128, 188, 248, 308].map((y) => <rect key={y} x="20" y={y} width="320" height="26" />)}</g>
  if (id === 'chest-band') return <g fill={ink}><rect x="20" y="178" width="320" height="46" /><rect x="20" y="169" width="320" height="4" /><rect x="20" y="229" width="320" height="4" /></g>
  if (id === 'sash') return <polygon points="74,62 112,40 300,380 262,404" fill={ink} />
  if (id === 'halves') return <rect x="180" y="30" width="160" height="380" fill={ink} />
  if (id === 'quarters') return <g fill={ink}><rect x="180" y="30" width="160" height="180" /><rect x="20" y="210" width="160" height="200" /></g>
  if (id === 'diagonal') return <g stroke={ink} strokeWidth="7" opacity=".8">{[-80, -30, 20, 70, 120, 170, 220, 270, 320].map((x) => <path key={x} d={`M${x} 410L${x + 210} 30`} />)}</g>
  if (id === 'side-panel') {
    if (template) return <g fill={ink}><path d={template.sidePanelLeft} /><path d={template.sidePanelRight} /></g>
    return <g fill={ink}><path d="M70 150L94 160L96 392L70 392Z" /><path d="M290 150L266 160L264 392L290 392Z" /></g>
  }
  if (id === 'shoulder-panel' || id === 'yoke-v') return <path d="M40 58L180 158L320 58L320 30L180 126L40 30Z" fill={ink} />
  if (id === 'chevron') return <g fill="none" stroke={ink} strokeWidth="12"><path d="M50 150L180 232L310 150" /><path d="M50 198L180 280L310 198" /></g>
  if (id === 'grid-tonal') return <g stroke={ink} strokeWidth="3" opacity=".65">{span(32, 40, 320).map((x) => <path key={`v${x}`} d={`M${x} 60V400`} />)}{[124, 162, 200, 238, 276, 314, 352].map((y) => <path key={`h${y}`} d={`M40 ${y}H320`} />)}</g>
  if (id === 'jacquard') return <g fill={ink} opacity=".72">{[116, 156, 196, 236, 276, 316, 356].flatMap((y) => span(40, 80, 300).map((x) => <rect key={`${x}-${y}`} x={x - 6.5} y={y} width="13" height="13" transform={`rotate(45 ${x} ${y + 6.5})`} />))}</g>
  if (id === 'gradient') return <rect x="20" y="60" width="320" height="350" fill={ink} opacity=".28" />
  return null
}

/**
 * One mark on its own — a Gate 4 drawer card for the crest, the maker or the sponsor. The same plan
 * and the same `Mark` as the shirt, framed on the mark's own slot, printed in ink on paper.
 */
export function KitMarkArt({
  spec,
  which,
  className = '',
  marks = 'granted',
}: {
  spec: KitSpec
  which: 'crest' | 'maker' | 'sponsor'
  className?: string
  marks?: KitMarksRegime
}) {
  const uid = useId().replace(/:/g, '')
  // on the cloth it will print on: a white SUBARU on a paper card is invisible, and the
  // contrast ink of a mono mark is the shirt's, not the card's
  const plan = resolveKitRender(spec, { look: 'vector', marks })
  const crest = plan.marks.crest
  const mark = which === 'crest' ? null : plan.marks[which]
  const box = which === 'crest' ? crest?.box : mark?.box
  if (!box || (which === 'crest' ? !crest : !mark)) return null
  const pad = Math.max(box.w, box.h) * 0.06
  return (
    <svg viewBox={`${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`} className={className} aria-hidden="true">
      <rect x={box.x - pad} y={box.y - pad} width={box.w + pad * 2} height={box.h + pad * 2} fill={plan.colours.base} />
      {which === 'crest' && crest ? (
        <image href={crest.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid meet" />
      ) : mark ? (
        <Mark mark={mark} uid={`${uid}-card`} />
      ) : null}
    </svg>
  )
}
