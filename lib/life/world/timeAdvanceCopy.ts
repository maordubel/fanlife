import { t, type MessageKey } from '../../i18n'
import { timeLabel } from '../clock'
import type { LifeState } from '../types'
import type { FreeTimeAction, TimeAdvancePlan } from './timeAdvance'

/**
 * איך הזמן נשמע — the same plan, said by a boy of eight, a boy of fifteen, a soldier and a
 * man (SMART FREE TIME §39). The engine is one; the sentence grows up with Pugi.
 *
 * Everything the planner prints comes through here, so the card can never show a number
 * the plan does not hold (§38: now, leave, the event, and an activity's length — nothing
 * else) and never names an event the player has not been told about (§24).
 */

export type Voice = 'child' | 'teen' | 'soldier' | 'adult'

export function voiceOf(state: LifeState): Voice {
  const age = state.year - state.identity.birthYear
  if (age < 12) return 'child'
  if (age < 18) return 'teen'
  if (age < 22) return 'soldier'
  return 'adult'
}

/** minutes as a person says them — "חצי שעה", not "30 דקות" */
export function durationHe(minutes: number): string {
  const n = Math.max(0, Math.round(minutes))
  if (n <= 1) return t('life90f.dur.one')
  const near = (target: number, slack: number) => Math.abs(n - target) <= slack
  if (near(15, 1)) return t('life90f.dur.quarter')
  if (near(30, 2)) return t('life90f.dur.half')
  if (near(45, 2)) return t('life90f.dur.threeQ')
  if (near(60, 3)) return t('life90f.dur.hour')
  if (near(90, 4)) return t('life90f.dur.hourHalf')
  if (n >= 110 && n % 60 <= 5) return t('life90f.dur.hours', { n: String(Math.round(n / 60)) })
  if (n >= 100) return t('life90f.dur.aboutHours', { n: String(Math.round(n / 60)) })
  return t('life90f.dur.min', { n: String(n) })
}

/** "אולם אוסישקין — מבחוץ" → "לאולם אוסישקין"; "הרחוב" → "לרחוב" */
export function toPlaceHe(placeHe: string): string {
  const name = placeHe.split(' — ')[0]?.trim() || placeHe
  if (name.startsWith('ה') && name.length > 2) return `ל${name.slice(1)}`
  return /^[֐-׿]/.test(name) ? `ל${name}` : `ל־${name}`
}

export type PlannerCopy = {
  /** the one line on the chip */
  chipHe: string
  /** WHY there is free time — what comes next, and when (§23) */
  whyHe: string
  /** where he stands relative to it — "אתה כבר בבית." — or null */
  whereHe: string | null
  /** how much time, in his voice */
  freeHe: string
  /** the route sentence ("כדאי לצאת ב־17:39…"), when there is a walk */
  routeHe: string | null
  /** why the main CTA cannot run, when it cannot */
  blockedHe: string | null
  /** the three points of the timeline (§6) — `leave` is null when nothing needs a walk */
  timeline: { now: string; leave: string | null; event: string; eventLabelHe: string; leaveLabelHe: string }
  /** the main world-action (§3, §22) */
  ctaHe: string
  /** under the CTA: the walk, or the event */
  ctaSubHe: string | null
  /** "go now" instead of on time — only when there is a real walk and time to spare */
  earlyHe: string | null
  /** the lapse / end-of-day choice, in words, when the event happens only if he lets it */
  letPassHe: string | null
  letPassSubHe: string | null
}

/** a walk shorter than this is the stairs, not a journey — no route sentence, no "go early" */
const SHORT_WALK = 5

const BLOCKED: Record<string, MessageKey> = {
  route: 'life90f.impossible',
  guided: 'life90f.guided',
  'no-auto': 'life90f.noAuto',
  'on-the-way': 'life90f.onTheWay',
  'too-late': 'life90f.tooLate',
}

export function plannerCopy(plan: TimeAdvancePlan, state: LifeState): PlannerCopy {
  const voice = voiceOf(state)
  const known = plan.knownToPlayer
  const eventTime = timeLabel(plan.eventMinute)
  const moving = !plan.alreadyThere && plan.targetLocation !== null
  // a walk inside the flat is not "leaving" — it is waiting at home (§35 A)
  const stays = !moving || plan.atHome
  const place = plan.targetHe ? toPlaceHe(plan.targetHe) : ''

  const whyHe = !known
    ? t('life90f.unknown')
    : plan.waitingHe && plan.waitingHe.trim().endsWith('.') && !plan.waitingHe.startsWith('ממתין')
      ? plan.waitingHe
      : t('life90f.why', { event: plan.eventHe ?? t('life90f.next'), time: eventTime })

  const whereHe = !known ? null : !moving ? (plan.targetLocation ? t('life90f.there') : null) : plan.atHome ? t('life90f.home') : null

  const waitMinutes = stays ? plan.plannedArrivalMinute - plan.fromMinute : plan.freeMinutes
  const freeHe = !known
    ? t('life90f.unknownNext', { time: eventTime })
    : plan.late
      ? t('life90f.late')
      : stays
        ? t(`life90f.wait.${voice}` as MessageKey, { dur: durationHe(waitMinutes) })
        : t(`life90f.free.${voice}` as MessageKey, { dur: durationHe(plan.freeMinutes) })

  const routeHe =
    moving && !plan.late && plan.route?.reachable && !plan.atHome && plan.travelMinutes >= SHORT_WALK
      ? t('life90f.route', { time: timeLabel(plan.safeDepartureMinute), n: String(plan.travelMinutes) })
      : null

  const hard = plan.blockers.find((code) => code !== 'lapse')
  const blockedHe = hard ? (hard === 'route' && plan.route?.whyHe ? `${t(BLOCKED.route as MessageKey)} ${plan.route.whyHe}` : t(BLOCKED[hard] ?? 'life90f.impossible')) : null

  const n = Math.max(0, Math.round(waitMinutes))
  // a short wait in minutes (the countdown a person watches), a long one in hours
  const dur = n <= 90 ? t('life90f.minutes', { n: String(n) }) : durationHe(n)
  const chipHe = plan.late
    ? t('life90f.chip.late')
    : n <= 1
      ? t('life90f.chip.soon')
      : !stays
        ? t('life90f.chip.leave', { dur })
        : plan.alreadyThere && plan.targetLocation
          ? t('life90f.chip.here', { dur })
          : t('life90f.chip.free', { dur })

  const ctaHe = !stays
    ? plan.late
      ? t('life90f.cta.goNow', { place })
      : t('life90f.cta.onTime', { place })
    : plan.atHome || isFlat(plan.currentLocation)
      ? t('life90f.cta.waitHome')
      : t('life90f.cta.wait')
  const ctaSubHe = !stays ? t('life90f.walk', { n: String(plan.travelMinutes) }) : known ? (plan.eventHe ?? null) : null

  // "go early" is worth a button only when there is a real walk and real time to spare
  const earlyHe = moving && plan.earlyArrivalMinute !== null && plan.travelMinutes >= SHORT_WALK && plan.freeMinutes >= 10 ? t('life90f.cta.early', { place }) : null

  const letPassHe = plan.lapse ? (plan.closesDay ? t('life90f.cta.endDay') : t('life90f.cta.letPass')) : null
  const letPassSubHe = plan.lapse ? [known ? plan.eventHe : null, t('life90f.lapse')].filter(Boolean).join(' — ') : null

  return {
    chipHe,
    whyHe,
    whereHe,
    freeHe,
    routeHe,
    blockedHe,
    timeline: {
      now: timeLabel(plan.fromMinute),
      leave: !stays ? timeLabel(plan.safeDepartureMinute) : null,
      event: eventTime,
      eventLabelHe: known ? shortEvent(plan.eventHe) : t('life90f.next'),
      leaveLabelHe: t('life90f.leave'),
    },
    ctaHe,
    ctaSubHe,
    earlyHe,
    letPassHe,
    letPassSubHe,
  }
}

const isFlat = (id: string) => id === 'home' || id === 'bedroom' || id === 'kitchen'

/** the timeline's third label is two or three words — the sentence is above it */
function shortEvent(eventHe: string | null): string {
  if (!eventHe) return t('life90f.next')
  const words = eventHe.split(/\s+/)
  return words.length <= 3 ? eventHe : words.slice(0, 3).join(' ')
}

/** "20 דק׳ · נשאר מספיק זמן" */
export function actionLineHe(action: FreeTimeAction): { minutesHe: string; tierHe: string | null } {
  const minutesHe = action.durationMinutes === null ? t('life90f.untimed') : t('life90f.minutes', { n: String(action.totalMinutes ?? action.durationMinutes) })
  const tierHe =
    action.tier === 'safe'
      ? t('life90f.tier.safe')
      : action.tier === 'tight'
        ? t('life90f.tier.tight')
        : action.tier === 'untimed'
          ? action.kind === 'collection'
            ? t('life90f.tier.untimed')
            : null
          : (action.riskHe ?? null)
  return { minutesHe, tierHe }
}

/** the transition's one line (§7): the legs, or the waiting, in his voice */
export function transitionLineHe(state: LifeState, walking: boolean): string {
  const voice = voiceOf(state)
  return t(`life90f.${walking ? 'go' : 'pass'}.${voice}` as MessageKey)
}
