import 'server-only'

import type { ReactElement } from 'react'

import { BRAND } from '@/lib/brand'
import { t } from '@/lib/i18n'

import { lines, visual } from './bidi'
import { CARD_SIZE, secondsOf, type BlindCowCard, type CardSize } from './params'

/**
 * כרטיסי התוצאה — gate 10 and gate 8, drawn for WhatsApp (delta 89).
 *
 * Maor: "כרטיס תוצאה מעוצב לוואטסאפ לפרה עיוורת ולשער 8". The brand's two-plate print:
 * vermilion over navy with the constant misregistration, ink rules, ageing cream, radius 0,
 * no yellow. Two sizes: 1200×630 (the link preview WhatsApp draws) and 1080×1350 (the
 * image a phone shares as a file). Every Hebrew line goes through `visual()` — the
 * renderer has no bidi — and no line is left for the renderer to wrap.
 */

const C = BRAND

type Box = { width: number; height: number }

/** Two plates, one word: navy under, vermilion over, offset down-left like the screen's plate-shift. */
export function Plates({ text, size, font, under = C.sign, over = C.red, shift }: { text: string; size: number; font: string; under?: string; over?: string; shift?: number }) {
  const d = shift ?? Math.max(3, Math.round(size / 26))
  return (
    <div style={{ display: 'flex', position: 'relative', fontFamily: font, fontSize: size, lineHeight: 1, fontWeight: font === 'Heebo' ? 800 : font === 'Frank' ? 900 : 700 }}>
      <div style={{ display: 'flex', position: 'absolute', left: -d, top: d, color: under }}>{text}</div>
      <div style={{ display: 'flex', color: over }}>{text}</div>
    </div>
  )
}

export function Frame({ box, children }: { box: Box; children: ReactElement | ReactElement[] }) {
  const pad = Math.round(box.width * 0.03)
  const rule = Math.round(pad / 3)
  const off = Math.round(pad / 3)
  return (
    <div style={{ display: 'flex', position: 'relative', width: box.width, height: box.height, backgroundColor: C.paper }}>
      {/* the red plate's own frame, off register (down-left), under the ink one */}
      <div style={{ display: 'flex', position: 'absolute', left: pad - off, top: pad + off, width: box.width - 2 * pad, height: box.height - 2 * pad, border: `${Math.round(rule / 2)}px solid ${C.red}` }} />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: pad,
          top: pad,
          width: box.width - 2 * pad,
          height: box.height - 2 * pad,
          overflow: 'hidden',
          backgroundColor: C.sheet,
          border: `${rule}px solid ${C.ink}`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** The gate-10 mark in print: a blindfolded "?" with two horns. */
function Cow({ size }: { size: number }) {
  return (
    <div style={{ display: 'flex', position: 'relative', width: size * 0.95, height: size * 1.05 }}>
      <div style={{ display: 'flex', position: 'absolute', left: size * 0.18, top: size * 0.02, width: size * 0.08, height: size * 0.18, backgroundColor: C.ink, transform: 'rotate(-28deg)' }} />
      <div style={{ display: 'flex', position: 'absolute', left: size * 0.52, top: size * 0.02, width: size * 0.08, height: size * 0.18, backgroundColor: C.ink, transform: 'rotate(28deg)' }} />
      <div style={{ display: 'flex', position: 'absolute', left: size * 0.1, top: size * 0.06 }}>
        <Plates text="?" size={size} font="Frank" />
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: size * 0.04, top: size * 0.33, width: size * 0.78, height: size * 0.12, backgroundColor: C.ink, transform: 'rotate(-4deg)' }} />
      <div style={{ display: 'flex', position: 'absolute', left: size * 0.76, top: size * 0.43, width: size * 0.24, height: size * 0.07, backgroundColor: C.ink, transform: 'rotate(24deg)' }} />
      <div style={{ display: 'flex', position: 'absolute', left: size * 0.74, top: size * 0.5, width: size * 0.2, height: size * 0.07, backgroundColor: C.ink, transform: 'rotate(52deg)' }} />
    </div>
  )
}

export function Line({ text, size, color = C.ink, weight = 800, font = 'Heebo' }: { text: string; size: number; color?: string; weight?: number; font?: string }) {
  return (
    <div style={{ display: 'flex', fontFamily: font, fontWeight: weight, fontSize: size, color, lineHeight: 1.15, whiteSpace: 'nowrap' }}>{visual(text)}</div>
  )
}

export function Latin({ text, size, color = C.sign }: { text: string; size: number; color?: string }) {
  return <div style={{ display: 'flex', fontFamily: 'Archivo', fontWeight: 800, fontSize: size, letterSpacing: size * 0.22, color }}>{text}</div>
}

/** A figure over its caption, in a cell with an ink rule — the result screen's stat row. */
export function Stat({ value, label, size, dark = false }: { value: string; label: string; size: number; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${size * 0.12}px ${size * 0.3}px`, backgroundColor: dark ? C.ink : C.paper, border: `${Math.max(3, size / 22)}px solid ${C.ink}` }}>
      <div style={{ display: 'flex', fontFamily: 'Karantina', fontWeight: 700, fontSize: size, lineHeight: 1, color: dark ? C.red : C.ink }}>{value}</div>
      <div style={{ display: 'flex', fontFamily: 'Heebo', fontWeight: 800, fontSize: size * 0.24, color: dark ? C.concrete : C.sign }}>{visual(label)}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ gate 10 */

export function blindCowHeadline(card: BlindCowCard): string {
  if (card.mode === 'duel' && card.duel === 'won') return t('connect.card.bc.duelWon')
  if (card.mode === 'duel' && card.duel === 'lost') return t('connect.card.bc.duelLost')
  if (card.mode === 'duel' && card.duel === 'tie') return t('connect.card.bc.duelTie')
  if (card.status === 'solved') return t('connect.card.bc.solved')
  if (card.status === 'timeout') return t('connect.card.bc.timeout')
  return t('connect.card.bc.gaveUp')
}

export function BlindCowCardArt({ card, size, logo = null }: { card: BlindCowCard; size: CardSize; logo?: string | null }) {
  const box = CARD_SIZE[size]
  const story = size === 'story'
  const u = box.width / 100
  const kicker = card.mode === 'daily' && card.day
    ? `${t('connect.card.bc.kicker')} · ${t('connect.card.bc.daily', { date: card.day.split('-').reverse().join('.') })}`
    : t('connect.card.bc.kicker')
  const solved = card.status === 'solved'
  const stats = (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: u * 1.6 }}>
      <Stat value={String(card.hints)} label={t('connect.card.bc.clues')} size={u * (story ? 11 : 6.2)} />
      <Stat value={`${secondsOf(card.tenths)}″`} label={t('connect.card.bc.seconds')} size={u * (story ? 11 : 6.2)} />
      {solved && card.weightedTenths !== null ? (
        <Stat value={`${secondsOf(card.weightedTenths)}″`} label={t('connect.card.bc.weighted')} size={u * (story ? 11 : 6.2)} dark />
      ) : (
        <div style={{ display: 'flex' }} />
      )}
    </div>
  )
  const text = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: story ? 'center' : 'flex-end', gap: u * 1.4 }}>
      <Line text={kicker} size={u * (story ? 3.4 : 2.4)} color={C.sign} />
      <Plates text={visual(blindCowHeadline(card))} size={u * (story ? 10 : 6.6)} font="Frank" />
      {stats}
      <Line text={t('connect.card.bc.cta')} size={u * (story ? 4.2 : 3)} />
    </div>
  )
  return (
    <Frame box={box}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: story ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: story ? 'center' : 'space-between',
          padding: u * 4,
          gap: u * 3,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={Math.round(u * (story ? 60 : 30))} height={Math.round(u * (story ? 20 : 10))} />
        ) : (
          <Cow size={u * (story ? 30 : 19)} />
        )}
        {text}
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: u * 3, bottom: u * 2 }}>
        <Latin text="THE WORKER · GATE 10" size={u * (story ? 2.2 : 1.6)} />
      </div>
    </Frame>
  )
}

/* ------------------------------------------------------------------ gate 8 */

export type GoalArt = {
  titleHe: string
  subtitleHe: string
  competitionHe: string
  avg: number
  best: number
  score: number
  /** the scorer's real shirt as a data URI (the archive's photograph), or null */
  shirt: string | null
  shirtSeason: string | null
}

export function GoalCardArt({ art, size }: { art: GoalArt; size: CardSize }) {
  const box = CARD_SIZE[size]
  const story = size === 'story'
  const u = box.width / 100
  const title = lines(art.titleHe, story ? 18 : 17, 2)
  const shirtBox = u * (story ? 38 : 26)
  const shirt = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 0.8 }}>
      <div style={{ display: 'flex', width: shirtBox, height: shirtBox, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, border: `${u * 0.5}px solid ${C.ink}` }}>
        {art.shirt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.shirt} width={shirtBox * 0.92} height={shirtBox * 0.92} style={{ objectFit: 'contain' }} alt="" />
        ) : (
          <Plates text="8" size={shirtBox * 0.7} font="Karantina" under={C.sign} over={C.red} />
        )}
      </div>
      {art.shirtSeason && <Line text={t('connect.card.goal.shirt', { season: art.shirtSeason })} size={u * (story ? 2.6 : 1.8)} color={C.sign} weight={400} />}
    </div>
  )
  const text = (
    <div style={{ display: 'flex', ...(story ? {} : { flex: 1 }), minWidth: 0, flexDirection: 'column', alignItems: story ? 'center' : 'flex-end', gap: u * 1.1 }}>
      <Line text={t('connect.card.goal.kicker')} size={u * (story ? 3.4 : 2.4)} color={C.sign} />
      {title.map((line) => (
        <Line key={line} text={line} size={u * (story ? 6.6 : 4.4)} font="Frank" weight={900} />
      ))}
      <Line text={`${art.subtitleHe}`} size={u * (story ? 2.8 : 2)} color={C.sign} weight={400} />
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-end', gap: u * 1.6, marginTop: u }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: C.ink, padding: `${u * 0.6}px ${u * 2}px` }}>
          <Plates text={`${art.avg}%`} size={u * (story ? 15 : 8.6)} font="Karantina" under={C.sign} over={C.red} />
          <div style={{ display: 'flex', fontFamily: 'Heebo', fontWeight: 800, fontSize: u * (story ? 2.8 : 1.9), color: C.concrete }}>{visual(t('connect.card.goal.accuracy'))}</div>
        </div>
        <Stat value={`${art.best}%`} label={t('connect.card.goal.best')} size={u * (story ? 9 : 5.2)} />
        <Stat value={String(art.score)} label={t('connect.card.goal.score')} size={u * (story ? 9 : 5.2)} />
      </div>
      <Line text={t('connect.card.goal.cta')} size={u * (story ? 4 : 2.8)} />
    </div>
  )
  return (
    <Frame box={box}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: story ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: story ? 'center' : 'space-between',
          padding: u * 3.6,
          gap: u * 3,
        }}
      >
        {shirt}
        {text}
      </div>
      <div style={{ display: 'flex', position: 'absolute', left: u * 3, bottom: u * 2 }}>
        <Latin text="THE WORKER · GATE 8 · REBUILD THE GOAL" size={u * (story ? 2.2 : 1.6)} />
      </div>
    </Frame>
  )
}
