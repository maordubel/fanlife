'use client'

import { useEffect, useRef, useState } from 'react'

import { NumberPicker } from '@/components/profile/NumberPicker'
import { Num } from '@/components/ui/Num'
import { searchArchive } from '@/app/archive/actions'
import type { ArchiveCard } from '@/lib/archive/graph-types'
import { GATES } from '@/lib/gates'
import { BEGAN, CARD_VALUES, FIRST_TEXT_MAX, FIRST_VENUES, NAME_MAX, VALUES_MAX, type FirstMemory } from '@/lib/game/member'
import { BEGAN_LABEL, VALUE_LABEL } from '@/lib/profile/card'
import { t } from '@/lib/i18n'

import { fanYears, toggleValue, type CardDraft, type CardNames } from './cardView'

type FirstMode = 'venue' | 'match' | 'text'

function modeOf(first: FirstMemory | null): FirstMode {
  if (first === null || 'venueSlug' in first) return 'venue'
  return 'matchId' in first ? 'match' : 'text'
}

/**
 * העורך — the declared half of the card, and only that half (identity spec §3.4).
 *
 * Every field is a PICKER where the app can offer the answer: the home gate from
 * `lib/gates.ts`, the year a person became a fan bounded by the seasons the club has
 * played, how it began as four chips, the first place as a football venue from
 * `venues.json` or a match found in the archive, the number from the same 1–99 grid gate
 * 7 uses (one field, `book.number`, two screens), and what the card should keep as at most
 * three chips. Free text survives in exactly two places — the nickname, which is meant to
 * be printed, and a 24-character fallback for a first memory the archive does not hold,
 * which the card prints and no share card ever does.
 *
 * Nothing here writes: the editor holds a draft, the preview beside it draws the draft,
 * and only "save" sends it — once — through `emit({ type: 'card_edited' })`.
 */
export function CardEditor({
  draft,
  onChange,
  onSave,
  onReset,
  dirty,
  issued,
  names,
  onMatchName,
  savedNote,
}: {
  draft: CardDraft
  onChange: (next: CardDraft) => void
  onSave: () => void
  onReset: () => void
  dirty: boolean
  issued: boolean
  names: CardNames
  onMatchName: (id: string, name: string) => void
  savedNote: boolean
}) {
  const [mode, setMode] = useState<FirstMode>(modeOf(draft.first))
  const set = (patch: Partial<CardDraft>) => onChange({ ...draft, ...patch })
  const years = fanYears()
  const canSave = dirty || !issued

  return (
    <form
      id="card-editor"
      aria-labelledby="card-editor-title"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSave) onSave()
      }}
      className="border-rule border-ink bg-sheet"
    >
      <div className="bg-ink px-3.5 py-2.5">
        <h2 id="card-editor-title" className="font-display text-step-2 leading-none text-paper">
          {issued ? t('tik.edit.title') : t('tik.edit.titleNew')}
        </h2>
        <p className="mt-1 font-body text-[11.5px] leading-snug text-concrete">{t('tik.edit.lede')}</p>
      </div>

      <div className="flex flex-col gap-5 p-3.5">
        {/* ------------------------------------------------------------ the nickname */}
        <div>
          <label htmlFor="card-name" className="flex items-baseline justify-between gap-2">
            <span className="font-body text-[12px] font-extrabold text-ink">{t('tik.edit.name')}</span>
            <span className="font-mono text-[10.5px] tabular-nums text-muted">
              <Num>{`${draft.nameHe.length}/${NAME_MAX}`}</Num>
            </span>
          </label>
          <input
            id="card-name"
            value={draft.nameHe}
            maxLength={NAME_MAX}
            onChange={(event) => set({ nameHe: event.target.value.slice(0, NAME_MAX) })}
            autoComplete="nickname"
            className="mt-1 min-h-tap w-full border-rule border-ink bg-paper px-3 font-display text-step-1 text-ink outline-none focus-visible:border-red"
          />
          <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('tik.edit.nameHint')}</p>
        </div>

        {/* -------------------------------------------------------------- the number */}
        <fieldset>
          <legend className="flex w-full items-baseline justify-between gap-2">
            <span className="font-body text-[12px] font-extrabold text-ink">{t('tik.edit.number')}</span>
            <span className="font-poster text-[22px] leading-none text-red">
              <Num>{draft.number}</Num>
            </span>
          </legend>
          <NumberPicker
            value={draft.number}
            onPick={(n) => set({ number: n })}
            label={t('tik.edit.number')}
            className="mt-1.5 grid max-h-[232px] grid-cols-6 gap-1 overflow-y-auto overscroll-contain border-hair border-ink/25 p-1 min-[400px]:grid-cols-7 sm:grid-cols-10 lg:grid-cols-8"
          />
          <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('tik.edit.numberHint')}</p>
        </fieldset>

        {/* ----------------------------------------------------------- the home gate */}
        <fieldset>
          <legend className="font-body text-[12px] font-extrabold text-ink">{t('tik.edit.homeGate')}</legend>
          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {GATES.map((gate) => {
              const on = draft.homeGate === gate.number
              return (
                <button
                  key={gate.number}
                  type="button"
                  onClick={() => set({ homeGate: on ? null : gate.number })}
                  aria-pressed={on}
                  aria-label={t('tik.edit.gateAria', { n: String(gate.number) })}
                  className={`relative flex min-h-tap items-center justify-center border-hair font-poster text-[20px] leading-none ${
                    on ? 'border-red bg-red text-sheet' : 'border-ink/40 bg-paper text-ink'
                  }`}
                >
                  <Num>{gate.number}</Num>
                  {on && <span aria-hidden="true" className="absolute inset-x-2 bottom-1 h-[2px] bg-sheet" />}
                </button>
              )
            })}
          </div>
          <Chip
            on={draft.homeGate === 'none'}
            onClick={() => set({ homeGate: draft.homeGate === 'none' ? null : 'none' })}
            className="mt-1 w-full"
          >
            {t('core.card.homeNone')}
          </Chip>
          <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('tik.edit.homeGateHint')}</p>
        </fieldset>

        {/* ------------------------------------------------------------- fan since */}
        <div>
          <label htmlFor="card-since" className="font-body text-[12px] font-extrabold text-ink">
            {t('tik.edit.fanSince')}
          </label>
          <div className="relative mt-1.5">
            <select
              id="card-since"
              value={draft.fanSince === null ? '' : String(draft.fanSince)}
              onChange={(event) => {
                const value = event.target.value
                set({ fanSince: value === '' ? null : value === 'new' ? 'new' : Number(value) })
              }}
              className="min-h-tap w-full border-rule border-ink bg-paper pe-9 ps-3 font-body text-step-0 text-ink"
            >
              <option value="">{t('tik.edit.fanSinceNone')}</option>
              <option value="new">{t('core.card.fanNew')}</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 flex items-center font-body text-[12px] text-ink">
              ▾
            </span>
          </div>
          <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('tik.edit.fanSinceHint')}</p>
        </div>

        {/* ---------------------------------------------------------- how it began */}
        <fieldset>
          <legend className="font-body text-[12px] font-extrabold text-ink">{t('tik.edit.began')}</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {BEGAN.map((id) => (
              <Chip key={id} on={draft.began === id} onClick={() => set({ began: draft.began === id ? null : id })}>
                {t(BEGAN_LABEL[id])}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* ------------------------------------------------------ first place / game */}
        <fieldset>
          <legend className="font-body text-[12px] font-extrabold text-ink">{t('tik.edit.first')}</legend>
          <div role="radiogroup" aria-label={t('tik.edit.firstMode')} className="mt-1.5 grid grid-cols-3 gap-1">
            {(['venue', 'match', 'text'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                onClick={() => setMode(id)}
                className={`min-h-tap border-b-plate px-1 font-body text-[12px] font-extrabold ${
                  mode === id ? 'border-red text-ink' : 'border-transparent text-muted'
                }`}
              >
                {t(`tik.edit.firstMode.${id}`)}
              </button>
            ))}
          </div>

          {mode === 'venue' && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {FIRST_VENUES.map((venue) => {
                const on = draft.first !== null && 'venueSlug' in draft.first && draft.first.venueSlug === venue.slug
                return (
                  <Chip key={venue.slug} on={on} onClick={() => set({ first: on ? null : { venueSlug: venue.slug } })}>
                    {venue.nameHe}
                  </Chip>
                )
              })}
            </div>
          )}

          {mode === 'match' && <MatchPicker draft={draft} set={set} names={names} onMatchName={onMatchName} />}

          {mode === 'text' && (
            <div className="mt-2">
              <label htmlFor="card-first-text" className="flex items-baseline justify-between gap-2">
                <span className="font-body text-[11.5px] text-ink">{t('tik.edit.firstText')}</span>
                <span className="font-mono text-[10.5px] tabular-nums text-muted">
                  <Num>{`${draft.first !== null && 'textHe' in draft.first ? draft.first.textHe.length : 0}/${FIRST_TEXT_MAX}`}</Num>
                </span>
              </label>
              <input
                id="card-first-text"
                maxLength={FIRST_TEXT_MAX}
                value={draft.first !== null && 'textHe' in draft.first ? draft.first.textHe : ''}
                onChange={(event) => {
                  const text = event.target.value.slice(0, FIRST_TEXT_MAX)
                  set({ first: text.trim() === '' ? null : { textHe: text } })
                }}
                className="mt-1 min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-step-0 text-ink outline-none focus-visible:border-red"
              />
              <p className="mt-1 border-s-rule border-red ps-2 font-body text-[11px] leading-snug text-ink">
                {t('tik.edit.firstTextNote')}
              </p>
            </div>
          )}
        </fieldset>

        {/* ------------------------------------------------------------- the values */}
        <fieldset>
          <legend className="flex w-full items-baseline justify-between gap-2">
            <span className="font-body text-[12px] font-extrabold text-ink">{t('tik.edit.values')}</span>
            <span className="font-mono text-[10.5px] tabular-nums text-muted">
              <Num>{`${draft.values.length}/${VALUES_MAX}`}</Num>
            </span>
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CARD_VALUES.map((value) => {
              const on = draft.values.includes(value)
              const full = !on && draft.values.length >= VALUES_MAX
              return (
                <Chip
                  key={value}
                  on={on}
                  disabled={full}
                  onClick={() => set({ values: toggleValue(draft.values, value, VALUES_MAX) })}
                >
                  {t(VALUE_LABEL[value])}
                </Chip>
              )
            })}
          </div>
          {draft.values.length >= VALUES_MAX && (
            <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('tik.edit.valuesFull')}</p>
          )}
        </fieldset>
      </div>

      {/* ---------------------------------------------------------------- save bar */}
      {/* The bar rides above the tab bar only while there is something to save; a
          disabled button pinned over the form would cover the fields for nothing. */}
      <div
        className={`z-10 flex items-center gap-2 border-t-rule border-ink bg-sheet p-3 ${
          canSave ? 'sticky bottom-[calc(var(--tap)+1.25rem+env(safe-area-inset-bottom))] lg:bottom-0' : ''
        }`}
      >
        <button
          type="submit"
          disabled={!canSave}
          className="min-h-tap flex-1 border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.98] disabled:opacity-40 motion-reduce:transition-none"
        >
          {issued ? t('tik.edit.save') : t('tik.edit.issue')}
        </button>
        {dirty && issued && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-tap px-3 font-body text-[12px] font-extrabold text-sign underline decoration-2 underline-offset-4"
          >
            {t('tik.edit.reset')}
          </button>
        )}
        <p role="status" className="sr-only">
          {savedNote ? t('tik.edit.saved') : ''}
        </p>
        {savedNote && !dirty && (
          <p aria-hidden="true" className="font-body text-[12px] font-extrabold text-ink">
            {t('tik.edit.saved')}
          </p>
        )}
      </div>
    </form>
  )
}

function Chip({
  on,
  onClick,
  disabled = false,
  className = '',
  children,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={disabled}
      className={`flex min-h-tap items-center justify-center gap-1.5 border-hair px-2 text-center font-sign text-[14px] font-bold leading-tight transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-35 motion-reduce:transition-none ${
        on ? 'border-red bg-red text-sheet' : 'border-ink/40 bg-paper text-ink'
      } ${className}`}
    >
      {on && (
        <span aria-hidden="true" className="font-body text-[12px]">
          ✓
        </span>
      )}
      {children}
    </button>
  )
}

/**
 * המשחק הראשון — found in the archive rather than typed. The search is the Entity Graph's
 * own (`searchArchive`, gate 12's action), filtered to matches; what is stored is the
 * match id, and the card prints the title the archive gives it.
 */
function MatchPicker({
  draft,
  set,
  names,
  onMatchName,
}: {
  draft: CardDraft
  set: (patch: Partial<CardDraft>) => void
  names: CardNames
  onMatchName: (id: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArchiveCard[] | null>(null)
  const [busy, setBusy] = useState(false)
  const request = useRef(0)
  const picked = draft.first !== null && 'matchId' in draft.first ? draft.first.matchId : null

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    const mine = ++request.current
    setBusy(true)
    const timer = window.setTimeout(() => {
      searchArchive(q, 'match')
        .then((cards) => {
          if (mine === request.current) setResults(cards.slice(0, 8))
        })
        .catch(() => {
          if (mine === request.current) setResults([])
        })
        .finally(() => {
          if (mine === request.current) setBusy(false)
        })
    }, 260)
    return () => window.clearTimeout(timer)
  }, [query])

  return (
    <div className="mt-2">
      {picked !== null && (
        <div className="mb-2 flex items-center justify-between gap-2 border-rule border-red bg-paper px-2.5 py-1.5">
          <p className="min-w-0 font-sign text-[14px] font-bold leading-tight text-ink">
            <bdi>{names[picked] ?? picked}</bdi>
          </p>
          <button
            type="button"
            onClick={() => set({ first: null })}
            className="min-h-tap shrink-0 px-2 font-body text-[11.5px] font-extrabold text-sign underline decoration-2 underline-offset-4"
          >
            {t('tik.edit.firstClear')}
          </button>
        </div>
      )}
      <label htmlFor="card-first-match" className="font-body text-[11.5px] text-ink">
        {t('tik.edit.firstSearch')}
      </label>
      <input
        id="card-first-match"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value.slice(0, 80))}
        placeholder={t('tik.edit.firstSearchHint')}
        className="mt-1 min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-step-0 text-ink outline-none focus-visible:border-red"
      />
      <p role="status" className="mt-1 font-body text-[11px] text-muted">
        {busy ? t('tik.edit.searching') : results !== null && results.length === 0 ? t('tik.edit.noMatch') : ''}
      </p>
      {results !== null && results.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {results.map((card) => {
            const on = picked === card.id
            return (
              <li key={card.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onMatchName(card.id, card.titleHe)
                    set({ first: { matchId: card.id } })
                  }}
                  className={`flex min-h-tap w-full flex-col items-start justify-center border-hair px-2.5 py-1.5 text-start ${
                    on ? 'border-red bg-red text-sheet' : 'border-ink/40 bg-paper text-ink'
                  }`}
                >
                  <span className="font-sign text-[14px] font-bold leading-tight">
                    <bdi>{card.titleHe}</bdi>
                  </span>
                  {(card.when || card.subHe) && (
                    <span className={`mt-0.5 font-body text-[11px] leading-tight ${on ? 'text-sheet/80' : 'text-muted'}`}>
                      <bdi>{[card.when, card.subHe].filter(Boolean).join(' · ')}</bdi>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
