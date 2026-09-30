'use client'

import { useCallback, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import { checklistFor, type ChecklistItem } from '@/lib/life/checklist'
import { OFFER_KIND_HE, capHe, offerLineHe, offersNow, startable } from '@/lib/life/offers'
import type { HelpOffer } from '@/components/life/HelpSheet'
import { eraFor } from '@/lib/life/content/era'
import type { LifeAudio } from '@/lib/life/runtime/audio'
import type { LifeRuntime, LifeSnapshot, MapPlace } from '@/lib/life/runtime/game'
import { lifeStore } from '@/lib/life/save'
import type { LifeState } from '@/lib/life/types'
import { actionsNow } from '@/lib/life/world/actions'

/**
 * הדפים שהשחקן פותח — every screen the PLAYER opens, as opposed to every screen the game
 * raises in front of him.
 *
 * That is the whole reason this seam is where it is, and it is not a filing decision. The
 * overlays that arrive on the bus — a shirt card, a film, a coda, a stamp — are things that
 * happened; the child has no say in them and neither does React. The five below are the
 * opposite: the profile, the meters, the help sheet, the menu and the map are opened by a
 * thumb on a chip in the corner, and the game learns about it afterwards. Nothing on the bus
 * ever raises one.
 *
 * They share one choreography:
 *
 *   · the world PAUSES. Reading about yourself may not cost you the afternoon.
 *   · what they draw is a SNAPSHOT, taken at the moment they open, never a subscription.
 *   · they open with `ui-open` and close with `ui-close`.
 *
 * `mapState` is the one thing here it does NOT own: the reveal moment raises the same map
 * from the bus, so the state that both draw from lives with the bus and the setter is handed
 * in. One canonical copy of the world's snapshot, whoever asked for it.
 */
export function useLifeSheets({
  runtime,
  audio,
  setMapState,
}: {
  runtime: MutableRefObject<LifeRuntime | null>
  audio: MutableRefObject<LifeAudio | null>
  /** owned by `useLifeRuntime`, because `reveal` on the bus draws the same map */
  setMapState: Dispatch<SetStateAction<LifeState | null>>
}) {
  /** the profile — snapshot at open time, never a live React copy of the life */
  const [snapshot, setSnapshot] = useState<LifeSnapshot | null>(null)
  const [debug, setDebug] = useState(false)

  /**
   * אני · התיק שלי (delta 90-H) — two destinations over ONE snapshot. `view` says which
   * half of the dossier is open; turning to the other half keeps the snapshot (and the
   * world paused) rather than re-reading the life. Never written to the save.
   */
  const [view, setView] = useState<'me' | 'bag'>('bag')

  const openProfile = useCallback((withDebug: boolean, which: 'me' | 'bag' = 'bag') => {
    const current = runtime.current
    if (!current) return
    current.pause(true)
    setSnapshot(current.snapshot())
    setDebug(withDebug)
    setView(which)
    audio.current?.play('ui-open', { bus: 'ui', level: 0.5 })
  }, [audio, runtime])

  const openMe = useCallback(() => openProfile(false, 'me'), [openProfile])
  const openBag = useCallback(() => openProfile(false, 'bag'), [openProfile])

  const closeProfile = useCallback(() => {
    setSnapshot(null)
    setDebug(false)
    runtime.current?.pause(false)
    audio.current?.play('ui-close', { bus: 'ui', level: 0.45 })
  }, [audio, runtime])

  const [gauges, setGauges] = useState<LifeState | null>(null)

  const openGauges = useCallback(() => {
    const current = runtime.current
    if (!current) return
    current.pause(true)
    setGauges(current.snapshot().state)
    audio.current?.play('ui-open', { bus: 'ui', level: 0.5 })
    audio.current?.play('heart', { bus: 'ui', level: 0.5, delayMs: 80 })
  }, [audio, runtime])

  const closeGauges = useCallback(() => {
    setGauges(null)
    runtime.current?.pause(false)
    audio.current?.play('ui-close', { bus: 'ui', level: 0.45 })
  }, [audio, runtime])

  const [help, setHelp] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [offers, setOffers] = useState<HelpOffer[]>([])
  const [cap, setCap] = useState<string | null>(null)

  /**
   * מה עכשיו — the existing help sheet is also the one place where optional life can be
   * explicit without turning the glass into a quest HUD.
   *
   * `checklistFor` remains the authored spine. `actionsNow` contributes only non-story
   * actions the world has ALREADY made available: a timed opportunity or a route
   * invitation. They stay visually secondary through a neutral continuation marker rather
   * than a second hard-coded UI sentence, so the choice is visible and the catalogue rule
   * remains intact.
   */
  const openHelp = useCallback(() => {
    const current = runtime.current
    current?.pause(true)
    const state = current?.snapshot().state
    if (state) {
      const story = checklistFor(state)
      const optional: ChecklistItem[] = actionsNow(state, eraFor(state.chapter))
        .filter((action) => action.kind !== 'story')
        .map((action) => ({
          id: `optional:${action.id}`,
          textHe: `↳ ${action.titleHe}`,
          done: false,
        }))
      setChecklist([...story, ...optional])
      // אפשר עכשיו — today's offers, read off the rooms of this chapter (`lib/life/offers.ts`)
      setOffers(
        offersNow(state)
          .filter(startable)
          .map((offer) => ({ id: offer.id, kind: offer.kind, kindHe: OFFER_KIND_HE[offer.kind], lineHe: offerLineHe(offer, { kind: false }), here: offer.here })),
      )
      setCap(capHe(state))
    } else {
      setChecklist([])
      setOffers([])
      setCap(null)
    }
    setHelp(true)
    audio.current?.play('ui-open', { bus: 'ui', level: 0.5 })
  }, [audio, runtime])

  const closeHelp = useCallback(() => {
    setHelp(false)
    runtime.current?.pause(false)
    audio.current?.play('ui-close', { bus: 'ui', level: 0.45 })
  }, [audio, runtime])

  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDay, setConfirmDay] = useState(false)
  const [menu, setMenu] = useState(false)

  const openMenu = useCallback(() => {
    runtime.current?.pause(true)
    setConfirmReset(false)
    setConfirmDay(false)
    setMenu(true)
    audio.current?.play('ui-open', { bus: 'ui', level: 0.5 })
  }, [audio, runtime])

  const closeMenu = useCallback(() => {
    setMenu(false)
    setConfirmReset(false)
    setConfirmDay(false)
    runtime.current?.pause(false)
    audio.current?.play('ui-close', { bus: 'ui', level: 0.45 })
  }, [audio, runtime])

  const reset = useCallback(() => {
    void (async () => {
      await lifeStore.clear()
      window.location.reload()
    })()
  }, [])

  /**
   * היום מחדש — the log is cut, then the page reloads so every scene, timer and texture
   * starts from the cut log rather than from whatever was on screen. Reload is the honest
   * restart; a scene restart over a rewritten engine is a second save system in disguise.
   */
  const restartDay = useCallback(() => {
    const current = runtime.current
    if (!current) return
    if (current.restartDay()) window.location.reload()
    else setConfirmDay(false)
  }, [runtime])

  /** the map sheet: a snapshot of the places, taken when it opens, like the profile */
  const [places, setPlaces] = useState<MapPlace[] | null>(null)

  const openMap = useCallback(() => {
    const current = runtime.current
    if (!current) return
    current.pause(true)
    setMapState(current.snapshot().state)
    setPlaces(current.places())
    audio.current?.play('ui-open', { bus: 'ui', level: 0.5 })
    audio.current?.play('page', { bus: 'ui', level: 0.5, delayMs: 90 })
  }, [audio, runtime, setMapState])

  const closeMap = useCallback(() => {
    setPlaces(null)
    runtime.current?.pause(false)
    audio.current?.play('ui-close', { bus: 'ui', level: 0.45 })
  }, [audio, runtime])

  const goTo = useCallback((id: string) => {
    const current = runtime.current
    if (!current) return
    setPlaces(null)
    if (!current.goTo(id)) current.pause(false)
  }, [runtime])

  return {
    snapshot,
    debug,
    openProfile,
    openMe,
    openBag,
    view,
    setView,
    closeProfile,
    gauges,
    openGauges,
    closeGauges,
    help,
    checklist,
    offers,
    cap,
    openHelp,
    closeHelp,
    menu,
    setMenu,
    openMenu,
    closeMenu,
    confirmReset,
    setConfirmReset,
    reset,
    confirmDay,
    setConfirmDay,
    restartDay,
    places,
    setPlaces,
    openMap,
    closeMap,
    goTo,
  }
}