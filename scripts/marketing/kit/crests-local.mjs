/** The owner's crest packs (9.11.2026, FootyLogos 2026/27 — credit: FootyLogos.com, https://www.footylogos.com):
 *  Super League Greece, Israeli Premier League, Bosnian Premier League, Premier League, LaLiga, Champions League,
 *  Europa League, Conference League — 162 current primary crests, rendered once to 320 px PNGs in assets/crests.
 *  They come FIRST for the clubs they hold (the owner's own current set); the universe's library is the fallback.
 *  A name matches its file exactly after folding, or through one of the aliases below — never by a guess. */
import {readdirSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'crests')
const fold = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const PRE = /^(fc|fk|nk|hnk|gnk|hsk|sk|afc|ac|as|rc|sc|rcd|kaa|rsc|cf|cd|sl|ssc|tsg|vfb|bsc|kf|scu)-/, POST = /-(fc|cf|afc|sc|fk|cp)$/
const ALIAS = {
  'olympiacos-piraeus': 'olympiacos', 'panathinaikos-fc': 'panathinaikos', 'aek': 'aek-athens', 'zrinjski-mostar': 'hsk-zrinjski-mostar', 'zrinjski': 'hsk-zrinjski-mostar',
  'paok-thessaloniki': 'paok', 'celtic-fc': 'celtic', 'liverpool': 'liverpool-fc', 'barcelona': 'fc-barcelona', 'psg': 'paris-saint-germain-psg', 'paris-saint-germain': 'paris-saint-germain-psg',
  'marseille': 'olympique-de-marseille-om', 'olympique-marseille': 'olympique-de-marseille-om', 'lyon': 'olympique-lyonnais', 'olympique-lyon': 'olympique-lyonnais',
  'dinamo-zagreb': 'gnk-dinamo-zagreb', 'hajduk-split': 'hnk-hajduk-split', 'red-star': 'red-star-belgrade', 'crvena-zvezda': 'red-star-belgrade',
  'bodo-glimt': 'fk-bodo-glimt', 'bodoglimt': 'fk-bodo-glimt', 'hoffenheim': 'tsg-hoffenheim', 'tsg-1899-hoffenheim': 'tsg-hoffenheim', 'stuttgart': 'vfb-stuttgart',
  'athletic-bilbao': 'athletic-club-bilbao', 'atletico-de-madrid': 'atletico-madrid', 'sparta-prague': 'sparta-praha', 'slavia-prague': 'slavia-praha',
  'brighton-hove-albion': 'brighton-and-hove-albion', 'hapoel-beer-sheva': 'hapoel-beer-sheva', "hapoel-be-er-sheva": 'hapoel-beer-sheva', 'bnei-sakhnin': 'ihud-bnei-sakhnin',
  'kiryat-shmona': 'ironi-kiryat-shmona', 'velez-mostar': 'fk-velez-mostar', 'sarajevo': 'fk-sarajevo', 'zeljeznicar': 'fk-zeljeznicar-sarajevo', 'borac-banja-luka': 'fk-borac-banja-luka',
  'ofi': 'ofi-crete', 'ofi-crete-fc': 'ofi-crete', 'aris': 'aris-thessaloniki', 'volos': 'volos-nps', 'asteras-tripolis': 'asteras-tripolis', 'inter': 'inter-milan', 'milan': 'ac-milan',
  'bayer-04-leverkusen': 'bayer-leverkusen', 'man-city': 'manchester-city', 'man-united': 'manchester-united', 'spurs': 'tottenham-hotspur', 'club-brugge-kv': 'club-brugge',
  'feyenoord-rotterdam': 'feyenoord', 'ajax-amsterdam': 'ajax', 'red-bull-salzburg': 'red-bull-salzburg', 'salzburg': 'red-bull-salzburg', 'shakhtar': 'shakhtar-donetsk',
}
let FILES
const files = () => FILES ??= new Set(readdirSync(DIR).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)))
/** the owner's file for a team name, or null */
export function localCrest(name) {
  const k = fold(name)
  if (!k) return null
  const have = files()
  for (const c of [k, ALIAS[k], k.replace(PRE, ''), k.replace(POST, ''), k.replace(PRE, '').replace(POST, ''), ALIAS[k.replace(PRE, '').replace(POST, '')]])
    if (c && have.has(c)) return path.join(DIR, c + '.png')
  for (const p of ['fc-', 'fk-', 'hnk-', 'gnk-', 'nk-', 'hsk-', 'sk-']) if (have.has(p + k)) return path.join(DIR, p + k + '.png')
  return null
}
