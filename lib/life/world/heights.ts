/**
 * כמה גבוה אדם — one table, and nobody types a size again.
 *
 * Maor sent a screenshot of the kiosk on 6.9.2026 and asked one question: does the man
 * standing in the shop look normal next to Rafi and next to Pogi. He did not. Measured off
 * the running game, that customer was **87 centimetres tall**, and he was not alone — a
 * sweep of every room found thirty-four bodies outside any height a person comes in, from
 * a 68-centimetre basketball player to a 93-centimetre steward on the gate.
 *
 * The cause is the same one every time: `size` was a fraction of the frame, typed by hand,
 * per actor, per room, by whoever added that actor. A number that looks fine on its own and
 * is wrong beside the man next to it, in a file where the man next to it is four hundred
 * lines away.
 *
 * So sizes are no longer typed. A room declares its `metre` — how much of the frame one
 * metre occupies at the near line — and every body in it is drawn at `metre × its height
 * in metres`, from this table. Adding a person now means saying who they are, and their
 * height comes from the fact that they are a person.
 *
 * Heights are the real ones, and the ages are the ones the script gives them:
 *   · a boy of six is 1.18, of eight 1.30, of twelve 1.50, of fifteen 1.68
 *   · a woman is 1.63, a man 1.75, a big man 1.82
 *   · a basketball player is 1.95, because he is a basketball player
 */

/** the default, when nobody has said otherwise: an adult */
export const DEFAULT_HEIGHT_M = 1.75

/**
 * גובה לפי מי זה — matched longest-prefix-first, so `kobi90-lean` finds `kobi90` and
 * `kobi` does not shadow it.
 */
const HEIGHTS: ReadonlyArray<readonly [string, number]> = [
  // ---------------------------------------------------------------- הילדים ----------
  // Pogi's own poses are sized by the era, not from here, but the alley children are not.
  // 24.9.2026 — the grown man, from the 2000–2026 delivery: `pogi32` must not fall through
  // to `pogi` (the eight-year-old, 1.30) — the longest prefix wins, and these are longer
  ['pogi32', 1.78],
  ['pogi40', 1.78],
  ['pogi47', 1.78],
  ['pogi90', 1.78],
  ['pogiIDF', 1.77],
  ['pogi', 1.30],
  ['kid', 1.32],

  // The four from the alley, at the ages the chapters give them.
  // …and the friends at forty (`ofir40` would otherwise find `ofir`, the boy of 1.46)
  ['amit40', 1.72],
  ['ofir40', 1.76],
  ['efi44', 1.80],
  ['keren40', 1.66],
  ['amit90', 1.72],
  ['amit', 1.42],
  ['ofir90', 1.76],
  ['ofir', 1.46],
  ['efi96', 1.80],
  ['efi', 1.52], // four years older than Pogi in 1984, and it shows
  ['keren90', 1.66],
  ['keren', 1.38],

  // ------------------------------------------------------------- המשפחה -------------
  // a man of seventy has lost a couple of centimetres; of sixty-two, one
  ['kobi72', 1.74],
  ['kobi62', 1.75],
  ['kobi90', 1.76],
  ['kobi', 1.76],
  ['rachel90', 1.63],
  ['rachel', 1.63],

  // ------------------------------------------------------- מבוגרים בעלי שם ----------
  // שלושת האנשים בחזית בלומפילד, מחבילת 8.9.2026. הם נמדדים כאן ולא בטבלה של העיר,
  // כי גובה של אדם הוא עובדה אחת ויש לה בית אחד.
  ['bfSteward', 1.78],
  ['bfVendor', 1.70],
  ['oldMan', 1.70], // Rafi, stooped — the man the kiosk was measured against
  ['usher', 1.72],
  ['teacher', 1.66],
  ['veteran', 1.68],
  ['neighbour', 1.62],
  ['batya', 1.60], // the photograph of 27.9.2026: a short, solid woman of sixty
  ['shachor', 1.78],
  ['soko', 1.68],
  ['freddy', 1.79],
  ['melamed', 1.74],
  ['michel96', 1.73],
  ['barry96', 1.81],
  ['barry', 1.81],
  ['liron', 1.77],
  ['hermesh', 1.79],
  ['asaf', 1.80],
  ['hallVendor', 1.71],
  ['vendor', 1.71],
  ['yaron', 1.76],
  ['sinai', 1.78],
  ['tikva', 1.75],
  ['gershon', 1.74],
  ['manCap', 1.68],
  ['manBack', 1.72],
  ['girlTeen', 1.62],
  ['boySkate', 1.70],

  // ---------------------------------------------------------- שחקנים על הפרקט -------
  // A basketball player is the tallest person in any room he is in, and the hall was
  // drawing them at seventy centimetres, which is why the parquet read as a tabletop.
  ['hooperRed', 1.95],
  ['hooper', 1.95],

  // ------------------------------------------------------------- הקהל --------------
  // The crowd sheets: `adult*` are grown people, `young*` are teenagers and young adults.
  ['adultA', 1.74],
  ['adultB', 1.77],
  ['youngA', 1.68],
  ['youngB', 1.70],

  // ------------------------------------------------- הפרצופים והחיילים --------------
  ['soldier', 1.77],
  ['teen', 1.68],
  ['hero90', 1.78],
  ['hero80', 1.50],
]

/**
 * A seated person is not a shorter person: measured head to floor, sitting takes about
 * three-quarters of standing, and a figure drawn in a chair has to be sized that way or a
 * seated man reads as a tall child. (`-stool` joined 21.9.2026: Rafi on his stool by the
 * counter, from 1993 on.)
 */
const SITTING = /-(sit|sitA|sitB|chair|stool|kneel|crouch|bent)\b|-(sit|chair|stool|kneel|crouch|bent)$/
const SEATED_RATIO = 0.76

/** how tall this figure is, in metres, drawn as the pose it is in */
export function heightOf(figure: string): number {
  let best: number | null = null
  let bestLength = -1
  for (const [prefix, metres] of HEIGHTS) {
    if (figure.startsWith(prefix) && prefix.length > bestLength) {
      best = metres
      bestLength = prefix.length
    }
  }
  const standing = best ?? DEFAULT_HEIGHT_M
  return SITTING.test(figure) ? Number((standing * SEATED_RATIO).toFixed(3)) : standing
}

/**
 * מה הגודל בפריים — the only place a body's drawn size is decided.
 *
 * `metre` is the room's own scale at the near line; `depth` is how far down the walk band
 * the body is standing, 0 at the far line and 1 at the near one. Perspective is the same
 * curve the player already walks on: bodies at the back of a room are smaller, and the
 * room's own `size.far / size.near` says by how much.
 */
export function bodySize(figure: string, metre: number, depth: number, taper: number, year?: number): number {
  const near = metre * heightAt(figure, year)
  return Number((near * (taper + (1 - taper) * depth)).toFixed(4))
}

/**
 * גובה בשנה — the friends grow up on the same body (21.9.2026).
 *
 * `ofir90`, `amit90`, `keren90` and `efi96` are drawn once, as they look at sixteen or so,
 * and they stand in the rooms from 1990 to 2026. Their heights in `HEIGHTS` are adult
 * heights — and in 1990 Ofir and Amit are twelve, in Pogi's class (*"אותה כיתה"*), while
 * Pogi is drawn at 1.50: a classmate a head taller than the boy beside him. So in the
 * years they are still growing, the body is drawn at the height of that age.
 *
 * Birth years are the script's: the three friends are Pogi's age (1978); Efi is four years
 * older (`castCards.ts`: *"גדול ממך בארבע שנים"*). The curve is a median growth curve,
 * boys and girls, as a fraction of the height at eighteen.
 */
const BORN: ReadonlyArray<readonly [string, number, 'boy' | 'girl']> = [
  ['ofir90', 1978, 'boy'],
  ['amit90', 1978, 'boy'],
  ['keren90', 1978, 'girl'],
  ['efi96', 1974, 'boy'],
]
const GROWN: Record<'boy' | 'girl', Record<number, number>> = {
  // median height by age over the height at eighteen
  boy: { 11: 0.82, 12: 0.855, 13: 0.895, 14: 0.935, 15: 0.965, 16: 0.985, 17: 0.995 },
  girl: { 11: 0.88, 12: 0.925, 13: 0.955, 14: 0.975, 15: 0.99, 16: 0.997, 17: 1 },
}

/** the height of this figure in this year — `heightOf`, unless the person is still growing */
export function heightAt(figure: string, year?: number): number {
  const adult = heightOf(figure)
  if (year === undefined) return adult
  const who = BORN.find(([prefix]) => figure.startsWith(prefix))
  if (!who) return adult
  const age = year - who[1]
  if (age >= 18) return adult
  const f = GROWN[who[2]][Math.max(11, age)] ?? 1
  return Number((adult * f).toFixed(3))
}
