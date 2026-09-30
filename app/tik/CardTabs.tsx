'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ShareRow } from '@/components/share/ShareRow'
import { readBook, type MemberBook as Book } from '@/lib/game/member'
import type { KitSpec } from '@/lib/kit/spec'
import { activityDays, cardStory, workerCard, type CardInputs } from '@/lib/profile/card'
import { emit } from '@/lib/profile/events'
import { readMarks, type Marks } from '@/lib/profile/marks'
import { activeIn, collected, emptyProfile, onIds, readProfile, totalCorrect, totalPlays, type Profile } from '@/lib/profile/store'
import { readDevice, type DeviceSummary } from '@/lib/profile/summary'
import { t } from '@/lib/i18n'

import { AccountPlate } from './AccountPlate'
import { cardExtras, type CardExtras } from './actions'
import { CardEditor } from './CardEditor'
import { draftBook, draftDirty, draftOf, patchOf, revengeOf, type CardDraft } from './cardView'
import { IssueBeat } from './IssueBeat'
import { MemberBook } from './MemberBook'
import { OathPanel } from './OathPanel'
import { SignUpPlate } from './SignUpPlate'
import { Standing } from './Standing'
import { StoryPanel } from './StoryPanel'
import { WorkerCard } from './WorkerCard'

/**
 * 'kept' (מה ששמרתי) moved out on 28.9.2026: it is now its own destination, התיק שלי at
 * `/tik/file` (ONE RED WORLD §24). An old `/tik#kept` link is sent there on arrival.
 */
export const TABS = ['card', 'oath', 'story', 'details'] as const
export type TabId = (typeof TABS)[number]

const TAB_LABEL: Readonly<Record<TabId, { he: Parameters<typeof t>[0]; latin: string }>> = {
  card: { he: 'tik.tab.card', latin: 'CARD' },
  oath: { he: 'tik.tab.oath', latin: 'OATH' },
  story: { he: 'tik.tab.story', latin: 'STORY' },
  details: { he: 'tik.tab.details', latin: 'DETAILS' },
}

/**
 * Until the device is read, the card prints as a blank one — which is exactly what an
 * unissued membership card looks like — and the server and the first client render agree
 * on every character of it. The TIK is a row of dashes rather than a minted number,
 * because minting one is a storage write and belongs to `readBook()` after mount.
 */
const BLANK_BOOK: Book = { tik: 'TIK-————', nameHe: '', number: 17, since: 0, punches: [], corrections: [] }

const NO_DEVICE: DeviceSummary = { kits: 0, kitKeys: [], designs: 0, xi: 0, ballot: 0, life: null }

/**
 * שער 10 — כרטיס הפועל: the identity layer over every gate (brief §20, identity spec §5
 * phase 7).
 *
 * One screen, one derivation. The device is read once after mount — the profile, the
 * member book, the stores the profile predates, gate 2's Revenge ledger — and everything
 * on the page is `workerCard()` over it: the card at the top, the wall, the oath, the
 * story, the share card. The editor holds a DRAFT, and the card above it draws the draft
 * live (marked as a draft until it is saved), so the preview and the thing it previews
 * can never be two layouts that drift.
 *
 * What the device cannot name — the archive items, the shelf, the routes, the favourite
 * player, the first match, the strongest trivia topic — comes back from ONE server action
 * (`cardExtras`) with the ids the device holds. Nothing the person typed goes with it.
 *
 * Anonymous play is the whole product: every tab works without an account, and the
 * card is issued on its first save whether or not anybody ever signs in. `AccountPlate`,
 * under the details, is the natural "keep it" — Google, the only auth there is.
 */
export function CardTabs({ shirt, kitsTotal }: { shirt: KitSpec; kitsTotal: number }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [book, setBook] = useState<Book | null>(null)
  const [device, setDevice] = useState<DeviceSummary>(NO_DEVICE)
  const [marks, setMarks] = useState<Marks>({})
  const [draft, setDraft] = useState<CardDraft | null>(null)
  const [extras, setExtras] = useState<CardExtras | null>(null)
  const [matchNames, setMatchNames] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<TabId>('card')
  const [issuing, setIssuing] = useState(false)
  const [fresh, setFresh] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({})

  useEffect(() => {
    const read = readBook()
    const nextProfile = readProfile()
    const nextMarks = readMarks()
    setBook(read)
    setDraft(draftOf(read))
    setProfile(nextProfile)
    setDevice(readDevice())
    setMarks(nextMarks)
    const fromHash = () => {
      if (window.location.hash === '#kept') {
        window.location.replace('/tik/file')
        return
      }
      const id = window.location.hash.replace('#', '') as TabId
      if (TABS.includes(id)) setTab(id)
    }
    fromHash()
    // A link to `/tik#oath` from elsewhere on the page (or the back button) opens that tab.
    window.addEventListener('hashchange', fromHash)
    setReady(true)

    // One round trip for the names the device cannot know. Ids only — never a typed word.
    const survivor = nextProfile.latest['derby.wall']?.v ?? ''
    const survivorId = survivor.includes(':') ? survivor.slice(survivor.indexOf(':') + 1) : ''
    const firstMatch = read.card?.first && 'matchId' in read.card.first ? read.card.first.matchId : ''
    let live = true
    cardExtras({
      saved: onIds('archive.mine', nextProfile),
      seen: activeIn(nextProfile, 'archive'),
      reactions: onIds('archive.react', nextProfile),
      shelf: collected(nextProfile, 'memory'),
      goals: [...new Set([...collected(nextProfile, 'goal'), ...collected(nextProfile, 'goal.rebuilt')])],
      routes: collected(nextProfile, 'thread.routes'),
      people: [read.supporter?.favouriteId ?? '', survivorId, firstMatch].filter((id) => id !== ''),
      marks: Object.entries(nextMarks).map(([id, mark]) => [id, mark.r, mark.w] as [string, number, number]),
    })
      .then((answer) => {
        if (live) setExtras(answer)
      })
      .catch(() => {
        // The card prints what the device knows; names simply stay unresolved.
      })
    return () => {
      live = false
      window.removeEventListener('hashchange', fromHash)
    }
  }, [])

  const names = useMemo(() => ({ ...(extras?.names ?? {}), ...matchNames }), [extras, matchNames])
  const saved = book ?? BLANK_BOOK
  const shown = book && draft ? draftBook(book, draft) : saved
  const dirty = book !== null && draft !== null && draftDirty(book, draft)
  const issued = (book?.card?.issuedOn ?? '') !== ''
  const days = activityDays(profile, book)

  const base: Omit<CardInputs, 'book'> = {
    profile,
    device,
    kitsTotal,
    revenge: ready ? revengeOf(marks) : null,
    favouriteHe: book?.supporter?.favouriteId ? names[book.supporter.favouriteId] ?? null : null,
    bestTopic: extras?.bestTopic ?? null,
  }
  const state = workerCard({ ...base, book: shown })
  const savedState = workerCard({ ...base, book: saved })

  const choose = useCallback((next: TabId, focus = false) => {
    setTab(next)
    try {
      window.history.replaceState(null, '', `#${next}`)
    } catch {
      // a sandboxed frame may refuse; the tab still changes
    }
    if (focus) tabRefs.current[next]?.focus()
  }, [])

  function openEditor() {
    choose('details')
    window.setTimeout(() => {
      document.getElementById('card-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('card-name')?.focus({ preventScroll: true })
    }, 60)
  }

  function save() {
    if (!book || !draft) return
    const firstIssue = (book.card?.issuedOn ?? '') === ''
    emit({ type: 'card_edited', patch: patchOf(draft) })
    const next = readBook()
    setBook(next)
    setDraft(draftOf(next))
    setProfile(readProfile())
    setSavedNote(true)
    if (firstIssue && (next.card?.issuedOn ?? '') !== '') setIssuing(true)
  }

  function afterIssue() {
    setIssuing(false)
    setFresh(true)
    choose('card')
    window.setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  function onTabKey(event: React.KeyboardEvent<HTMLButtonElement>, id: TabId) {
    const index = TABS.indexOf(id)
    // RTL: the next tab sits to the LEFT, so ArrowLeft moves forward.
    const step = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0
    if (step !== 0) {
      event.preventDefault()
      choose(TABS[(index + step + TABS.length) % TABS.length] as TabId, true)
    } else if (event.key === 'Home') {
      event.preventDefault()
      choose(TABS[0], true)
    } else if (event.key === 'End') {
      event.preventDefault()
      choose(TABS[TABS.length - 1] as TabId, true)
    }
  }

  const figures = {
    correct: totalCorrect(profile),
    plays: totalPlays(profile),
    days: savedState.days,
    streak: savedState.streak,
    gates: savedState.gates.lit,
  }
  const kitKeys = [...new Set([...device.kitKeys, ...collected(profile, 'kits')])].sort()
  const kept = collected(profile, 'ussishkin').length + device.ballot + device.xi + activeIn(profile, 'archive').length + kitKeys.length

  return (
    <div className="mt-stack lg:grid lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* ------------------------------------------------------------ the card column */}
      <div ref={cardRef} className="scroll-mt-4 lg:sticky lg:top-4">
        <WorkerCard state={state} names={names} draft={dirty} fresh={fresh} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {tab !== 'details' && (
            <button
              type="button"
              onClick={openEditor}
              className={`min-h-tap flex-1 border-rule border-ink px-4 font-body text-step--1 font-extrabold transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none ${
                issued ? 'bg-sheet text-ink' : 'bg-red text-paper'
              }`}
            >
              {issued ? t('tik.card.edit') : t('tik.card.issue')}
            </button>
          )}
          {!issued && (
            <p className="w-full font-body text-[11.5px] leading-snug text-muted">{t('tik.card.anonNote')}</p>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- tabs and panels */}
      <div className="mt-stack min-w-0 lg:mt-0">
        <div
          role="tablist"
          aria-label={t('tik.tab.label')}
          className="grid grid-cols-4 border-b-rule border-ink"
        >
          {TABS.map((id) => {
            const on = tab === id
            return (
              <button
                key={id}
                ref={(node) => {
                  tabRefs.current[id] = node
                }}
                type="button"
                role="tab"
                id={`tik-tab-${id}`}
                aria-controls={on ? `tik-panel-${id}` : undefined}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(id)}
                onKeyDown={(event) => onTabKey(event, id)}
                className={`flex min-h-tap min-w-0 flex-col items-center justify-start border-t-plate px-0.5 pb-1.5 pt-1 text-center ${
                  on ? 'border-red bg-ink text-paper' : 'border-transparent text-ink'
                }`}
              >
                <span dir="ltr" className={`font-latin text-[8px] font-bold tracking-[0.2em] ${on ? 'text-red' : 'text-muted'}`}>
                  {TAB_LABEL[id].latin}
                </span>
                <span className="font-body text-[12.5px] font-extrabold leading-[1.15] sm:text-[13.5px]">{t(TAB_LABEL[id].he)}</span>
              </button>
            )
          })}
        </div>

        <div role="tabpanel" id={`tik-panel-${tab}`} aria-labelledby={`tik-tab-${tab}`} tabIndex={-1} className="mt-4 outline-none">
          {tab === 'card' && (
            <>
              <Standing profile={profile} state={savedState} names={names} days={days} />
              {ready && (
                <div className="mt-stack">
                  <ShareRow
                    kind="member"
                    params={{}}
                    headline={t('tik.card.shareHeadline', {
                      lit: String(savedState.gates.lit),
                      of: String(savedState.gates.of),
                    })}
                    card={cardStory(savedState, shirt)}
                  />
                </div>
              )}
            </>
          )}
          {tab === 'oath' && <OathPanel state={state} names={names} onEdit={openEditor} />}
          {tab === 'story' && <StoryPanel state={state} names={names} onEdit={openEditor} />}
          {tab === 'details' && draft !== null && (
            <>
              <CardEditor
                draft={draft}
                onChange={(next) => {
                  setDraft(next)
                  setSavedNote(false)
                }}
                onSave={save}
                onReset={() => book && setDraft(draftOf(book))}
                dirty={dirty}
                issued={issued}
                names={names}
                onMatchName={(id, name) => setMatchNames((prior) => ({ ...prior, [id]: name }))}
                savedNote={savedNote}
              />
              <AccountPlate />
              <SignUpPlate figures={figures} collections={kept} />
              <MemberBook book={book} />
            </>
          )}
        </div>
      </div>

      {issuing && <IssueBeat state={savedState} onDone={afterIssue} />}
    </div>
  )
}
