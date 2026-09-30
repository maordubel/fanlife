import Image from 'next/image'
import type { ReactNode } from 'react'

import { MatchLine, Num } from '@/components/ui/Num'
import type { ArchiveCard } from '@/lib/archive/graph-types'
import { crestArt } from '@/lib/kit/crestMarks'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * כרטיס ארכיון — one entity, drawn. Used by the gate 12 deck, box, drawer, search and
 * Mine, and by the gate 13 hand and route: one entity looks the same wherever it turns
 * up, because it IS the same entity (brief §6).
 *
 * **Every skin is drawn from tokens**, never a photograph or a prop (spec §6): a ticket
 * for a match, a clipping for a column, a file card for a person, a pennant for a season,
 * a shirt OUTLINE for a kit — an outline, never its colours, because the colours are
 * gate 4's answer — a cup, a crest (the printed artwork, rule 25), staves for a song and
 * a scarf for the terrace.
 */

/** A card's title — a season and a kit are composed from the catalogue, everything else is the archive's own words. */
export function cardTitle(card: Pick<ArchiveCard, 'type' | 'titleHe' | 'kit'>): string {
  if (card.type === 'season') return t('graph.season.title', { label: card.titleHe })
  if (card.type === 'kit' && card.kit) {
    const variant = `graph.kit.variant.${card.kit.variant}` as MessageKey
    return t('graph.kit.title', { variant: t(variant), season: card.kit.seasonLabel })
  }
  return card.titleHe
}

/** What kind of thing it is, in one word. */
export function typeLabel(card: Pick<ArchiveCard, 'type' | 'kind'>): string {
  if ((card.type === 'moment' || card.type === 'object' || card.type === 'trophy') && card.kind) {
    const key = `graph.kind.${card.kind}` as MessageKey
    if (key in KIND_KEYS) return t(key)
  }
  return t(`graph.type.${card.type}` as MessageKey)
}

const KIND_KEYS: Record<string, true> = {
  'graph.kind.goal': true,
  'graph.kind.moment': true,
  'graph.kind.tie': true,
  'graph.kind.grievance': true,
  'graph.kind.crest': true,
  'graph.kind.maker': true,
  'graph.kind.sponsor': true,
  'graph.kind.won': true,
  'graph.kind.runner_up': true,
}

/** The Latin plate word a card prints, the way every plate in this product is set. */
export const LATIN: Record<ArchiveCard['type'], string> = {
  match: 'MATCH',
  person: 'PERSON',
  season: 'SEASON',
  team: 'OPPONENT',
  place: 'PLACE',
  kit: 'SHIRT',
  trophy: 'TROPHY',
  press: 'PRESS',
  moment: 'MOMENT',
  object: 'OBJECT',
  song: 'SONG',
  fans: 'TERRACE',
}

/* ------------------------------------------------------------------ the marks */

/** The artefact's mark: a small ink drawing per type, sized by its box. */
export function ArtifactMark({ card, className = '' }: { card: ArchiveCard; className?: string }) {
  if (card.type === 'object' && card.crestKey) {
    const src = crestArt(card.crestKey, false)
    if (src)
      return (
        <span className={`relative block ${className}`}>
          <Image src={src} alt="" fill sizes="96px" unoptimized className="object-contain" />
        </span>
      )
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`block ${className}`} fill="none">
      <MarkPath card={card} />
    </svg>
  )
}

function MarkPath({ card }: { card: ArchiveCard }) {
  const ink = 'stroke-ink'
  const red = 'stroke-red'
  switch (card.type) {
    case 'match':
      // a ticket: a stub, a perforation, a notch each side
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M6 16h52v10a6 6 0 0 0 0 12v10H6V38a6 6 0 0 0 0-12z" />
          <path className={red} strokeDasharray="3 4" d="M42 17v30" />
          <path className={ink} d="M14 28h20M14 36h14" />
        </g>
      )
    case 'press':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M10 8h44v48H10z" />
          <path className={red} d="M16 16h32" strokeWidth={5} />
          <path className={ink} d="M16 27h14M16 34h14M16 41h14M16 48h14M36 27h12M36 34h12M36 41h12M36 48h12" />
        </g>
      )
    case 'person':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M8 10h48v44H8z" />
          <circle className={red} cx="32" cy="27" r="8" />
          <path className={ink} d="M18 50c2-9 8-13 14-13s12 4 14 13" />
        </g>
      )
    case 'season':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M12 8v50" />
          <path className={red} d="M14 10l38 11-38 11z" />
        </g>
      )
    case 'kit':
      // an outline only — the colours belong to gate 4
      return (
        <path
          className={ink}
          strokeWidth={3}
          strokeLinejoin="round"
          d="M22 8l-14 8 5 12 6-3v31h26V25l6 3 5-12-14-8c-2 5-5 7-10 7s-8-2-10-7z"
        />
      )
    case 'trophy':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M20 8h24v14a12 12 0 0 1-24 0z" />
          <path className={red} d="M20 12h-8c0 8 4 12 9 13M44 12h8c0 8-4 12-9 13" />
          <path className={ink} d="M32 34v10M22 56h20l-3-12H25z" />
        </g>
      )
    case 'moment':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M6 14h52v36H6z" />
          <path className={ink} strokeDasharray="2 4" d="M6 19h52M6 45h52" />
          <circle className={red} cx="32" cy="32" r="7" />
        </g>
      )
    case 'object':
      return card.kind === 'crest' ? (
        <path className={ink} strokeWidth={3} d="M32 6l20 8v16c0 13-9 22-20 28C21 52 12 43 12 30V14z" />
      ) : (
        <g strokeWidth={3}>
          <path className={ink} d="M10 20l18-12h26v48H28L10 44z" />
          <circle className={red} cx="22" cy="32" r="4" />
        </g>
      )
    case 'song':
      return (
        <g strokeWidth={2.5}>
          <path className={ink} d="M6 18h52M6 26h52M6 34h52M6 42h52M6 50h52" />
          <path className={red} strokeWidth={4} d="M26 46V20l18-4v26" />
          <circle className={red} cx="22" cy="46" r="4" />
          <circle className={red} cx="40" cy="42" r="4" />
        </g>
      )
    case 'fans':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M4 22l56-8v20L4 42z" />
          <path className={red} strokeWidth={6} d="M16 22v18M30 20v18M44 18v18" />
        </g>
      )
    case 'place':
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M6 46c0-12 12-20 26-20s26 8 26 20" />
          <path className={ink} d="M6 46h52M14 26v-12M50 26v-12" />
          <path className={red} d="M22 46c0-6 4-10 10-10s10 4 10 10" />
        </g>
      )
    case 'team':
    default:
      return (
        <g strokeWidth={3}>
          <path className={ink} d="M14 8v50" />
          <path className={red} d="M16 10h34l-8 10 8 10H16z" />
        </g>
      )
  }
}

/* ------------------------------------------------------------------ rows and cards */

/** The line under a title: a type word, a date or a season. */
export function Eyebrow({ card, className = '' }: { card: ArchiveCard; className?: string }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 font-body text-[11px] font-bold leading-snug text-muted ${className}`}>
      <span className="text-red">{typeLabel(card)}</span>
      {card.when && <span className="font-mono tabular-nums"><Num>{card.when}</Num></span>}
    </p>
  )
}

/** A card's main line: a match is a `MatchLine`, never a hand-built scoreline. */
export function CardHeadline({ card, className = '' }: { card: ArchiveCard; className?: string }) {
  if (card.match) {
    return (
      <MatchLine
        className={className}
        homeName={card.match.homeHe}
        homeScore={card.match.homeScore}
        awayName={card.match.awayHe}
        awayScore={card.match.awayScore}
      />
    )
  }
  return <span className={className}>{cardTitle(card)}</span>
}

/**
 * A compact row — related items, search results, Mine, the gate 13 hand. The whole row
 * is the button; the label (when there is one) says why this row is here.
 */
export function EntityRow({
  card,
  onPick,
  label,
  trailing,
  selected = false,
  disabled = false,
  ariaLabel,
}: {
  card: ArchiveCard
  onPick?: () => void
  label?: string
  trailing?: ReactNode
  selected?: boolean
  disabled?: boolean
  ariaLabel?: string
}) {
  const body = (
    <>
      <ArtifactMark card={card} className="h-9 w-9 shrink-0" />
      <span className="min-w-0 flex-1">
        {label && <span className="block font-body text-[11px] font-extrabold leading-tight text-red">{label}</span>}
        <CardHeadline card={card} className="block truncate font-sign text-[15px] leading-tight text-ink" />
        <Eyebrow card={card} className="mt-0.5" />
      </span>
      {trailing}
    </>
  )
  if (!onPick) return <div className="flex min-h-tap items-center gap-2.5 border-hair border-ink/40 bg-sheet px-2.5 py-1.5">{body}</div>
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected || undefined}
      aria-label={ariaLabel}
      className={`flex min-h-tap w-full items-center gap-2.5 border-hair px-2.5 py-1.5 text-start transition-transform duration-press ease-stamp active:scale-[.985] disabled:opacity-40 motion-reduce:transition-none ${
        selected ? 'border-red bg-paper outline outline-2 outline-red' : 'border-ink/40 bg-sheet hover:border-ink'
      }`}
    >
      {body}
    </button>
  )
}

/** The close mark of every archive sheet — drawn, so it reads at 48px and not as a stray glyph. */
export function CloseMark({ className = 'stroke-ink' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 ${className}`} fill="none" strokeWidth={3} strokeLinecap="square">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  )
}
