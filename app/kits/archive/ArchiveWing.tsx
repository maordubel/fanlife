'use client'

import { useEffect, useMemo, useState } from 'react'

import { HaveWantBar } from '@/components/collector/HaveWantBar'
import { MerchLinks } from '@/components/life/MerchLinks'
import { MerchantOffers } from '@/components/collector/MerchantOffers'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { shirtSignals } from '@/lib/collector/api'
import type { ShirtSignal } from '@/lib/collector/types'
import type { ArchiveShirt, ArchiveSource, DecadeFacet, VariantFacet } from '@/lib/kit/archive'
import { activeCollection } from '@/lib/kit/collection'
import { t } from '@/lib/i18n'

/**
 * ארכיון החולצות — 168 חולצות אמיתיות, ושלושה סינונים.
 *
 * The screen is a grid of photographs and it is deliberately not a game. Everything
 * else in this product asks you something; this asks nothing, because the material is
 * the point: these are the shirts, they are cut out of their backgrounds, and the
 * oldest is from 1949.
 *
 * **Three filters, and each one answers a question somebody actually asks.** "What did
 * we wear in the nineties" is the decade rail. "Show me the keeper shirts" is the
 * variant rail. "Which of these came from ויקיפועל" is the source rail, and it is on
 * screen rather than in a footnote because the two sources date their shirts
 * differently and a reader is owed the means to tell them apart.
 *
 * **A shirt whose season is not certain says so on its own card**, in the same type as
 * the certain ones — `1994 בערך`, not a guess dressed as a season. 114 of the 168 are
 * like that, which is too many to bury in a note at the bottom.
 */

type Variant = ArchiveShirt['variant'] | 'all'
type Source = ArchiveShirt['source'] | 'all'
type Decade = number | 'all'

export function ArchiveWing({
  shirts,
  variants,
  decades,
  sources,
  spoilers = {},
  kits = {},
}: {
  shirts: ArchiveShirt[]
  variants: VariantFacet[]
  decades: DecadeFacet[]
  sources: ArchiveSource[]
  /** slug → Gate 4 collection key, for the exact photographs of shirts Gate 4 deals */
  spoilers?: Record<string, string>
  /** slug → Kit Master id, only where the Kit Master holds this exact photograph (the closet's join) */
  kits?: Record<string, string>
}) {
  const [variant, setVariant] = useState<Variant>('all')
  const [decade, setDecade] = useState<Decade>('all')
  const [source, setSource] = useState<Source>('all')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  // The spoiler shield: a Gate 4 shirt this device has not built stays covered until a tap
  // uncovers it. Before the collection is read, every such shirt is covered — the safe default.
  const store = useMemo(() => activeCollection(), [])
  const [built, setBuilt] = useState<Set<string> | null>(null)
  const [uncovered, setUncovered] = useState<Set<string>>(new Set())
  useEffect(() => {
    let live = true
    void store.read().then((rows) => {
      if (live) setBuilt(new Set(Object.keys(rows)))
    })
    return () => {
      live = false
    }
  }, [store])
  const shielded = (shirt: ArchiveShirt) => {
    const key = spoilers[shirt.slug]
    return key !== undefined && !uncovered.has(shirt.slug) && !(built?.has(key) ?? false)
  }
  const uncover = (slug: string) => setUncovered((rows) => new Set(rows).add(slug))

  // הארון — who has it, who wants it, one read for the whole shelf (≤240 slugs). No answer, no
  // numbers: without a database the map stays empty and no card prints a count it did not get.
  const [signals, setSignals] = useState<Record<string, ShirtSignal>>({})
  useEffect(() => {
    let live = true
    void shirtSignals(shirts.map((shirt) => shirt.slug)).then((rows) => {
      if (live) setSignals(rows)
    })
    return () => {
      live = false
    }
  }, [shirts])
  const setSignal = (slug: string, next: ShirtSignal) => setSignals((rows) => ({ ...rows, [slug]: next }))

  // `?shirt=<slug>` — the link a "מחפש את זאת" card hands over lands on the shirt itself
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('shirt')
    if (slug && shirts.some((shirt) => shirt.slug === slug)) setOpenSlug(slug)
  }, [shirts])

  const shown = shirts
    .filter((shirt) => variant === 'all' || shirt.variant === variant)
    .filter((shirt) => decade === 'all' || shirt.decade === decade)
    .filter((shirt) => source === 'all' || shirt.source === source)

  const open = openSlug ? (shirts.find((shirt) => shirt.slug === openSlug) ?? null) : null
  if (open) {
    return (
      <ShirtSheet
        shirt={open}
        source={sources.find((row) => row.key === open.source) ?? null}
        onBack={() => setOpenSlug(null)}
        kitId={kits[open.slug] ?? null}
        signal={signals[open.slug]}
        onSignal={(next) => setSignal(open.slug, next)}
        shielded={shielded(open)}
        onUncover={() => uncover(open.slug)}
      />
    )
  }

  return (
    <div className="mt-stack">
      <div className="flex items-end justify-between gap-4">
        <p className="font-display text-step-2 leading-none text-ink">{t('kits.archive.shelf')}</p>
        {/* Not wrapped in <Num>: the phrase has Hebrew between its two figures, and
            forcing the whole run LTR is what printed "מתוך 168 168". Each number is a
            plain digit run with no separator, so the bidi algorithm gets it right. */}
        <p className="shrink-0 font-poster text-[20px] leading-none text-red">
          {t('kits.archive.of', { n: String(shown.length), total: String(shirts.length) })}
        </p>
      </div>

      <Rail label={t('kits.archive.filter.variant')}>
        <Chip on={variant === 'all'} onClick={() => setVariant('all')} label={t('kits.archive.all')} />
        {variants.map((row) => (
          <Chip
            key={row.variant}
            on={variant === row.variant}
            onClick={() => setVariant(row.variant)}
            label={row.variantHe}
            count={row.count}
          />
        ))}
      </Rail>

      <Rail label={t('kits.archive.filter.decade')}>
        <Chip on={decade === 'all'} onClick={() => setDecade('all')} label={t('kits.archive.all')} />
        {decades.map((row) => (
          <Chip
            key={row.decade}
            on={decade === row.decade}
            onClick={() => setDecade(row.decade)}
            label={decadeHe(row.decade)}
            count={row.count}
          />
        ))}
      </Rail>

      <Rail label={t('kits.archive.filter.source')}>
        <Chip on={source === 'all'} onClick={() => setSource('all')} label={t('kits.archive.all')} />
        {sources.map((row) => (
          <Chip
            key={row.key}
            on={source === row.key}
            onClick={() => setSource(row.key)}
            label={t(
              row.key === 'vikipoel' ? 'kits.archive.source.vikipoel' : 'kits.archive.source.fka',
            )}
            count={row.count}
            latin={row.key === 'fka'}
          />
        ))}
      </Rail>

      {shown.length === 0 ? (
        <p className="mt-stack border-rule border-ink bg-sheet p-4 text-center font-body text-step--1 text-muted">
          {t('kits.archive.empty')}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((shirt) => (
            <li key={shirt.slug}>
              {shielded(shirt) ? (
                <ShieldCard shirt={shirt} onUncover={() => uncover(shirt.slug)} />
              ) : (
                <ShirtCard shirt={shirt} signal={signals[shirt.slug]} onOpen={() => setOpenSlug(shirt.slug)} />
              )}
            </li>
          ))}
        </ul>
      )}

      <Credits sources={sources} />
    </div>
  )
}

/** `1990` → `שנות ה-90`; `2010` → `שנות ה-2010`. Two digits reads wrong after 1999. */
function decadeHe(decade: number): string {
  const short = decade < 2000 ? String(decade).slice(2) : String(decade)
  return t('kits.archive.decade', { d: short })
}

/**
 * One filter row, laid out exactly like the roster wing's (`components/roster/
 * RosterFilters.tsx`): a fixed label column and a chip strip that scrolls sideways.
 *
 * Wrapping was the first version and it cost six rows of chrome on a 390px phone before
 * a single shirt appeared — three rails, nine decades, six variants. Scrolling keeps the
 * grid where a reader's eye already is, and it is the pattern this product already uses
 * for exactly this job, which matters more than either layout on its own.
 */
function Rail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="w-[42px] shrink-0 font-body text-[10px] font-extrabold tracking-wide text-muted">
        {label}
      </span>
      <div className="-mx-0.5 flex flex-1 gap-1 overflow-x-auto px-0.5 pb-1">{children}</div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  label,
  count,
  latin = false,
}: {
  on: boolean
  onClick: () => void
  label: string
  count?: number
  latin?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-[38px] shrink-0 items-center gap-1.5 border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
      }`}
    >
      <span dir={latin ? 'ltr' : undefined}>{label}</span>
      {count !== undefined && (
        <span className={`font-mono text-[10px] ${on ? 'text-concrete' : 'text-muted'}`}>
          <Num>{count}</Num>
        </span>
      )}
    </button>
  )
}

/**
 * A date the source was sure of, or a year it was not.
 *
 * `<Num>` isolates a run LTR, which is right for `1994/95` — a slash in RTL text
 * reorders — and wrong for `1994 בערך`, where it would drag the Hebrew word to the
 * wrong side of the number. So the isolation goes around the figure and nothing else.
 */
function DateLabel({ shirt }: { shirt: ArchiveShirt }) {
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return <Num>{shirt.seasonLabel}</Num>
  return (
    <>
      <Num>{String(shirt.yearRaw ?? '')}</Num> {t('kits.archive.approx')}
    </>
  )
}

/** The same thing as a string, for `alt` and `title`, where elements cannot go. */
function dateText(shirt: ArchiveShirt): string {
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return shirt.seasonLabel
  return t('kits.archive.approxOf', { y: String(shirt.yearRaw ?? '') })
}

/**
 * One hanger.
 *
 * The photograph is served as the file that was measured — a plain `<img>`, not the
 * framework's optimiser. That is not a performance opinion: these files were encoded
 * once, DECODED, and the yellow in them counted on the bytes that ship (rule 61). An
 * optimiser that re-encodes on the way out would invalidate the number the card prints
 * two lines below the picture, which is the number the third yellow exemption rests on.
 */
function ShirtCard({ shirt, signal, onOpen }: { shirt: ArchiveShirt; signal?: ShirtSignal; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col border-rule border-ink/70 bg-sheet p-2 text-start transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the measured bytes ship unchanged; see the note above */}
      <img
        src={shirt.src}
        alt={`${shirt.variantHe} · ${dateText(shirt)}`}
        width={760}
        height={760}
        loading="lazy"
        decoding="async"
        data-archive-photo=""
        className="block h-auto w-full"
      />
      <span className="mt-2 block font-poster text-[17px] leading-none text-ink">
        <DateLabel shirt={shirt} />
      </span>
      <span className="mt-1 block truncate font-body text-[11px] font-extrabold text-red">
        {shirt.variantHe}
        {shirt.index !== null ? ` ${shirt.index}` : ''}
      </span>
      <span className="mt-0.5 block truncate font-body text-[10.5px] text-muted">
        {shirt.specialHe ?? shirt.competitionHe ?? shirt.makerHe ?? ' '}
      </span>
      {/* the closet's count, only when the database counted something */}
      {signal && (signal.want > 0 || signal.have > 0 || signal.youHave) ? (
        <span
          aria-label={t('collector.signal.aria', { want: String(signal.want), have: String(signal.have) })}
          className="mt-1 flex items-center justify-between gap-1 border-t-hair border-ink/25 pt-1 font-body text-[10.5px] font-extrabold text-ink"
        >
          <span aria-hidden="true">{t('collector.signal.compact', { want: String(signal.want), have: String(signal.have) })}</span>
          {signal.youHave ? <span className="bg-red px-1 text-paper">{t('collector.signal.yours')}</span> : null}
        </span>
      ) : null}
    </button>
  )
}

/**
 * מגן ספוילר — the card of a Gate 4 shirt the player has not built yet: the date and the variant,
 * no photograph (not even a hidden one), and a tap to uncover it anyway. The archive does not
 * refuse; it asks first.
 */
function ShieldCard({ shirt, onUncover }: { shirt: ArchiveShirt; onUncover: () => void }) {
  return (
    <button
      type="button"
      onClick={onUncover}
      aria-label={t('kits.shield.aria', { date: dateText(shirt) })}
      className="flex min-h-tap w-full flex-col border-rule border-dashed border-ink/50 bg-paper p-2 text-start"
    >
      <span className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-sheet px-3 text-center">
        <span className="font-display text-[18px] leading-tight text-ink">{t('kits.shield.title')}</span>
        <span className="font-body text-[11px] leading-snug text-muted">{t('kits.shield.body')}</span>
      </span>
      <span className="mt-2 block font-poster text-[17px] leading-none text-ink">
        <DateLabel shirt={shirt} />
      </span>
      <span className="mt-1 block truncate font-body text-[11px] font-extrabold text-red">{shirt.variantHe}</span>
    </button>
  )
}

/**
 * כרטיס חולצה — one photograph, and everything the archive knows about it.
 *
 * Including the measurement. A shirt with a yellow badge on the sleeve prints how much
 * yellow it carries, because `public/kits/` is an exemption from rule 8 and an
 * exemption that hides its numbers is just a rule nobody enforces.
 */
function ShirtSheet({
  shirt,
  source,
  onBack,
  kitId,
  signal,
  onSignal,
  shielded,
  onUncover,
}: {
  shirt: ArchiveShirt
  source: ArchiveSource | null
  onBack: () => void
  kitId: string | null
  signal: ShirtSignal | undefined
  onSignal: (next: ShirtSignal) => void
  /** a Gate 4 shirt opened by link before it was built: the sheet says so and shows no photograph */
  shielded: boolean
  onUncover: () => void
}) {
  const rows: Array<{ label: string; value: string | null; ltr?: boolean }> = [
    // `1994/95` carries a slash and must be isolated; `1994 בערך` must not be.
    { label: t('kits.archive.spec.date'), value: dateText(shirt), ltr: !shirt.seasonAmbiguous },
    { label: t('kits.archive.spec.variant'), value: shirt.variantHe },
    { label: t('kits.archive.spec.competition'), value: shirt.competitionHe },
    { label: t('kits.archive.spec.special'), value: shirt.specialHe },
    { label: t('kits.archive.spec.maker'), value: shirt.makerHe },
    {
      label: t('kits.archive.spec.yellow'),
      value:
        shirt.yellowPx > 0
          ? t('kits.archive.yellow', {
              px: String(shirt.yellowPx),
              pct: shirt.yellowPct.toFixed(shirt.yellowPct < 0.01 ? 3 : 2),
            })
          : t('kits.archive.yellowNone'),
    },
  ]

  return (
    <div className="mt-stack">
      <button
        type="button"
        onClick={onBack}
        className="min-h-tap font-body text-step--1 font-extrabold text-red underline underline-offset-4"
      >
        ← {t('kits.archive.back')}
      </button>

      <div className="mt-3 bg-red px-4 py-3 text-paper">
        <p className="font-body text-[10px] tracking-widest text-paper/85">
          {t('kits.archive.card')}
        </p>
        <p className="mt-1 font-display text-step-2 leading-tight">
          {shirt.variantHe} · <DateLabel shirt={shirt} />
        </p>
      </div>

      <div className="border-x-rule border-b-rule border-ink bg-paper p-4">
        {shielded ? (
          <button
            type="button"
            onClick={onUncover}
            aria-label={t('kits.shield.aria', { date: dateText(shirt) })}
            className="mx-auto flex aspect-square min-h-tap w-full max-w-[420px] flex-col items-center justify-center gap-2 border-rule border-dashed border-ink/50 bg-sheet px-6 text-center"
          >
            <span className="font-display text-step-2 leading-tight text-ink">{t('kits.shield.title')}</span>
            <span className="max-w-[28ch] font-body text-step--1 leading-snug text-muted">{t('collector.shield.sheet')}</span>
          </button>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- as above: the file that ships is the file that was measured
          <img
            src={shirt.src}
            alt={`${shirt.variantHe} · ${dateText(shirt)}`}
            width={760}
            height={760}
            data-archive-photo=""
            className="mx-auto block h-auto w-full max-w-[420px]"
          />
        )}
      </div>

      <HaveWantBar
        slug={shirt.slug}
        kitId={kitId}
        dateLabel={dateText(shirt)}
        variantHe={shirt.variant === 'home' ? null : shirt.variantHe}
        signal={signal}
        onSignal={onSignal}
      />

      {shirt.seasonAmbiguous && (
        <p className="mt-2 border-rule border-sign/50 bg-sheet p-3 font-body text-[12px] leading-relaxed text-sign">
          {t('kits.archive.approxNote')}
        </p>
      )}

      <dl className="mt-stack border-rule border-ink bg-sheet">
        <p className="border-b-hair border-ink/30 px-3 py-2 font-display text-step-0 text-ink">
          {t('kits.archive.spec')}
        </p>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 border-b-hair border-ink/20 px-3 py-2.5"
          >
            <dt className="shrink-0 font-body text-[11px] tracking-widest text-muted">
              {row.label}
            </dt>
            {/* Only a pure figure is isolated LTR. A row whose value is Hebrew — the
                variant, the competition, the maker — reads correctly in the paragraph's
                own direction, and forcing it would be the bug <Num> exists to fix, in
                reverse. */}
            <dd
              className={`min-w-0 truncate font-body text-[13px] font-bold ${
                row.value ? 'text-ink' : 'text-muted/70'
              }`}
            >
              {row.ltr ? <Num>{row.value}</Num> : (row.value ?? t('kits.archive.none'))}
            </dd>
          </div>
        ))}
      </dl>

      <MerchantOffers slug={shirt.slug} kitId={kitId} season={shirt.seasonLabel} />

      {/* (delta 92, plan §11.5) the store links — secondary, each with its official/replica line */}
      <MerchLinks shirtId={shirt.slug} season={shirt.seasonLabel ?? (shirt.yearRaw ? String(shirt.yearRaw) : null)} />

      {/* the source and the photographer live on /credits (spec §0.3, 22.9.2026) */}
      {source && <SourceNote group="photo" className="mt-2" />}
    </div>
  )
}

/**
 * The credit is on /credits, and it is still not a footnote.
 *
 * 114 of these photographs are ישי צבי's, published on ויקיפועל. Until 22.9.2026 his name
 * and both sources were printed here; the owner's spec (§0.3) moved every credit to one
 * page, where he is the first line of the photographs shelf (`/credits#photo`). What stays
 * here is the note on how the files were cut — that is about the archive, not a credit.
 */
function Credits({ sources }: { sources: ArchiveSource[] }) {
  return (
    <div className="mt-stack border-rule border-ink bg-sheet">
      {sources.length > 0 && (
        <p className="border-b-hair border-ink/30 px-3 py-1.5">
          <SourceNote group="photo" />
        </p>
      )}
      <p className="px-3 py-2.5 font-body text-[11.5px] leading-relaxed text-muted">
        {t('kits.archive.note')}
      </p>
    </div>
  )
}
