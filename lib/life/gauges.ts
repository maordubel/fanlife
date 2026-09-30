import { characterName } from './characters'
import {
  PERSONALITY_IDS,
  RED_HEART_IDS,
  WELLBEING_IDS,
  type ArmyGauge,
  type GateIdentity,
  type InstitutionGauge,
  type LacesResponse,
  type LifeState,
  type PersonalityId,
  type RedHeartId,
  type SinaiStance,
  type WellbeingId,
} from './types'

/**
 * המדדים — the numbers, made visible on purpose.
 *
 * Brief §15 said no bars on the HUD, and for three chapters that was right: you read a
 * father off a father. Maor then asked for the opposite as a GAME layer — a living meter
 * of love for the club always on the glass, a pop when a number moves, and one sheet
 * where every gauge stands with its percentage. Both are true at once if the model is one
 * thing and the surface is another: this file is the model. It never changes a number; it
 * reads the state the events already produced and says what moved, by how much, and in
 * which direction a person would call good.
 *
 * `hapoelLove` is the one composite in the game — the meter on the glass — and it is a
 * weighted read of the Red Heart, not a new stat: football, basketball, the family's
 * tradition, the terrace, the community and the memory of it. Nothing writes to it. It
 * moves because the life moved.
 */
export type GaugeGroup = 'heart' | 'person' | 'wellbeing' | 'people' | 'decade'

export type GaugeDef = {
  id: string
  group: GaugeGroup
  labelHe: string
  /** which direction reads as good — `down` for stress, `none` for a plain measure */
  good: 'up' | 'down' | 'none'
  /** pops on change; false for numbers that move every step */
  pops: boolean
  read: (state: LifeState) => number
}

export type GaugeChange = {
  id: string
  group: GaugeGroup
  labelHe: string
  from: number
  to: number
  delta: number
  good: GaugeDef['good']
}

const HEART_HE: Record<RedHeartId, string> = {
  footballLove: 'כדורגל',
  basketballLove: 'כדורסל',
  troubleAffinity: 'בלגן',
  professionalFootball: 'המקצוענות',
  community: 'קהילה',
  terraceCulture: 'תרבות יציע',
  travelDrive: 'דרכים',
  historyMemory: 'זיכרון',
  familyTradition: 'מסורת של בית',
  loyaltyReturn: 'נאמנות',
}

const PERSON_HE: Record<PersonalityId, string> = {
  independence: 'עצמאות',
  courage: 'אומץ',
  responsibility: 'אחריות',
  reliability: 'אמינות',
  empathy: 'אמפתיה',
  streetSmarts: 'שכל רחוב',
  curiosity: 'סקרנות',
  impulsiveness: 'אימפולסיביות',
  stubbornness: 'עקשנות',
  sociability: 'חברותיות',
  riskTolerance: 'סיכון',
  honesty: 'כנות',
}

const WELL_HE: Record<WellbeingId, { he: string; good: GaugeDef['good'] }> = {
  happiness: { he: 'שמחה', good: 'up' },
  stress: { he: 'לחץ', good: 'down' },
  loneliness: { he: 'בדידות', good: 'down' },
  belonging: { he: 'שייכות', good: 'up' },
  exhaustion: { he: 'עייפות', good: 'down' },
  regret: { he: 'חרטה', good: 'down' },
}

const ARMY_HE: Record<ArmyGauge, { he: string; good: GaugeDef['good'] }> = {
  commanderTrust: { he: 'המפקד סומך עליך', good: 'up' },
  leaveDebt: { he: 'חוב חופשות', good: 'down' },
  fatigue: { he: 'שחיקה', good: 'down' },
  coveredForOthers: { he: 'כיסית על חברים', good: 'up' },
}

const INST_HE: Record<InstitutionGauge, { he: string; good: GaugeDef['good'] }> = {
  footballOwnershipTrust: { he: 'אמון בבעלי הכדורגל', good: 'none' },
  basketballOwnershipTrust: { he: 'אמון בבעלי הכדורסל', good: 'none' },
  protestEscalation: { he: 'הסלמה', good: 'none' },
  legalUnderstanding: { he: 'הבנה משפטית', good: 'up' },
  ussishkinWound: { he: 'הפצע של אוסישקין', good: 'down' },
  supporterOwnershipSeed: { he: 'ההתחלה של הבעלות', good: 'up' },
}

export const GATE_HE: Record<GateIdentity, string> = {
  gate7: 'שער 7',
  gate5: 'שער 5',
  between: 'בין השערים',
  outside: 'בחוץ',
}

export const SINAI_HE: Record<SinaiStance, string> = {
  defending: 'מגן על סיני',
  doubting: 'מפקפק',
  broken: 'נשבר',
  'reconciled-memory': 'זוכר בשלום',
}

export const LACES_HE: Record<LacesResponse, string> = {
  witness: 'עד',
  protector: 'שומר',
  organizer: 'מארגן',
  avenger: 'נוקם',
  withdrawn: 'נסוג',
  unresolved: 'לא נסגר',
}

/**
 * אהבה להפועל — the one number on the glass. A weighted read of the Red Heart; the
 * weights say what the club IS to this game: football first, then the family's habit,
 * the terrace, the hall, the people, the memory.
 */
export function hapoelLove(state: LifeState): number {
  const h = state.redHeart
  const value =
    h.footballLove * 0.34 +
    h.familyTradition * 0.16 +
    h.terraceCulture * 0.14 +
    h.basketballLove * 0.12 +
    h.community * 0.12 +
    h.historyMemory * 0.06 +
    h.loyaltyReturn * 0.06
  return Math.max(0, Math.min(100, Math.round(value)))
}

function heartGauges(): GaugeDef[] {
  return RED_HEART_IDS.map((key) => ({
    id: `heart:${key}`,
    group: 'heart',
    labelHe: HEART_HE[key],
    good: key === 'troubleAffinity' ? 'none' : 'up',
    pops: true,
    read: (state) => state.redHeart[key],
  }))
}

function personGauges(): GaugeDef[] {
  return PERSONALITY_IDS.map((key) => ({
    id: `person:${key}`,
    group: 'person',
    labelHe: PERSON_HE[key],
    good: 'none',
    pops: true,
    read: (state) => state.personality[key],
  }))
}

function wellbeingGauges(): GaugeDef[] {
  return WELLBEING_IDS.map((key) => ({
    id: `well:${key}`,
    group: 'wellbeing',
    labelHe: WELL_HE[key].he,
    good: WELL_HE[key].good,
    // exhaustion follows energy, which moves every step; it is read on the sheet, not popped
    pops: key !== 'exhaustion',
    read: (state) => state.wellbeing[key],
  }))
}

function decadeGauges(): GaugeDef[] {
  const army = (Object.keys(ARMY_HE) as ArmyGauge[]).map<GaugeDef>((key) => ({
    id: `army:${key}`,
    group: 'decade',
    labelHe: ARMY_HE[key].he,
    good: ARMY_HE[key].good,
    pops: true,
    read: (state) => state.army[key],
  }))
  const inst = (Object.keys(INST_HE) as InstitutionGauge[]).map<GaugeDef>((key) => ({
    id: `inst:${key}`,
    group: 'decade',
    labelHe: INST_HE[key].he,
    good: INST_HE[key].good,
    pops: true,
    read: (state) => state.institution[key],
  }))
  return [...army, ...inst]
}

/** The people he knows — bond and trust for everyone the state holds a relationship with. */
function peopleGauges(state: LifeState): GaugeDef[] {
  const out: GaugeDef[] = []
  for (const who of Object.keys(state.relationships)) {
    const name = characterName(who)
    out.push({
      id: `bond:${who}`,
      group: 'people',
      labelHe: name,
      good: 'up',
      pops: true,
      read: (s) => s.relationships[who]?.bond ?? s.bonds[who] ?? 0,
    })
    out.push({
      id: `trust:${who}`,
      group: 'people',
      labelHe: `${name} · אמון`,
      good: 'up',
      pops: true,
      read: (s) => s.relationships[who]?.trust ?? 0,
    })
  }
  return out
}

/** Every gauge the sheet shows, in the order it shows them. The love meter is first. */
export function allGauges(state: LifeState): GaugeDef[] {
  return [
    { id: 'love', group: 'heart', labelHe: 'אהבה להפועל', good: 'up', pops: true, read: hapoelLove },
    ...heartGauges(),
    ...personGauges(),
    ...wellbeingGauges(),
    ...peopleGauges(state),
    ...decadeGauges(),
  ]
}

/** the smallest move worth a pop — a tenth of a point is arithmetic, not a change */
const MIN_POP = 0.5

/**
 * What moved between two states, for the pops. A chapter or year boundary moves
 * everything at once and none of it is a beat, so it is skipped whole.
 */
export function diffGauges(before: LifeState, after: LifeState): GaugeChange[] {
  if (before === after) return []
  if (before.chapter !== after.chapter || before.year !== after.year) return []
  if (before.stageADay !== after.stageADay) return []
  const out: GaugeChange[] = []
  for (const gauge of allGauges(after)) {
    if (!gauge.pops) continue
    const from = gauge.read(before)
    const to = gauge.read(after)
    const delta = to - from
    if (Math.abs(delta) < MIN_POP) continue
    out.push({ id: gauge.id, group: gauge.group, labelHe: gauge.labelHe, from, to, delta, good: gauge.good })
  }
  // the meter on the glass first, then the biggest moves
  out.sort((a, b) => (a.id === 'love' ? -1 : b.id === 'love' ? 1 : Math.abs(b.delta) - Math.abs(a.delta)))
  return out
}

/** Whether a change reads as a rise in something good, for colour and arrow. */
export function changeTone(change: GaugeChange): 'good' | 'bad' | 'plain' {
  if (change.good === 'none') return 'plain'
  const up = change.delta > 0
  return (change.good === 'up') === up ? 'good' : 'bad'
}
