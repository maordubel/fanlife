/**
 * ההליכה עצמה — מצב טהור, בלי Phaser, כדי שאפשר יהיה לבדוק סצנה שלמה במילישניות.
 *
 * מה שהקובץ הזה מחזיק הוא **איפה אנחנו בתוך המסלול**: באיזו נקודת דרך, מה נאמר, מתי
 * השליטה חוזרת, ומה נלמד בהגעה. מה שהוא במפורש לא מחזיק הוא איך זה נראה — הריצה של הרגליים,
 * המרחק בין שתי הדמויות והמצלמה שייכים לסצנה, והם מקבלים ממנו סיגנלים.
 *
 * ההפרדה הזאת היא מה שמאפשר את הדבר החשוב באמת: **טעינה מחדש באמצע הליכה מודרכת ממשיכה
 * ממנה**. הסמן הוא מספר, הוא נכנס לנקודת השמירה של הפרק, ואף אחד לא הולך את אלנבי פעמיים.
 */
import type { LifeState } from '../types'
import type { ControlMode, GuidedMemory, Waypoint } from './types'
import { routeFor } from './routes'

export type GuidedSignal =
  | { k: 'walk'; to: Waypoint['at']; pace: number }
  | { k: 'say'; whoHe: string; textHe: string }
  | { k: 'reveal'; textHe: string }
  | { k: 'pause'; ms: number }
  | { k: 'teach'; area: string }
  | { k: 'release'; at: Waypoint['at']; mode: ControlMode; sayHe?: string }

export type GuidedSnapshot = { id: string; cursor: number; done: boolean }

/**
 * הכלל שמאור ניסח כמשפט אחד: *"כשדמות אומרת בוא איתי — שתלך איתך."*
 *
 * הכיתה הזאת היא הצד המכני של המשפט הזה. היא לא AI של מעקב; היא במאי: נקודת דרך אחת בכל
 * פעם, בקצב שכתוב לה, עם עצירה איפה שכתוב לעצור.
 */
export class GuidedWalk {
  private cursor = 0
  private finished = false

  constructor(private readonly memory: GuidedMemory) {}

  /** הצעד הבא — הכל שקורה בנקודת הדרך הזאת, בסדר */
  advance(): GuidedSignal[] {
    if (this.finished) return []
    const route = routeFor(this.memory.routeId)
    const point = route?.waypoints[this.cursor]
    if (!route || !point) {
      this.finished = true
      return [{ k: 'release', at: this.memory.release.at, mode: this.memory.release.mode, ...(this.memory.release.sayHe ? { sayHe: this.memory.release.sayHe } : {}) }]
    }
    const out: GuidedSignal[] = [{ k: 'walk', to: point.at, pace: point.pace ?? 1 }]
    if (point.sayHe) out.push({ k: 'say', whoHe: point.whoHe ?? this.memory.leaderHe, textHe: point.sayHe })
    if (point.revealHe) out.push({ k: 'reveal', textHe: point.revealHe })
    if (point.pauseMs) out.push({ k: 'pause', ms: point.pauseMs })
    this.cursor += 1
    if (this.cursor >= route.waypoints.length) {
      this.finished = true
      for (const area of this.memory.teaches ?? []) out.push({ k: 'teach', area })
      out.push({ k: 'release', at: this.memory.release.at, mode: this.memory.release.mode, ...(this.memory.release.sayHe ? { sayHe: this.memory.release.sayHe } : {}) })
    }
    return out
  }

  /** לדלג — רק כשהמדיניות מרשה, ותמיד עם מה שהיה נלמד בדרך */
  skip(seenBefore: boolean): GuidedSignal[] {
    const allowed = this.memory.skip === 'always' || (this.memory.skip === 'after-seen' && seenBefore)
    if (!allowed || this.finished) return []
    this.finished = true
    this.cursor = routeFor(this.memory.routeId)?.waypoints.length ?? 0
    const out: GuidedSignal[] = []
    for (const area of this.memory.teaches ?? []) out.push({ k: 'teach', area })
    out.push({ k: 'release', at: this.memory.release.at, mode: this.memory.release.mode })
    return out
  }

  /** מותר לשחקן לעצור את זה עכשיו? הליכה עם אבא כועס — לא */
  interruptible(): boolean {
    return this.memory.interrupt === 'free'
  }

  done(): boolean {
    return this.finished
  }

  where(): Waypoint['at'] | null {
    const route = routeFor(this.memory.routeId)
    const index = Math.min(this.cursor, (route?.waypoints.length ?? 1) - 1)
    return route?.waypoints[index]?.at ?? null
  }

  snapshot(): GuidedSnapshot {
    return { id: this.memory.id, cursor: this.cursor, done: this.finished }
  }

  restore(snap: GuidedSnapshot) {
    if (snap.id !== this.memory.id) return
    this.cursor = snap.cursor
    this.finished = snap.done
  }
}

/** האם ההליכה הזאת אמורה להתחיל עכשיו */
export const shouldStart = (memory: GuidedMemory, state: LifeState, meets: (s: LifeState, c: GuidedMemory['start']) => boolean): boolean =>
  meets(state, memory.start)
