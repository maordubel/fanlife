import { COLOUR_NAME, type CollarId, type KitColour, type PatternId, type SleeveId } from './spec'

/**
 * תיאור החולצה — generated from the SAME fields that draw and grade the shirt (Deep QA,
 * 29.9.2026, §20). A hand-written note can say one thing while the renderer draws a second and
 * the grader accepts a third; a description built from the structured truth cannot drift from it.
 *
 * Only what the record KNOWS is said (rule 11): an unknown maker or sponsor is left out, never
 * softened into a guess. Pure and client-safe.
 */
export type DescribableKit = {
  base: KitColour
  pattern: PatternId
  patternInk: KitColour
  sleeves: SleeveId
  sleeveInk: KitColour
  collar: CollarId
  collarInk: KitColour
  makerHe: string | null
  sponsorHe: string | null
}

const COLLAR_HE: Record<CollarId, string> = { crew: 'עגול', ringer: 'רינגר', 'v-neck': 'וי', polo: 'פולו', laced: 'שרוכים' }

const FEMININE: Record<KitColour, string> = { red: 'אדומה', cream: 'שמנת', ink: 'שחורה', paper: 'לבנה', navy: 'נייבי', deep: 'אדומה כהה', concrete: 'אפורה' }

/** "ב" + colour, with the vav-less Hebrew prefix rule the names here need */
const ink = (c: KitColour) => `ב${COLOUR_NAME[c]}`

function patternPhrase(k: DescribableKit): string | null {
  const i = ink(k.patternInk)
  switch (k.pattern) {
    case 'solid': return 'חלקה'
    case 'stripe-wide': return `עם פסים אנכיים רחבים ${i}`
    case 'pinstripe': return `עם פסי שיער ${i}`
    case 'twin-stripe': return `עם שני פסים אנכיים ${i} בחזית`
    case 'chest-band': return `עם פס רחב ${i} על החזה`
    case 'shoulder-panel': return `עם כתפיים ${i}`
    case 'sash': return `עם אלכסון רחב (סאש) ${i}`
    case 'diagonal': return `עם אלכסונים דקים ${i}`
    case 'halves': return `בחצאים ${i}`
    case 'quarters': return `ברבעים ${i}`
    case 'side-panel': return `עם פאנלים צדדיים ${i}`
    case 'hoop-tonal': return 'עם חישוקים טונליים'
    case 'jacquard': return 'עם מרקם מעוינים'
    case 'chevron': return 'עם זיגזג'
    case 'grid-tonal': return 'עם רשת טונלית'
    case 'gradient': return 'עם מעבר צבע'
    case 'yoke-v': return `עם כתפיים בצורת וי ${i}`
    default: return null
  }
}

function sleevePhrase(k: DescribableKit): string | null {
  const i = ink(k.sleeveInk)
  switch (k.sleeves) {
    case 'raglan': return `שרוולי רגלן ${i}`
    case 'cuff': return `חפתים ${i}`
    case 'shoulder-stripe': return `פסי כתף ${i}`
    case 'arc': return 'קשת בשרוול'
    default: return null
  }
}

/** `חולצה אדומה של נייקי עם שני פסים אנכיים בשחור בחזית, צווארון וי בשחור, חפתים בשחור וספונסר כתר.` */
export function describeKit(k: DescribableKit): string {
  const head = `חולצה ${FEMININE[k.base]}${k.makerHe ? ` של ${k.makerHe}` : ''}`
  const pattern = patternPhrase(k)
  const first = pattern ? `${head} ${pattern}` : head
  const rest: string[] = [`צווארון ${COLLAR_HE[k.collar]}${k.collarInk !== k.base ? ` ${ink(k.collarInk)}` : ''}`]
  const sleeve = sleevePhrase(k)
  if (sleeve) rest.push(sleeve)
  if (k.sponsorHe) rest.push(`ספונסר ${k.sponsorHe}`)
  const tail = rest.length > 1 ? `${rest.slice(0, -1).join(', ')} ו${rest[rest.length - 1]}` : rest[0]!
  return `${first}, ${tail}.`
}
