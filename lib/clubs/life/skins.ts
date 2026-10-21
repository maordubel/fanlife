import {REGISTRY, type RegistryClub} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {buildSkin, type SignKey, type VoxelSkin} from '@/lib/life/universal/skin'
import {clubWorld} from '@/lib/clubs/world'
import {LIFE_CAST, LIFE_SKINS} from './packs'

/**
 * The words on a street's signs, by the language the club's street speaks. Ordinary words (kiosk, tickets, gate), never a
 * fact: a club whose LIFE file letters its own signs keeps them, every other club gets its country's words instead of English.
 */
type Words = Partial<Record<SignKey, string>>
const STREET: Record<string, Words> = {
  he: {kiosk: 'קיוסק', ticket: 'כרטיסים', school: 'בית ספר', club: 'מועדון', news: 'חדשות', bus: 'תחנה מרכזית', ground: 'אצטדיון', gate: 'שער', stand: 'יציע', away: 'אורחים', cafe: 'קפה', snack: 'מזנון', since: 'לנצח', shop: 'מכולת', market: 'שוק'},
  el: {kiosk: 'ΠΕΡΙΠΤΕΡΟ', ticket: 'ΕΙΣΙΤΗΡΙΑ', school: 'ΣΧΟΛΕΙΟ', club: 'ΣΥΛΛΟΓΟΣ', news: 'ΕΙΔΗΣΕΙΣ', bus: 'ΣΤΑΘΜΟΣ', ground: 'ΓΗΠΕΔΟ', gate: 'ΘΥΡΑ', stand: 'ΚΕΡΚΙΔΑ', away: 'ΦΙΛΟΞΕΝΟΥΜΕΝΟΙ', cafe: 'ΚΑΦΕ', snack: 'ΣΟΥΒΛΑΚΙ', since: 'ΓΙΑ ΠΑΝΤΑ', shop: 'ΠΑΝΤΟΠΩΛΕΙΟ', market: 'ΑΓΟΡΑ'},
  hr: {kiosk: 'KIOSK', ticket: 'ULAZNICE', school: 'ŠKOLA', club: 'KLUB', news: 'VIJESTI', bus: 'AUTOBUSNI KOLODVOR', ground: 'STADION', gate: 'ULAZ', stand: 'TRIBINA', away: 'GOSTI', cafe: 'KAFIĆ', snack: 'GRILL', since: 'ZAUVIJEK', shop: 'TRGOVINA', market: 'TRŽNICA'},
  sr: {kiosk: 'KIOSK', ticket: 'ULAZNICE', school: 'ŠKOLA', club: 'KLUB', news: 'VESTI', bus: 'AUTOBUSKA STANICA', ground: 'STADION', gate: 'KAPIJA', stand: 'TRIBINA', away: 'GOSTI', cafe: 'KAFANA', snack: 'ROŠTILJ', since: 'ZAUVEK', shop: 'PRODAVNICA', market: 'PIJACA'},
  de: {kiosk: 'KIOSK', ticket: 'TICKETS', school: 'SCHULE', club: 'VEREINSHEIM', news: 'ZEITUNGEN', bus: 'BUSBAHNHOF', ground: 'STADION', gate: 'TOR', stand: 'TRIBÜNE', away: 'GÄSTE', cafe: 'CAFÉ', snack: 'IMBISS', since: 'FÜR IMMER', shop: 'LADEN', market: 'MARKT'},
  it: {kiosk: 'EDICOLA', ticket: 'BIGLIETTI', school: 'SCUOLA', club: 'CIRCOLO', news: 'GIORNALI', bus: 'AUTOSTAZIONE', ground: 'STADIO', gate: 'INGRESSO', stand: 'CURVA', away: 'OSPITI', cafe: 'BAR', snack: 'PANINI', since: 'PER SEMPRE', shop: 'ALIMENTARI', market: 'MERCATO'},
  tr: {kiosk: 'BÜFE', ticket: 'BİLET', school: 'OKUL', club: 'KULÜP', news: 'GAZETE', bus: 'OTOGAR', ground: 'STADYUM', gate: 'KAPI', stand: 'TRİBÜN', away: 'DEPLASMAN', cafe: 'KAHVE', snack: 'DÖNER', since: 'SONSUZA DEK', shop: 'BAKKAL', market: 'PAZAR'},
  en: {kiosk: 'NEWSAGENT', ticket: 'TICKETS', school: 'SCHOOL', club: 'SUPPORTERS CLUB', news: 'NEWS', bus: 'BUS STATION', ground: 'STADIUM', gate: 'TURNSTILE', stand: 'STAND', away: 'AWAY FANS', cafe: 'CAFÉ', snack: 'CHIPS', since: 'FOREVER', shop: 'CORNER SHOP', market: 'MARKET'},
}
const LANG: Record<string, keyof typeof STREET> = {Israel: 'he', Greece: 'el', Croatia: 'hr', 'Bosnia and Herzegovina': 'hr', Serbia: 'sr', Germany: 'de', Italy: 'it', Turkey: 'tr', England: 'en', Scotland: 'en'}

/** One club's skin. A club with no LIFE file still gets one — from its registry row, its theme and its sourced world file. */
export function clubSkin(club: RegistryClub): {skin: VoxelSkin; issues: string[]} {
  const manifest = Object.hasOwn(LIFE_SKINS, club.id) ? LIFE_SKINS[club.id]! : null
  const built = buildSkin(club, clubTheme(club), manifest)
  const world = clubWorld(club.id)
  const lang = LANG[club.country]
  // the club's own gate (its sourced terrace line, rule 101) is the middle number on its gates; never a guessed one
  // the club's own gate (its sourced terrace line, rule 101) is the MIDDLE number — the one the curva wears. An approved
  // manifest list keeps its numbers and is only reordered round it (AEK listed 21·22·23 and printed 22 on the curva)
  const own = world?.terrace ? /\bgate\s+(\d{1,2})\b/i.exec(world.terrace.name) : null
  const n = own ? Number(own[1]) : null
  const listed = manifest?.gateNumbers as number[] | undefined
  const nums: [number, number, number] | null = !n ? null
    : listed?.includes(n) && listed.length === 3 ? (() => { const rest = listed.filter(x => x !== n); return [rest[0]!, n, rest[1]!] as [number, number, number] })()
    : listed?.length ? null
    : [Math.max(1, n - 1), n, n + 1]
  return {
    issues: built.issues,
    skin: {
      ...built.skin,
      strings: {...(lang ? STREET[lang] : {}), ...built.skin.strings},
      // an owner-approved venue first; else the ground the club's sourced world file names (two publishers, rule 100)
      stadium: built.skin.stadium ?? world?.ground?.name ?? null,
      ...(nums ? {nums} : {}),
    },
  }
}

/** Every club the portal knows, keyed by registry id — what the voxel lab and the game fetch. */
export function allSkins(): Record<string, VoxelSkin> {
  return Object.fromEntries(REGISTRY.map(club => {
    const skin = clubSkin(club).skin
    const names = Object.hasOwn(LIFE_CAST, club.id) ? (LIFE_CAST[club.id]!.names ?? {}) as Record<string, string> : {}
    const kiosk = typeof names.kiosk === 'string' && names.kiosk.trim() ? names.kiosk.trim().slice(0, 16) : null
    return [club.id, kiosk ? {...skin, cast: {kiosk}} : skin]
  }))
}
