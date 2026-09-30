'use client'

import Image from 'next/image'
import { useEffect, useRef, type ReactNode } from 'react'

import { CrossLinks } from '@/components/links/CrossLinks'
import { SourceNote } from '@/components/ui/SourceNote'
import { useDialog } from '@/components/ui/useDialog'
import { MatchLine, Num } from '@/components/ui/Num'
import { REACTIONS, reactionSetOf, type ConfidenceWord, type EntityDetail, type RelatedItem, type WhatBlock } from '@/lib/archive/graph-types'
import { crestArt } from '@/lib/kit/crestMarks'
import { t, type MessageKey } from '@/lib/i18n'
import { voiceAction } from '@/lib/voice'
import { ShareRow } from '@/components/share/ShareRow'
import { clippingCard } from '@/lib/share/artefacts'
import { GateRouter } from './GateRouter'
import { ArtifactMark, CloseMark, EntityRow, Eyebrow, LATIN, cardTitle, typeLabel } from './EntityCard'

/**
 * המגירה — one entity, opened (brief §22 "Detail drawer").
 *
 * Only what the archive holds is printed (brief §25): "מה קרה" is the entity's own text
 * or figures, "למה זה מעניין" is graph COUNTS, "לפני ואחרי" is the previous and next item
 * of the same kind, "תמשיך מכאן" is at most two related items per type — each with the
 * label of the edge that brought it — and the sources carry a confidence word and, where
 * the file records one, the date it was read. Reactions are a personal set: they never
 * become a fact about the item.
 */
export function ArchiveDrawer({
  detail,
  saved,
  reaction,
  busy,
  rabbitEmpty,
  onClose,
  onOpen,
  onSave,
  onReact,
  onRabbit,
  onSearch,
  report,
  lived = [],
}: {
  detail: EntityDetail
  saved: boolean
  reaction: string | null
  busy: boolean
  rabbitEmpty: boolean
  onClose: () => void
  onOpen: (id: string, via: 'related' | 'around') => void
  onSave: () => void
  onReact: (code: string) => void
  onRabbit: () => void
  onSearch: () => void
  report?: ReactNode
  /** the LIFE chapters this device's save completed — the router's LIFE door reads it */
  lived?: readonly string[]
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const { card } = detail
  // a new entity in the same drawer (the rabbit hole, a related item) starts at its top
  const body = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [card.id])
  const title = cardTitle(card)
  const total = detail.counts.reduce((sum, row) => sum + row.n, 0)
  const reactions = REACTIONS[reactionSetOf(card.type)]

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('archive.drawer.aria', { title })}
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-ink/70 outline-none"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full animate-sheet-in flex-col border-t-plate border-red bg-sheet motion-reduce:animate-none sm:mx-auto sm:max-w-[560px] sm:border-x-rule sm:border-x-ink"
      >
        {/* the head */}
        <div className="flex items-start gap-3 border-b-rule border-ink px-4 pb-2.5 pt-3">
          <ArtifactMark card={card} className="mt-1 h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-latin text-[9px] font-bold tracking-[0.22em] text-sign" dir="ltr">
              {LATIN[card.type]}
            </p>
            <h2 className="font-display text-step-2 leading-tight text-ink">
              {card.match ? (
                <MatchLine homeName={card.match.homeHe} homeScore={card.match.homeScore} awayName={card.match.awayHe} awayScore={card.match.awayScore} />
              ) : (
                title
              )}
            </h2>
            <Eyebrow card={card} className="mt-0.5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('archive.drawer.close')}
            className="flex min-h-tap min-w-tap shrink-0 items-center justify-center border-rule border-ink bg-paper font-poster text-[22px] leading-none text-ink"
          >
            <CloseMark className="stroke-ink" />
          </button>
        </div>

        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {/* quick facts */}
          <dl className="mt-3 grid grid-cols-3 gap-1.5">
            <Fact label={t('archive.drawer.fact.when')} value={card.when ?? '—'} />
            <Fact label={t('archive.drawer.fact.type')} value={typeLabel(card)} />
            <Fact label={t('archive.drawer.fact.links')} value={String(card.degree)} />
          </dl>
          {card.disputed && (
            <p className="mt-2 border-s-rule border-red ps-2 font-body text-[12px] leading-snug text-ink">
              {t('archive.card.disputed')}
            </p>
          )}

          {/* delta 89 — the same match / man in the other gates: על המפה · בשער 8 */}
          <CrossLinks links={detail.links} from="archive" className="mt-2.5" label={t('connect.row')} />
          {/* ONE RED WORLD §21 — the gates that can serve this entity, and LIFE when it was lived */}
          <GateRouter router={detail.router} lived={lived} />

          {/* ואתה? — personal, never a fact */}
          <section className="mt-3" aria-labelledby="drawer-react">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id="drawer-react" className="font-body text-[12px] font-extrabold text-ink">
                {t('archive.react.title')}
              </h3>
              <p className="font-body text-[11px] text-muted">{t('archive.react.note')}</p>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {reactions.map((code) => {
                const on = reaction === code
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onReact(code)}
                    className={`min-h-tap border-rule px-3 font-body text-[13px] font-bold transition-transform duration-press active:scale-[.96] motion-reduce:transition-none ${
                      on ? 'border-red bg-red text-paper' : 'border-ink/40 bg-paper text-ink'
                    }`}
                  >
                    {on && <span aria-hidden="true">✓ </span>}
                    {t(`archive.react.${code}` as MessageKey)}
                  </button>
                )
              })}
            </div>
          </section>

          <Block title={t('archive.drawer.what')}>
            <What what={detail.what} />
          </Block>

          <Block title={t('archive.drawer.why')}>
            {total === 0 ? (
              <p className="font-body text-[13px] leading-relaxed text-muted">{t('archive.drawer.whyNone')}</p>
            ) : (
              <>
                <p className="font-body text-[13px] leading-relaxed text-ink">{t('archive.drawer.whyLine', { n: String(total) })}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {detail.counts.map((row) => (
                    <li key={row.type} className="border-hair border-ink/40 bg-paper px-2 py-1 font-body text-[12px] text-ink">
                      <span className="font-mono tabular-nums">
                        <Num>{row.n}</Num>
                      </span>{' '}
                      {t(`graph.types.${row.type}` as MessageKey)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Block>

          <Block title={t('archive.drawer.around')}>
            {detail.before || detail.after ? (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {detail.before && <EntityRow card={detail.before} label={t('archive.drawer.before')} onPick={() => onOpen(detail.before!.id, 'around')} />}
                {detail.after && <EntityRow card={detail.after} label={t('archive.drawer.after')} onPick={() => onOpen(detail.after!.id, 'around')} />}
              </div>
            ) : (
              <p className="font-body text-[13px] text-muted">{t('archive.drawer.aroundNone')}</p>
            )}
          </Block>

          {detail.related.length > 0 && (
            <Block title={t('archive.drawer.related')}>
              <div className="grid gap-3">
                {detail.related.map((group) => (
                  <div key={group.type}>
                    <p className="mb-1 font-body text-[11px] font-extrabold text-muted">
                      {t(`graph.types.${group.type}` as MessageKey)}
                      {group.total > group.items.length && (
                        <span className="font-normal"> · {t('archive.drawer.more', { n: String(group.total - group.items.length) })}</span>
                      )}
                    </p>
                    <ul className="grid gap-1.5">
                      {group.items.map((item) => (
                        <li key={item.card.id}>
                          <EntityRow card={item.card} label={relLabel(item)} onPick={() => onOpen(item.card.id, 'related')} />
                          {item.confidence === 'low' && (
                            <p className="mt-0.5 font-body text-[11px] leading-snug text-muted">{t('archive.drawer.lowNote')}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* how sure the archive is stays on the card; which sources, and where they were
              read, is on /credits — the one page that prints them (spec §0.3, 22.9.2026) */}
          {detail.sources.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 border-s-rule border-sign ps-2 font-body text-[11px] text-muted">
              <span>{t(`graph.conf.${strongest(detail.sources.map((source) => source.confidence))}` as MessageKey)}</span>
              <SourceNote />
            </p>
          )}
          {/* gate 12's share (§28): the press clipping — "מצאתי את זה בארכיון." — and a link
              to this very item, never a round (rule 19) */}
          <ShareRow
            kind="archive"
            route={`/archive?at=${encodeURIComponent(card.id)}`}
            params={{}}
            headline={title}
            card={clippingCard({ date: card.when ?? '', headline: title, caption: clippingCaption(detail.what, typeLabel(card)), label: `ARCHIVE · ${LATIN[card.type]}` })}
          />
          {report && <div className="md:hidden">{report}</div>}
        </div>

        {/* the foot: keep, go deeper, or look everywhere */}
        <div className="grid grid-cols-3 gap-1.5 border-t-rule border-ink bg-sheet px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={onSave}
            aria-pressed={saved}
            className={`min-h-tap border-rule px-2 font-body text-[13px] font-extrabold leading-tight ${saved ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper text-ink'}`}
          >
            {saved ? `✓ ${t('archive.card.saved')}` : t('archive.card.save')}
          </button>
          <button
            type="button"
            onClick={onRabbit}
            disabled={busy || rabbitEmpty}
            className="min-h-tap border-rule border-red bg-red px-2 font-body text-[13px] font-extrabold leading-tight text-paper disabled:opacity-50"
          >
            {voiceAction(12, 'rabbit')}
          </button>
          <button type="button" onClick={onSearch} className="min-h-tap border-rule border-ink bg-sheet px-2 font-body text-[13px] font-bold leading-tight text-ink">
            {t('archive.drawer.deep')}
          </button>
          {rabbitEmpty && <p className="col-span-3 font-body text-[11px] text-muted">{t('archive.drawer.rabbitNone')}</p>}
        </div>
      </div>
    </div>
  )
}

function relLabel(item: RelatedItem): string {
  const vars = item.params ? Object.fromEntries(Object.entries(item.params).map(([k, v]) => [k, String(v)])) : undefined
  return t(item.labelKey as MessageKey, vars)
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-hair border-ink/40 bg-paper px-2 py-1.5">
      <dt className="font-body text-[10.5px] font-bold text-muted">{label}</dt>
      <dd className="truncate font-sign text-[14px] leading-tight text-ink">
        <bdi>{value}</bdi>
      </dd>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 border-b-hair border-ink/30 pb-1 font-display text-step-1 leading-tight text-ink">{title}</h3>
      {children}
    </section>
  )
}

/** one line under the clipping's headline: the item's own words, never a column's full text */
function clippingCaption(what: WhatBlock, fallback: string): string {
  switch (what.kind) {
    case 'text':
      return what.text.length > 200 ? `${what.text.slice(0, 199).trimEnd()}…` : what.text
    case 'match':
      return [what.competitionHe, what.stage].filter(Boolean).join(' · ') || fallback
    case 'quote':
      return what.byline || fallback
    default:
      return fallback
  }
}

function What({ what }: { what: WhatBlock }) {
  const p = 'font-body text-[14px] leading-relaxed text-ink'
  switch (what.kind) {
    case 'text':
      return (
        <>
          <p className={p}>
            <bdi>{what.text}</bdi>
          </p>
          {what.summary && <p className="mt-1 font-body text-[11px] text-muted">{t('archive.what.summary')}</p>}
        </>
      )
    case 'match':
      return (
        <div className="grid gap-1.5">
          <p className={p}>
            <bdi>{[what.competitionHe, what.stage].filter(Boolean).join(' · ')}</bdi>
          </p>
          {what.day && (
            <p className="font-body text-[12px] text-muted">
              {t('archive.what.day')}: <span className="font-mono tabular-nums"><Num>{what.day.split('-').reverse().map((part) => String(Number(part))).join('.')}</Num></span>
              {what.venueHe && <> · {t('archive.what.venue')}: {what.venueHe}</>}
            </p>
          )}
          {what.disputed && <p className="border-s-rule border-red ps-2 font-body text-[12px] leading-snug text-ink">{t('archive.what.disputed')}</p>}
          <p className="font-body text-[12px] font-extrabold text-ink">{t('archive.what.scorers')}</p>
          {what.scorers.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {what.scorers.map((s, i) => (
                <li key={`${s.nameHe}-${i}`} className="border-hair border-ink/40 bg-paper px-2 py-1 font-body text-[12.5px] text-ink">
                  <bdi>{s.nameHe}</bdi>
                  {s.minute !== null && <span className="font-mono tabular-nums text-muted"> <Num>{`${s.minute}'`}</Num></span>}
                  {s.penalty && <span className="text-muted"> · {t('archive.what.pen')}</span>}
                  {s.ownGoal && <span className="text-muted"> · {t('archive.what.og')}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-[12.5px] text-muted">{t('archive.what.noScorers')}</p>
          )}
        </div>
      )
    case 'quote':
      return what.quote ? (
        <>
          <blockquote className="border-s-rule border-red ps-2 font-body text-[13.5px] leading-relaxed text-ink">
            <bdi>{what.quote}</bdi>
          </blockquote>
          <p className="mt-1 font-body text-[11px] text-muted">
            {what.byline} · {t('archive.excerpt', { words: String(what.words) })}
          </p>
        </>
      ) : (
        <p className="font-body text-[13px] text-muted">{t('archive.what.none')}</p>
      )
    case 'person':
      return (
        <ul className="grid gap-1 font-body text-[13.5px] text-ink">
          {what.from !== null && (
            <li className="font-mono tabular-nums">
              <Num>{what.to !== null && what.to !== what.from ? `${what.from}–${what.to}` : String(what.from)}</Num>
            </li>
          )}
          {what.positions.length > 0 && <li>{t('archive.what.person.positions')}: {what.positions.join(', ')}</li>}
          <li>{t('archive.what.person.seasons', { n: String(what.seasons) })}</li>
          {what.numbers.length > 0 && (
            <li>
              {t('archive.what.person.numbers')}: <span className="font-mono tabular-nums"><Num>{what.numbers.map((n) => `#${n}`).join(' ')}</Num></span>
            </li>
          )}
          {what.goals > 0 && <li>{t('archive.what.person.goals', { n: String(what.goals) })}</li>}
        </ul>
      )
    case 'season':
      return (
        <ul className="grid gap-1 font-body text-[13.5px] text-ink">
          <li>{t('archive.what.season.matches', { n: String(what.matches) })}</li>
          {what.trophies.length > 0 && <li>{t('archive.what.season.trophies')}: {what.trophies.join(' · ')}</li>}
        </ul>
      )
    case 'kit':
      return (
        <>
          <p className={p}>{t(what.facts ? 'archive.what.kit.noteOpen' : 'archive.what.kit.note')}</p>
          {what.facts && (
            <dl className="mt-2 grid gap-1 font-body text-[13.5px] text-ink" data-archive="kit-facts">
              {what.facts.makerHe && (
                <div className="flex gap-2">
                  <dt className="text-muted">{t('archive.what.kit.maker')}</dt>
                  <dd>{what.facts.makerHe}</dd>
                </div>
              )}
              {what.facts.sponsorHe && (
                <div className="flex gap-2">
                  <dt className="text-muted">{t('archive.what.kit.sponsor')}</dt>
                  <dd>{what.facts.sponsorHe}</dd>
                </div>
              )}
              {what.facts.photo && (
                <div className="mt-1 flex h-40 items-center justify-center bg-sheet">
                  {/* eslint-disable-next-line @next/next/no-img-element -- the archive ships the bytes it measured (rule 69) */}
                  <img data-archive-photo="" src={what.facts.photo} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </dl>
          )}
          {!what.facts && what.playable && (
            <a href="/kits/archive" className="mt-2 inline-flex min-h-tap items-center border-rule border-ink px-3 font-body text-[13px] font-extrabold text-ink">
              {t('archive.what.kit.photos')}
            </a>
          )}
          {what.playable && (
            <a href="/kits/build" className="mt-2 inline-flex min-h-tap items-center border-rule border-red px-3 font-body text-[13px] font-extrabold text-red">
              {t('archive.what.kit.build')}
            </a>
          )}
        </>
      )
    case 'crest': {
      const src = crestArt(what.imageKey, false)
      return (
        <div className="flex gap-3">
          {src && (
            <span className="relative block h-20 w-20 shrink-0 border-hair border-ink/30 bg-paper">
              <Image src={src} alt="" fill sizes="80px" unoptimized className="object-contain p-1" />
            </span>
          )}
          <div className="grid gap-1">
            {what.text && <p className={p}><bdi>{what.text}</bdi></p>}
            {what.note && <p className="font-body text-[12.5px] text-muted"><bdi>{what.note}</bdi></p>}
          </div>
        </div>
      )
    }
    case 'spells':
      return (
        <p className={p}>
          {what.nameEn && <span dir="ltr" className="font-latin text-[12px] font-bold tracking-wider">{what.nameEn} · </span>}
          {t('archive.what.spells')}: <span className="font-mono tabular-nums"><Num>{what.spells.join(' · ')}</Num></span>
        </p>
      )
    case 'song':
      return (
        <ul className="grid gap-1 font-body text-[13.5px] text-ink">
          {(what.originalTitle || what.originalArtist) && (
            <li>
              {t('archive.what.song.original')}: <bdi>{[what.originalTitle, what.originalArtist].filter(Boolean).join(' — ')}</bdi>
            </li>
          )}
          {what.lyricsBy && <li>{t('archive.what.song.lyrics')}: <bdi>{what.lyricsBy}</bdi></li>}
          {!what.originalTitle && !what.originalArtist && !what.lyricsBy && <li className="text-muted">{t('archive.what.none')}</li>}
        </ul>
      )
    default:
      return <p className="font-body text-[13px] leading-relaxed text-muted">{t('archive.what.none')}</p>
  }
}

/** the surest word any of the card's sources earns — what the drawer still says about them */
function strongest(words: readonly ConfidenceWord[]): ConfidenceWord {
  if (words.includes('high')) return 'high'
  return words.includes('medium') ? 'medium' : 'low'
}
