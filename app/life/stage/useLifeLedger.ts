'use client'

import { type MutableRefObject } from 'react'

import { t } from '@/lib/i18n'
import { bookPageFlag } from '@/lib/life/books'
import type { loadLife } from '@/lib/life/engine'
import { PITCH_SETTLEMENT, pitchResult } from '@/lib/life/football/door'
import { GIGS } from '@/lib/life/gigs'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { onSale, ownedShirts, SHIRT_FIRST_HE, SHIRT_MORE_HE, type Shirt } from '@/lib/life/shirts'
import { stickerFlag, tornFlag } from '@/lib/life/stickers'
import { alreadySettled, settleActivity, type MechanicRequest, type Settlement } from '@/lib/life/activities'
import { COIN_WHY_HE, HOOPS_WHY_HE, PENALTY_WHY_HE } from '@/lib/life/toto'
import { NOTE_BOARDS } from '@/lib/life/content/noteBoards'
import { settleWith } from '@/lib/life/noteBoards'
import type { ActivityResult } from '@/lib/mechanics/types'
import type { LifeState } from '@/lib/life/types'

/**
 * הפנקס — the handful of places where the SHELL writes into the life.
 *
 * Almost nothing in this game does that. The rule the whole architecture rests on is that
 * the world owns the log: a scene decides what happened, the engine records it, the bus
 * tells React, and React draws a sentence. React proposes nothing. But there are eight
 * screens that break the rule on purpose, because the thing that happens on them happens in
 * the DOM and nowhere else — the Toto slip, the coin in the alley, the penalty run, the free
 * throws, the shop till, the sticker somebody tears out, and the page a booklet is left
 * open on. (The clock somebody chose to skip was the eighth; since delta 90 the world
 * skips its own clock.) There is no scene under any of them to know.
 *
 * Those eight were written inline, inside the JSX, in eight different `onDone` closures, and
 * that is exactly where a game grows a second economy. A price typed into a card is a price
 * nobody can grep for; a `clock.advanced` buried in a render tree is a rule nobody can audit.
 * Gathering them here does not change one agora — it makes the list of ways the shell can
 * spend the child's afternoon a list you can read in one screen.
 *
 * The seam is drawn at the dispatch, not at the overlay. Every function below writes to the
 * engine and saves, and hands back whatever the caller needs to re-render or announce; the
 * `setState` that closes the card and the `pause(false)` that starts the world again stay in
 * `LifeStage`, where the overlay lives. Nothing here touches React state, and nothing here
 * knows what is on screen.
 *
 * Deliberately NOT `useCallback`: these are recreated every render exactly as the inline
 * closures they replace were, so no card can accidentally start depending on the identity of
 * a handler that used to change on every line of dialogue.
 */
export function useLifeLedger({
  engineRef,
}: {
  engineRef: MutableRefObject<Awaited<ReturnType<typeof loadLife>> | null>
}) {
  return {
    /**
     * הפתק, מקופל — what the note says, asked BEFORE anything is written (the sheet prints it
     * on the folded note), and then the same placements settled into the life. Two calls on
     * the same paused state give the same sentence and the same events.
     */
    previewBoard(id: string, placed: Record<string, string>): string {
      const engine = engineRef.current
      const def = NOTE_BOARDS[id]
      if (!engine || !def) return ''
      return settleWith(def, placed, engine.state).verdictHe
    },
    settleBoard(id: string, placed: Record<string, string>): string | null {
      const engine = engineRef.current
      const def = NOTE_BOARDS[id]
      if (!engine || !def) return null
      const outcome = settleWith(def, placed, engine.state)
      engine.dispatch(...outcome.events)
      void engine.save()
      return outcome.after ?? null
    },

    /** the booklet remembers the page it was put down on, in the save and not in the browser */
    writeBookPage(id: string, page: number) {
      const engine = engineRef.current
      if (!engine) return
      engine.dispatch({ t: 'flag.set', flag: bookPageFlag(id), value: page })
      void engine.save()
    },

    /**
     * הקנייה — money out, a flag raised, and the card the world is stopped for.
     *
     * The card is composed here and RETURNED rather than emitted, so the caller keeps the
     * order it has always had: the shop's own state refreshes first, then the shirt card
     * goes up over it.
     */
    buyShirt(shirt: Shirt, chapter: string): { state: LifeState; card: NonNullable<LifeBusEvents['shirt']> } | null {
      const engine = engineRef.current
      if (!engine) return null
      engine.dispatch(
        { t: 'money.changed', agorot: -shirt.price * 100, why: shirt.nameHe },
        { t: 'flag.raised', flag: `own:shirt:${shirt.id}` },
      )
      void engine.save()
      return {
        state: engine.state,
        // the card that stops the world — the same one a shirt has always got
        card: {
          kind: 'bought' as const,
          art: shirt.art,
          titleHe: ownedShirts(engine.state).length > 1 ? SHIRT_MORE_HE : SHIRT_FIRST_HE,
          nameHe: shirt.nameHe,
          sponsorHe: shirt.sponsorHe,
          yearsHe: shirt.yearsHe,
          noteHe: shirt.noteHe,
          have: ownedShirts(engine.state).length,
          total: onSale(chapter).length,
          spec: shirt.spec ?? null,
          seasonHe: shirt.seasonLabel ?? null,
          sourceHe: shirt.sourceHe ?? null,
        },
      }
    },

    /**
     * קורע — the one destructive thing the album can do, and it is the player's to do.
     * The sticker leaves the album and the slot keeps the decision.
     */
    tearSticker(id: string, nameHe: string): { state: LifeState; toast: NonNullable<LifeBusEvents['toast']> } | null {
      const engine = engineRef.current
      if (!engine) return null
      engine.dispatch({ t: 'flag.set', flag: stickerFlag(id), value: 0 })
      engine.dispatch({ t: 'flag.raised', flag: tornFlag(id) })
      void engine.save()
      return { state: engine.state, toast: { text: t('life.album.tore', { name: nameHe }), tone: 'red' } }
    },

    /*
     * (delta 90) the shell’s own time skip lived here: the one place the shell moved the clock by itself,
     * three minutes short of a beat wherever the boy stood. It is gone — free time is asked
     * of the world (`runtime.advanceTime(planId)`, `world/timeAdvance.ts`) and the world
     * moves itself (SMART FREE TIME §18). What remains below is what an ACTIVITY cost.
     */

    /**
     * the slip: settled as the kiosk's trivia activity (`activities.ts` 'kiosk-trivia').
     *
     * In the 1984–86 chapters that is exactly what it always was — two shekels a right
     * answer and twenty minutes, handed in whenever it is handed in (owner, 21.9.2026:
     * the tested economy does not move). From 1990 the same slip pays a share of B, one
     * hour of that decade's wage, so a right answer is not worth less every year.
     */
    settleToto({ hits, asked }: { hits: number; asked: number }): Settlement | null {
      const engine = engineRef.current
      if (!engine) return null
      const settled = settleActivity(engine.state, 'kiosk-trivia', {
        completed: true,
        score: asked > 0 ? hits / asked : 0,
      })
      engine.dispatch(...settled.events)
      void engine.save()
      return settled
    },

    /**
     * פעילות — a gate game played inside the life, settled by the life's own rules
     * (`settleActivity`: the range of B, the slot, the once-a-chapter rewards). The room's
     * reaction and the pause are the caller's, like every other card here.
     */
    settleActivity(request: MechanicRequest, result: ActivityResult): Settlement | null {
      const engine = engineRef.current
      if (!engine) return null
      // settled once, whatever the board does twice (§22.7) — `runs` has already moved past it
      if (alreadySettled(engine.state, request)) return null
      const settled = settleActivity(engine.state, request.activity, {
        ...result,
        contentId: result.contentId ?? request.contentId,
      })
      engine.dispatch(...settled.events)
      void engine.save()
      return settled
    },

    /** whether the child has the stake in his pocket at all — the alley never takes credit */
    canAfford(stake: number) {
      return (engineRef.current?.state.agorot ?? 0) >= stake * 100
    },

    /** the coin: a net swing either way, and ten minutes gone regardless */
    settleCoin(coin: NonNullable<LifeBusEvents['coin']>, { played, won }: { played: boolean; won: boolean }) {
      if (!played) return
      const net = won ? coin.prize - coin.stake : -coin.stake
      engineRef.current?.dispatch(
        { t: 'money.changed', agorot: net * 100, why: COIN_WHY_HE },
        { t: 'clock.advanced', minutes: 10 },
        { t: 'flag.raised', flag: 'gig:coin' },
      )
      void engineRef.current?.save()
    },

    /**
     * The two contests are rows in `GIGS` like any other, and their price is read off that
     * table rather than typed here: the minutes, the energy and the trait a boy picks up
     * for standing in a queue to take penalties all belong to the same table every job in
     * this life is priced from. The fallbacks are the numbers that table shipped with.
     *
     * **והשורה הכספית נכתבת רק אם עבר כסף** (17.9.2026). `earned` is zero by construction —
     * the conversation passes `perGoal: 0`, because *"זריקה לסל ובעיטת פנדלים לא צריכים
     * להיות רווח כספי"* — and a `money.changed` of nought is a no-op in the reducer and a
     * ROW in the append-only log, which is the save. A row that says "פנדלים" under a
     * ledger of wages is the game telling a player's own history that he was paid for
     * playing. The guard costs one comparison and the name stays here, so the day somebody
     * decides a contest pays, the line it would be written under is already the right one.
     */
    settlePenalty({ played, earned }: { played: boolean; earned: number }) {
      if (!played) return
      const gig = GIGS.find((row) => row.id === 'penalty-contest')
      if (earned > 0) {
        engineRef.current?.dispatch({ t: 'money.changed', agorot: earned * 100, why: PENALTY_WHY_HE })
      }
      engineRef.current?.dispatch(
        { t: 'clock.advanced', minutes: gig?.minutes ?? 25 },
        { t: 'energy.changed', delta: -(gig?.energy ?? 10) },
        { t: 'flag.raised', flag: 'gig:penalty-contest' },
      )
      if (gig?.trait) engineRef.current?.dispatch({ t: 'personality.shifted', key: gig.trait.key, delta: gig.trait.delta })
      void engineRef.current?.save()
    },

    /**
     * המגרש — the afternoon the street match cost, and the one point winning as them is worth.
     *
     * The numbers come from `lib/life/football/door.ts`, not from here: the door owns what
     * the match costs, the same way `GIGS` owns what a job costs. `loveOnWin` is one point
     * and only for winning, on purpose — `אהבה להפועל` measures a life, and a kickabout that
     * paid what Bloomfield pays would cheapen both. Losing costs nothing at all; this game
     * does not fine a boy for losing a game.
     *
     * **ומה שלא נכתב כאן, בשום ענף: כסף, ו-`work:paid:<chapter>`.** מאור, 17.9.2026:
     * *"זוהי לא עבודה. זה משחק העברת זמן."* The four events below are thirty minutes,
     * twelve energy, a courage point and — only on a win — one point of football love.
     * Nothing here is a wage: the first two are what an afternoon costs, and the last two
     * are what it does to the boy who spent it. The chapter's one paid job is untouched, so
     * he can carry crates for Rafi this morning and still say "אני הפועל" this afternoon,
     * in either order, on the same Saturday.
     */
    settlePitch({ played, score }: { played: boolean; score: { home: number; away: number } }) {
      if (!played) return
      engineRef.current?.dispatch(
        { t: 'clock.advanced', minutes: PITCH_SETTLEMENT.minutes },
        { t: 'energy.changed', delta: -PITCH_SETTLEMENT.energy },
        { t: 'flag.raised', flag: PITCH_SETTLEMENT.flag },
        { t: 'personality.shifted', key: PITCH_SETTLEMENT.trait.key, delta: PITCH_SETTLEMENT.trait.delta },
        /**
         * התוצאה, כעובדה של היום (21.9.2026). עד היום המגרש החזיר רק "שיחק" — ולכן שום
         * סצנה לא יכלה לדעת אם ניצחו. `Y05` (חלון TOURNAMENT) צריך את זה: ניצחון מביא
         * גביע, כל תוצאה אחרת — תמונה. דגל יום (`pitch:`), ולכן הוא לא עובר לשנה הבאה.
         */
        { t: 'flag.set', flag: PITCH_SETTLEMENT.resultFlag, value: pitchResult(score) },
      )
      if (score.home > score.away) {
        engineRef.current?.dispatch({
          t: 'redheart.changed',
          key: 'footballLove',
          delta: PITCH_SETTLEMENT.loveOnWin,
        })
      }
      void engineRef.current?.save()
    },

    /** the same guard, for the same reason — see `settlePenalty` above */
    settleHoops({ played, earned }: { played: boolean; earned: number }) {
      if (!played) return
      const gig = GIGS.find((row) => row.id === 'hoops-contest')
      if (earned > 0) {
        engineRef.current?.dispatch({ t: 'money.changed', agorot: earned * 100, why: HOOPS_WHY_HE })
      }
      engineRef.current?.dispatch(
        { t: 'clock.advanced', minutes: gig?.minutes ?? 20 },
        { t: 'energy.changed', delta: -(gig?.energy ?? 8) },
        { t: 'flag.raised', flag: 'gig:hoops-contest' },
      )
      if (gig?.trait) engineRef.current?.dispatch({ t: 'personality.shifted', key: gig.trait.key, delta: gig.trait.delta })
      void engineRef.current?.save()
    },
  }
}
