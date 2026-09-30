'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { KitEngineShirt } from '@/components/kit/KitEngineShirt'
import { MarkArtwork } from '@/components/kit/MarkArtwork'
import { firePickFxAt } from '@/components/stage/PickFx'
import { dropZone, useDragActive, useDragSource } from '@/components/stage/useDrag'
import { t, type MessageKey } from '@/lib/i18n'
import { BODY_TEMPLATES, bodyTemplateForSeason, type KitBodyTemplateId } from '@/lib/kit/body-templates'
import { kitKey } from '@/lib/kit/collection'
import { recordDeed } from '@/lib/profile/store'
import { CREST_MARKS, crestArt } from '@/lib/kit/crestMarks'
import { makerAssetForName, sponsorAssetForName } from '@/lib/kit/mark-library'
import {
  COLLARS,
  COLOUR_NAME,
  COLOUR_VAR,
  DEFAULT_SPEC,
  NAMESETS,
  PATTERNS,
  SLEEVES,
  type KitColour,
  type KitSpec,
} from '@/lib/kit/spec'
import { activeStudioStore, type SavedKitDesign } from '@/lib/kit/studio-store'
import {
  KIT_BRIEFS,
  scoreStudioDesign,
  type KitBriefId,
  type StudioMetrics,
} from '@/lib/kit/studio'

type RackKit = { seasonLabel: string; noteHe?: string; spec: KitSpec }
type TabId = 'dna' | 'body' | 'colour' | 'pattern' | 'collar' | 'sleeves' | 'maker' | 'sponsor' | 'crest' | 'number'

type HistoryEntry = { spec: KitSpec; bodyTemplateId: KitBodyTemplateId }

const COLOURS: KitColour[] = ['red', 'cream', 'paper', 'ink', 'navy', 'deep', 'concrete']
const NUMBERS = [5, 7, 8, 9, 10, 11, 12, 14, 15, 17, 20, 23]
const CREATIVE_SPONSORS: Array<string | null> = [null, 'THE WORKER', 'HAPOEL', '1923']

function pulse() {
  try { navigator.vibrate?.(8) } catch {}
}

function withBody(spec: KitSpec, bodyTemplateId: KitBodyTemplateId): KitSpec {
  return { ...spec, bodyTemplateId } as KitSpec
}

/** the drop zone every chip in the studio can be dragged onto */
const SHIRT_ZONE = 'kit-shirt'

/**
 * Phone (< md): the chips sit in ONE horizontal rail under the shirt, so a drag is a lift UP
 * off the rail (`axis: 'up'` — sideways still scrolls the rail). From md up the panels are
 * grids beside/under the shirt and a drag goes any way.
 */
function useRailAxis(): 'up' | 'any' {
  const [axis, setAxis] = useState<'up' | 'any'>('up')
  useEffect(() => {
    const q = window.matchMedia('(min-width: 768px)')
    const on = () => setAxis(q.matches ? 'any' : 'up')
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return axis
}

type Apply = (run: () => void, label: string) => void

/**
 * One studio chip — a colour, a pattern, a collar, a mark, a crest, a number. TAP applies it
 * (the accessible path, WCAG 2.5.7); DRAG it onto the shirt applies it too (delta 88, Gate 5).
 * Either way the shirt takes the one print hit (`firePickFx`).
 */
function DragChip({
  run,
  label,
  apply,
  axis,
  className = '',
  pressed,
  ariaLabel,
  style,
  children,
}: {
  run: () => void
  label: string
  apply: Apply
  axis: 'up' | 'any'
  className?: string
  pressed?: boolean
  ariaLabel?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const drag = useDragSource({
    payload: label,
    axis,
    onDrop: (zone) => {
      if (zone === SHIRT_ZONE) apply(run, label)
    },
  })
  return (
    <button
      type="button"
      {...drag}
      style={{ ...style, ...drag.style }}
      onClick={() => apply(run, label)}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  )
}

export function KitDesignerV5({ rack }: { rack: RackKit[]; seed?: number }) {
  const studioStore = useMemo(() => activeStudioStore(), [])
  const [saved, setSaved] = useState<SavedKitDesign[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [spec, setSpec] = useState<KitSpec>({ ...DEFAULT_SPEC, seasonLabel: 'STUDIO' })
  const [bodyTemplateId, setBodyTemplateId] = useState<KitBodyTemplateId>('modern-athletic')
  const [tab, setTab] = useState<TabId>('dna')
  const [briefId, setBriefId] = useState<KitBriefId>('free')
  const [dnaKeys, setDnaKeys] = useState<string[]>([])
  const [result, setResult] = useState<{ metrics: StudioMetrics } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const didLoad = useRef(false)
  const shirtRef = useRef<HTMLDivElement | null>(null)
  const [bump, setBump] = useState(0)
  const axis = useRailAxis()
  const drag = useDragActive()

  /** every pick in the studio: change the shirt, then hit it — the ground's one pick effect */
  const apply: Apply = (run, label) => {
    run()
    setBump((n) => n + 1)
    firePickFxAt(shirtRef.current, { label, tone: 'red', haptic: false })
  }

  useEffect(() => {
    if (didLoad.current) return
    didLoad.current = true
    void studioStore.read().then(setSaved)
  }, [studioStore])

  // The rack arrives already proven: Gate 5's server answered only for the shirts whose DNA
  // opened in Gate 4 (a signed token each), so there is nothing left to filter here.
  const unlocked = rack
  const dnaSpecs = useMemo(
    () => dnaKeys
      .map((key) => unlocked.find((row) => kitKey(row.seasonLabel, row.spec.variant) === key)?.spec)
      .filter((row): row is KitSpec => Boolean(row)),
    [dnaKeys, unlocked],
  )
  const makerOptions = useMemo(
    () => [...new Set(unlocked.map((row) => row.spec.makerHe).filter((value): value is string => Boolean(value)))],
    [unlocked],
  )
  const sponsorOptions = useMemo(
    () => [...new Set([...CREATIVE_SPONSORS, ...unlocked.map((row) => row.spec.sponsorHe)])],
    [unlocked],
  )
  const crestOptions = useMemo(
    () => [...new Set(unlocked.map((row) => row.spec.crestKey).filter((value): value is string => Boolean(value)))],
    [unlocked],
  )
  const brief = KIT_BRIEFS.find((row) => row.id === briefId) ?? KIT_BRIEFS[0]!
  const tabs: readonly { id: TabId; label: string }[] = [
    { id: 'dna', label: 'DNA' },
    { id: 'body', label: t('kit.tab.base') },
    { id: 'colour', label: t('kit.base') },
    { id: 'pattern', label: t('kit.tab.pattern') },
    { id: 'collar', label: t('kit.tab.collar') },
    { id: 'sleeves', label: t('kitgame.part.sleeve') },
    { id: 'maker', label: t('kits.spec.maker') },
    { id: 'sponsor', label: t('kits.spec.sponsor') },
    { id: 'crest', label: t('kits.spec.crest') },
    { id: 'number', label: t('kit.number') },
  ]

  function snapshot() {
    setHistory((rows) => [...rows.slice(-19), { spec, bodyTemplateId }])
    setFuture([])
  }

  function mutate(patch: Partial<KitSpec>) {
    snapshot()
    setSpec((current) => ({ ...current, ...patch, seasonLabel: 'STUDIO' }))
    setResult(null)
    pulse()
  }

  function pickBody(id: KitBodyTemplateId) {
    snapshot()
    setBodyTemplateId(id)
    setResult(null)
    pulse()
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setFuture((rows) => [{ spec, bodyTemplateId }, ...rows].slice(0, 20))
    setHistory((rows) => rows.slice(0, -1))
    setSpec(previous.spec)
    setBodyTemplateId(previous.bodyTemplateId)
    setResult(null)
  }

  function redo() {
    const next = future[0]
    if (!next) return
    setHistory((rows) => [...rows, { spec, bodyTemplateId }].slice(-20))
    setFuture((rows) => rows.slice(1))
    setSpec(next.spec)
    setBodyTemplateId(next.bodyTemplateId)
    setResult(null)
  }

  function reset() {
    snapshot()
    setSpec({ ...DEFAULT_SPEC, seasonLabel: 'STUDIO' })
    setBodyTemplateId('modern-athletic')
    setDnaKeys([])
    setResult(null)
  }

  function applyDna(row: RackKit) {
    snapshot()
    setSpec({ ...row.spec, seasonLabel: 'STUDIO' })
    setBodyTemplateId(bodyTemplateForSeason(row.seasonLabel).id)
    const key = kitKey(row.seasonLabel, row.spec.variant)
    setDnaKeys((keys) => keys.includes(key) ? keys : [...keys, key].slice(-3))
    setResult(null)
    pulse()
  }

  function toggleDna(row: RackKit) {
    const key = kitKey(row.seasonLabel, row.spec.variant)
    setDnaKeys((keys) => keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key].slice(-3))
    pulse()
  }

  function judge() {
    const metrics = scoreStudioDesign(spec, briefId, dnaSpecs)
    setResult({ metrics })
    pulse()
  }

  async function save() {
    const metrics = result?.metrics ?? scoreStudioDesign(spec, briefId, dnaSpecs)
    const row = await studioStore.save({
      id: editingId ?? undefined,
      briefId,
      spec,
      dnaKeys,
      metrics,
      stamp: metrics.overall >= 75,
      bodyTemplateId,
    })
    setEditingId(row.id)
    setSaved(await studioStore.read())
    recordDeed('/kits')
    setResult({ metrics })
    pulse()
  }

  function reopen(row: SavedKitDesign) {
    setEditingId(row.id)
    setBriefId(row.briefId)
    setSpec(row.spec)
    setDnaKeys(row.dnaKeys)
    setBodyTemplateId(row.bodyTemplateId ?? 'modern-athletic')
    setResult({ metrics: row.metrics })
  }

  const chip = { apply, axis }
  const panel = (
    <>
      {tab === 'dna' && <DnaPanel unlocked={unlocked} dnaKeys={dnaKeys} onApply={applyDna} onToggle={toggleDna} {...chip} />}
      {tab === 'body' && <BodyPanel selected={bodyTemplateId} spec={spec} onPick={pickBody} {...chip} />}
      {tab === 'colour' && <ColourPanel spec={spec} mutate={mutate} {...chip} />}
      {tab === 'pattern' && <ShirtChoiceGrid items={PATTERNS.map((row) => ({ id: row.id, label: row.he }))} selected={spec.pattern} spec={withBody(spec, bodyTemplateId)} patch={(id) => ({ pattern: id as KitSpec['pattern'] })} onPick={(id) => mutate({ pattern: id as KitSpec['pattern'] })} {...chip} />}
      {tab === 'collar' && <ShirtChoiceGrid items={COLLARS.map((row) => ({ id: row.id, label: row.he }))} selected={spec.collar} spec={withBody(spec, bodyTemplateId)} patch={(id) => ({ collar: id as KitSpec['collar'] })} onPick={(id) => mutate({ collar: id as KitSpec['collar'] })} {...chip} />}
      {tab === 'sleeves' && <ShirtChoiceGrid items={SLEEVES.map((row) => ({ id: row.id, label: row.he }))} selected={spec.sleeves} spec={withBody(spec, bodyTemplateId)} patch={(id) => ({ sleeves: id as KitSpec['sleeves'] })} onPick={(id) => mutate({ sleeves: id as KitSpec['sleeves'] })} {...chip} />}
      {tab === 'maker' && <MarkPanel kind="maker" values={makerOptions} selected={spec.makerHe} seasonLabel={spec.seasonLabel} onPick={(value) => mutate({ makerHe: value })} {...chip} />}
      {tab === 'sponsor' && <MarkPanel kind="sponsor" values={sponsorOptions} selected={spec.sponsorHe} seasonLabel={spec.seasonLabel} onPick={(value) => mutate({ sponsorHe: value })} {...chip} />}
      {tab === 'crest' && <CrestPanel values={crestOptions} selected={spec.crestKey} onPick={(value) => mutate({ crestKey: value })} {...chip} />}
      {tab === 'number' && <NumberPanel spec={spec} mutate={mutate} {...chip} />}
    </>
  )

  return (
    <section className="flex h-full min-h-0 flex-col border-rule border-ink bg-sheet md:block md:h-auto">
      {/* the title plate — md up; on a phone the StageHeader already names the gate */}
      <header className="hidden items-end justify-between gap-3 border-b-rule border-ink bg-ink px-3 py-2 text-paper md:flex">
        <div>
          <p className="font-mono tabular-nums text-[11px] font-bold tracking-[.18em] text-red" dir="ltr">GATE 05 · KIT DNA STUDIO V5</p>
          <h2 className="font-display text-[24px] leading-none">{t('kit.designer')}</h2>
        </div>
        <div className="flex gap-1">
          <ToolButton disabled={!history.length} onClick={undo}>↶</ToolButton>
          <ToolButton disabled={!future.length} onClick={redo}>↷</ToolButton>
          <ToolButton onClick={reset}>{t('kitgame.reset')}</ToolButton>
        </div>
      </header>

      {/* the phone's tool strip: history on one side, the two actions on the other — one line */}
      <div className="flex shrink-0 items-stretch gap-1 border-b-rule border-ink bg-ink p-1 text-paper md:hidden">
        <ToolButton disabled={!history.length} onClick={undo}>↶</ToolButton>
        <ToolButton disabled={!future.length} onClick={redo}>↷</ToolButton>
        <ToolButton onClick={reset}>{t('kitgame.reset')}</ToolButton>
        <span className="flex-1" />
        <button type="button" onClick={judge} className="min-h-tap border-hair border-paper/40 px-2 font-body text-[11px] font-extrabold">{t('kitgame.check')}</button>
        <button type="button" onClick={() => void save()} className="min-h-tap bg-red px-3 font-body text-[11px] font-extrabold text-paper">{t('kitBuild.lock')}</button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5 md:grid md:min-h-[min(760px,calc(100dvh-155px))] md:grid-cols-[minmax(0,1fr)] md:grid-rows-[minmax(300px,54dvh)_minmax(0,1fr)] md:gap-2 md:p-2 lg:grid-cols-[minmax(310px,420px)_minmax(0,1fr)] lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-rule border-ink bg-paper md:flex-none">
          {/* THE drop zone: every chip below can be dragged here, or tapped */}
          <div
            ref={shirtRef}
            {...dropZone(SHIRT_ZONE)}
            className={`relative min-h-0 flex-1 p-2 transition-colors duration-press motion-reduce:transition-none ${drag.active ? 'bg-red/5' : ''}`}
          >
            <div key={bump} className={`h-full ${bump ? 'animate-fx-pop' : ''}`}>
              <KitEngineShirt spec={withBody(spec, bodyTemplateId)} look="photo" marks="granted" className="mx-auto block h-full max-h-[510px] w-full" title={t('kit.preview')} />
            </div>
            {drag.active && (
              <p className="pointer-events-none absolute inset-x-2 bottom-2 bg-ink px-2 py-1 text-center font-body text-[11px] font-extrabold text-paper">{t('kits.studio.dragHint')}</p>
            )}
          </div>
          <div className="hidden grid-cols-2 border-t-hair border-ink md:grid">
            <button type="button" onClick={judge} className="min-h-tap border-e-hair border-ink font-body text-[11px] font-extrabold">{t('kitgame.check')}</button>
            <button type="button" onClick={() => void save()} className="min-h-tap bg-red font-body text-[11px] font-extrabold text-paper">{t('kitBuild.lock')}</button>
          </div>
          {result && (
            <div className="grid grid-cols-2 border-t-hair border-ink">
              <FitStat label={t('kits.fit.brief')} value={result.metrics.briefFit} />
              <FitStat label={t('kits.fit.dna')} value={dnaSpecs.length > 0 ? result.metrics.dnaUse : null} />
              <p className="col-span-2 hidden border-t-hair border-ink/30 px-3 py-1.5 font-body text-[11px] leading-snug text-muted md:block">{t('kits.fit.note')}</p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 shrink-0 flex-col md:shrink">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-rule border-ink bg-paper p-1">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id} className={`min-h-tap shrink-0 border-hair px-3 font-body text-[11px] font-extrabold ${tab === item.id ? 'border-red bg-red text-paper' : 'border-ink bg-sheet text-ink'}`}>{item.label}</button>
            ))}
          </div>

          {/* phone: ONE rail, a fixed height, scrolled sideways; md up: the panel grid */}
          <div className="mt-1.5 h-[132px] shrink-0 overflow-x-auto overflow-y-hidden border-rule border-ink bg-paper p-1.5 md:mt-2 md:h-auto md:min-h-0 md:flex-1 md:overflow-x-visible md:overflow-y-auto md:p-2">
            {panel}
          </div>

          <div className="mt-1.5 flex shrink-0 gap-1 overflow-x-auto md:mt-2">
            {KIT_BRIEFS.map((row) => (
              <button key={row.id} type="button" onClick={() => { setBriefId(row.id); setResult(null) }} aria-pressed={briefId === row.id} className={`min-h-tap shrink-0 border-hair px-3 font-body text-[11px] font-bold ${briefId === row.id ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper'}`}>{t(`kits.brief.${row.id}.title` as MessageKey)}</button>
            ))}
            {saved.length > 0 && <button type="button" onClick={() => reopen(saved[0]!)} className="min-h-tap shrink-0 border-hair border-ink bg-paper px-2 font-body text-[11px] font-bold md:hidden">{t('kits.tab.designer')}</button>}
          </div>
          <p className="mt-1 shrink-0 truncate font-body text-[11px] leading-snug text-muted max-md:[@media(max-height:700px)]:hidden md:whitespace-normal">{t(`kits.brief.${brief.id}.body` as MessageKey)}</p>
          {saved.length > 0 && <button type="button" onClick={() => reopen(saved[0]!)} className="mt-1 hidden min-h-tap shrink-0 border-hair border-ink bg-paper px-2 font-body text-[11px] font-bold md:block">{t('kits.tab.designer')}</button>}
        </div>
      </div>
    </section>
  )
}

function FitStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="px-3 py-2">
      <p className="font-body text-[11px] font-bold text-muted">{label}</p>
      <p className="font-display text-[22px] leading-none text-ink">
        {value === null ? '—' : <span dir="ltr">{value}</span>}
      </p>
    </div>
  )
}

function ToolButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="min-h-tap border-hair border-paper/40 px-2 font-body text-[11px] font-bold disabled:opacity-30">{children}</button>
}

type ChipProps = { apply: Apply; axis: 'up' | 'any' }

/** a phone rail that becomes the md-up grid it always was */
const rail = (grid: string) => `flex h-full gap-1.5 md:grid md:h-auto ${grid}`
const railItem = 'w-[104px] shrink-0 md:w-auto'

function DnaPanel({ unlocked, dnaKeys, onApply, onToggle, apply, axis }: { unlocked: RackKit[]; dnaKeys: string[]; onApply: (row: RackKit) => void; onToggle: (row: RackKit) => void } & ChipProps) {
  if (!unlocked.length) return <a href="/kits/build" className="flex h-full min-h-[100px] items-center justify-center border-rule border-red bg-red px-4 text-center font-body text-[12px] font-extrabold text-paper md:min-h-[120px]">{t('kitgame.cta')}</a>
  return (
    <div className={rail('md:grid-cols-4')}>
      {unlocked.map((row) => {
        const key = kitKey(row.seasonLabel, row.spec.variant)
        const used = dnaKeys.includes(key)
        return (
          <div key={key} className={`flex flex-col border-rule p-1 ${railItem} ${used ? 'border-red' : 'border-ink/30'}`}>
            <DragChip run={() => onApply(row)} label={row.seasonLabel} apply={apply} axis={axis} className="min-h-0 w-full flex-1">
              <KitEngineShirt spec={row.spec} look="photo" marks="granted" className="mx-auto block h-[52px] w-full md:h-[94px]" />
              <span className="block font-mono tabular-nums text-[11px] font-bold">{row.seasonLabel}</span>
            </DragChip>
            <button type="button" onClick={() => onToggle(row)} aria-pressed={used} className={`mt-1 min-h-tap w-full border-hair px-1 font-body text-[11px] font-bold ${used ? 'border-red bg-red text-paper' : 'border-ink'}`}>{used ? t('kits.dna.used') : t('kits.dna.use')}</button>
          </div>
        )
      })}
    </div>
  )
}

function BodyPanel({ selected, spec, onPick, apply, axis }: { selected: KitBodyTemplateId; spec: KitSpec; onPick: (id: KitBodyTemplateId) => void } & ChipProps) {
  return (
    <div className={rail('md:grid-cols-3')}>
      {Object.values(BODY_TEMPLATES).map((row) => (
        <DragChip key={row.id} run={() => onPick(row.id)} label={row.labelHe} apply={apply} axis={axis} pressed={selected === row.id} className={`border-rule p-1.5 ${railItem} ${selected === row.id ? 'border-red bg-red/5' : 'border-ink/30'}`}>
          <KitEngineShirt spec={withBody(spec, row.id)} look="photo" marks="granted" className="mx-auto block h-[64px] w-full md:h-[118px]" />
          <span className="mt-1 block truncate font-body text-[11px] font-extrabold">{row.labelHe}</span>
          <span className="font-mono tabular-nums text-[11px] text-muted">{row.yearFrom}–{row.yearTo}</span>
        </DragChip>
      ))}
    </div>
  )
}

const COLOUR_TARGETS = [
  { field: 'base', key: 'kit.base' },
  { field: 'patternInk', key: 'kit.secondary' },
  { field: 'sleeveInk', key: 'kit.sleeveInk' },
  { field: 'collarInk', key: 'kit.collarInk' },
] as const satisfies readonly { field: keyof KitSpec; key: MessageKey }[]

function ColourPanel({ spec, mutate, apply, axis }: { spec: KitSpec; mutate: (patch: Partial<KitSpec>) => void } & ChipProps) {
  // phone: which part to paint (one line), then the seven inks (one line); md up: four rows
  const [target, setTarget] = useState<(typeof COLOUR_TARGETS)[number]['field']>('base')
  return (
    <>
      <div className="flex h-full flex-col gap-1.5 md:hidden">
        <div className="flex shrink-0 gap-1 overflow-x-auto" role="group">
          {COLOUR_TARGETS.map((row) => (
            <button key={row.field} type="button" onClick={() => setTarget(row.field)} aria-pressed={target === row.field} className={`min-h-[40px] shrink-0 border-hair px-2.5 font-body text-[11px] font-extrabold ${target === row.field ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet text-ink'}`}>{t(row.key)}</button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
          {COLOURS.map((colour) => (
            <DragChip key={colour} run={() => mutate({ [target]: colour } as Partial<KitSpec>)} label={COLOUR_NAME[colour]} apply={apply} axis={axis} ariaLabel={COLOUR_NAME[colour]} pressed={spec[target] === colour} className={`h-full min-h-tap border-rule ${spec[target] === colour ? 'border-red' : 'border-ink/30'}`} style={{ background: COLOUR_VAR[colour] }} />
          ))}
        </div>
      </div>
      <div className="hidden space-y-3 md:block">
        {COLOUR_TARGETS.map((row) => (
          <ColourRow key={row.field} title={t(row.key)} value={spec[row.field]} onPick={(value) => mutate({ [row.field]: value } as Partial<KitSpec>)} apply={apply} axis={axis} />
        ))}
      </div>
    </>
  )
}

function ColourRow({ title, value, onPick, apply, axis }: { title: string; value: KitColour; onPick: (value: KitColour) => void } & ChipProps) {
  return (
    <div>
      <p className="mb-1 font-body text-[11px] font-extrabold">{title}</p>
      <div className="grid grid-cols-7 gap-1">
        {COLOURS.map((colour) => <DragChip key={colour} run={() => onPick(colour)} label={COLOUR_NAME[colour]} apply={apply} axis={axis} ariaLabel={COLOUR_NAME[colour]} pressed={value === colour} className={`aspect-square min-h-tap border-rule ${value === colour ? 'border-red' : 'border-ink/30'}`} style={{ background: COLOUR_VAR[colour] }} />)}
      </div>
    </div>
  )
}

function ShirtChoiceGrid({ items, selected, spec, patch, onPick, apply, axis }: { items: { id: string; label: string }[]; selected: string; spec: KitSpec; patch: (id: string) => Partial<KitSpec>; onPick: (id: string) => void } & ChipProps) {
  return (
    <div className={rail('md:grid-cols-3')}>
      {items.map((item) => (
        <DragChip key={item.id} run={() => onPick(item.id)} label={item.label} apply={apply} axis={axis} pressed={selected === item.id} className={`border-rule p-1 md:min-h-[128px] ${railItem} ${selected === item.id ? 'border-red bg-red/5' : 'border-ink/30'}`}>
          <KitEngineShirt spec={{ ...spec, ...patch(item.id) }} look="photo" marks="granted" className="mx-auto block h-[80px] w-full md:h-[94px]" />
          <span className="block truncate font-body text-[11px] font-bold">{item.label}</span>
        </DragChip>
      ))}
    </div>
  )
}

function MarkPanel({ kind, values, selected, seasonLabel, onPick, apply, axis }: { kind: 'maker' | 'sponsor'; values: Array<string | null>; selected: string | null; seasonLabel: string; onPick: (value: string | null) => void } & ChipProps) {
  return (
    <div className={rail('md:grid-cols-3')}>
      {values.map((value) => {
        const asset = kind === 'maker' ? makerAssetForName(value, seasonLabel) : sponsorAssetForName(value)
        return (
          <DragChip key={value ?? 'none'} run={() => onPick(value)} label={value ?? t('kits.spec.none')} apply={apply} axis={axis} pressed={selected === value} className={`flex flex-col items-center justify-center border-rule p-2 md:min-h-[82px] ${railItem} ${selected === value ? 'border-red bg-red/5' : 'border-ink/30'}`}>
            {asset ? <MarkArtwork asset={asset} className="h-10 w-[86%]" /> : <span className="font-body text-[11px] font-extrabold">{value ?? t('kits.spec.none')}</span>}
            <span className="mt-1 max-w-full truncate font-body text-[11px] text-muted">{value ?? t('kits.spec.none')}</span>
          </DragChip>
        )
      })}
    </div>
  )
}

function CrestPanel({ values, selected, onPick, apply, axis }: { values: string[]; selected: string | null; onPick: (value: string) => void } & ChipProps) {
  return (
    <div className={rail('md:grid-cols-4')}>
      {values.map((value) => {
        const src = crestArt(value, false)
        const mark = CREST_MARKS.find((row) => row.key === value)
        return (
          <DragChip key={value} run={() => onPick(value)} label={mark?.nameHe ?? value} apply={apply} axis={axis} pressed={selected === value} className={`border-rule p-2 md:min-h-[100px] ${railItem} ${selected === value ? 'border-red bg-red/5' : 'border-ink/30'}`}>
            {src ? <img src={src} alt="" className="mx-auto h-14 w-14 object-contain" /> : null}
            <span className="mt-1 block truncate font-body text-[11px] font-bold">{mark?.nameHe ?? value}</span>
          </DragChip>
        )
      })}
    </div>
  )
}

function NumberPanel({ spec, mutate, apply, axis }: { spec: KitSpec; mutate: (patch: Partial<KitSpec>) => void } & ChipProps) {
  return (
    <div className="flex h-full flex-col gap-1.5 md:block md:h-auto md:space-y-3">
      <div className="flex min-h-0 flex-1 gap-1 overflow-x-auto md:grid md:grid-cols-6 md:overflow-visible">
        {NUMBERS.map((number) => <DragChip key={number} run={() => mutate({ number })} label={String(number)} apply={apply} axis={axis} pressed={spec.number === number} className={`min-h-tap w-12 shrink-0 border-rule font-poster text-[20px] md:w-auto ${spec.number === number ? 'border-red bg-red text-paper' : 'border-ink/30'}`}>{number}</DragChip>)}
      </div>
      <div className="flex shrink-0 gap-1">
        {NAMESETS.map((row) => <DragChip key={row.id} run={() => mutate({ nameset: row.id })} label={row.he} apply={apply} axis={axis} pressed={spec.nameset === row.id} className={`min-h-tap flex-1 border-hair px-2 font-body text-[11px] font-bold ${spec.nameset === row.id ? 'border-ink bg-ink text-paper' : 'border-ink'}`}>{row.he}</DragChip>)}
      </div>
    </div>
  )
}
